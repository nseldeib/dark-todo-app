import { CheckCircle, Clock, AlertCircle } from "lucide-react"

export const TASK_STATUSES = {
  todo: { label: "To Do", icon: AlertCircle, color: "text-red-400", bgColor: "bg-red-900/20" },
  in_progress: { label: "In Progress", icon: Clock, color: "text-yellow-400", bgColor: "bg-yellow-900/20" },
  done: { label: "Completed", icon: CheckCircle, color: "text-green-400", bgColor: "bg-green-900/20" },
} as const

export const TASK_PRIORITIES = {
  low: "bg-gray-900/20 text-gray-400 border-gray-700",
  medium: "bg-yellow-900/20 text-yellow-400 border-yellow-900/50",
  high: "bg-red-900/20 text-red-400 border-red-900/50",
} as const

export function getHumanReadableError(errorMessage: string): string {
  if (errorMessage.includes("Network")) return "Connection lost. Check your internet."
  if (errorMessage.includes("JWT")) return "Session expired. Please sign in again."
  if (errorMessage.includes("permission")) return "Access denied. Insufficient permissions."
  if (errorMessage.includes("not found")) return "Resource not found."
  if (errorMessage.includes("timeout")) return "Request timed out. Try again."
  return `Error: ${errorMessage}`
}

export function parseNaturalLanguage(input: string) {
  const text = input.toLowerCase()

  // Extract emoji
  const emojiMatch = input.match(
    /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u,
  )
  const emoji = emojiMatch ? emojiMatch[0] : null

  // Clean text
  const cleanText = input
    .replace(
      /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,
      "",
    )
    .trim()

  // Detect priority
  let priority: "low" | "medium" | "high" = "medium"
  if (text.includes("urgent") || text.includes("important") || text.includes("critical")) {
    priority = "high"
  } else if (text.includes("low priority") || text.includes("someday") || text.includes("later")) {
    priority = "low"
  }

  // Detect importance
  const isImportant = text.includes("important") || text.includes("critical") || text.includes("must do")

  // Split title and description
  let title = cleanText
  let description = null

  const separators = [" - ", " : ", " because "]
  for (const sep of separators) {
    if (cleanText.includes(sep)) {
      const parts = cleanText.split(sep, 2)
      title = parts[0].trim()
      description = parts[1].trim()
      break
    }
  }

  // Clean title
  title = title
    .replace(/\b(urgent|important|critical|low priority)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()

  return {
    title: title || "New Task",
    description,
    emoji,
    priority,
    isImportant,
  }
}
