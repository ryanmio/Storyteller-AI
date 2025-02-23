import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview", // Using preview as gpt-4o-mini is not yet available in the public API
      messages: [
        {
          role: "system",
          content: "You are an AI specialized in generating creative and engaging story ideas."
        },
        {
          role: "user",
          content: `Based on these existing titles:
${titles.join("\n")}

Generate 4 new story titles that:
1. Reflect similar themes, genres, or styles as the existing titles
2. Are creative, intriguing, and diverse
3. Are not direct copies or modifications of the existing titles
4. Are suitable for short, audio-based stories (1-2 minutes)
5. Do not include any numbering or prefixes

Provide exactly 4 titles, one per line, nothing else.`
        }
      ],
      temperature: 0.8,
      max_tokens: 100
    })

    // Parse the generated ideas
    const ideas = completion.choices[0].message.content
      ?.split("\n")
      .filter((line: string) => line.trim() !== "")
      .map((line: string) => line.trim())
      .slice(0, 4) // Ensure we only get 4 ideas

    if (!ideas || ideas.length === 0) {
      throw new Error("Failed to generate valid ideas")
    }

    // Update cache
    cachedIdeas = ideas
    lastCacheTime = Date.now()

    return NextResponse.json({ ideas })
  } catch (error) {
    console.error("Error generating ideas:", error)
    return NextResponse.json({ error: "Failed to generate ideas" }, { status: 500 })
  }
}

