"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase, type Task, type Project } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import {
  Skull,
  LogOut,
  Menu,
  X,
  ArrowLeft,
  FolderPlus,
  Plus,
  Trash2,
  Edit3,
  CheckCircle,
  AlertCircle,
} from "lucide-react"

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
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="text-center max-w-sm w-full">
          <div className="relative">
            <Skull className="h-12 w-12 sm:h-16 sm:w-16 text-red-500 mx-auto mb-4 sm:mb-6 animate-pulse" />
            <div className="absolute inset-0 rounded-full border-2 border-red-500/20 animate-ping"></div>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Loading Projects...</h2>
          <p className="text-gray-400 mb-4 text-sm sm:text-base">Organizing your workspace</p>
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
              <h1 className="text-lg sm:text-xl font-bold text-white">Projects</h1>
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
              <h1 className="text-2xl font-bold text-white">Projects</h1>
              <Badge className="bg-blue-900/20 text-blue-400 border-blue-900/50">{projects.length} projects</Badge>
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
                  <span className="text-gray-300 text-sm">Projects:</span>
                  <Badge className="bg-blue-900/20 text-blue-400 border-blue-900/50 text-xs">
                    {projects.length} total
                  </Badge>
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

      <main className="container mx-auto px-4 py-6 sm:py-8 max-w-6xl">
        {error && (
          <Alert className="mb-6 border-red-900/50 bg-red-950/20">
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        {/* Create Project Button */}
        <div className="mb-6">
          <Button onClick={() => setShowProjectForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
            <FolderPlus className="h-4 w-4 mr-2" />
            Create New Project
          </Button>
        </div>

        {/* New Project Form */}
        {showProjectForm && (
          <div className="mb-8">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="pb-4">
                <CardTitle className="text-white text-xl flex items-center">
                  <FolderPlus className="h-5 w-5 mr-2 text-blue-400" />
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
                        className="bg-gray-900/50 border-gray-700 text-white focus:border-blue-500 mt-2"
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
                        className="bg-gray-900/50 border-gray-700 text-white focus:border-blue-500 mt-2 text-center"
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
                      className="bg-gray-900/50 border-gray-700 text-white focus:border-blue-500 mt-2 resize-none"
                      placeholder="Brief description of this project"
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center space-x-3">
                    <Button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white flex items-center"
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

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.length === 0 ? (
            <div className="col-span-full">
              <Card className="bg-gray-800/30 border-gray-700/50">
                <CardContent className="p-8 text-center">
                  <div className="text-gray-500 mb-4">
                    <FolderPlus className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  </div>
                  <h3 className="text-gray-400 text-xl font-medium mb-2">No Projects Yet</h3>
                  <p className="text-gray-500 mb-4">Create your first project to organize your tasks.</p>
                  <Button onClick={() => setShowProjectForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <FolderPlus className="h-4 w-4 mr-2" />
                    Create Project
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            projects.map((project) => {
              const stats = getProjectStats(project.id)
              const isEditing = editingProject === project.id

              return (
                <Card
                  key={project.id}
                  className="bg-gray-800/50 border-gray-700 hover:border-gray-600 transition-all duration-200"
                >
                  <CardHeader className="pb-4">
                    {isEditing ? (
                      <form onSubmit={(e) => updateProject(e, project.id)} className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Input
                            value={editProject.emoji}
                            onChange={(e) => setEditProject({ ...editProject, emoji: e.target.value })}
                            className="bg-gray-900/50 border-gray-700 text-white w-16 text-center"
                            maxLength={2}
                          />
                          <Input
                            value={editProject.name}
                            onChange={(e) => setEditProject({ ...editProject, name: e.target.value })}
                            className="bg-gray-900/50 border-gray-700 text-white flex-1"
                            required
                          />
                        </div>
                        <Textarea
                          value={editProject.description}
                          onChange={(e) => setEditProject({ ...editProject, description: e.target.value })}
                          className="bg-gray-900/50 border-gray-700 text-white resize-none"
                          placeholder="Project description"
                          rows={2}
                        />
                        <div className="flex items-center space-x-2">
                          <Button type="submit" size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                            Save
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={cancelEditing}
                            className="border-gray-700 text-gray-300 hover:bg-gray-800 bg-transparent"
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl">{project.emoji}</span>
                            <CardTitle className="text-white text-lg">{project.name}</CardTitle>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditing(project)}
                              className="text-gray-400 hover:text-white hover:bg-gray-700 p-2"
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteProject(project.id)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-2"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {project.description && <p className="text-gray-400 text-sm mt-2">{project.description}</p>}
                      </>
                    )}
                  </CardHeader>
                  {!isEditing && (
                    <CardContent className="space-y-4">
                      {/* Project Stats */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center">
                          <div className="text-lg font-bold text-white">{stats.total}</div>
                          <div className="text-xs text-gray-400">Total</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-400">{stats.completed}</div>
                          <div className="text-xs text-gray-400">Done</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-yellow-400">{stats.active}</div>
                          <div className="text-xs text-gray-400">Active</div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Progress</span>
                          <span className="text-white font-medium">{stats.completionRate}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-green-600 to-green-400 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${stats.completionRate}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div className="flex flex-wrap gap-2">
                        {stats.active > 0 && (
                          <Badge className="bg-yellow-900/20 text-yellow-400 border-yellow-900/50 text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {stats.active} Active
                          </Badge>
                        )}
                        {stats.completed > 0 && (
                          <Badge className="bg-green-900/20 text-green-400 border-green-900/50 text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {stats.completed} Done
                          </Badge>
                        )}
                        {stats.total === 0 && (
                          <Badge className="bg-gray-900/20 text-gray-400 border-gray-700 text-xs">
                            <Plus className="h-3 w-3 mr-1" />
                            No Tasks
                          </Badge>
                        )}
                      </div>

                      {/* Quick Actions */}
                      <div className="pt-2 border-t border-gray-700">
                        <Link href={`/dashboard/create?project=${project.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-gray-700 text-gray-300 hover:bg-gray-800 bg-transparent"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Task
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  )}
                </Card>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}
