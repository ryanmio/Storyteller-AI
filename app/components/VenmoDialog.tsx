"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { markAsDonated } from "../utils/story-credits"

interface VenmoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VenmoDialog({ open, onOpenChange }: VenmoDialogProps) {
  const handleDonated = () => {
    markAsDonated()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Support Storyteller AI</DialogTitle>
          <DialogDescription className="text-center">
            This text-to-speech model costs a lot! If you&apos;d like to generate more stories, please consider
            supporting the project.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-4">
          <Image
            src="/venmo-qr.png"
            alt="Venmo QR Code for @ryanmio"
            width={300}
            height={300}
            className="rounded-lg shadow-lg mb-4"
          />
          <div className="flex gap-4 w-full mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Maybe Later
            </Button>
            <Button
              onClick={handleDonated}
              className="flex-1 bg-burgundy hover:bg-amaranth-purple dark:bg-amaranth-purple dark:hover:bg-burgundy"
            >
              I Donated
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

