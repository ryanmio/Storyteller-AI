import { NextResponse } from "next/server"
import { redeemCode } from "@/lib/access-gate"

export async function POST(req: Request) {
  try {
    console.log("[redeem] POST /api/access/redeem")
    const body = await req.json().catch(() => ({}))
    const code = (body?.code ?? "").toString().trim()
    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 })
    }

    const headers = req.headers
    const ua = headers.get("user-agent")
    const ip = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || null

    const res = await redeemCode(code, ip, ua)
    if (!res.ok) {
      const msg = res.error || "Failed to redeem code"
      const map: Record<string, number> = {
        invalid_code: 404,
        code_revoked: 403,
        max_devices_reached: 409,
      }
      const status = map[msg as keyof typeof map] || 400
      console.warn("[redeem] failed", { msg, status })
      return NextResponse.json({ error: msg }, { status })
    }

    console.log("[redeem] success")
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[redeem] error", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Server error" }, { status: 500 })
  }
}


