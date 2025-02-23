import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const title = searchParams.get('title')

    if (!title) {
      return new Response('Missing title parameter', { status: 400 })
    }

    // Get the base URL from environment variable or default to localhost
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const baseImageUrl = `${baseUrl}/images/og/base.png`

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            backgroundImage: `url(${baseImageUrl})`,
            backgroundColor: '#8B1538', // burgundy fallback
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '20%', // Move title higher up
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '100%',
              padding: '40px',
              textAlign: 'center',
              maxWidth: '90%', // Prevent text from getting too close to edges
            }}
          >
            <h1
              style={{
                fontSize: '60px',
                fontWeight: 'bold',
                color: 'white',
                lineHeight: 1.2,
                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)',
                margin: 0,
                padding: 0,
                wordWrap: 'break-word', // Handle long titles better
              }}
            >
              {title}
            </h1>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    )
  } catch (error: unknown) {
    console.error('Error generating OG image:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(`Failed to generate the image: ${errorMessage}`, {
      status: 500,
    })
  }
} 