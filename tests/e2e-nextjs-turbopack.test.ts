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

describe('E2E Next.js Turbopack - getElementSourceLocation Test', () => {
  let devServer: ChildProcess | null = null
  const SERVER_PORT = 3002
  const SERVER_URL = `http://localhost:${SERVER_PORT}`
  const NEXTJS_FIXTURE_PATH = join(__dirname, 'fixtures', 'nextjs-turbopack')

  beforeAll(async () => {
    console.log('📦 Installing dependencies...')
    
    // Install dependencies first
    const installProcess = spawn('yarn', ['install'], {
      cwd: NEXTJS_FIXTURE_PATH,
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
    
    console.log('🚀 Starting Next.js Turbopack dev server...')
    
    devServer = spawn('yarn', ['dev'], {
      cwd: NEXTJS_FIXTURE_PATH,
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
    console.log('✅ Next.js Turbopack dev server is ready!')
  })

  afterAll(async () => {
    if (devServer) {
      console.log('🛑 Shutting down Next.js Turbopack dev server...')
      devServer.kill('SIGTERM')
      
      await setTimeout(2000)
      
      if (!devServer.killed) {
        devServer.kill('SIGKILL')
      }
      
      devServer = null
      console.log('✅ Next.js Turbopack dev server stopped')
    }
  })

  it('should extract source location from h2 tag in Card component in real browser', async () => {
    const browser = await chromium.launch({ headless: true })
    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      console.log('Navigating to Next.js Turbopack app...')
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
      expect(result.data.file).toContain('Card.tsx')
      expect(result.data.line).toBe(19)
      expect(result.data.column).toBe(7)
      expect(result.data.componentName).toBe('Card')
      
    } finally {
      await browser.close()
    }
  })
})
