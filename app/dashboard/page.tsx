"use client"
import { useState, useEffect } from "react"
import type React from "react"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase, type Task, type Project } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Edit, Save, X } from "lucide-react"
import {
  Skull,
  LogOut,
  Clock,
  CheckCircle,
  AlertCircle,
  Star,
  Calendar,
  Zap,
  Menu,
  ChevronDown,
  ChevronUp,
  FolderPlus,
  Plus,
  CheckSquare,
  ArrowRight,
} from "lucide-react"

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string>("")
  const [error, setError] = useState("")
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showStatsDetails, setShowStatsDetails] = useState(false)
  const [editingTask, setEditingTask] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{
    title: string
    description: string
    priority: string
    is_important: boolean
  }>({
    title: "",
    description: "",
    priority: "medium",
    is_important: false,
  })

  const [quickTaskTitle, setQuickTaskTitle] = useState("")
  const [quickTaskPriority, setQuickTaskPriority] = useState("medium")
  const [quickTaskImportant, setQuickTaskImportant] = useState(false)
  const [isCreatingQuickTask, setIsCreatingQuickTask] = useState(false)

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

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push("/sign-in")
    } catch (error: any) {
      console.error("Error signing out:", error)
      setError(`Error signing out: ${getHumanReadableError(error.message)}`)
    }
  }

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus }

      if (newStatus === "done") {
        updateData.completed_at = new Date().toISOString()
      } else if (newStatus === "canceled") {
        updateData.completed_at = new Date().toISOString()
      } else {
        updateData.completed_at = null
      }

      const { error } = await supabase.from("tasks").update(updateData).eq("id", taskId)

      if (error) {
        console.error("Database update error:", error)
        throw error
      }

      // Update local state
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId ? { ...task, status: newStatus, completed_at: updateData.completed_at } : task,
        ),
      )

      setError("")
    } catch (error: any) {
      console.error("Error updating task status:", error)
      setError(`Failed to update task: ${getHumanReadableError(error.message)}`)
    }
  }

  const startEditingTask = (task: Task) => {
    setEditingTask(task.id)
    setEditForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      is_important: task.is_important,
    })
  }

  const saveTaskEdit = async () => {
    if (!editingTask) return

    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          title: editForm.title,
          description: editForm.description,
          priority: editForm.priority,
          is_important: editForm.is_important,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingTask)

      if (error) {
        console.error("Database update error:", error)
        throw error
      }

      // Update local state
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === editingTask
            ? {
                ...task,
                title: editForm.title,
                description: editForm.description,
                priority: editForm.priority,
                is_important: editForm.is_important,
                updated_at: new Date().toISOString(),
              }
            : task,
        ),
      )

      setEditingTask(null)
      setError("")
    } catch (error: any) {
      console.error("Error updating task:", error)
      setError(`Failed to update task: ${getHumanReadableError(error.message)}`)
    }
  }

  const cancelTaskEdit = () => {
    setEditingTask(null)
    setEditForm({
      title: "",
      description: "",
      priority: "medium",
      is_important: false,
    })
  }

  const createQuickTask = async () => {
    if (!quickTaskTitle.trim() || !user || !selectedProject) return

    setIsCreatingQuickTask(true)
    try {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          user_id: user.id,
          project_id: selectedProject,
          title: quickTaskTitle.trim(),
          description: null,
          emoji: null,
          status: "todo",
          priority: quickTaskPriority,
          is_important: quickTaskImportant,
          due_date: null,
        })
        .select(`
        *,
        projects (
          name,
          emoji
        )
      `)
        .single()

      if (error) {
        console.error("Error creating quick task:", error)
        throw error
      }

      if (data) {
        setTasks((prevTasks) => [data, ...prevTasks])
        setQuickTaskTitle("")
        setQuickTaskPriority("medium")
        setQuickTaskImportant(false)
        setError("")
      }
    } catch (error: any) {
      console.error("Error creating quick task:", error)
      setError(`Failed to create task: ${getHumanReadableError(error.message)}`)
    } finally {
      setIsCreatingQuickTask(false)
    }
  }

  const handleQuickTaskKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      createQuickTask()
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

      {/* Quick Task Creation */}
      <div className="mb-6 sm:mb-8">
        <Card className="bg-gradient-to-r from-red-950/20 to-red-900/10 border-red-900/30">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <Plus className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Quick Add Task</h3>
                <p className="text-gray-400 text-sm">Create a new task instantly</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Input
                    value={quickTaskTitle}
                    onChange={(e) => setQuickTaskTitle(e.target.value)}
                    onKeyPress={handleQuickTaskKeyPress}
                    placeholder="What needs to be done?"
                    className="bg-gray-900/50 border-gray-600 text-white placeholder:text-gray-500 h-12 text-base"
                    disabled={isCreatingQuickTask}
                  />
                </div>

                <div className="flex gap-2 sm:gap-3">
                  <Select value={quickTaskPriority} onValueChange={setQuickTaskPriority} disabled={isCreatingQuickTask}>
                    <SelectTrigger className="bg-gray-900/50 border-gray-600 text-white w-32 h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-600">
                      <SelectItem value="low" className="text-gray-300">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                          Low
                        </div>
                      </SelectItem>
                      <SelectItem value="medium" className="text-gray-300">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          Medium
                        </div>
                      </SelectItem>
                      <SelectItem value="high" className="text-gray-300">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          High
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    onClick={() => setQuickTaskImportant(!quickTaskImportant)}
                    variant="outline"
                    size="default"
                    className={`border-gray-600 h-12 px-3 ${
                      quickTaskImportant
                        ? "bg-red-900/20 border-red-500/50 text-red-400"
                        : "text-gray-400 hover:bg-gray-800 bg-transparent"
                    }`}
                    disabled={isCreatingQuickTask}
                  >
                    <Star className={`h-4 w-4 ${quickTaskImportant ? "fill-current" : ""}`} />
                    <span className="sr-only">Mark as important</span>
                  </Button>

                  <Button
                    onClick={createQuickTask}
                    disabled={!quickTaskTitle.trim() || isCreatingQuickTask}
                    className="bg-red-600 hover:bg-red-700 text-white h-12 px-6"
                  >
                    {isCreatingQuickTask ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2"></div>
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Task
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-4">
                  <span>Press Enter to add quickly</span>
                  {selectedProject && projects.find((p) => p.id === selectedProject) && (
                    <span className="flex items-center gap-1">
                      Adding to:
                      <span className="text-gray-400 font-medium">
                        {projects.find((p) => p.id === selectedProject)?.emoji}{" "}
                        {projects.find((p) => p.id === selectedProject)?.name}
                      </span>
                    </span>
                  )}
                </div>
                <Link href="/dashboard/create" className="text-red-400 hover:text-red-300 transition-colors">
                  Advanced creation →
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <main className="container mx-auto px-4 py-4 sm:py-6 lg:py-8 max-w-6xl">
        {/* Dashboard Stats Section */}
        <div className="mb-6 sm:mb-8">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Dashboard Overview</h2>
            <p className="text-gray-400 text-sm sm:text-base">Your productivity at a glance</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            {/* Active Tasks */}
            <Card className="bg-gradient-to-br from-red-950/20 to-red-900/10 border-red-900/30">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-400 flex-shrink-0" />
                    <div className="text-right">
                      <div className="text-xl sm:text-2xl font-bold text-white">
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
                  <p className="text-gray-400 text-sm font-medium">Active Tasks</p>
                </div>
              </CardContent>
            </Card>

            {/* Completed Tasks */}
            <Card className="bg-gradient-to-br from-green-950/20 to-green-900/10 border-green-900/30">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-400 flex-shrink-0" />
                    <div className="text-right">
                      <div className="text-xl sm:text-2xl font-bold text-white">
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
                  <p className="text-gray-400 text-sm font-medium">Completed</p>
                </div>
              </CardContent>
            </Card>

            {/* In Progress Tasks */}
            <Card className="bg-gradient-to-br from-yellow-950/20 to-yellow-900/10 border-yellow-900/30">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400 flex-shrink-0" />
                    <div className="text-right">
                      <div className="text-xl sm:text-2xl font-bold text-white">
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
                  <p className="text-gray-400 text-sm font-medium">In Progress</p>
                </div>
              </CardContent>
            </Card>

            {/* Important Tasks */}
            <Card className="bg-gradient-to-br from-purple-950/20 to-purple-900/10 border-purple-900/30">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <Star className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400 fill-current flex-shrink-0" />
                    <div className="text-right">
                      <div className="text-xl sm:text-2xl font-bold text-white">
                        {
                          tasks.filter(
                            (task) => task.is_important && task.status !== "done" && task.status !== "canceled",
                          ).length
                        }
                      </div>
                      <div className="text-xs text-purple-400 font-medium">Priority</div>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm font-medium">Important</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <Link href="/dashboard/create">
              <Card className="bg-black/40 border-gray-700/30 hover:border-red-500/50 transition-all duration-200 cursor-pointer group">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Plus className="h-5 w-5 text-red-400 group-hover:text-red-300" />
                      <div>
                        <h3 className="text-white font-medium">Create Task</h3>
                        <p className="text-gray-400 text-xs">Smart AI creation</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-red-400 transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/active">
              <Card className="bg-black/40 border-gray-700/30 hover:border-yellow-500/50 transition-all duration-200 cursor-pointer group">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="h-5 w-5 text-yellow-400 group-hover:text-yellow-300" />
                      <div>
                        <h3 className="text-white font-medium">Active Tasks</h3>
                        <p className="text-gray-400 text-xs">
                          {tasks.filter((task) => task.status !== "done" && task.status !== "canceled").length} pending
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-yellow-400 transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/completed">
              <Card className="bg-black/40 border-gray-700/30 hover:border-green-500/50 transition-all duration-200 cursor-pointer group">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CheckSquare className="h-5 w-5 text-green-400 group-hover:text-green-300" />
                      <div>
                        <h3 className="text-white font-medium">Completed</h3>
                        <p className="text-gray-400 text-xs">
                          {tasks.filter((task) => task.status === "done").length} finished
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-green-400 transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/projects">
              <Card className="bg-black/40 border-gray-700/30 hover:border-blue-500/50 transition-all duration-200 cursor-pointer group">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FolderPlus className="h-5 w-5 text-blue-400 group-hover:text-blue-300" />
                      <div>
                        <h3 className="text-white font-medium">Projects</h3>
                        <p className="text-gray-400 text-xs">{projects.length} projects</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-blue-400 transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Detailed Stats - Collapsible */}
          <div className="lg:hidden mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStatsDetails(!showStatsDetails)}
              className="w-full border-gray-700 text-gray-300 hover:bg-gray-800 bg-transparent text-sm"
            >
              {showStatsDetails ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Hide Detailed Stats
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Show Detailed Stats
                </>
              )}
            </Button>
          </div>

          {/* Detailed Stats Row */}
          <div className={`grid grid-cols-1 lg:grid-cols-3 gap-4 ${!showStatsDetails && "hidden lg:grid"}`}>
            {/* Priority Breakdown */}
            <Card className="bg-black/40 border-gray-700/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base flex items-center">
                  <Zap className="h-4 w-4 mr-2 text-yellow-400" />
                  Priority Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-gray-300">High Priority</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-semibold">
                      {
                        tasks.filter(
                          (task) => task.priority === "high" && task.status !== "done" && task.status !== "canceled",
                        ).length
                      }
                    </span>
                    <Badge className="bg-red-900/20 text-red-400 border-red-900/50 text-xs">
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
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-gray-300">Medium Priority</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-semibold">
                      {
                        tasks.filter(
                          (task) => task.priority === "medium" && task.status !== "done" && task.status !== "canceled",
                        ).length
                      }
                    </span>
                    <Badge className="bg-yellow-900/20 text-yellow-400 border-yellow-900/50 text-xs">
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
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                    <span className="text-gray-300">Low Priority</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-semibold">
                      {
                        tasks.filter(
                          (task) => task.priority === "low" && task.status !== "done" && task.status !== "canceled",
                        ).length
                      }
                    </span>
                    <Badge className="bg-gray-900/20 text-gray-400 border-gray-700 text-xs">
                      {tasks.filter((task) => task.status !== "done" && task.status !== "canceled").length > 0
                        ? Math.round(
                            (tasks.filter(
                              (task) => task.priority === "low" && task.status !== "done" && task.status !== "canceled",
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

            {/* Due Date Overview */}
            <Card className="bg-black/40 border-gray-700/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-blue-400" />
                  Due Date Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-gray-300">Overdue</span>
                  </div>
                  <div className="flex items-center space-x-2">
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
                    <Badge className="bg-red-900/20 text-red-400 border-red-900/50 text-xs">Urgent</Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-gray-300">Due Today</span>
                  </div>
                  <div className="flex items-center space-x-2">
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
                    <Badge className="bg-yellow-900/20 text-yellow-400 border-yellow-900/50 text-xs">Today</Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-gray-300">Future</span>
                  </div>
                  <div className="flex items-center space-x-2">
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
                    <Badge className="bg-green-900/20 text-green-400 border-green-900/50 text-xs">Upcoming</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Project Summary */}
            <Card className="bg-black/40 border-gray-700/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base flex items-center">
                  <FolderPlus className="h-4 w-4 mr-2 text-green-400" />
                  Current Project
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">Active Project</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{projects.find((p) => p.id === selectedProject)?.emoji || "📁"}</span>
                    <span className="text-white font-semibold">
                      {projects.find((p) => p.id === selectedProject)?.name || "None"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">Total Tasks</span>
                  <span className="text-white font-semibold">
                    {tasks.filter((task) => task.project_id === selectedProject).length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">Completion Rate</span>
                  <Badge className="bg-blue-900/20 text-blue-400 border-blue-900/50 text-xs">
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
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">Total Projects</span>
                  <span className="text-white font-semibold">{projects.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {error && (
          <Alert className="mb-6 border-red-900/50 bg-red-950/20">
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        {/* Top Priority Tasks Section */}
        <div className="mb-6 sm:mb-8">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Top Priority Tasks</h2>
            <p className="text-gray-400 text-sm sm:text-base">Your most important active tasks</p>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {tasks
              .filter((task) => task.status !== "done" && task.status !== "canceled")
              .sort((a, b) => {
                // Sort by priority (high > medium > low) then by importance then by due date
                const priorityOrder = { high: 3, medium: 2, low: 1 }
                const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0
                const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0

                if (aPriority !== bPriority) return bPriority - aPriority
                if (a.is_important !== b.is_important) return a.is_important ? -1 : 1

                // Sort by due date (overdue first, then soonest)
                if (a.due_date && b.due_date) {
                  return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
                }
                if (a.due_date && !b.due_date) return -1
                if (!a.due_date && b.due_date) return 1

                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              })
              .slice(0, 3)
              .map((task, index) => (
                <Card
                  key={task.id}
                  className={`bg-gray-800/50 border-gray-700 hover:border-gray-600 transition-all duration-200 ${
                    task.is_important ? "ring-1 ring-red-500/30" : ""
                  } ${index === 0 ? "border-yellow-500/50" : ""}`}
                >
                  <CardContent className="p-4 sm:p-6">
                    {editingTask === task.id ? (
                      // Edit Mode
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                          <Edit className="h-4 w-4 text-yellow-400" />
                          <span className="text-yellow-400 text-sm font-medium">Editing Task</span>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="text-gray-300 text-sm font-medium mb-2 block">Title</label>
                            <Input
                              value={editForm.title}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                              className="bg-gray-900/50 border-gray-600 text-white"
                              placeholder="Task title..."
                            />
                          </div>

                          <div>
                            <label className="text-gray-300 text-sm font-medium mb-2 block">Description</label>
                            <Textarea
                              value={editForm.description}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                              className="bg-gray-900/50 border-gray-600 text-white min-h-[80px]"
                              placeholder="Task description..."
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-gray-300 text-sm font-medium mb-2 block">Priority</label>
                              <Select
                                value={editForm.priority}
                                onValueChange={(value) => setEditForm((prev) => ({ ...prev, priority: value }))}
                              >
                                <SelectTrigger className="bg-gray-900/50 border-gray-600 text-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-900 border-gray-600">
                                  <SelectItem value="low" className="text-gray-300">
                                    Low Priority
                                  </SelectItem>
                                  <SelectItem value="medium" className="text-gray-300">
                                    Medium Priority
                                  </SelectItem>
                                  <SelectItem value="high" className="text-gray-300">
                                    High Priority
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex items-end">
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editForm.is_important}
                                  onChange={(e) => setEditForm((prev) => ({ ...prev, is_important: e.target.checked }))}
                                  className="rounded border-gray-600 bg-gray-900/50 text-red-500 focus:ring-red-500"
                                />
                                <span className="text-gray-300 text-sm">Important</span>
                                <Star className="h-4 w-4 text-red-400" />
                              </label>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={saveTaskEdit}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                          <Button
                            onClick={cancelTaskEdit}
                            variant="outline"
                            size="sm"
                            className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {index === 0 && <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>}
                            {task.emoji && <span className="text-lg sm:text-xl">{task.emoji}</span>}
                            <h3 className="text-white font-medium text-base sm:text-lg truncate">{task.title}</h3>
                            {task.is_important && (
                              <Star className="h-4 w-4 sm:h-5 sm:w-5 text-red-400 fill-current flex-shrink-0" />
                            )}
                          </div>

                          {task.description && (
                            <p className="text-gray-400 text-sm sm:text-base mb-3 line-clamp-2">{task.description}</p>
                          )}

                          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm mb-3">
                            <div className="flex items-center gap-1">
                              {task.status === "in_progress" ? (
                                <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400" />
                              ) : (
                                <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-400" />
                              )}
                              <Badge
                                className={
                                  task.status === "in_progress"
                                    ? "bg-yellow-900/20 text-yellow-400 border-yellow-900/50"
                                    : "bg-red-900/20 text-red-400 border-red-900/50"
                                }
                              >
                                {task.status.replace("_", " ")}
                              </Badge>
                            </div>

                            <Badge
                              className={
                                task.priority === "high"
                                  ? "bg-red-900/20 text-red-400 border-red-900/50"
                                  : task.priority === "medium"
                                    ? "bg-yellow-900/20 text-yellow-400 border-yellow-900/50"
                                    : "bg-gray-900/20 text-gray-400 border-gray-700"
                              }
                            >
                              {task.priority} priority
                            </Badge>

                            {task.due_date && (
                              <Badge
                                className={`${
                                  new Date(task.due_date) < new Date() && task.status !== "done"
                                    ? "bg-red-900/20 text-red-400 border-red-900/50"
                                    : new Date(task.due_date).toDateString() === new Date().toDateString()
                                      ? "bg-yellow-900/20 text-yellow-400 border-yellow-900/50"
                                      : "bg-blue-900/20 text-blue-400 border-blue-900/50"
                                }`}
                              >
                                <Calendar className="h-3 w-3 mr-1" />
                                {new Date(task.due_date) < new Date() && task.status !== "done"
                                  ? "Overdue"
                                  : new Date(task.due_date).toDateString() === new Date().toDateString()
                                    ? "Due Today"
                                    : new Date(task.due_date).toLocaleDateString()}
                              </Badge>
                            )}

                            {task.projects && (
                              <Badge className="bg-blue-900/20 text-blue-400 border-blue-900/50">
                                {task.projects.emoji} {task.projects.name}
                              </Badge>
                            )}
                          </div>

                          {/* Quick Status Change */}
                          <div className="flex flex-wrap gap-2">
                            {task.status !== "in_progress" && (
                              <Button
                                onClick={() => updateTaskStatus(task.id, "in_progress")}
                                variant="outline"
                                size="sm"
                                className="border-yellow-700 text-yellow-400 hover:bg-yellow-900/20 bg-transparent text-xs px-2 py-1"
                              >
                                <Clock className="h-3 w-3 mr-1" />
                                Start
                              </Button>
                            )}

                            {task.status === "in_progress" && (
                              <Button
                                onClick={() => updateTaskStatus(task.id, "todo")}
                                variant="outline"
                                size="sm"
                                className="border-gray-700 text-gray-400 hover:bg-gray-800 bg-transparent text-xs px-2 py-1"
                              >
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Pause
                              </Button>
                            )}

                            <Button
                              onClick={() => updateTaskStatus(task.id, "done")}
                              variant="outline"
                              size="sm"
                              className="border-green-700 text-green-400 hover:bg-green-900/20 bg-transparent text-xs px-2 py-1"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Complete
                            </Button>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <Button
                            onClick={() => startEditingTask(task)}
                            variant="outline"
                            size="sm"
                            className="border-blue-700 text-blue-400 hover:bg-blue-900/20 bg-transparent text-xs px-2 py-1"
                          >
                            <Edit className="h-3 w-3" />
                            <span className="hidden sm:inline ml-1">Edit</span>
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

            {tasks.filter((task) => task.status !== "done" && task.status !== "canceled").length === 0 && (
              <Card className="bg-gray-800/30 border-gray-700/50">
                <CardContent className="p-6 sm:p-8 text-center">
                  <div className="text-gray-500 mb-4">
                    <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 opacity-50" />
                  </div>
                  <h3 className="text-gray-400 text-lg sm:text-xl font-medium mb-2">All caught up!</h3>
                  <p className="text-gray-500 text-sm sm:text-base mb-4">
                    No active tasks found. Time to create some new ones or enjoy the moment.
                  </p>
                  <Link href="/dashboard/create">
                    <Button className="bg-red-600 hover:bg-red-700 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Task
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* See All Tasks CTA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4">
              <Link href="/dashboard/active">
                <Card className="bg-black/40 border-gray-700/30 hover:border-yellow-500/50 transition-all duration-200 cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <AlertCircle className="h-5 w-5 text-yellow-400 group-hover:text-yellow-300" />
                        <div>
                          <h3 className="text-white font-medium text-sm">See All Active Tasks</h3>
                          <p className="text-gray-400 text-xs">
                            {tasks.filter((task) => task.status !== "done" && task.status !== "canceled").length} total
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-yellow-400 transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/dashboard/completed">
                <Card className="bg-black/40 border-gray-700/30 hover:border-green-500/50 transition-all duration-200 cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-400 group-hover:text-green-300" />
                        <div>
                          <h3 className="text-white font-medium text-sm">View Completed Tasks</h3>
                          <p className="text-gray-400 text-xs">
                            {tasks.filter((task) => task.status === "done").length} completed
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-green-400 transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/dashboard/create">
                <Card className="bg-black/40 border-gray-700/30 hover:border-red-500/50 transition-all duration-200 cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Plus className="h-5 w-5 text-red-400 group-hover:text-red-300" />
                        <div>
                          <h3 className="text-white font-medium text-sm">Create New Task</h3>
                          <p className="text-gray-400 text-xs">Add to your workflow</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-red-400 transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
