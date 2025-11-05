# Changelog

## [0.3.0]

### Added
- `parent` property to `SourceLocation` interface - recursively populated parent component source locations
- Support for traversing up the React component tree via `_debugOwner` and `.owner` (for Next.js)
- Automatic detection of Next.js React components using `env === "Server"` check

## [0.2.0]

### Added
- `resolveSourceLocationInServer` function to resolve source locations from React Server Components

## [0.1.4] - 2025-10-20

- Update README.md
- Remove unused dependency

## [0.1.3] - 2025-10-20

- Initial release
- NextJS and React19 support with source maps
- E2E tests for both NextJS and React19
