import { describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import { resolveSourceLocationInServer } from '../src'

describe('resolveSourceLocationInServer', () => {
  it('maps about://React/Server file:// path to original source via source-map', async () => {
    // Use paths relative to the project root to work on any machine
    const projectRoot = resolve(__dirname, '..')
    const fixturePath = resolve(projectRoot, 'tests/fixtures/server-source-map')
    const serverChunkPath = resolve(
      fixturePath,
      '.next/server/chunks/ssr/[root-of-the-server]__925b01b7._.js'
    )
    const expectedSourcePath = resolve(
      fixturePath,
      'src/app/_components/intro.tsx'
    )

    // Construct the about://React/Server URL with proper encoding
    // Brackets need to be URL encoded as %5B and %5D
    const serverUrl = `about://React/Server/file://${serverChunkPath}`.replace(/\[/g, '%5B').replace(/\]/g, '%5D')
    const serverReported = {
      file: serverUrl,
      line: 251,
      column: 300
    }

    const mapped = await resolveSourceLocationInServer(serverReported as any)

    expect(mapped.file).toBeTruthy()
    // Should not be the server chunk path
    expect(mapped.file).not.toContain('.next/server/chunks')
    // Should point to the original source file (intro.tsx based on the source map)
    expect(mapped.file).toBe(expectedSourcePath)
    expect(mapped.line).toBeGreaterThan(0)
    expect(mapped.column).toBeGreaterThanOrEqual(0)
  })

  it('returns original sourceLocation if file does not start with about://React/Server', async () => {
    const sourceLocation = {
      file: '/some/regular/path.tsx',
      line: 10,
      column: 5
    }

    const result = await resolveSourceLocationInServer(sourceLocation)

    expect(result).toEqual(sourceLocation)
  })
})


