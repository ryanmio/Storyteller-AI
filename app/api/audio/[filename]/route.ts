import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest, { params }: { params: { filename: string } }) {
  console.log("Audio API route called for filename:", params.filename)

  try {
    // First try to get the file metadata
    const { data: fileData, error: fileError } = await supabase.storage.from("audio").list("", {
      limit: 1,
      search: params.filename,
    })

    if (fileError) {
      console.error("Error getting file metadata:", fileError)
    }

    if (!fileData || fileData.length === 0) {
      console.log("No file metadata found for:", params.filename, "Attempting direct download...")

      // If no metadata found, try to download the file directly
      const { data: directDownload, error: directDownloadError } = await supabase.storage
        .from("audio")
        .download(params.filename)

      if (directDownloadError) {
        console.error("Error downloading file directly:", directDownloadError)
        return NextResponse.json({ error: "File not found", details: directDownloadError }, { status: 404 })
      }

      if (!directDownload) {
        console.error("No data received from direct download")
        return NextResponse.json({ error: "No data received" }, { status: 404 })
      }

      console.log("File downloaded directly, size:", directDownload.size)

      // Create response with proper headers for direct download
      const headers = new Headers()
      headers.set("Content-Type", "audio/mpeg")
      headers.set("Content-Length", directDownload.size.toString())
      headers.set("Cache-Control", "public, max-age=31536000")

      return new NextResponse(directDownload, {
        status: 200,
        headers,
      })
    }

    console.log("File metadata found:", fileData[0])

    // If metadata is found, proceed with normal download
    const { data, error } = await supabase.storage.from("audio").download(params.filename)

    if (error) {
      console.error("Error downloading file:", error)
      return NextResponse.json({ error: "Error downloading file", details: error }, { status: 500 })
    }

    if (!data) {
      console.error("No data received from Supabase")
      return NextResponse.json({ error: "No data received" }, { status: 404 })
    }

    console.log("File downloaded successfully, size:", data.size)

    // Create response with proper headers
    const headers = new Headers()
    const fileExtension = params.filename.split(".").pop()?.toLowerCase()

    let contentType = "audio/mpeg" // default to mp3
    if (fileExtension === "wav") {
      contentType = "audio/wav"
    } else if (fileExtension === "m4a") {
      contentType = "audio/mp4"
    }

    headers.set("Content-Type", contentType)
    headers.set("Content-Length", data.size.toString())
    headers.set("Cache-Control", "public, max-age=31536000")

    console.log("Serving file with Content-Type:", contentType)

    return new NextResponse(data, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error("Unexpected error in audio API route:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

