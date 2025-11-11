// Modal for displaying QR code (desktop) or handling deep link (mobile)

"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, Smartphone, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface InstantPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  paymentData: {
    transactionId: string
    paymentLink: string
    isMobile: boolean
    platform: string
    qrCodeDataUrl: string | null
    certificateData?: {
      vatsk: string
      pokladnica: string
    }
  } | null
  onSuccess: () => void
}

export function InstantPaymentModal({ isOpen, onClose, paymentData, onSuccess }: InstantPaymentModalProps) {
  const [status, setStatus] = useState<"loading" | "waiting" | "success" | "error">("loading")
  const [countdown, setCountdown] = useState(60) // 1 minute timeout

  useEffect(() => {
    if (!isOpen || !paymentData) {
      setStatus("loading")
      setCountdown(60)
      return
    }

    if (paymentData.isMobile) {
      console.log("[v0] 📱 Mobile device - banking app should already be open")
      setStatus("waiting")
    } else {
      // Desktop: show QR code and wait for payment
      setStatus("waiting")
    }

    const subscribeToPayment = async () => {
      try {
        if (!paymentData.certificateData?.vatsk || !paymentData.certificateData?.pokladnica) {
          console.error("[v0] ❌ Missing certificate data - cannot subscribe to MQTT")
          console.error("[v0] Certificate data:", paymentData.certificateData)
          setStatus("error")
          return
        }

        console.log("[v0] 🔌 Starting MQTT subscription for transaction:", paymentData.transactionId)
        console.log("[v0] 📋 Certificate data:", {
          vatsk: paymentData.certificateData.vatsk,
          pokladnica: paymentData.certificateData.pokladnica,
        })
        console.log("[v0] ⏳ This is a single long-running request that waits up to 60 seconds")

        const response = await fetch("/api/instant-payment/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transactionId: paymentData.transactionId,
            vatsk: paymentData.certificateData?.vatsk,
            pokladnica: paymentData.certificateData?.pokladnica,
          }),
        })

        const data = await response.json()

        console.log("[v0] 📨 MQTT subscription response:", data)
        console.log("[v0] 📋 Communication log:", data.communicationLog)

        if (data.success && data.status === "completed") {
          console.log("[v0] ✅ Payment completed! Notification received via MQTT")
          console.log("[v0] 💰 Payment data:", data.paymentData)
          setStatus("success")
          setTimeout(() => {
            onSuccess()
          }, 2000)
        } else if (data.status === "timeout") {
          console.log("[v0] ⏱️ MQTT subscription timeout - no payment received")
          setStatus("error")
        } else if (data.error) {
          console.error("[v0] ❌ MQTT subscription error:", data.error)
          setStatus("error")
        }
      } catch (error) {
        console.error("[v0] ❌ Error subscribing to MQTT:", error)
        setStatus("error")
      }
    }

    // Start subscription
    subscribeToPayment()

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      clearInterval(countdownInterval)
    }
  }, [isOpen, paymentData, onSuccess])

  if (!paymentData) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Okamžitá platba</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4 py-6">
          {status === "loading" && (
            <>
              <Loader2 className="size-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Pripravujem platbu...</p>
            </>
          )}

          {status === "waiting" && !paymentData.isMobile && (
            <>
              <div className="rounded-lg border-2 border-border p-4">
                <img src={paymentData.qrCodeDataUrl || ""} alt="QR kód platby" className="size-64" />
              </div>
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-primary">
                  <Smartphone className="size-5" />
                  <span className="font-medium">Naskenujte QR kód</span>
                </div>
                <p className="text-sm text-muted-foreground">Otvorte fotoaparát na vašom mobile a naskenujte QR kód</p>
                <p className="text-xs text-muted-foreground">
                  Čas zostáva: {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, "0")}
                </p>
              </div>
            </>
          )}

          {status === "waiting" && paymentData.isMobile && (
            <>
              <Loader2 className="size-12 animate-spin text-primary" />
              <div className="text-center space-y-2">
                <p className="font-medium">Čakám na potvrdenie platby...</p>
                <p className="text-sm text-muted-foreground">Dokončite platbu vo vašej bankovej aplikácii</p>
                <p className="text-xs text-muted-foreground">
                  Čas zostáva: {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, "0")}
                </p>
              </div>
            </>
          )}

          {status === "success" && (
            <>
              <div className="flex size-16 items-center justify-center rounded-full bg-primary">
                <Check className="size-8 text-primary-foreground" />
              </div>
              <div className="text-center space-y-2">
                <p className="font-semibold text-lg">Platba úspešná!</p>
                <p className="text-sm text-muted-foreground">Vaša platba bola spracovaná</p>
              </div>
            </>
          )}

          {status === "error" && (
            <>
              <div className="flex size-16 items-center justify-center rounded-full bg-destructive">
                <X className="size-8 text-destructive-foreground" />
              </div>
              <div className="text-center space-y-2">
                <p className="font-semibold text-lg">Platba zlyhala</p>
                <p className="text-sm text-muted-foreground">Prosím skúste to znova alebo zvoľte iný spôsob platby</p>
              </div>
              <Button onClick={onClose} variant="outline">
                Zatvoriť
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
