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
      fps,
      memoryUsage,
      cpuUsage: this.estimateCPU(),
      networkLatency: 0,
      renderTime: avgFrameTime,
    }
  }

  private estimateCPU(): number {
    if (this.frameTimes.length === 0) return 0
    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
    return Math.min((avgFrameTime / 16.67) * 100, 100)
  }

  reset(): void {
    this.frameCount = 0
    this.frameTimes = []
  }
}

export class TokenCounter {
  private inputTokens = 0
  private outputTokens = 0
  private startTime = 0
  private endTime = 0

  startCounting(inputTokens: number): void {
    this.inputTokens = inputTokens
    this.outputTokens = 0
    this.startTime = performance.now()
  }

  incrementOutputTokens(count: number = 1): void {
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
      tokensPerSecond,
      estimatedCost,
    }
  }
}

export function estimateTokenCount(text: string): number {
  const words = text.split(/\s+/).length
  return Math.ceil(words * 1.3)
}
