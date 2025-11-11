// Payment Link generation according to the Payment Link Standard

export interface PaymentLinkParams {
  iban: string
  amount: number
  currency: string
  creditorName: string
  endToEndId: string
  message?: string
  dueDate?: string
}

/**
 * Generates a Payment Link according to Payment Link Standard v1.3
 * Format: https://payme.sk/?V=1&IBAN=...&AM=...&CC=EUR&CN=...&PI=...
 */
export function generatePaymentLink(params: PaymentLinkParams): string {
  const { iban, amount, currency, creditorName, endToEndId, message, dueDate } = params

  // Format amount with 2 decimal places
  const formattedAmount = amount.toFixed(2)

  // Build query parameters
  const queryParams = new URLSearchParams({
    V: "1", // Version
    IBAN: iban.replace(/\s/g, ""), // Remove whitespace
    AM: formattedAmount,
    CC: currency.toUpperCase(),
    CN: creditorName,
    PI: endToEndId,
  })

  // Add optional parameters
  if (message) {
    queryParams.append("MSG", message)
  }

  if (dueDate) {
    // Format: YYYYMMDD
    queryParams.append("DT", dueDate)
  }

  return `https://payme.sk/?${queryParams.toString()}`
}

/**
 * Detects if the user is on a mobile device
 */
export function isMobileDevice(userAgent: string): boolean {
  return /android|iphone|ipad|ipod/i.test(userAgent.toLowerCase())
}

/**
 * Detects specific mobile platform
 */
export function getMobilePlatform(userAgent: string): "ios" | "android" | "other" {
  const ua = userAgent.toLowerCase()
  if (/iphone|ipad|ipod/.test(ua)) return "ios"
  if (/android/.test(ua)) return "android"
  return "other"
}
