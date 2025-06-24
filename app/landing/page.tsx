"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skull, Zap, Shield, Database, Palette, Code2, ArrowRight } from "lucide-react"
import { useState, useEffect } from "react"

export default function LandingPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const techStack = [
    { name: "Next.js", icon: Code2, description: "React Framework" },
    { name: "Supabase", icon: Database, description: "Backend & Auth" },
    { name: "Tailwind", icon: Palette, description: "Styling" },
    { name: "TypeScript", icon: Shield, description: "Type Safety" },
  ]

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
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" asChild className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 text-lg glow-effect">
              <Link href="/sign-up" className="flex items-center space-x-2">
                <span>Enter the Darkness</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-gray-700 text-gray-300 hover:bg-gray-800 px-8 py-4 text-lg"
            >
              <Link href="/sign-in">Already Initiated</Link>
            </Button>
          </div>

          {/* Demo hint */}
          <div className="mb-16">
            <Badge variant="outline" className="border-yellow-700 text-yellow-300 bg-yellow-900/20 px-4 py-2">
              <Zap className="h-4 w-4 mr-2" />
              Try the demo: demo@todoapp.dev
            </Badge>
          </div>
        </div>

        {/* Tech Stack */}
        <div
          className={`transition-all duration-1000 delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-8">Forged with Modern Technology</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {techStack.map((tech, index) => (
                <Card
                  key={tech.name}
                  className={`task-card p-6 text-center hover:scale-105 transition-all duration-300 delay-${index * 100}`}
                >
                  <tech.icon className="h-8 w-8 text-red-500 mx-auto mb-3" />
                  <h3 className="text-white font-semibold mb-1">{tech.name}</h3>
                  <p className="text-gray-400 text-sm">{tech.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Features Preview */}
        <div
          className={`mt-20 transition-all duration-1000 delay-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          <div className="max-w-3xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8 text-left">
              <div className="space-y-3">
                <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <Skull className="h-6 w-6 text-red-500" />
                </div>
                <h3 className="text-white font-semibold text-lg">Dark by Design</h3>
                <p className="text-gray-400">
                  Built for those who prefer the shadows. Easy on the eyes, hard on procrastination.
                </p>
              </div>
              <div className="space-y-3">
                <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <Zap className="h-6 w-6 text-red-500" />
                </div>
                <h3 className="text-white font-semibold text-lg">Lightning Fast</h3>
                <p className="text-gray-400">
                  No bloat, no distractions. Just pure productivity in its most efficient form.
                </p>
              </div>
              <div className="space-y-3">
                <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <Shield className="h-6 w-6 text-red-500" />
                </div>
                <h3 className="text-white font-semibold text-lg">Secure & Private</h3>
                <p className="text-gray-400">
                  Your tasks are yours alone. Protected by modern authentication and encryption.
                </p>
              </div>
            </div>
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
            <span className="text-gray-500 text-sm">Built with Next.js & Supabase</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
