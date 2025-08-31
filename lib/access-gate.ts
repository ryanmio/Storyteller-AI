import crypto from "crypto"
import { cookies, headers } from "next/headers"
import { NextResponse } from "next/server"
import { supabaseAdmin } from "./supabaseAdmin"

const DEVICE_COOKIE_NAME = "st_device"
const ACCESS_COOKIE_NAME = "st_access"
const COOKIE_SECRET = process.env.ACCESS_COOKIE_SECRET || process.env.COOKIE_SECRET || "dev-secret-change-me"

type AccessResult = {
  allowed: boolean
  reason?: string
  using: "access_code" | "free" | "none"
  codeId?: string
  response?: NextResponse
}

function hmacSign(value: string): string {
  return crypto.createHmac("sha256", COOKIE_SECRET).update(value).digest("hex")
}

function encodeCookiePayload(payload: Record<string, string>): string {
  const json = JSON.stringify(payload)
  const b64 = Buffer.from(json, "utf8").toString("base64url")
  const sig = hmacSign(b64)
  return `${b64}.${sig}`
}

function decodeCookiePayload(cookieValue: string): Record<string, string> | null {
  const [b64, sig] = cookieValue.split(".")
  if (!b64 || !sig) return null
  const expected = hmacSign(b64)
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  try {
    const json = Buffer.from(b64, "base64url").toString("utf8")
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function getOrSetDeviceCookie(): { deviceId: string; response?: NextResponse } {
  const cookieStore = cookies()
  const existing = cookieStore.get(DEVICE_COOKIE_NAME)?.value
  if (existing) {
    const decoded = decodeCookiePayload(existing)
    if (decoded?.deviceId) return { deviceId: decoded.deviceId }
  }
  const deviceId = crypto.randomUUID()
  const value = encodeCookiePayload({ deviceId })
  const res = NextResponse.next()
  res.cookies.set({
    name: DEVICE_COOKIE_NAME,
    value,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  })
  return { deviceId, response: res }
}

export function readAccessCookie(): { codeId: string } | null {
  const cookieStore = cookies()
  const value = cookieStore.get(ACCESS_COOKIE_NAME)?.value
  if (!value) return null
  const decoded = decodeCookiePayload(value)
  if (decoded?.codeId) return { codeId: decoded.codeId }
  return null
}

export function issueAccessCookie(codeId: string): NextResponse {
  const value = encodeCookiePayload({ codeId })
  const res = NextResponse.json({ ok: true })
  res.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  })
  return res
}

export async function enforceAccessOrFreeOnce(): Promise<AccessResult> {
  const { deviceId, response: deviceCookieResponse } = getOrSetDeviceCookie()
  const access = readAccessCookie()

  // If we set a device cookie via NextResponse.next(), propagate it later
  const baseResponse = deviceCookieResponse

  if (access?.codeId) {
    // Determine code type and consume appropriately
    const { data: codeRow, error: codeErr } = await supabaseAdmin
      .from("access_codes")
      .select("id, status, kind")
      .eq("id", access.codeId)
      .single()
    if (codeErr || !codeRow || codeRow.status !== "active") {
      return { allowed: false, using: "none", reason: "invalid_or_revoked_code", response: baseResponse }
    }

    let ok = false
    if (codeRow.kind === "prepaid") {
      const { data, error } = await supabaseAdmin.rpc("consume_prepaid_use", { p_code_id: access.codeId })
      if (error) return { allowed: false, using: "none", reason: "quota_error", response: baseResponse }
      ok = Boolean(data)
    } else if (codeRow.kind === "monthly") {
      const { data, error } = await supabaseAdmin.rpc("consume_monthly_use", { p_code_id: access.codeId })
      if (error) return { allowed: false, using: "none", reason: "quota_error", response: baseResponse }
      ok = Boolean(data)
    }
    if (!ok) {
      return { allowed: false, using: "none", reason: "quota_exhausted", response: baseResponse }
    }
    return { allowed: true, using: "access_code", codeId: access.codeId, response: baseResponse }
  }

  // No access code: allow exactly one free use per device
  const { data, error } = await supabaseAdmin.rpc("consume_free_story", { p_device_id: deviceId })
  if (error) {
    return { allowed: false, using: "none", reason: "free_consume_error", response: baseResponse }
  }
  const ok = Boolean(data)
  if (!ok) {
    return { allowed: false, using: "none", reason: "free_already_used", response: baseResponse }
  }
  return { allowed: true, using: "free", response: baseResponse }
}

export async function linkDeviceToCode(deviceId: string, codeId: string): Promise<void> {
  await supabaseAdmin
    .from("device_codes")
    .upsert({ device_id: deviceId, code_id: codeId }, { onConflict: "device_id,code_id" })
}

