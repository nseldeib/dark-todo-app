"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Star, Calendar } from "lucide-react"
import { TASK_STATUSES, TASK_PRIORITIES } from "@/lib/task-utils"
import type { Task, ChecklistItem } from "@/lib/supabase"

interface TaskCardProps {
  task: Task
  checklistItems?: ChecklistItem[]
  onStatusChange: (taskId: string, status: string) => void
  onChecklistToggle: (itemId: string, completed: boolean) => void
}

export function TaskCard({ task, checklistItems = [], onStatusChange, onChecklistToggle }: TaskCardProps) {
  const statusConfig = TASK_STATUSES[task.status as keyof typeof TASK_STATUSES]

  return (
    <Card className="bg-black/40 border-gray-800 hover:border-gray-700 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              {task.emoji && <span className="text-lg">{task.emoji}</span>}
              <h3 className="font-semibold text-white">{task.title}</h3>
              {task.is_important && <Star className="h-4 w-4 text-red-400 fill-current" />}
            </div>

            {task.description && <p className="text-gray-400 text-sm mb-3">{task.description}</p>}

            {checklistItems.length > 0 && (
              <div className="mb-3 space-y-1">
                {checklistItems.map((item) => (
                  <div key={item.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={item.is_completed}
                      onCheckedChange={(checked) => onChecklistToggle(item.id, !!checked)}
                      className="border-gray-600"
                    />
                    <span className={`text-xs ${item.is_completed ? "text-gray-500 line-through" : "text-gray-300"}`}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center space-x-2">
              <statusConfig.icon className={`h-4 w-4 ${statusConfig.color}`} />
              <Badge className={TASK_PRIORITIES[task.priority as keyof typeof TASK_PRIORITIES]}>{task.priority}</Badge>
              {task.due_date && (
                <div className="flex items-center space-x-1 text-xs text-gray-400">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(task.due_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          <Select value={task.status} onValueChange={(value) => onStatusChange(task.id, value)}>
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
      </CardContent>
    </Card>
  )
}
