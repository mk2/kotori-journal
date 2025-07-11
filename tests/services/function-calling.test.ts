import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FunctionCallingService } from '../../src/services/function-calling'
import { FunctionTool } from '../../src/types/function-calling'

describe('FunctionCallingService', () => {
  let service: FunctionCallingService
  let mockAnthropicClient: any

  beforeEach(() => {
    mockAnthropicClient = {
      messages: {
        create: vi.fn(),
      },
    }
    service = new FunctionCallingService(mockAnthropicClient)
  })

  describe('registerTool', () => {
    it('should register a tool', () => {
      const tool: FunctionTool = {
        definition: {
          name: 'test_function',
          description: 'A test function',
          parameters: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'Test message',
              },
            },
            required: ['message'],
          },
        },
        handler: vi.fn().mockResolvedValue('test result'),
      }

      service.registerTool(tool)
      expect(service.getRegisteredTools()).toContain('test_function')
    })

    it('should throw error if tool name already exists', () => {
      const tool: FunctionTool = {
        definition: {
          name: 'test_function',
          description: 'A test function',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
        handler: vi.fn(),
      }

      service.registerTool(tool)
      expect(() => service.registerTool(tool)).toThrow('Tool test_function already exists')
    })
  })

  describe('callWithFunctions', () => {
    it('should call Claude API with function definitions', async () => {
      const tool: FunctionTool = {
        definition: {
          name: 'get_weather',
          description: 'Get weather information',
          parameters: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'Location name',
              },
            },
            required: ['location'],
          },
        },
        handler: vi.fn().mockResolvedValue('Sunny, 20°C'),
      }

      service.registerTool(tool)

      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'I need to get the weather for you.',
          },
        ],
        stop_reason: 'tool_use',
        usage: { input_tokens: 10, output_tokens: 5 },
      })

      const result = await service.callWithFunctions('What is the weather in Tokyo?')

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: 'What is the weather in Tokyo?',
          },
        ],
        tools: [
          {
            name: 'get_weather',
            description: 'Get weather information',
            input_schema: {
              type: 'object',
              properties: {
                location: {
                  type: 'string',
                  description: 'Location name',
                },
              },
              required: ['location'],
            },
          },
        ],
      })

      expect(result.content).toBe('I need to get the weather for you.')
      expect(result.functionCalls).toEqual([])
      expect(result.functionResults).toEqual([])
    })

    it('should execute function calls and return results', async () => {
      const tool: FunctionTool = {
        definition: {
          name: 'get_weather',
          description: 'Get weather information',
          parameters: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'Location name',
              },
            },
            required: ['location'],
          },
        },
        handler: vi.fn().mockResolvedValue('Sunny, 20°C'),
      }

      service.registerTool(tool)

      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'tool_use',
            id: 'tool_1',
            name: 'get_weather',
            input: { location: 'Tokyo' },
          },
        ],
        stop_reason: 'tool_use',
        usage: { input_tokens: 10, output_tokens: 5 },
      })

      const result = await service.callWithFunctions('What is the weather in Tokyo?')

      expect(tool.handler).toHaveBeenCalledWith({ location: 'Tokyo' })
      expect(result.functionCalls).toEqual([
        {
          name: 'get_weather',
          arguments: { location: 'Tokyo' },
        },
      ])
      expect(result.functionResults).toEqual([
        {
          name: 'get_weather',
          result: 'Sunny, 20°C',
        },
      ])
    })

    it('should handle function call errors', async () => {
      const tool: FunctionTool = {
        definition: {
          name: 'error_function',
          description: 'A function that throws an error',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
        handler: vi.fn().mockRejectedValue(new Error('Test error')),
      }

      service.registerTool(tool)

      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'tool_use',
            id: 'tool_1',
            name: 'error_function',
            input: {},
          },
        ],
        stop_reason: 'tool_use',
        usage: { input_tokens: 10, output_tokens: 5 },
      })

      const result = await service.callWithFunctions('Call the error function')

      expect(result.functionResults).toEqual([
        {
          name: 'error_function',
          result: null,
          error: 'Test error',
        },
      ])
    })

    it('should handle unknown function calls', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'tool_use',
            id: 'tool_1',
            name: 'unknown_function',
            input: {},
          },
        ],
        stop_reason: 'tool_use',
        usage: { input_tokens: 10, output_tokens: 5 },
      })

      const result = await service.callWithFunctions('Call unknown function')

      expect(result.functionResults).toEqual([
        {
          name: 'unknown_function',
          result: null,
          error: 'Unknown function: unknown_function',
        },
      ])
    })
  })

  describe('unregisterTool', () => {
    it('should unregister a tool', () => {
      const tool: FunctionTool = {
        definition: {
          name: 'test_function',
          description: 'A test function',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
        handler: vi.fn(),
      }

      service.registerTool(tool)
      expect(service.getRegisteredTools()).toContain('test_function')

      service.unregisterTool('test_function')
      expect(service.getRegisteredTools()).not.toContain('test_function')
    })

    it('should not throw error if tool does not exist', () => {
      expect(() => service.unregisterTool('non_existent_tool')).not.toThrow()
    })
  })

  describe('clearTools', () => {
    it('should clear all registered tools', () => {
      const tool1: FunctionTool = {
        definition: {
          name: 'test_function_1',
          description: 'A test function 1',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
        handler: vi.fn(),
      }

      const tool2: FunctionTool = {
        definition: {
          name: 'test_function_2',
          description: 'A test function 2',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
        handler: vi.fn(),
      }

      service.registerTool(tool1)
      service.registerTool(tool2)
      expect(service.getRegisteredTools()).toHaveLength(2)

      service.clearTools()
      expect(service.getRegisteredTools()).toHaveLength(0)
    })
  })
})
