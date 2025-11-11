"use client"

import type React from "react"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ArrowLeft, Check, Zap } from "lucide-react"
import { InstantPaymentModal } from "./instant-payment-modal"

export function CheckoutForm() {
  const [paymentMethod, setPaymentMethod] = useState("instant")
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showInstantPayment, setShowInstantPayment] = useState(false)
  const [instantPaymentData, setInstantPaymentData] = useState<any>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)

    if (paymentMethod === "instant") {
      try {
        console.log("[v0] Initiating instant payment...")

        const response = await fetch("/api/instant-payment/init", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: "0.01",
            iban: "SK7811000000002944276572",
            creditorName: "efabox, s.r.o.",
            message: "Nakup chladnicky Premium Smart",
          }),
        })

        const data = await response.json()
        console.log("[v0] Instant payment initialized:", data)

        if (data.success) {
          if (data.isMobile) {
            console.log("[v0] 📱 Mobile detected - redirecting to banking app immediately...")
            window.location.href = data.paymentLink
          }

          setInstantPaymentData(data)
          setShowInstantPayment(true)
        } else {
          console.error("[v0] Failed to initialize instant payment:", data.error)
          alert("Nepodarilo sa inicializovať platbu. Skúste prosím iný spôsob platby.")
        }
      } catch (error) {
        console.error("[v0] Error during instant payment:", error)
        alert("Chyba pri inicializácii platby. Skúste prosím iný spôsob platby.")
      } finally {
        setProcessing(false)
      }
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 2000))

    setProcessing(false)
    setSuccess(true)
  }

  const handleInstantPaymentSuccess = () => {
    setShowInstantPayment(false)
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary">
              <Check className="size-8 text-primary-foreground" />
            </div>
          </div>
          <h2 className="mb-2 text-2xl font-semibold">Platba úspešná!</h2>
          <p className="text-muted-foreground">Vaša chladnička bude doručená do 3-5 pracovných dní.</p>
        </Card>
      </div>
    )
  }

  return (
    <>
      <div className="mx-auto max-w-7xl p-4 py-8 md:p-8 lg:py-12">
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" className="size-10">
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Pokladňa</h1>
            <p className="text-sm text-muted-foreground">Dokončite váš nákup</p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-8">
              <Card className="p-6">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    1
                  </div>
                  <h2 className="text-xl font-semibold">Dodacie údaje</h2>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Meno</Label>
                      <Input id="firstName" placeholder="Ján" defaultValue="Peter" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Priezvisko</Label>
                      <Input id="lastName" placeholder="Novák" defaultValue="Kováč" required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="jan.novak@priklad.sk"
                      defaultValue="peter.kovac@priklad.sk"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Ulica a číslo</Label>
                    <Input id="address" placeholder="Hlavná 123" defaultValue="Dunajská 45" required />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="city">Mesto</Label>
                      <Input id="city" placeholder="Bratislava" defaultValue="Bratislava" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">Kraj</Label>
                      <Input id="state" placeholder="BA" defaultValue="BA" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zip">PSČ</Label>
                      <Input id="zip" placeholder="81101" defaultValue="82108" required />
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    2
                  </div>
                  <h2 className="text-xl font-semibold">Spôsob platby</h2>
                </div>

                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                  <div className="relative">
                    <label
                      htmlFor="instant"
                      className={`flex cursor-pointer items-start gap-4 rounded-lg border-2 p-4 transition-all ${
                        paymentMethod === "instant"
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:border-primary/50"
                      }`}
                    >
                      <RadioGroupItem value="instant" id="instant" className="mt-1" />
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <Zap className="size-5 text-primary" />
                          <span className="font-semibold">Okamžitá platba</span>
                          <span className="ml-auto rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                            NOVÉ
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          Dokončite váš nákup v priebehu pár sekúnd s naším revolučným spôsobom platby. Nie sú potrebné
                          údaje o karte, iba okamžité overenie a potvrdenie.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                            ⚡ Okamžité
                          </span>
                          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                            🔒 Bezpečné
                          </span>
                          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                            ✓ Overené
                          </span>
                        </div>
                      </div>
                    </label>
                  </div>

                  <label
                    htmlFor="card"
                    className={`flex cursor-pointer items-start gap-4 rounded-lg border-2 p-4 transition-all ${
                      paymentMethod === "card"
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value="card" id="card" className="mt-1" />
                    <div className="flex-1">
                      <div className="mb-1 font-semibold">Kreditná / Debetná karta</div>
                      <p className="text-sm text-muted-foreground">Zaplaťte kartou</p>
                    </div>
                  </label>

                  <label
                    htmlFor="paypal"
                    className={`flex cursor-pointer items-start gap-4 rounded-lg border-2 p-4 transition-all ${
                      paymentMethod === "paypal"
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value="paypal" id="paypal" className="mt-1" />
                    <div className="flex-1">
                      <div className="mb-1 font-semibold">PayPal</div>
                      <p className="text-sm text-muted-foreground">Zaplaťte bezpečne pomocou PayPal účtu</p>
                    </div>
                  </label>
                </RadioGroup>
              </Card>

              <Button type="submit" size="lg" className="w-full text-base" disabled={processing}>
                {processing ? (
                  <>
                    <div className="mr-2 size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Spracúva sa...
                  </>
                ) : (
                  <>Dokončiť nákup - 1 299,99 €</>
                )}
              </Button>
            </form>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-8 p-6">
              <h2 className="mb-6 text-lg font-semibold">Súhrn objednávky</h2>

              <div className="mb-6 flex gap-4">
                <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                  <img
                    src="/modern-stainless-steel-refrigerator.jpg"
                    alt="Premium Smart Chladnička"
                    className="size-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium leading-snug">Premium Smart Chladnička</h3>
                  <p className="text-sm text-muted-foreground">Nerezová oceľ, 28 cu ft</p>
                  <p className="mt-1 font-semibold">1 299,99 €</p>
                </div>
              </div>

              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Medzisúčet</span>
                  <span className="font-medium">1 299,99 €</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Doprava</span>
                  <span className="font-medium text-primary">Zadarmo</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">DPH</span>
                  <span className="font-medium">0,00 €</span>
                </div>
                <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
                  <span>Celkom</span>
                  <span>1 299,99 €</span>
                </div>
              </div>

              <div className="mt-6 space-y-3 border-t border-border pt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="size-4 text-primary" />
                  <span>Bezpečná platba</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="size-4 text-primary" />
                  <span>Doprava a vrátenie zadarmo</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="size-4 text-primary" />
                  <span>2-ročná záruka v cene</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {showInstantPayment && (
        <InstantPaymentModal
          isOpen={showInstantPayment}
          onClose={() => setShowInstantPayment(false)}
          paymentData={instantPaymentData}
          onSuccess={handleInstantPaymentSuccess}
        />
      )}
    </>
  )
}
