import { describe, it, expect } from 'vitest'
import {
  stringParam,
  numberParam,
  booleanParam,
  objectParam,
  arrayParam,
  createTool,
  weatherTool,
  calculatorTool,
  fileInfoTool,
} from '../../src/utils/function-calling-helpers'

describe('Function Calling Helpers', () => {
  describe('Parameter helpers', () => {
    it('should create string parameter', () => {
      const param = stringParam('Test description', true)
      expect(param).toEqual({
        type: 'string',
        description: 'Test description',
        required: true,
      })
    })

    it('should create number parameter', () => {
      const param = numberParam('Test number')
      expect(param).toEqual({
        type: 'number',
        description: 'Test number',
        required: false,
      })
    })

    it('should create boolean parameter', () => {
      const param = booleanParam('Test boolean', true)
      expect(param).toEqual({
        type: 'boolean',
        description: 'Test boolean',
        required: true,
      })
    })

    it('should create object parameter', () => {
      const properties = {
        name: stringParam('Name'),
        age: numberParam('Age'),
      }
      const param = objectParam('Test object', properties, true)
      expect(param).toEqual({
        type: 'object',
        description: 'Test object',
        properties,
        required: true,
      })
    })

    it('should create array parameter', () => {
      const items = stringParam('Array item')
      const param = arrayParam('Test array', items, true)
      expect(param).toEqual({
        type: 'array',
        description: 'Test array',
        items,
        required: true,
      })
    })
  })

  describe('createTool', () => {
    it('should create a function tool', async () => {
      const handler = async (args: Record<string, unknown>) => {
        return `Hello, ${args.name}!`
      }

      const tool = createTool(
        'greet',
        'Greet a person',
        {
          name: stringParam('Name of the person', true),
        },
        handler,
        ['name']
      )

      expect(tool.definition).toEqual({
        name: 'greet',
        description: 'Greet a person',
        parameters: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the person',
              required: true,
            },
          },
          required: ['name'],
        },
      })

      const result = await tool.handler({ name: 'Alice' })
      expect(result).toBe('Hello, Alice!')
    })
  })

  describe('Sample tools', () => {
    describe('weatherTool', () => {
      it('should return weather information with celsius', async () => {
        const result = await weatherTool.handler({ location: 'Tokyo' })
        expect(result).toEqual({
          location: 'Tokyo',
          temperature: '20°C',
          condition: 'Sunny',
          humidity: '65%',
        })
      })

      it('should return weather information with fahrenheit', async () => {
        const result = await weatherTool.handler({ location: 'New York', unit: 'fahrenheit' })
        expect(result).toEqual({
          location: 'New York',
          temperature: '68°F',
          condition: 'Sunny',
          humidity: '65%',
        })
      })

      it('should have correct definition', () => {
        expect(weatherTool.definition.name).toBe('get_weather')
        expect(weatherTool.definition.description).toBe('指定された場所の天気情報を取得します')
        expect(weatherTool.definition.parameters.required).toEqual(['location'])
      })
    })

    describe('calculatorTool', () => {
      it('should calculate simple expressions', async () => {
        const result = await calculatorTool.handler({ expression: '2 + 3' })
        expect(result).toEqual({
          expression: '2 + 3',
          result: 5,
        })
      })

      it('should calculate complex expressions', async () => {
        const result = await calculatorTool.handler({ expression: '2 + 3 * 4' })
        expect(result).toEqual({
          expression: '2 + 3 * 4',
          result: 14,
        })
      })

      it('should handle invalid expressions', async () => {
        await expect(calculatorTool.handler({ expression: 'invalid' })).rejects.toThrow(
          '計算に失敗しました'
        )
      })

      it('should have correct definition', () => {
        expect(calculatorTool.definition.name).toBe('calculate')
        expect(calculatorTool.definition.description).toBe('数学計算を実行します')
        expect(calculatorTool.definition.parameters.required).toEqual(['expression'])
      })
    })

    describe('fileInfoTool', () => {
      it('should return file info without content', async () => {
        const result = await fileInfoTool.handler({ path: '/test/file.ts' })
        expect(result).toMatchObject({
          path: '/test/file.ts',
          size: '1.2 KB',
          type: 'TypeScript',
        })
        expect(result).not.toHaveProperty('content')
      })

      it('should return file info with content', async () => {
        const result = await fileInfoTool.handler({ path: '/test/file.ts', includeContent: true })
        expect(result).toMatchObject({
          path: '/test/file.ts',
          size: '1.2 KB',
          type: 'TypeScript',
          content: '// 模擬的なファイル内容\nconsole.log("Hello, World!")',
        })
      })

      it('should detect non-TypeScript files', async () => {
        const result = await fileInfoTool.handler({ path: '/test/file.txt' })
        expect(result).toMatchObject({
          path: '/test/file.txt',
          type: 'Unknown',
        })
      })

      it('should have correct definition', () => {
        expect(fileInfoTool.definition.name).toBe('get_file_info')
        expect(fileInfoTool.definition.description).toBe('ファイルの情報を取得します')
        expect(fileInfoTool.definition.parameters.required).toEqual(['path'])
      })
    })
  })
})
