"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Brain, Zap } from "lucide-react"
import { parseNaturalLanguage } from "@/lib/task-utils"
import type { Project } from "@/lib/supabase"

interface TaskCreatorProps {
  projects: Project[]
  selectedProject: string
  onProjectChange: (projectId: string) => void
  onCreateTask: (taskData: any) => Promise<void>
  isProcessing: boolean
}

export function TaskCreator({
  projects,
  selectedProject,
  onProjectChange,
  onCreateTask,
  isProcessing,
}: TaskCreatorProps) {
  const [input, setInput] = useState("")
  const [preview, setPreview] = useState<any>(null)

  const handleInputChange = (value: string) => {
    setInput(value)
    setPreview(value.trim() ? parseNaturalLanguage(value) : null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !selectedProject) return

    const parsed = parseNaturalLanguage(input)
    await onCreateTask({
      title: parsed.title,
      description: parsed.description,
      emoji: parsed.emoji,
      priority: parsed.priority,
      is_important: parsed.isImportant,
      status: "todo",
    })

    setInput("")
    setPreview(null)
  }

  return (
    <Card className="bg-black/60 border-red-900/30">
      <CardHeader className="pb-4">
        <CardTitle className="text-white flex items-center">
          <Brain className="h-5 w-5 mr-2 text-red-500" />
          Create Task
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="task-input" className="text-gray-300">
              What needs to be done?
            </Label>
            <Textarea
              id="task-input"
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              className="bg-gray-900/50 border-gray-700 text-white focus:border-red-500 mt-2"
              placeholder="🔥 Fix login bug urgent - users can't authenticate"
              rows={3}
            />
          </div>

          {preview && (
            <div className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
              <div className="flex items-center mb-2">
                <Brain className="h-4 w-4 text-green-400 mr-2" />
                <span className="text-green-400 text-sm">Preview:</span>
              </div>
              <div className="text-sm text-white">
                {preview.emoji && <span className="mr-2">{preview.emoji}</span>}
                {preview.title}
                <span
                  className={`ml-2 px-2 py-1 rounded text-xs ${preview.priority === "high" ? "bg-red-900/20 text-red-400" : preview.priority === "low" ? "bg-gray-900/20 text-gray-400" : "bg-yellow-900/20 text-yellow-400"}`}
                >
                  {preview.priority}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Select value={selectedProject} onValueChange={onProjectChange}>
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

            <Button
              type="submit"
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isProcessing || !selectedProject || !input.trim()}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Create
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
