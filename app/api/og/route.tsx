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
            backgroundSize: '100% auto', // Changed to ensure full width and maintain aspect ratio
            backgroundPosition: 'center 40%', // Adjust vertical position
            backgroundRepeat: 'no-repeat',
            position: 'relative',
            overflow: 'hidden', // Ensure nothing bleeds out
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '25%', // Adjusted position
              left: '50%',
              transform: 'translate(-50%, 0)', // Changed to not move vertically
              width: '100%',
              padding: '0 40px',
              textAlign: 'center',
              maxWidth: '90%',
            }}
          >
            <h1
              style={{
                fontSize: '56px', // Slightly smaller to ensure better fit
                fontWeight: 'bold',
                color: 'white',
                lineHeight: 1.3,
                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)',
                margin: 0,
                padding: 0,
                wordWrap: 'break-word',
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