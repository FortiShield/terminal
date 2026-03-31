import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Cpu, 
  HardDrive, 
  Lightning, 
  Clock, 
  ChartLine,
  Gauge
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface AdvancedMetricsProps {
  compact?: boolean
}

export function AdvancedMetrics({ compact = false }: AdvancedMetricsProps) {
  const [cpu, setCpu] = useState(0)
  const [memory, setMemory] = useState(0)
  const [gpu, setGpu] = useState(0)
  const [tokens, setTokens] = useState(0)
  const [latency, setLatency] = useState(0)
  const [fps, setFps] = useState(60)

  useEffect(() => {
    const interval = setInterval(() => {
      setCpu(20 + Math.random() * 60 + Math.sin(Date.now() / 2000) * 15)
      setMemory(40 + Math.random() * 30 + Math.sin(Date.now() / 3000) * 10)
      setGpu(15 + Math.random() * 50 + Math.cos(Date.now() / 2500) * 12)
      setTokens(Math.floor(800 + Math.random() * 800 + Math.sin(Date.now() / 1500) * 200))
      setLatency(Math.floor(50 + Math.random() * 100 + Math.cos(Date.now() / 2000) * 30))
      setFps(Math.floor(50 + Math.random() * 10 + Math.sin(Date.now() / 1000) * 5))
    }, 100)

    return () => clearInterval(interval)
  }, [])

  const getMetricColor = (value: number, thresholds: [number, number]): string => {
    if (value < thresholds[0]) return 'text-primary'
    if (value < thresholds[1]) return 'text-accent'
    return 'text-destructive'
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card/50 font-sans overflow-x-auto">
        <Badge variant="outline" className="gap-1.5 text-xs shrink-0">
          <Cpu className={getMetricColor(cpu, [60, 80])} />
          <span>{cpu.toFixed(1)}%</span>
        </Badge>
        <Badge variant="outline" className="gap-1.5 text-xs shrink-0">
          <HardDrive className={getMetricColor(memory, [70, 85])} />
          <span>{memory.toFixed(1)}%</span>
        </Badge>
        <Badge variant="outline" className="gap-1.5 text-xs shrink-0">
          <Gauge className={getMetricColor(gpu, [60, 80])} />
          <span>{gpu.toFixed(1)}%</span>
        </Badge>
        <Badge variant="outline" className="gap-1.5 text-xs shrink-0">
          <Lightning className="text-primary" />
          <span>{tokens}t/s</span>
        </Badge>
        <Badge variant="outline" className="gap-1.5 text-xs shrink-0">
          <Clock className={getMetricColor(latency, [100, 150])} />
          <span>{latency}ms</span>
        </Badge>
        <Badge variant="outline" className="gap-1.5 text-xs shrink-0">
          <ChartLine className={cn(getMetricColor(60 - fps, [10, 30]))} />
          <span>{fps}fps</span>
        </Badge>
      </div>
    )
  }

  return (
    <Card className="p-4 bg-card/50 border-border">
      <div className="flex items-center gap-2 mb-4">
        <ChartLine className="text-primary" size={20} weight="duotone" />
        <h3 className="font-bold text-sm tracking-tight font-sans">System Performance</h3>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-3">
          <Cpu className={cn('shrink-0', getMetricColor(cpu, [60, 80]))} size={24} weight="duotone" />
          <div>
            <div className="text-xs font-sans text-muted-foreground">CPU</div>
            <div className="text-lg font-bold font-mono">{cpu.toFixed(1)}%</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <HardDrive className={cn('shrink-0', getMetricColor(memory, [70, 85]))} size={24} weight="duotone" />
          <div>
            <div className="text-xs font-sans text-muted-foreground">Memory</div>
            <div className="text-lg font-bold font-mono">{memory.toFixed(1)}%</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Gauge className={cn('shrink-0', getMetricColor(gpu, [60, 80]))} size={24} weight="duotone" />
          <div>
            <div className="text-xs font-sans text-muted-foreground">GPU</div>
            <div className="text-lg font-bold font-mono">{gpu.toFixed(1)}%</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Lightning className="text-primary shrink-0" size={24} weight="duotone" />
          <div>
            <div className="text-xs font-sans text-muted-foreground">Tokens</div>
            <div className="text-lg font-bold font-mono">{tokens}t/s</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Clock className={cn('shrink-0', getMetricColor(latency, [100, 150]))} size={24} weight="duotone" />
          <div>
            <div className="text-xs font-sans text-muted-foreground">Latency</div>
            <div className="text-lg font-bold font-mono">{latency}ms</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ChartLine className={cn('shrink-0', getMetricColor(60 - fps, [10, 30]))} size={24} weight="duotone" />
          <div>
            <div className="text-xs font-sans text-muted-foreground">FPS</div>
            <div className="text-lg font-bold font-mono">{fps}fps</div>
          </div>
        </div>
      </div>
    </Card>
  )
}
