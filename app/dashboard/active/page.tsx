"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase, type Task, type Project, type ChecklistItem } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Skull,
  LogOut,
  Clock,
  CheckCircle,
  AlertCircle,
  Star,
  Calendar,
  Menu,
  X,
  ArrowLeft,
  Trash2,
  Plus,
} from "lucide-react"

// Define valid status values to match database
const VALID_STATUSES = ["todo", "in_progress", "done", "canceled"] as const
type TaskStatus = (typeof VALID_STATUSES)[number]

export default function ActiveTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [checklistItems, setChecklistItems] = useState<{ [taskId: string]: ChecklistItem[] }>({})
  const [error, setError] = useState("")
  const [showMobileMenu, setShowMobileMenu] = useState(false)
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
      await fetchData(user.id)
    } catch (error: any) {
      console.error("Error checking user:", error)
      setError(`Error checking user: ${getHumanReadableError(error.message)}`)
      setLoading(false)
    }
  }

  const fetchData = async (userId: string) => {
    try {
      // Fetch projects first
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (projectsError) {
        console.error("Projects fetch error:", projectsError)
        setError(`Failed to fetch projects: ${getHumanReadableError(projectsError.message)}`)
        setLoading(false)
        return
      }

      setProjects(projectsData || [])

      // Fetch all tasks for all projects
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select(`
        *,
        projects (
          name,
          emoji
        )
      `)
        .eq("user_id", userId)
        .in("status", ["todo", "in_progress"])
        .order("created_at", { ascending: false })

      if (tasksError) {
        console.error("Tasks fetch error:", tasksError)
        setError(`Error fetching tasks: ${getHumanReadableError(tasksError.message)}`)
        setLoading(false)
        return
      }

      setTasks(tasksData || [])

      // Fetch checklist items for all tasks
      if (tasksData && tasksData.length > 0) {
        await fetchChecklistItems(tasksData.map((task) => task.id))
      }

      setLoading(false)
      setError("")
    } catch (error: any) {
      console.error("Error fetching data:", error)
      setError(`Error fetching data: ${getHumanReadableError(error.message)}`)
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
        return // Don't fail the whole page for checklist items
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
      // Don't fail the whole page for checklist items
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

      // Update local state - remove completed/canceled tasks from active view
      if (newStatus === "done" || newStatus === "canceled") {
        setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId))
      } else {
        // Update status for tasks that remain active
        setTasks((prevTasks) =>
          prevTasks.map((task) =>
            task.id === taskId ? { ...task, status: newStatus, completed_at: updateData.completed_at } : task,
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
      case "in_progress":
        return <Clock className="h-4 w-4 text-yellow-400" />
      default:
        return <AlertCircle className="h-4 w-4 text-red-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="text-center max-w-sm w-full">
          <div className="relative">
            <Skull className="h-12 w-12 sm:h-16 sm:w-16 text-red-500 mx-auto mb-4 sm:mb-6 animate-pulse" />
            <div className="absolute inset-0 rounded-full border-2 border-red-500/20 animate-ping"></div>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Loading Active Tasks...</h2>
          <p className="text-gray-400 mb-4 text-sm sm:text-base">Gathering your pending work</p>
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
              <h1 className="text-lg sm:text-xl font-bold text-white">Active Tasks</h1>
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
              <h1 className="text-2xl font-bold text-white">Active Tasks</h1>
              <Badge className="bg-red-900/20 text-red-400 border-red-900/50">{tasks.length} pending</Badge>
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
                <div className="flex items-center space-x-2">
                  <span className="text-gray-300 text-sm">Active Tasks:</span>
                  <Badge className="bg-red-900/20 text-red-400 border-red-900/50 text-xs">{tasks.length} pending</Badge>
                </div>
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

        {/* Quick Actions */}
        <div className="mb-6">
          <Link href="/dashboard/create">
            <Button className="bg-red-600 hover:bg-red-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Create New Task
            </Button>
          </Link>
        </div>

        {/* Task List */}
        <div className="space-y-4">
          {tasks.length === 0 ? (
            <Card className="bg-gray-800/30 border-gray-700/50">
              <CardContent className="p-8 text-center">
                <div className="text-gray-500 mb-4">
                  <Skull className="h-16 w-16 mx-auto mb-4 opacity-50" />
                </div>
                <h3 className="text-gray-400 text-xl font-medium mb-2">No Active Tasks</h3>
                <p className="text-gray-500 mb-4">All caught up! Time to create some new tasks.</p>
                <Link href="/dashboard/create">
                  <Button className="bg-red-600 hover:bg-red-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Task
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            tasks.map((task) => (
              <Card
                key={task.id}
                className={`bg-gray-800/50 border-gray-700 hover:border-gray-600 transition-all duration-200 ${
                  task.is_important ? "ring-1 ring-red-500/30" : ""
                }`}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-3">
                        {task.emoji && <span className="text-lg sm:text-xl">{task.emoji}</span>}
                        <h3 className="text-white font-medium text-base sm:text-lg">{task.title}</h3>
                        {task.is_important && (
                          <Star className="h-4 w-4 sm:h-5 sm:w-5 text-red-400 fill-current flex-shrink-0" />
                        )}
                      </div>

                      {task.description && (
                        <p className="text-gray-400 text-sm sm:text-base mb-3 line-clamp-2">{task.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <div className="flex items-center gap-1">
                          {getStatusIcon(task.status)}
                          <Badge className={getStatusColor(task.status)}>{task.status.replace("_", " ")}</Badge>
                        </div>
                        <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                        {task.due_date && (
                          <Badge
                            className={`${
                              new Date(task.due_date) < new Date()
                                ? "bg-red-900/20 text-red-400 border-red-900/50"
                                : "bg-blue-900/20 text-blue-400 border-blue-900/50"
                            }`}
                          >
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(task.due_date).toLocaleDateString()}
                          </Badge>
                        )}
                        {task.projects && (
                          <Badge className="bg-purple-900/20 text-purple-400 border-purple-900/50">
                            {task.projects.emoji} {task.projects.name}
                          </Badge>
                        )}
                      </div>

                      {/* Checklist Items */}
                      {checklistItems[task.id] && checklistItems[task.id].length > 0 && (
                        <div className="mt-4 space-y-2">
                          <h4 className="text-gray-300 text-sm font-medium">Checklist:</h4>
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
                                className={`text-sm cursor-pointer ${
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
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateTaskStatus(task.id, task.status === "in_progress" ? "todo" : "in_progress")
                        }
                        className="border-yellow-700 text-yellow-400 hover:bg-yellow-900/20 bg-transparent text-xs px-3 py-2"
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        {task.status === "in_progress" ? "Pause" : "Start"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateTaskStatus(task.id, "done")}
                        className="border-green-700 text-green-400 hover:bg-green-900/20 bg-transparent text-xs px-3 py-2"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Complete
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteTask(task.id)}
                        className="border-red-700 text-red-400 hover:bg-red-900/20 bg-transparent text-xs px-3 py-2"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
