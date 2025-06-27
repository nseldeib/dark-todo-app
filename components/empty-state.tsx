"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Skull, Brain, Zap } from "lucide-react"

interface EmptyStateProps {
  onExampleClick: (example: string) => void
}

export function EmptyState({ onExampleClick }: EmptyStateProps) {
  const examples = [
    "🔥 Fix login bug urgent - users can't authenticate",
    "📝 Write documentation low priority",
    "⚡ Deploy to production important",
  ]

  return (
    <Card className="bg-gradient-to-br from-gray-900/50 to-black/50 border-red-900/30">
      <CardContent className="py-12 text-center">
        <div className="max-w-md mx-auto">
          <div className="relative mb-6">
            <Skull className="h-16 w-16 text-red-500 mx-auto animate-pulse" />
          </div>

          <h3 className="text-xl font-bold text-white mb-3">Welcome to DarkTodo</h3>
          <p className="text-gray-400 mb-6">
            Create your first task using natural language. I'll understand the context automatically.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-black/30 rounded-lg p-3 border border-gray-800">
              <Brain className="h-6 w-6 text-green-400 mx-auto mb-1" />
              <div className="text-xs text-white font-medium">Smart Parsing</div>
            </div>
            <div className="bg-black/30 rounded-lg p-3 border border-gray-800">
              <Zap className="h-6 w-6 text-yellow-400 mx-auto mb-1" />
              <div className="text-xs text-white font-medium">Lightning Fast</div>
            </div>
          </div>

          <div className="text-left bg-black/40 rounded-lg p-4 border border-gray-700">
            <h4 className="text-white font-medium mb-2 text-sm">Try these examples:</h4>
            <div className="space-y-1">
              {examples.map((example, index) => (
                <div
                  key={index}
                  className="text-xs text-gray-300 hover:text-white cursor-pointer transition-colors p-1 rounded hover:bg-gray-800/50"
                  onClick={() => onExampleClick(example)}
                >
                  {example}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
