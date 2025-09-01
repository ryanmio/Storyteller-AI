import { cookies as nextCookies } from "next/headers"
import { supabaseAdmin } from "./supabaseAdmin"
import { createHmac, randomUUID } from "node:crypto"

const DEVICE_COOKIE = "st_device"
const ACCESS_COOKIE = "st_access"
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 2 // 2 years

function getSecret(): string {
  const secret = process.env.ACCESS_COOKIE_SECRET || process.env.NEXTAUTH_SECRET || process.env.SUPABASE_JWT_SECRET
  if (!secret) {
    throw new Error("Missing ACCESS_COOKIE_SECRET (or NEXTAUTH_SECRET/SUPABASE_JWT_SECRET) env var")
  }
  return secret
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
}

function signPayload(payload: string): string {
  const hmac = createHmac("sha256", getSecret())
  hmac.update(payload)
  return base64url(hmac.digest())
}

function encodeCookie(obj: Record<string, unknown>): string {
  const payload = base64url(JSON.stringify(obj))
  const sig = signPayload(payload)
  return `${payload}.${sig}`
}

function decodeAndVerifyCookie(value: string | undefined): any | null {
  if (!value) return null
  const parts = value.split(".")
  if (parts.length !== 2) return null
  const [payload, sig] = parts
  const expected = signPayload(payload)
  if (sig !== expected) return null
  try {
    const json = Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function getOrSetDeviceId(c = nextCookies()): string {
  const existing = c.get(DEVICE_COOKIE)?.value
  const parsed = decodeAndVerifyCookie(existing)
  if (parsed && typeof parsed.deviceId === "string") {
    return parsed.deviceId as string
  }
  const deviceId = randomUUID()
  const value = encodeCookie({ deviceId, iat: Date.now() })
  c.set(DEVICE_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  })
  return deviceId
}

export function setAccessCookie(deviceId: string, c = nextCookies()): void {
  const value = encodeCookie({ deviceId, access: true, iat: Date.now() })
  c.set(ACCESS_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  })
}

export function hasAccessCookie(c = nextCookies()): boolean {
  const existing = c.get(ACCESS_COOKIE)?.value
  const parsed = decodeAndVerifyCookie(existing)
  return !!(parsed && parsed.access === true)
}

export async function checkAndConsumeStory(c = nextCookies(), reqHeaders?: Headers): Promise<{
  allowed: boolean
  wasFree: boolean
  reason: string | null
  deviceId: string
}> {
  const deviceId = getOrSetDeviceId(c)
  const ip = reqHeaders?.get("x-forwarded-for")?.split(",")[0]?.trim() || reqHeaders?.get("x-real-ip") || null
  const ua = reqHeaders?.get("user-agent") || null
  const { data, error } = await supabaseAdmin.rpc("check_and_consume_story", { p_device_id: deviceId, p_ip: ip, p_ua: ua })
  if (error) {
    return { allowed: false, wasFree: false, reason: error.message, deviceId }
  }
  const row = Array.isArray(data) ? data[0] : data
  return {
    allowed: !!row?.allowed,
    wasFree: !!row?.was_free,
    reason: row?.reason ?? null,
    deviceId,
  }
}

export async function redeemCode(code: string, ip: string | null, ua: string | null, c = nextCookies()): Promise<{ ok: boolean; error?: string }> {
  const deviceId = getOrSetDeviceId(c)
  const { error } = await supabaseAdmin.rpc("redeem_code", {
    p_device_id: deviceId,
    p_code_text: code,
    p_ip: ip,
    p_ua: ua,
  })
  if (error) return { ok: false, error: error.message }
  setAccessCookie(deviceId, c)
  return { ok: true }
}


