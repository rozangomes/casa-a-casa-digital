'use client'
// Mapa Leaflet com pontos de visitas — SSR desabilitado pelo dynamic()
import { useEffect, useRef } from 'react'
import type { Visit, PoliticalPerception } from '@/types'

const PERCEPTION_COLORS: Record<PoliticalPerception, string> = {
  muito_favoravel: '#10B981',
  favoravel: '#22C55E',
  indiferente: '#F59E0B',
  contrario: '#EF4444',
}

interface VisitsMapProps {
  visits: Visit[]
}

export default function VisitsMap({ visits }: VisitsMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<unknown>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Importação dinâmica para evitar erro de SSR
    import('leaflet').then((L) => {
      // Fix default marker icon (Next.js quirk)
      // @ts-expect-error leaflet typing issue
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      if (!mapRef.current) return

      // Centro padrão: São Paulo
      const center: [number, number] =
        visits.length > 0
          ? [visits[0].latitude!, visits[0].longitude!]
          : [-23.55, -46.63]

      const map = L.map(mapRef.current, {
        center,
        zoom: 14,
        zoomControl: true,
      })

      mapInstanceRef.current = map

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map)

      // Adiciona marcadores com cor por percepção
      visits.forEach((visit) => {
        if (!visit.latitude || !visit.longitude) return

        const color = PERCEPTION_COLORS[visit.political_perception]

        const icon = L.divIcon({
          html: `<div style="
            width:12px;height:12px;border-radius:50%;
            background:${color};border:2px solid rgba(255,255,255,0.6);
            box-shadow:0 0 6px ${color}88;
          "></div>`,
          className: '',
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        })

        L.marker([visit.latitude, visit.longitude], { icon })
          .addTo(map)
          .bindPopup(`
            <b>${visit.neighborhood}</b><br/>
            ${visit.street || ''}<br/>
            Percepção: <b>${visit.political_perception.replace('_', ' ')}</b><br/>
            ${new Date(visit.visited_at).toLocaleString('pt-BR')}
          `)
      })
    })

    // Importa o CSS do Leaflet
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    return () => {
      if (mapInstanceRef.current) {
        ;(mapInstanceRef.current as { remove: () => void }).remove()
        mapInstanceRef.current = null
      }
    }
  }, [visits])

  return <div ref={mapRef} style={{ height: '100%', width: '100%', background: '#020617' }} />
}
