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
import { Skull, Eye, EyeOff, Info, CheckCircle } from "lucide-react"

export default function SignUp() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const [showLoadingAnimation, setShowLoadingAnimation] = useState(false)

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    try {
      // Sign up with email confirmation disabled
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined, // Disable email confirmation
          data: {
            username: email.split("@")[0],
          },
        },
      })

      if (error) {
        if (error.message.includes("already registered")) {
          setError("User already exists. Please sign in instead.")
        } else {
          setError(error.message)
        }
      } else if (data.user) {
        // Account created successfully
        setSuccess(true)

        // Create user profile in background (don't wait for it)
        createUserProfile(data.user.id, email).catch(console.error)

        // If this is the demo account, seed demo tasks
        if (email === "demo@todoapp.dev") {
          seedDemoTasks(data.user.id).catch(console.error)
        }

        // Show loading animation after success message
        setTimeout(() => {
          setShowLoadingAnimation(true)

          // Redirect after loading animation
          setTimeout(() => {
            router.push("/sign-in")
          }, 2500)
        }, 1500)
      }
    } catch (error: any) {
      console.error("Signup error:", error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const createUserProfile = async (userId: string, email: string) => {
    try {
      const { error: userError } = await supabase.from("users").insert({
        id: userId,
        email: email,
        username: email.split("@")[0],
        high_score: 0,
        challenges_completed: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (userError && !userError.message.includes("duplicate key")) {
        console.error("Error creating user profile:", userError)
      }
    } catch (error) {
      console.error("Error in createUserProfile:", error)
    }
  }

  const seedDemoTasks = async (userId: string) => {
    try {
      // Wait a bit for user to be fully created
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Create a default project
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .insert({
          user_id: userId,
          name: "Getting Started",
          description: "Your first project to organize tasks",
          emoji: "🚀",
        })
        .select()
        .single()

      if (projectError) {
        console.error("Error creating project:", projectError)
        return
      }

      if (projectData) {
        // Create demo tasks
        const demoTasks = [
          {
            user_id: userId,
            project_id: projectData.id,
            title: "Welcome to DarkTodo",
            description: "This is your first task. Click to mark it as completed!",
            emoji: "👋",
            status: "todo",
            priority: "medium",
            is_important: false,
          },
          {
            user_id: userId,
            project_id: projectData.id,
            title: "Explore the dark side",
            description: "Try changing task statuses and adding new tasks",
            emoji: "🌙",
            status: "in_progress",
            priority: "high",
            is_important: true,
          },
          {
            user_id: userId,
            project_id: projectData.id,
            title: "Master your productivity",
            description: "Use this app to organize your tasks efficiently",
            emoji: "⚡",
            status: "done",
            priority: "low",
            is_important: false,
            completed_at: new Date().toISOString(),
          },
        ]

        for (const task of demoTasks) {
          const { error: taskError } = await supabase.from("tasks").insert(task)
          if (taskError) {
            console.error("Error creating demo task:", taskError)
          }
        }

        // Create some demo checklist items for the first task
        const { data: firstTask } = await supabase
          .from("tasks")
          .select("id")
          .eq("user_id", userId)
          .eq("title", "Welcome to DarkTodo")
          .single()

        if (firstTask) {
          const checklistItems = [
            {
              task_id: firstTask.id,
              text: "Read the task description",
              is_completed: true,
            },
            {
              task_id: firstTask.id,
              text: "Try changing the task status",
              is_completed: false,
            },
            {
              task_id: firstTask.id,
              text: "Add your own task",
              is_completed: false,
            },
          ]

          for (const item of checklistItems) {
            await supabase.from("checklist_items").insert(item)
          }
        }
      }
    } catch (error) {
      console.error("Error seeding demo data:", error)
    }
  }

  const fillDemoCredentials = () => {
    setEmail("demo@todoapp.dev")
    setPassword("DarkTodo2024!")
    setConfirmPassword("DarkTodo2024!")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-red-950 p-4">
      <Card className="w-full max-w-md bg-black/80 border-red-900/30 glow-effect">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Skull className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Join the Darkness</CardTitle>
          <CardDescription className="text-gray-400">Create your account and embrace productivity</CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <Alert className="border-green-900/50 bg-green-950/20">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="text-green-400">
                Account created successfully! Redirecting to sign-in page...
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="mb-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-yellow-700 text-yellow-300 hover:bg-yellow-900/20 mb-2"
                  onClick={fillDemoCredentials}
                  disabled={loading}
                >
                  🎯 Fill Demo Credentials
                </Button>
                <p className="text-xs text-gray-500 text-center">Click above to auto-fill demo account info</p>
              </div>
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
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-300">
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-gray-900/50 border-gray-700 text-white focus:border-red-500"
                  required
                />
              </div>

              {error && (
                <Alert className="border-red-900/50 bg-red-950/20">
                  <AlertDescription className="text-red-400">{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white" disabled={loading}>
                {loading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Already have an account?{" "}
              <Link href="/sign-in" className="text-red-400 hover:text-red-300 underline">
                Sign in
              </Link>
            </p>
          </div>

          <Alert className="mt-4 border-blue-900/50 bg-blue-950/20">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-blue-400 text-xs">
              <strong>Demo Account:</strong> demo@todoapp.dev / DarkTodo2024!
              <br />
              Use "Fill Demo Credentials" to auto-fill the form.
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
            <h2 className="text-2xl font-bold text-white mb-2">Welcome to the Darkness...</h2>
            <p className="text-gray-400 mb-4">Your account has been forged in shadow</p>
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
