import { NextResponse } from "next/server"
import { splitTextIntoChunks } from "@/app/utils/text-splitter"

export const maxDuration = 60 // Maximum allowed duration for hobby plan

export async function POST(req: Request) {
  try {
    const { text, voiceId } = await req.json()
    console.log("Received text-to-speech request:", { textLength: text.length, voiceId })

    const chunks = splitTextIntoChunks(text)
    console.log("Text split into chunks:", chunks.length)

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": process.env.ELEVENLABS_API_KEY!,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("ElevenLabs API error:", response.status, errorText)
      throw new Error(`ElevenLabs API error: ${response.status} ${errorText}`)
    }

    console.log("ElevenLabs API response received")

    const headers = new Headers(response.headers)
    headers.set("x-request-id", response.headers.get("x-request-id") || "")

    return new NextResponse(response.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked",
        "x-request-id": headers.get("x-request-id") || "",
      },
    })
  } catch (error) {
    console.error("Text-to-speech error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate speech" },
      { status: 500 },
    )
  }
}

