import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { getElementSourceLocation } from '../../../../src/getElementSourceLocation'

//ts-ignore
if (typeof window !== 'undefined') {
  (window as any).getElementSourceLocation = getElementSourceLocation
}

const root = createRoot(document.getElementById('root')!)
root.render(<App />)
