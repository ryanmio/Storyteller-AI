const STORY_CREDIT_KEY = "story-credit-used"
const DONATION_STATUS_KEY = "has-donated"

export function hasUsedStoryCredit(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem(STORY_CREDIT_KEY) === "true"
}

export function markStoryUsed(): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORY_CREDIT_KEY, "true")
}

export function markAsDonated(): void {
  if (typeof window === "undefined") return
  localStorage.setItem(DONATION_STATUS_KEY, "true")
}

export function hasDonated(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem(DONATION_STATUS_KEY) === "true"
}

