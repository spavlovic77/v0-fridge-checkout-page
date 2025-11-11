// QR Code Generator for Payment Links
// Uses canvas API to generate QR codes

export async function generateQRCode(data: string): Promise<string> {
  try {
    const QRCode = await import("qrcode")

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(data, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 256,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    })

    return qrCodeDataUrl
  } catch (error) {
    console.error("[v0] Error generating QR code:", error)
    // Return empty data URL if generation fails
    return ""
  }
}
