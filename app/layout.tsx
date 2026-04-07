import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin', 'latin-ext'] })

export const metadata = {
  title: 'Lead Hunter',
  description: 'Zarządzanie leadami i mailingiem',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pl">
      <body className={`${inter.className} bg-gray-950 text-gray-100 overflow-x-hidden`}>{children}</body>
    </html>
  )
}
