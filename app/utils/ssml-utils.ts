export function stripSSMLTags(text: string): string {
  return text.replace(/<[^>]+>/g, "")
}

