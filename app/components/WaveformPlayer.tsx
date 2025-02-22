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

  useEffect(() => {
    if (waveformRef.current) {
      wavesurfer.current = WaveSurfer.create({
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

      wavesurfer.current.load(audioUrl)

      wavesurfer.current.on("ready", () => setIsWaveformLoaded(true))
      wavesurfer.current.on("finish", () => setIsPlaying(false))

      return () => wavesurfer.current?.destroy()
    }
  }, [audioUrl])

  const togglePlayPause = () => {
    if (wavesurfer.current) {
      wavesurfer.current.playPause()
      setIsPlaying(!isPlaying)
    }
  }

  return (
    <div className="flex items-center w-full gap-4">
      <Button onClick={togglePlayPause} className="flex-shrink-0">
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

