import { generateId } from './utils'
import type { TaskQueueItem, ErrorInfo } from './types'

type TaskHandler = (task: TaskQueueItem) => Promise<unknown>

export class TaskQueue {
  private queue: TaskQueueItem[] = []
  private processing = false
  private handlers: Map<string, TaskHandler> = new Map()
  private concurrency: number
  private activeTasks = 0

  constructor(concurrency: number = 1) {
    this.concurrency = concurrency
  }

  registerHandler(type: string, handler: TaskHandler): void {
    this.handlers.set(type, handler)
  }

  enqueue(type: TaskQueueItem['type'], payload: unknown, priority: number = 0): string {
    const task: TaskQueueItem = {
      id: generateId(),
      type,
      payload,
      priority,
      status: 'pending',
      retryCount: 0,
      maxRetries: 3,
      createdAt: Date.now(),
    }

    this.queue.push(task)
    this.queue.sort((a, b) => b.priority - a.priority)
    this.process()

    return task.id
  }

  private async process(): Promise<void> {
    if (this.activeTasks >= this.concurrency) return

    const pendingTask = this.queue.find(t => t.status === 'pending')
    if (!pendingTask) return

    pendingTask.status = 'processing'
    pendingTask.startedAt = Date.now()
    this.activeTasks++

    const handler = this.handlers.get(pendingTask.type)
    if (!handler) {
      pendingTask.status = 'error'
      pendingTask.error = {
        code: 'NO_HANDLER',
        message: `No handler registered for type: ${pendingTask.type}`,
        retryable: false,
      }
      this.activeTasks--
      this.process()
      return
    }

    try {
      await handler(pendingTask)
      pendingTask.status = 'complete'
      pendingTask.completedAt = Date.now()
    } catch (error) {
      pendingTask.retryCount++
      if (pendingTask.retryCount < pendingTask.maxRetries) {
        pendingTask.status = 'retrying'
        setTimeout(() => {
          pendingTask.status = 'pending'
          this.process()
        }, 1000 * pendingTask.retryCount)
      } else {
        pendingTask.status = 'error'
        pendingTask.error = {
          code: 'EXECUTION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: false,
          retryCount: pendingTask.retryCount,
        }
      }
    } finally {
      this.activeTasks--
      this.process()
    }
  }

  getTask(id: string): TaskQueueItem | undefined {
    return this.queue.find(t => t.id === id)
  }

  getPendingTasks(): TaskQueueItem[] {
    return this.queue.filter(t => t.status === 'pending' || t.status === 'retrying')
  }

  getCompletedTasks(): TaskQueueItem[] {
    return this.queue.filter(t => t.status === 'complete')
  }

  getFailedTasks(): TaskQueueItem[] {
    return this.queue.filter(t => t.status === 'error')
  }

  clear(): void {
    this.queue = this.queue.filter(t => t.status === 'processing')
  }

  get size(): number {
    return this.queue.length
  }

  get isProcessing(): boolean {
    return this.activeTasks > 0
  }
}

export const taskQueue = new TaskQueue(3)
