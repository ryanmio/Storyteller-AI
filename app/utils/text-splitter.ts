export function splitTextIntoChunks(text: string, maxChunkLength = 250): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || []
  const chunks: string[] = []
  let currentChunk = ""

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkLength && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())
      currentChunk = sentence
    } else {
      currentChunk += sentence
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}

