export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  status: 'sending' | 'streaming' | 'complete' | 'error' | 'queued'
  metadata?: MessageMetadata
}

export interface MessageMetadata {
  tokens?: TokenMetrics
  latency?: number
  model?: string
  toolCalls?: ToolCall[]
  parentId?: string
  error?: ErrorInfo
}

export interface ErrorInfo {
  code: string
  message: string
  retryable: boolean
  retryCount?: number
}

export interface ToolCall {
  id: string
  name: string
  args: Record<string, unknown>
  result?: string
  status: 'pending' | 'running' | 'complete' | 'error'
}

export interface Session {
  id: string
  name: string
  created: number
  lastActive: number
  messageCount: number
  tags?: string[]
  archived?: boolean
  metadata?: SessionMetadata
}

export interface SessionMetadata {
  model?: string
  systemPrompt?: string
  totalTokens?: number
  totalCost?: number
}

export interface SystemMetrics {
  cpu: number
  memory: number
  gpu: number
  tokens: number
  latency: number
  fps: number
}

export interface TokenMetrics {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  tokensPerSecond: number
  estimatedCost: number
  timeToFirstToken?: number
}

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

export interface InferenceMetrics {
  modelName: string
  quantization: string
  contextLength: number
  timeToFirstToken: number
  tokensPerSecond: number
  totalInferenceTime: number
}

export interface TaskQueueItem {
  id: string
  type: 'command' | 'tool' | 'system'
  payload: unknown
  priority: number
  status: 'pending' | 'processing' | 'complete' | 'error' | 'retrying'
  retryCount: number
  maxRetries: number
  createdAt: number
  startedAt?: number
  completedAt?: number
  error?: ErrorInfo
}

export interface AgentState {
  id: string
  status: 'idle' | 'thinking' | 'executing' | 'waiting' | 'error'
  currentTask?: string
  context: AgentContext
}

export interface AgentContext {
  messages: Message[]
  tools: string[]
  memory: Map<string, unknown>
}

export interface StreamChunk {
  type: 'text' | 'tool_start' | 'tool_end' | 'error' | 'done'
  content: string
  metadata?: Record<string, unknown>
}

export interface SearchResult {
  sessionId: string
  messageId: string
  content: string
  score: number
  timestamp: number
}

export interface CommandHistoryEntry {
  command: string
  timestamp: number
  sessionId: string
}

export type ThemeMode = 'dark' | 'light' | 'system'

export interface AppConfig {
  theme: ThemeMode
  fontSize: number
  compactMode: boolean
  streamingSpeed: number
  maxHistoryItems: number
  autoSave: boolean
  soundEnabled: boolean
}
