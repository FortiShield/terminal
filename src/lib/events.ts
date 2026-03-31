type EventHandler = (...args: unknown[]) => void

export class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map()
  private onceHandlers: Map<string, Set<EventHandler>> = new Map()

  on(event: string, handler: EventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler)

    return () => this.off(event, handler)
  }

  once(event: string, handler: EventHandler): () => void {
    if (!this.onceHandlers.has(event)) {
      this.onceHandlers.set(event, new Set())
    }
    this.onceHandlers.get(event)!.add(handler)

    return () => {
      this.onceHandlers.get(event)?.delete(handler)
    }
  }

  off(event: string, handler: EventHandler): void {
    this.handlers.get(event)?.delete(handler)
    this.onceHandlers.get(event)?.delete(handler)
  }

  emit(event: string, ...args: unknown[]): void {
    const handlers = this.handlers.get(event)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args)
        } catch (e) {
          console.error(`EventBus handler error for "${event}":`, e)
        }
      })
    }

    const onceHandlers = this.onceHandlers.get(event)
    if (onceHandlers) {
      onceHandlers.forEach(handler => {
        try {
          handler(...args)
        } catch (e) {
          console.error(`EventBus once handler error for "${event}":`, e)
        }
      })
      onceHandlers.clear()
    }
  }

  clear(event?: string): void {
    if (event) {
      this.handlers.delete(event)
      this.onceHandlers.delete(event)
    } else {
      this.handlers.clear()
      this.onceHandlers.clear()
    }
  }

  listenerCount(event: string): number {
    return (this.handlers.get(event)?.size ?? 0) + (this.onceHandlers.get(event)?.size ?? 0)
  }
}

export const eventBus = new EventBus()

export const Events = {
  SESSION_CREATED: 'session:created',
  SESSION_DELETED: 'session:deleted',
  SESSION_SWITCHED: 'session:switched',
  MESSAGE_SENT: 'message:sent',
  MESSAGE_RECEIVED: 'message:received',
  MESSAGE_STREAMING: 'message:streaming',
  MESSAGE_COMPLETE: 'message:complete',
  MESSAGE_ERROR: 'message:error',
  METRICS_UPDATED: 'metrics:updated',
  COMMAND_EXECUTED: 'command:executed',
  TOOL_CALLED: 'tool:called',
  TOOL_COMPLETED: 'tool:completed',
  ERROR_OCCURRED: 'error:occurred',
  STATE_CHANGED: 'state:changed',
} as const
