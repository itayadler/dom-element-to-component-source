// Core types for the dom-element-to-component-source library

/**
 * Represents the source location of a DOM element in the original source code
 */
export interface SourceLocation {
  /** The file path where the component is defined */
  file: string
  /** The line number in the source file */
  line: number
  /** The column number in the source file */
  column: number
  /** The name of the React component (if available) */
  componentName?: string
  /** The original source code at this location (if available) */
  sourceCode?: string
}

/**
 * Represents a React Fiber node with debug stack information
 */
export interface ReactFiberNode {
  /** Debug stack information (React 16+) - Error object with stack property */
  _debugStack?: Error
  name: string
  /** Component type information */
  type?: {
    name?: string
    displayName?: string
  }
  /** Alternative debug source location (older React versions) */
  _debugSource?: {
    fileName: string
    lineNumber: number
    columnNumber: number
  }
  _debugOwner?: ReactFiberNode
  /** Parent fiber node */
  return?: ReactFiberNode
  /** Child fiber node */
  child?: ReactFiberNode
  /** Sibling fiber node */
  sibling?: ReactFiberNode
}

/**
 * DOM element extended with React internal properties
 * Note: React may also add dynamic properties like __reactFiber$* or _reactFiber$* 
 * with random postfixes that are handled at runtime
 */
export interface DomElementWithReactInternals extends Element {
  /** React 16+ internal fiber reference */
  _reactInternalFiber?: ReactFiberNode
  /** React 16+ internal reference */
  _reactInternals?: ReactFiberNode
  /** React 15 internal instance reference */
  __reactInternalInstance?: ReactFiberNode
  /** Alternative React internal reference */
  _reactInternalInstance?: ReactFiberNode
}

/**
 * Result type for source location extraction
 */
export type SourceLocationResult = 
  | { success: true; data: SourceLocation }
  | { success: false; error: string }

/**
 * Source map consumer interface for resolving original positions
 */
export interface SourceMapConsumer {
  originalPositionFor(position: { line: number; column: number }): {
    source: string | null
    line: number | null
    column: number | null
    name: string | null
  }
}


/**
 * Configuration options for source location extraction
 */
export interface SourceLocationOptions {
  /** Maximum depth to traverse up the fiber tree */
  maxDepth?: number
}