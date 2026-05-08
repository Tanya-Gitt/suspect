import type { Metadata } from "next"
import { Orbitron, JetBrains_Mono } from "next/font/google"
import "./globals.css"

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
  weight: ["300", "400", "500", "600"],
})

export const metadata: Metadata = {
  title: "SUSPECT — AI Interrogation Game",
  description:
    "An AI-powered noir detective mystery. Interrogate suspects. Uncover lies. Find the killer.",
  keywords: ["detective game", "ai game", "mystery", "noir", "interrogation"],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${orbitron.variable} ${jetbrainsMono.variable} h-full`}>
      <body className="min-h-full bg-[#0F0F23] text-[#E2E8F0] antialiased">
        {children}
      </body>
    </html>
  )
}
