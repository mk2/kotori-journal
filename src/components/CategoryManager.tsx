import React, { useState } from 'react'
import { Box, Text, useInput, useApp } from 'ink'
import TextInput from 'ink-text-input'
import SelectInput from 'ink-select-input'

interface CategoryManagerProps {
  categories: string[]
  onAddCategory: (name: string) => Promise<boolean>
  onRemoveCategory: (name: string) => Promise<boolean>
  onClose: () => void
}

export const CategoryManagerView: React.FC<CategoryManagerProps> = ({
  categories,
  onAddCategory,
  onRemoveCategory,
  onClose,
}) => {
  const { exit } = useApp()
  const [mode, setMode] = useState<'list' | 'add' | 'remove'>('list')
  const [newCategory, setNewCategory] = useState('')
  const [message, setMessage] = useState('')

  useInput((inputChar: string, key: { ctrl?: boolean; escape?: boolean }) => {
    if (key.ctrl && (inputChar === 'c' || inputChar === 'd')) {
      exit()
      return
    }
    if (key.escape && mode === 'list') {
      onClose()
      return
    }
  })

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return

    const success = await onAddCategory(newCategory)
    if (success) {
      setMessage(`カテゴリ「${newCategory}」を追加しました`)
      setNewCategory('')
      setMode('list')
    } else {
      setMessage('カテゴリの追加に失敗しました')
    }

    setTimeout(() => setMessage(''), 2000)
  }

  const handleRemoveCategory = async (category: string) => {
    const success = await onRemoveCategory(category)
    if (success) {
      setMessage(`カテゴリ「${category}」を削除しました`)
      setMode('list')
    } else {
      setMessage('デフォルトカテゴリは削除できません')
    }

    setTimeout(() => setMessage(''), 2000)
  }

  const menuItems = [
    { label: '新しいカテゴリを追加', value: 'add' },
    { label: 'カテゴリを削除', value: 'remove' },
    { label: '戻る', value: 'close' },
  ]

  const removableCategories = categories
    .filter(c => !['仕事', 'プライベート', '未分類'].includes(c))
    .map(c => ({ label: c, value: c }))

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">
          カテゴリ管理
        </Text>
        <Text dimColor> - Ctrl+D で終了</Text>
      </Box>

      {message && (
        <Box marginBottom={1}>
          <Text color="green">{message}</Text>
        </Box>
      )}

      <Box marginBottom={1}>
        <Text>現在のカテゴリ: </Text>
        <Text color="yellow">{categories.join(', ')}</Text>
      </Box>

      {mode === 'list' && (
        <SelectInput
          items={menuItems}
          onSelect={item => {
            if (item.value === 'close') {
              onClose()
            } else {
              setMode(item.value as 'add' | 'remove')
            }
          }}
        />
      )}

      {mode === 'add' && (
        <Box>
          <Text>新しいカテゴリ名: </Text>
          <TextInput
            value={newCategory}
            onChange={setNewCategory}
            onSubmit={handleAddCategory}
            placeholder="カテゴリ名を入力..."
          />
        </Box>
      )}

      {mode === 'remove' && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text>削除するカテゴリを選択:</Text>
          </Box>
          {removableCategories.length > 0 ? (
            <SelectInput
              items={[...removableCategories, { label: 'キャンセル', value: 'cancel' }]}
              onSelect={item => {
                if (item.value === 'cancel') {
                  setMode('list')
                } else {
                  handleRemoveCategory(item.value)
                }
              }}
            />
          ) : (
            <Text color="yellow">削除可能なカテゴリがありません</Text>
          )}
        </Box>
      )}
    </Box>
  )
}
