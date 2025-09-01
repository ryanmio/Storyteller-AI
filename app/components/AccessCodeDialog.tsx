"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface AccessCodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRedeemed?: () => void
}

export function AccessCodeDialog({ open, onOpenChange, onRedeemed }: AccessCodeDialogProps) {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const redeem = async () => {
    if (!code.trim()) {
      setError("Enter a code")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const resp = await fetch("/api/access/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      })
      const body = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        setError(body?.error || resp.statusText)
        return
      }
      onOpenChange(false)
      // Notify listeners to refresh access status
      window.dispatchEvent(new Event("access:changed"))
      onRedeemed?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to redeem")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Enter Access Code</DialogTitle>
          <DialogDescription className="text-center">
            You have used your free story. Redeem a code to continue.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 p-2">
          <Input
            placeholder="e.g. PACK-ABC123 or MONTH-XYZ789"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={redeem} disabled={loading} className="flex-1">
              {loading ? "Redeeming..." : "Redeem"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


