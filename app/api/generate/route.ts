import { NextResponse } from "next/server"
import OpenAI from "openai"

// Set timeout to 2 minutes
export const maxDuration = 120

// Configure OpenAI with timeout
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000, // 60 seconds timeout for API calls
  maxRetries: 3, // Retry failed requests up to 3 times
})

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
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

    if (!completion.choices[0]?.message?.content) {
      console.error("No content in OpenAI response:", completion)
      return NextResponse.json({ error: "No content generated" }, { status: 500 })
    }

    console.log("Story generation completed successfully")
    return NextResponse.json({ text: completion.choices[0].message.content })
  } catch (error) {
    console.error("Error in story generation:", error)
    
    // Handle specific OpenAI errors
    if (error instanceof OpenAI.APIError) {
      const status = error.status || 500
      return NextResponse.json({ 
        error: "OpenAI API error", 
        message: error.message,
        type: error.type,
        code: error.code 
      }, { status })
    }

    // Handle timeout errors
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ 
        error: "Request timeout", 
        message: "The request took too long to complete" 
      }, { status: 504 })
    }

    // Handle all other errors
    return NextResponse.json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "An unexpected error occurred"
    }, { status: 500 })
  }
} 