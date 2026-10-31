#!/usr/bin/env node

/**
 * GitHub Scrapers CLI
 * Interactive and scriptable command-line interface
 * Part of GitHub Scrapers & OpenClaw Automation Suite
 * Author: NeoShaurya (https://neoshaurya.com)
 */

import dns from 'dns'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  scrapeGitHubProfile,
  scrapeGitHubRepos,
  scrapeRepoReadme,
  scrapeRepoScreenshots,
  checkRepoPrivacy,
} from '../src/github-scraper.js'
import { generateAiDescription } from '../src/ai-describer.js'
import { renderProjectSvgString } from '../src/svg-generator.js'
import { runSync } from '../src/sync-runner.js'

try {
  dns.setDefaultResultOrder('ipv4first')
} catch {}

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Neo-brutalist CLI styling
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  pink: '\x1b[38;2;255;144;232m',
  yellow: '\x1b[38;2;255;199;0m',
  teal: '\x1b[38;2;0;225;244m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
}

function printBanner() {
  console.log(`
${c.pink}${c.bold}========================================================================${c.reset}
${c.yellow}${c.bold}  GITHUB SCRAPERS & OPENCLAW AUTOMATION SUITE${c.reset}
${c.dim}  Zero-Dependency Profile, Repo & Visual Asset Scraping Engine${c.reset}
${c.pink}${c.bold}========================================================================${c.reset}
`)
}

function printHelp() {
  printBanner()
  console.log(`${c.bold}USAGE:${c.reset}`)
  console.log(`  github-scrapers <command> [arguments] [options]\n`)
  console.log(`${c.bold}COMMANDS:${c.reset}`)
  console.log(`  ${c.yellow}profile${c.reset} [username]               Scrape GitHub user profile & statistics`)
  console.log(`  ${c.yellow}repos${c.reset} [username] [--limit=N]     List public repositories with stars & topics`)
  console.log(`  ${c.yellow}readme${c.reset} <repo> [username]         Fetch raw README.md markdown`)
  console.log(`  ${c.yellow}screenshots${c.reset} <repo> [username]    Extract screenshots & visual assets`)
  console.log(`  ${c.yellow}privacy${c.reset} <repo> [username]        Check public/private repository status`)
  console.log(`  ${c.yellow}ai${c.reset} "<text>" [type]               Generate punchy copy with Gemini / Ollama`)
  console.log(`  ${c.yellow}svg${c.reset} <title> [tag] [accent] [out] Generate Neo-brutalist SVG card banner`)
  console.log(`  ${c.yellow}sync${c.reset} [--force] [--git-push]      Autonomous sync of all repos into projects.json`)
  console.log(`  ${c.yellow}mcp${c.reset}                              Launch standard JSON-RPC 2.0 MCP server`)
  console.log(`  ${c.yellow}help${c.reset}                             Show this manual\n`)
  console.log(`${c.bold}EXAMPLES:${c.reset}`)
  console.log(`  github-scrapers profile NeoShaurya`)
  console.log(`  github-scrapers repos NeoShaurya --limit=10`)
  console.log(`  github-scrapers readme ShopDesk`)
  console.log(`  github-scrapers screenshots ShopDesk`)
  console.log(`  github-scrapers svg "NeoTerminal" "RUST" "bg-gumroad-yellow" ./banner.svg`)
  console.log(`  github-scrapers sync --git-push\n`)
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length === 0 || args.includes('--help') || args.includes('-h') || args[0] === 'help') {
    printHelp()
    process.exit(0)
  }

  const cmd = args[0].toLowerCase()

  try {
    switch (cmd) {
      case 'profile': {
        const username = args[1] || process.env.GITHUB_USERNAME || 'NeoShaurya'
        console.log(`${c.dim}[cli] Fetching profile for @${username}...${c.reset}`)
        const profile = await scrapeGitHubProfile(username)
        console.log(`\n${c.bold}GitHub Profile: ${c.pink}@${profile.login}${c.reset}`)
        console.log(`  ${c.bold}Name:${c.reset}         ${profile.name || '(unnamed)'}`)
        console.log(`  ${c.bold}Bio:${c.reset}          ${profile.bio || '(no bio)'}`)
        console.log(`  ${c.bold}Public Repos:${c.reset} ${profile.public_repos}`)
        console.log(`  ${c.bold}Followers:${c.reset}    ${profile.followers}`)
        console.log(`  ${c.bold}Following:${c.reset}    ${profile.following}`)
        console.log(`  ${c.bold}Profile URL:${c.reset}  ${profile.html_url}`)
        console.log(`  ${c.bold}Avatar URL:${c.reset}   ${profile.avatar_url}\n`)
        break
      }

      case 'repos': {
        const username = args[1] && !args[1].startsWith('--') ? args[1] : (process.env.GITHUB_USERNAME || 'NeoShaurya')
        const limitArg = args.find((a) => a.startsWith('--limit='))
        const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 30

        console.log(`${c.dim}[cli] Fetching repositories for @${username} (limit: ${limit})...${c.reset}`)
        const repos = await scrapeGitHubRepos({ username, limit })
        console.log(`\n${c.bold}Found ${c.yellow}${repos.length}${c.reset}${c.bold} repositories for @${username}:${c.reset}\n`)
        repos.forEach((r, idx) => {
          const stars = r.stargazers_count > 0 ? ` [★ ${r.stargazers_count}]` : ''
          const lang = r.language ? ` (${r.language})` : ''
          console.log(`  ${c.bold}${String(idx + 1).padStart(2, ' ')}.${c.reset} ${c.pink}${r.name}${c.reset}${lang}${c.yellow}${stars}${c.reset}`)
          if (r.description) console.log(`      ${c.dim}${r.description}${c.reset}`)
          console.log(`      ${c.gray}${r.html_url}${c.reset}`)
        })
        console.log('')
        break
      }

      case 'readme': {
        const repo = args[1]
        if (!repo) {
          console.error(`${c.red}Error: Please specify repository name. Example: github-scrapers readme ShopDesk${c.reset}`)
          process.exit(1)
        }
        const username = args[2] || process.env.GITHUB_USERNAME || 'NeoShaurya'
        console.log(`${c.dim}[cli] Fetching README for ${username}/${repo}...${c.reset}`)
        const { readme, hash } = await scrapeRepoReadme(repo, username)
        if (!readme) {
          console.log(`${c.yellow}No README found for ${username}/${repo}.${c.reset}`)
        } else {
          console.log(`\n${c.bold}README SHA-256 Hash:${c.reset} ${c.yellow}${hash}${c.reset}`)
          console.log(`${c.dim}------------------------------------------------------------------------${c.reset}`)
          console.log(readme)
          console.log(`${c.dim}------------------------------------------------------------------------${c.reset}\n`)
        }
        break
      }

      case 'screenshots': {
        const repo = args[1]
        if (!repo) {
          console.error(`${c.red}Error: Please specify repository name. Example: github-scrapers screenshots ShopDesk${c.reset}`)
          process.exit(1)
        }
        const username = args[2] || process.env.GITHUB_USERNAME || 'NeoShaurya'
        console.log(`${c.dim}[cli] Scanning visual assets in ${username}/${repo}...${c.reset}`)
        const assets = await scrapeRepoScreenshots(repo, username)
        console.log(`\n${c.bold}Found ${c.yellow}${assets.length}${c.reset}${c.bold} screenshot/asset candidates for ${username}/${repo}:${c.reset}\n`)
        assets.forEach((a, i) => {
          console.log(`  ${i + 1}. [${a.type}] ${c.teal}${a.name}${c.reset}`)
          console.log(`     URL: ${a.url}`)
          if (a.rawUrl) console.log(`     Raw: ${c.dim}${a.rawUrl}${c.reset}`)
        })
        console.log('')
        break
      }

      case 'privacy': {
        const repo = args[1]
        if (!repo) {
          console.error(`${c.red}Error: Please specify repository name. Example: github-scrapers privacy ShopDesk${c.reset}`)
          process.exit(1)
        }
        const username = args[2] || process.env.GITHUB_USERNAME || 'NeoShaurya'
        console.log(`${c.dim}[cli] Verifying visibility of ${username}/${repo}...${c.reset}`)
        const status = await checkRepoPrivacy(repo, username)
        console.log(`\n  Repository: ${c.bold}${status.repo}${c.reset}`)
        console.log(`  Exists:     ${status.exists ? `${c.green}YES${c.reset}` : `${c.red}NO${c.reset}`}`)
        console.log(`  Visibility: ${status.isPrivate ? `${c.red}PRIVATE / CLASSIFIED${c.reset}` : `${c.green}PUBLIC${c.reset}`}\n`)
        break
      }

      case 'ai': {
        const text = args[1]
        if (!text) {
          console.error(`${c.red}Error: Please specify text to summarize. Example: github-scrapers ai "My fast Rust CLI tool"${c.reset}`)
          process.exit(1)
        }
        const type = args[2] || 'short'
        console.log(`${c.dim}[cli] Generating ${type} copy via Cloud/Local AI...${c.reset}`)
        const desc = await generateAiDescription(text, type)
        console.log(`\n${c.bold}AI Output (${type}):${c.reset}\n${c.teal}${desc}${c.reset}\n`)
        break
      }

      case 'svg': {
        const title = args[1]
        if (!title) {
          console.error(`${c.red}Error: Please specify title. Example: github-scrapers svg "NeoTerminal" "RUST" "bg-gumroad-yellow" ./banner.svg${c.reset}`)
          process.exit(1)
        }
        const tag = args[2] || 'OPEN SOURCE'
        const accent = args[3] || 'bg-gumroad-pink'
        const outFile = args[4]

        const svgContent = renderProjectSvgString({ title, tag, accentClass: accent })
        if (outFile) {
          const abs = path.resolve(process.cwd(), outFile)
          fs.writeFileSync(abs, svgContent, 'utf-8')
          console.log(`${c.green}Successfully saved SVG banner to: ${abs}${c.reset}`)
        } else {
          console.log(svgContent)
        }
        break
      }

      case 'sync': {
        const force = args.includes('--force')
        const gitPush = args.includes('--git-push')
        console.log(`${c.pink}${c.bold}[cli] Starting autonomous repository sync...${c.reset}`)
        const result = await runSync({ force, gitPush })
        console.log(`\n${c.green}${c.bold}Sync Complete!${c.reset}`)
        console.log(`  Total:   ${result.total}`)
        console.log(`  Added:   ${result.added}`)
        console.log(`  Updated: ${result.updated}`)
        console.log(`  Output:  ${result.outFile}\n`)
        break
      }

      case 'mcp': {
        console.log(`${c.dim}[cli] Launching Model Context Protocol (MCP) JSON-RPC server...${c.reset}`)
        await import('../src/server.js')
        break
      }

      default:
        console.error(`${c.red}Unknown command: "${cmd}". Run "github-scrapers help" for usage.${c.reset}`)
        process.exit(1)
    }
  } catch (err) {
    console.error(`\n${c.red}${c.bold}Error:${c.reset} ${err.message}`)
    if (process.env.DEBUG) console.error(err)
    process.exit(1)
  }
}

main()
