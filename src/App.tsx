import { useState, useEffect, useRef } from 'react'
import { useKV } from '@github/spark/hooks'
import { Toaster, toast } from 'sonner'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AdvancedMetrics } from '@/components/AdvancedMetrics'
import { MessageCard } from '@/components/MessageCard'
import { CommandInput } from '@/components/CommandInput'
import { SessionSidebar } from '@/components/SessionSidebar'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Robot, ChartLine, Lightning } from '@phosphor-icons/react'
import type { Message, Session } from '@/lib/types'

function App() {
  const [sessions, setSessions] = useKV<Session[]>('starterm-sessions', [])
  const [activeSessionId, setActiveSessionId] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

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
    }
  }, [activeSessionId])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const createNewSession = () => {
    const currentSessions = sessions ?? []
    const newSession: Session = {
      id: Date.now().toString(),
      name: `Session ${currentSessions.length + 1}`,
      created: Date.now(),
      lastActive: Date.now(),
      messageCount: 0,
    }
    setSessions((current) => [...(current ?? []), newSession])
    setActiveSessionId(newSession.id)
    setMessages([])
  }

  const deleteSession = (sessionId: string) => {
    const currentSessions = sessions ?? []
    if (currentSessions.length === 1) {
      toast.error('Cannot delete the last session')
      return
    }
    setSessions((current) => (current ?? []).filter((s) => s.id !== sessionId))
    window.spark.kv.delete(`starterm-messages-${sessionId}`)
    if (activeSessionId === sessionId) {
      const remainingSessions = currentSessions.filter((s) => s.id !== sessionId)
      if (remainingSessions.length > 0) {
        setActiveSessionId(remainingSessions[0].id)
      }
    }
    toast.success('Session deleted')
  }

  const loadSessionMessages = async (sessionId: string) => {
    const savedMessages = await window.spark.kv.get<Message[]>(`starterm-messages-${sessionId}`)
    setMessages(savedMessages || [])
  }

  const saveSessionMessages = async (sessionId: string, msgs: Message[]) => {
    await window.spark.kv.set(`starterm-messages-${sessionId}`, msgs)
    setSessions((current) =>
      (current ?? []).map((s) =>
        s.id === sessionId
          ? { ...s, lastActive: Date.now(), messageCount: msgs.length }
          : s
      )
    )
  }

  const handleCommand = async (command: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: command,
      timestamp: Date.now(),
      status: 'complete',
    }

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: Date.now() + 1,
      status: 'streaming',
    }

    const newMessages = [...messages, userMessage, assistantMessage]
    setMessages(newMessages)
    setIsProcessing(true)

    try {
      const prompt = window.spark.llmPrompt`You are StarTerm, a high-performance AI agent terminal assistant. You have expertise in systems programming, hardware acceleration, concurrent logic, and technical operations. Respond to the following user query in a helpful, technical, and precise manner. Use markdown formatting for code blocks and structured content.

User Query: ${command}`

      const response = await window.spark.llm(prompt, 'gpt-4o-mini')

      const updatedMessages = newMessages.map((msg) =>
        msg.id === assistantMessage.id
          ? { ...msg, content: response, status: 'complete' as const }
          : msg
      )

      setMessages(updatedMessages)
      await saveSessionMessages(activeSessionId, updatedMessages)
    } catch (error) {
      const errorMessages = newMessages.map((msg) =>
        msg.id === assistantMessage.id
          ? {
              ...msg,
              content: 'Error: Failed to process command. Please try again.',
              status: 'error' as const,
            }
          : msg
      )
      setMessages(errorMessages)
      toast.error('Failed to process command')
    } finally {
      setIsProcessing(false)
    }
  }

  const hasMessages = messages.length > 0

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background text-foreground">
      <Toaster position="top-right" />
      
      <div className="flex flex-1 overflow-hidden">
        <SessionSidebar
          sessions={sessions ?? []}
          activeSessionId={activeSessionId}
          onSessionSelect={setActiveSessionId}
          onNewSession={createNewSession}
          onDeleteSession={deleteSession}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs defaultValue="terminal" className="flex-1 flex flex-col overflow-hidden">
            <div className="border-b border-border bg-card/30 px-4">
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
                      <div className="grid gap-2 text-left max-w-md">
                        <p className="text-sm text-muted-foreground font-sans">
                          <span className="text-primary font-mono">→</span> Ask technical questions
                        </p>
                        <p className="text-sm text-muted-foreground font-sans">
                          <span className="text-primary font-mono">→</span> Get code examples
                        </p>
                        <p className="text-sm text-muted-foreground font-sans">
                          <span className="text-primary font-mono">→</span> Discuss architecture and systems
                        </p>
                      </div>
                    </div>
                  )}

                  {messages.map((message) => (
                    <MessageCard key={message.id} message={message} />
                  ))}
                </div>
              </ScrollArea>

              <CommandInput onSubmit={handleCommand} disabled={isProcessing} />
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 border border-border rounded-lg bg-card/50">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                      <ChartLine className="text-primary" />
                      Inference Stats
                    </h3>
                    <div className="space-y-3 font-sans text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Model</span>
                        <span className="font-mono font-semibold">gpt-4o-mini</span>
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