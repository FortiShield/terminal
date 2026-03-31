import { generateId, sleep } from './utils'

interface RequestConfig {
  url: string
  method?: string
  headers?: Record<string, string>
  body?: unknown
  timeout?: number
  retries?: number
  retryDelay?: number
  priority?: number
}

interface QueuedRequest {
  id: string
  config: RequestConfig
  resolve: (value: Response) => void
  reject: (reason: Error) => void
  attempts: number
  priority: number
  createdAt: number
}

export class NetworkManager {
  private requestQueue: QueuedRequest[] = []
  private activeRequests = 0
  private maxConcurrent: number
  private rateLimitRemaining = 100
  private rateLimitReset = 0
  private requestLog: RequestLog[] = []

  constructor(maxConcurrent: number = 6) {
    this.maxConcurrent = maxConcurrent
  }

  async request<T = unknown>(config: RequestConfig): Promise<T> {
    const response = await this.executeRequest(config)
    return response.json() as T
  }

  async stream(
    config: RequestConfig,
    onData: (chunk: string) => void,
    onComplete?: () => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    try {
      const response = await this.executeRequest(config)

      if (!response.body) {
        throw new Error('Response body is null')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          onComplete?.()
          break
        }
        const chunk = decoder.decode(value, { stream: true })
        onData(chunk)
      }
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Stream error'))
    }
  }

  private async executeRequest(config: RequestConfig): Promise<Response> {
    await this.waitForRateLimit()
    await this.waitForSlot()

    const maxRetries = config.retries ?? 3
    const retryDelay = config.retryDelay ?? 1000
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        this.activeRequests++
        const startTime = performance.now()

        const controller = new AbortController()
        const timeout = config.timeout ?? 30000
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        const response = await fetch(config.url, {
          method: config.method ?? 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...config.headers,
          },
          body: config.body ? JSON.stringify(config.body) : undefined,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)
        const duration = performance.now() - startTime

        this.logRequest(config, response.status, duration, attempt)

        this.updateRateLimit(response)

        if (!response.ok) {
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After')
            const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : retryDelay * (attempt + 1)
            await sleep(waitTime)
            continue
          }

          if (response.status >= 500 && attempt < maxRetries) {
            await sleep(retryDelay * (attempt + 1))
            continue
          }

          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        return response
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')

        if (lastError.name === 'AbortError') {
          lastError = new Error(`Request timeout after ${config.timeout ?? 30000}ms`)
        }

        if (attempt < maxRetries) {
          await sleep(retryDelay * (attempt + 1))
        }
      } finally {
        this.activeRequests--
      }
    }

    throw lastError ?? new Error('Request failed after retries')
  }

  private async waitForRateLimit(): Promise<void> {
    if (this.rateLimitRemaining <= 0) {
      const waitTime = this.rateLimitReset - Date.now()
      if (waitTime > 0) {
        await sleep(Math.min(waitTime, 10000))
      }
    }
  }

  private async waitForSlot(): Promise<void> {
    while (this.activeRequests >= this.maxConcurrent) {
      await sleep(50)
    }
  }

  private updateRateLimit(response: Response): void {
    const remaining = response.headers.get('X-RateLimit-Remaining')
    const reset = response.headers.get('X-RateLimit-Reset')

    if (remaining !== null) {
      this.rateLimitRemaining = parseInt(remaining)
    }
    if (reset !== null) {
      this.rateLimitReset = parseInt(reset) * 1000
    }
  }

  private logRequest(
    config: RequestConfig,
    status: number,
    duration: number,
    attempt: number
  ): void {
    this.requestLog.push({
      id: generateId(),
      url: config.url,
      method: config.method ?? 'GET',
      status,
      duration,
      attempt,
      timestamp: Date.now(),
    })

    if (this.requestLog.length > 100) {
      this.requestLog.shift()
    }
  }

  getRequestLog(): RequestLog[] {
    return [...this.requestLog]
  }

  get activeRequestCount(): number {
    return this.activeRequests
  }

  clearLog(): void {
    this.requestLog = []
  }
}

interface RequestLog {
  id: string
  url: string
  method: string
  status: number
  duration: number
  attempt: number
  timestamp: number
}

export const networkManager = new NetworkManager()
