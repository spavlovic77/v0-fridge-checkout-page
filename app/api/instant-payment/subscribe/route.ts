// API Route: Subscribe to MQTT and wait for payment notification
// POST /api/instant-payment/subscribe

import { type NextRequest, NextResponse } from "next/server"
import mqtt from "mqtt"

export const maxDuration = 60 // Maximum allowed duration for Vercel

async function getCertificateFromEnv(envVar: string): Promise<Buffer> {
  const cert = process.env[envVar]
  if (!cert) {
    throw new Error(`Missing environment variable: ${envVar}`)
  }
  return Buffer.from(cert, "utf-8")
}

export async function POST(request: NextRequest) {
  console.log("[v0] 🎯 MQTT Subscribe route called")

  try {
    const body = await request.json()
    const { transactionId, vatsk, pokladnica } = body

    console.log("[v0] 📋 Received parameters:")
    console.log("[v0]   - transactionId:", transactionId)
    console.log("[v0]   - vatsk:", vatsk)
    console.log("[v0]   - pokladnica:", pokladnica)

    if (!transactionId || !vatsk || !pokladnica) {
      console.log("[v0] ❌ Missing required parameters")
      console.log("[v0] ℹ️ This likely means the certificate doesn't contain VATSK/POKLADNICA data")
      return NextResponse.json(
        {
          error: "Missing required parameters",
          details: "transactionId, vatsk, and pokladnica are required",
          hint: "Certificate must contain VATSK-XXXXXXXXXX and POKLADNICA-XXXXXXXXXXXXXX in CN field",
          received: { transactionId: !!transactionId, vatsk: !!vatsk, pokladnica: !!pokladnica },
        },
        { status: 400 },
      )
    }

    console.log("[v0] ✅ All required parameters present")

    console.log("[v0] 📋 Parameters:", { transactionId, vatsk, pokladnica })

    // Get certificates from environment variables
    let clientCertBuffer: Buffer
    let clientKeyBuffer: Buffer
    let caCertBuffer: Buffer

    try {
      clientCertBuffer = await getCertificateFromEnv("KVERKOM_CLIENT_CERT")
      clientKeyBuffer = await getCertificateFromEnv("KVERKOM_CLIENT_KEY")
      caCertBuffer = await getCertificateFromEnv("KVERKOM_CA_BUNDLE")
      console.log("[v0] ✅ Certificates loaded from environment variables")
    } catch (certError) {
      console.error("[v0] ❌ Certificate loading failed:", certError)
      return NextResponse.json(
        {
          error: "Certificate configuration error",
          message: certError instanceof Error ? certError.message : "Unknown error",
        },
        { status: 500 },
      )
    }

    // Build MQTT topic
    const mqttTopic = `VATSK-${vatsk}/POKLADNICA-${pokladnica}/${transactionId}`
    const mqttBroker = "mqtt.kverkom.sk"
    const mqttPort = 8883

    console.log("[v0] 🌐 MQTT Broker:", mqttBroker)
    console.log("[v0] 🔌 MQTT Port:", mqttPort)
    console.log("[v0] 📡 MQTT Topic:", mqttTopic)

    const communicationLog: string[] = []
    const startTime = new Date().toISOString()
    communicationLog.push(`[${startTime}] 🔄 Initiating MQTT connection to ${mqttBroker}:${mqttPort}`)
    communicationLog.push(`[${startTime}] 📡 Using MQTT over TLS (mqtts://) with client certificates`)
    communicationLog.push(`[${startTime}] 🎯 Subscribing to topic: ${mqttTopic}`)
    communicationLog.push(`[${startTime}] ⏱️ Timeout: 60 seconds`)

    return new Promise((resolve) => {
      const messages: string[] = []
      let timeoutHandle: NodeJS.Timeout
      let isResolved = false

      const mqttUrl = `mqtts://${mqttBroker}:${mqttPort}`
      console.log("[v0] 🔗 Connecting to MQTT broker:", mqttUrl)

      const client = mqtt.connect(mqttUrl, {
        cert: clientCertBuffer,
        key: clientKeyBuffer,
        ca: caCertBuffer,
        rejectUnauthorized: true,
        protocol: "mqtts",
        port: mqttPort,
        keepalive: 60,
        connectTimeout: 30000,
        reconnectPeriod: 0, // Disable auto-reconnect
      })

      const cleanup = () => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle)
        }
        if (client) {
          client.end(true)
        }
      }

      const resolveOnce = (response: Response) => {
        if (!isResolved) {
          isResolved = true
          cleanup()
          resolve(response)
        }
      }

      timeoutHandle = setTimeout(() => {
        const endTime = new Date().toISOString()
        console.log("[v0] ⏱️ MQTT subscription timeout reached (60 seconds)")
        communicationLog.push(`[${endTime}] ⏱️ Timeout reached after 60 seconds`)
        communicationLog.push(`[${endTime}] 📊 Total messages received: ${messages.length}`)

        resolveOnce(
          new Response(
            JSON.stringify({
              success: false,
              hasMessages: messages.length > 0,
              messages: messages,
              messageCount: messages.length,
              communicationLog: communicationLog,
              status: "timeout",
              listeningDuration: "60 seconds",
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
        )
      }, 60000) // 60 seconds

      client.on("connect", () => {
        const connectTime = new Date().toISOString()
        console.log("[v0] ✅ Connected to MQTT broker")
        communicationLog.push(`[${connectTime}] ✅ Connected to MQTT broker`)

        client.subscribe(mqttTopic, { qos: 1 }, (err, granted) => {
          if (err) {
            const errorTime = new Date().toISOString()
            console.error("[v0] ❌ Subscription error:", err)
            communicationLog.push(`[${errorTime}] ❌ Subscription error: ${err.message}`)

            resolveOnce(
              new Response(
                JSON.stringify({
                  error: "MQTT subscription failed",
                  details: err.message,
                  communicationLog: communicationLog,
                }),
                {
                  status: 500,
                  headers: { "Content-Type": "application/json" },
                },
              ),
            )
          } else {
            const subTime = new Date().toISOString()
            console.log("[v0] ✅ Subscribed to topic:", granted)
            console.log("[v0] 🎯 QoS level:", granted[0].qos)
            console.log("[v0] ⏳ Waiting for payment notification...")
            communicationLog.push(`[${subTime}] ✅ Subscribed to topic with QoS ${granted[0].qos}`)
            communicationLog.push(`[${subTime}] ⏳ Listening for payment notifications...`)
          }
        })
      })

      client.on("message", async (topic, message) => {
        const messageTime = new Date().toISOString()
        const messageStr = message.toString()
        console.log("[v0] 📨 Message received on topic:", topic)
        console.log("[v0] 📨 Message content:", messageStr)

        messages.push(messageStr)
        communicationLog.push(`[${messageTime}] 📨 Payment notification received: ${messageStr}`)

        const elapsedTime = Date.now() - new Date(startTime).getTime()
        const elapsedSeconds = Math.round(elapsedTime / 1000)

        console.log("[v0] ✅ Payment notification received, returning immediately")
        communicationLog.push(`[${messageTime}] ✅ Returning response after ${elapsedSeconds} seconds`)

        // Parse the payment notification
        let paymentData = null
        try {
          paymentData = JSON.parse(messageStr)
        } catch (e) {
          console.warn("[v0] ⚠️ Could not parse payment notification JSON")
        }

        resolveOnce(
          new Response(
            JSON.stringify({
              success: true,
              hasMessages: true,
              messages: messages,
              messageCount: messages.length,
              communicationLog: communicationLog,
              paymentData: paymentData,
              status: "completed",
              listeningDuration: `${elapsedSeconds} seconds`,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
        )
      })

      client.on("error", (err) => {
        const errorTime = new Date().toISOString()
        console.error("[v0] ❌ MQTT client error:", err)
        communicationLog.push(`[${errorTime}] ❌ MQTT error: ${err.message}`)

        resolveOnce(
          new Response(
            JSON.stringify({
              error: "MQTT connection failed",
              details: err instanceof Error ? err.message : "Unknown error",
              communicationLog: communicationLog,
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          ),
        )
      })

      client.on("close", () => {
        const closeTime = new Date().toISOString()
        console.log("[v0] 🔌 MQTT connection closed")
        communicationLog.push(`[${closeTime}] 🔌 Connection closed`)
      })
    })
  } catch (error) {
    console.error("[v0] ❌ MQTT subscription error:", error)
    return NextResponse.json(
      {
        error: "MQTT subscription failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
