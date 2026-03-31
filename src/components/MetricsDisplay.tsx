import { Cpu, HardDrive, Lightning, Clock } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { useEffect, useState } from 'react'
import type { SystemMetrics } from '@/lib/types'

export function MetricsDisplay() {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpu: 0,
    memory: 0,
    tokens: 0,
    latency: 0,
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics({
        cpu: Math.random() * 100,
        memory: 45 + Math.random() * 30,
        tokens: Math.floor(Math.random() * 2000),
        latency: Math.floor(50 + Math.random() * 150),
      })
    }, 500)

    return () => clearInterval(interval)
  }, [])

  const getMetricColor = (value: number, thresholds: [number, number]) => {
    if (value < thresholds[0]) return 'text-primary'
    if (value < thresholds[1]) return 'text-accent'
    return 'text-destructive'
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card/50 font-sans">
      <Badge variant="outline" className="gap-1.5 text-xs">
        <Cpu className={getMetricColor(metrics.cpu, [60, 80])} />
        <span>{metrics.cpu.toFixed(1)}%</span>
      </Badge>
      <Badge variant="outline" className="gap-1.5 text-xs">
        <HardDrive className={getMetricColor(metrics.memory, [70, 85])} />
        <span>{metrics.memory.toFixed(1)}%</span>
      </Badge>
      <Badge variant="outline" className="gap-1.5 text-xs">
        <Lightning className="text-primary" />
        <span>{metrics.tokens}t</span>
      </Badge>
      <Badge variant="outline" className="gap-1.5 text-xs">
        <Clock className={getMetricColor(metrics.latency, [100, 150])} />
        <span>{metrics.latency}ms</span>
      </Badge>
    </div>
  )
}
