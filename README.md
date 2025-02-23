# Storyteller AI

Storyteller AI is an interactive web application that generates and narrates short stories using AI. Users can input a topic, and the app will create a unique story complete with audio narration.

## Features

- AI-powered story generation based on user input
- Text-to-speech narration with multiple voice options
- Waveform audio player for generated stories
- Saved stories library with playback functionality
- Dark mode support

## Story Generation System

The AI story generation system is carefully crafted to create engaging, audio-first narratives. It follows a detailed prompt system that ensures:

- Unique perspectives and narrative styles
- Strong hooks and satisfying story arcs
- Rich sensory details optimized for audio
- Natural speech patterns and proper audio formatting
- Avoidance of common AI writing patterns

For technical details about how the story generation system works, see our [Story System Documentation](docs/STORY_SYSTEM_PROMPT.md).

## Technologies Used

- Next.js (App Router)
- React
- Tailwind CSS
- Supabase (for database and storage)
- OpenAI GPT-4 (for story generation)
- ElevenLabs API (for text-to-speech)

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.example`)
4. Run the development server: `npm run dev`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).