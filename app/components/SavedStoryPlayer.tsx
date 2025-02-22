"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { stripSSMLTags } from "../utils/ssml-utils"
import { voices } from "@/lib/voices"
import { WaveformPlayer } from "./WaveformPlayer"

interface SavedStoryPlayerProps {
  story?: {
    id: string
    title: string
    story: string
    audio_file: string | null
    voice_id: string | null
  }
  onClose: () => void
  onDelete: (id: string) => void
}

export function SavedStoryPlayer({ story, onClose, onDelete }: SavedStoryPlayerProps) {
  const [audioError, setAudioError] = useState<string | null>(null)
  // const [deleteClickCount, setDeleteClickCount] = useState(0)
  // const [isDeleting, setIsDeleting] = useState(false)

  if (!story) {
    return <div>No story selected</div>
  }

  // const handleDelete = async () => {
  //   setDeleteClickCount((prevCount) => prevCount + 1)

  //   if (deleteClickCount === 1) {
  //     setIsDeleting(true)
  //     try {
  //       await onDelete(story.id)
  //     } catch (error) {
  //       console.error("Error deleting story:", error)
  //       setAudioError("Failed to delete the story. Please try again.")
  //     } finally {
  //       setIsDeleting(false)
  //       setDeleteClickCount(0)
  //     }
  //   }
  // }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg mt-4 bg-lavender-blush/80 dark:bg-black-bean/80 border border-burgundy dark:border-amaranth-purple">
      <CardHeader>
        <CardTitle className="text-burgundy dark:text-amaranth-purple/90">{story.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {story.audio_file && <WaveformPlayer audioUrl={`/api/audio/${encodeURIComponent(story.audio_file)}`} />}
        {story.voice_id && (
          <p className="text-sm text-burgundy dark:text-amaranth-purple mt-2 text-right">
            Voice: {voices.find((v) => v.id === story.voice_id)?.name || "Unknown"}
          </p>
        )}
        <p className="whitespace-pre-wrap leading-relaxed mt-4 text-gray-800 dark:text-gray-300">
          {stripSSMLTags(story.story)}
        </p>
        {audioError && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{audioError}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      {/* Delete button commented out until authentication is implemented
      <CardFooter className="flex justify-end">
        <Button
          onClick={handleDelete}
          variant="destructive"
          className="flex items-center gap-2 bg-burgundy hover:bg-amaranth-purple dark:bg-amaranth-purple dark:hover:bg-burgundy text-white"
          disabled={isDeleting}
        >
          <Trash2 className="w-4 h-4" />
          {isDeleting ? "Deleting..." : deleteClickCount === 1 ? "Click again to delete" : "Delete"}
        </Button>
      </CardFooter>
      */}
    </Card>
  )
}

