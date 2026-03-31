import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Terminal, Plus, Trash, Clock } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
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
  collapsed = false,
}: SessionSidebarProps) {
  const sortedSessions = [...sessions].sort((a, b) => b.lastActive - a.lastActive)

  return (
    <div
      className={cn(
        'flex flex-col border-r border-border bg-card/30 transition-all duration-300',
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
      </div>

      {!collapsed && (
        <>
          <div className="p-3">
            <Button onClick={onNewSession} className="w-full gap-2" size="sm">
              <Plus weight="bold" />
              New Session
            </Button>
          </div>

          <Separator />

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {sortedSessions.length === 0 && (
                <div className="p-4 text-center text-sm text-muted-foreground font-sans">
                  No sessions yet
                </div>
              )}
              {sortedSessions.map((session) => (
                <div
                  key={session.id}
                  className={cn(
                    'group relative flex items-start gap-2 p-3 rounded-md cursor-pointer transition-colors',
                    activeSessionId === session.id
                      ? 'bg-primary/20 border border-primary/40'
                      : 'hover:bg-muted'
                  )}
                  onClick={() => onSessionSelect(session.id)}
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{session.name}</h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground font-sans">
                      <Clock size={12} />
                      <span>{new Date(session.lastActive).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{session.messageCount} msgs</span>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteSession(session.id)
                    }}
                  >
                    <Trash size={14} className="text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  )
}
