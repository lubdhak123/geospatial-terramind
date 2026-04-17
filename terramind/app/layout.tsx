import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TerraMind — AI Precision Agriculture',
  description: 'Interactive 3D field intelligence for Indian farmers. Satellite imagery, NDVI analysis, disease detection, and AI-powered recommendations.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=Lexend:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
        <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; user-select: none; }`}</style>
      </head>
      <body className="text-white antialiased overflow-hidden" style={{ background: '#030d1a' }} suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
