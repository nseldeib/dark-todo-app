"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase, type Task, type Project, type ChecklistItem } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Skull,
  LogOut,
  Clock,
  CheckCircle,
  AlertCircle,
  Star,
  Calendar,
  Zap,
  Brain,
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  FolderPlus,
  Plus,
  List,
  CheckSquare,
  Trash2,
  Filter,
} from "lucide-react"

// Define valid status values to match database
const VALID_STATUSES = ["todo", "in_progress", "done", "canceled"] as const
type TaskStatus = (typeof VALID_STATUSES)[number]

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string>("")
  const [checklistItems, setChecklistItems] = useState<{ [taskId: string]: ChecklistItem[] }>({})
  const [naturalInput, setNaturalInput] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [parsedPreview, setParsedPreview] = useState<any>(null)
  const [error, setError] = useState("")
  const [showCompleted, setShowCompleted] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showPreviewHelp, setShowPreviewHelp] = useState(false)
  const [newProject, setNewProject] = useState({ name: "", description: "", emoji: "📁" })
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [showCanceled, setShowCanceled] = useState(false)
  const [showStatsDetails, setShowStatsDetails] = useState(false)
  const [currentView, setCurrentView] = useState<"overview" | "active" | "completed" | "create">("overview")
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

      // Fetch checklist items for all tasks
      if (data && data.length > 0) {
        await fetchChecklistItems(data.map((task) => task.id))
      }

      setLoading(false)
      setError("") // Clear any previous errors
    } catch (error: any) {
      console.error("Error fetching tasks:", error)
      setError(`Error fetching tasks: ${getHumanReadableError(error.message)}`)
      setLoading(false)
    }
  }

  const fetchChecklistItems = async (taskIds: string[]) => {
    try {
      const { data: checklistData, error } = await supabase
        .from("checklist_items")
        .select("*")
        .in("task_id", taskIds)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Error fetching checklist items:", error)
        return // Don't fail the whole dashboard for checklist items
      }

      if (checklistData) {
        const groupedChecklist = checklistData.reduce(
          (acc, item) => {
            if (!acc[item.task_id]) {
              acc[item.task_id] = []
            }
            acc[item.task_id].push(item)
            return acc
          },
          {} as { [taskId: string]: ChecklistItem[] },
        )

        setChecklistItems(groupedChecklist)
      }
    } catch (error: any) {
      console.error("Error fetching checklist items:", error)
      // Don't fail the whole dashboard for checklist items
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
      }
    } catch (error: any) {
      console.error("Error creating task:", error)
      setError(`Failed to create task: ${getHumanReadableError(error.message)}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      // Validate the status value
      if (!VALID_STATUSES.includes(newStatus as TaskStatus)) {
        console.error("Invalid status:", newStatus)
        setError(`Invalid task status: ${newStatus}`)
        return
      }

      const updateData: any = { status: newStatus }

      // If marking as done, set completed_at
      if (newStatus === "done") {
        updateData.completed_at = new Date().toISOString()
      } else if (newStatus === "canceled") {
        updateData.completed_at = new Date().toISOString() // Track when canceled
      } else {
        updateData.completed_at = null
      }

      const { data, error } = await supabase.from("tasks").update(updateData).eq("id", taskId).select()

      if (error) {
        console.error("Database update error:", error)
        throw error
      }

      // Update local state
      if (data && data.length > 0) {
        const updatedTask = data[0]
        setTasks((prevTasks) =>
          prevTasks.map((task) =>
            task.id === taskId ? { ...task, status: updatedTask.status, completed_at: updatedTask.completed_at } : task,
          ),
        )
      }

      setError("") // Clear any previous errors
    } catch (error: any) {
      console.error("Error updating task status:", error)
      setError(`Failed to update task: ${getHumanReadableError(error.message)}`)
    }
  }

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId)

      if (error) {
        console.error("Error deleting task:", error)
        throw error
      }

      // Update local state
      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId))
      setError("") // Clear any previous errors
    } catch (error: any) {
      console.error("Error deleting task:", error)
      setError(`Failed to delete task: ${getHumanReadableError(error.message)}`)
    }
  }

  const toggleChecklistItem = async (itemId: string, isCompleted: boolean) => {
    try {
      const { error } = await supabase.from("checklist_items").update({ is_completed: isCompleted }).eq("id", itemId)

      if (error) {
        console.error("Error updating checklist item:", error)
        throw error
      }

      // Update local state
      setChecklistItems((prev) => {
        const updated = { ...prev }
        Object.keys(updated).forEach((taskId) => {
          updated[taskId] = updated[taskId].map((item) =>
            item.id === itemId ? { ...item, is_completed: isCompleted } : item,
          )
        })
        return updated
      })
    } catch (error: any) {
      console.error("Error updating checklist item:", error)
      setError(`Failed to update checklist item: ${getHumanReadableError(error.message)}`)
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "done":
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case "in_progress":
        return <Clock className="h-4 w-4 text-yellow-400" />
      case "canceled":
        return <X className="h-4 w-4 text-gray-400" />
      default:
        return <AlertCircle className="h-4 w-4 text-red-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "done":
        return "bg-green-900/20 text-green-400 border-green-900/50"
      case "in_progress":
        return "bg-yellow-900/20 text-yellow-400 border-yellow-900/50"
      case "canceled":
        return "bg-gray-900/20 text-gray-400 border-gray-700"
      default:
        return "bg-red-900/20 text-red-400 border-red-900/50"
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
      {/* Mobile-Optimized Header */}
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          {/* Mobile Header */}
          <div className="flex items-center justify-between lg:hidden">
            <div className="flex items-center space-x-2">
              <Skull className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
              <h1 className="text-lg sm:text-xl font-bold text-white">DarkTodo</h1>
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
              <Skull className="h-8 w-8 text-red-500" />
              <h1 className="text-2xl font-bold text-white">DarkTodo</h1>
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

      <main className="container mx-auto px-4 py-4 sm:py-6 lg:py-8 max-w-6xl">
        {/* Dashboard Stats Section - Optimized */}
        <div className="mb-4 sm:mb-6">
          <div className="mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-1">Dashboard Overview</h2>
            <p className="text-gray-400 text-xs sm:text-sm">Your productivity at a glance</p>
          </div>

          {/* Compact Stats Grid - Mobile First */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-4">
            {/* Active Tasks */}
            <Card className="bg-gradient-to-br from-red-950/20 to-red-900/10 border-red-900/30">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center justify-between">
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-400 flex-shrink-0" />
                    <div className="text-right">
                      <div className="text-lg sm:text-xl font-bold text-white">
                        {tasks.filter((task) => task.status !== "done" && task.status !== "canceled").length}
                      </div>
                      <div className="text-xs text-red-400 font-medium">
                        {tasks.length > 0
                          ? Math.round(
                              (tasks.filter((task) => task.status !== "done" && task.status !== "canceled").length /
                                tasks.length) *
                                100,
                            )
                          : 0}
                        %
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-400 text-xs sm:text-sm font-medium">Active Tasks</p>
                </div>
              </CardContent>
            </Card>

            {/* Completed Tasks */}
            <Card className="bg-gradient-to-br from-green-950/20 to-green-900/10 border-green-900/30">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center justify-between">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-400 flex-shrink-0" />
                    <div className="text-right">
                      <div className="text-lg sm:text-xl font-bold text-white">
                        {tasks.filter((task) => task.status === "done").length}
                      </div>
                      <div className="text-xs text-green-400 font-medium">
                        {tasks.length > 0
                          ? Math.round((tasks.filter((task) => task.status === "done").length / tasks.length) * 100)
                          : 0}
                        %
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-400 text-xs sm:text-sm font-medium">Completed</p>
                </div>
              </CardContent>
            </Card>

            {/* In Progress Tasks */}
            <Card className="bg-gradient-to-br from-yellow-950/20 to-yellow-900/10 border-yellow-900/30">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center justify-between">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400 flex-shrink-0" />
                    <div className="text-right">
                      <div className="text-lg sm:text-xl font-bold text-white">
                        {tasks.filter((task) => task.status === "in_progress").length}
                      </div>
                      <div className="text-xs text-yellow-400 font-medium">
                        {tasks.filter((task) => task.status !== "done" && task.status !== "canceled").length > 0
                          ? Math.round(
                              (tasks.filter((task) => task.status === "in_progress").length /
                                tasks.filter((task) => task.status !== "done" && task.status !== "canceled").length) *
                                100,
                            )
                          : 0}
                        %
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-400 text-xs sm:text-sm font-medium">In Progress</p>
                </div>
              </CardContent>
            </Card>

            {/* Important Tasks */}
            <Card className="bg-gradient-to-br from-purple-950/20 to-purple-900/10 border-purple-900/30">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center justify-between">
                    <Star className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400 fill-current flex-shrink-0" />
                    <div className="text-right">
                      <div className="text-lg sm:text-xl font-bold text-white">
                        {
                          tasks.filter(
                            (task) => task.is_important && task.status !== "done" && task.status !== "canceled",
                          ).length
                        }
                      </div>
                      <div className="text-xs text-purple-400 font-medium">Priority</div>
                    </div>
                  </div>
                  <p className="text-gray-400 text-xs sm:text-sm font-medium">Important</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Navigation Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Button
              onClick={() => setCurrentView("overview")}
              variant={currentView === "overview" ? "default" : "outline"}
              className={`${
                currentView === "overview"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "border-gray-700 text-gray-300 hover:bg-gray-800 bg-transparent"
              } text-xs sm:text-sm`}
            >
              <List className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Overview
            </Button>
            <Button
              onClick={() => setCurrentView("create")}
              variant={currentView === "create" ? "default" : "outline"}
              className={`${
                currentView === "create"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "border-gray-700 text-gray-300 hover:bg-gray-800 bg-transparent"
              } text-xs sm:text-sm`}
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Create
            </Button>
            <Button
              onClick={() => setCurrentView("active")}
              variant={currentView === "active" ? "default" : "outline"}
              className={`${
                currentView === "active"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "border-gray-700 text-gray-300 hover:bg-gray-800 bg-transparent"
              } text-xs sm:text-sm`}
            >
              <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Active
            </Button>
            <Button
              onClick={() => setCurrentView("completed")}
              variant={currentView === "completed" ? "default" : "outline"}
              className={`${
                currentView === "completed"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "border-gray-700 text-gray-300 hover:bg-gray-800 bg-transparent"
              } text-xs sm:text-sm`}
            >
              <CheckSquare className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Done
            </Button>
          </div>

          {/* Collapsible Detailed Stats - Mobile Optimized */}
          {currentView === "overview" && (
            <>
              <div className="lg:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowStatsDetails(!showStatsDetails)}
                  className="w-full border-gray-700 text-gray-300 hover:bg-gray-800 bg-transparent text-xs mb-3"
                >
                  {showStatsDetails ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      Hide Details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      Show Details
                    </>
                  )}
                </Button>
              </div>

              {/* Detailed Stats Row - Collapsible on Mobile */}
              <div
                className={`grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 ${!showStatsDetails && "hidden lg:grid"}`}
              >
                {/* Priority Breakdown - Compact */}
                <Card className="bg-black/40 border-gray-700/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-sm sm:text-base flex items-center">
                      <Zap className="h-4 w-4 mr-2 text-yellow-400" />
                      Priority
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-gray-300">High</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-white font-semibold">
                          {
                            tasks.filter(
                              (task) =>
                                task.priority === "high" && task.status !== "done" && task.status !== "canceled",
                            ).length
                          }
                        </span>
                        <Badge className="bg-red-900/20 text-red-400 border-red-900/50 text-xs px-1 py-0">
                          {tasks.filter((task) => task.status !== "done" && task.status !== "canceled").length > 0
                            ? Math.round(
                                (tasks.filter(
                                  (task) =>
                                    task.priority === "high" && task.status !== "done" && task.status !== "canceled",
                                ).length /
                                  tasks.filter((task) => task.status !== "done" && task.status !== "canceled").length) *
                                  100,
                              )
                            : 0}
                          %
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <span className="text-gray-300">Med</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-white font-semibold">
                          {
                            tasks.filter(
                              (task) =>
                                task.priority === "medium" && task.status !== "done" && task.status !== "canceled",
                            ).length
                          }
                        </span>
                        <Badge className="bg-yellow-900/20 text-yellow-400 border-yellow-900/50 text-xs px-1 py-0">
                          {tasks.filter((task) => task.status !== "done" && task.status !== "canceled").length > 0
                            ? Math.round(
                                (tasks.filter(
                                  (task) =>
                                    task.priority === "medium" && task.status !== "done" && task.status !== "canceled",
                                ).length /
                                  tasks.filter((task) => task.status !== "done" && task.status !== "canceled").length) *
                                  100,
                              )
                            : 0}
                          %
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                        <span className="text-gray-300">Low</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-white font-semibold">
                          {
                            tasks.filter(
                              (task) => task.priority === "low" && task.status !== "done" && task.status !== "canceled",
                            ).length
                          }
                        </span>
                        <Badge className="bg-gray-900/20 text-gray-400 border-gray-700 text-xs px-1 py-0">
                          {tasks.filter((task) => task.status !== "done" && task.status !== "canceled").length > 0
                            ? Math.round(
                                (tasks.filter(
                                  (task) =>
                                    task.priority === "low" && task.status !== "done" && task.status !== "canceled",
                                ).length /
                                  tasks.filter((task) => task.status !== "done" && task.status !== "canceled").length) *
                                  100,
                              )
                            : 0}
                          %
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Due Date Overview - Compact */}
                <Card className="bg-black/40 border-gray-700/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-sm sm:text-base flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-blue-400" />
                      Due Dates
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-gray-300">Overdue</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-white font-semibold">
                          {
                            tasks.filter(
                              (task) =>
                                task.due_date &&
                                new Date(task.due_date) < new Date() &&
                                task.status !== "done" &&
                                task.status !== "canceled",
                            ).length
                          }
                        </span>
                        <Badge className="bg-red-900/20 text-red-400 border-red-900/50 text-xs px-1 py-0">Urgent</Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <span className="text-gray-300">Today</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-white font-semibold">
                          {
                            tasks.filter(
                              (task) =>
                                task.due_date &&
                                new Date(task.due_date).toDateString() === new Date().toDateString() &&
                                task.status !== "done" &&
                                task.status !== "canceled",
                            ).length
                          }
                        </span>
                        <Badge className="bg-yellow-900/20 text-yellow-400 border-yellow-900/50 text-xs px-1 py-0">
                          Today
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-gray-300">Future</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-white font-semibold">
                          {
                            tasks.filter(
                              (task) =>
                                task.due_date &&
                                new Date(task.due_date) > new Date() &&
                                task.status !== "done" &&
                                task.status !== "canceled",
                            ).length
                          }
                        </span>
                        <Badge className="bg-green-900/20 text-green-400 border-green-900/50 text-xs px-1 py-0">
                          Upcoming
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Project Summary - Compact */}
                <Card className="bg-black/40 border-gray-700/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-sm sm:text-base flex items-center">
                      <FolderPlus className="h-4 w-4 mr-2 text-green-400" />
                      Project
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-gray-300">Total Projects</span>
                      <span className="text-white font-semibold">{projects.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-gray-300">Active</span>
                      <div className="flex items-center space-x-1">
                        <span className="text-xs">{projects.find((p) => p.id === selectedProject)?.emoji || "📁"}</span>
                        <span className="text-white font-semibold text-xs truncate max-w-16">
                          {projects.find((p) => p.id === selectedProject)?.name || "None"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-gray-300">Tasks</span>
                      <span className="text-white font-semibold">
                        {tasks.filter((task) => task.project_id === selectedProject).length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-gray-300">Complete</span>
                      <Badge className="bg-blue-900/20 text-blue-400 border-blue-900/50 text-xs px-1 py-0">
                        {tasks.filter((task) => task.project_id === selectedProject).length > 0
                          ? Math.round(
                              (tasks.filter((task) => task.project_id === selectedProject && task.status === "done")
                                .length /
                                tasks.filter((task) => task.project_id === selectedProject).length) *
                                100,
                            )
                          : 0}
                        %
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>

        {error && (
          <Alert className="mb-4 sm:mb-6 border-red-900/50 bg-red-950/20">
            <AlertDescription className="text-red-400 text-sm sm:text-base">{error}</AlertDescription>
          </Alert>
        )}

        {/* Content based on current view */}
        {currentView === "create" && (
          <>
            {/* New Project Form */}
            {showProjectForm && (
              <div className="mb-6 sm:mb-8">
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-lg flex items-center">
                      <FolderPlus className="h-5 w-5 mr-2 text-green-400" />
                      Create New Project
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={createProject} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2">
                          <Label htmlFor="project-name" className="text-gray-300 text-sm">
                            Project Name
                          </Label>
                          <Input
                            id="project-name"
                            value={newProject.name}
                            onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                            className="bg-gray-900/50 border-gray-700 text-white focus:border-green-500 mt-1"
                            placeholder="Enter project name"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="project-emoji" className="text-gray-300 text-sm">
                            Emoji
                          </Label>
                          <Input
                            id="project-emoji"
                            value={newProject.emoji}
                            onChange={(e) => setNewProject({ ...newProject, emoji: e.target.value })}
                            className="bg-gray-900/50 border-gray-700 text-white focus:border-green-500 mt-1 text-center"
                            placeholder="📁"
                            maxLength={2}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="project-description" className="text-gray-300 text-sm">
                          Description (Optional)
                        </Label>
                        <Textarea
                          id="project-description"
                          value={newProject.description}
                          onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                          className="bg-gray-900/50 border-gray-700 text-white focus:border-green-500 mt-1 resize-none"
                          placeholder="Brief description of this project"
                          rows={2}
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
            <div className="mb-6 sm:mb-8">
              <Card className="bg-black/60 border-red-900/30 glow-effect">
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="text-white flex items-center text-lg sm:text-xl">
                    <Brain className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-red-500" />
                    Smart Task Creation
                    <Zap className="h-3 w-3 sm:h-4 sm:w-4 ml-2 text-yellow-400" />
                  </CardTitle>
                  <CardDescription className="text-gray-400 text-sm sm:text-base">
                    Just type naturally - I'll understand the context and extract all the details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={createTaskFromNaturalInput} className="space-y-4">
                    <div className="space-y-3">
                      <Label htmlFor="natural-input" className="text-gray-300 text-sm sm:text-base">
                        What needs to be done?
                      </Label>
                      <Textarea
                        id="natural-input"
                        value={naturalInput}
                        onChange={(e) => setNaturalInput(e.target.value)}
                        className="bg-gray-900/50 border-gray-700 text-white focus:border-red-500 min-h-[80px] sm:min-h-[100px] text-base sm:text-lg resize-none"
                        placeholder="🔥 Fix the login bug!!! due tomorrow - users can't sign in with Google authentication"
                        rows={3}
                      />

                      {/* Real-time parsing preview - Mobile Optimized */}
                      {parsedPreview && (
                        <div className="mt-3 p-3 sm:p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <Brain className="h-4 w-4 text-green-400 mr-2" />
                              <span className="text-green-400 text-sm font-medium">AI Parsed Preview:</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowPreviewHelp(!showPreviewHelp)}
                              className="text-gray-400 hover:text-white p-1 sm:hidden"
                            >
                              {showPreviewHelp ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </div>

                          {/* Mobile: Stacked Layout */}
                          <div className="space-y-3 sm:hidden">
                            <div>
                              <span className="text-gray-400 text-xs">Title:</span>
                              <div className="text-white flex items-center text-sm mt-1">
                                {parsedPreview.emoji && <span className="mr-2">{parsedPreview.emoji}</span>}
                                {parsedPreview.title}
                                {parsedPreview.isImportant && (
                                  <Star className="h-3 w-3 ml-2 text-red-400 fill-current" />
                                )}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-400 text-xs">Priority:</span>
                              <Badge className={`ml-2 text-xs ${getPriorityColor(parsedPreview.priority)}`}>
                                {parsedPreview.priority}
                              </Badge>
                            </div>
                            {parsedPreview.description && (
                              <div>
                                <span className="text-gray-400 text-xs">Description:</span>
                                <div className="text-gray-300 text-sm mt-1">{parsedPreview.description}</div>
                              </div>
                            )}
                            {parsedPreview.dueDate && (
                              <div>
                                <span className="text-gray-400 text-xs">Due Date:</span>
                                <div className="text-gray-300 flex items-center text-sm mt-1">
                                  <Calendar className="h-3 w-3 mr-1 text-red-400" />
                                  {new Date(parsedPreview.dueDate).toLocaleDateString()}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Desktop: Grid Layout */}
                          <div className="hidden sm:grid sm:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-400">Title:</span>
                              <div className="text-white flex items-center">
                                {parsedPreview.emoji && <span className="mr-2">{parsedPreview.emoji}</span>}
                                {parsedPreview.title}
                                {parsedPreview.isImportant && (
                                  <Star className="h-3 w-3 ml-2 text-red-400 fill-current" />
                                )}
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
                                <div className="text-gray-300">{parsedPreview.description}</div>
                              </div>
                            )}
                            {parsedPreview.dueDate && (
                              <div className="col-span-2">
                                <span className="text-gray-400">Due Date:</span>
                                <div className="text-gray-300 flex items-center">
                                  <Calendar className="h-3 w-3 mr-1 text-red-400" />
                                  {new Date(parsedPreview.dueDate).toLocaleDateString()}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Help Section - Collapsible on Mobile */}
                      <div className={`text-xs text-gray-500 space-y-1 mt-3 ${!showPreviewHelp && "hidden sm:block"}`}>
                        <p className="flex items-center">
                          <Brain className="h-3 w-3 mr-1 text-green-400" />
                          <strong>Smart Detection Examples:</strong>
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 ml-4 text-xs">
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
                    {/* Mobile-Optimized Form Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="project-select" className="text-gray-300 text-sm whitespace-nowrap">
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
                          <SelectTrigger className="w-full sm:w-48 bg-gray-900/50 border-gray-700 text-white text-sm">
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
                        className="bg-red-600 hover:bg-red-700 text-white px-6 sm:px-8 py-2 sm:py-3 text-sm sm:text-base"
                        disabled={isProcessing || !naturalInput.trim() || !selectedProject}
                      >
                        {isProcessing ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Creating...
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4 mr-2" />
                            Create Task
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Task Lists based on view */}
        {(currentView === "overview" || currentView === "active" || currentView === "completed") && (
          <div className="space-y-4 sm:space-y-6">
            {/* Filter Controls for Overview */}
            {currentView === "overview" && (
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCompleted(!showCompleted)}
                  className={`border-gray-700 text-gray-300 hover:bg-gray-800 bg-transparent text-xs sm:text-sm ${
                    showCompleted ? "bg-gray-800" : ""
                  }`}
                >
                  <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  {showCompleted ? "Hide" : "Show"} Completed
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCanceled(!showCanceled)}
                  className={`border-gray-700 text-gray-300 hover:bg-gray-800 bg-transparent text-xs sm:text-sm ${
                    showCanceled ? "bg-gray-800" : ""
                  }`}
                >
                  <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  {showCanceled ? "Hide" : "Show"} Canceled
                </Button>
              </div>
            )}

            {/* Task List */}
            <div className="space-y-3 sm:space-y-4">
              {tasks
                .filter((task) => {
                  if (currentView === "active") {
                    return task.status !== "done" && task.status !== "canceled"
                  } else if (currentView === "completed") {
                    return task.status === "done"
                  } else {
                    // Overview - apply filters
                    if (!showCompleted && task.status === "done") return false
                    if (!showCanceled && task.status === "canceled") return false
                    return true
                  }
                })
                .map((task) => (
                  <Card
                    key={task.id}
                    className={`bg-gray-800/50 border-gray-700 hover:border-gray-600 transition-all duration-200 ${
                      task.is_important ? "ring-1 ring-red-500/30" : ""
                    }`}
                  >
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {task.emoji && <span className="text-base sm:text-lg">{task.emoji}</span>}
                            <h3 className="text-white font-medium text-sm sm:text-base truncate">{task.title}</h3>
                            {task.is_important && (
                              <Star className="h-3 w-3 sm:h-4 sm:w-4 text-red-400 fill-current flex-shrink-0" />
                            )}
                          </div>

                          {task.description && (
                            <p className="text-gray-400 text-xs sm:text-sm mb-2 line-clamp-2">{task.description}</p>
                          )}

                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <div className="flex items-center gap-1">
                              {getStatusIcon(task.status)}
                              <Badge className={getStatusColor(task.status)}>{task.status.replace("_", " ")}</Badge>
                            </div>
                            <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                            {task.due_date && (
                              <Badge
                                className={`${
                                  new Date(task.due_date) < new Date() && task.status !== "done"
                                    ? "bg-red-900/20 text-red-400 border-red-900/50"
                                    : "bg-blue-900/20 text-blue-400 border-blue-900/50"
                                }`}
                              >
                                <Calendar className="h-3 w-3 mr-1" />
                                {new Date(task.due_date).toLocaleDateString()}
                              </Badge>
                            )}
                          </div>

                          {/* Checklist Items */}
                          {checklistItems[task.id] && checklistItems[task.id].length > 0 && (
                            <div className="mt-3 space-y-1">
                              {checklistItems[task.id].map((item) => (
                                <div key={item.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`checklist-${item.id}`}
                                    checked={item.is_completed}
                                    onCheckedChange={(checked) => toggleChecklistItem(item.id, checked as boolean)}
                                    className="border-gray-600 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                                  />
                                  <label
                                    htmlFor={`checklist-${item.id}`}
                                    className={`text-xs sm:text-sm cursor-pointer ${
                                      item.is_completed ? "line-through text-gray-500" : "text-gray-300"
                                    }`}
                                  >
                                    {item.title}
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 flex-shrink-0">
                          {task.status !== "done" && task.status !== "canceled" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  updateTaskStatus(task.id, task.status === "in_progress" ? "todo" : "in_progress")
                                }
                                className="border-yellow-700 text-yellow-400 hover:bg-yellow-900/20 bg-transparent text-xs px-2 py-1"
                              >
                                <Clock className="h-3 w-3" />
                                <span className="hidden sm:inline ml-1">
                                  {task.status === "in_progress" ? "Pause" : "Start"}
                                </span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateTaskStatus(task.id, "done")}
                                className="border-green-700 text-green-400 hover:bg-green-900/20 bg-transparent text-xs px-2 py-1"
                              >
                                <CheckCircle className="h-3 w-3" />
                                <span className="hidden sm:inline ml-1">Done</span>
                              </Button>
                            </>
                          )}
                          {task.status === "done" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateTaskStatus(task.id, "todo")}
                              className="border-yellow-700 text-yellow-400 hover:bg-yellow-900/20 bg-transparent text-xs px-2 py-1"
                            >
                              <AlertCircle className="h-3 w-3" />
                              <span className="hidden sm:inline ml-1">Reopen</span>
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteTask(task.id)}
                            className="border-red-700 text-red-400 hover:bg-red-900/20 bg-transparent text-xs px-2 py-1"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span className="hidden sm:inline ml-1">Delete</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

              {tasks.filter((task) => {
                if (currentView === "active") {
                  return task.status !== "done" && task.status !== "canceled"
                } else if (currentView === "completed") {
                  return task.status === "done"
                } else {
                  if (!showCompleted && task.status === "done") return false
                  if (!showCanceled && task.status === "canceled") return false
                  return true
                }
              }).length === 0 && (
                <Card className="bg-gray-800/30 border-gray-700/50">
                  <CardContent className="p-6 sm:p-8 text-center">
                    <div className="text-gray-500 mb-4">
                      <Skull className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 opacity-50" />
                    </div>
                    <h3 className="text-gray-400 text-lg sm:text-xl font-medium mb-2">
                      {currentView === "active" && "No active tasks"}
                      {currentView === "completed" && "No completed tasks yet"}
                      {currentView === "overview" && "No tasks found"}
                    </h3>
                    <p className="text-gray-500 text-sm sm:text-base">
                      {currentView === "active" && "All caught up! Time to create some new tasks."}
                      {currentView === "completed" && "Complete some tasks to see them here."}
                      {currentView === "overview" && "Create your first task to get started."}
                    </p>
                    {(currentView === "active" || currentView === "overview") && (
                      <Button
                        onClick={() => setCurrentView("create")}
                        className="mt-4 bg-red-600 hover:bg-red-700 text-white"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Task
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
