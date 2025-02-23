"use client"

import { useState, useRef, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { supabase } from "../lib/supabase"
import { generateText } from "ai"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { openai } from "@ai-sdk/openai"
import { stripSSMLTags } from "./utils/ssml-utils"
import { SavedStoryPlayer } from "./components/SavedStoryPlayer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { voices } from "@/lib/voices"
import { cn } from "@/lib/utils"
import { WaveformPlayer } from "./components/WaveformPlayer"
import { VenmoDialog } from "./components/VenmoDialog"
import { hasUsedStoryCredit, markStoryUsed, hasDonated } from "./utils/story-credits"
import { Badge } from "@/components/ui/badge"
import { Copy } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import Link from "next/link"
import { Play, Pause } from "lucide-react"
import { IdeaGenerator } from "./components/IdeaGenerator"

const getRandomVoice = () => {
  const randomIndex = Math.floor(Math.random() * voices.length)
  return voices[randomIndex].id
}

function PageContent() {
  const searchParams = useSearchParams()
  const [userInput, setUserInput] = useState("")
  const [story, setStory] = useState<{
    id: string
    title: string
    content: string
    audio_file: string | null
    voice_id: string | null
  } | null>(null)
  const [savedStories, setSavedStories] = useState<
    Array<{ id: string; title: string; story: string; audio_file: string | null; voice_id: string | null }>
  >([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [selectedStory, setSelectedStory] = useState<{
    id: string
    title: string
    story: string
    audio_file: string | null
    voice_id: string | null
  } | null>(null)
  const [selectedVoice, setSelectedVoice] = useState(getRandomVoice())
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "new-story")
  const [showVenmoDialog, setShowVenmoDialog] = useState(false)
  const [showCopiedTooltip, setShowCopiedTooltip] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [showIntroHint, setShowIntroHint] = useState(false)
  const [isIntroPlaying, setIsIntroPlaying] = useState(false)
  const introAudioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    setSelectedVoice(getRandomVoice())
  }, [])

  useEffect(() => {
    fetchSavedStories()
  }, [])

  useEffect(() => {
    setSelectedStory(null)
  }, [])

  useEffect(() => {
    const hasSeenIntro = localStorage.getItem("hasSeenIntro")
    console.log("hasSeenIntro from localStorage:", hasSeenIntro) // Debug log
    if (!hasSeenIntro) {
      console.log("Setting showIntroHint to true") // Debug log
      setShowIntroHint(true)
    }
  }, [])

  useEffect(() => {
    console.log("showIntroHint changed:", showIntroHint) // Debug log
  }, [showIntroHint])

  const fetchSavedStories = async () => {
    const { data, error } = await supabase
      .from("stories")
      .select("id, title, story, audio_file, voice_id, created_at")
      .order("created_at", { ascending: false })
    if (error) {
      console.error("Error fetching saved stories:", error)
    } else {
      console.log("Fetched stories:", data)
      if (data) {
        const sortedStories = data.sort((a, b) => {
          if (a.title === "Introduction Track") return -1
          if (b.title === "Introduction Track") return 1
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
        setSavedStories(sortedStories)

        // Check if intro story exists and set showIntroHint
        const introStory = sortedStories.find((story) => story.title === "Introduction Track")
        if (introStory && !localStorage.getItem("hasSeenIntro")) {
          console.log("Intro story found, setting showIntroHint to true") // Debug log
          setShowIntroHint(true)
        }
      }
    }
  }

  const generateAndSaveStory = async () => {
    // Check if user has already used their free story credit
    if (hasUsedStoryCredit() && !hasDonated()) {
      setShowVenmoDialog(true)
      return
    }

    setIsGenerating(true)
    setAudioError(null)
    try {
      // Generate story using our new API route
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: `You are an AI specialized in crafting immersive, fact-based audio stories for listeners. Your task is to generate a creative, realistic narrative based on the following topic:

<topic>
${userInput}
</topic>

Write a single, compelling story designed for audio consumption in 1–2 minutes of spoken time. This story must incorporate the following elements:

### 1. **Unique Style or Perspective**
- Narrate the event from an **interesting vantage point** or in a **distinctive style**. 
- For instance, you could tell the story through the eyes of a typically minor character, an all-knowing narrator, the villain, or if warranted a non-human perspective (e.g., an artifact observing the scene). Select the most compelling vantage. Avoid non-human characters when possible.
- You may also choose a format like a personal diary entry, a letter, or an internal monologue—so long as it remains factually grounded.

### 2. **Narrative Arc**
- **Hook:** Grab the listener's attention in the first sentence! Don't waste your opening line with an introcution like "I am ... ", make your first line count. This is your opportunity to demonstrate your unique creativity.
- **Rising Action & Suspense:** Build tension as the story progresses. The reader should hang on every word. The majority of your narrative should be rising action and suspense.
- **Climax:** Reach a pivotal moment of highest intensity.
- **Resolution:** Provide a satisfying or thought-provoking ending that ties everything together.

### 3. **Immersion & Sensory Details**
- Vividly describe sights, sounds, or other sensory elements that bring the scene to life for audio listeners.

### 4. **Emotional Depth**
- Convey appropriate emotions through descriptive language, dialogue (if relevant), and pacing.

### 5. **Factual Accuracy**
- Ensure all historical or scientific elements are correct. Avoid fantasy or purely speculative details.

### 6. **Natural Speech Patterns**
- Write in a smooth, listener-friendly style. Keep the final text to ~1-2 minutes when read aloud.

### 7. **Audio Formatting**
- **Pronunciation:** Use CMU Arpabet phoneme tags for difficult words (e.g., <phoneme alphabet="cmu-arpabet" ph="B EH1 N UW0">Bennu</phoneme>).
- **Pacing & Emotion:** Use strong sentence structure, punctuation, and descriptive language to guide the flow and mood. Minimize explicit pause tags unless absolutely necessary.
- Avoid extraneous tags or bracketed text that would sound odd in playback.

### **Output Format**
Provide **only the final story** in the following format:

<story>
(Your fully polished, perspective-driven narrative goes here. Use any necessary SSML or phoneme tags within it.)
</story>

Do not include planning notes or explanations. Offer a single cohesive, creative, and gripping story told from your chosen unique viewpoint or style.`,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to generate story: ${response.statusText}`)
      }

      const { text } = await response.json()

      // Extract the story content from within the <story> tags
      const storyContent = text.match(/<story>([\s\S]*)<\/story>/)?.[1]?.trim() || text

      // Save story
      const { data, error } = await supabase
        .from("stories")
        .insert([{ title: userInput, story: storyContent, voice_id: selectedVoice }])
        .select()

      if (error) throw error

      const savedStory = data[0]
      console.log("Saved story with voice_id:", savedStory.voice_id)

      // Generate audio
      const audioResponse = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: storyContent, voiceId: selectedVoice }),
      })

      if (!audioResponse.ok) {
        throw new Error(`Failed to generate speech: ${audioResponse.statusText}`)
      }

      const audioBlob = await audioResponse.blob()
      const sanitizedTitle = userInput.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()
      const fileName = `${Date.now()}_${sanitizedTitle}.mp3`

      // Upload the file
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("audio")
        .upload(fileName, audioBlob, {
          contentType: "audio/mpeg",
          cacheControl: "3600",
          upsert: false,
        })

      if (uploadError) {
        console.error("Error uploading audio file:", uploadError)
        throw uploadError
      }

      // Update story with audio file
      const { error: updateError } = await supabase
        .from("stories")
        .update({ audio_file: fileName })
        .eq("id", savedStory.id)

      if (updateError) throw updateError

      setStory({
        id: savedStory.id,
        title: userInput,
        content: storyContent,
        audio_file: fileName,
        voice_id: selectedVoice,
      })
      fetchSavedStories()

      // Mark the story credit as used after successful generation
      markStoryUsed()
    } catch (error) {
      console.error("Error generating and saving story:", error)
      setAudioError("An error occurred while creating your story. Please try again.")
    }
    setIsGenerating(false)
  }

  const playNewStory = async () => {
    if (!story || !story.audio_file) return
    try {
      setIsLoadingAudio(true)
      setAudioError(null)
      const { data, error } = await supabase.storage.from("audio").createSignedUrl(story.audio_file, 3600)
      if (error) throw error
      if (audioRef.current) {
        audioRef.current.src = data.signedUrl
        await audioRef.current.play()
        setIsPlayingAudio(true)
      }
    } catch (error) {
      console.error("Error playing audio:", error)
      setAudioError("Error playing audio. Please try again.")
    } finally {
      setIsLoadingAudio(false)
    }
  }

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlayingAudio(false)
    }
  }

  const updateAudioProgress = () => {
    if (audioRef.current) {
      const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100
      setAudioProgress(progress)
    }
  }

  const handleDeleteStory = async (id: string) => {
    try {
      // Delete the story from the database
      const { error } = await supabase.from("stories").delete().eq("id", id)

      if (error) {
        throw error
      }

      // Find the story in the savedStories array
      const storyToDelete = savedStories.find((story) => story.id === id)

      // If there's an audio file, delete it from storage
      if (storyToDelete && storyToDelete.audio_file) {
        const { error: storageError } = await supabase.storage.from("audio").remove([storyToDelete.audio_file])

        if (storageError) {
          throw storageError
        }
      }

      // Update the state to remove the deleted story
      setSavedStories((prevStories) => prevStories.filter((story) => story.id !== id))
      setSelectedStory(null)
    } catch (error) {
      console.error("Error deleting story:", error)
      alert("Failed to delete the story. Please try again.")
    }
  }

  const handleShare = (id: string) => {
    const url = `${window.location.origin}/saved/${id}`
    navigator.clipboard.writeText(url).then(() => {
      setShowCopiedTooltip(true)
      setTimeout(() => setShowCopiedTooltip(false), 2000)
    })
  }

  const [isLoadingAudio, setIsLoadingAudio] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [audioProgress, setAudioProgress] = useState(0)
  const [hasPlayedNewStory, setHasPlayedNewStory] = useState(false)

  const playIntroAudio = async () => {
    console.log("Attempting to play intro audio") // Debug log
    const introStory = savedStories.find((story) => story.title === "Introduction Track")
    if (introStory && introStory.audio_file) {
      try {
        const { data, error } = await supabase.storage.from("audio").createSignedUrl(introStory.audio_file, 3600)
        if (error) throw error
        if (introAudioRef.current) {
          introAudioRef.current.src = data.signedUrl
          await introAudioRef.current.play()
          setIsIntroPlaying(true)
          console.log("Intro audio started playing") // Debug log
        }
      } catch (error) {
        console.error("Error playing intro audio:", error)
      }
    } else {
      console.log("Intro story not found or has no audio file") // Debug log
    }
  }

  const stopIntroAudio = () => {
    if (introAudioRef.current) {
      introAudioRef.current.pause()
      introAudioRef.current.currentTime = 0
      setIsIntroPlaying(false)
    }
  }

  const dismissIntroHint = () => {
    console.log("Dismissing intro hint") // Debug log
    setShowIntroHint(false)
    stopIntroAudio()
    localStorage.setItem("hasSeenIntro", "true")
  }

  const handleSelectIdea = (idea: string) => {
    setUserInput(idea)
  }

  return (
    <div className="min-h-screen bg-lavender-blush dark:bg-licorice transition-colors duration-300 p-4 sm:p-8 md:p-12 pb-16">
      <h1 className="text-4xl font-bold text-center mb-8 text-burgundy dark:text-amaranth-purple">Storyteller AI</h1>
      <Card className="w-full max-w-3xl mx-auto shadow-lg border-0 bg-white/80 dark:bg-black-bean/80 backdrop-blur-sm">
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-2 mb-6">
              <TabsTrigger
                value="new-story"
                className={cn(
                  "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  "data-[state=active]:border-b-2 data-[state=active]:border-primary",
                  "rounded-none text-base font-medium",
                )}
              >
                New Story
              </TabsTrigger>
              <TabsTrigger
                value="saved-stories"
                className={cn(
                  "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  "data-[state=active]:border-b-2 data-[state=active]:border-primary",
                  "rounded-none text-base font-medium",
                )}
              >
                Saved Stories
              </TabsTrigger>
            </TabsList>
            <TabsContent value="new-story" className="space-y-6 mt-2">
              <div className="flex flex-col gap-4">
                <Input
                  placeholder="Enter a topic for your story..."
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  className="w-full h-12 px-4 text-base bg-transparent border-burgundy dark:border-amaranth-purple rounded-lg focus:ring-1 focus:ring-primary"
                />
                <div className="flex gap-3">
                  <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                    <SelectTrigger
                      className={cn(
                        "w-[180px] h-12 bg-transparent border-burgundy dark:border-amaranth-purple",
                        "focus:ring-1 focus:ring-primary hover:bg-lavender-blush/50 dark:hover:bg-black-bean/50",
                      )}
                    >
                      <SelectValue placeholder="Select a voice">
                        {selectedVoice ? voices.find((v) => v.id === selectedVoice)?.name : "Select a voice"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {voices.map((voice) => (
                        <SelectItem key={voice.id} value={voice.id}>
                          <div className="flex flex-col py-1">
                            <span className="font-bold">{voice.name}</span>
                            <span className="text-sm text-muted-foreground">{voice.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={generateAndSaveStory}
                    disabled={isGenerating || !userInput}
                    className={cn(
                      "flex-1 h-12 text-base font-medium",
                      "bg-burgundy hover:bg-amaranth-purple text-white",
                      "dark:bg-amaranth-purple dark:hover:bg-burgundy",
                      "transition-colors duration-200",
                    )}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Story"
                    )}
                  </Button>
                </div>
              </div>

              <div className="border-t border-burgundy/10 dark:border-amaranth-purple/10 pt-6">
                <IdeaGenerator onSelectIdea={handleSelectIdea} />
              </div>

              {story && (
                <Card className="mt-8 bg-lavender-blush/50 dark:bg-black-bean/50 border border-burgundy dark:border-amaranth-purple">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>{story.title}</CardTitle>
                    <TooltipProvider>
                      <Tooltip open={showCopiedTooltip}>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => handleShare(story.id)} className="ml-auto">
                            <Copy className="h-4 w-4" />
                            <span className="sr-only">Share</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Copied to clipboard!</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </CardHeader>
                  <CardContent>
                    {story.audio_file && (
                      <WaveformPlayer audioUrl={`/api/audio/${encodeURIComponent(story.audio_file)}`} />
                    )}
                    {story.voice_id && (
                      <p className="text-sm text-burgundy dark:text-amaranth-purple mt-2 text-right">
                        Voice: {voices.find((v) => v.id === story.voice_id)?.name || "Unknown"}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap leading-relaxed mt-4">{stripSSMLTags(story.content)}</p>
                  </CardContent>
                </Card>
              )}
              {audioError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>{audioError}</AlertDescription>
                </Alert>
              )}
            </TabsContent>
            <TabsContent value="saved-stories" className="mt-2">
              {savedStories.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400">No saved stories yet</div>
              ) : selectedStory ? (
                <SavedStoryPlayer
                  story={selectedStory}
                  onClose={() => setSelectedStory(null)}
                  onDelete={handleDeleteStory}
                />
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                  {savedStories.map((savedStory) => (
                    <Link href={`/saved/${savedStory.id}`} key={savedStory.id}>
                      <div
                        className={cn(
                          "bg-lavender-blush/50 dark:bg-black-bean/50 rounded-lg p-5",
                          "border border-burgundy dark:border-amaranth-purple",
                          "cursor-pointer transition-all duration-300",
                          "hover:border-primary hover:shadow-lg",
                          "dark:hover:border-primary dark:hover:shadow-lg dark:hover:shadow-burgundy/30",
                          "hover:bg-white/50 dark:hover:bg-licorice/50",
                          "transform hover:-translate-y-1",
                        )}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-lg font-semibold text-burgundy dark:text-amaranth-purple truncate max-w-[300px]">
                            {savedStory.title}
                          </h3>
                          {savedStory.title === "Introduction Track" && (
                            <Badge
                              variant="secondary"
                              className="bg-burgundy text-white dark:bg-amaranth-purple dark:text-white"
                            >
                              Intro
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-3">{savedStory.story}</p>
                        {savedStory.voice_id && (
                          <p className="text-sm text-burgundy/70 dark:text-amaranth-purple/70 mt-3">
                            Voice: {voices.find((v) => v.id === savedStory.voice_id)?.name || "Unknown"}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <footer className="mt-8 text-center text-sm text-burgundy/70 dark:text-amaranth-purple/70">
        Made by{" "}
        <a
          href="https://github.com/ryanmio"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-burgundy dark:hover:text-amaranth-purple"
        >
          Ryan
        </a>
      </footer>
      <VenmoDialog open={showVenmoDialog} onOpenChange={setShowVenmoDialog} />
      <audio ref={introAudioRef} onEnded={() => setIsIntroPlaying(false)} />
      {showIntroHint && (
        <div className="fixed bottom-4 right-4 w-64 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <h3 className="text-lg font-semibold mb-2">Welcome to Storyteller AI</h3>
          <p className="mb-4">Would you like to hear an introduction?</p>
          <div className="flex justify-between items-center">
            <button
              onClick={isIntroPlaying ? stopIntroAudio : playIntroAudio}
              className="p-2 rounded-full bg-burgundy text-white hover:bg-amaranth-purple transition-colors"
            >
              {isIntroPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button onClick={dismissIntroHint} className="text-sm text-gray-500 hover:text-gray-700">
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const Page = () => (
  <Suspense fallback={<div>Loading...</div>}>
    <PageContent />
  </Suspense>
)

export default Page

