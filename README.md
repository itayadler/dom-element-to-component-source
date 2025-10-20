# dom-element-to-component-source

[![npm version](https://img.shields.io/npm/v/dom-element-to-component-source.svg?style=flat)](https://www.npmjs.com/package/dom-element-to-component-source) [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/itayadler/dom-element-to-component-source/blob/main/LICENSE) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/itayadler/dom-element-to-component-source/pulls)

A TypeScript library for retrieving the source location of DOM elements in React applications. Perfect for debugging tools, development utilities, and React DevTools extensions.

## Features

- **🔍 Source Location Detection** - Get the source location of any DOM element in React
- **⚛️ React Framework Support** - Works with React 16+ including React 19
- **🗺️ Source Map Support** - Resolves original source locations using source maps

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

```typescript
import { getElementSourceLocation } from 'dom-element-to-component-source'

// Get a DOM element (e.g., from a click event or querySelector)
const button = document.querySelector('button')

// Extract source location
const result = await getElementSourceLocation(button)

if (result.success) {
  console.log(`Component: ${result.data.componentName}`)
  console.log(`File: ${result.data.file}:${result.data.line}:${result.data.column}`)
} else {
  console.error('Error:', result.error)
}
```

## Usage Examples

### Basic Usage

```typescript
import { getElementSourceLocation, getElementSourceLocationSync } from 'dom-element-to-component-source'

// Async version with source map resolution
const result = await getElementSourceLocation(element, {
  resolveSourceMaps: true,
  includeSourceCode: false
})

// Sync version (faster, no source map resolution)
const result = getElementSourceLocationSync(element)
```

### React Event Handler

```typescript
import { getElementSourceLocation } from 'dom-element-to-component-source'

function MyComponent() {
  const handleClick = (event: React.MouseEvent) => {
    getElementSourceLocation(event.currentTarget).then(result => {
      if (result.success) {
        console.log('Source location:', result.data)
        // { file: '/src/MyComponent.tsx', line: 15, column: 8, componentName: 'MyComponent' }
      }
    })
  }

  return <button onClick={handleClick}>Click me</button>
}
```

### Next.js with Turbopack

```typescript
// In your Next.js app with Turbopack
import { getElementSourceLocation } from 'dom-element-to-component-source'

export default function MyPage() {
  const handleClick = (event: React.MouseEvent) => {
    const result = await getElementSourceLocation(event.currentTarget)
    if (result.success) {
      console.log('Source location:', result.data)
    }
  }

  return <button onClick={handleClick}>Click me</button>
}
```

### React 19

```typescript
// In your React 19 app
import { getElementSourceLocation } from 'dom-element-to-component-source'

function MyComponent() {
  const handleClick = (event: React.MouseEvent) => {
    const result = await getElementSourceLocation(event.currentTarget)
    if (result.success) {
      console.log(`Component: ${result.data.componentName}`)
      console.log(`File: ${result.data.file}:${result.data.line}:${result.data.column}`)
    }
  }

  return <button onClick={handleClick}>Click me</button>
}
```

## API Reference

### `getElementSourceLocation(element, options?)`

Retrieves the source location of a DOM element in React applications.

**Parameters:**
- `element: Element` - The DOM element to analyze
- `options?: SourceLocationOptions` - Configuration options

**Returns:** `Promise<SourceLocationResult>`

**Example:**
```typescript
const result = await getElementSourceLocation(button, {
  resolveSourceMaps: true,
  includeSourceCode: true,
  maxDepth: 10
})
```

### `getElementSourceLocationSync(element, options?)`

Synchronous version that skips source map resolution for better performance.

**Parameters:**
- `element: Element` - The DOM element to analyze
- `options?: Omit<SourceLocationOptions, 'resolveSourceMaps' | 'sourceMapConsumer'>` - Configuration options

**Returns:** `SourceLocationResult`

### Types

```typescript
interface SourceLocation {
  file: string
  line: number
  column: number
  componentName?: string
  sourceCode?: string
}

interface SourceLocationOptions {
  includeSourceCode?: boolean
  resolveSourceMaps?: boolean
  sourceMapConsumer?: SourceMapConsumer
  maxDepth?: number
}

type SourceLocationResult = 
  | { success: true; data: SourceLocation }
  | { success: false; error: string }
```

## Requirements

- **React 16+** - Required for Fiber node access
- **Development Mode** - Only works in development mode
- **Debug Source Maps** - Requires React debug information to be enabled

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

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