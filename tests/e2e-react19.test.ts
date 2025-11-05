import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { chromium } from 'playwright'
import { join } from 'path'
import { spawn, ChildProcess } from 'child_process'
import { setTimeout } from 'timers/promises'

async function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const startTime = Date.now()
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        return
      }
    } catch (error) {
    }
    
    await setTimeout(1000)
  }
  
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`)
}

describe('E2E React 19 - getElementSourceLocation Test', () => {
  let devServer: ChildProcess | null = null
  const SERVER_PORT = 3001
  const SERVER_URL = `http://localhost:${SERVER_PORT}`
  const REACT19_FIXTURE_PATH = join(__dirname, 'fixtures', 'react19')

  beforeAll(async () => {
    console.log('📦 Installing dependencies...')
    
    // Install dependencies first
    const installProcess = spawn('yarn', ['install'], {
      cwd: REACT19_FIXTURE_PATH,
      stdio: 'pipe',
      shell: true
    })
    
    await new Promise<void>((resolve, reject) => {
      installProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Dependencies installed successfully')
          resolve()
        } else {
          reject(new Error(`yarn install failed with code ${code}`))
        }
      })
      
      installProcess.on('error', (error) => {
        reject(error)
      })
    })
    
    console.log('🚀 Starting React 19 dev server...')
    
    devServer = spawn('yarn', ['dev'], {
      cwd: REACT19_FIXTURE_PATH,
      stdio: 'pipe',
      shell: true
    })

    devServer.on('error', (error) => {
      console.error('❌ Failed to start dev server:', error)
      throw error
    })

    devServer.stdout?.on('data', (data) => {
      console.log('📝 Dev server output:', data.toString())
    })

    devServer.stderr?.on('data', (data) => {
      console.error('⚠️  Dev server error:', data.toString())
    })

    await waitForServer(SERVER_URL, 30000)
    console.log('✅ React 19 dev server is ready!')
  })

  afterAll(async () => {
    if (devServer) {
      console.log('🛑 Shutting down React 19 dev server...')
      devServer.kill('SIGTERM')
      
      await setTimeout(2000)
      
      if (!devServer.killed) {
        devServer.kill('SIGKILL')
      }
      
      devServer = null
      console.log('✅ React 19 dev server stopped')
    }
  })

  it('should extract source location with parent from h2 tag in Card component', async () => {
    const browser = await chromium.launch({ headless: true })
    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      console.log('Navigating to React 19 app...')
      await page.goto(SERVER_URL)
      console.log(`Using app URL: ${SERVER_URL}`)
      
      console.log('Waiting for card component...')
      await page.waitForSelector('[data-testid="card-component"]', { timeout: 10000 })
      
      //@ts-ignore
      await page.waitForFunction(() => typeof window.getElementSourceLocation === 'function', { timeout: 10000 })
      
      const h2Element = await page.$('h2.card-title')
      expect(h2Element).toBeTruthy()
      
      const result = await page.evaluate(() => {
        const h2 = document.querySelector('h2.card-title')
        if (!h2) return null
        
        //@ts-ignore
        return window.getElementSourceLocation(h2)
      })
      
      expect(result).toBeTruthy()
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      
      // Verify basic source location fields (from first test)
      expect(result.data.file).toContain('Card.tsx')
      expect(result.data.line).toBe(17)
      expect(result.data.column).toBe(6)
      expect(result.data.componentName).toBe('Card')
      
      // Verify first parent (App.tsx) - all properties
      const firstParent = result.data.parent
      expect(firstParent).toBeDefined()
      expect(firstParent).not.toBeNull()
      expect(firstParent.file).toBeDefined()
      expect(firstParent.file).toContain('App.tsx')
      expect(firstParent.line).toBeGreaterThan(0)
      expect(firstParent.column).toBeGreaterThanOrEqual(0)
      expect(firstParent.componentName).toBe('App')
      
      // Verify second parent (main.tsx) - all properties
      const secondParent = firstParent.parent
      expect(secondParent).toBeDefined()
      expect(secondParent).not.toBeNull()
      expect(secondParent.file).toBeDefined()
      expect(secondParent.file).toContain('main.tsx')
      expect(secondParent.line).toBeGreaterThan(0)
      expect(secondParent.column).toBeGreaterThanOrEqual(0)
      // componentName may be undefined for main.tsx (it's the entry point)
      
      console.log('First parent (App):', firstParent)
      console.log('Second parent (main):', secondParent)
      
    } finally {
      await browser.close()
    }
  })
})