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
  const [isMounted, setIsMounted] = useState(false)

  // Handle mounting
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Handle initial data fetching
  useEffect(() => {
    if (isMounted) {
      generateIdeas()
    }
  }, [isMounted])

  const generateIdeas = async (isRegenerating: boolean = false) => {
    console.log(`[IdeaGenerator] Generating ideas, isRegenerating: ${isRegenerating}`)
    if (!isMounted) return
    
    try {
      if (isRegenerating) {
        setIsRefreshing(true)
        setIsLoading(false)
      } else {
        setIsLoading(true)
        setIsRefreshing(false)
      }
      setError(null)

      console.log('[IdeaGenerator] Fetching new ideas...')
      const response = await fetch(`/api/generate-ideas${isRegenerating ? '?regenerate=true' : ''}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })

      if (!response.ok) {
        throw new Error("Failed to generate ideas")
      }

      const data = await response.json()
      console.log('[IdeaGenerator] Received new ideas:', data)

      if (data.ideas && Array.isArray(data.ideas)) {
        setIdeas(data.ideas)
      } else if (data.message) {
        setError(data.message)
      } else {
        throw new Error("Invalid response format")
      }
    } catch (err) {
      console.error('[IdeaGenerator] Error generating ideas:', err)
      setError("An error occurred while generating ideas. Please try again.")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRegenerateIdeas = async () => {
    console.log("[IdeaGenerator] Regenerate button clicked")
    await generateIdeas(true)
  }

  // Don't render anything until mounted
  if (!isMounted) {
    return null
  }

  // Show loading state during initial load
  if (isLoading && !isRefreshing) {
    return (
      <div className="flex justify-center items-center h-16">
        <Loader2 className="h-5 w-5 animate-spin text-burgundy/50 dark:text-amaranth-purple/50" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="text-center text-sm text-burgundy/70 dark:text-amaranth-purple/70">{error}</div>
        <Button
          onClick={() => generateIdeas(true)}
          variant="ghost"
          size="sm"
          className="mx-auto block"
        >
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-burgundy/70 dark:text-amaranth-purple/70">
          Need inspiration? Try one of these ideas
        </p>
        <Button
          onClick={handleRegenerateIdeas}
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
        {isRefreshing ? (
          <div className="col-span-2 flex justify-center items-center h-16">
            <Loader2 className="h-5 w-5 animate-spin text-burgundy/50 dark:text-amaranth-purple/50" />
          </div>
        ) : (
          ideas.map((idea, index) => (
            <button
              key={`${idea}-${index}`}
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
          ))
        )}
      </div>
    </div>
  )
}

