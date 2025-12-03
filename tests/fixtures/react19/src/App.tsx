import React, { useState } from 'react'
import { Card } from './Card'
import { Button } from './Button'

export function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="test-app">
      <h1>React 19 E2E Test</h1>
      <Card title="Counter Card">
        <p>Count: {count}</p>
        <Button 
          onClick={(e) => {
            e.stopPropagation()
            setCount(c => c + 1)
          }}
          data-testid="increment-button"
        >
          Increment
        </Button>
        <Button 
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation()
            setCount(0)
          }}
          data-testid="reset-button"
        >
          Reset
        </Button>
      </Card>
    </div>
  )
}
