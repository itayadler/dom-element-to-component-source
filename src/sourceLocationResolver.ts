import { SourceLocation, ReactFiberNode } from './types'
import ErrorStackParser from 'error-stack-parser'
import StackTraceGPS from 'stacktrace-gps'

/**
 * Extracts file path from a stack trace frame
 */
async function extractFilePathFromStack(debugStack: Error | { fileName: string; lineNumber: number; columnNumber: number }): Promise<string | null> {
  if (debugStack && 'fileName' in debugStack) {
    return debugStack.fileName || null
  }
  
  if (debugStack && 'stack' in debugStack && typeof debugStack.stack === 'string') {
    try {
      const stackFrames = ErrorStackParser.parse(debugStack as Error)
      if (stackFrames.length >= 2) {
        const targetFrame = stackFrames[1]
        const gps = new StackTraceGPS()
        const originalFrame = await gps.getMappedLocation(targetFrame)
        const fileName = originalFrame.fileName || targetFrame.fileName || ''
        return fileName.split('?')[0]
      }
    } catch {
      try {
        const stackFrames = ErrorStackParser.parse(debugStack as Error)
        if (stackFrames.length >= 2) {
          const targetFrame = stackFrames[1]
          const fileName = targetFrame.fileName || ''
          return fileName.split('?')[0]
        }
      } catch {
        // Ignore parsing errors
      }
    }
  }
  
  return null
}

const FORWARD_REF_TAG = 11

/**
 * Skips ForwardRef nodes (tag 11) by following _debugOwner
 */
function skipForwardRefs(fiber: ReactFiberNode): ReactFiberNode {
  let current = fiber
  while ((current as any).tag === FORWARD_REF_TAG && current._debugOwner) {
    current = current._debugOwner
  }
  return current
}

/**
 * Gets the component name from a fiber node, skipping ForwardRef nodes
 */
function getComponentName(fiberNode: ReactFiberNode): string | null {
  const node = skipForwardRefs(fiberNode)
  
  const nodeType = (node as any).type
  if (nodeType) {
    if (nodeType.displayName) return nodeType.displayName
    if (nodeType.render?.name) return nodeType.render.name
    if (nodeType.name) return nodeType.name
  }
  
  if ((node as any).name) return (node as any).name
  
  return null
}

/**
 * Finds a fiber node whose stack trace doesn't include node_modules
 * Traverses up _debugOwner chain until finding one without node_modules
 */
async function findNodeWithoutNodeModules(fiberNode: ReactFiberNode): Promise<ReactFiberNode> {
  let current: ReactFiberNode | null = fiberNode
  
  while (current) {
    const debugStack = current._debugStack || (current as any).debugStack || current._debugSource
    if (debugStack) {
      const filePath = await extractFilePathFromStack(debugStack)
      if (filePath && !filePath.includes('node_modules')) {
        return current
      }
    }
    
    // Move up the chain
    if (current._debugOwner) {
      current = current._debugOwner
    } else {
      break
    }
  }
  
  // If we didn't find one without node_modules, return the original
  return fiberNode
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
  // If the stack trace includes node_modules, find a node without it
  const nodeToCheck = await findNodeWithoutNodeModules(fiberNode)

  let debugStack: Error | { fileName: string; lineNumber: number; columnNumber: number } | null = null

  if (!debugStack) {
    debugStack = nodeToCheck._debugStack || null
  }
  
  if (!debugStack) {
    debugStack = (nodeToCheck as any).debugStack || null
  }
  
  if (!debugStack) {
    debugStack = nodeToCheck._debugSource || null
  }

  if (!debugStack) {
    return null
  }

  let componentName: string | undefined = getComponentName(nodeToCheck) || undefined

  let sourceLocation: SourceLocation

  if (debugStack && 'stack' in debugStack && typeof debugStack.stack === 'string') {
    try {
      const stackFrames = ErrorStackParser.parse(debugStack as Error)
      
      if (stackFrames.length >= 2) {
        const targetFrame = stackFrames[1]
        
        const gps = new StackTraceGPS()
        const originalFrame = await gps.getMappedLocation(targetFrame)
        
        const rawFileName = originalFrame.fileName || targetFrame.fileName || ''
        // Remove query parameters (e.g., ?35) from the file path
        const cleanedFileName = rawFileName.split('?')[0]
        
        sourceLocation = {
          file: cleanedFileName,
          line: originalFrame.lineNumber || targetFrame.lineNumber || 0,
          column: originalFrame.columnNumber || targetFrame.columnNumber || 0,
          componentName
        }
      } else {
        return null
      }
    } catch (error) {
      try {
        const stackFrames = ErrorStackParser.parse(debugStack as Error)
        if (stackFrames.length >= 2) {
          const targetFrame = stackFrames[1]
          const rawFileName = targetFrame.fileName || ''
          // Remove query parameters (e.g., ?35) from the file path
          const cleanedFileName = rawFileName.split('?')[0]
          
          sourceLocation = {
            file: cleanedFileName,
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
    const rawFileName = debugStack.fileName || ''
    // Remove query parameters (e.g., ?35) from the file path
    const cleanedFileName = rawFileName.split('?')[0]
    
    sourceLocation = {
      file: cleanedFileName,
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
