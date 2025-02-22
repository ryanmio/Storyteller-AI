import { NextResponse } from "next/server"
import { Configuration, OpenAIApi } from "openai-edge"
import { OpenAIStream, StreamingTextResponse } from "ai"

// Create an OpenAI API client (that's edge friendly!)
const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
})
const openai = new OpenAIApi(config)

// Set timeout to 2 minutes
export const maxDuration = 120

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json()

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    console.log("Starting story generation...")
    
    // Ask OpenAI for a streaming completion
    const response = await openai.createChatCompletion({
      model: 'gpt-4',
      stream: true,
      messages: [
        {
          role: "system",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    })

    // Convert the response into a friendly text-stream
    const stream = OpenAIStream(response)

    // Return a StreamingTextResponse, which can be consumed by the client
    return new StreamingTextResponse(stream)
  } catch (error) {
    console.error("Error in story generation:", error)
    return NextResponse.json({
      error: "Failed to generate story",
      message: error instanceof Error ? error.message : "An unexpected error occurred"
    }, { status: 500 })
  }
} 