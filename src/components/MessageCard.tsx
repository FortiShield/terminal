import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Copy, User, Robot } from '@phosphor-icons/react'
import { toast } from 'sonner'
import type { Message } from '@/lib/types'
import { cn } from '@/lib/utils'
import { marked } from 'marked'
import { useEffect, useRef, useState } from 'react'

interface MessageCardProps {
  message: Message
}

export function MessageCard({ message }: MessageCardProps) {
  const [displayedContent, setDisplayedContent] = useState('')
  const isStreaming = message.status === 'streaming'
  const contentRef = useRef(message.content)

  useEffect(() => {
    contentRef.current = message.content
  }, [message.content])

  useEffect(() => {
    if (isStreaming) {
      let index = 0
      const interval = setInterval(() => {
        if (index < contentRef.current.length) {
          setDisplayedContent(contentRef.current.slice(0, index + 1))
          index++
        } else {
          clearInterval(interval)
        }
      }, 10)

      return () => clearInterval(interval)
    } else {
      setDisplayedContent(message.content)
    }
  }, [isStreaming, message.content])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    toast.success('Copied to clipboard')
  }

  const getStatusBadge = () => {
    switch (message.status) {
      case 'sending':
        return <Badge variant="outline" className="text-xs animate-pulse">Sending</Badge>
      case 'streaming':
        return <Badge variant="outline" className="text-xs text-primary">Streaming</Badge>
      case 'error':
        return <Badge variant="outline" className="text-xs text-destructive">Error</Badge>
      default:
        return null
    }
  }

  const renderContent = () => {
    if (message.role === 'user') {
      return <div className="text-card-foreground whitespace-pre-wrap break-words">{displayedContent}</div>
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
        'p-4 transition-all',
        message.status === 'streaming' && 'border-l-4 border-l-primary animate-stream',
        message.status === 'error' && 'border-l-4 border-l-destructive',
        message.role === 'user' ? 'bg-card/80' : 'bg-card/40'
      )}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          {message.role === 'user' ? (
            <User className="text-primary" weight="duotone" />
          ) : (
            <Robot className="text-accent" weight="duotone" />
          )}
          <span className="text-xs font-sans uppercase tracking-wider text-muted-foreground">
            {message.role === 'user' ? 'User' : 'Assistant'}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
          {getStatusBadge()}
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0"
          onClick={handleCopy}
        >
          <Copy />
        </Button>
      </div>
      <div className="text-sm leading-relaxed">
        {renderContent()}
      </div>
    </Card>
  )
}
