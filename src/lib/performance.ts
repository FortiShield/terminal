export interface PerformanceMetrics {
  frameTimes: number[]
  avgFrameTime: number
  fps: number
  memoryUsage: number
  cpuUsage: number
  gpuUsage?: number
  networkLatency: number
  renderTime: number
}

export interface TokenMetrics {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  tokensPerSecond: number
  estimatedCost: number
  timeToFirstToken?: number
}

export interface InferenceMetrics {
  modelName: string
  quantization: string
  contextLength: number
  timeToFirstToken: number
  tokensPerSecond: number
  totalInferenceTime: number
}

export class PerformanceMonitor {
  private frameCount = 0
  private lastFrameTime = performance.now()
  private frameTimes: number[] = []
  private readonly maxFrameSamples = 60
  private rafId: number | null = null

  startMonitoring(): void {
    const tick = () => {
      this.recordFrame()
      this.rafId = requestAnimationFrame(tick)
    }
    this.rafId = requestAnimationFrame(tick)
  }

  stopMonitoring(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  recordFrame(): void {
    const now = performance.now()
    const frameTime = now - this.lastFrameTime
    this.lastFrameTime = now

    this.frameTimes.push(frameTime)
    if (this.frameTimes.length > this.maxFrameSamples) {
      this.frameTimes.shift()
    }

    this.frameCount++
  }

  getMetrics(): PerformanceMetrics {
    const avgFrameTime = this.frameTimes.length > 0
      ? this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
      : 0

    const fps = avgFrameTime > 0 ? 1000 / avgFrameTime : 0

    const memory = (performance as any).memory?.usedJSHeapSize || 0
    const memoryUsage = memory / (1024 * 1024)

    return {
      frameTimes: [...this.frameTimes],
      avgFrameTime,
      fps: Math.round(fps),
      memoryUsage: Math.round(memoryUsage * 10) / 10,
      cpuUsage: this.estimateCPU(),
      networkLatency: 0,
      renderTime: Math.round(avgFrameTime * 100) / 100,
    }
  }

  private estimateCPU(): number {
    if (this.frameTimes.length === 0) return 0
    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
    return Math.min(Math.round((avgFrameTime / 16.67) * 100), 100)
  }

  reset(): void {
    this.frameCount = 0
    this.frameTimes = []
    this.lastFrameTime = performance.now()
  }
}

export class TokenCounter {
  private inputTokens = 0
  private outputTokens = 0
  private startTime = 0
  private firstTokenTime = 0
  private endTime = 0

  startCounting(inputTokens: number): void {
    this.inputTokens = inputTokens
    this.outputTokens = 0
    this.startTime = performance.now()
    this.firstTokenTime = 0
  }

  incrementOutputTokens(count: number = 1): void {
    if (this.outputTokens === 0 && count > 0) {
      this.firstTokenTime = performance.now()
    }
    this.outputTokens += count
  }

  finishCounting(): TokenMetrics {
    this.endTime = performance.now()
    const duration = (this.endTime - this.startTime) / 1000
    const tokensPerSecond = duration > 0 ? this.outputTokens / duration : 0

    const costPerToken = 0.00002
    const estimatedCost = (this.inputTokens + this.outputTokens) * costPerToken

    return {
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      totalTokens: this.inputTokens + this.outputTokens,
      tokensPerSecond: Math.round(tokensPerSecond * 10) / 10,
      estimatedCost: Math.round(estimatedCost * 1000000) / 1000000,
      timeToFirstToken: this.firstTokenTime > 0
        ? Math.round(this.firstTokenTime - this.startTime)
        : undefined,
    }
  }
}

export function estimateTokenCount(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length
  const chars = text.length
  return Math.ceil(Math.max(words * 1.3, chars / 4))
}

export class MetricsAggregator {
  private samples: Map<string, number[]> = new Map()
  private readonly maxSamples: number

  constructor(maxSamples: number = 60) {
    this.maxSamples = maxSamples
  }

  record(key: string, value: number): void {
    const existing = this.samples.get(key) || []
    existing.push(value)
    if (existing.length > this.maxSamples) {
      existing.shift()
    }
    this.samples.set(key, existing)
  }

  getAverage(key: string): number {
    const values = this.samples.get(key)
    if (!values || values.length === 0) return 0
    return values.reduce((a, b) => a + b, 0) / values.length
  }

  getMin(key: string): number {
    const values = this.samples.get(key)
    if (!values || values.length === 0) return 0
    return Math.min(...values)
  }

  getMax(key: string): number {
    const values = this.samples.get(key)
    if (!values || values.length === 0) return 0
    return Math.max(...values)
  }

  getP95(key: string): number {
    const values = this.samples.get(key)
    if (!values || values.length === 0) return 0
    const sorted = [...values].sort((a, b) => a - b)
    const index = Math.floor(sorted.length * 0.95)
    return sorted[Math.min(index, sorted.length - 1)]
  }

  clear(key?: string): void {
    if (key) {
      this.samples.delete(key)
    } else {
      this.samples.clear()
    }
  }
}
