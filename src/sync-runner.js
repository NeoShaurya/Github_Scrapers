#!/usr/bin/env node

/**
 * Autonomous GitHub -> Portfolio Sync Runner
 * Part of GitHub Scrapers & OpenClaw Automation Suite
 * Author: NeoShaurya (https://neoshaurya.com)
 *
 * Pipeline:
 * 1. Scrapes GitHub for repositories, profile, and READMEs
 * 2. Checks README SHA-256 hashes to detect updates
 * 3. Scrapes and caches visual screenshot artifacts
 * 4. Uses Cloud AI (Gemini) or Local AI (Ollama) to draft punchy copy
 * 5. Generates SVG vector banners for new projects
 * 6. Updates output JSON (and optionally triggers Git auto-push)
 */

import fs from 'fs'
import path from 'path'
import dns from 'dns'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import {
  scrapeGitHubRepos,
  scrapeRepoReadme,
  scrapeRepoScreenshots,
  computeReadmeHash,
} from './github-scraper.js'
import { generateAiDescription } from './ai-describer.js'
import { ensureProjectSvg } from './svg-generator.js'

try {
  dns.setDefaultResultOrder('ipv4first')
} catch {}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_OUT_FILE = path.resolve(__dirname, '../data/projects.json')

const ACCENT_COLORS = [
  'bg-gumroad-pink',
  'bg-gumroad-teal',
  'bg-gumroad-yellow',
  'bg-gumroad-orange',
]

function formatTitle(name) {
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

function resolvePriceTag(repo) {
  const name = repo.name.toLowerCase()
  const desc = (repo.description || '').toLowerCase()
  if (name.includes('desk') || desc.includes('desktop') || desc.includes('.exe') || desc.includes('installer')) {
    return 'DESKTOP APP'
  }
  if (repo.homepage) {
    return 'LIVE'
  }
  if (repo.isArchived) {
    return 'ARCHIVED'
  }
  return 'OPEN SOURCE'
}

/**
 * Main Synchronization Pipeline
 */
export async function runSync(options = {}) {
  const username = options.username || process.env.GITHUB_USERNAME || 'NeoShaurya'
  const outputFile = options.outputFile || DEFAULT_OUT_FILE
  const publicDir = options.publicDir || path.resolve(path.dirname(outputFile), '../public/projects')
  const autoPush = Boolean(options.autoPush || options.gitPush)
  const forceUpdate = Boolean(options.forceUpdate || options.force)
  const token = options.token || process.env.GITHUB_TOKEN

  const startTime = new Date()
  console.log(`[Sync Engine] ==========================================`)
  console.log(`[Sync Engine] Starting GitHub Repository Sync Pipeline`)
  console.log(`[Sync Engine] Target Account: ${username}`)
  console.log(`[Sync Engine] Output Target: ${outputFile}`)
  console.log(`[Sync Engine] Timestamp: ${startTime.toISOString()}`)

  // 1. Read existing projects if file exists
  let existingProjects = []
  try {
    if (fs.existsSync(outputFile)) {
      existingProjects = JSON.parse(fs.readFileSync(outputFile, 'utf-8'))
    }
  } catch (err) {
    console.warn(`[Sync Engine] Initializing new output list: ${err.message}`)
    existingProjects = []
  }

  const existingMap = new Map()
  for (const p of existingProjects) {
    if (p.repoUrl) {
      const match = p.repoUrl.match(/github\.com\/[^/]+\/([^/]+)/i)
      if (match) existingMap.set(match[1].toLowerCase(), p)
    }
    if (p.id) {
      existingMap.set(p.id.replace(/^proj-/, '').toLowerCase(), p)
    }
    if (p.title) {
      existingMap.set(p.title.toLowerCase().replace(/[^a-z0-9_-]/g, ''), p)
    }
  }

  // 2. Scrape repositories
  console.log(`[Sync Engine] Scraping repositories from GitHub...`)
  let scraped
  try {
    scraped = await scrapeGitHubRepos({ username, limit: 100, token })
  } catch (err) {
    console.error(`[Sync Engine] GitHub scrape failed:`, err.message)
    throw err
  }

  console.log(`[Sync Engine] Discovered ${scraped.repos.length} repository/repositories.`)

  const addedProjects = []
  const updatedProjects = []
  let hasChanges = false

  for (const repo of scraped.repos) {
    const repoKey = repo.name.toLowerCase()
    const existing = existingMap.get(repoKey)

    // Fetch README and compute deterministic SHA-256 hash
    console.log(`[Sync Engine] Checking README for ${repo.name}...`)
    let readmeText = ''
    let readmeBranch = 'main'
    let readmeHash = ''
    try {
      const readmeData = await scrapeRepoReadme(repo.name, username, token)
      readmeText = readmeData.readme || ''
      readmeBranch = readmeData.branch || 'main'
      readmeHash = computeReadmeHash(readmeText)
    } catch (e) {
      console.warn(`[Sync Engine] Could not fetch README for ${repo.name}:`, e.message)
    }

    if (!existing) {
      console.log(`[Sync Engine] [NEW REPO] "${repo.name}". Generating AI description...`)
      const aiDescription = await generateAiDescription({
        name: repo.name,
        description: repo.description,
        language: repo.language,
        topics: repo.topics,
        readme: readmeText,
      })

      const accentColor = ACCENT_COLORS[(existingProjects.length + addedProjects.length) % ACCENT_COLORS.length]
      const priceTag = resolvePriceTag(repo)

      // Scrape visual screenshots
      let screenshots = []
      try {
        screenshots = await scrapeRepoScreenshots(repo.name, username, readmeText, readmeBranch, {
          publicDir,
          token,
        })
      } catch (err) {
        console.warn(`[Sync Engine] Screenshot extraction warning for ${repo.name}:`, err.message)
      }

      // Generate vector SVG badge
      let imageUrl = `/projects/${repo.name.toLowerCase().replace(/[^a-z0-9_-]/g, '')}.svg`
      try {
        ensureProjectSvg({ name: repo.name, language: repo.language, priceTag, accentColor }, publicDir)
      } catch {}

      const newProject = {
        id: `proj-${repo.name.toLowerCase().replace(/[^a-z0-9_-]/g, '')}`,
        title: formatTitle(repo.name),
        description: aiDescription,
        tags: Array.from(new Set([repo.language, ...(repo.topics || [])].filter((t) => t && t !== 'Unknown'))),
        imageUrl,
        liveUrl: repo.homepage || repo.repoUrl,
        repoUrl: repo.repoUrl,
        accentColor,
        priceTag,
        isPrivate: Boolean(repo.isPrivate),
        isHidden: Boolean(repo.isPrivate),
        stars: repo.stars,
        lastSyncedAt: new Date().toISOString(),
        readme: readmeText,
        readmeBranch,
        readmeHash,
        readmeUpdatedAt: new Date().toISOString(),
        screenshots,
      }

      existingProjects.push(newProject)
      addedProjects.push(newProject.title)
      hasChanges = true
      console.log(`[Sync Engine] + Added: ${newProject.title} (${screenshots.length} screenshots)`)
    } else {
      // Check for README updates via SHA-256 hash comparison
      const isReadmeUpdated = !existing.readme || existing.readmeHash !== readmeHash
      if (isReadmeUpdated && readmeText) {
        console.log(`[Sync Engine] 📝 README update detected for "${existing.title}". Refreshing markdown & screenshots...`)
        existing.readme = readmeText
        existing.readmeBranch = readmeBranch
        existing.readmeHash = readmeHash
        existing.readmeUpdatedAt = new Date().toISOString()

        try {
          const freshScreenshots = await scrapeRepoScreenshots(repo.name, username, readmeText, readmeBranch, {
            publicDir,
            token,
          })
          if (freshScreenshots.length > 0) {
            existing.screenshots = freshScreenshots
            console.log(`[Sync Engine] 📸 Refreshed ${freshScreenshots.length} screenshot(s) for ${existing.title}.`)
          }
        } catch {}
        hasChanges = true
        updatedProjects.push(`${existing.title} (README updated)`)
      }

      // Update stars and repository telemetry
      if (existing.stars !== repo.stars) {
        existing.stars = repo.stars
        hasChanges = true
        updatedProjects.push(`${existing.title} (stars: ${repo.stars})`)
      }

      // Update repo privacy state if changed on GitHub
      const isNowPrivate = Boolean(repo.isPrivate)
      if (Boolean(existing.isPrivate) !== isNowPrivate) {
        existing.isPrivate = isNowPrivate
        existing.isHidden = isNowPrivate ? true : (existing.isHidden ?? false)
        hasChanges = true
        updatedProjects.push(`${existing.title} (privacy: ${isNowPrivate ? 'PRIVATE' : 'PUBLIC'})`)
      }

      if (forceUpdate) {
        existing.description = await generateAiDescription({
          name: repo.name,
          description: repo.description,
          language: repo.language,
          topics: repo.topics,
          readme: readmeText,
        })
        existing.lastSyncedAt = new Date().toISOString()
        hasChanges = true
      }
    }
  }

  // 3. Save output file if changed
  if (hasChanges) {
    const parentDir = path.dirname(outputFile)
    if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true })
    fs.writeFileSync(outputFile, JSON.stringify(existingProjects, null, 2), 'utf-8')
    console.log(`[Sync Engine] ✓ Successfully written: ${outputFile}`)

    if (autoPush) {
      try {
        console.log(`[Sync Engine] Auto-pushing changes to git...`)
        execSync(`git add "${outputFile}" "${publicDir}"`, { stdio: 'pipe' })
        execSync(`git commit -m "chore(sync): automated repository sync (${addedProjects.length} added, ${updatedProjects.length} updated)"`, { stdio: 'pipe' })
        execSync(`git push origin main`, { stdio: 'pipe' })
        console.log(`[Sync Engine] ✓ Pushed to git successfully!`)
      } catch (err) {
        console.warn(`[Sync Engine] Git push notice: ${err.message}`)
      }
    }
  } else {
    console.log(`[Sync Engine] ⚡ All repositories are up to date. No changes needed.`)
  }

  const durationMs = Date.now() - startTime.getTime()
  console.log(`[Sync Engine] Finished in ${(durationMs / 1000).toFixed(2)}s`)
  console.log(`[Sync Engine] ==========================================`)

  return {
    timestamp: new Date().toISOString(),
    status: 'SUCCESS',
    durationMs,
    totalProjects: existingProjects.length,
    scrapedRepos: scraped.repos.length,
    total: existingProjects.length,
    added: addedProjects.length,
    updated: updatedProjects.length,
    addedProjects,
    updatedProjects,
    hasChanges,
    outFile: outputFile,
  }
}

// CLI direct run
if (process.argv[1]?.endsWith('sync-runner.js')) {
  const args = process.argv.slice(2)
  const forceUpdate = args.includes('--force')
  const autoPush = args.includes('--push')
  runSync({ forceUpdate, autoPush }).catch((err) => {
    console.error('Fatal sync error:', err)
    process.exit(1)
  })
}
