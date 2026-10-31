/**
 * GitHub Scraper & Asset Extractor
 * Part of GitHub Scrapers & OpenClaw Automation Suite
 * Author: NeoShaurya (https://neoshaurya.com)
 *
 * Scrapes GitHub profiles, public repositories, READMEs, screenshots, directories,
 * and tracks real-time repository privacy states.
 */

import dns from 'dns'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

// Force IPv4 first to prevent Windows undici ConnectTimeoutError (UND_ERR_CONNECT_TIMEOUT)
try {
  dns.setDefaultResultOrder('ipv4first')
} catch {}

const DEFAULT_USERNAME = process.env.GITHUB_USERNAME || 'NeoShaurya'

export function getHeaders(customToken) {
  const token = customToken || process.env.GITHUB_TOKEN
  const headers = {
    'User-Agent': 'GitHub-Scrapers-Suite/1.0 (Autonomous Portfolio Automation)',
    Accept: 'application/vnd.github.v3+json',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

/**
 * Resilient fetch with exponential backoff and timeout
 */
export async function fetchWithRetry(url, options = {}, retries = 3, timeoutMs = 15000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })
      clearTimeout(timer)
      return response
    } catch (err) {
      clearTimeout(timer)
      const isLast = attempt === retries
      if (isLast) throw err

      const delayMs = attempt * 1200
      console.warn(
        `[Scraper Network] Request paused (${err.message || 'timeout'}). Retrying in ${delayMs / 1000}s (attempt ${attempt}/${retries})...`
      )
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
}

/**
 * Scrapes GitHub user profile
 */
export async function scrapeGitHubProfile(username = DEFAULT_USERNAME, token) {
  const url = `https://api.github.com/users/${encodeURIComponent(username)}`
  const res = await fetchWithRetry(url, { headers: getHeaders(token) })

  if (!res.ok) {
    throw new Error(`GitHub API error (${res.status}): ${await res.text()}`)
  }

  const data = await res.json()
  return {
    login: data.login,
    name: data.name || data.login,
    bio: data.bio || '',
    avatarUrl: data.avatar_url,
    profileUrl: data.html_url,
    company: data.company || '',
    location: data.location || '',
    blog: data.blog || '',
    twitter: data.twitter_username ? `@${data.twitter_username}` : '',
    publicRepos: data.public_repos,
    publicGists: data.public_gists,
    followers: data.followers,
    following: data.following,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

/**
 * Scrapes GitHub public repositories for an account
 */
export async function scrapeGitHubRepos(options = {}) {
  const {
    username = DEFAULT_USERNAME,
    limit = 100,
    sort = 'updated', // 'created', 'updated', 'pushed', 'full_name'
    token,
  } = options

  const url = `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=${sort}`
  const res = await fetchWithRetry(url, { headers: getHeaders(token) })

  if (!res.ok) {
    throw new Error(`GitHub API error (${res.status}): ${await res.text()}`)
  }

  const repos = await res.json()

  if (!Array.isArray(repos)) {
    throw new Error('Unexpected GitHub response format')
  }

  const formatted = repos.slice(0, limit).map((r) => ({
    name: r.name,
    fullName: r.full_name,
    description: r.description || '',
    language: r.language || 'Unknown',
    topics: Array.isArray(r.topics) ? r.topics : [],
    stars: r.stargazers_count,
    forks: r.forks_count,
    watchers: r.watchers_count,
    openIssues: r.open_issues_count,
    repoUrl: r.html_url,
    homepage: r.homepage || '',
    isFork: r.fork,
    isPrivate: r.private,
    isArchived: r.archived,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    pushedAt: r.pushed_at,
    defaultBranch: r.default_branch,
  }))

  return {
    username,
    totalCount: repos.length,
    returnedCount: formatted.length,
    repos: formatted,
  }
}

/**
 * Scrapes the README markdown for a specific repository
 */
export async function scrapeRepoReadme(repo, username = DEFAULT_USERNAME, token) {
  // First attempt: raw user content on main / master (avoids API rate limits)
  const branches = ['main', 'master']
  for (const branch of branches) {
    const rawUrl = `https://raw.githubusercontent.com/${encodeURIComponent(username)}/${encodeURIComponent(repo)}/${branch}/README.md`
    try {
      const res = await fetchWithRetry(rawUrl, { headers: getHeaders(token) }, 2, 8000)
      if (res.ok) {
        const text = await res.text()
        return {
          repo,
          username,
          branch,
          readme: text,
        }
      }
    } catch {}
  }

  // Fallback: GitHub README API
  const apiUrl = `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repo)}/readme`
  try {
    const res = await fetchWithRetry(apiUrl, { headers: getHeaders(token) }, 2, 8000)
    if (res.ok) {
      const data = await res.json()
      if (data.content && data.encoding === 'base64') {
        const decoded = Buffer.from(data.content, 'base64').toString('utf-8')
        return {
          repo,
          username,
          branch: data.name || 'main',
          readme: decoded,
        }
      }
    }
  } catch {}

  return {
    repo,
    username,
    branch: 'main',
    readme: '(No README found or repository is private)',
  }
}

/**
 * Computes deterministic SHA-256 hash of README content to check for updates
 */
export function computeReadmeHash(readmeText) {
  if (!readmeText) return ''
  return crypto.createHash('sha256').update(readmeText.trim()).digest('hex')
}

/**
 * Checks if a repository exists and whether it is public or private
 */
export async function checkRepoPrivacy(repo, username = DEFAULT_USERNAME, token) {
  const url = `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repo)}`
  try {
    const res = await fetchWithRetry(url, { headers: getHeaders(token) }, 2, 8000)
    if (res.status === 200) {
      const data = await res.json()
      return {
        repo,
        exists: true,
        isPrivate: Boolean(data.private),
        visibility: data.visibility || (data.private ? 'private' : 'public'),
      }
    } else if (res.status === 404) {
      return {
        repo,
        exists: false,
        isPrivate: true,
        visibility: 'private_or_deleted',
      }
    }
    return {
      repo,
      exists: false,
      isPrivate: true,
      error: `GitHub status ${res.status}`,
    }
  } catch (err) {
    return {
      repo,
      exists: false,
      isPrivate: true,
      error: err.message,
    }
  }
}

/**
 * Scrapes and extracts screenshots from a repository's README and directory structure.
 * Resolves relative URLs to full raw GitHub URLs or saves local copies in publicDir.
 */
export async function scrapeRepoScreenshots(repo, username = DEFAULT_USERNAME, readmeText = '', branch = 'main', options = {}) {
  const screenshots = []
  const seenSrcs = new Set()
  const repoSlug = repo.toLowerCase().replace(/[^a-z0-9_-]/g, '')
  const publicDir = options.publicDir || null

  const cleanRawUrl = (rawSrc) => {
    if (!rawSrc) return ''
    if (rawSrc.startsWith('http://') || rawSrc.startsWith('https://')) {
      return rawSrc
    }
    const cleanPath = rawSrc.replace(/^\.?\//, '')
    return `https://raw.githubusercontent.com/${encodeURIComponent(username)}/${encodeURIComponent(repo)}/${branch}/${cleanPath}`
  }

  const isScreenshotCandidate = (src) => {
    if (!src) return false
    const lower = src.toLowerCase()
    if (
      lower.includes('img.shields.io') ||
      lower.includes('badge') ||
      lower.includes('license') ||
      lower.includes('travis-ci') ||
      lower.includes('circleci') ||
      lower.includes('codecov') ||
      lower.includes('github/workflows') ||
      lower.includes('hitcounter') ||
      lower.includes('sonarcloud')
    ) {
      return false
    }
    return /\.(png|jpe?g|webp|svg|gif)(\?.*)?$/i.test(lower)
  }

  const formatTitle = (alt, filename) => {
    let raw = alt || filename || 'Project Screenshot'
    raw = raw.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
    return raw.replace(/\b\w/g, (c) => c.toUpperCase()).trim()
  }

  const resolveBadge = (title, filename) => {
    const combined = `${title} ${filename}`.toLowerCase()
    if (combined.includes('pos') || combined.includes('billing')) return 'TERMINAL'
    if (combined.includes('dark')) return 'DARK THEME'
    if (combined.includes('light')) return 'LIGHT THEME'
    if (combined.includes('dashboard')) return 'DASHBOARD'
    if (combined.includes('mobile')) return 'MOBILE'
    if (combined.includes('cli') || combined.includes('terminal')) return 'CLI'
    if (combined.includes('profile')) return 'PROFILE'
    if (combined.includes('project')) return 'PROJECTS'
    if (combined.includes('contact')) return 'CONTACT'
    return 'PREVIEW'
  }

  // 1. Parse markdown images: ![alt](url)
  const mdRegex = /!\[(.*?)\]\((.*?)\)/g
  let match
  while ((match = mdRegex.exec(readmeText)) !== null) {
    const alt = match[1].trim()
    const rawSrc = match[2].trim().split(/\s+/)[0]
    if (isScreenshotCandidate(rawSrc)) {
      const resolved = cleanRawUrl(rawSrc)
      if (!seenSrcs.has(resolved)) {
        seenSrcs.add(resolved)
        try {
          const filename = path.basename(new URL(resolved).pathname)
          screenshots.push({
            title: formatTitle(alt, filename),
            badge: resolveBadge(alt, filename),
            rawSrc,
            resolvedUrl: resolved,
            filename,
          })
        } catch {}
      }
    }
  }

  // 2. Parse HTML images: <img src="..." alt="..." />
  const htmlRegex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi
  while ((match = htmlRegex.exec(readmeText)) !== null) {
    const tag = match[0]
    const rawSrc = match[1].trim()
    const altMatch = tag.match(/alt=["']([^"']+)["']/i)
    const alt = altMatch ? altMatch[1].trim() : ''
    if (isScreenshotCandidate(rawSrc)) {
      const resolved = cleanRawUrl(rawSrc)
      if (!seenSrcs.has(resolved)) {
        seenSrcs.add(resolved)
        try {
          const filename = path.basename(new URL(resolved).pathname)
          screenshots.push({
            title: formatTitle(alt, filename),
            badge: resolveBadge(alt, filename),
            rawSrc,
            resolvedUrl: resolved,
            filename,
          })
        } catch {}
      }
    }
  }

  // 3. Check repo directories (screenshots/, docs/screenshots/) via GitHub API if < 5 screenshots found
  if (screenshots.length < 5) {
    const candidateDirs = ['screenshots', 'docs/screenshots', 'assets/screenshots']
    for (const dir of candidateDirs) {
      try {
        const dirApiUrl = `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repo)}/contents/${dir}`
        const res = await fetchWithRetry(dirApiUrl, { headers: getHeaders(options.token) }, 1, 5000)
        if (res.ok) {
          const files = await res.json()
          if (Array.isArray(files)) {
            for (const file of files) {
              if (file.type === 'file' && isScreenshotCandidate(file.name)) {
                const resolved = file.download_url || cleanRawUrl(`${dir}/${file.name}`)
                if (!seenSrcs.has(resolved)) {
                  seenSrcs.add(resolved)
                  screenshots.push({
                    title: formatTitle('', file.name),
                    badge: resolveBadge('', file.name),
                    rawSrc: `${dir}/${file.name}`,
                    resolvedUrl: resolved,
                    filename: file.name,
                  })
                }
              }
            }
          }
        }
      } catch {}
    }
  }

  // 4. Download / cache locally if publicDir is provided
  const finalScreenshots = []
  let targetDir = null
  if (publicDir) {
    targetDir = path.join(publicDir, repoSlug)
    try {
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true })
      }
    } catch {}
  }

  for (const item of screenshots) {
    let finalSrc = item.resolvedUrl
    if (targetDir) {
      const localFilePath = path.join(targetDir, item.filename)
      if (fs.existsSync(localFilePath)) {
        finalSrc = `/projects/${repoSlug}/${item.filename}`
      } else {
        try {
          const dlRes = await fetchWithRetry(item.resolvedUrl, {}, 2, 8000)
          if (dlRes && dlRes.ok) {
            const buffer = Buffer.from(await dlRes.arrayBuffer())
            fs.writeFileSync(localFilePath, buffer)
            finalSrc = `/projects/${repoSlug}/${item.filename}`
          }
        } catch (e) {
          // fallback to remote URL
        }
      }
    }

    finalScreenshots.push({
      title: item.title,
      src: finalSrc,
      badge: item.badge,
      description: `High-resolution visual artifact extracted from ${repo} repository.`,
    })
  }

  return finalScreenshots
}

// CLI test runner if executed directly
if (process.argv[1]?.endsWith('github-scraper.js')) {
  const targetUser = process.argv[2] || DEFAULT_USERNAME
  console.log(`[GitHub Scrapers] Scraping GitHub for account: ${targetUser}...`)
  scrapeGitHubProfile(targetUser)
    .then((profile) => {
      console.log('Profile:', profile)
      return scrapeGitHubRepos({ username: targetUser, limit: 5 })
    })
    .then((reposData) => {
      console.log(`Found ${reposData.totalCount} repositories. Top 5:`)
      reposData.repos.forEach((r) => {
        console.log(` - ${r.name} (${r.language}) ⭐${r.stars}: ${r.description}`)
      })
    })
    .catch((err) => {
      console.error('Scraper error:', err.message)
    })
}
