import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/ThemeProvider"
import { ThemeToggle } from "@/components/ThemeToggle"
import type React from "react"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Storyteller AI",
  description:
    "Storyteller AI is an interactive web application that generates and narrates short stories using AI. Users can input a topic, and the app will create a unique story complete with audio narration.",
  metadataBase: new URL("https://storyteller.vercel.app"),
  openGraph: {
    title: "Storyteller AI",
    description: "Generate and listen to AI-created short stories",
    url: "https://storyteller.vercel.app",
    siteName: "Storyteller AI",
    images: [
      {
        url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/AI%20STORYTELLER-Z8r4TdnPY2mVMI3HEalG0lWJ2LyirG.png",
        width: 1200,
        height: 630,
        alt: "AI Storyteller - An AI-powered audio storytelling application",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  icons: {
    icon: "/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ThemeToggle />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

