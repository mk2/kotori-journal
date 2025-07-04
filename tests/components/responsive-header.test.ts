import { describe, it, expect } from 'vitest'
import { generateHeaderText, combineHeaderText } from '../../src/utils/responsive-header'

describe('Responsive Header', () => {
  describe('generateHeaderText', () => {
    it('should return compact text for narrow screens (under 60 characters)', () => {
      const result = generateHeaderText(50, true, true)

      expect(result.helpText).toBe('Enter送信 | Tab切替 | Esc メニュー')
      expect(result.helpText.length).toBeLessThan(50)
    })

    it('should return medium text for medium screens (60-100 characters)', () => {
      const result = generateHeaderText(80, true, true)

      expect(result.helpText).toContain('Enter で送信')
      expect(result.helpText).toContain('Tab でカテゴリ切替')
      expect(result.helpText).toContain('Esc でメニュー')
      expect(result.helpText.length).toBeLessThan(80)
    })

    it('should return full text for wide screens (over 100 characters)', () => {
      const result = generateHeaderText(150, true, true)

      expect(result.helpText).toContain('Enter で送信')
      expect(result.helpText).toContain('Ctrl+J で改行')
      expect(result.helpText).toContain('Tab でカテゴリ切替')
      expect(result.helpText).toContain('Esc でメニュー')
      expect(result.helpText).toContain('Ctrl+F で検索')
      expect(result.helpText).toContain('/ でコマンド')
      expect(result.helpText).toContain('Ctrl+D で終了')
    })

    it('should include AI features text when AI is available', () => {
      const result = generateHeaderText(150, true, true)

      expect(result.aiText).toContain('AI利用可能')
      expect(result.aiText).toContain('/? 質問')
      expect(result.aiText).toContain('/summary')
      expect(result.aiText).toContain('/advice')
    })

    it('should include plugin system text when plugins are available', () => {
      const result = generateHeaderText(150, true, true)

      expect(result.pluginText).toContain('プラグインシステム利用可能')
    })

    it('should omit AI text when AI is not available', () => {
      const result = generateHeaderText(150, false, true)

      expect(result.aiText).toBe('')
    })

    it('should omit plugin text when plugins are not available', () => {
      const result = generateHeaderText(150, true, false)

      expect(result.pluginText).toBe('')
    })

    it('should handle very narrow screens gracefully', () => {
      const result = generateHeaderText(20, true, true)

      expect(result.helpText).toBe('Enter送信')
      expect(result.helpText.length).toBeLessThan(20)
    })

    it('should adapt AI and plugin text for narrow screens', () => {
      const result = generateHeaderText(50, true, true)

      expect(result.aiText).toBe('AI可')
      expect(result.pluginText).toBe('プラグイン可')
    })
  })

  describe('combineHeaderText', () => {
    it('should combine header texts without truncation when no maxWidth is provided', () => {
      const headerTexts = {
        helpText: 'Enter で送信',
        aiText: 'AI利用可能',
        pluginText: 'プラグインシステム利用可能',
      }

      const result = combineHeaderText(headerTexts)

      expect(result).toBe('Kotori - Enter で送信 | AI利用可能 | プラグインシステム利用可能')
    })

    it('should combine header texts without AI and plugin text when they are empty', () => {
      const headerTexts = {
        helpText: 'Enter で送信',
        aiText: '',
        pluginText: '',
      }

      const result = combineHeaderText(headerTexts)

      expect(result).toBe('Kotori - Enter で送信')
    })

    it('should truncate text when it exceeds maxWidth', () => {
      const headerTexts = {
        helpText: 'Enter で送信 | Ctrl+J で改行 | Tab でカテゴリ切替',
        aiText: 'AI利用可能(/? 質問, /summary, /advice)',
        pluginText: 'プラグインシステム利用可能',
      }

      const result = combineHeaderText(headerTexts, 50)

      expect(result.length).toBeLessThanOrEqual(50)
      expect(result).toContain('Kotori')
      expect(result).toMatch(/\.\.\.$/) // should end with "..."
    })

    it('should not truncate when text is within maxWidth', () => {
      const headerTexts = {
        helpText: 'Enter送信',
        aiText: 'AI可',
        pluginText: '',
      }

      const result = combineHeaderText(headerTexts, 50)

      expect(result).toBe('Kotori - Enter送信 | AI可')
      expect(result.length).toBeLessThan(50)
      expect(result).not.toContain('...')
    })

    it('should handle very short maxWidth gracefully', () => {
      const headerTexts = {
        helpText: 'Enter で送信',
        aiText: 'AI利用可能',
        pluginText: 'プラグインシステム利用可能',
      }

      const result = combineHeaderText(headerTexts, 10)

      expect(result.length).toBeLessThanOrEqual(10)
      expect(result).toMatch(/\.\.\.$/) // should end with "..."
    })
  })
})
