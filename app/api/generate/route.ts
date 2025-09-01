import { NextResponse } from "next/server"
import OpenAI from "openai"
import { checkAndConsumeStory } from "@/lib/access-gate"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Set timeout to 60 seconds (maximum allowed for hobby plan)
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    const gate = await checkAndConsumeStory(undefined, req.headers)
    if (!gate.allowed) {
      console.warn("Access gate denied", gate)
      const status = gate.reason === "quota_exhausted" ? 402 : 403
      return NextResponse.json(
        { error: gate.reason || "Access denied" },
        { status }
      )
    }

    console.log("Starting story generation...")
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    })

    const res = NextResponse.json({ text: completion.choices[0].message.content })
    // Notify client to refresh status if needed (e.g., pack remaining changed)
    res.headers.set("x-access-changed", "1")
    return res
  } catch (error) {
    console.error("Error generating story:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate story" },
      { status: 500 }
    )
  }
} 