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
import { Skull, LogOut, Clock, CheckCircle, AlertCircle, Star, Calendar, Zap, Brain, Plus, X, FolderPlus, Lightbulb } from "lucide-react"

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
  const [debugInfo, setDebugInfo] = useState("")
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    emoji: "📁",
  })
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const router = useRouter()

  const getHumanReadableError = (errorMessage: string): string => {
    if (errorMessage.includes("Network")) {
      return "The digital underworld is unreachable. Check your connection."
    } else if (errorMessage.includes("JWT")) {
      return "Your dark session has expired. Please sign in again."
    } else if (errorMessage.includes("permission")) {
      return "The shadows deny you access. Insufficient permissions."
    } else if (errorMessage.includes("not found")) {
      return "What you seek has vanished into the void."
    } else if (errorMessage.includes("timeout")) {
      return "The darkness is taking too long to respond. Try again."
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
      setDebugInfo("Checking user authentication...")

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        console.error("Auth error:", userError)
        setError(`The authentication spirits are restless: ${getHumanReadableError(userError.message)}`)
        setLoading(false)
        return
      }

      if (!user) {
        setDebugInfo("No user found, redirecting to sign-in...")
        router.push("/sign-in")
        return
      }

      setUser(user)
      setDebugInfo(`User found: ${user.email}`)

      // Fetch projects after user is confirmed
      await fetchProjects(user.id)
    } catch (error: any) {
      console.error("Error checking user:", error)
      setError(`Error checking user: ${error.message}`)
      setLoading(false)
    }
  }

  const fetchProjects = async (userId: string) => {
    try {
      setDebugInfo("Fetching projects...")

      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Projects fetch error:", error)
        setError(`Failed to summon your projects: ${getHumanReadableError(error.message)}`)
        setLoading(false)
        return
      }

      setProjects(data || [])
      setDebugInfo(`Found ${data?.length || 0} projects`)

      if (data && data.length > 0) {
        setSelectedProject(data[0].id)
        await fetchTasks(data[0].id)
      } else {
        // No projects found, create a default one
        setDebugInfo("No projects found, creating default project...")
        await createDefaultProject(userId)
      }
    } catch (error: any) {
      console.error("Error fetching projects:", error)
      setError(`Error fetching projects: ${error.message}`)
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
        setError(`Error creating default project: ${projectError.message}`)
        setLoading(false)
        return
      }

      if (projectData) {
        setProjects([projectData])
        setSelectedProject(projectData.id)
        setDebugInfo("Default project created successfully")
        await fetchTasks(projectData.id)
      }
    } catch (error: any) {
      console.error("Error creating default project:", error)
      setError(`Error creating default project: ${error.message}`)
      setLoading(false)
    }
  }

  const fetchTasks = async (projectId: string) => {
    try {
      setDebugInfo("Fetching tasks...")

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
        setError(`Error fetching tasks: ${error.message}`)
        setLoading(false)
        return
      }

      setTasks(data || [])
      setDebugInfo(`Found ${data?.length || 0} tasks`)

      // Fetch checklist items for all tasks
      if (data && data.length > 0) {
        await fetchChecklistItems(data.map((task) => task.id))
      }

      setLoading(false)
      setDebugInfo("Dashboard loaded successfully!")
    } catch (error: any) {
      console.error("Error fetching tasks:", error)
      setError(`Error fetching tasks: ${error.message}`)
      setLoading(false)
    }
  }

  const fetchChecklistItems = async (taskIds: string[]) => {
    try {
      const { data: checklistData } = await supabase
        .from("checklist_items")
        .select("*")
        .in("task_id", taskIds)
        .order("created_at", { ascending: true })

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

    // Detect priority using exclamation shortcuts FIRST (higher priority than text detection)
    let priority = "medium"

    // Check for exclamation mark shortcuts (! = low, !! = medium, !!! = high)
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
        text.includes("critical") ||
        text.includes("🔥") ||
        text.includes("emergency")
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
      priority === "high" // Auto-mark high priority items as important

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
          // Try to parse the date
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

    // Look for description indicators
    const descriptionIndicators = [" - ", " : ", " because ", " to ", " for ", " about "]
    for (const indicator of descriptionIndicators) {
      if (cleanText.includes(indicator)) {
        const parts = cleanText.split(indicator, 2)
        title = parts[0].trim()
        description = parts[1].trim()
        break
      }
    }

    // Clean up title (remove priority/date keywords and exclamation shortcuts)
    title = title
      .replace(/\b(urgent|asap|high priority|low priority|important|critical|must do|priority)\b/gi, "")
      .replace(/\b(due|by|before|until)\s+[\w/-]+/gi, "")
      .replace(/\b(today|tomorrow|this week|next week)\b/gi, "")
      .replace(/!{1,3}(?!\w)/g, "") // Remove exclamation shortcuts
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
    try {
      const parsed = parseNaturalLanguage(naturalInput)

      const taskData = {
        title: parsed.title,
        description: parsed.description,
        emoji: parsed.emoji,
        user_id: user.id,
        project_id: selectedProject,
        status: "todo",
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

      if (error) throw error

      if (data) {
        setTasks([data[0], ...tasks])
        setNaturalInput("")
        setParsedPreview(null)
      }
    } catch (error: any) {
      setError(`Failed to forge your task in the darkness: ${getHumanReadableError(error.message)}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const updateData: any = { status }

      // If marking as done, set completed_at
      if (status === "done") {
        updateData.completed_at = new Date().toISOString()
      } else if (status !== "done") {
        updateData.completed_at = null
      }

      const { error } = await supabase.from("tasks").update(updateData).eq("id", taskId)

      if (error) throw error

      setTasks(
        tasks.map((task) =>
          task.id === taskId
            ? { ...task, status: status as Task["status"], completed_at: updateData.completed_at }
            : task,
        ),
      )
    } catch (error: any) {
      setError(`The task refuses to change its fate: ${getHumanReadableError(error.message)}`)
    }
  }

  const toggleChecklistItem = async (itemId: string, isCompleted: boolean) => {
    try {
      const { error } = await supabase.from("checklist_items").update({ is_completed: isCompleted }).eq("id", itemId)

      if (error) throw error

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
      setError(error.message)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/sign-in")
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "done":
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case "in_progress":
        return <Clock className="h-4 w-4 text-yellow-400" />
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
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="text-center">
          <div className="relative">
            <Skull className="h-16 w-16 text-red-500 mx-auto mb-6 animate-pulse" />
            <div className="absolute inset-0 rounded-full border-2 border-red-500/20 animate-ping"></div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Summoning Your Dark Empire...</h2>
          <p className="text-gray-400 mb-4">Awakening the shadows of productivity</p>
          <div className="flex justify-center space-x-1 mb-4">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
          </div>
          {debugInfo && <div className="text-gray-500 text-sm max-w-md">{debugInfo}</div>}
          {error && (
            <Alert className="mt-4 border-red-900/50 bg-red-950/20 max-w-md mx-auto">
              <AlertDescription className="text-red-400">{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-red-950">
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Skull className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-white">DarkTodo</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-400">Welcome, {user?.email}</span>
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
      </header>

      <main className="container mx-auto px-4 py-8">
        {error && (
          <Alert className="mb-6 border-red-900/50 bg-red-950/20">
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        {/* Smart Task Creation - Now at the top */}
        <div className="mb-8">
          <Card className="bg-black/60 border-red-900/30 glow-effect">
            <CardHeader className="pb-4">
              <CardTitle className="text-white flex items-center">
                <Brain className="h-5 w-5 mr-2 text-red-500" />
                Smart Task Creation
                <Zap className="h-4 w-4 ml-2 text-yellow-400" />
              </CardTitle>
              <CardDescription className="text-gray-400">
                Just type naturally - I'll understand the context and extract all the details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createTaskFromNaturalInput} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="natural-input" className="text-gray-300">
                    What needs to be done?
                  </Label>
                  <Textarea
                    id="natural-input"
                    value={naturalInput}
                    onChange={(e) => setNaturalInput(e.target.value)}
                    className="bg-gray-900/50 border-gray-700 text-white focus:border-red-500 min-h-[100px] text-lg"
                    placeholder="🔥 Fix the login bug!!! due tomorrow - users can't sign in with Google authentication"
                    rows={4}
                  />

                  {/* Real-time parsing preview */}
                  {parsedPreview && (
                    <div className="mt-3 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
                      <div className="flex items-center mb-2">
                        <Brain className="h-4 w-4 text-green-400 mr-2" />
                        <span className="text-green-400 text-sm font-medium">AI Parsed Preview:</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Title:</span>
                          <div className="text-white flex items-center">
                            {parsedPreview.emoji && <span className="mr-2">{parsedPreview.emoji}</span>}
                            {parsedPreview.title}
                            {parsedPreview.isImportant && <Star className="h-3 w-3 ml-2 text-red-400 fill-current" />}
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

                  <div className="text-xs text-gray-500 space-y-1 mt-3">
                    <p className="flex items-center">
                      <Brain className="h-3 w-3 mr-1 text-green-400" />
                      <strong>Smart Detection Examples:</strong>
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1 ml-4">
                      <p>
                        • <span className="text-yellow-400">Emojis:</span> 🔥 📝 ⚡ 🎯 automatically detected
                      </p>
                      <p>
                        • <span className="text-yellow-400">Priority:</span> ! (low) !! (medium) !!! (high)
                      </p>
                      <p>
                        • <span className="text-yellow-400">Due dates:</span> "tomorrow", "Friday", "12/25/2024"
                      </p>
                      <p>
                        • <span className="text-yellow-400">Details:</span> Use " - " to separate title from description
                      </p>
                      <p>
                        • <span className="text-yellow-400">Keywords:</span> "urgent", "important", "low priority"
                      </p>
                      <p>
                        • <span className="text-yellow-400">Quick example:</span> "🔥 Fix bug!!! due tomorrow"
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="project-select" className="text-gray-300 text-sm">
                      Project:
                    </Label>
                    <Select value={selectedProject} onValueChange={setSelectedProject}>
                      <SelectTrigger className="w-48 bg-gray-900/50 border-gray-700 text-white">
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700">
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id} className="text-white">
                            {project.emoji} {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="submit"
                    className="bg-red-600 hover:bg-red-700 text-white px-8 flex items-center"
                    disabled={isProcessing || !selectedProject || !naturalInput.trim()}
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

        {/* Tasks List */}
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Your Tasks</h2>
            <p className="text-gray-400">Manage your dark productivity empire</p>
          </div>

          <div className="space-y-4">
            {tasks.length === 0 ? (
              <Card className="bg-black/40 border-gray-800">
                <CardContent className="py-8 text-center">
                  <Skull className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No tasks yet. Create your first task above!</p>
                </CardContent>
              </Card>
            ) : (
              tasks.map((task) => (
                <Card key={task.id} className="task-card">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {task.emoji && <span className="text-lg">{task.emoji}</span>}
                          <h3 className="text-lg font-semibold text-white">{task.title}</h3>
                          {task.is_important && <Star className="h-4 w-4 text-red-400 fill-current" />}
                        </div>
                        {task.description && <p className="text-gray-400 mb-3">{task.description}</p>}

                        {/* Checklist Items */}
                        {checklistItems[task.id] && checklistItems[task.id].length > 0 && (
                          <div className="mb-3 space-y-2">
                            {checklistItems[task.id].map((item) => (
                              <div key={item.id} className="flex items-center space-x-2">
                                <Checkbox
                                  checked={item.is_completed}
                                  onCheckedChange={(checked) => toggleChecklistItem(item.id, !!checked)}
                                  className="border-gray-600"
                                />
                                <span
                                  className={`text-sm ${item.is_completed ? "text-gray-500 line-through" : "text-gray-300"}`}
                                >
                                  {item.text}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center space-x-2 mb-2">
                          {getStatusIcon(task.status)}
                          <Badge className={getStatusColor(task.status)}>{task.status.replace("_", " ")}</Badge>
                          <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                        </div>

                        {task.due_date && (
                          <div className="flex items-center space-x-1 text-xs text-gray-400 mb-2">
                            <Calendar className="h-3 w-3 text-red-400" />
                            <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <Select value={task.status} onValueChange={(value) => updateTaskStatus(task.id, value)}>
                          <SelectTrigger className="w-32 bg-gray-900/50 border-gray-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-gray-700">
                            <SelectItem value="todo" className="text-white">
                              To Do
                            </SelectItem>
                            <SelectItem value="in_progress" className="text-white">
                              In Progress
                            </SelectItem>
                            <SelectItem value="done" className="text-white">
                              Done
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Created: {new Date(task.created_at).toLocaleDateString()}
                      {task.completed_at && (
                        <span className="ml-4">Completed: {new Date(task.completed_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
