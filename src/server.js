#!/usr/bin/env node

/**
 * Model Context Protocol (MCP) Server
 * Part of GitHub Scrapers & OpenClaw Automation Suite
 * Author: NeoShaurya (https://neoshaurya.com)
 *
 * Implements standard JSON-RPC 2.0 stdio protocol for OpenClaw,
 * Claude Desktop, Cursor, and AI agents.
 */

import readline from 'readline'
import {
  checkRepoPrivacy,
  scrapeGitHubProfile,
  scrapeGitHubRepos,
  scrapeRepoReadme,
  scrapeRepoScreenshots,
} from './github-scraper.js'
import { generateAiDescription } from './ai-describer.js'
import { renderProjectSvgString } from './svg-generator.js'
import { runSync } from './sync-runner.js'

const TOOLS = [
  {
    name: 'scrape_github_profile',
    description: 'Scrapes public GitHub profile information (bio, avatar, followers, repos count).',
    inputSchema: {
      type: 'object',
      properties: {
        username: { type: 'string', description: 'GitHub username to inspect (default: "NeoShaurya")' },
      },
    },
  },
  {
    name: 'scrape_github_repos',
    description: 'Scrapes public repositories with star counts, languages, topics, and URLs.',
    inputSchema: {
      type: 'object',
      properties: {
        username: { type: 'string', description: 'GitHub username (default: "NeoShaurya")' },
        limit: { type: 'number', description: 'Maximum repos to fetch (default: 30)' },
        sort: { type: 'string', enum: ['updated', 'created', 'pushed', 'stars'], description: 'Sort criteria' },
      },
    },
  },
  {
    name: 'scrape_repo_readme',
    description: 'Fetches the raw README markdown of any repository on GitHub.',
    inputSchema: {
      type: 'object',
      properties: {
        repo: { type: 'string', description: 'Repository name (e.g. "ShopDesk")' },
        username: { type: 'string', description: 'GitHub username (default: "NeoShaurya")' },
      },
      required: ['repo'],
    },
  },
  {
    name: 'scrape_repo_screenshots',
    description: 'Extracts all screenshots, images, and visual diagrams from a repository and its README.',
    inputSchema: {
      type: 'object',
      properties: {
        repo: { type: 'string', description: 'Repository name (e.g. "ShopDesk")' },
        username: { type: 'string', description: 'GitHub username (default: "NeoShaurya")' },
        branch: { type: 'string', description: 'Branch name (default: "main")' },
      },
      required: ['repo'],
    },
  },
  {
    name: 'check_repo_privacy',
    description: 'Checks if a repository exists on GitHub and whether it is public or private.',
    inputSchema: {
      type: 'object',
      properties: {
        repo: { type: 'string', description: 'Repository name' },
        username: { type: 'string', description: 'GitHub username' },
      },
      required: ['repo'],
    },
  },
  {
    name: 'generate_ai_description',
    description: 'Uses Google Gemini Cloud AI or Local Ollama to generate a punchy 1-2 sentence neo-brutalist project description.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Project or repository name' },
        description: { type: 'string', description: 'Existing repository description' },
        language: { type: 'string', description: 'Primary programming language' },
        topics: { type: 'array', items: { type: 'string' }, description: 'Repository tags or topics' },
        readme: { type: 'string', description: 'README excerpt or overview' },
      },
      required: ['name'],
    },
  },
  {
    name: 'generate_project_svg',
    description: 'Renders raw Neo-Brutalist SVG badge preview for a software build.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Project title' },
        language: { type: 'string', description: 'Programming language or stack' },
        priceTag: { type: 'string', description: 'Badge label (e.g. "OPEN SOURCE", "DESKTOP")' },
        accentColor: { type: 'string', enum: ['bg-gumroad-pink', 'bg-gumroad-yellow', 'bg-gumroad-teal', 'bg-gumroad-orange'] },
      },
      required: ['title'],
    },
  },
  {
    name: 'sync_all_github_projects',
    description: 'Runs the full autonomous synchronization pipeline: checks README SHA-256 hashes, downloads screenshots, updates copy, and writes output.',
    inputSchema: {
      type: 'object',
      properties: {
        username: { type: 'string', description: 'GitHub username' },
        forceUpdate: { type: 'boolean', description: 'Force re-generation of all descriptions' },
      },
    },
  },
]

async function executeTool(name, args = {}) {
  switch (name) {
    case 'scrape_github_profile':
      return await scrapeGitHubProfile(args.username)

    case 'scrape_github_repos':
      return await scrapeGitHubRepos({
        username: args.username,
        limit: args.limit,
        sort: args.sort,
      })

    case 'scrape_repo_readme':
      return await scrapeRepoReadme(args.repo, args.username)

    case 'scrape_repo_screenshots': {
      const readmeData = await scrapeRepoReadme(args.repo, args.username)
      return await scrapeRepoScreenshots(
        args.repo,
        args.username,
        readmeData.readme || '',
        args.branch || readmeData.branch || 'main'
      )
    }

    case 'check_repo_privacy':
      return await checkRepoPrivacy(args.repo, args.username)

    case 'generate_ai_description':
      return { description: await generateAiDescription(args) }

    case 'generate_project_svg':
      return { svg: renderProjectSvgString(args) }

    case 'sync_all_github_projects':
      return await runSync({
        username: args.username,
        forceUpdate: Boolean(args.forceUpdate),
      })

    default:
      throw new Error(`Tool not found: ${name}`)
  }
}

async function handleRpc(request) {
  const { id, method, params } = request

  if (method === 'tools/list') {
    return { jsonrpc: '2.0', id, result: { tools: TOOLS } }
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params || {}
    try {
      const toolResult = await executeTool(name, args || {})
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: JSON.stringify(toolResult, null, 2) }],
          isError: false,
        },
      }
    } catch (err) {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: `Tool error: ${err.message}` }],
          isError: true,
        },
      }
    }
  }

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: {
          name: 'github-scrapers-mcp',
          version: '1.0.0',
        },
      },
    }
  }

  if (id !== undefined) {
    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    }
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
})

rl.on('line', async (line) => {
  const trimmed = line.trim()
  if (!trimmed) return
  try {
    const req = JSON.parse(trimmed)
    const res = await handleRpc(req)
    if (res) console.log(JSON.stringify(res))
  } catch (err) {
    console.error(JSON.stringify({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: 'Parse error', data: err.message },
    }))
  }
})
