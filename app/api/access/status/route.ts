import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getOrSetDeviceId, hasAccessCookie } from "@/lib/access-gate"

export async function GET() {
  try {
    const deviceId = getOrSetDeviceId()

    const [{ data: deviceRow }, { data: grantRows }] = await Promise.all([
      supabaseAdmin
        .from("devices")
        .select("free_used")
        .eq("device_id", deviceId)
        .maybeSingle(),
      supabaseAdmin
        .from("device_grants")
        .select("id, revoked, pack_remaining, period_start, period_end, used_in_period, access_codes(status, type, pack_uses, monthly_quota)")
        .eq("device_id", deviceId)
        .eq("revoked", false),
    ])

    const freeUsed = !!deviceRow?.free_used
    // Prefer the active grant with the most remaining quota
    const candidates = (grantRows || []).filter((g: any) => g.access_codes?.status === "active") as any[]
    let best: any | null = null
    let bestScore = -1
    for (const g of candidates) {
      const type = g.access_codes?.type
      let remaining = 0
      if (type === "pack") {
        remaining = Number(g.pack_remaining ?? 0)
      } else if (type === "monthly") {
        remaining = Math.max(0, Number(g.access_codes?.monthly_quota ?? 0) - Number(g.used_in_period ?? 0))
      }
      const score = remaining * 1000 - new Date(g.created_at ?? 0).getTime() % 1000
      if (score > bestScore) {
        best = g
        bestScore = score
      }
    }

    const hasGrant = !!best
    const grant = best
      ? {
          id: best.id as string,
          type: (best as any).access_codes.type as "pack" | "monthly",
          packRemaining: best.pack_remaining as number | null,
          monthlyQuota: (best as any).access_codes.monthly_quota as number | null,
          usedInPeriod: best.used_in_period as number | null,
          periodStart: best.period_start as string | null,
          periodEnd: best.period_end as string | null,
        }
      : null

    return NextResponse.json({
      deviceId,
      freeUsed,
      hasGrant,
      grant,
      hasAccessCookie: hasAccessCookie(),
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to read status" }, { status: 500 })
  }
}


