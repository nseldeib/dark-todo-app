"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Skull, ArrowRight } from "lucide-react"
import { useState, useEffect } from "react"

export default function LandingPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-red-950 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-red-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex justify-between items-center p-6">
        <div className="flex items-center space-x-3">
          <Skull className="h-8 w-8 text-red-500" />
          <span className="text-2xl font-bold text-white">DarkTodo</span>
        </div>
        <div className="flex space-x-4">
          <Button variant="ghost" asChild className="text-gray-300 hover:text-white hover:bg-gray-800">
            <Link href="/sign-in">Sign In</Link>
          </Button>
          <Button asChild className="bg-red-600 hover:bg-red-700 text-white">
            <Link href="/sign-up">Get Started</Link>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
        <div
          className={`transition-all duration-1000 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          {/* Main Hero */}
          <div className="mb-8">
            <div className="relative inline-block mb-6">
              <Skull className="h-24 w-24 text-red-500 mx-auto animate-pulse" />
              <div className="absolute inset-0 rounded-full border-2 border-red-500/20 animate-ping"></div>
            </div>
            <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Embrace the
              <span className="text-red-500 block">Dark Side</span>
              <span className="text-gray-300 text-4xl md:text-5xl block mt-2">of Productivity</span>
            </h1>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto leading-relaxed">
              A minimalist todo app forged in shadow. Organize your tasks with dark elegance and ruthless efficiency.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button size="lg" asChild className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 text-lg glow-effect">
              <Link href="/sign-up" className="flex items-center space-x-2">
                <span>💀 Enter the Darkness</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-gray-700 text-gray-300 hover:bg-gray-800 px-8 py-4 text-lg"
            >
              <Link href="/sign-in" className="flex items-center space-x-2">
                <span>🖤 Already Initiated</span>
              </Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-20 border-t border-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-3 mb-4 md:mb-0">
            <Skull className="h-6 w-6 text-red-500" />
            <span className="text-gray-400">DarkTodo - Productivity in the Shadows</span>
          </div>
          <div className="flex items-center space-x-6">
            <span className="text-gray-500 text-sm">Built with 🖤 using v0</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
