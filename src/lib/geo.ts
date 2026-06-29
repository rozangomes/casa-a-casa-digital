// Captura geolocalização com timeout e fallback
export interface GeoPosition {
  latitude: number
  longitude: number
}

export function getCurrentPosition(timeoutMs = 8000): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalização não suportada'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => reject(new Error(err.message)),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30000 }
    )
  })
}
