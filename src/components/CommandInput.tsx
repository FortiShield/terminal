import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { ArrowUp } from '@phosphor-icons/react'
import { useState, KeyboardEvent, useRef, useEffect } from 'react'

interface CommandInputProps {
  onSubmit: (command: string) => void
  disabled?: boolean
}

export function CommandInput({ onSubmit, disabled }: CommandInputProps) {
  const [input, setInput] = useState('')
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  const handleSubmit = () => {
    if (input.trim() && !disabled) {
      setCommandHistory((prev) => [...prev, input])
      setHistoryIndex(-1)
      onSubmit(input.trim())
      setInput('')
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'ArrowUp' && !e.shiftKey && input === '' && commandHistory.length > 0) {
      e.preventDefault()
      const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex
      setHistoryIndex(newIndex)
      setInput(commandHistory[commandHistory.length - 1 - newIndex])
    } else if (e.key === 'ArrowDown' && !e.shiftKey && historyIndex >= 0) {
      e.preventDefault()
      const newIndex = historyIndex > 0 ? historyIndex - 1 : -1
      setHistoryIndex(newIndex)
      setInput(newIndex >= 0 ? commandHistory[commandHistory.length - 1 - newIndex] : '')
    }
  }

  return (
    <div className="border-t border-border bg-card p-4">
      <div className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          id="command-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter command or query..."
          className="min-h-[60px] max-h-[200px] resize-none font-mono text-sm"
          disabled={disabled}
        />
        <Button
          onClick={handleSubmit}
          disabled={!input.trim() || disabled}
          size="icon"
          className="h-[60px] w-[60px] shrink-0"
        >
          <ArrowUp size={24} weight="bold" />
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground font-sans">
        Press Enter to send, Shift+Enter for new line, ↑↓ for command history
      </p>
    </div>
  )
}
