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
      // If this is a ForwardRef node (tag 11), check its _debugOwner instead
      if ((current as any).tag === 11 && current._debugOwner) {
        const ownerWithDebugStack = findFiberWithDebugStack(current._debugOwner, maxDepth - depth)
        if (ownerWithDebugStack) {
          return ownerWithDebugStack
        }

      }
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
 * Gets the source location for a DOM element
 * @param element - The DOM element
 * @param maxDepth - Maximum depth to traverse in fiber tree (default: 10)
 * @returns The source location with tagName, or null if not found
 */
async function getElementSourceLocationInternal(
  element: Element,
  maxDepth: number = 10
): Promise<SourceLocation | null> {
  const fiberNode = extractFiberNode(element)
  if (!fiberNode) {
    return null
  }

  // First try to use the fiber node directly attached to the element
  if (hasDebugStack(fiberNode)) {
    const sourceLocation = await parseDebugStack(fiberNode)
    if (sourceLocation && validateSourceLocation(sourceLocation)) {
      sourceLocation.tagName = element.tagName
      return sourceLocation
    }
  }

  // If the direct fiber doesn't have debug stack, traverse up the fiber tree
  const fiberWithDebugStack = findFiberWithDebugStack(fiberNode, maxDepth)
  if (!fiberWithDebugStack) {
    return null
  }

  const sourceLocation = await parseDebugStack(fiberWithDebugStack)
  if (!sourceLocation || !validateSourceLocation(sourceLocation)) {
    return null
  }

  // Add tagName to the source location
  sourceLocation.tagName = element.tagName

  return sourceLocation
}

/**
 * Gets the immediate parent DOM element's source location
 * @param element - The starting DOM element
 * @param maxDepth - Maximum depth to traverse (default: 10)
 * @returns The parent element's source location with recursively populated parents, or null if not found
 */
async function getParentSourceLocation(
  element: Element,
  maxDepth: number = 10
): Promise<SourceLocation | null> {
  if (maxDepth <= 0) {
    return null
  }

  // Get the immediate parent DOM element
  const parentElement = element.parentElement
  if (!parentElement) {
    return null
  }

  // Get source location for the parent element
  const parentLocation = await getElementSourceLocationInternal(parentElement, maxDepth)
  if (!parentLocation) {
    // If no source location found, try climbing further up the DOM tree
    return getParentSourceLocation(parentElement, maxDepth - 1)
  }

  // Recursively get the parent's parent element source location
  const grandParentLocation = await getParentSourceLocation(parentElement, maxDepth - 1)
  if (grandParentLocation) {
    parentLocation.parent = grandParentLocation
  }

  return parentLocation
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

    // Add tagName to the source location
    sourceLocation.tagName = element.tagName

    // Get parent element source location (immediate DOM parent)
    const parent = await getParentSourceLocation(element, maxDepth)
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

