import { SourceLocation } from './types'
import { SourceMapConsumer } from 'source-map'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'

let sourceMapInitialized = false

/**
 * Initializes SourceMapConsumer with the WASM file.
 * This must be called before using SourceMapConsumer.
 */
function ensureSourceMapInitialized(): void {
  if (sourceMapInitialized) {
    return
  }

  try {
    let wasmPath: string | null = null
    
    try {
      const require = createRequire(import.meta.url)
      const sourceMapPath = require.resolve('source-map/package.json')
      wasmPath = join(dirname(sourceMapPath), 'lib', 'mappings.wasm')
    } catch {
      try {
        const possiblePaths = [
          join(process.cwd(), 'node_modules', 'source-map', 'lib', 'mappings.wasm'),
          join(process.cwd(), '..', 'node_modules', 'source-map', 'lib', 'mappings.wasm'),
          join(process.cwd(), '..', '..', 'node_modules', 'source-map', 'lib', 'mappings.wasm'),
        ]
        
        for (const path of possiblePaths) {
          if (existsSync(path)) {
            wasmPath = path
            break
          }
        }
        
        if (!wasmPath) {
          wasmPath = possiblePaths[0]
        }
      } catch {
        wasmPath = join(process.cwd(), 'node_modules', 'source-map', 'lib', 'mappings.wasm')
      }
    }

    if (wasmPath && existsSync(wasmPath)) {
      const wasmBuffer = readFileSync(wasmPath)
      const wasmArrayBuffer = wasmBuffer.buffer.slice(
        wasmBuffer.byteOffset,
        wasmBuffer.byteOffset + wasmBuffer.byteLength
      )
      
      // Type assertion needed because TypeScript definitions are incomplete
      ;(SourceMapConsumer as any).initialize({
        'lib/mappings.wasm': wasmArrayBuffer
      })
      sourceMapInitialized = true
    } else if (wasmPath) {
      // Fallback to path string for environments where file can't be read directly
      ;(SourceMapConsumer as any).initialize({
        'lib/mappings.wasm': wasmPath
      })
      sourceMapInitialized = true
    } else {
      throw new Error('Could not determine path to mappings.wasm')
    }
  } catch (error) {
    console.warn('Failed to initialize SourceMapConsumer WASM:', error)
    sourceMapInitialized = false
  }
}

/**
 * Resolves a source location that starts with "about://React/Server" by using source maps
 * to map from the server chunk file to the original source file.
 * 
 * @param sourceLocation - The source location with a file path starting with "about://React/Server"
 * @returns Promise<SourceLocation> The resolved source location pointing to the original source file
 * 
 * @example
 * ```typescript
 * const serverLocation = {
 *   file: 'about://React/Server/file:///path/to/.next/server/chunks/ssr/file.js',
 *   line: 500,
 *   column: 0
 * }
 * const resolved = await resolveSourceLocationInServer(serverLocation)
 * // resolved.file will be the original source file path
 * ```
 */
export async function resolveSourceLocationInServer(
  sourceLocation: SourceLocation
): Promise<SourceLocation> {
  if (!sourceLocation.file.startsWith('about://React/Server/')) {
    return sourceLocation
  }

  try {
    let filePath = sourceLocation.file.replace(/^about:\/\/React\/Server\//, '')
    
    if (filePath.startsWith('file:///')) {
      filePath = filePath.replace(/^file:\/\/\//, '/')
    } else if (filePath.startsWith('file://')) {
      filePath = filePath.replace(/^file:\/\//, '/')
    }
    
    try {
      filePath = decodeURIComponent(filePath)
    } catch {
    }

    let sourceMapPath = filePath + '.map'
    
    if (!existsSync(sourceMapPath)) {
      sourceMapPath = filePath.replace(/\.js$/, '.map')
      if (!existsSync(sourceMapPath)) {
        if (!filePath.endsWith('.js')) {
          sourceMapPath = filePath + '.map'
        }
        if (!existsSync(sourceMapPath)) {
          return sourceLocation
        }
      }
    }

    const sourceMapContent = readFileSync(sourceMapPath, 'utf-8')
    const rawSourceMap = JSON.parse(sourceMapContent)
    
    ensureSourceMapInitialized()
    
    const consumer = await new Promise<SourceMapConsumer>((resolve) => {
      SourceMapConsumer.with(rawSourceMap, null, (consumer) => {
        resolve(consumer)
      })
    })

    const originalPosition = consumer.originalPositionFor({
      line: sourceLocation.line,
      column: sourceLocation.column
    })

    consumer.destroy()

    if (originalPosition.source !== null && originalPosition.line !== null) {
      let resolvedSource = originalPosition.source
      
      if (resolvedSource.startsWith('file:///')) {
        resolvedSource = resolvedSource.replace(/^file:\/\/\//, '/')
      } else if (resolvedSource.startsWith('file://')) {
        resolvedSource = resolvedSource.replace(/^file:\/\//, '/')
      }
      
      if (!resolvedSource.startsWith('/')) {
        if (rawSourceMap.sourceRoot) {
          const sourceMapDir = dirname(sourceMapPath)
          if (!rawSourceMap.sourceRoot.startsWith('/')) {
            resolvedSource = join(sourceMapDir, rawSourceMap.sourceRoot, resolvedSource)
          } else {
            resolvedSource = join(rawSourceMap.sourceRoot, resolvedSource)
          }
        } else {
          const sourceMapDir = dirname(sourceMapPath)
          resolvedSource = join(sourceMapDir, resolvedSource)
        }
      }

      resolvedSource = resolvedSource.replace(/\\/g, '/')

      return {
        file: resolvedSource,
        line: originalPosition.line || sourceLocation.line,
        column: originalPosition.column !== null ? originalPosition.column : sourceLocation.column,
        componentName: sourceLocation.componentName,
        sourceCode: sourceLocation.sourceCode
      }
    }

    return sourceLocation
  } catch (error) {
    return sourceLocation
  }
}
