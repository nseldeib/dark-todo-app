// Centralized error handling utility
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public severity: "low" | "medium" | "high" | "critical" = "medium",
  ) {
    super(message)
    this.name = "AppError"
  }
}

export const getHumanReadableError = (
  error: any,
): { message: string; code: string; severity: "low" | "medium" | "high" | "critical" } => {
  const errorMessage = error?.message || error || "Unknown error"

  // Network errors
  if (errorMessage.includes("Network") || errorMessage.includes("fetch")) {
    return {
      message: "The digital underworld is unreachable. Check your connection.",
      code: "NETWORK_ERROR",
      severity: "high",
    }
  }

  // Authentication errors
  if (errorMessage.includes("JWT") || errorMessage.includes("auth")) {
    return {
      message: "Your dark session has expired. Please sign in again.",
      code: "AUTH_ERROR",
      severity: "critical",
    }
  }

  // Permission errors
  if (errorMessage.includes("permission") || errorMessage.includes("unauthorized")) {
    return {
      message: "The shadows deny you access. Insufficient permissions.",
      code: "PERMISSION_ERROR",
      severity: "high",
    }
  }

  // Database errors
  if (errorMessage.includes("enum") || errorMessage.includes("invalid input value")) {
    return {
      message: "The task status is cursed. Please refresh the page and try again.",
      code: "DATABASE_ERROR",
      severity: "critical",
    }
  }

  // Validation errors
  if (errorMessage.includes("validation") || errorMessage.includes("required")) {
    return {
      message: "Some required information is missing or invalid.",
      code: "VALIDATION_ERROR",
      severity: "medium",
    }
  }

  // Timeout errors
  if (errorMessage.includes("timeout")) {
    return {
      message: "The darkness is taking too long to respond. Try again.",
      code: "TIMEOUT_ERROR",
      severity: "medium",
    }
  }

  // Generic error
  return {
    message: `Something wicked happened: ${errorMessage}`,
    code: "UNKNOWN_ERROR",
    severity: "medium",
  }
}

export const logError = (error: any, context: string) => {
  const errorInfo = getHumanReadableError(error)
  console.error(`[${context}] ${errorInfo.code}:`, {
    message: errorInfo.message,
    severity: errorInfo.severity,
    originalError: error,
    timestamp: new Date().toISOString(),
  })
}
