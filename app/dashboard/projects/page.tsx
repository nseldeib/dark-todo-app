"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase, type Task, type Project } from "@/lib/supabase"

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
      completionRate: projectTasks
