"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase, type Task, type Project } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import {
  Skull,
  LogOut,
  Calendar,
  Zap,
  Brain,
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  FolderPlus,
  ArrowLeft,
  Star,
} from "lucide-react"

// Define valid status values to match database
const VALID_STATUSES = ["todo", "in_progress", "done", "canceled"] as const
type TaskStatus = (typeof VALID_STATUSES)[number]

export default function CreateTaskPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string>("")
  const [naturalInput, setNaturalInput] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [parsedPreview, setParsedPreview] = useState<any>(null)
  const [error, setError] = useState("")
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showPreviewHelp, setShowPreviewHelp] = useState(false)
  const [newProject, setNewProject] = useState({ name: "", description: "", emoji: "📁" })
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const router = useRouter()

  const getHumanReadableError = (errorMessage: string): string => {
    if (errorMessage.includes("Network")) {
      return "The digital underworld is unreachable. Check your connection."
    } else if (errorMessage.includes("JWT") || errorMessage.includes("token")) {
      return "Your dark session has expired. Please sign in again."
    } else if (errorMessage.includes("permission") || errorMessage.includes("RLS")) {
      return "The shadows deny you access. Please try refreshing the page."
    } else if (errorMessage.includes("not found")) {
      return "What you seek has vanished into the void."
    } else if (errorMessage.includes("timeout")) {
      return "The darkness is taking too long to respond. Try again."
    } else if (errorMessage.includes("constraint") || errorMessage.includes("check")) {
      return "Invalid data detected. Please check your input."
    } else {
      return `Something wicked happened: ${errorMessage}`
    }
  }

  useEffect(() => {
    checkUser()
  }, [])

  // Parse input in real-time for preview
  useEffect(() => {
    if (naturalInput.trim()) {
      const parsed = parseNaturalLanguage(naturalInput)
      setParsedPreview(parsed)
    } else {
      setParsedPreview(null)
    }
  }, [naturalInput])

  const checkUser = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        console.error("Auth error:", userError)
        setError(`Authentication failed: ${getHumanReadableError(userError.message)}`)
        setLoading(false)
        return
      }

      if (!user) {
        router.push("/sign-in")
        return
      }

      setUser(user)
      await fetchProjects(user.id)
    } catch (error: any) {
      console.error("Error checking user:", error)
      setError(`Error checking user: ${getHumanReadableError(error.message)}`)
      setLoading(false)
    }
  }

  const fetchProjects = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Projects fetch error:", error)
        setError(`Failed to fetch projects: ${getHumanReadableError(error.message)}`)
        setLoading(false)
        return
      }

      setProjects(data || [])

      if (data && data.length > 0) {
        setSelectedProject(data[0].id)
        await fetchTasks(data[0].id)
      } else {
        await createDefaultProject(userId)
      }
    } catch (error: any) {
      console.error("Error fetching projects:", error)
      setError(`Error fetching projects: ${getHumanReadableError(error.message)}`)
      setLoading(false)
    }
  }

  const createDefaultProject = async (userId: string) => {
    try {
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .insert({
          user_id: userId,
          name: "My Tasks",
          description: "Default project for your tasks",
          emoji: "📝",
        })
        .select()
        .single()

      if (projectError) {
        console.error("Error creating default project:", projectError)
        setError(`Error creating default project: ${getHumanReadableError(projectError.message)}`)
        setLoading(false)
        return
      }

      if (projectData) {
        setProjects([projectData])
        setSelectedProject(projectData.id)
        await fetchTasks(projectData.id)
      }
    } catch (error: any) {
      console.error("Error creating default project:", error)
      setError(`Error creating default project: ${getHumanReadableError(error.message)}`)
      setLoading(false)
    }
  }

  const fetchTasks = async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
        *,
        projects (
          name,
          emoji
        )
      `)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Tasks fetch error:", error)
        setError(`Error fetching tasks: ${getHumanReadableError(error.message)}`)
        setLoading(false)
        return
      }

      setTasks(data || [])
      setLoading(false)
      setError("")
    } catch (error: any) {
      console.error("Error fetching tasks:", error)
      setError(`Error fetching tasks: ${getHumanReadableError(error.message)}`)
      setLoading(false)
    }
  }

  const parseNaturalLanguage = (input: string) => {
    const text = input.toLowerCase()

    // Extract emoji (first emoji found)
    const emojiMatch = input.match(
      /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u,
    )
    const emoji = emojiMatch ? emojiMatch[0] : null

    // Remove emoji from text for further processing
    const cleanText = input
      .replace(
        /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,
        "",
      )
      .trim()

    // Detect priority using exclamation shortcuts FIRST
    let priority = "medium"
    const exclamationMatch = input.match(/!{1,3}(?!\w)/g)
    if (exclamationMatch) {
      const maxExclamations = Math.max(...exclamationMatch.map((match) => match.length))
      if (maxExclamations === 1) {
        priority = "low"
      } else if (maxExclamations === 2) {
        priority = "medium"
      } else if (maxExclamations >= 3) {
        priority = "high"
      }
    } else {
      // Fallback to text-based priority detection
      if (
        text.includes("urgent") ||
        text.includes("asap") ||
        text.includes("high priority") ||
        text.includes("important") ||
        text.includes("critical")
      ) {
        priority = "high"
      } else if (
        text.includes("low priority") ||
        text.includes("when i have time") ||
        text.includes("someday") ||
        text.includes("maybe") ||
        text.includes("later")
      ) {
        priority = "low"
      }
    }

    // Detect importance
    const isImportant =
      text.includes("important") ||
      text.includes("critical") ||
      text.includes("must do") ||
      text.includes("priority") ||
      text.includes("⭐") ||
      text.includes("star") ||
      priority === "high"

    // Extract due date patterns
    let dueDate = null
    const datePatterns = [
      /(?:due|by|before|until)\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
      /(?:due|by|before|until)\s+(\d{1,2}-\d{1,2}-\d{4})/i,
      /(?:due|by|before|until)\s+(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
      /(?:due|by|before|until)\s+(\d{1,2}\/\d{1,2})/i,
      /(today|tomorrow)/i,
      /(this week|next week)/i,
    ]

    for (const pattern of datePatterns) {
      const match = text.match(pattern)
      if (match) {
        const dateStr = match[1] || match[0]
        if (dateStr === "today") {
          dueDate = new Date().toISOString().split("T")[0] + "T23:59"
        } else if (dateStr === "tomorrow") {
          const tomorrow = new Date()
          tomorrow.setDate(tomorrow.getDate() + 1)
          dueDate = tomorrow.toISOString().split("T")[0] + "T23:59"
        } else if (dateStr === "this week") {
          const endOfWeek = new Date()
          endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()))
          dueDate = endOfWeek.toISOString().split("T")[0] + "T23:59"
        } else if (dateStr === "next week") {
          const nextWeek = new Date()
          nextWeek.setDate(nextWeek.getDate() + (14 - nextWeek.getDay()))
          dueDate = nextWeek.toISOString().split("T")[0] + "T23:59"
        } else {
          try {
            const parsed = new Date(dateStr)
            if (!isNaN(parsed.getTime())) {
              dueDate = parsed.toISOString().split("T")[0] + "T23:59"
            }
          } catch (e) {
            // Ignore invalid dates
          }
        }
        break
      }
    }

    // Split into title and description
    let title = cleanText
    let description = null
    const descriptionIndicators = [" - ", " : ", " because ", " to ", " for ", " about "]
    for (const indicator of descriptionIndicators) {
      if (cleanText.includes(indicator)) {
        const parts = cleanText.split(indicator, 2)
        title = parts[0].trim()
        description = parts[1].trim()
        break
      }
    }

    // Clean up title
    title = title
      .replace(/\b(urgent|asap|high priority|low priority|important|critical|must do|priority)\b/gi, "")
      .replace(/\b(due|by|before|until)\s+[\w/-]+/gi, "")
      .replace(/\b(today|tomorrow|this week|next week)\b/gi, "")
      .replace(/!{1,3}(?!\w)/g, "")
      .replace(/\s+/g, " ")
      .trim()

    return {
      title: title || "New Task",
      description,
      emoji,
      priority,
      isImportant,
      dueDate,
    }
  }

  const createTaskFromNaturalInput = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!naturalInput.trim() || !selectedProject) return

    setIsProcessing(true)
    setError("")
    try {
      const parsed = parseNaturalLanguage(naturalInput)

      const taskData = {
        title: parsed.title,
        description: parsed.description,
        emoji: parsed.emoji,
        user_id: user.id,
        project_id: selectedProject,
        status: "todo" as TaskStatus,
        priority: parsed.priority,
        is_important: parsed.isImportant,
        due_date: parsed.dueDate,
      }

      const { data, error } = await supabase
        .from("tasks")
        .insert([taskData])
        .select(`
        *,
        projects (
          name,
          emoji
        )
      `)

      if (error) {
        console.error("Task creation error:", error)
        throw error
      }

      if (data) {
        setTasks([data[0], ...tasks])
        setNaturalInput("")
        setParsedPreview(null)
        // Redirect to active tasks to see the created task
        router.push("/dashboard/active")
      }
    } catch (error: any) {
      console.error("Error creating task:", error)
      setError(`Failed to create task: ${getHumanReadableError(error.message)}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProject.name.trim() || !user) return

    setIsCreatingProject(true)
    try {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: newProject.name.trim(),
          description: newProject.description.trim() || null,
          emoji: newProject.emoji || "📁",
        })
        .select()
        .single()

      if (error) throw error

      if (data) {
        setProjects([data, ...projects])
        setSelectedProject(data.id)
        setNewProject({ name: "", description: "", emoji: "📁" })
        setShowProjectForm(false)

        // Fetch tasks for the new project (will be empty initially)
        await fetchTasks(data.id)
      }
    } catch (error: any) {
      setError(`Failed to create project: ${getHumanReadableError(error.message)}`)
    } finally {
      setIsCreatingProject(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push("/sign-in")
    } catch (error: any) {
      console.error("Error signing out:", error)
      setError(`Error signing out: ${getHumanReadableError(error.message)}`)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-900/20 text-red-400 border-red-900/50"
      case "medium":
        return "bg-yellow-900/20 text-yellow-400 border-yellow-900/50"
      default:
        return "bg-gray-900/20 text-gray-400 border-gray-700"
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="text-center max-w-sm w-full">
          <div className="relative">
            <Skull className="h-12 w-12 sm:h-16 sm:w-16 text-red-500 mx-auto mb-4 sm:mb-6 animate-pulse" />
            <div className="absolute inset-0 rounded-full border-2 border-red-500/20 animate-ping"></div>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Summoning Your Dark Empire...</h2>
          <p className="text-gray-400 mb-4 text-sm sm:text-base">Awakening the shadows of productivity</p>
          <div className="flex justify-center space-x-1 mb-4">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
          </div>
          {error && (
            <Alert className="mt-4 border-red-900/50 bg-red-950/20 text-left">
              <AlertDescription className="text-red-400 text-sm">{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-red-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          {/* Mobile Header */}
          <div className="flex items-center justify-between lg:hidden">
            <div className="flex items-center space-x-2">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-gray-300 hover:bg-gray-800 p-2">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <Skull className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
              <h1 className="text-lg sm:text-xl font-bold text-white">Create Task</h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="text-gray-300 hover:bg-gray-800 p-2"
            >
              {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>

          {/* Desktop Header */}
          <div className="hidden lg:flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-gray-300 hover:bg-gray-800">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <Skull className="h-8 w-8 text-red-500" />
              <h1 className="text-2xl font-bold text-white">Create New Task</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-400 hidden xl:inline">Welcome, {user?.email}</span>
              <span className="text-gray-400 xl:hidden">Welcome, {user?.email?.split("@")[0]}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="border-gray-700 text-gray-300 hover:bg-gray-800 bg-transparent"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {showMobileMenu && (
            <div className="lg:hidden mt-4 pt-4 border-t border-gray-800">
              <div className="space-y-3">
                <div className="text-gray-400 text-sm">Welcome, {user?.email}</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800 w-full justify-start bg-transparent"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
        {error && (
          <Alert className="mb-6 border-red-900/50 bg-red-950/20">
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        {/* New Project Form */}
        {showProjectForm && (
          <div className="mb-8">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="pb-4">
                <CardTitle className="text-white text-xl flex items-center">
                  <FolderPlus className="h-5 w-5 mr-2 text-green-400" />
                  Create New Project
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={createProject} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <Label htmlFor="project-name" className="text-gray-300">
                        Project Name
                      </Label>
                      <Input
                        id="project-name"
                        value={newProject.name}
                        onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                        className="bg-gray-900/50 border-gray-700 text-white focus:border-green-500 mt-2"
                        placeholder="Enter project name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="project-emoji" className="text-gray-300">
                        Emoji
                      </Label>
                      <Input
                        id="project-emoji"
                        value={newProject.emoji}
                        onChange={(e) => setNewProject({ ...newProject, emoji: e.target.value })}
                        className="bg-gray-900/50 border-gray-700 text-white focus:border-green-500 mt-2 text-center"
                        placeholder="📁"
                        maxLength={2}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="project-description" className="text-gray-300">
                      Description (Optional)
                    </Label>
                    <Textarea
                      id="project-description"
                      value={newProject.description}
                      onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                      className="bg-gray-900/50 border-gray-700 text-white focus:border-green-500 mt-2 resize-none"
                      placeholder="Brief description of this project"
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center space-x-3">
                    <Button
                      type="submit"
                      className="bg-green-600 hover:bg-green-700 text-white flex items-center"
                      disabled={isCreatingProject || !newProject.name.trim()}
                    >
                      {isCreatingProject ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Creating...
                        </>
                      ) : (
                        <>
                          <FolderPlus className="h-4 w-4 mr-2" />
                          Create Project
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowProjectForm(false)
                        setNewProject({ name: "", description: "", emoji: "📁" })
                      }}
                      className="border-gray-700 text-gray-300 hover:bg-gray-800 bg-transparent"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Smart Task Creation */}
        <Card className="bg-black/60 border-red-900/30 glow-effect">
          <CardHeader className="pb-4">
            <CardTitle className="text-white flex items-center text-xl sm:text-2xl">
              <Brain className="h-5 w-5 sm:h-6 sm:w-6 mr-3 text-red-500" />
              Smart Task Creation
              <Zap className="h-4 w-4 sm:h-5 sm:w-5 ml-2 text-yellow-400" />
            </CardTitle>
            <CardDescription className="text-gray-400 text-base">
              Just type naturally - I'll understand the context and extract all the details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={createTaskFromNaturalInput} className="space-y-6">
              <div className="space-y-4">
                <Label htmlFor="natural-input" className="text-gray-300 text-lg">
                  What needs to be done?
                </Label>
                <Textarea
                  id="natural-input"
                  value={naturalInput}
                  onChange={(e) => setNaturalInput(e.target.value)}
                  className="bg-gray-900/50 border-gray-700 text-white focus:border-red-500 min-h-[120px] text-lg resize-none"
                  placeholder="🔥 Fix the login bug!!! due tomorrow - users can't sign in with Google authentication"
                  rows={4}
                />

                {/* Real-time parsing preview */}
                {parsedPreview && (
                  <div className="mt-4 p-4 sm:p-6 bg-gray-800/50 border border-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <Brain className="h-5 w-5 text-green-400 mr-2" />
                        <span className="text-green-400 font-medium">AI Parsed Preview:</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPreviewHelp(!showPreviewHelp)}
                        className="text-gray-400 hover:text-white sm:hidden"
                      >
                        {showPreviewHelp ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>

                    {/* Mobile: Stacked Layout */}
                    <div className="space-y-4 sm:hidden">
                      <div>
                        <span className="text-gray-400 text-sm">Title:</span>
                        <div className="text-white flex items-center mt-1">
                          {parsedPreview.emoji && <span className="mr-2 text-lg">{parsedPreview.emoji}</span>}
                          <span className="text-base">{parsedPreview.title}</span>
                          {parsedPreview.isImportant && <Star className="h-4 w-4 ml-2 text-red-400 fill-current" />}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-400 text-sm">Priority:</span>
                        <Badge className={`ml-2 text-sm ${getPriorityColor(parsedPreview.priority)}`}>
                          {parsedPreview.priority}
                        </Badge>
                      </div>
                      {parsedPreview.description && (
                        <div>
                          <span className="text-gray-400 text-sm">Description:</span>
                          <div className="text-gray-300 mt-1">{parsedPreview.description}</div>
                        </div>
                      )}
                      {parsedPreview.dueDate && (
                        <div>
                          <span className="text-gray-400 text-sm">Due Date:</span>
                          <div className="text-gray-300 flex items-center mt-1">
                            <Calendar className="h-4 w-4 mr-2 text-red-400" />
                            {new Date(parsedPreview.dueDate).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Desktop: Grid Layout */}
                    <div className="hidden sm:grid sm:grid-cols-2 gap-6">
                      <div>
                        <span className="text-gray-400">Title:</span>
                        <div className="text-white flex items-center mt-1">
                          {parsedPreview.emoji && <span className="mr-2 text-lg">{parsedPreview.emoji}</span>}
                          <span>{parsedPreview.title}</span>
                          {parsedPreview.isImportant && <Star className="h-4 w-4 ml-2 text-red-400 fill-current" />}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-400">Priority:</span>
                        <Badge className={`ml-2 ${getPriorityColor(parsedPreview.priority)}`}>
                          {parsedPreview.priority}
                        </Badge>
                      </div>
                      {parsedPreview.description && (
                        <div className="col-span-2">
                          <span className="text-gray-400">Description:</span>
                          <div className="text-gray-300 mt-1">{parsedPreview.description}</div>
                        </div>
                      )}
                      {parsedPreview.dueDate && (
                        <div className="col-span-2">
                          <span className="text-gray-400">Due Date:</span>
                          <div className="text-gray-300 flex items-center mt-1">
                            <Calendar className="h-4 w-4 mr-2 text-red-400" />
                            {new Date(parsedPreview.dueDate).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Help Section - Collapsible on Mobile */}
                <div className={`text-sm text-gray-500 space-y-2 mt-4 ${!showPreviewHelp && "hidden sm:block"}`}>
                  <p className="flex items-center">
                    <Brain className="h-4 w-4 mr-2 text-green-400" />
                    <strong>Smart Detection Examples:</strong>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-6 text-sm">
                    <p>
                      • <span className="text-yellow-400">Emojis:</span> 🔥 📝 ⚡ 🎯 auto-detected
                    </p>
                    <p>
                      • <span className="text-yellow-400">Priority:</span> ! (low) !! (med) !!! (high)
                    </p>
                    <p>
                      • <span className="text-yellow-400">Due dates:</span> "tomorrow", "Friday"
                    </p>
                    <p>
                      • <span className="text-yellow-400">Details:</span> Use " - " to separate
                    </p>
                    <p>
                      • <span className="text-yellow-400">Keywords:</span> "urgent", "important"
                    </p>
                    <p>
                      • <span className="text-yellow-400">Example:</span> "🔥 Fix bug!!! due tomorrow"
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <Label htmlFor="project-select" className="text-gray-300 whitespace-nowrap">
                    Project:
                  </Label>
                  <Select
                    value={selectedProject}
                    onValueChange={(value) => {
                      if (value === "new-project") {
                        setShowProjectForm(true)
                      } else {
                        setSelectedProject(value)
                      }
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-64 bg-gray-900/50 border-gray-700 text-white">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id} className="text-white">
                          {project.emoji} {project.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="new-project" className="text-green-400 font-medium">
                        + Add New Project
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-lg"
                  disabled={isProcessing || !naturalInput.trim() || !selectedProject}
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5 mr-2" />
                      Create Task
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
