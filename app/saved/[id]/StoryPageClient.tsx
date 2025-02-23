"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { SavedStoryPlayer } from "@/app/components/SavedStoryPlayer"
import { Card, CardContent } from "@/components/ui/card"

interface StoryPageClientProps {
  story: {
    id: string
    title: string
    story: string
    audio_file: string | null
    voice_id: string | null
  } | null
}

export default function StoryPageClient({ story }: StoryPageClientProps) {
  return (
    <Card className="shadow-lg border-0 bg-white/80 dark:bg-black-bean/80 backdrop-blur-sm">
      <CardContent className="p-6">
        <Link href="/?tab=saved-stories" passHref>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Stories
          </Button>
        </Link>
        {story ? (
          <SavedStoryPlayer
            story={story}
            onClose={() => {}} // No-op since we're on a dedicated page
            onDelete={() => {}} // No-op since we're handling deletion differently
          />
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400">Story not found</p>
        )}
      </CardContent>
    </Card>
  )
} 