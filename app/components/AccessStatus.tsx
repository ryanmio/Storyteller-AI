"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type GrantInfo = {
  id: string
  type: "pack" | "monthly"
  packRemaining: number | null
  monthlyQuota: number | null
  usedInPeriod: number | null
  periodStart: string | null
  periodEnd: string | null
} | null

export function AccessStatus() {
  const [loading, setLoading] = useState(true)
  const [freeUsed, setFreeUsed] = useState<boolean | null>(null)
  const [hasGrant, setHasGrant] = useState(false)
  const [grant, setGrant] = useState<GrantInfo>(null)

  useEffect(() => {
    let alive = true
    const fetchStatus = async () => {
      try {
        const resp = await fetch("/api/access/status", { cache: "no-store" })
        const json = await resp.json()
        if (!alive) return
        setFreeUsed(!!json.freeUsed)
        setHasGrant(!!json.hasGrant)
        setGrant(json.grant || null)
      } catch {
        // ignore UI errors
      } finally {
        if (alive) setLoading(false)
      }
    }
    fetchStatus()
    const onChanged = () => fetchStatus()
    window.addEventListener("access:changed", onChanged)
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") fetchStatus()
    })
    return () => {
      alive = false
      window.removeEventListener("access:changed", onChanged)
    }
  }, [])

  if (loading) return null

  if (hasGrant && grant) {
    if (grant.type === "pack") {
      const exhausted = (grant.packRemaining ?? 0) <= 0
      const content = <Badge variant="secondary">Access: Pack ({grant.packRemaining ?? 0} left)</Badge>
      return exhausted ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{content}</TooltipTrigger>
            <TooltipContent>
              <div className="text-sm">
                Pack exhausted. Redeem a new code or donate:
                <div>
                  <a href="https://venmo.com/u/ryanmio" target="_blank" rel="noreferrer" className="underline">
                    Venmo @ryanmio
                  </a>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : content
    }
    const monthlyExhausted = (grant.monthlyQuota ?? 0) > 0 && (grant.usedInPeriod ?? 0) >= (grant.monthlyQuota ?? 0)
    const content = (
      <Badge variant="secondary">Access: Monthly ({grant.usedInPeriod ?? 0}/{grant.monthlyQuota ?? 0})</Badge>
    )
    return monthlyExhausted ? (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              Monthly quota reached. Redeem another code or donate:
              <div>
                <a href="https://venmo.com/u/ryanmio" target="_blank" rel="noreferrer" className="underline">
                  Venmo @ryanmio
                </a>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ) : content
  }

  if (freeUsed === false) {
    return <Badge>Free: 1 available</Badge>
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline">No access</Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <div className="mb-1">Redeem an access code or donate:</div>
            <a href="https://venmo.com/u/ryanmio" target="_blank" rel="noreferrer" className="underline">
              Venmo @ryanmio
            </a>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}


