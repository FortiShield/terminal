import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Terminal,
  Plus,
  Trash,
  Clock,
  Archive,
  MagnifyingGlass,
  Lightning,
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useState, useMemo } from 'react'
import type { Session } from '@/lib/types'

interface SessionSidebarProps {
  sessions: Session[]
  activeSessionId: string
  onSessionSelect: (sessionId: string) => void
  onNewSession: () => void
  onDeleteSession: (sessionId: string) => void
  collapsed?: boolean
}

export function SessionSidebar({
  sessions,
  activeSessionId,
  onSessionSelect,
  onNewSession,
  onDeleteSession,
}: SessionSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  const filteredSessions = useMemo(() => {
    let result = [...sessions].sort((a, b) => b.lastActive - a.lastActive)

    if (!showArchived) {
      result = result.filter((s) => !s.archived)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter((s) => s.name.toLowerCase().includes(query))
    }

    return result
  }, [sessions, searchQuery, showArchived])

  const activeSession = sessions.find((s) => s.id === activeSessionId)

  const formatRelativeTime = (timestamp: number): string => {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return new Date(timestamp).toLocaleDateString()
  }

  return (
    <div
      className={cn(
        'flex flex-col border-r border-border bg-card/30 transition-all duration-300 relative',
        collapsed ? 'w-12' : 'w-64'
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Terminal size={24} className="text-primary" weight="duotone" />
            <h2 className="font-bold text-lg tracking-tight">StarTerm</h2>
          </div>
        )}
        {collapsed && <Terminal size={24} className="text-primary mx-auto" weight="duotone" />}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <CaretRight size={14} /> : <CaretLeft size={14} />}
        </Button>
      </div>

      {!collapsed && (
        <>
          <div className="p-3 space-y-2">
            <Button onClick={onNewSession} className="w-full gap-2" size="sm">
              <Plus weight="bold" />
              New Session
            </Button>

            <div className="relative">
              <MagnifyingGlass
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Search sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary font-sans"
              />
            </div>
          </div>

          <Separator />

          {activeSession && (
            <div className="px-3 py-2 border-b border-border bg-primary/5">
              <div className="text-xs font-sans text-muted-foreground uppercase tracking-wider mb-1">
                Active Session
              </div>
              <div className="flex items-center gap-2">
                <Lightning size={12} className="text-primary" weight="fill" />
                <span className="text-sm font-semibold truncate">{activeSession.name}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground font-mono">
                  {activeSession.messageCount} msgs
                </span>
                {activeSession.metadata?.totalTokens != null && activeSession.metadata.totalTokens > 0 && (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {activeSession.metadata.totalTokens.toLocaleString()} tokens
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs font-sans text-muted-foreground uppercase tracking-wider">
              Sessions ({filteredSessions.length})
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowArchived(!showArchived)}
              title={showArchived ? 'Hide archived' : 'Show archived'}
            >
              <Archive
                size={12}
                className={cn(
                  'transition-colors',
                  showArchived ? 'text-primary' : 'text-muted-foreground'
                )}
              />
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {filteredSessions.length === 0 && (
                <div className="p-4 text-center text-sm text-muted-foreground font-sans">
                  {searchQuery ? 'No matching sessions' : 'No sessions yet'}
                </div>
              )}
              {filteredSessions.map((session) => (
                <div
                  key={session.id}
                  className={cn(
                    'group relative flex items-start gap-2 p-3 rounded-md cursor-pointer transition-all duration-150',
                    activeSessionId === session.id
                      ? 'bg-primary/15 border border-primary/30 shadow-sm'
                      : 'hover:bg-muted/80 border border-transparent'
                  )}
                  onClick={() => onSessionSelect(session.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm truncate">{session.name}</h3>
                      {session.archived && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          Archived
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground font-sans">
                      <Clock size={10} />
                      <span>{formatRelativeTime(session.lastActive)}</span>
                      <span>·</span>
                      <span>{session.messageCount} msgs</span>
                    </div>
                    {session.metadata?.model && (
                      <div className="mt-1">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {session.metadata.model}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteSession(session.id)
                    }}
                  >
                    <Trash size={12} className="text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </>
      )}

      {collapsed && (
        <div className="flex flex-col items-center gap-2 p-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onNewSession}
            title="New Session"
          >
            <Plus size={16} weight="bold" />
          </Button>
          {filteredSessions.slice(0, 8).map((session) => (
            <Button
              key={session.id}
              variant={activeSessionId === session.id ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8 text-xs"
              onClick={() => onSessionSelect(session.id)}
              title={session.name}
            >
              {session.name.replace('Session ', 'S')}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
