"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase, type Task, type Project, type ChecklistItem } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { TaskCreator } from "@/components/task-creator"
import { TaskCard } from "@/components/task-card"
import { EmptyState } from "@/components/empty-state"
import { Skull, LogOut } from "lucide-react"
import { getHumanReadableError } from "@/lib/task-utils"

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string>("")
  const [checklistItems, setChecklistItems] = useState<{ [taskId: string]: ChecklistItem[] }>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        router.push("/sign-in")
        return
      }

      setUser(user)
      await fetchProjects(user.id)
    } catch (error: any) {
      setError(getHumanReadableError(error.message))
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

      if (error) throw error

      if (data && data.length > 0) {
        setProjects(data)
        setSelectedProject(data[0].id)
        await fetchTasks(data[0].id)
      } else {
        await createDefaultProject(userId)
      }
    } catch (error: any) {
      setError(getHumanReadableError(error.message))
      setLoading(false)
    }
  }

  const createDefaultProject = async (userId: string) => {
    try {
      const { data: projectData, error } = await supabase
        .from("projects")
        .insert({
          user_id: userId,
          name: "My Tasks",
          description: "Default project",
          emoji: "📝",
        })
        .select()
        .single()

      if (error) throw error

      if (projectData) {
        setProjects([projectData])
        setSelectedProject(projectData.id)
        await fetchTasks(projectData.id)
      }
    } catch (error: any) {
      setError(getHumanReadableError(error.message))
      setLoading(false)
    }
  }

  const fetchTasks = async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select(`*, projects(name, emoji)`)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })

      if (error) throw error

      setTasks(data || [])

      if (data && data.length > 0) {
        await fetchChecklistItems(data.map((task) => task.id))
      }

      setLoading(false)
    } catch (error: any) {
      setError(getHumanReadableError(error.message))
      setLoading(false)
    }
  }

  const fetchChecklistItems = async (taskIds: string[]) => {
    try {
      const { data } = await supabase
        .from("checklist_items")
        .select("*")
        .in("task_id", taskIds)
        .order("created_at", { ascending: true })

      if (data) {
        const grouped = data.reduce(
          (acc, item) => {
            if (!acc[item.task_id]) acc[item.task_id] = []
            acc[item.task_id].push(item)
            return acc
          },
          {} as { [taskId: string]: ChecklistItem[] },
        )

        setChecklistItems(grouped)
      }
    } catch (error) {
      console.error("Error fetching checklist items:", error)
    }
  }

  const createTask = async (taskData: any) => {
    setIsProcessing(true)
    try {
      const { data, error } = await supabase
        .from("tasks")
        .insert([
          {
            ...taskData,
            user_id: user.id,
            project_id: selectedProject,
          },
        ])
        .select(`*, projects(name, emoji)`)

      if (error) throw error

      if (data) {
        setTasks([data[0], ...tasks])
      }
    } catch (error: any) {
      setError(getHumanReadableError(error.message))
    } finally {
      setIsProcessing(false)
    }
  }

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const updateData: any = { status }
      if (status === "done") {
        updateData.completed_at = new Date().toISOString()
      } else {
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
      setError(getHumanReadableError(error.message))
    }
  }

  const toggleChecklistItem = async (itemId: string, isCompleted: boolean) => {
    try {
      const { error } = await supabase.from("checklist_items").update({ is_completed: isCompleted }).eq("id", itemId)

      if (error) throw error

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
      setError(getHumanReadableError(error.message))
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/sign-in")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-red-950 flex items-center justify-center">
        <div className="text-center">
          <Skull className="h-12 w-12 text-red-500 mx-auto mb-4 animate-pulse" />
          <div className="text-white text-lg">Loading your realm...</div>
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

      <main className="container mx-auto px-4 py-8 space-y-8">
        {error && (
          <Alert className="border-red-900/50 bg-red-950/20">
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        <TaskCreator
          projects={projects}
          selectedProject={selectedProject}
          onProjectChange={setSelectedProject}
          onCreateTask={createTask}
          isProcessing={isProcessing}
        />

        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Your Tasks</h2>
              <p className="text-gray-400">
                {tasks.length > 0 && `${tasks.filter((t) => t.status === "done").length} of ${tasks.length} completed`}
              </p>
            </div>
          </div>

          {tasks.length === 0 ? (
            <EmptyState
              onExampleClick={(example) => {
                // This would need to be passed down to TaskCreator
                // For now, we'll keep it simple
              }}
            />
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  checklistItems={checklistItems[task.id]}
                  onStatusChange={updateTaskStatus}
                  onChecklistToggle={toggleChecklistItem}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
