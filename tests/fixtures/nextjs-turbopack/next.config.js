const path = require("path")

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname.split(path.sep).slice(0, -3).join(path.sep),
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
}

module.exports = nextConfig
