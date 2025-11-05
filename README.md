# DOM Element to Component Source

[![npm version](https://img.shields.io/npm/v/dom-element-to-component-source.svg?style=flat)](https://www.npmjs.com/package/dom-element-to-component-source) [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/itayadler/dom-element-to-component-source/blob/main/LICENSE) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/itayadler/dom-element-to-component-source/pulls)

A TypeScript library for retrieving the source location of DOM elements in React applications. Perfect for debugging tools, development utilities, and React DevTools extensions.

## Features

- **🔍 Source Location Detection** - Get the source location of any DOM element in React
- **🌳 Parent Component Chain** - Traverse up the component tree to get parent component source locations
- **⚛️ React Framework Support** - Works with React 16+ including NextJS
- **🗺️ Source Map Support** - Resolves original source locations using source maps
- **🖥️ Server-Side Source Resolution** - Resolves source locations from React Server Components using source maps

## Installation

```bash
npm install dom-element-to-component-source
```

```bash
yarn add dom-element-to-component-source
```

```bash
pnpm add dom-element-to-component-source
```

## Quick Start

### Client-Side Usage

```typescript
import { getElementSourceLocation } from 'dom-element-to-component-source'

// Get a DOM element (e.g., from a click event or querySelector)
const button = document.querySelector('button')

// Extract source location
const result = await getElementSourceLocation(button)

if (result.success) {
  console.log(`Component: ${result.data.componentName}`)
  console.log(`File: ${result.data.file}:${result.data.line}:${result.data.column}`)
  
  // Access parent component source location
  if (result.data.parent) {
    console.log(`Parent: ${result.data.parent.componentName}`)
    console.log(`Parent File: ${result.data.parent.file}:${result.data.parent.line}:${result.data.parent.column}`)
  }
} else {
  console.error('Error:', result.error)
}
```

### Server-Side Usage (React Server Components)

```typescript
import { resolveSourceLocationInServer } from 'dom-element-to-component-source'

// Resolve source location from React Server Components
const serverLocation = {
  file: 'about://React/Server/file:///path/to/.next/server/chunks/ssr/file.js',
  line: 251,
  column: 300
}

const resolved = await resolveSourceLocationInServer(serverLocation)
// resolved.file will point to the original source file (e.g., src/app/components/Intro.tsx)
console.log(`Original source: ${resolved.file}:${resolved.line}:${resolved.column}`)
```

## API Reference

### `getElementSourceLocation(element, options?)`

Retrieves the source location of a DOM element in React applications. The returned `SourceLocation` includes a recursively populated `parent` property that allows you to traverse up the component tree.

**Parameters:**
- `element: Element` - The DOM element to analyze
- `options?: SourceLocationOptions` - Configuration options
  - `maxDepth?: number` - Maximum depth to traverse up the component tree (default: 10)

**Returns:** `Promise<SourceLocationResult>`

**Example:**
```typescript
const result = await getElementSourceLocation(button, {
  maxDepth: 10
})

if (result.success) {
  // Access the component's source location
  console.log(result.data.file, result.data.line, result.data.column)
  
  // Traverse up the parent chain
  let parent = result.data.parent
  while (parent) {
    console.log(`Parent: ${parent.componentName} at ${parent.file}:${parent.line}:${parent.column}`)
    parent = parent.parent
  }
}
```

**Note:** The library automatically detects Next.js React components and uses the appropriate traversal method (`_debugOwner` for React, `.owner` for Next.js after the first `_debugOwner`).

### `resolveSourceLocationInServer(sourceLocation)`

Resolves a source location that starts with `about://React/Server` by using source maps to map from server chunk files to original source files. This is particularly useful for debugging React Server Components in Next.js applications.

**Parameters:**
- `sourceLocation: SourceLocation` - The source location with a file path starting with `about://React/Server`

**Returns:** `Promise<SourceLocation>` - The resolved source location pointing to the original source file

**Example:**
```typescript
const serverLocation = {
  file: 'about://React/Server/file:///path/to/.next/server/chunks/ssr/[root-of-the-server]__abc123._.js',
  line: 251,
  column: 300
}

const resolved = await resolveSourceLocationInServer(serverLocation)
// resolved.file: /path/to/src/app/components/Intro.tsx
// resolved.line: 6
// resolved.column: 7
```

**Note:** This function only processes source locations where `sourceLocation.file` begins with `about://React/Server/`. If the file path doesn't match this pattern, the original source location is returned unchanged.

### Types

```typescript
interface SourceLocation {
  file: string
  line: number
  column: number
  componentName?: string
  parent?: SourceLocation
}

interface SourceLocationOptions {
  maxDepth?: number
}

type SourceLocationResult = 
  | { success: true; data: SourceLocation }
  | { success: false; error: string }
```

## Requirements

- **React 16+** - Required for Fiber node access
- **Development Mode** - Only works in development mode

## Troubleshooting

### "This library only works in development mode"

This error occurs when the library is used in production. Make sure you're running your React app in development mode:

```bash
# For Create React App
npm start

# For Next.js
npm run dev

# For Vite
npm run dev
```

### "No React Fiber node found on element"

This error occurs when the DOM element doesn't have React internals attached. This can happen if:

1. The element is not rendered by React
2. React is not in development mode
3. The element is from a different React tree

### "No debug source information found"

This error occurs when React debug information is not available. Make sure:

1. React is in development mode
2. Source maps are enabled in your build configuration
3. The component was rendered by React

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © [Itay Adler](https://github.com/itayadler)