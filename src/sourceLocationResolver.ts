import { SourceLocation, ReactFiberNode } from './types'
import ErrorStackParser from 'error-stack-parser'
import StackTraceGPS from 'stacktrace-gps'

function getComponentName(fiberNode: ReactFiberNode): string | null {
  // First check if the fiber node itself has a component name
  // This is important for ForwardRef components which have displayName set
  const nodeType = (fiberNode as any).type
  if (nodeType) {
    // Check displayName first (set via Component.displayName = 'Name')
    if (nodeType.displayName) {
      return nodeType.displayName
    }
    // For ForwardRef, check the render function name
    if (nodeType.render?.name) {
      return nodeType.render.name
    }
    // Regular component name
    if (nodeType.name) {
      return nodeType.name
    }
  }

  // Fall back to climbing the _debugOwner chain
  let current = fiberNode._debugOwner
  let previous: ReactFiberNode | null = null
  
  while (current) {
    if (current === previous) {
      break
    }
    
    // For ForwardRef nodes (tag 11), check displayName first
    if ((current as any).tag === 11) {
      const type = (current as any).type
      if (type?.displayName) {
        return type.displayName
      }
      if (type?.render?.name) {
        return type.render.name
      }
      previous = current
      current = current._debugOwner
      continue
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
  // If this is a ForwardRef node (tag 11), skip it and use its _debugOwner instead
  let nodeToCheck = fiberNode
  if ((fiberNode as any).tag === 11 && fiberNode._debugOwner) {
    nodeToCheck = fiberNode._debugOwner
  }

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
