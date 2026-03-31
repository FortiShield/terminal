import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useKV } from '@github/spark/hooks'
import { Toaster, toast } from 'sonner'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AdvancedMetrics } from '@/components/AdvancedMetrics'
import { MessageCard } from '@/components/MessageCard'
import { CommandInput } from '@/components/CommandInput'
import { SessionSidebar } from '@/components/SessionSidebar'
import { CommandPalette } from '@/components/CommandPalette'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Robot, ChartLine, Lightning, Gear } from '@phosphor-icons/react'
import { eventBus, Events } from '@/lib/events'
import { searchEngine } from '@/lib/search'
import { TokenCounter, estimateTokenCount } from '@/lib/performance'
import { generateId } from '@/lib/utils'
import type { Message, Session, TokenMetrics } from '@/lib/types'

function App() {
  const [sessions, setSessions] = useKV<Session[]>('starterm-sessions', [])
  const [activeSessionId, setActiveSessionId] = useState<string>('')
  const [activeTab, setActiveTab] = useState<string>('terminal')
  const [messages, setMessages] = useState<Message[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [commandHistory, setCommandHistory] = useKV<string[]>('starterm-history', [])
  const scrollRef = useRef<HTMLDivElement>(null)
  const tokenCounter = useRef(new TokenCounter())

  const createNewSession = useCallback(() => {
    const currentSessions = sessions ?? []
    const newSession: Session = {
      id: generateId(),
      name: `Session ${currentSessions.length + 1}`,
      created: Date.now(),
      lastActive: Date.now(),
      messageCount: 0,
      metadata: {
        model: 'gpt-4o-mini',
        totalTokens: 0,
        totalCost: 0,
      },
    }
    setSessions((current) => [...(current ?? []), newSession])
    setActiveSessionId(newSession.id)
    setMessages([])
    eventBus.emit(Events.SESSION_CREATED, newSession)
    toast.success('New session created')
  }, [sessions, setSessions])

  const deleteSession = useCallback((sessionId: string) => {
    const currentSessions = sessions ?? []
    if (currentSessions.length === 1) {
      toast.error('Cannot delete the last session')
      return
    }

    setSessions((current) => (current ?? []).filter((s) => s.id !== sessionId))
    window.spark.kv.delete(`starterm-messages-${sessionId}`)
    searchEngine.removeFromSession(sessionId)

    if (activeSessionId === sessionId) {
      const remainingSessions = currentSessions.filter((s) => s.id !== sessionId)
      if (remainingSessions.length > 0) {
        setActiveSessionId(remainingSessions[0].id)
      }
    }

    eventBus.emit(Events.SESSION_DELETED, sessionId)
    toast.success('Session deleted')
  }, [sessions, setSessions, activeSessionId])

  const loadSessionMessages = useCallback(async (sessionId: string) => {
    try {
      const savedMessages = await window.spark.kv.get<Message[]>(`starterm-messages-${sessionId}`)
      const loadedMessages = savedMessages || []
      setMessages(loadedMessages)
      searchEngine.indexSession(sessionId, loadedMessages)
    } catch (error) {
      console.error('Failed to load session messages:', error)
      setMessages([])
    }
  }, [])

  const saveSessionMessages = useCallback(async (sessionId: string, msgs: Message[]) => {
    try {
      await window.spark.kv.set(`starterm-messages-${sessionId}`, msgs)
      setSessions((current) =>
        (current ?? []).map((s) =>
          s.id === sessionId
            ? {
                ...s,
                lastActive: Date.now(),
                messageCount: msgs.length,
                metadata: {
                  ...s.metadata,
                  totalTokens: msgs.reduce(
                    (sum, m) => sum + (m.metadata?.tokens?.totalTokens ?? 0),
                    0
                  ),
                  totalCost: msgs.reduce(
                    (sum, m) => sum + (m.metadata?.tokens?.estimatedCost ?? 0),
                    0
                  ),
                },
              }
            : s
        )
      )
    } catch (error) {
      console.error('Failed to save session messages:', error)
      toast.error('Failed to save messages')
    }
  }, [setSessions])

  const handleCommand = useCallback(async (command: string) => {
    if (isProcessing) {
      toast.warning('Processing previous command...')
      return
    }

    setCommandHistory((prev) => {
      const history = prev ?? []
      const filtered = history.filter((h) => h !== command)
      return [...filtered.slice(-99), command]
    })

    const inputTokens = estimateTokenCount(command)
    tokenCounter.current.startCounting(inputTokens)

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: command,
      timestamp: Date.now(),
      status: 'complete',
      metadata: {
        tokens: {
          inputTokens,
          outputTokens: 0,
          totalTokens: inputTokens,
          tokensPerSecond: 0,
          estimatedCost: 0,
        },
      },
    }

    const assistantMessage: Message = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: Date.now() + 1,
      status: 'streaming',
    }

    const newMessages = [...messages, userMessage, assistantMessage]
    setMessages(newMessages)
    setIsProcessing(true)

    eventBus.emit(Events.MESSAGE_SENT, userMessage)

    try {
      const systemPrompt = `You are StarTerm, a high-performance AI agent terminal assistant. You have expertise in systems programming, hardware acceleration, concurrent logic, and technical operations. Respond concisely and technically. Use markdown formatting for code blocks and structured content.`

      const conversationHistory = newMessages
        .filter((m) => m.role !== 'system' && m.status !== 'streaming')
        .slice(-10)
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n')

      const prompt = window.spark.llmPrompt`${systemPrompt}

Conversation History:
${conversationHistory}

User Query: ${command}`

      const response = await window.spark.llm(prompt, 'gpt-4o-mini')

      const tokenMetrics = tokenCounter.current.finishCounting()
      tokenCounter.current.incrementOutputTokens(estimateTokenCount(response))

      const updatedMessages = newMessages.map((msg) =>
        msg.id === assistantMessage.id
          ? {
              ...msg,
              content: response,
              status: 'complete' as const,
              metadata: {
                ...msg.metadata,
                tokens: tokenCounter.current.finishCounting(),
                latency: tokenMetrics.timeToFirstToken,
                model: 'gpt-4o-mini',
              },
            }
          : msg
      )

      setMessages(updatedMessages)
      await saveSessionMessages(activeSessionId, updatedMessages)

      searchEngine.indexMessage(activeSessionId, userMessage)
      const lastMsg = updatedMessages[updatedMessages.length - 1]
      if (lastMsg) searchEngine.indexMessage(activeSessionId, lastMsg)

      eventBus.emit(Events.MESSAGE_COMPLETE, lastMsg)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const errorMessages = newMessages.map((msg) =>
        msg.id === assistantMessage.id
          ? {
              ...msg,
              content: `Error: Failed to process command. ${errorMessage}`,
              status: 'error' as const,
              metadata: {
                ...msg.metadata,
                error: {
                  code: 'LLM_ERROR',
                  message: errorMessage,
                  retryable: true,
                },
              },
            }
          : msg
      )
      setMessages(errorMessages)
      eventBus.emit(Events.MESSAGE_ERROR, error)
      toast.error('Failed to process command')
    } finally {
      setIsProcessing(false)
    }
  }, [isProcessing, messages, activeSessionId, saveSessionMessages, setCommandHistory])

  const retryMessage = useCallback(async (messageId: string) => {
    const messageIndex = messages.findIndex((m) => m.id === messageId)
    if (messageIndex < 2) return

    const userMessage = messages[messageIndex - 1]
    if (userMessage?.role !== 'user') return

    const updatedMessages = messages.slice(0, messageIndex - 1)
    setMessages(updatedMessages)
    await handleCommand(userMessage.content)
  }, [messages, handleCommand])

  useEffect(() => {
    if ((sessions?.length ?? 0) === 0) {
      createNewSession()
    } else if (!activeSessionId && sessions && sessions.length > 0) {
      setActiveSessionId(sessions[0].id)
    }
  }, [])

  useEffect(() => {
    if (activeSessionId) {
      loadSessionMessages(activeSessionId)
      eventBus.emit(Events.SESSION_SWITCHED, activeSessionId)
    }
  }, [activeSessionId, loadSessionMessages])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [messages])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === '1') {
        e.preventDefault()
        setActiveTab('terminal')
      }
      if (e.altKey && e.key === '2') {
        e.preventDefault()
        setActiveTab('performance')
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        createNewSession()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [createNewSession])

  const hasMessages = messages.length > 0

  const activeSession = useMemo(
    () => sessions?.find((s) => s.id === activeSessionId),
    [sessions, activeSessionId]
  )

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground">
      <Toaster position="top-right" richColors closeButton />
      <CommandPalette
        sessions={sessions ?? []}
        activeSessionId={activeSessionId}
        onSessionSelect={setActiveSessionId}
        onNewSession={createNewSession}
        onDeleteSession={deleteSession}
        onNavigateToTerminal={() => setActiveTab('terminal')}
        onNavigateToPerformance={() => setActiveTab('performance')}
      />

      <div className="flex flex-1 overflow-hidden">
        <SessionSidebar
          sessions={sessions ?? []}
          activeSessionId={activeSessionId}
          onSessionSelect={setActiveSessionId}
          onNewSession={createNewSession}
          onDeleteSession={deleteSession}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="border-b border-border bg-card/30 px-4 flex items-center justify-between">
              <TabsList className="bg-transparent h-12">
                <TabsTrigger value="terminal" className="gap-2">
                  <Robot size={16} />
                  <span className="font-sans">Terminal</span>
                </TabsTrigger>
                <TabsTrigger value="performance" className="gap-2">
                  <ChartLine size={16} />
                  <span className="font-sans">Performance</span>
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-4">
                {activeSession && (
                  <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground font-mono">
                    <span>{activeSession.metadata?.model ?? 'gpt-4o-mini'}</span>
                    <span>•</span>
                    <span>{activeSession.messageCount} msgs</span>
                    {activeSession.metadata?.totalTokens != null && activeSession.metadata.totalTokens > 0 && (
                      <>
                        <span>•</span>
                        <Lightning size={12} className="text-primary" />
                        <span>{activeSession.metadata.totalTokens.toLocaleString()} tokens</span>
                      </>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <kbd className="px-2 py-1 bg-muted rounded border border-border">⌘K</kbd>
                  <span>Command Palette</span>
                </div>
              </div>
            </div>

            <TabsContent value="terminal" className="flex-1 flex flex-col overflow-hidden m-0">
              <AdvancedMetrics compact />

              <ScrollArea className="flex-1 p-6">
                <div ref={scrollRef} className="max-w-4xl mx-auto space-y-4">
                  {!hasMessages && (
                    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                      <Robot size={64} className="text-primary mb-4" weight="duotone" />
                      <h2 className="text-2xl font-bold mb-2">Welcome to StarTerm</h2>
                      <p className="text-muted-foreground mb-6 max-w-md font-sans">
                        A high-performance AI agent terminal inspired by systems programming
                        and hardware-accelerated computing.
                      </p>
                      <div className="grid gap-3 text-left max-w-md">
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-card/50 border border-border">
                          <span className="text-primary font-mono text-sm">→</span>
                          <div>
                            <p className="text-sm font-semibold">Technical Queries</p>
                            <p className="text-xs text-muted-foreground font-sans">
                              Ask about systems programming, algorithms, and architecture
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-card/50 border border-border">
                          <span className="text-primary font-mono text-sm">→</span>
                          <div>
                            <p className="text-sm font-semibold">Code Generation</p>
                            <p className="text-xs text-muted-foreground font-sans">
                              Get code examples in multiple languages with syntax highlighting
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-card/50 border border-border">
                          <span className="text-primary font-mono text-sm">→</span>
                          <div>
                            <p className="text-sm font-semibold">Performance Analysis</p>
                            <p className="text-xs text-muted-foreground font-sans">
                              Discuss optimization, concurrency, and hardware acceleration
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-6 flex flex-wrap gap-2 justify-center">
                        {[
                          'Explain Rust ownership',
                          'Optimize a sorting algorithm',
                          'Design a concurrent task queue',
                          'CUDA vs Metal performance',
                        ].map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => handleCommand(suggestion)}
                            className="px-3 py-1.5 text-xs font-mono bg-card border border-border rounded-md hover:bg-primary/10 hover:border-primary/40 transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((message) => (
                    <MessageCard
                      key={message.id}
                      message={message}
                      onRetry={message.status === 'error' ? () => retryMessage(message.id) : undefined}
                    />
                  ))}
                </div>
              </ScrollArea>

              <CommandInput
                onSubmit={handleCommand}
                disabled={isProcessing}
                history={commandHistory ?? []}
              />
            </TabsContent>

            <TabsContent value="performance" className="flex-1 overflow-auto p-6 m-0">
              <div className="max-w-6xl mx-auto space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">System Performance</h2>
                  <p className="text-muted-foreground font-sans mb-6">
                    Real-time monitoring of system resources, inference metrics, and computational performance.
                  </p>
                </div>

                <AdvancedMetrics />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="p-6 border border-border rounded-lg bg-card/50">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                      <ChartLine className="text-primary" />
                      Inference Stats
                    </h3>
                    <div className="space-y-3 font-sans text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Model</span>
                        <span className="font-mono font-semibold">{activeSession?.metadata?.model ?? 'gpt-4o-mini'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Context Window</span>
                        <span className="font-mono font-semibold">128K tokens</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Quantization</span>
                        <span className="font-mono font-semibold">INT8</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Backend</span>
                        <span className="font-mono font-semibold">OpenAI API</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 border border-border rounded-lg bg-card/50">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                      <Lightning className="text-accent" />
                      Runtime Config
                    </h3>
                    <div className="space-y-3 font-sans text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Concurrent Threads</span>
                        <span className="font-mono font-semibold">8</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Memory Pool</span>
                        <span className="font-mono font-semibold">4GB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SIMD Instructions</span>
                        <span className="font-mono font-semibold">AVX2</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">GPU Acceleration</span>
                        <span className="font-mono font-semibold">CUDA 12.1</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 border border-border rounded-lg bg-card/50">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                      <Gear className="text-primary" />
                      Session Stats
                    </h3>
                    <div className="space-y-3 font-sans text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Sessions</span>
                        <span className="font-mono font-semibold">{sessions?.length ?? 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current Messages</span>
                        <span className="font-mono font-semibold">{messages.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Tokens</span>
                        <span className="font-mono font-semibold">
                          {(activeSession?.metadata?.totalTokens ?? 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Est. Cost</span>
                        <span className="font-mono font-semibold">
                          ${(activeSession?.metadata?.totalCost ?? 0).toFixed(6)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 border border-border rounded-lg bg-card/50">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <ChartLine className="text-primary" />
                    Performance Timeline
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-muted-foreground w-20 font-sans">Render</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: '72%' }}
                        />
                      </div>
                      <span className="text-xs font-mono w-12 text-right">14ms</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-muted-foreground w-20 font-sans">Network</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full transition-all duration-300"
                          style={{ width: '45%' }}
                        />
                      </div>
                      <span className="text-xs font-mono w-12 text-right">89ms</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-muted-foreground w-20 font-sans">Inference</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/70 rounded-full transition-all duration-300"
                          style={{ width: '88%' }}
                        />
                      </div>
                      <span className="text-xs font-mono w-12 text-right">1.2s</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default App
