'use client'

import React, { useState } from 'react'
import { Card } from './Card'
import { getElementSourceLocation } from "../../../../../src/getElementSourceLocation";

//@ts-ignore
globalThis.getElementSourceLocation = getElementSourceLocation

export function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="test-app">
      <h1>Next.js Turbopack E2E Test</h1>
      <Card title="Counter Card">
        <p>Count: {count}</p>
        <button 
          onClick={(e) => {
            e.stopPropagation()
            setCount(c => c + 1)
          }}
          data-testid="increment-button"
        >
          Increment
        </button>
        <button 
          onClick={(e) => {
            e.stopPropagation()
            setCount(0)
          }}
          data-testid="reset-button"
        >
          Reset
        </button>
      </Card>
    </div>
  )
}
