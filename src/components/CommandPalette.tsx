import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Robot,
  ChartLine,
  Plus,
  Trash,
  Lightning,
  Copy,
  Download,
  ArrowsClockwise,
  MagnifyingGlass,
  Keyboard,
  FolderOpen,
  Archive,
  Terminal,
  Gear,
} from '@phosphor-icons/react'
import type { Session } from '@/lib/types'

interface CommandPaletteProps {
  sessions: Session[]
  activeSessionId: string
  onSessionSelect: (sessionId: string) => void
  onNewSession: () => void
  onDeleteSession: (sessionId: string) => void
  onNavigateToTerminal: () => void
  onNavigateToPerformance: () => void
}

export function CommandPalette({
  sessions,
  activeSessionId,
  onSessionSelect,
  onNewSession,
  onDeleteSession,
  onNavigateToTerminal,
  onNavigateToPerformance,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open])

  const handleCommand = (callback: () => void) => {
    setOpen(false)
    callback()
  }

  const handleCopySessionId = () => {
    if (activeSessionId) {
      navigator.clipboard.writeText(activeSessionId)
      toast.success('Session ID copied to clipboard')
      setOpen(false)
    }
  }

  const handleExportSession = async () => {
    if (activeSessionId) {
      try {
        const messages = await window.spark.kv.get(`starterm-messages-${activeSessionId}`)
        const session = sessions.find((s) => s.id === activeSessionId)

        const exportData = {
          session,
          messages,
          exportedAt: new Date().toISOString(),
          version: '1.0',
        }

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json',
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `starterm-session-${activeSessionId}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success('Session exported successfully')
      } catch (error) {
        toast.error('Failed to export session')
      }
      setOpen(false)
    }
  }

  const handleExportAllSessions = async () => {
    try {
      const allData: Record<string, unknown> = { sessions, exportedAt: new Date().toISOString() }

      for (const session of sessions) {
        const messages = await window.spark.kv.get(`starterm-messages-${session.id}`)
        allData[`messages-${session.id}`] = messages
      }

      const blob = new Blob([JSON.stringify(allData, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `starterm-export-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('All sessions exported')
    } catch (error) {
      toast.error('Failed to export sessions')
    }
    setOpen(false)
  }

  const handleClearAllSessions = async () => {
    try {
      const allKeys = await window.spark.kv.keys()
      const sessionKeys = allKeys.filter((key: string) => key.startsWith('starterm-'))

      for (const key of sessionKeys) {
        await window.spark.kv.delete(key)
      }

      toast.success('All data cleared')
      window.location.reload()
    } catch (error) {
      toast.error('Failed to clear data')
    }
    setOpen(false)
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => handleCommand(onNavigateToTerminal)}>
            <Robot className="mr-2" />
            <span>Go to Terminal</span>
            <span className="ml-auto text-xs text-muted-foreground font-mono">Alt+1</span>
          </CommandItem>
          <CommandItem onSelect={() => handleCommand(onNavigateToPerformance)}>
            <ChartLine className="mr-2" />
            <span>Go to Performance</span>
            <span className="ml-auto text-xs text-muted-foreground font-mono">Alt+2</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Session Actions">
          <CommandItem onSelect={() => handleCommand(onNewSession)}>
            <Plus className="mr-2" />
            <span>New Session</span>
            <span className="ml-auto text-xs text-muted-foreground font-mono">Ctrl+N</span>
          </CommandItem>
          <CommandItem onSelect={handleCopySessionId}>
            <Copy className="mr-2" />
            <span>Copy Session ID</span>
          </CommandItem>
          <CommandItem onSelect={handleExportSession}>
            <Download className="mr-2" />
            <span>Export Current Session</span>
          </CommandItem>
          <CommandItem onSelect={handleExportAllSessions}>
            <Archive className="mr-2" />
            <span>Export All Sessions</span>
          </CommandItem>
          {sessions.length > 1 && (
            <CommandItem
              onSelect={() =>
                activeSessionId && handleCommand(() => onDeleteSession(activeSessionId))
              }
            >
              <Trash className="mr-2" />
              <span>Delete Current Session</span>
            </CommandItem>
          )}
        </CommandGroup>

        {sessions.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Switch Session">
              {sessions.map((session) => (
                <CommandItem
                  key={session.id}
                  onSelect={() => handleCommand(() => onSessionSelect(session.id))}
                >
                  <FolderOpen className="mr-2" />
                  <span>{session.name}</span>
                  {session.id === activeSessionId && (
                    <Lightning className="ml-auto text-primary" size={14} weight="fill" />
                  )}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {session.messageCount} msgs
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />

        <CommandGroup heading="Help">
          <CommandItem onSelect={() => setOpen(false)}>
            <Keyboard className="mr-2" />
            <span>Keyboard Shortcuts</span>
            <span className="ml-auto text-xs text-muted-foreground font-mono">Esc</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="System">
          <CommandItem onSelect={handleClearAllSessions}>
            <ArrowsClockwise className="mr-2" />
            <span>Clear All Data & Restart</span>
          </CommandItem>
          <CommandItem onSelect={() => setOpen(false)}>
            <Gear className="mr-2" />
            <span>Close Command Palette</span>
            <span className="ml-auto text-xs text-muted-foreground font-mono">Esc</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
