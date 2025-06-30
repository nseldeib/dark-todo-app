"use client"

import { useState, useCallback } from "react"
import { getHumanReadableError, logError } from "@/lib/error-handler"

export const useErrorHandler = () => {
  const [error, setError] = useState<string>("")
  const [errorCode, setErrorCode] = useState<string>("")

  const handleError = useCallback((error: any, context = "Unknown") => {
    const errorInfo = getHumanReadableError(error)
    setError(errorInfo.message)
    setErrorCode(errorInfo.code)
    logError(error, context)

    // Auto-clear error after 10 seconds for non-critical errors
    if (errorInfo.severity !== "critical") {
      setTimeout(() => {
        setError("")
        setErrorCode("")
      }, 10000)
    }
  }, [])

  const clearError = useCallback(() => {
    setError("")
    setErrorCode("")
  }, [])

  return {
    error,
    errorCode,
    handleError,
    clearError,
    hasError: !!error,
  }
}
