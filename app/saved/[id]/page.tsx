import type { Metadata } from "next"
import { createClient } from "@supabase/supabase-js"
import { Card, CardContent } from "@/components/ui/card"
import { stripSSMLTags } from "@/app/utils/ssml-utils"
import StoryPageClient from "./StoryPageClient"

// Initialize Supabase with service role key for server-side
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Generate metadata for the page
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  // Fetch the story
  const { data: story } = await supabase
    .from("stories")
    .select("*")
    .eq("id", params.id)
    .single()

  if (!story) {
    return {
      title: "Story Not Found - Storyteller AI",
      description: "This story could not be found.",
    }
  }

  // Clean the story content for the description
  const cleanContent = stripSSMLTags(story.story)
  const description = cleanContent.length > 200 
    ? cleanContent.substring(0, 197) + "..."
    : cleanContent

  return {
    title: `${story.title} - Storyteller AI`,
    description,
    openGraph: {
      title: `${story.title} - Storyteller AI`,
      description,
      type: "article",
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/saved/${story.id}`,
      images: [{
        url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/og?title=${encodeURIComponent(story.title)}`,
        width: 1200,
        height: 630,
        alt: story.title,
      }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${story.title} - Storyteller AI`,
      description,
      images: [`${process.env.NEXT_PUBLIC_BASE_URL}/api/og?title=${encodeURIComponent(story.title)}`],
    },
  }
}

// Fetch story data
async function getStory(id: string) {
  const { data, error } = await supabase
    .from("stories")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    console.error("Error fetching story:", error)
    return null
  }

  return data
}

// Server Component
export default async function SavedStoryPage({ params }: { params: { id: string } }) {
  const story = await getStory(params.id)

  return (
    <div className="min-h-screen bg-lavender-blush dark:bg-licorice p-4 sm:p-8 md:p-12 pb-16">
      <div className="w-full max-w-3xl mx-auto">
        <StoryPageClient story={story} />
      </div>
    </div>
  )
}

