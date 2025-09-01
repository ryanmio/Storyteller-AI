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
        .select("id, created_at, revoked, pack_remaining, period_start, period_end, used_in_period, access_codes(status, type, pack_uses, monthly_quota)")
        .eq("device_id", deviceId)
        .eq("revoked", false),
    ])

    const freeUsed = !!deviceRow?.free_used
    // Prefer the active grant with the most remaining quota, tie-break by created_at (oldest first)
    const candidates = (grantRows || []).filter((g: any) => g.access_codes?.status === "active") as any[]
    candidates.sort((a: any, b: any) => {
      const typeA = a.access_codes?.type
      const typeB = b.access_codes?.type
      const remainingA = typeA === "pack"
        ? Number(a.pack_remaining ?? 0)
        : typeA === "monthly"
          ? Math.max(0, Number(a.access_codes?.monthly_quota ?? 0) - Number(a.used_in_period ?? 0))
          : 0
      const remainingB = typeB === "pack"
        ? Number(b.pack_remaining ?? 0)
        : typeB === "monthly"
          ? Math.max(0, Number(b.access_codes?.monthly_quota ?? 0) - Number(b.used_in_period ?? 0))
          : 0
      if (remainingA !== remainingB) return remainingB - remainingA
      const tA = new Date(a.created_at ?? 0).getTime()
      const tB = new Date(b.created_at ?? 0).getTime()
      return tA - tB
    })
    const best: any | null = candidates[0] ?? null

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


