"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase, type Task, type Project, type ChecklistItem } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Skull, Plus, LogOut, Clock, CheckCircle, AlertCircle, Star, Calendar } from "lucide-react"

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string>("")
  const [checklistItems, setChecklistItems] = useState<{ [taskId: string]: ChecklistItem[] }>({})
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    emoji: "",
    priority: "medium",
    is_important: false,
    due_date: "",
  })
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [error, setError] = useState("")
  const [debugInfo, setDebugInfo] = useState("")
  const router = useRouter()
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const darkEmojis = [
    "🖤",
    "💀",
    "👹",
    "😈",
    "🔥",
    "⚡",
    "✨",
    "🌟",
    "💫",
    "🌙",
    "🦇",
    "🕷️",
    "🐍",
    "🗡️",
    "⚔️",
    "🏴",
    "💎",
    "🔮",
    "🎯",
    "🎪",
    "🌚",
    "🌑",
    "⚫",
    "🔴",
    "🟣",
    "🔺",
    "💥",
    "⭐",
    "🌠",
    "🎭",
  ]

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (showEmojiPicker && !target.closest(".relative")) {
        setShowEmojiPicker(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showEmojiPicker])

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

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTask.title.trim() || !selectedProject) return

    setIsAddingTask(true)
    try {
      const taskData = {
        title: newTask.title,
        description: newTask.description || null,
        emoji: newTask.emoji || null,
        user_id: user.id,
        project_id: selectedProject,
        status: "todo",
        priority: newTask.priority,
        is_important: newTask.is_important,
        due_date: newTask.due_date || null,
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
        setNewTask({
          title: "",
          description: "",
          emoji: "",
          priority: "medium",
          is_important: false,
          due_date: "",
        })
      }
    } catch (error: any) {
      setError(`Failed to forge your task in the darkness: ${getHumanReadableError(error.message)}`)
    } finally {
      setIsAddingTask(false)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-red-950 flex items-center justify-center">
        <div className="text-center">
          <Skull className="h-12 w-12 text-red-500 mx-auto mb-4 animate-pulse" />
          <div className="text-white text-lg mb-2">Loading your dark realm...</div>
          {debugInfo && <div className="text-gray-400 text-sm">{debugInfo}</div>}
          {error && (
            <Alert className="mt-4 border-red-900/50 bg-red-950/20 max-w-md">
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
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
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

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <Card className="bg-black/60 border-red-900/30 glow-effect">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Plus className="h-5 w-5 mr-2 text-red-500" />
                  Add New Task
                </CardTitle>
                <CardDescription className="text-gray-400">Create a new task to conquer</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={addTask} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-gray-300">
                      Title
                    </Label>
                    <Input
                      id="title"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      className="bg-gray-900/50 border-gray-700 text-white focus:border-red-500"
                      placeholder="Enter task title..."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-gray-300">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      className="bg-gray-900/50 border-gray-700 text-white focus:border-red-500"
                      placeholder="Enter task description..."
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emoji" className="text-gray-300">
                        Emoji
                      </Label>
                      <div className="relative">
                        <Input
                          id="emoji"
                          value={newTask.emoji}
                          onChange={(e) => setNewTask({ ...newTask, emoji: e.target.value })}
                          className="bg-gray-900/50 border-gray-700 text-white focus:border-red-500 pr-10"
                          placeholder="📝"
                          maxLength={2}
                        />
                        <Button
                          type="button"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="absolute right-1 top-1 h-8 w-8 p-0 bg-gray-800 hover:bg-gray-700 border-gray-600"
                          size="sm"
                        >
                          😈
                        </Button>
                        {showEmojiPicker && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-md p-3 grid grid-cols-6 gap-2 z-10 max-h-32 overflow-y-auto">
                            {darkEmojis.map((emoji, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => {
                                  setNewTask({ ...newTask, emoji })
                                  setShowEmojiPicker(false)
                                }}
                                className="text-lg hover:bg-gray-800 rounded p-1 transition-colors"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority" className="text-gray-300">
                        Priority
                      </Label>
                      <Select
                        value={newTask.priority}
                        onValueChange={(value) => setNewTask({ ...newTask, priority: value })}
                      >
                        <SelectTrigger className="bg-gray-900/50 border-gray-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700">
                          <SelectItem value="low" className="text-white">
                            Low
                          </SelectItem>
                          <SelectItem value="medium" className="text-white">
                            Medium
                          </SelectItem>
                          <SelectItem value="high" className="text-white">
                            High
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="due_date" className="text-gray-300">
                      Due Date (optional)
                    </Label>
                    <Input
                      id="due_date"
                      type="datetime-local"
                      value={newTask.due_date}
                      onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                      className="bg-gray-900/50 border-gray-700 text-white focus:border-red-500"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="important"
                      checked={newTask.is_important}
                      onCheckedChange={(checked) => setNewTask({ ...newTask, is_important: !!checked })}
                      className="border-gray-700"
                    />
                    <Label htmlFor="important" className="text-gray-300 text-sm">
                      Mark as important
                    </Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project" className="text-gray-300">
                      Project
                    </Label>
                    <Select value={selectedProject} onValueChange={setSelectedProject}>
                      <SelectTrigger className="bg-gray-900/50 border-gray-700 text-white">
                        <SelectValue placeholder="Select a project" />
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
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                    disabled={isAddingTask || !selectedProject}
                  >
                    {isAddingTask ? "Adding..." : "Add Task"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Your Tasks</h2>
              <p className="text-gray-400">Manage your dark productivity empire</p>
            </div>

            <div className="space-y-4">
              {tasks.length === 0 ? (
                <Card className="bg-black/40 border-gray-800">
                  <CardContent className="py-8 text-center">
                    <Skull className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No tasks yet. Create your first task to begin!</p>
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
        </div>
      </main>
    </div>
  )
}
