import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { ArrowUp, CaretUp, CaretDown } from '@phosphor-icons/react'
import { useState, KeyboardEvent, useRef, useEffect, useCallback } from 'react'

interface CommandInputProps {
  onSubmit: (command: string) => void
  disabled?: boolean
  history?: string[]
}

export function CommandInput({ onSubmit, disabled, history = [] }: CommandInputProps) {
  const [input, setInput] = useState('')
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [localHistory, setLocalHistory] = useState<string[]>(history)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setLocalHistory(history)
  }, [history])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  const focusInput = useCallback(() => {
    textareaRef.current?.focus()
  }, [])

  const handleSubmit = () => {
    if (input.trim() && !disabled) {
      setLocalHistory((prev) => [...prev, input.trim()])
      setHistoryIndex(-1)
      onSubmit(input.trim())
      setInput('')
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto'
        }
      })
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'ArrowUp' && !e.shiftKey && input === '' && localHistory.length > 0) {
      e.preventDefault()
      const newIndex = Math.min(historyIndex + 1, localHistory.length - 1)
      setHistoryIndex(newIndex)
      setInput(localHistory[localHistory.length - 1 - newIndex])
    } else if (e.key === 'ArrowDown' && !e.shiftKey && historyIndex >= 0) {
      e.preventDefault()
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setInput(newIndex >= 0 ? localHistory[localHistory.length - 1 - newIndex] : '')
    } else if (e.key === 'Escape') {
      setInput('')
      setHistoryIndex(-1)
    }
  }

  return (
    <div className="border-t border-border bg-card/80 backdrop-blur-sm p-4">
      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            id="command-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter command or query..."
            className="min-h-[56px] max-h-[200px] resize-none font-mono text-sm pr-10"
            disabled={disabled}
          />
          {localHistory.length > 0 && (
            <div className="absolute right-2 bottom-2 flex flex-col gap-0.5">
              <button
                onClick={() => {
                  const newIndex = Math.min(historyIndex + 1, localHistory.length - 1)
                  setHistoryIndex(newIndex)
                  setInput(localHistory[localHistory.length - 1 - newIndex])
                }}
                className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                <CaretUp size={12} />
              </button>
              <button
                onClick={() => {
                  const newIndex = historyIndex - 1
                  setHistoryIndex(newIndex)
                  setInput(newIndex >= 0 ? localHistory[localHistory.length - 1 - newIndex] : '')
                }}
                className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                <CaretDown size={12} />
              </button>
            </div>
          )}
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!input.trim() || disabled}
          size="icon"
          className="h-[56px] w-[56px] shrink-0 transition-all"
        >
          <ArrowUp size={24} weight="bold" />
        </Button>
      </div>
      <div className="flex items-center justify-between mt-2 max-w-4xl mx-auto">
        <p className="text-xs text-muted-foreground font-sans">
          <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Enter</kbd> send
          <span className="mx-1.5">·</span>
          <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Shift+Enter</kbd> newline
          <span className="mx-1.5">·</span>
          <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd> history
        </p>
        {disabled && (
          <span className="text-xs text-primary animate-pulse font-sans">Processing...</span>
        )}
      </div>
    </div>
  )
}
