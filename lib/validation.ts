// Input validation utilities
export const validateTaskInput = (input: {
  title?: string
  description?: string
  emoji?: string
  priority?: string
  dueDate?: string
}) => {
  const errors: string[] = []

  // Title validation
  if (!input.title || input.title.trim().length === 0) {
    errors.push("Task title is required")
  } else if (input.title.length > 200) {
    errors.push("Task title must be less than 200 characters")
  }

  // Description validation
  if (input.description && input.description.length > 1000) {
    errors.push("Task description must be less than 1000 characters")
  }

  // Priority validation
  if (input.priority && !["low", "medium", "high"].includes(input.priority)) {
    errors.push("Invalid priority level")
  }

  // Due date validation
  if (input.dueDate) {
    const date = new Date(input.dueDate)
    if (isNaN(date.getTime())) {
      errors.push("Invalid due date format")
    } else if (date < new Date()) {
      errors.push("Due date cannot be in the past")
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .substring(0, 1000) // Limit length
}
