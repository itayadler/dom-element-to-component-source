import { 
  SourceLocationResult, 
  DomElementWithReactInternals, 
  ReactFiberNode,
  SourceLocationOptions,
  SourceLocation
} from './types'
import { 
  parseDebugStack,
  validateSourceLocation 
} from './sourceLocationResolver'

/**
 * Traverses up the React Fiber tree to find a fiber node with debug stack information
 * @param fiberNode - The starting fiber node
 * @param maxDepth - Maximum depth to traverse (default: 10)
 * @returns The first React Fiber node with debug stack information, or null if not found
 */
function findFiberWithDebugStack(fiberNode: ReactFiberNode, maxDepth: number = 10): ReactFiberNode | null {
  let current = fiberNode
  let depth = 0

  while (current && depth < maxDepth) {
    if (hasDebugStack(current)) {
      return current
    }

    if (current.return) {
      current = current.return
      depth++
      continue
    }

    if (current.sibling) {
      const siblingResult = findFiberWithDebugStack(current.sibling, maxDepth - depth)
      if (siblingResult) {
        return siblingResult
      }
    }

    break
  }

  return null
}

/**
 * Checks if a fiber node has debug stack information
 * @param fiberNode - The React Fiber node to check
 * @returns True if the node has debug stack information
 */
function hasDebugStack(fiberNode: ReactFiberNode): boolean {
  return !!(fiberNode._debugStack || (fiberNode as any).debugStack || fiberNode._debugSource)
}

/**
 * Gets the parent source location by traversing up the component tree
 * @param fiberNode - The starting React Fiber node
 * @param maxDepth - Maximum depth to traverse (default: 10)
 * @param isNextJs - Whether this is Next.js React (detected from first call)
 * @returns The parent source location with recursively populated parent, or null if not found
 */
async function getParentSourceLocation(
  fiberNode: ReactFiberNode,
  maxDepth: number = 10,
  isNextJs?: boolean
): Promise<SourceLocation | null> {
  if (maxDepth <= 0) {
    return null
  }

  const current = fiberNode._debugOwner
  if (!current) {
    return null
  }

  // Detect if this is Next.js React on first call by checking if the first _debugOwner has env === "Server"
  if (isNextJs === undefined) {
    isNextJs = (current as any).env === "Server"
  }

  // Check if this node has debug stack information
  if (hasDebugStack(current)) {
    const parentLocation = await parseDebugStack(current)
    if (parentLocation && validateSourceLocation(parentLocation)) {
      // Recursively get the parent's parent source location
      const grandParentLocation = await getParentSourceLocation(current, maxDepth - 1, isNextJs)
      if (grandParentLocation) {
        parentLocation.parent = grandParentLocation
      }
      return parentLocation
    }
  }

  // For Next.js: after checking first _debugOwner, switch to using .owner
  // For React: continue climbing _debugOwner
  const nextNode = isNextJs ? current.owner : current._debugOwner
  
  if (nextNode) {
    // Create a wrapper to continue the recursion
    return getParentSourceLocation({ _debugOwner: nextNode } as ReactFiberNode, maxDepth - 1, isNextJs)
  }

  return null
}

/**
 * Extracts a React Fiber node from a DOM element
 * @param element - The DOM element to analyze
 * @returns The React Fiber node or null if not found
 */
function extractFiberNode(element: Element): ReactFiberNode | null {
  const elementWithReact = element as DomElementWithReactInternals

  const possibleFiberNodes = [
    elementWithReact._reactInternals,
    elementWithReact._reactInternalFiber,
    elementWithReact.__reactInternalInstance,
    elementWithReact._reactInternalInstance
  ]

  for (const fiberNode of possibleFiberNodes) {
    if (fiberNode) {
      return fiberNode
    }
  }

  const elementKeys = Object.keys(elementWithReact)
  for (const key of elementKeys) {
    if (key.startsWith('__reactFiber$') || key.startsWith('_reactFiber$')) {
      const fiberNode = (elementWithReact as any)[key]
      if (fiberNode && typeof fiberNode === 'object') {
        return fiberNode
      }
    }
  }

  return null
}

/**
 * Retrieves the source location of a DOM element in a React application
 * 
 * This function extracts the original source location of a DOM element by traversing
 * the React Fiber tree and accessing debug stack information. It supports both
 * webpack and Next.js/Turbopack builds with source map resolution.
 * 
 * @param element - The DOM element to analyze
 * @param options - Configuration options for source location extraction
 * @returns Promise<SourceLocationResult> containing either the source location or an error
 * 
 * @example
 * ```typescript
 * const button = document.querySelector('button')
 * const result = await getElementSourceLocation(button)
 * if (result.success) {
 *   console.log(`Component: ${result.data.componentName}`)
 *   console.log(`File: ${result.data.file}:${result.data.line}:${result.data.column}`)
 * }
 * ```
 * 
 * @example
 * ```typescript
 * const result = await getElementSourceLocation(button)
 * ```
 */
export async function getElementSourceLocation(
  element: Element, 
  options: SourceLocationOptions = {}
): Promise<SourceLocationResult> {
  try {
    const elementInstance = element.ownerDocument.defaultView?.Element || Element
    if (!element || !(element instanceof elementInstance)) {
      return {
        success: false,
        error: 'Invalid element provided'
      }
    }

    const fiberNode = extractFiberNode(element)
    if (!fiberNode) {
      return {
        success: false,
        error: 'No React Fiber node found on element'
      }
    }

    const maxDepth = options.maxDepth || 10
    const fiberWithDebugStack = findFiberWithDebugStack(fiberNode, maxDepth)
    
    if (!fiberWithDebugStack) {
      return {
        success: false,
        error: 'No debug stack information found in fiber tree'
      }
    }

    let sourceLocation = await parseDebugStack(fiberWithDebugStack)
    if (!sourceLocation) {
      return {
        success: false,
        error: 'No debug stack information found on Fiber node'
      }
    }

    if (!validateSourceLocation(sourceLocation)) {
      return {
        success: false,
        error: 'Invalid source location data found'
      }
    }

    // Get parent source location by traversing up the component tree
    const parent = await getParentSourceLocation(fiberWithDebugStack, maxDepth)
    if (parent) {
      sourceLocation.parent = parent
    }

    return {
      success: true,
      data: sourceLocation
    }
  } catch (error) {
    return {
      success: false,
      error: `Error extracting source location: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}
