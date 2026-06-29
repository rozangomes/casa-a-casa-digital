/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === 'development'

let nextConfig = {
  reactStrictMode: true,
}

// PWA só em produção
if (!isDev) {
  try {
    const withPWA = require('@ducanh2912/next-pwa').default({
      dest: 'public',
      cacheOnFrontEndNav: true,
      aggressiveFrontEndNavCaching: true,
      reloadOnOnline: true,
      disable: false,
      workboxOptions: {
        disableDevLogs: true,
      },
    })
    nextConfig = withPWA(nextConfig)
  } catch {
    // pacote ainda não instalado
  }
}

module.exports = nextConfig
