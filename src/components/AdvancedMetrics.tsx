import { useEffect, useState, useRef, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Cpu,
  HardDrive,
  Lightning,
  Clock,
  ChartLine,
  Gauge,
  Pulse
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface AdvancedMetricsProps {
  compact?: boolean
}

interface MetricHistory {
  cpu: number[]
  memory: number[]
  gpu: number[]
  tokens: number[]
  latency: number[]
  fps: number[]
}

const MAX_HISTORY = 30

export function AdvancedMetrics({ compact = false }: AdvancedMetricsProps) {
  const [cpu, setCpu] = useState(0)
  const [memory, setMemory] = useState(0)
  const [gpu, setGpu] = useState(0)
  const [tokens, setTokens] = useState(0)
  const [latency, setLatency] = useState(0)
  const [fps, setFps] = useState(60)
  const [history, setHistory] = useState<MetricHistory>({
    cpu: [],
    memory: [],
    gpu: [],
    tokens: [],
    latency: [],
    fps: [],
  })

  const frameRef = useRef<number | null>(null)
  const lastUpdateRef = useRef(0)

  const updateMetrics = useCallback(() => {
    const now = performance.now()
    if (now - lastUpdateRef.current < 100) {
      frameRef.current = requestAnimationFrame(updateMetrics)
      return
    }
    lastUpdateRef.current = now

    const time = now / 1000
    const newCpu = Math.max(0, Math.min(100, 25 + Math.sin(time * 0.5) * 20 + Math.random() * 30))
    const newMemory = Math.max(0, Math.min(100, 45 + Math.sin(time * 0.3) * 15 + Math.random() * 20))
    const newGpu = Math.max(0, Math.min(100, 20 + Math.cos(time * 0.4) * 18 + Math.random() * 35))
    const newTokens = Math.floor(600 + Math.sin(time * 0.7) * 400 + Math.random() * 500)
    const newLatency = Math.floor(40 + Math.cos(time * 0.6) * 30 + Math.random() * 60)
    const newFps = Math.floor(55 + Math.sin(time * 0.8) * 8 + Math.random() * 5)

    setCpu(newCpu)
    setMemory(newMemory)
    setGpu(newGpu)
    setTokens(newTokens)
    setLatency(newLatency)
    setFps(newFps)

    setHistory((prev) => ({
      cpu: [...prev.cpu.slice(-MAX_HISTORY + 1), newCpu],
      memory: [...prev.memory.slice(-MAX_HISTORY + 1), newMemory],
      gpu: [...prev.gpu.slice(-MAX_HISTORY + 1), newGpu],
      tokens: [...prev.tokens.slice(-MAX_HISTORY + 1), newTokens],
      latency: [...prev.latency.slice(-MAX_HISTORY + 1), newLatency],
      fps: [...prev.fps.slice(-MAX_HISTORY + 1), newFps],
    }))

    frameRef.current = requestAnimationFrame(updateMetrics)
  }, [])

  useEffect(() => {
    frameRef.current = requestAnimationFrame(updateMetrics)
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [updateMetrics])

  const getMetricColor = (value: number, thresholds: [number, number]): string => {
    if (value < thresholds[0]) return 'text-primary'
    if (value < thresholds[1]) return 'text-accent'
    return 'text-destructive'
  }

  const getMetricBgColor = (value: number, thresholds: [number, number]): string => {
    if (value < thresholds[0]) return 'bg-primary'
    if (value < thresholds[1]) return 'bg-accent'
    return 'bg-destructive'
  }

  const MiniSparkline = ({ data, color }: { data: number[]; color: string }) => {
    if (data.length < 2) return null
    const max = Math.max(...data, 1)
    const min = Math.min(...data, 0)
    const range = max - min || 1
    const width = 60
    const height = 20

    const points = data
      .map((v, i) => {
        const x = (i / (data.length - 1)) * width
        const y = height - ((v - min) / range) * height
        return `${x},${y}`
      })
      .join(' ')

    return (
      <svg width={width} height={height} className="opacity-60">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  const getSparkColor = (value: number, thresholds: [number, number]): string => {
    if (value < thresholds[0]) return 'oklch(0.75 0.15 195)'
    if (value < thresholds[1]) return 'oklch(0.78 0.15 75)'
    return 'oklch(0.55 0.22 25)'
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card/50 font-sans overflow-x-auto scrollbar-thin">
        <Badge variant="outline" className="gap-1.5 text-xs shrink-0">
          <Cpu size={12} className={getMetricColor(cpu, [60, 80])} />
          <span className={getMetricColor(cpu, [60, 80])}>{cpu.toFixed(0)}%</span>
        </Badge>
        <Badge variant="outline" className="gap-1.5 text-xs shrink-0">
          <HardDrive size={12} className={getMetricColor(memory, [70, 85])} />
          <span className={getMetricColor(memory, [70, 85])}>{memory.toFixed(0)}%</span>
        </Badge>
        <Badge variant="outline" className="gap-1.5 text-xs shrink-0">
          <Gauge size={12} className={getMetricColor(gpu, [60, 80])} />
          <span className={getMetricColor(gpu, [60, 80])}>{gpu.toFixed(0)}%</span>
        </Badge>
        <Badge variant="outline" className="gap-1.5 text-xs shrink-0">
          <Lightning size={12} className="text-primary" />
          <span>{tokens}t/s</span>
        </Badge>
        <Badge variant="outline" className="gap-1.5 text-xs shrink-0">
          <Clock size={12} className={getMetricColor(latency, [100, 150])} />
          <span>{latency}ms</span>
        </Badge>
        <Badge variant="outline" className="gap-1.5 text-xs shrink-0">
          <Pulse size={12} className={getMetricColor(60 - fps, [10, 20])} />
          <span>{fps}fps</span>
        </Badge>
      </div>
    )
  }

  return (
    <Card className="p-4 bg-card/50 border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ChartLine className="text-primary" size={20} weight="duotone" />
          <h3 className="font-bold text-sm tracking-tight font-sans">System Performance</h3>
        </div>
        <Badge variant="outline" className="text-xs">
          <Pulse size={10} className="mr-1 text-primary" />
          Live
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
          <Cpu className={cn('shrink-0', getMetricColor(cpu, [60, 80]))} size={24} weight="duotone" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-sans text-muted-foreground">CPU</div>
            <div className="flex items-center gap-2">
              <div className="text-lg font-bold font-mono">{cpu.toFixed(1)}%</div>
              <MiniSparkline data={history.cpu} color={getSparkColor(cpu, [60, 80])} />
            </div>
            <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-200', getMetricBgColor(cpu, [60, 80]))}
                style={{ width: `${cpu}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
          <HardDrive className={cn('shrink-0', getMetricColor(memory, [70, 85]))} size={24} weight="duotone" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-sans text-muted-foreground">Memory</div>
            <div className="flex items-center gap-2">
              <div className="text-lg font-bold font-mono">{memory.toFixed(1)}%</div>
              <MiniSparkline data={history.memory} color={getSparkColor(memory, [70, 85])} />
            </div>
            <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-200', getMetricBgColor(memory, [70, 85]))}
                style={{ width: `${memory}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
          <Gauge className={cn('shrink-0', getMetricColor(gpu, [60, 80]))} size={24} weight="duotone" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-sans text-muted-foreground">GPU</div>
            <div className="flex items-center gap-2">
              <div className="text-lg font-bold font-mono">{gpu.toFixed(1)}%</div>
              <MiniSparkline data={history.gpu} color={getSparkColor(gpu, [60, 80])} />
            </div>
            <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-200', getMetricBgColor(gpu, [60, 80]))}
                style={{ width: `${gpu}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
          <Lightning className="text-primary shrink-0" size={24} weight="duotone" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-sans text-muted-foreground">Tokens</div>
            <div className="flex items-center gap-2">
              <div className="text-lg font-bold font-mono">{tokens}<span className="text-xs text-muted-foreground">t/s</span></div>
              <MiniSparkline data={history.tokens} color="oklch(0.75 0.15 195)" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
          <Clock className={cn('shrink-0', getMetricColor(latency, [100, 150]))} size={24} weight="duotone" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-sans text-muted-foreground">Latency</div>
            <div className="flex items-center gap-2">
              <div className="text-lg font-bold font-mono">{latency}<span className="text-xs text-muted-foreground">ms</span></div>
              <MiniSparkline data={history.latency} color={getSparkColor(latency, [100, 150])} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
          <Pulse className={cn('shrink-0', getMetricColor(60 - fps, [10, 20]))} size={24} weight="duotone" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-sans text-muted-foreground">FPS</div>
            <div className="flex items-center gap-2">
              <div className="text-lg font-bold font-mono">{fps}<span className="text-xs text-muted-foreground">fps</span></div>
              <MiniSparkline data={history.fps} color={getSparkColor(60 - fps, [10, 20])} />
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
