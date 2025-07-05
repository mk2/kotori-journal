import React from 'react'
import { Box, Text, useApp } from 'ink'
import SelectInput from 'ink-select-input'
import { AppMode } from '../hooks/useAppMode'

interface MenuViewProps {
  onSelect: (mode: AppMode) => void
}

export const MenuView: React.FC<MenuViewProps> = ({ onSelect }) => {
  const { exit } = useApp()

  const menuItems = [
    { label: 'ジャーナル入力に戻る', value: 'journal' },
    { label: '検索 (Ctrl+F)', value: 'search' },
    { label: 'カテゴリ管理', value: 'category' },
    { label: '終了 (Ctrl+D)', value: 'exit' },
  ]

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">
          メニュー
        </Text>
      </Box>
      <SelectInput
        items={menuItems}
        onSelect={item => {
          if (item.value === 'exit') {
            exit()
          } else {
            onSelect(item.value as AppMode)
          }
        }}
      />
    </Box>
  )
}
