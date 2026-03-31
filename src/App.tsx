import { useState, useEffect, useRef } from 'react'
import { useKV } from '@github/spark/hooks'
import { Toaster, toast } from 'sonner'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MetricsDisplay } from '@/components/MetricsDisplay'
import { MessageCard } from '@/components/MessageCard'
import { CommandInput } from '@/components/CommandInput'
import { SessionSidebar } from '@/components/SessionSidebar'
import { Button } from '@/components/ui/button'
import { Robot } from '@phosphor-icons/react'
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
          <MetricsDisplay />

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
        </div>
      </div>
    </div>
  )
}

export default App