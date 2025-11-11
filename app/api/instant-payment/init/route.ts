// API Route: Initialize Instant Payment
// POST /api/instant-payment/init

import { NextResponse } from "next/server"
import { createNOPClient } from "@/lib/nop-client"
import { generatePaymentLink, isMobileDevice, getMobilePlatform } from "@/lib/payment-link"
import { generateQRCode } from "@/lib/qrcode-generator"
import { getCertificateData } from "@/lib/certificate-utils"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { amount, iban, creditorName, message } = body

    // Validate input
    if (!amount || !iban || !creditorName) {
      return NextResponse.json({ error: "Missing required fields: amount, iban, creditorName" }, { status: 400 })
    }

    console.log("[v0] Initializing instant payment...")
    console.log("[v0] Amount:", amount, "IBAN:", iban)

    const certData = getCertificateData()
    if (certData) {
      console.log("[v0] ✅ Certificate data parsed:", certData)
    } else {
      console.log("[v0] ⚠️ Certificate data not available - MQTT features will be limited")
    }

    let nopClient
    try {
      nopClient = createNOPClient()
    } catch (error) {
      console.error("[v0] ❌ Failed to create NOP client:", error)
      return NextResponse.json(
        {
          error: "Certificate configuration error",
          message: error instanceof Error ? error.message : "Unknown error",
          hint: "Please add KVERKOM_CLIENT_CERT, KVERKOM_CLIENT_KEY, and KVERKOM_CA_BUNDLE in Vercel Vars section",
        },
        { status: 500 },
      )
    }

    const txResponse = await nopClient.generateNewTransactionId()
    const transactionId = txResponse.transaction_id
    console.log("[v0] ✅ Generated transaction ID from NOP API:", transactionId)

    // Generate payment link
    const now = new Date()
    const dueDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`

    const paymentLink = generatePaymentLink({
      iban,
      amount: Number.parseFloat(amount),
      currency: "EUR",
      creditorName,
      endToEndId: transactionId,
      message,
      dueDate,
    })

    console.log("[v0] ✅ Payment link generated:", paymentLink)

    // Detect device type
    const userAgent = request.headers.get("user-agent") || ""
    const isMobile = isMobileDevice(userAgent)
    const platform = getMobilePlatform(userAgent)

    console.log("[v0] 📱 Device detection - isMobile:", isMobile, "platform:", platform)

    // Generate QR code for desktop users
    let qrCodeDataUrl = ""
    if (!isMobile) {
      qrCodeDataUrl = await generateQRCode(paymentLink)
      console.log("[v0] ✅ QR code generated for desktop user")
    }

    // Return response based on device type
    return NextResponse.json({
      success: true,
      transactionId,
      paymentLink,
      isMobile,
      platform,
      qrCodeDataUrl: isMobile ? null : qrCodeDataUrl,
      certificateData: certData,
    })
  } catch (error) {
    console.error("[v0] ❌ Error initializing instant payment:", error)
    return NextResponse.json(
      {
        error: "Failed to initialize instant payment",
        message: error instanceof Error ? error.message : "Unknown error",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
