import Anthropic from '@anthropic-ai/sdk'
import { JournalEntry } from '../models/journal'

// 小鳥さんの応答モード
export type KotoriMode = 'basic' | 'healing' | 'fantasy'

// 感情分析結果
export interface EmotionAnalysis {
  dominant: 'joy' | 'sadness' | 'anger' | 'fatigue' | 'neutral'
  intensity: 'low' | 'medium' | 'high'
  keywords: string[]
}

export class ClaudeAIService {
  private anthropic: Anthropic

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required')
    }

    this.anthropic = new Anthropic({
      apiKey: apiKey,
    })
  }

  /**
   * AIトリガーかどうかを判定
   */
  isAITrigger(text: string): boolean {
    // スラッシュで始まる場合はコマンドなので、AIトリガーとして扱わない
    if (text.startsWith('/')) {
      return false
    }

    const triggers = [
      // 質問トリガー
      '？',
      '?',
      // 要約トリガー
      '要約して',
      'まとめて',
      // アドバイストリガー
      'アドバイスして',
      '助言をください',
      // 妄想モードトリガー
      '妄想',
      '想像',
      'もしも',
    ]

    return triggers.some(trigger => text.includes(trigger))
  }

  /**
   * ユーザーの感情を分析
   */
  private analyzeEmotion(entries: JournalEntry[]): EmotionAnalysis {
    const allText = entries.map(entry => entry.content).join(' ')

    // 感情キーワードの定義
    const emotionKeywords = {
      joy: ['嬉しい', '楽しい', '最高', '良かった', '成功', '達成', '幸せ', 'ワクワク', '喜び'],
      sadness: ['悲しい', 'つらい', '辛い', 'しんどい', '落ち込', '憂鬱', 'ダメ', '失敗'],
      anger: ['腹立つ', 'むかつく', 'イライラ', '怒り', '許せない', 'ストレス', 'うざい'],
      fatigue: ['疲れ', '眠い', 'だるい', 'しんどい', '休みたい', 'きつい', '限界'],
    }

    let maxCount = 0
    let dominantEmotion: EmotionAnalysis['dominant'] = 'neutral'
    let foundKeywords: string[] = []

    // 各感情のキーワード出現回数をカウント
    Object.entries(emotionKeywords).forEach(([emotion, keywords]) => {
      const matches = keywords.filter(keyword => allText.includes(keyword))
      if (matches.length > maxCount) {
        maxCount = matches.length
        dominantEmotion = emotion as EmotionAnalysis['dominant']
        foundKeywords = matches
      }
    })

    // 強度を判定
    let intensity: EmotionAnalysis['intensity'] = 'low'
    if (maxCount >= 3) intensity = 'high'
    else if (maxCount >= 2) intensity = 'medium'

    return {
      dominant: dominantEmotion,
      intensity,
      keywords: foundKeywords,
    }
  }

  /**
   * 小鳥さんのモードを決定
   */
  private determineKotoriMode(text: string, emotion: EmotionAnalysis): KotoriMode {
    // 妄想モードトリガー
    if (text.includes('妄想') || text.includes('想像') || text.includes('もしも')) {
      return 'fantasy'
    }

    // 感情に基づくモード切り替え
    if (emotion.dominant === 'sadness' || emotion.dominant === 'fatigue') {
      return 'healing'
    }

    if (emotion.dominant === 'anger') {
      return 'healing' // 怒りも癒しモードで対応
    }

    return 'basic'
  }

  /**
   * AIリクエストを処理
   */
  async processAIRequest(
    text: string,
    entries: JournalEntry[],
    skipTriggerCheck = false
  ): Promise<string> {
    if (!skipTriggerCheck && !this.isAITrigger(text)) {
      throw new Error('Not an AI trigger')
    }

    try {
      const emotion = this.analyzeEmotion(entries)
      const mode = this.determineKotoriMode(text, emotion)
      const prompt = this.buildKotoriPrompt(text, entries, emotion, mode)

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      })

      const content = response.content[0]
      if (content.type === 'text') {
        return content.text
      }

      throw new Error('Unexpected response format')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Claude API request failed: ${message}`)
    }
  }

  /**
   * 小鳥さんのキャラクター性を反映したプロンプトを構築
   */
  private buildKotoriPrompt(
    text: string,
    entries: JournalEntry[],
    emotion: EmotionAnalysis,
    mode: KotoriMode
  ): string {
    const formattedEntries = this.formatEntriesForAI(entries)
    const characterSettings = this.getCharacterSettings(mode, emotion)

    const basePrompt = `あなたは765プロダクションの事務員「音無小鳥」として応答してください。

## キャラクター設定
- 20代後半の女性事務員
- プロデューサーを支える"お姉さん"ポジション
- オープンマインドで賢い
- 愛称は「ピヨちゃん」
- 時々「ピヨ〜」「チュン♪」などの鳥モチーフの感嘆詞を使う

## 現在のモード: ${mode}
${characterSettings}

## ユーザーの感情状態
- 支配的感情: ${emotion.dominant}
- 強度: ${emotion.intensity}
- 感情キーワード: ${emotion.keywords.join(', ') || 'なし'}

## 今日のジャーナルエントリー
${formattedEntries}

## ユーザーの入力
「${text}」

## 応答指示
${this.getResponseInstructions(text, mode, emotion)}`

    return basePrompt
  }

  /**
   * モードに応じたキャラクター設定を取得
   */
  private getCharacterSettings(mode: KotoriMode, _emotion: EmotionAnalysis): string {
    switch (mode) {
      case 'basic':
        return `### 基本モード（事務員モード）
- 柔らかい敬語で丁寧に対応
- 語尾: 「〜です」「〜しましたよ〜」
- 落ち着いた事務員らしい対応
- 絵文字は1行につき1個以内で控えめに`

      case 'healing':
        return `### 癒しモード
- 語尾を伸ばして包み込むように対応
- 語尾: 「〜くださいね…」「〜でしょうか…」
- トーンを落として寄り添う
- 慰めと休息を促す
- 無理をしないよう優しく声をかける`

      case 'fantasy':
        return `### 妄想モード
- 乙女ゲーム風の高テンション
- 語尾: 「〜ですわっ！」「きゃ〜っ！」
- 擬音語が増量（「わぁ〜」「きゃっ」など）
- 絵文字・顔文字を豊富に使用
- 想像力を暴走させて楽しく回答`

      default:
        return ''
    }
  }

  /**
   * 入力タイプとモードに応じた応答指示を取得
   */
  private getResponseInstructions(
    text: string,
    mode: KotoriMode,
    emotion: EmotionAnalysis
  ): string {
    if (text.includes('？') || text.includes('?')) {
      return `質問に対して以下の構成で回答してください：
1. まず結論を提示
2. 理由を説明
3. 次の行動提案を示す
4. 要点は箇条書きで視認性アップ

${emotion.dominant === 'joy' ? 'ハイテンションで共感し、一緒に喜んでください。' : ''}
${emotion.dominant === 'sadness' || emotion.dominant === 'fatigue' ? '優しく寄り添い、無理をしないよう声をかけてください。' : ''}
${emotion.dominant === 'anger' ? '落ち着いて共感し、状況整理と解決策を提案してください。' : ''}`
    }

    if (text.includes('要約') || text.includes('まとめ')) {
      return `100〜150字程度で親しみやすいビジネス調で要約してください。
- 簡潔で要点を押さえた内容
- 小鳥さんらしい温かみのある表現
- 重要なポイントを見逃さない事務員らしい視点`
    }

    if (text.includes('アドバイス') || text.includes('助言')) {
      return `以下の構成でアドバイスしてください：
1. 共感を示す
2. 状況を分析
3. 具体的なアクション提案

${
  emotion.intensity === 'high' && (emotion.dominant === 'sadness' || emotion.dominant === 'fatigue')
    ? '特に優しく、無理をしないよう配慮してください。'
    : '基本は優しく、必要に応じて"少し厳しめスイッチ"で背中を押してください。'
}`
    }

    if (text.includes('妄想') || text.includes('想像') || text.includes('もしも')) {
      return `妄想モードで楽しく創造的に回答してください！
- 想像力を暴走させて
- 乙女ゲーム風のテンションで
- 「きゃ〜っ！」「〜ですわっ！」を多用
- 楽しい妄想を一緒に膨らませる`
    }

    return '小鳥さんらしく、温かみのある丁寧な対応をしてください。'
  }

  /**
   * ジャーナルエントリーをAI用にフォーマット
   */
  private formatEntriesForAI(entries: JournalEntry[]): string {
    if (entries.length === 0) {
      return '(今日はまだエントリーがありません)'
    }

    return entries
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .map(entry => {
        const time = entry.timestamp.toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit',
        })
        return `${time} [${entry.category}] ${entry.content}`
      })
      .join('\n')
  }
}
