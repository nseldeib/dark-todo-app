"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skull, Eye, EyeOff, Info } from "lucide-react"

export default function SignIn() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showLoadingAnimation, setShowLoadingAnimation] = useState(false)
  const router = useRouter()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        if (email === "demo@todoapp.dev") {
          setError("Demo account not found. Please create it first using the sign-up page.")
        } else {
          setError(error.message)
        }
      } else {
        // Show loading animation before redirect
        setLoading(false)
        setShowLoadingAnimation(true)

        // Redirect after 2.5 seconds
        setTimeout(() => {
          router.push("/dashboard")
        }, 2500)
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      if (!showLoadingAnimation) {
        setLoading(false)
      }
    }
  }

  const handleDemoLogin = () => {
    setEmail("demo@todoapp.dev")
    setPassword("DarkTodo2024!")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-red-950 p-4">
      <Card className="w-full max-w-md bg-black/80 border-red-900/30 glow-effect">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Skull className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Welcome Back</CardTitle>
          <CardDescription className="text-gray-400">Sign in to your dark realm of productivity</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-gray-900/50 border-gray-700 text-white focus:border-red-500"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-gray-900/50 border-gray-700 text-white focus:border-red-500 pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {error && (
              <Alert className="border-red-900/50 bg-red-950/20">
                <AlertDescription className="text-red-400">{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white" disabled={loading}>
              {loading ? "Signing In..." : "Sign In"}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
              onClick={handleDemoLogin}
              disabled={loading}
            >
              Use Demo Credentials
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Don't have an account?{" "}
              <Link href="/sign-up" className="text-red-400 hover:text-red-300 underline">
                Sign up
              </Link>
            </p>
          </div>

          <Alert className="mt-4 border-blue-900/50 bg-blue-950/20">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-blue-400 text-xs">
              <strong>Demo Account:</strong> demo@todoapp.dev / DarkTodo2024!
              <br />
              Create the demo account first via sign-up, then sign in here.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
      {showLoadingAnimation && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <div className="relative">
              <Skull className="h-16 w-16 text-red-500 mx-auto mb-6 animate-pulse" />
              <div className="absolute inset-0 rounded-full border-2 border-red-500/20 animate-ping"></div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Entering the Dark Realm...</h2>
            <p className="text-gray-400 mb-4">Preparing your productivity empire</p>
            <div className="flex justify-center space-x-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
