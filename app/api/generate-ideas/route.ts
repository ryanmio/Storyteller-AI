import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

let cachedIdeas: string[] | null = null
let lastCacheTime: number | null = null
const CACHE_DURATION = 1000 * 60 * 60 // 1 hour

export async function GET() {
  try {
    // Check if we have a valid cache
    if (cachedIdeas && lastCacheTime && Date.now() - lastCacheTime < CACHE_DURATION) {
      return NextResponse.json({ ideas: cachedIdeas })
    }

    // Fetch existing story titles from Supabase
    const { data: stories, error } = await supabase
      .from("stories")
      .select("title")
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) {
      throw new Error("Error fetching stories: " + error.message)
    }

    // If there are no stories, return a message
    if (stories.length === 0) {
      return NextResponse.json({ message: "No existing stories found. Be the first to create one!" })
    }

    // Extract titles
    const titles = stories.map((story) => story.title)

    // Generate ideas using OpenAI
    const { text: ideasText } = await generateText({
      model: openai("gpt-4-turbo"),
      prompt: `You are an AI specialized in generating creative and engaging story ideas. Your task is to create 4 new, unique story titles based on the themes and styles of the following existing titles, but without directly copying them:

Existing titles:
${titles.join("\n")}

Please generate 4 new story titles that:
1. Reflect similar themes, genres, or styles as the existing titles
2. Are creative, intriguing, and diverse
3. Are not direct copies or slight modifications of the existing titles
4. Are suitable for short, audio-based stories (1-2 minutes in length)
5. Do not include any numbering or prefixes

Provide your response as a simple list of 4 titles, one per line, without any additional formatting or explanation.`,
    })

    // Parse the generated ideas
    const ideas = ideasText
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => line.trim())
      .slice(0, 4) // Ensure we only get 4 ideas

    // Update cache
    cachedIdeas = ideas
    lastCacheTime = Date.now()

    return NextResponse.json({ ideas })
  } catch (error) {
    console.error("Error generating ideas:", error)
    return NextResponse.json({ error: "Failed to generate ideas" }, { status: 500 })
  }
}

