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
            height: '630px',
            width: '1200px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center', // Center vertically
            backgroundImage: `url(${baseImageUrl})`,
            backgroundColor: '#8B1538', // burgundy fallback
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              padding: '40px 60px',
              maxWidth: '900px',
              textAlign: 'center',
            }}
          >
            <h1
              style={{
                fontSize: '64px',
                fontWeight: 'bold',
                color: 'white',
                lineHeight: 1.2,
                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)',
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