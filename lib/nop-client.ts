// NOP API Client for communication with KVERKOM system

import https from "https"

export interface TransactionIdResponse {
  transaction_id: string
  created_at: string
}

export interface NOPClientConfig {
  apiHost: string
  cert: string
  key: string
  ca: string
}

/**
 * NOP API Client for generating transaction IDs
 */
export class NOPClient {
  private config: NOPClientConfig

  constructor(config: NOPClientConfig) {
    this.config = config
  }

  /**
   * Generates a new transaction ID (EndToEndId) from NOP API
   * Endpoint: POST https://api-erp.kverkom.sk/api/v1/generateNewTransactionId
   */
  async generateNewTransactionId(): Promise<TransactionIdResponse> {
    return new Promise((resolve, reject) => {
      const options: https.RequestOptions = {
        hostname: this.config.apiHost,
        port: 443,
        path: "/api/v1/generateNewTransactionId",
        method: "POST",
        cert: this.config.cert,
        key: this.config.key,
        ca: this.config.ca,
        rejectUnauthorized: true,
      }

      const req = https.request(options, (res) => {
        let data = ""

        res.on("data", (chunk) => {
          data += chunk
        })

        res.on("end", () => {
          if (res.statusCode === 200) {
            try {
              const response = JSON.parse(data) as TransactionIdResponse
              resolve(response)
            } catch (error) {
              reject(new Error(`Failed to parse response: ${error}`))
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`))
          }
        })
      })

      req.on("error", (error) => {
        reject(error)
      })

      req.end()
    })
  }
}

/**
 * Creates NOP client instance with environment configuration
 */
export function createNOPClient(): NOPClient {
  const apiHost = "api-erp.kverkom.sk"
  const cert = process.env.KVERKOM_CLIENT_CERT || ""
  const key = process.env.KVERKOM_CLIENT_KEY || ""
  const ca = process.env.KVERKOM_CA_BUNDLE || ""

  if (!cert || !key || !ca) {
    throw new Error(
      "Missing certificate configuration. Please set KVERKOM_CLIENT_CERT, KVERKOM_CLIENT_KEY, and KVERKOM_CA_BUNDLE environment variables in Vercel Vars section.",
    )
  }

  console.log("[v0] NOP Client configuration:")
  console.log("[v0] API Host:", apiHost)
  console.log("[v0] Certificate present:", cert.length > 0)
  console.log("[v0] Key present:", key.length > 0)
  console.log("[v0] CA Bundle present:", ca.length > 0)

  return new NOPClient({
    apiHost,
    cert,
    key,
    ca,
  })
}
