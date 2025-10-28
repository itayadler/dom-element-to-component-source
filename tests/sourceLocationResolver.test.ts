import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseDebugStack } from '../src/sourceLocationResolver'
import { ReactFiberNode } from '../src/types'

// Mock error-stack-parser
vi.mock('error-stack-parser', () => ({
  default: {
    parse: vi.fn()
  }
}))

// Mock stacktrace-gps
vi.mock('stacktrace-gps', () => ({
  default: vi.fn().mockImplementation(() => ({
    getMappedLocation: vi.fn()
  }))
}))

import ErrorStackParser from 'error-stack-parser'
import StackTraceGPS from 'stacktrace-gps'

describe('parseDebugStack', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Next.js Server-Side Component URL Remapping', () => {
    it('should remap about://React/Server URL when first frame has _next/static', async () => {
      const mockError = new Error('test')
      mockError.stack = `Error: react-stack-top-frame
    at fakeJSXCallSite (http://localhost:3000/_next/static/chunks/a8c60_next_dist_compiled_0f4d9d23._.js:4325:16)
    at HeroPost (about://React/Server/file:///Users/itay/code/ask-the-llm/test/sites/blog-starter/.next/server/chunks/ssr/%5Broot-of-the-server%5D__925b01b7._.js?49:200:316)
    at Object.react_stack_bottom_frame (http://localhost:3000/_next/static/chunks/a8c60_next_dist_compiled_0f4d9d23._.js:4798:93)`

      const mockFiberNode: ReactFiberNode = {
        name: 'HeroPost',
        _debugStack: mockError,
        type: {
          name: 'HeroPost',
          displayName: 'HeroPost'
        },
        _debugOwner: {
          name: 'HeroPost',
          type: {
            name: 'HeroPost'
          }
        }
      }

      // Mock ErrorStackParser to return the stack frames
      const mockFirstFrame = {
        fileName: 'http://localhost:3000/_next/static/chunks/a8c60_next_dist_compiled_0f4d9d23._.js',
        lineNumber: 4325,
        columnNumber: 16
      }

      const mockSecondFrame = {
        fileName: 'about://React/Server/file:///Users/itay/code/ask-the-llm/test/sites/blog-starter/.next/server/chunks/ssr/%5Broot-of-the-server%5D__925b01b7._.js?49:200:316',
        lineNumber: 200,
        columnNumber: 316
      }

      vi.mocked(ErrorStackParser.parse).mockReturnValue([mockFirstFrame, mockSecondFrame] as any)

      const result = await parseDebugStack(mockFiberNode)

      expect(result).toBeTruthy()
      expect(result?.file).toBe('http://localhost:3000/_next/static/chunks/[root-of-the-server]__925b01b7._.js')
      expect(result?.line).toBe(200)
      expect(result?.column).toBe(316)
      expect(result?.componentName).toBe('HeroPost')
    })

    it('should handle server chunks with non-ssr path', async () => {
      const mockError = new Error('test')
      mockError.stack = `Error: react-stack-top-frame
    at fakeJSXCallSite (http://localhost:3000/_next/static/chunks/a8c60_next_dist_compiled_0f4d9d23._.js:4325:16)
    at Component (about://React/Server/file:///Users/itay/code/app/.next/server/chunks/my-chunk.js?49:200:316)
    at Object.react_stack_bottom_frame (http://localhost:3000/_next/static/chunks/a8c60_next_dist_compiled_0f4d9d23._.js:4798:93)`

      const mockFiberNode: ReactFiberNode = {
        name: 'Component',
        _debugStack: mockError,
        type: {
          name: 'Component'
        }
      }

      const mockFirstFrame = {
        fileName: 'http://localhost:3000/_next/static/chunks/a8c60_next_dist_compiled_0f4d9d23._.js',
        lineNumber: 4325,
        columnNumber: 16
      }

      const mockSecondFrame = {
        fileName: 'about://React/Server/file:///Users/itay/code/app/.next/server/chunks/my-chunk.js?49:200:316',
        lineNumber: 200,
        columnNumber: 316
      }

      vi.mocked(ErrorStackParser.parse).mockReturnValue([mockFirstFrame, mockSecondFrame] as any)

      const result = await parseDebugStack(mockFiberNode)

      expect(result).toBeTruthy()
      expect(result?.file).toBe('http://localhost:3000/_next/static/chunks/my-chunk.js')
      expect(result?.line).toBe(200)
      expect(result?.column).toBe(316)
    })

    it('should fall back to original logic when first frame does not have _next/static', async () => {
      const mockError = new Error('test')
      mockError.stack = `Error: react-stack-top-frame
    at fakeJSXCallSite (http://localhost:3000/app.js:4325:16)
    at Component (file:///Users/itay/code/app/Component.tsx:49:200)
    at Object.react_stack_bottom_frame (http://localhost:3000/app.js:4798:93)`

      const mockFiberNode: ReactFiberNode = {
        name: 'Component',
        _debugStack: mockError,
        type: {
          name: 'Component'
        }
      }

      const mockFirstFrame = {
        fileName: 'http://localhost:3000/app.js',
        lineNumber: 4325,
        columnNumber: 16
      }

      const mockSecondFrame = {
        fileName: 'file:///Users/itay/code/app/Component.tsx',
        lineNumber: 49,
        columnNumber: 200
      }

      const mockGPS = {
        getMappedLocation: vi.fn().mockResolvedValue({
          fileName: 'file:///Users/itay/code/app/Component.tsx',
          lineNumber: 49,
          columnNumber: 200
        })
      }

      vi.mocked(StackTraceGPS).mockImplementation(() => mockGPS as any)
      vi.mocked(ErrorStackParser.parse).mockReturnValue([mockFirstFrame, mockSecondFrame] as any)

      const result = await parseDebugStack(mockFiberNode)

      expect(result).toBeTruthy()
      expect(mockGPS.getMappedLocation).toHaveBeenCalled()
      expect(result?.file).toBe('file:///Users/itay/code/app/Component.tsx')
      expect(result?.line).toBe(49)
      expect(result?.column).toBe(200)
    })

    it('should handle regular about:// URLs without file:// protocol', async () => {
      const mockError = new Error('test')
      mockError.stack = `Error: react-stack-top-frame
    at fakeJSXCallSite (http://localhost:3000/_next/static/chunks/a8c60_next_dist_compiled_0f4d9d23._.js:4325:16)
    at Component (about://something-else:49:200)
    at Object.react_stack_bottom_frame (http://localhost:3000/_next/static/chunks/a8c60_next_dist_compiled_0f4d9d23._.js:4798:93)`

      const mockFiberNode: ReactFiberNode = {
        name: 'Component',
        _debugStack: mockError,
        type: {
          name: 'Component'
        }
      }

      const mockFirstFrame = {
        fileName: 'http://localhost:3000/_next/static/chunks/a8c60_next_dist_compiled_0f4d9d23._.js',
        lineNumber: 4325,
        columnNumber: 16
      }

      const mockSecondFrame = {
        fileName: 'about://something-else',
        lineNumber: 49,
        columnNumber: 200
      }

      const mockGPS = {
        getMappedLocation: vi.fn().mockResolvedValue({
          fileName: 'about://something-else',
          lineNumber: 49,
          columnNumber: 200
        })
      }

      vi.mocked(StackTraceGPS).mockImplementation(() => mockGPS as any)
      vi.mocked(ErrorStackParser.parse).mockReturnValue([mockFirstFrame, mockSecondFrame] as any)

      const result = await parseDebugStack(mockFiberNode)

      expect(result).toBeTruthy()
      expect(mockGPS.getMappedLocation).toHaveBeenCalled()
    })
  })
})

