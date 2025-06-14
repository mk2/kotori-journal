import React, { useState, useEffect } from 'react'
import { Box, Text, useInput } from 'ink'

interface MultilineTextInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit?: (value: string) => void
  placeholder?: string
  showCursor?: boolean
  focus?: boolean
}

export const MultilineTextInput: React.FC<MultilineTextInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = '',
  showCursor = true,
  focus = true,
}) => {
  // Store lines and cursor position
  const [lines, setLines] = useState<string[]>([''])
  const [cursorRow, setCursorRow] = useState(0)
  const [cursorCol, setCursorCol] = useState(0)

  // Initialize from props value
  useEffect(() => {
    const inputLines = value.split('\n')
    setLines(inputLines.length > 0 ? inputLines : [''])
    // Keep cursor at end of last line
    const lastLineIndex = inputLines.length - 1
    setCursorRow(lastLineIndex)
    setCursorCol(inputLines[lastLineIndex]?.length || 0)
  }, [value])

  // Handle keyboard input
  useInput(
    (input, key) => {
      if (!focus) return

      let newLines = [...lines]
      let newCursorRow = cursorRow
      let newCursorCol = cursorCol

      // Ctrl+J for new line
      if (key.ctrl && input === 'j') {
        // Split current line at cursor position
        const currentLine = newLines[cursorRow]
        const beforeCursor = currentLine.slice(0, cursorCol)
        const afterCursor = currentLine.slice(cursorCol)

        // Create new lines array with split
        newLines = [
          ...newLines.slice(0, cursorRow),
          beforeCursor,
          afterCursor,
          ...newLines.slice(cursorRow + 1),
        ]

        // Move cursor to start of new line
        newCursorRow = cursorRow + 1
        newCursorCol = 0
      }
      // Regular Enter submits
      else if (key.return) {
        if (onSubmit) {
          onSubmit(newLines.join('\n'))
        }
        return
      }
      // Backspace
      else if (key.backspace || key.delete) {
        if (cursorCol > 0) {
          // Delete character before cursor
          const currentLine = newLines[cursorRow]
          newLines = [
            ...newLines.slice(0, cursorRow),
            currentLine.slice(0, cursorCol - 1) + currentLine.slice(cursorCol),
            ...newLines.slice(cursorRow + 1),
          ]
          newCursorCol = cursorCol - 1
        } else if (cursorRow > 0) {
          // Merge with previous line
          const currentLine = newLines[cursorRow]
          const prevLine = newLines[cursorRow - 1]
          newLines = [
            ...newLines.slice(0, cursorRow - 1),
            prevLine + currentLine,
            ...newLines.slice(cursorRow + 1),
          ]
          newCursorRow = cursorRow - 1
          newCursorCol = prevLine.length
        }
      }
      // Left arrow
      else if (key.leftArrow) {
        if (cursorCol > 0) {
          newCursorCol = cursorCol - 1
        } else if (cursorRow > 0) {
          newCursorRow = cursorRow - 1
          newCursorCol = newLines[cursorRow - 1].length
        }
      }
      // Right arrow
      else if (key.rightArrow) {
        if (cursorCol < newLines[cursorRow].length) {
          newCursorCol = cursorCol + 1
        } else if (cursorRow < newLines.length - 1) {
          newCursorRow = cursorRow + 1
          newCursorCol = 0
        }
      }
      // Up arrow
      else if (key.upArrow) {
        if (cursorRow > 0) {
          newCursorRow = cursorRow - 1
          newCursorCol = Math.min(cursorCol, newLines[cursorRow - 1].length)
        }
      }
      // Down arrow
      else if (key.downArrow) {
        if (cursorRow < newLines.length - 1) {
          newCursorRow = cursorRow + 1
          newCursorCol = Math.min(cursorCol, newLines[cursorRow + 1].length)
        }
      }
      // Regular character input
      else if (input && !key.ctrl && !key.meta) {
        const currentLine = newLines[cursorRow]
        const newLineText = currentLine.slice(0, cursorCol) + input + currentLine.slice(cursorCol)

        // Check if the line ends with backslash (\ for newline)
        if (newLineText.endsWith('\\')) {
          // Replace backslash with actual newline
          const lineWithoutBackslash = newLineText.slice(0, -1)
          newLines = [
            ...newLines.slice(0, cursorRow),
            lineWithoutBackslash,
            '',
            ...newLines.slice(cursorRow + 1),
          ]
          newCursorRow = cursorRow + 1
          newCursorCol = 0
        } else {
          newLines = [
            ...newLines.slice(0, cursorRow),
            newLineText,
            ...newLines.slice(cursorRow + 1),
          ]
          newCursorCol = cursorCol + input.length
        }
      }

      // Update state and notify parent
      setLines(newLines)
      setCursorRow(newCursorRow)
      setCursorCol(newCursorCol)
      onChange(newLines.join('\n'))
    },
    { isActive: true }
  )

  return (
    <Box flexDirection="column">
      {lines.map((line, lineIndex) => {
        // Show placeholder if it's the first empty line
        const displayText =
          line || (lineIndex === 0 && lines.length === 1 && placeholder ? placeholder : ' ')
        const isCurrentLine = lineIndex === cursorRow

        if (isCurrentLine && showCursor) {
          // Split the line to show cursor
          const beforeCursor = displayText.slice(0, cursorCol)
          const cursorChar = displayText[cursorCol] || ' '
          const afterCursor = displayText.slice(cursorCol + 1)

          // Check if this is showing placeholder text
          const isPlaceholder = !line && lineIndex === 0 && lines.length === 1 && !!placeholder

          return (
            <Box key={lineIndex}>
              <Text dimColor={isPlaceholder}>{beforeCursor}</Text>
              <Text inverse dimColor={isPlaceholder}>
                {cursorChar}
              </Text>
              <Text dimColor={isPlaceholder}>{afterCursor}</Text>
            </Box>
          )
        }

        return (
          <Box key={lineIndex}>
            <Text dimColor={!line && lineIndex === 0}>{displayText}</Text>
          </Box>
        )
      })}
    </Box>
  )
}
