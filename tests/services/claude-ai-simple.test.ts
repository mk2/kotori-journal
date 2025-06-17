import { describe, it, expect, vi } from 'vitest'
import { ClaudeAIService } from '../../src/services/claude-ai'

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ text: 'Test AI response' }],
        }),
      },
    })),
  }
})

describe('ClaudeAIService - Basic Tests', () => {
  it('should initialize with API key', () => {
    process.env.ANTHROPIC_API_KEY = 'test-api-key'
    expect(() => new ClaudeAIService()).not.toThrow()
  })

  it('should throw error without API key', () => {
    delete process.env.ANTHROPIC_API_KEY
    expect(() => new ClaudeAIService()).toThrow(
      'ANTHROPIC_API_KEY environment variable is required'
    )
  })

  it('should detect AI triggers correctly', () => {
    process.env.ANTHROPIC_API_KEY = 'test-api-key'
    const claudeAI = new ClaudeAIService()

    expect(claudeAI.isAITrigger('? How are you')).toBe(true)
    expect(claudeAI.isAITrigger('？ How are you')).toBe(true)
    expect(claudeAI.isAITrigger('要約して')).toBe(true)
    expect(claudeAI.isAITrigger('/? command')).toBe(false)
    expect(claudeAI.isAITrigger('regular text')).toBe(false)
  })
})
