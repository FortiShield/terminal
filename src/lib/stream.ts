import type { StreamChunk } from './types'

export class StreamProcessor {
  private buffer = ''
  private callbacks: Map<string, Set<(chunk: StreamChunk) => void>> = new Map()

  on(event: string, callback: (chunk: StreamChunk) => void): () => void {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, new Set())
    }
    this.callbacks.get(event)!.add(callback)
    return () => this.callbacks.get(event)?.delete(callback)
  }

  process(data: string): void {
    this.buffer += data
    this.flush()
  }

  private flush(): void {
    const lines = this.buffer.split('\n')
    this.buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.trim()) continue

      try {
        const chunk: StreamChunk = JSON.parse(line)
        this.emit(chunk.type, chunk)
      } catch {
        this.emit('text', { type: 'text', content: line })
      }
    }
  }

  private emit(event: string, chunk: StreamChunk): void {
    const handlers = this.callbacks.get(event)
    if (handlers) {
      handlers.forEach(handler => handler(chunk))
    }
    const allHandlers = this.callbacks.get('*')
    if (allHandlers) {
      allHandlers.forEach(handler => handler(chunk))
    }
  }

  reset(): void {
    this.buffer = ''
  }
}

export class TextStreamRenderer {
  private text = ''
  private renderedIndex = 0
  private animationFrame: number | null = null
  private speed: number

  constructor(speed: number = 30) {
    this.speed = speed
  }

  setText(text: string): void {
    this.text = text
    this.renderedIndex = 0
  }

  appendText(text: string): void {
    this.text += text
  }

  start(onRender: (text: string) => void): void {
    const tick = () => {
      if (this.renderedIndex < this.text.length) {
        this.renderedIndex = Math.min(this.renderedIndex + 3, this.text.length)
        onRender(this.text.slice(0, this.renderedIndex))
        this.animationFrame = requestAnimationFrame(tick)
      }
    }
    this.animationFrame = requestAnimationFrame(tick)
  }

  skip(onRender: (text: string) => void): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }
    this.renderedIndex = this.text.length
    onRender(this.text)
  }

  stop(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }
  }

  get isComplete(): boolean {
    return this.renderedIndex >= this.text.length
  }

  get currentText(): string {
    return this.text.slice(0, this.renderedIndex)
  }

  get fullText(): string {
    return this.text
  }
}

export function parseMarkdownBlocks(text: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = []
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      })
    }

    blocks.push({
      type: 'code',
      language: match[1] || 'text',
      content: match[2].trim(),
    })

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    blocks.push({
      type: 'text',
      content: text.slice(lastIndex),
    })
  }

  return blocks
}

export interface MarkdownBlock {
  type: 'text' | 'code'
  content: string
  language?: string
}

export function detectLanguage(code: string): string {
  const patterns: [RegExp, string][] = [
    [/^\s*(import|export|const|let|var|function|class|interface|type)\b/, 'typescript'],
    [/^\s*(def|class|import|from|if __name__|print\()/, 'python'],
    [/^\s*(fn |let |use |mod |pub |impl |struct |enum |trait )/, 'rust'],
    [/^\s*(package |import |func |type |var |const )/, 'go'],
    [/^\s*(#include|int |void |char |struct |printf)/, 'c'],
    [/^\s*(public |private |protected |class |interface |void |int )/, 'java'],
    [/^\s*(<!DOCTYPE|<html|<head|<body|<div|<span)/i, 'html'],
    [/^\s*(\.|#|@|body|html|div|margin|padding)/, 'css'],
    [/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)/i, 'sql'],
    [/^\s*({|\[)/, 'json'],
    [/^\s*(FROM|RUN|COPY|CMD|ENTRYPOINT|WORKDIR)/, 'dockerfile'],
    [/^\s*(---|\w+:)/, 'yaml'],
  ]

  for (const [pattern, lang] of patterns) {
    if (pattern.test(code)) return lang
  }

  return 'text'
}
