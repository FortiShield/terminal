export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  status: 'sending' | 'streaming' | 'complete' | 'error'
}

export interface Session {
  id: string
  name: string
  created: number
  lastActive: number
  messageCount: number
}

export interface SystemMetrics {
  cpu: number
  memory: number
  tokens: number
  latency: number
}
