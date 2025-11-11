// Utility functions for parsing certificate data
import * as forge from "node-forge"

export interface CertificateData {
  vatsk: string
  pokladnica: string
}

/**
 * Parses VATSK and POKLADNICA from certificate
 * Example CN format: "CN = VATSK-1234567890 POKLADNICA 88812345678900001"
 * Example OU format: "OU = 88812345678900001"
 */
export function parseCertificate(certPem: string): CertificateData | null {
  try {
    console.log("[v0] Parsing certificate with node-forge...")

    const cert = forge.pki.certificateFromPem(certPem)

    const subject = cert.subject
    const cnAttr = subject.getField("CN")
    const ouAttr = subject.getField("OU")

    if (cnAttr) {
      console.log("[v0] CN field:", cnAttr.value)
    }
    if (ouAttr) {
      console.log("[v0] OU field:", ouAttr.value)
    }

    if (!cnAttr) {
      console.log("[v0] No CN field found in certificate")
      return null
    }

    const cnValue = cnAttr.value as string

    const vatskMatch = cnValue.match(/VATSK-(\d+)/)

    let pokladnicaMatch = cnValue.match(/POKLADNICA[\s-]+(\d+)/)

    if (!pokladnicaMatch && ouAttr) {
      const ouValue = ouAttr.value as string
      pokladnicaMatch = ouValue.match(/(\d+)/)
      if (pokladnicaMatch) {
        console.log("[v0] Found POKLADNICA in OU field:", pokladnicaMatch[1])
      }
    }

    if (!vatskMatch || !pokladnicaMatch) {
      console.log("[v0] Certificate parsing failed")
      console.log("[v0] VATSK found:", !!vatskMatch, vatskMatch?.[1])
      console.log("[v0] POKLADNICA found:", !!pokladnicaMatch, pokladnicaMatch?.[1])
      return null
    }

    const vatskNumber = vatskMatch[1]
    const pokladnicaNumber = pokladnicaMatch[1]

    console.log("[v0] Parsed certificate - VATSK:", vatskNumber, "POKLADNICA:", pokladnicaNumber)
    console.log(
      "[v0] MQTT Topic will be: VATSK-" + vatskNumber + "/POKLADNICA-" + pokladnicaNumber + "/<transactionId>",
    )

    return {
      vatsk: vatskNumber,
      pokladnica: pokladnicaNumber,
    }
  } catch (error) {
    console.error("[v0] Error parsing certificate with node-forge:", error)
    return null
  }
}

/**
 * Gets certificate data from environment variables
 * Returns null if certificate is not set or doesn't contain required data
 */
export function getCertificateData(): CertificateData | null {
  console.log("[v0] 🔍 Checking KVERKOM_CLIENT_CERT environment variable...")
  const certPem = process.env.KVERKOM_CLIENT_CERT || ""

  if (!certPem) {
    console.log("[v0] ❌ KVERKOM_CLIENT_CERT environment variable is NOT SET")
    return null
  }

  console.log("[v0] ✅ KVERKOM_CLIENT_CERT is set, length:", certPem.length, "characters")
  console.log("[v0] 📄 First 100 characters:", certPem.substring(0, 100))
  console.log("[v0] 📄 Certificate contains 'Subject:':", certPem.includes("Subject:"))
  console.log("[v0] 📄 Certificate contains 'VATSK':", certPem.includes("VATSK"))
  console.log("[v0] 📄 Certificate contains 'POKLADNICA':", certPem.includes("POKLADNICA"))

  const data = parseCertificate(certPem)

  if (!data) {
    console.log(
      "[v0] Certificate does not contain VATSK and POKLADNICA in expected format. MQTT subscription will not be available.",
    )
  }

  return data
}
