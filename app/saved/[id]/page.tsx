"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { SavedStoryPlayer } from "@/app/components/SavedStoryPlayer"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function SavedStoryPage() {
  const params = useParams()
  const [story, setStory] = useState<{
    id: string
    title: string
    story: string
    audio_file: string | null
    voice_id: string | null
  } | null>(null)

  useEffect(() => {
    const fetchStory = async () => {
      const { data, error } = await supabase.from("stories").select("*").eq("id", params.id).single()

      if (error) {
        console.error("Error fetching story:", error)
      } else {
        setStory(data)
      }
    }

    fetchStory()
  }, [params.id])

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("stories").delete().eq("id", id)

      if (error) {
        throw error
      }

      // If there's an audio file, delete it from storage
      if (story && story.audio_file) {
        const { error: storageError } = await supabase.storage.from("audio").remove([story.audio_file])

        if (storageError) {
          throw storageError
        }
      }

      // Redirect to the main page after deletion
      window.location.href = "/"
    } catch (error) {
      console.error("Error deleting story:", error)
      alert("Failed to delete the story. Please try again.")
    }
  }

  return (
    <div className="min-h-screen bg-lavender-blush dark:bg-licorice transition-colors duration-300 p-4 sm:p-8 md:p-12 pb-16">
      <Card className="w-full max-w-3xl mx-auto shadow-lg border-0 bg-white/80 dark:bg-black-bean/80 backdrop-blur-sm">
        <CardContent className="p-6">
          <Link href="/?tab=saved-stories" passHref>
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Stories
            </Button>
          </Link>
          {story ? (
            <SavedStoryPlayer
              story={story}
              onClose={() => {}} // This is a no-op since we're on a dedicated page
              onDelete={handleDelete}
            />
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400">Loading story...</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

