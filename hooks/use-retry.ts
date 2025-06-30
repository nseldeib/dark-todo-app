"use client"

import { useState, useCallback } from "react"

export const useRetry = () => {
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)

  const executeWithRetry = useCallback(async (operation, maxRetries = 3, delay = 1000) => {
    setIsRetrying(true)

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation()
        setRetryCount(0)
        setIsRetrying(false)
        return result
      } catch (error) {
        setRetryCount(attempt + 1)

        if (attempt === maxRetries) {
          setIsRetrying(false)
          throw error
        }

        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, attempt)))
      }
    }

    throw new Error("Max retries exceeded")
  }, [])

  return {
    executeWithRetry,
    retryCount,
    isRetrying,
  }
}
