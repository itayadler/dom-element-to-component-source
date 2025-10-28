import { SourceLocation, ReactFiberNode } from './types'
import ErrorStackParser from 'error-stack-parser'
import StackTraceGPS from 'stacktrace-gps'

function getComponentName(fiberNode: ReactFiberNode): string | null {
  let current = fiberNode._debugOwner
  let previous: ReactFiberNode | null = null
  
  while (current) {
    if (current === previous) {
      break
    }
    
    const name = current.name || current.type?.name
    
    if (name) {
      return name
    }
    
    previous = current
    current = current._debugOwner
  }
  
  return null
}

/**
 * Parses debug stack data from different React versions and formats
 * @param fiberNode - The React Fiber node
 * @param reactVersion - The detected React version
 * @returns Parsed source location or null if not found
 */
export async function parseDebugStack(
  fiberNode: ReactFiberNode, 
): Promise<SourceLocation | null> {
  let debugStack: Error | { fileName: string; lineNumber: number; columnNumber: number } | null = null

  if (!debugStack) {
    debugStack = fiberNode._debugStack || null
  }
  
  if (!debugStack) {
    debugStack = fiberNode._debugSource || null
  }

  if (!debugStack) {
    return null
  }

  let componentName: string | undefined = getComponentName(fiberNode) || undefined

  let sourceLocation: SourceLocation

  if (debugStack && 'stack' in debugStack && typeof debugStack.stack === 'string') {
    try {
      const stackFrames = ErrorStackParser.parse(debugStack as Error)
      
      if (stackFrames.length >= 2) {
        const firstFrame = stackFrames[0]
        const targetFrame = stackFrames[1]
        
        // Check if first frame contains _next/static (Next.js client bundle)
        if (firstFrame.fileName && firstFrame.fileName.includes('_next/static')) {
          // Extract the base URL from the first frame
          const url = new URL(firstFrame.fileName)
          const baseUrl = `${url.protocol}//${url.host}`
          
          // Check if second frame has the problematic about://React/Server URL
          if (targetFrame.fileName && targetFrame.fileName.startsWith('about://')) {
            // Extract the file path from the about:// URL
            // Format: about://React/Server/file:///Users/...
            const fileUrlMatch = targetFrame.fileName.match(/file:\/\/\/(.+?)(?:\?|$)/)
            
            if (fileUrlMatch) {
              let localPath = decodeURIComponent(fileUrlMatch[1])
              
              // Check if this is a Next.js server chunk (.next/server/chunks)
              if (localPath.includes('.next/server/chunks')) {
                // Extract the chunk file name from the server path
                // Path format: .../.next/server/chunks/ssr/chunkname.js
                const chunkMatch = localPath.match(/\.next\/server\/chunks\/(?:ssr\/)?([^/]+)$/)
                if (chunkMatch) {
                  const chunkName = chunkMatch[1]
                  // Construct a URL that points to the server chunk
                  // For Next.js, server chunks can be accessed at /_next/static/chunks/
                  const mappedUrl = `${baseUrl}/_next/static/chunks/${chunkName}`
                  
                  sourceLocation = {
                    file: mappedUrl,
                    line: targetFrame.lineNumber || 0,
                    column: targetFrame.columnNumber || 0,
                    componentName
                  }
                } else {
                  // Can't extract chunk name, return local path as fallback
                  sourceLocation = {
                    file: localPath,
                    line: targetFrame.lineNumber || 0,
                    column: targetFrame.columnNumber || 0,
                    componentName
                  }
                }
              } else {
                // Try to construct a Next.js app route from the path
                // For Next.js App Router, files in app/ directory become routes
                const appMatch = localPath.match(/app\/(.+)$/)
                if (appMatch) {
                  let appRoute = appMatch[1].replace(/\.\w+$/, '') // Remove extension
                  // Replace index routes with empty string
                  appRoute = appRoute.replace(/\/index$/, '')
                  
                  // Try to add /_next/static route prefix for client-side source maps
                  const mappedUrl = `${baseUrl}/_next/static/chunks/${appRoute}`
                  
                  sourceLocation = {
                    file: mappedUrl,
                    line: targetFrame.lineNumber || 0,
                    column: targetFrame.columnNumber || 0,
                    componentName
                  }
                } else {
                  // Can't parse as app route, use local path
                  sourceLocation = {
                    file: localPath,
                    line: targetFrame.lineNumber || 0,
                    column: targetFrame.columnNumber || 0,
                    componentName
                  }
                }
              }
            } else {
              // Can't parse the URL, use original logic
              const gps = new StackTraceGPS()
              const originalFrame = await gps.getMappedLocation(targetFrame)
              
              sourceLocation = {
                file: originalFrame.fileName || targetFrame.fileName || '',
                line: originalFrame.lineNumber || targetFrame.lineNumber || 0,
                column: originalFrame.columnNumber || targetFrame.columnNumber || 0,
                componentName
              }
            }
          } else {
            // Not an about:// URL, use original logic
            const gps = new StackTraceGPS()
            const originalFrame = await gps.getMappedLocation(targetFrame)
            
            sourceLocation = {
              file: originalFrame.fileName || targetFrame.fileName || '',
              line: originalFrame.lineNumber || targetFrame.lineNumber || 0,
              column: originalFrame.columnNumber || targetFrame.columnNumber || 0,
              componentName
            }
          }
        } else {
          // First frame doesn't have _next/static, use original logic
          const gps = new StackTraceGPS()
          const originalFrame = await gps.getMappedLocation(targetFrame)
          
          sourceLocation = {
            file: originalFrame.fileName || targetFrame.fileName || '',
            line: originalFrame.lineNumber || targetFrame.lineNumber || 0,
            column: originalFrame.columnNumber || targetFrame.columnNumber || 0,
            componentName
          }
        }
      } else {
        return null
      }
    } catch (error) {
      try {
        const stackFrames = ErrorStackParser.parse(debugStack as Error)
        if (stackFrames.length >= 2) {
          const targetFrame = stackFrames[1]
          sourceLocation = {
            file: targetFrame.fileName || '',
            line: targetFrame.lineNumber || 0,
            column: targetFrame.columnNumber || 0,
            componentName
          }
        } else {
          return null
        }
      } catch (parseError) {
        return null
      }
    }
  } else if (debugStack && 'fileName' in debugStack) {
    sourceLocation = {
      file: debugStack.fileName || '',
      line: debugStack.lineNumber || 0,
      column: debugStack.columnNumber || 0,
      componentName
    }
  } else {
    return null
  }

  if (!sourceLocation.file || sourceLocation.line <= 0) {
    return null
  }

  return sourceLocation
}



/**
 * Normalizes file paths to be consistent across different environments
 * @param filePath - The file path to normalize
 * @returns Normalized file path
 */
export function normalizeFilePath(filePath: string): string {
  if (!filePath) return filePath

  let normalized = filePath.replace(/^webpack:\/\/\//, '')
  
  normalized = normalized.replace(/^webpack:\/\//, '')
  
  normalized = normalized.replace(/^webpack-internal:\/\/\//, '')
  
  normalized = normalized.replace(/\\/g, '/')
  
  normalized = normalized.replace(/^\.\//, '')
  
  return normalized
}

/**
 * Validates that a source location contains valid data.
 * @param sourceLocation - The source location to validate
 * @returns True if valid, false otherwise
 */
export function validateSourceLocation(sourceLocation: SourceLocation): boolean {
  return !!(
    sourceLocation.file &&
    sourceLocation.file.trim() !== '' &&
    sourceLocation.line > 0 &&
    sourceLocation.column >= 0
  )
}
