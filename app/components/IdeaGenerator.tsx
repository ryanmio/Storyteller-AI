"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface IdeaGeneratorProps {
  onSelectIdea: (idea: string) => void
}

export function IdeaGenerator({ onSelectIdea }: IdeaGeneratorProps) {
  const [ideas, setIdeas] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    generateIdeas()
  }, [])

  const generateIdeas = async () => {
    setIsLoading(true)
    setIsRefreshing(true)
    setError(null)
    try {
      const response = await fetch("/api/generate-ideas")
      if (!response.ok) {
        throw new Error("Failed to generate ideas")
      }
      const data = await response.json()
      if (data.ideas) {
        setIdeas(data.ideas)
      } else if (data.message) {
        setError(data.message)
      }
    } catch (err) {
      setError("An error occurred while generating ideas. Please try again.")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-16">
        <Loader2 className="h-5 w-5 animate-spin text-burgundy/50 dark:text-amaranth-purple/50" />
      </div>
    )
  }

  if (error) {
    return <div className="text-center text-sm text-burgundy/70 dark:text-amaranth-purple/70">{error}</div>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-burgundy/70 dark:text-amaranth-purple/70">
          Need inspiration? Try one of these ideas
        </p>
        <Button
          onClick={generateIdeas}
          variant="ghost"
          size="sm"
          disabled={isRefreshing}
          className={cn(
            "h-8 px-2 text-burgundy/70 dark:text-amaranth-purple/70",
            "hover:text-burgundy dark:hover:text-amaranth-purple",
            "hover:bg-transparent focus-visible:ring-0",
          )}
        >
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          <span className="sr-only">Refresh ideas</span>
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {ideas.map((idea, index) => (
          <button
            key={index}
            onClick={() => onSelectIdea(idea)}
            className={cn(
              "text-left px-3 py-2 text-sm rounded-lg",
              "text-burgundy dark:text-amaranth-purple",
              "border border-burgundy/20 dark:border-amaranth-purple/20",
              "hover:bg-burgundy/5 dark:hover:bg-amaranth-purple/5",
              "hover:border-burgundy/30 dark:hover:border-amaranth-purple/30",
              "transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2",
              "focus-visible:ring-burgundy dark:focus-visible:ring-amaranth-purple",
              "focus-visible:ring-offset-2 focus-visible:ring-offset-white/80",
              "dark:focus-visible:ring-offset-black-bean/80",
            )}
          >
            {idea}
          </button>
        ))}
      </div>
    </div>
  )
}

