import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Copy, User, Robot, ArrowsClockwise } from '@phosphor-icons/react'
import { toast } from 'sonner'
import type { Message } from '@/lib/types'
import { cn } from '@/lib/utils'
import { marked } from 'marked'
import { useEffect, useRef, useState, useMemo } from 'react'

interface MessageCardProps {
  message: Message
  onRetry?: () => void
}

export function MessageCard({ message, onRetry }: MessageCardProps) {
  const [displayedContent, setDisplayedContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(message.status === 'streaming')
  const contentRef = useRef(message.content)
  const streamIndexRef = useRef(0)

  useEffect(() => {
    contentRef.current = message.content
    if (message.status !== 'streaming') {
      setIsStreaming(false)
      setDisplayedContent(message.content)
    }
  }, [message.content, message.status])

  useEffect(() => {
    if (message.status === 'streaming' && message.content) {
      setIsStreaming(true)
      const targetLength = message.content.length
      const interval = setInterval(() => {
        if (streamIndexRef.current < targetLength) {
          streamIndexRef.current = Math.min(streamIndexRef.current + 4, targetLength)
          setDisplayedContent(message.content.slice(0, streamIndexRef.current))
        } else {
          clearInterval(interval)
          setIsStreaming(false)
        }
      }, 16)

      return () => clearInterval(interval)
    } else {
      setDisplayedContent(message.content)
      streamIndexRef.current = message.content.length
    }
  }, [message.status, message.content])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      toast.success('Copied to clipboard')
    } catch {
      toast.error('Failed to copy')
    }
  }

  const getStatusBadge = () => {
    switch (message.status) {
      case 'sending':
        return <Badge variant="outline" className="text-xs animate-pulse">Sending</Badge>
      case 'streaming':
        return <Badge variant="outline" className="text-xs text-primary">Streaming</Badge>
      case 'error':
        return <Badge variant="outline" className="text-xs text-destructive">Error</Badge>
      case 'queued':
        return <Badge variant="outline" className="text-xs text-muted-foreground">Queued</Badge>
      default:
        return null
    }
  }

  const renderContent = () => {
    if (message.role === 'user') {
      return <div className="text-card-foreground whitespace-pre-wrap break-words">{displayedContent}</div>
    }

    if (!displayedContent) {
      return (
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-xs font-sans">Processing...</span>
        </div>
      )
    }

    const html = marked.parse(displayedContent, { async: false }) as string
    return (
      <div
        className="prose prose-invert prose-sm max-w-none prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-code:text-primary"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  }

  return (
    <Card
      className={cn(
        'p-4 transition-all duration-200',
        message.status === 'streaming' && 'border-l-4 border-l-primary animate-stream',
        message.status === 'error' && 'border-l-4 border-l-destructive',
        message.role === 'user' ? 'bg-card/80' : 'bg-card/40'
      )}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {message.role === 'user' ? (
            <User className="text-primary shrink-0" weight="duotone" />
          ) : (
            <Robot className="text-accent shrink-0" weight="duotone" />
          )}
          <span className="text-xs font-sans uppercase tracking-wider text-muted-foreground">
            {message.role === 'user' ? 'User' : 'Assistant'}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
          {getStatusBadge()}
          {message.metadata?.tokens && message.metadata.tokens.tokensPerSecond > 0 && (
            <Badge variant="outline" className="text-xs gap-1">
              <span className="text-primary">{message.metadata.tokens.tokensPerSecond.toFixed(1)}t/s</span>
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onRetry && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={onRetry}
              title="Retry"
            >
              <ArrowsClockwise size={14} />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={handleCopy}
            title="Copy"
          >
            <Copy size={14} />
          </Button>
        </div>
      </div>
      <div className="text-sm leading-relaxed">
        {renderContent()}
      </div>
    </Card>
  )
}
