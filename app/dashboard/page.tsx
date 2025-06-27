"use client"

import type React from "react"

import { useState, useEffect, useCallback, useMemo } from "react"
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
import { Skull, LogOut, Clock, CheckCircle, AlertCircle, Star, Calendar, Zap, Brain, RefreshCw } from "lucide-react"
import { useErrorHandler } from "@/hooks/use-error-handler"
import { useRetry } from "@/hooks/use-retry"
import { validateTaskInput, sanitizeInput } from "@/lib/validation"

// Define valid status values to match database
const VALID_STATUSES = ["todo", "in_progress", "done"] as const
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
  const [debugInfo, setDebugInfo] = useState("")
  const [showCompleted, setShowCompleted] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const router = useRouter()
  const { error, handleError, clearError, hasError } = useErrorHandler()
  const { executeWithRetry, retryCount, isRetrying } = useRetry()

  // Memoized filtered tasks for performance
  const activeTasks = useMemo(() => tasks.filter((task) => task.status !== "done"), [tasks])

  const completedTasks = useMemo(() => tasks.filter((task) => task.status === "done"), [tasks])

  useEffect(() => {
    let mounted = true

    const initializeApp = async () => {
      try {
        await checkUser()
      } catch (error) {
        if (mounted) {
          handleError(error, "App Initialization")
        }
      }
    }

    initializeApp()

    return () => {
      mounted = false
    }
  }, [router]) // Added router dependency

  // Parse input in real-time for preview with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (naturalInput.trim()) {
        try {
          const parsed = parseNaturalLanguage(naturalInput)
          setParsedPreview(parsed)

          // Validate the parsed input
          const validation = validateTaskInput({
            title: parsed.title,
            description: parsed.description,
            priority: parsed.priority,
            dueDate: parsed.dueDate,
          })

          setValidationErrors(validation.errors)
        } catch (error) {
          handleError(error, "Input Parsing")
          setParsedPreview(null)
        }
      } else {
        setParsedPreview(null)
        setValidationErrors([])
      }
    }, 300) // Debounce for 300ms

    return () => clearTimeout(timeoutId)
  }, [naturalInput, handleError])

  const checkUser = useCallback(async () => {
    try {
      setDebugInfo("Checking user authentication...")

      const result = await executeWithRetry(async () => {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()
        if (userError) throw userError
        return user
      })

      if (!result) {
        setDebugInfo("No user found, redirecting to sign-in...")
        router.replace("/sign-in") // Use replace instead of push
        return
      }

      setUser(result)
      setDebugInfo(`User found: ${result.email}`)

      // Fetch projects after user is confirmed
      await fetchProjects(result.id)
    } catch (error: any) {
      handleError(error, "User Authentication")
      setLoading(false)
    }
  }, [router, executeWithRetry, handleError])

  const fetchProjects = useCallback(
    async (userId: string) => {
      try {
        setDebugInfo("Fetching projects...")

        const data = await executeWithRetry(async () => {
          const { data, error } = await supabase
            .from("projects")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })

          if (error) throw error
          return data
        })

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
        handleError(error, "Fetch Projects")
        setLoading(false)
      }
    },
    [executeWithRetry, handleError],
  )

  const createDefaultProject = useCallback(
    async (userId: string) => {
      try {
        const projectData = await executeWithRetry(async () => {
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

          if (projectError) throw projectError
          return projectData
        })

        if (projectData) {
          setProjects([projectData])
          setSelectedProject(projectData.id)
          setDebugInfo("Default project created successfully")
          await fetchTasks(projectData.id)
        }
      } catch (error: any) {
        handleError(error, "Create Default Project")
        setLoading(false)
      }
    },
    [executeWithRetry, handleError],
  )

  const fetchTasks = useCallback(
    async (projectId: string) => {
      try {
        setDebugInfo("Fetching tasks...")

        const data = await executeWithRetry(async () => {
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

          if (error) throw error
          return data
        })

        setTasks(data || [])
        setDebugInfo(`Found ${data?.length || 0} tasks`)

        // Fetch checklist items for all tasks
        if (data && data.length > 0) {
          await fetchChecklistItems(data.map((task) => task.id))
        }

        setLoading(false)
        setDebugInfo("Dashboard loaded successfully!")
      } catch (error: any) {
        handleError(error, "Fetch Tasks")
        setLoading(false)
      }
    },
    [executeWithRetry, handleError],
  )

  const fetchChecklistItems = useCallback(
    async (taskIds: string[]) => {
      try {
        const checklistData = await executeWithRetry(async () => {
          const { data: checklistData, error } = await supabase
            .from("checklist_items")
            .select("*")
            .in("task_id", taskIds)
            .order("created_at", { ascending: true })

          if (error) throw error
          return checklistData
        })

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
        // Don't fail the whole dashboard for checklist items
        console.warn("Failed to fetch checklist items:", error)
      }
    },
    [executeWithRetry],
  )

  const parseNaturalLanguage = useCallback((input: string) => {
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

    // Extract due date patterns with better error handling
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
        try {
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
            // Try to parse the date with better validation
            const parsed = new Date(dateStr)
            if (!isNaN(parsed.getTime()) && parsed > new Date()) {
              dueDate = parsed.toISOString().split("T")[0] + "T23:59"
            }
          }
        } catch (e) {
          // Ignore invalid dates
          console.warn("Failed to parse date:", dateStr, e)
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

    // Sanitize inputs
    title = sanitizeInput(title)
    if (description) {
      description = sanitizeInput(description)
    }

    return {
      title: title || "New Task",
      description,
      emoji,
      priority,
      isImportant,
      dueDate,
    }
  }, [])

  const createTaskFromNaturalInput = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!naturalInput.trim() || !selectedProject) return

      // Clear previous errors
      clearError()

      setIsProcessing(true)
      try {
        const parsed = parseNaturalLanguage(naturalInput)

        // Validate input
        const validation = validateTaskInput({
          title: parsed.title,
          description: parsed.description,
          priority: parsed.priority,
          dueDate: parsed.dueDate,
        })

        if (!validation.isValid) {
          setValidationErrors(validation.errors)
          return
        }

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

        const data = await executeWithRetry(async () => {
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
          return data
        })

        if (data) {
          setTasks([data[0], ...tasks])
          setNaturalInput("")
          setParsedPreview(null)
          setValidationErrors([])
        }
      } catch (error: any) {
        handleError(error, "Create Task")
      } finally {
        setIsProcessing(false)
      }
    },
    [naturalInput, selectedProject, user, tasks, parseNaturalLanguage, executeWithRetry, handleError, clearError],
  )

  const updateTaskStatus = useCallback(
    async (taskId: string, newStatus: string) => {
      try {
        // Clear previous errors
        clearError()

        // Validate the status value
        if (!VALID_STATUSES.includes(newStatus as TaskStatus)) {
          throw new Error(`Invalid task status: ${newStatus}`)
        }

        const updateData: any = { status: newStatus }

        // If marking as done, set completed_at
        if (newStatus === "done") {
          updateData.completed_at = new Date().toISOString()
        } else {
          // If changing from done to another status, clear completed_at
          updateData.completed_at = null
        }

        console.log("Updating task:", taskId, "with data:", updateData)

        const data = await executeWithRetry(async () => {
          const { data, error } = await supabase.from("tasks").update(updateData).eq("id", taskId).select()

          if (error) throw error
          return data
        })

        console.log("Database update successful:", data)

        // Update local state with the returned data
        if (data && data.length > 0) {
          const updatedTask = data[0]
          setTasks((prevTasks) =>
            prevTasks.map((task) =>
              task.id === taskId
                ? { ...task, status: updatedTask.status, completed_at: updatedTask.completed_at }
                : task,
            ),
          )
        } else {
          // Fallback: update local state manually if no data returned
          setTasks((prevTasks) =>
            prevTasks.map((task) =>
              task.id === taskId
                ? { ...task, status: newStatus as Task["status"], completed_at: updateData.completed_at }
                : task,
            ),
          )
        }

        console.log("Local state updated successfully")
      } catch (error: any) {
        handleError(error, "Update Task Status")
      }
    },
    [executeWithRetry, handleError, clearError],
  )

  const toggleChecklistItem = useCallback(
    async (itemId: string, isCompleted: boolean) => {
      try {
        await executeWithRetry(async () => {
          const { error } = await supabase
            .from("checklist_items")
            .update({ is_completed: isCompleted })
            .eq("id", itemId)

          if (error) throw error
        })

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
        handleError(error, "Toggle Checklist Item")
      }
    },
    [executeWithRetry, handleError],
  )

  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
      router.replace("/sign-in")
    } catch (error) {
      handleError(error, "Sign Out")
    }
  }, [router, handleError])

  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case "done":
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case "in_progress":
        return <Clock className="h-4 w-4 text-yellow-400" />
      default:
        return <AlertCircle className="h-4 w-4 text-red-400" />
    }
  }, [])

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case "done":
        return "bg-green-900/20 text-green-400 border-green-900/50"
      case "in_progress":
        return "bg-yellow-900/20 text-yellow-400 border-yellow-900/50"
      default:
        return "bg-red-900/20 text-red-400 border-red-900/50"
    }
  }, [])

  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-900/20 text-red-400 border-red-900/50"
      case "medium":
        return "bg-yellow-900/20 text-yellow-400 border-yellow-900/50"
      default:
        return "bg-gray-900/20 text-gray-400 border-gray-700"
    }
  }, [])

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
          {hasError && (
            <Alert className="mt-4 border-red-900/50 bg-red-950/20 max-w-md mx-auto">
              <AlertDescription className="text-red-400">{error}</AlertDescription>
            </Alert>
          )}
          {isRetrying && (
            <div className="mt-2 text-yellow-400 text-sm flex items-center justify-center">
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Retrying... (Attempt {retryCount})
            </div>
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
        {hasError && (
          <Alert className="mb-6 border-red-900/50 bg-red-950/20">
            <AlertDescription className="text-red-400 flex items-center justify-between">
              {error}
              <Button variant="ghost" size="sm" onClick={clearError} className="text-red-400 hover:text-red-300">
                ✕
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {validationErrors.length > 0 && (
          <Alert className="mb-6 border-yellow-900/50 bg-yellow-950/20">
            <AlertDescription className="text-yellow-400">
              <div className="font-medium mb-2">Please fix the following issues:</div>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
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
                    maxLength={1000}
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
                    disabled={isProcessing || !selectedProject || !naturalInput.trim() || validationErrors.length > 0}
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
        <div className="space-y-8">
          {/* Active Tasks Section */}
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Active Tasks</h2>
              <p className="text-gray-400">Tasks that need your attention ({activeTasks.length})</p>
            </div>

            <div className="space-y-4">
              {activeTasks.length === 0 ? (
                <Card className="bg-black/40 border-gray-800">
                  <CardContent className="py-8 text-center">
                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <p className="text-gray-400">All tasks completed! Time to rest in the shadows.</p>
                  </CardContent>
                </Card>
              ) : (
                activeTasks.map((task) => (
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
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Completed Tasks Section */}
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Completed Tasks</h2>
                <p className="text-gray-400">{completedTasks.length} tasks conquered by the darkness</p>
              </div>
              {completedTasks.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  {showCompleted ? "Hide" : "Show"} Completed
                </Button>
              )}
            </div>

            {showCompleted && (
              <div className="space-y-4">
                {completedTasks.length === 0 ? (
                  <Card className="bg-black/40 border-gray-800">
                    <CardContent className="py-8 text-center">
                      <Skull className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">No completed tasks yet. Get to work!</p>
                    </CardContent>
                  </Card>
                ) : (
                  completedTasks.map((task) => (
                    <Card key={task.id} className="task-card opacity-75 bg-green-950/10 border-green-900/30">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              {task.emoji && <span className="text-lg opacity-60">{task.emoji}</span>}
                              <h3 className="text-lg font-semibold text-white line-through opacity-75">{task.title}</h3>
                              {task.is_important && <Star className="h-4 w-4 text-red-400 fill-current opacity-60" />}
                              <CheckCircle className="h-4 w-4 text-green-400" />
                            </div>
                            {task.description && <p className="text-gray-400 mb-3 opacity-75">{task.description}</p>}

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
                              <Badge className="bg-green-900/20 text-green-400 border-green-900/50">completed</Badge>
                              <Badge className={`${getPriorityColor(task.priority)} opacity-60`}>{task.priority}</Badge>
                            </div>

                            {task.due_date && (
                              <div className="flex items-center space-x-1 text-xs text-gray-400 mb-2 opacity-60">
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
                        <div className="text-xs text-gray-500 opacity-75">
                          Created: {new Date(task.created_at).toLocaleDateString()}
                          {task.completed_at && (
                            <span className="ml-4 text-green-400">
                              ✓ Completed: {new Date(task.completed_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
