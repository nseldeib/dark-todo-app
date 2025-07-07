"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase, type Task, type Project } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit2, Trash2, Save, X, Menu, LogOut } from "lucide-react"

export default function ProjectsPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [error, setError] = useState("")
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [newProject, setNewProject] = useState({ name: "", description: "", emoji: "📁" })
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [editingProject, setEditingProject] = useState<string | null>(null)
  const [editProject, setEditProject] = useState({ name: "", description: "", emoji: "📁" })
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
      // Fetch projects
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

      // Fetch all tasks to get project statistics
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (tasksError) {
        console.error("Tasks fetch error:", tasksError)
        setError(`Error fetching tasks: ${getHumanReadableError(tasksError.message)}`)
        setLoading(false)
        return
      }

      setTasks(tasksData || [])
      setLoading(false)
      setError("")
    } catch (error: any) {
      console.error("Error fetching data:", error)
      setError(`Error fetching data: ${getHumanReadableError(error.message)}`)
      setLoading(false)
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
        setNewProject({ name: "", description: "", emoji: "📁" })
        setShowProjectForm(false)
      }
    } catch (error: any) {
      setError(`Failed to create project: ${getHumanReadableError(error.message)}`)
    } finally {
      setIsCreatingProject(false)
    }
  }

  const updateProject = async (e: React.FormEvent, projectId: string) => {
    e.preventDefault()
    if (!editProject.name.trim()) return

    try {
      const { data, error } = await supabase
        .from("projects")
        .update({
          name: editProject.name.trim(),
          description: editProject.description.trim() || null,
          emoji: editProject.emoji || "📁",
        })
        .eq("id", projectId)
        .select()
        .single()

      if (error) throw error

      if (data) {
        setProjects(projects.map((p) => (p.id === projectId ? data : p)))
        setEditingProject(null)
        setEditProject({ name: "", description: "", emoji: "📁" })
      }
    } catch (error: any) {
      setError(`Failed to update project: ${getHumanReadableError(error.message)}`)
    }
  }

  const deleteProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project? All tasks in this project will also be deleted.")) {
      return
    }

    try {
      const { error } = await supabase.from("projects").delete().eq("id", projectId)

      if (error) throw error

      setProjects(projects.filter((p) => p.id !== projectId))
      setTasks(tasks.filter((t) => t.project_id !== projectId))
    } catch (error: any) {
      setError(`Failed to delete project: ${getHumanReadableError(error.message)}`)
    }
  }

  const startEditing = (project: Project) => {
    setEditingProject(project.id)
    setEditProject({
      name: project.name,
      description: project.description || "",
      emoji: project.emoji || "📁",
    })
  }

  const cancelEditing = () => {
    setEditingProject(null)
    setEditProject({ name: "", description: "", emoji: "📁" })
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

  const getProjectStats = (projectId: string) => {
    const projectTasks = tasks.filter((task) => task.project_id === projectId)
    const completedTasks = projectTasks.filter((task) => task.status === "done")
    const activeTasks = projectTasks.filter((task) => task.status !== "done" && task.status !== "canceled")

    return {
      total: projectTasks.length,
      completed: completedTasks.length,
      active: activeTasks.length,
      completionRate: projectTasks.length > 0 ? Math.round((completedTasks.length / projectTasks.length) * 100) : 0,
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading your dark realm...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden">
          <div className="fixed left-0 top-0 h-full w-64 bg-gray-800 p-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-white text-lg font-semibold">Menu</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMobileMenu(false)}
                className="text-white hover:bg-gray-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <nav className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-gray-700"
                onClick={() => {
                  router.push("/dashboard")
                  setShowMobileMenu(false)
                }}
              >
                Dashboard
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-gray-700"
                onClick={() => {
                  router.push("/dashboard/active")
                  setShowMobileMenu(false)
                }}
              >
                Active Tasks
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-gray-700"
                onClick={() => {
                  router.push("/dashboard/completed")
                  setShowMobileMenu(false)
                }}
              >
                Completed
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-gray-700 bg-gray-700"
                onClick={() => setShowMobileMenu(false)}
              >
                Projects
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-gray-700"
                onClick={() => {
                  router.push("/dashboard/create")
                  setShowMobileMenu(false)
                }}
              >
                Create Task
              </Button>
            </nav>
            <div className="absolute bottom-4 left-4 right-4">
              <Button
                variant="outline"
                className="w-full justify-start text-white border-gray-600 hover:bg-gray-700 bg-transparent"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden text-white hover:bg-white/10"
              onClick={() => setShowMobileMenu(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Projects</h1>
              <p className="text-gray-300">Organize your tasks into projects</p>
            </div>
          </div>
          <div className="hidden md:flex space-x-2">
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard")}
              className="text-white border-gray-600 hover:bg-white/10"
            >
              Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/active")}
              className="text-white border-gray-600 hover:bg-white/10"
            >
              Active Tasks
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/completed")}
              className="text-white border-gray-600 hover:bg-white/10"
            >
              Completed
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/create")}
              className="text-white border-gray-600 hover:bg-white/10"
            >
              Create Task
            </Button>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="text-white border-gray-600 hover:bg-white/10 bg-transparent"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mb-6">{error}</div>
        )}

        {/* Create Project Button */}
        <div className="mb-6">
          <Button
            onClick={() => setShowProjectForm(!showProjectForm)}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Project
          </Button>
        </div>

        {/* Create Project Form */}
        {showProjectForm && (
          <Card className="mb-6 bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Create New Project</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={createProject} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Emoji</label>
                  <Input
                    type="text"
                    value={newProject.emoji}
                    onChange={(e) => setNewProject({ ...newProject, emoji: e.target.value })}
                    placeholder="📁"
                    className="w-20 bg-gray-700 border-gray-600 text-white"
                    maxLength={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Project Name *</label>
                  <Input
                    type="text"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    placeholder="Enter project name"
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                  <Textarea
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    placeholder="Enter project description"
                    className="bg-gray-700 border-gray-600 text-white"
                    rows={3}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button
                    type="submit"
                    disabled={isCreatingProject || !newProject.name.trim()}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {isCreatingProject ? "Creating..." : "Create Project"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowProjectForm(false)
                      setNewProject({ name: "", description: "", emoji: "📁" })
                    }}
                    className="text-white border-gray-600 hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="text-center py-12">
              <div className="text-6xl mb-4">📁</div>
              <h3 className="text-xl font-semibold text-white mb-2">No Projects Yet</h3>
              <p className="text-gray-400 mb-4">Create your first project to organize your tasks</p>
              <Button onClick={() => setShowProjectForm(true)} className="bg-purple-600 hover:bg-purple-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const stats = getProjectStats(project.id)
              return (
                <Card
                  key={project.id}
                  className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-colors"
                >
                  <CardHeader>
                    {editingProject === project.id ? (
                      <form onSubmit={(e) => updateProject(e, project.id)} className="space-y-3">
                        <div className="flex space-x-2">
                          <Input
                            type="text"
                            value={editProject.emoji}
                            onChange={(e) => setEditProject({ ...editProject, emoji: e.target.value })}
                            className="w-16 bg-gray-700 border-gray-600 text-white text-center"
                            maxLength={2}
                          />
                          <Input
                            type="text"
                            value={editProject.name}
                            onChange={(e) => setEditProject({ ...editProject, name: e.target.value })}
                            className="flex-1 bg-gray-700 border-gray-600 text-white"
                            required
                          />
                        </div>
                        <Textarea
                          value={editProject.description}
                          onChange={(e) => setEditProject({ ...editProject, description: e.target.value })}
                          className="bg-gray-700 border-gray-600 text-white"
                          rows={2}
                          placeholder="Project description"
                        />
                        <div className="flex space-x-2">
                          <Button type="submit" size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                            <Save className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={cancelEditing}
                            className="text-white border-gray-600 hover:bg-white/10 bg-transparent"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl">{project.emoji || "📁"}</span>
                            <CardTitle className="text-white">{project.name}</CardTitle>
                          </div>
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEditing(project)}
                              className="text-gray-400 hover:text-white hover:bg-gray-700"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteProject(project.id)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        {project.description && (
                          <CardDescription className="text-gray-400">{project.description}</CardDescription>
                        )}
                      </>
                    )}
                  </CardHeader>
                  {editingProject !== project.id && (
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-400">Progress</span>
                          <span className="text-sm text-white font-medium">{stats.completionRate}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${stats.completionRate}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-sm">
                          <div className="text-gray-400">
                            <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                              {stats.total} total
                            </Badge>
                          </div>
                          <div className="space-x-2">
                            <Badge variant="secondary" className="bg-blue-900/50 text-blue-300">
                              {stats.active} active
                            </Badge>
                            <Badge variant="secondary" className="bg-green-900/50 text-green-300">
                              {stats.completed} done
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
