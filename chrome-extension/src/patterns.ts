import type { ContentPattern } from './types/content-processing'

class PatternManager {
  private patterns: ContentPattern[] = []
  private editingPatternId: string | null = null

  constructor() {
    this.init()
  }

  private async init(): Promise<void> {
    await this.loadPatterns()
    this.renderPatterns()
  }

  private async loadPatterns(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'get-patterns' })
      this.patterns = response.patterns || []
      console.log('[PatternManager] Loaded patterns:', this.patterns.length)
    } catch (error) {
      console.error('[PatternManager] Failed to load patterns:', error)
      this.showStatus('パターンの読み込みに失敗しました', 'error')
      this.patterns = []
    }
  }

  private renderPatterns(): void {
    const loadingEl = document.getElementById('loading')
    const listEl = document.getElementById('patterns-list')
    const emptyEl = document.getElementById('empty-state')

    if (loadingEl) loadingEl.style.display = 'none'

    if (this.patterns.length === 0) {
      if (listEl) listEl.style.display = 'none'
      if (emptyEl) emptyEl.style.display = 'block'
      return
    }

    if (emptyEl) emptyEl.style.display = 'none'
    if (listEl) {
      listEl.style.display = 'block'
      listEl.innerHTML = this.patterns.map(pattern => this.renderPatternItem(pattern)).join('')
      this.attachPatternEventListeners()
    }
  }

  private renderPatternItem(pattern: ContentPattern): string {
    const createdAt = new Date(pattern.createdAt).toLocaleDateString('ja-JP')
    const updatedAt = new Date(pattern.updatedAt).toLocaleDateString('ja-JP')

    return `
      <div class="pattern-item" data-pattern-id="${pattern.id}">
        <div class="pattern-header">
          <div class="pattern-info">
            <div class="pattern-name">${this.escapeHtml(pattern.name)}</div>
            <div class="pattern-url">${this.escapeHtml(pattern.urlPattern)}</div>
          </div>
          <div class="pattern-status">
            <span class="status-badge ${pattern.enabled ? 'enabled' : 'disabled'}">
              ${pattern.enabled ? '有効' : '無効'}
            </span>
          </div>
          <div class="pattern-actions">
            <button class="btn btn-small btn-secondary pattern-details-btn" data-pattern-id="${pattern.id}">
              詳細
            </button>
            <button class="btn btn-small btn-primary pattern-edit-btn" data-pattern-id="${pattern.id}">
              編集
            </button>
            <button class="btn btn-small btn-danger pattern-delete-btn" data-pattern-id="${pattern.id}">
              削除
            </button>
          </div>
        </div>
        <div id="details-${pattern.id}" class="pattern-details">
          <div class="pattern-prompt">${this.escapeHtml(pattern.prompt)}</div>
          <div class="pattern-meta">
            <div><strong>作成日:</strong> ${createdAt}</div>
            <div><strong>更新日:</strong> ${updatedAt}</div>
          </div>
        </div>
      </div>
    `
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  private attachPatternEventListeners(): void {
    // Attach event listeners to pattern action buttons
    document.querySelectorAll('.pattern-details-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const patternId = (e.target as HTMLElement).getAttribute('data-pattern-id')
        if (patternId) this.toggleDetails(patternId)
      })
    })

    document.querySelectorAll('.pattern-edit-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const patternId = (e.target as HTMLElement).getAttribute('data-pattern-id')
        if (patternId) this.editPattern(patternId)
      })
    })

    document.querySelectorAll('.pattern-delete-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const patternId = (e.target as HTMLElement).getAttribute('data-pattern-id')
        if (patternId) this.deletePattern(patternId)
      })
    })
  }

  public toggleDetails(patternId: string): void {
    const detailsEl = document.getElementById(`details-${patternId}`)
    if (detailsEl) {
      detailsEl.classList.toggle('expanded')
    }
  }

  public editPattern(patternId: string): void {
    const pattern = this.patterns.find(p => p.id === patternId)
    if (!pattern) {
      this.showStatus('パターンが見つかりません', 'error')
      return
    }

    this.editingPatternId = patternId
    this.openModal('パターン編集', pattern)
  }

  public async deletePattern(patternId: string): Promise<void> {
    const pattern = this.patterns.find(p => p.id === patternId)
    if (!pattern) return

    if (!confirm(`パターン「${pattern.name}」を削除しますか？`)) {
      return
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'delete-pattern',
        data: { id: patternId },
      })

      if (response.success) {
        this.showStatus('パターンを削除しました', 'success')
        await this.loadPatterns()
        this.renderPatterns()
      } else {
        this.showStatus('パターンの削除に失敗しました', 'error')
      }
    } catch (error) {
      console.error('[PatternManager] Failed to delete pattern:', error)
      this.showStatus('パターンの削除でエラーが発生しました', 'error')
    }
  }

  public openCreateModal(): void {
    this.editingPatternId = null
    this.openModal('新規パターン作成')
  }

  public showPresets(): void {
    const presets = this.getPresetPatterns()
    const message = presets
      .map((preset, index) => `${index + 1}. ${preset.name}\n   ${preset.urlPattern}`)
      .join('\n\n')

    const selectedIndex = prompt(
      `利用可能なプリセットパターン:\n\n${message}\n\n使用するパターンの番号を入力してください (1-${presets.length}):`
    )

    const index = parseInt(selectedIndex || '', 10) - 1
    if (index >= 0 && index < presets.length) {
      const preset = presets[index]
      this.editingPatternId = null
      this.openModal('プリセットパターン作成', preset)
    }
  }

  private getPresetPatterns(): ContentPattern[] {
    return [
      {
        id: '',
        name: 'ニュース記事要約',
        urlPattern: 'https://.*\\.(asahi|mainichi|yomiuri|nikkei|sankei)\\.com/.*',
        prompt: 'このニュース記事の要点を3つの箇条書きで要約してください:\n\n{content}',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '',
        name: '技術記事要約',
        urlPattern: 'https://(qiita\\.com|zenn\\.dev|note\\.com)/.*',
        prompt:
          'この技術記事の要点を整理して、学習のポイントを3つ挙げてください:\n\nタイトル: {title}\n内容: {content}',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '',
        name: 'GitHub リポジトリ分析',
        urlPattern: 'https://github\\.com/[^/]+/[^/]+/?$',
        prompt:
          'このGitHubリポジトリについて、以下の観点で分析してください:\n1. 主な機能\n2. 使用技術\n3. 注目すべき点\n\nリポジトリ: {title}\nURL: {url}\n内容: {content}',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '',
        name: 'YouTube動画要約',
        urlPattern: 'https://www\\.youtube\\.com/watch\\?v=.*',
        prompt: 'この動画の概要と要点を整理してください:\n\nタイトル: {title}\n説明: {content}',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '',
        name: 'Wikipedia記事要約',
        urlPattern: 'https://[^.]+\\.wikipedia\\.org/wiki/.*',
        prompt: 'このWikipedia記事の要点を200文字以内で要約してください:\n\n{content}',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]
  }

  private openModal(title: string, pattern?: ContentPattern): void {
    const modal = document.getElementById('pattern-modal')
    const titleEl = document.getElementById('modal-title')
    const form = document.getElementById('pattern-form') as HTMLFormElement

    if (titleEl) titleEl.textContent = title
    if (modal) modal.classList.add('show')

    // Reset form
    if (form) form.reset()

    // Fill form if editing
    if (pattern) {
      const nameInput = document.getElementById('pattern-name') as HTMLInputElement
      const urlInput = document.getElementById('pattern-url') as HTMLInputElement
      const promptInput = document.getElementById('pattern-prompt') as HTMLTextAreaElement
      const enabledInput = document.getElementById('pattern-enabled') as HTMLInputElement

      if (nameInput) nameInput.value = pattern.name
      if (urlInput) urlInput.value = pattern.urlPattern
      if (promptInput) promptInput.value = pattern.prompt
      if (enabledInput) enabledInput.checked = pattern.enabled
    }
  }

  public closeModal(): void {
    const modal = document.getElementById('pattern-modal')
    if (modal) modal.classList.remove('show')
    this.editingPatternId = null
  }

  public async savePattern(): Promise<void> {
    const nameInput = document.getElementById('pattern-name') as HTMLInputElement
    const urlInput = document.getElementById('pattern-url') as HTMLInputElement
    const promptInput = document.getElementById('pattern-prompt') as HTMLTextAreaElement
    const enabledInput = document.getElementById('pattern-enabled') as HTMLInputElement

    if (!nameInput || !urlInput || !promptInput || !enabledInput) {
      this.showStatus('フォーム要素が見つかりません', 'error')
      return
    }

    const name = nameInput.value.trim()
    const urlPattern = urlInput.value.trim()
    const prompt = promptInput.value.trim()
    const enabled = enabledInput.checked

    // Validation
    if (!name || !urlPattern || !prompt) {
      this.showStatus('すべての必須項目を入力してください', 'error')
      return
    }

    // Test regex pattern
    try {
      new RegExp(urlPattern)
    } catch {
      this.showStatus('URLパターンの正規表現が無効です', 'error')
      return
    }

    // Show loading
    const modal = document.querySelector('.modal-content')
    if (modal) modal.classList.add('loading')

    try {
      if (this.editingPatternId) {
        // Update existing pattern
        const response = await chrome.runtime.sendMessage({
          type: 'update-pattern',
          data: {
            id: this.editingPatternId,
            updates: { name, urlPattern, prompt, enabled },
          },
        })

        if (response.success) {
          this.showStatus('パターンを更新しました', 'success')
        } else {
          this.showStatus('パターンの更新に失敗しました', 'error')
        }
      } else {
        // Create new pattern
        const response = await chrome.runtime.sendMessage({
          type: 'create-pattern',
          data: { name, urlPattern, prompt, enabled },
        })

        if (response.pattern) {
          this.showStatus('パターンを作成しました', 'success')
        } else {
          this.showStatus('パターンの作成に失敗しました', 'error')
        }
      }

      // Reload and re-render
      await this.loadPatterns()
      this.renderPatterns()
      this.closeModal()
    } catch (error) {
      console.error('[PatternManager] Failed to save pattern:', error)
      this.showStatus('パターンの保存でエラーが発生しました', 'error')
    } finally {
      // Hide loading
      if (modal) modal.classList.remove('loading')
    }
  }

  private showStatus(message: string, type: 'success' | 'error'): void {
    const statusEl = document.getElementById('status')
    if (!statusEl) return

    statusEl.textContent = message
    statusEl.className = `status ${type}`
    statusEl.classList.remove('hidden')

    // Auto-hide after 5 seconds
    setTimeout(() => {
      statusEl.classList.add('hidden')
    }, 5000)
  }
}

// Global instance
let patternManager: PatternManager

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  patternManager = new PatternManager()

  // Attach event listeners to UI elements
  const createButton = document.getElementById('create-button')
  const closeButton = document.getElementById('close-button')
  const emptyCreateButton = document.getElementById('empty-create-button')
  const emptyPresetsButton = document.getElementById('empty-presets-button')
  const modalCloseButton = document.getElementById('modal-close-button')
  const modalCancelButton = document.getElementById('modal-cancel-button')
  const modalSaveButton = document.getElementById('modal-save-button')

  if (createButton) {
    createButton.addEventListener('click', () => patternManager.openCreateModal())
  }

  if (closeButton) {
    closeButton.addEventListener('click', () => window.close())
  }

  if (emptyCreateButton) {
    emptyCreateButton.addEventListener('click', () => patternManager.openCreateModal())
  }

  if (emptyPresetsButton) {
    emptyPresetsButton.addEventListener('click', () => patternManager.showPresets())
  }

  if (modalCloseButton) {
    modalCloseButton.addEventListener('click', () => patternManager.closeModal())
  }

  if (modalCancelButton) {
    modalCancelButton.addEventListener('click', () => patternManager.closeModal())
  }

  if (modalSaveButton) {
    modalSaveButton.addEventListener('click', () => patternManager.savePattern())
  }

  // Set global functions for backward compatibility (in case needed)
  ;(window as any).openCreateModal = () => patternManager.openCreateModal()
  ;(window as any).closeModal = () => patternManager.closeModal()
  ;(window as any).savePattern = () => patternManager.savePattern()
  ;(window as any).showPresets = () => patternManager.showPresets()
  ;(window as any).patternManager = patternManager
})
