import type { Message, Session, SearchResult } from './types'

export class SearchEngine {
  private index: Map<string, SearchIndexEntry> = new Map()

  indexMessage(sessionId: string, message: Message): void {
    const key = `${sessionId}:${message.id}`
    const tokens = this.tokenize(message.content)
    this.index.set(key, {
      sessionId,
      messageId: message.id,
      content: message.content,
      tokens,
      timestamp: message.timestamp,
      role: message.role,
    })
  }

  indexSession(sessionId: string, messages: Message[]): void {
    for (const message of messages) {
      this.indexMessage(sessionId, message)
    }
  }

  search(query: string, limit: number = 20): SearchResult[] {
    const queryTokens = this.tokenize(query)
    if (queryTokens.length === 0) return []

    const results: SearchResult[] = []

    for (const [key, entry] of this.index) {
      const score = this.calculateScore(queryTokens, entry)
      if (score > 0) {
        results.push({
          sessionId: entry.sessionId,
          messageId: entry.messageId,
          content: this.highlightMatch(entry.content, query),
          score,
          timestamp: entry.timestamp,
        })
      }
    }

    results.sort((a, b) => b.score - a.score)
    return results.slice(0, limit)
  }

  removeFromSession(sessionId: string): void {
    for (const key of this.index.keys()) {
      if (key.startsWith(`${sessionId}:`)) {
        this.index.delete(key)
      }
    }
  }

  clear(): void {
    this.index.clear()
  }

  get size(): number {
    return this.index.size
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 2)
  }

  private calculateScore(queryTokens: string[], entry: SearchIndexEntry): number {
    let score = 0
    const entryTokens = entry.tokens

    for (const queryToken of queryTokens) {
      for (const entryToken of entryTokens) {
        if (entryToken === queryToken) {
          score += 10
        } else if (entryToken.includes(queryToken)) {
          score += 5
        } else if (queryToken.includes(entryToken)) {
          score += 3
        }
      }
    }

    const recencyBonus = Math.max(0, 1 - (Date.now() - entry.timestamp) / (30 * 24 * 60 * 60 * 1000))
    score *= (1 + recencyBonus)

    return score
  }

  private highlightMatch(content: string, query: string): string {
    const maxLength = 200
    const lowerContent = content.toLowerCase()
    const lowerQuery = query.toLowerCase()
    const index = lowerContent.indexOf(lowerQuery)

    if (index === -1) {
      return content.slice(0, maxLength) + (content.length > maxLength ? '...' : '')
    }

    const start = Math.max(0, index - 50)
    const end = Math.min(content.length, index + query.length + 150)
    let snippet = content.slice(start, end)

    if (start > 0) snippet = '...' + snippet
    if (end < content.length) snippet += '...'

    return snippet
  }
}

interface SearchIndexEntry {
  sessionId: string
  messageId: string
  content: string
  tokens: string[]
  timestamp: number
  role: string
}

export const searchEngine = new SearchEngine()
