"use client"

import { useEffect, useRef, useState } from "react"
import WaveSurfer from "wavesurfer.js"
import { Button } from "@/components/ui/button"
import { Pause, Play } from "lucide-react"

interface WaveformPlayerProps {
  audioUrl: string
}

export function WaveformPlayer({ audioUrl }: WaveformPlayerProps) {
  const waveformRef = useRef<HTMLDivElement>(null)
  const wavesurfer = useRef<WaveSurfer | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isWaveformLoaded, setIsWaveformLoaded] = useState(false)
  const [isDestroying, setIsDestroying] = useState(false)

  // Cleanup function
  const cleanupWaveSurfer = async () => {
    if (wavesurfer.current && !isDestroying) {
      setIsDestroying(true)
      try {
        // Stop playback
        wavesurfer.current.pause()
        // Remove all event listeners
        wavesurfer.current.unAll()
        // Wait a bit to ensure any pending operations are complete
        await new Promise(resolve => setTimeout(resolve, 100))
        // Destroy the instance
        if (wavesurfer.current) {
          wavesurfer.current.destroy()
          wavesurfer.current = null
        }
      } catch (error) {
        console.log("Wavesurfer cleanup error (can safely ignore):", error)
      } finally {
        setIsDestroying(false)
      }
    }
  }

  useEffect(() => {
    let mounted = true

    const initWaveSurfer = async () => {
      // Cleanup previous instance if it exists
      await cleanupWaveSurfer()

      if (!mounted || !waveformRef.current) return

      // Create new instance
      const ws = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: "violet",
        progressColor: "purple",
        cursorColor: "navy",
        barWidth: 2,
        barRadius: 3,
        cursorWidth: 1,
        height: 50,
        barGap: 3,
      })

      wavesurfer.current = ws

      // Add event listeners
      ws.on("ready", () => {
        if (mounted) setIsWaveformLoaded(true)
      })
      ws.on("finish", () => {
        if (mounted) setIsPlaying(false)
      })
      ws.on("play", () => {
        if (mounted) setIsPlaying(true)
      })
      ws.on("pause", () => {
        if (mounted) setIsPlaying(false)
      })

      // Load audio
      try {
        await ws.load(audioUrl)
      } catch (error) {
        console.log("Error loading audio:", error)
      }
    }

    initWaveSurfer()

    return () => {
      mounted = false
      cleanupWaveSurfer()
    }
  }, [audioUrl])

  const togglePlayPause = () => {
    if (wavesurfer.current && !isDestroying) {
      wavesurfer.current.playPause()
    }
  }

  return (
    <div className="flex items-center w-full gap-4">
      <Button onClick={togglePlayPause} className="flex-shrink-0" disabled={!isWaveformLoaded || isDestroying}>
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <div className="flex-grow relative h-[50px]">
        {!isWaveformLoaded && (
          <div className="absolute inset-0 bg-gradient-to-r from-violet-100 via-violet-200 to-violet-100 opacity-50 animate-pulse">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-heartbeat" />
          </div>
        )}
        <div ref={waveformRef} className="absolute inset-0" />
      </div>
    </div>
  )
}
;<style jsx>{`
  @keyframes heartbeat {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 0.7; }
  }
  .animate-heartbeat {
    animation: heartbeat 1.5s ease-in-out infinite;
  }
`}</style>

