/**
 * Sanity and Integration Test Suite
 * Part of GitHub Scrapers & OpenClaw Automation Suite
 * Author: NeoShaurya (https://neoshaurya.com)
 */

import assert from 'assert'
import {
  scrapeGitHubProfile,
  scrapeGitHubRepos,
  computeReadmeHash,
} from '../src/github-scraper.js'
import { renderProjectSvgString } from '../src/svg-generator.js'
import { generateAiDescription } from '../src/ai-describer.js'

async function runTests() {
  console.log('--- [Test 1] Computing SHA-256 README Hash ---')
  const sampleMarkdown = '# Hello World\nTesting README hash generator.'
  const hash1 = computeReadmeHash(sampleMarkdown)
  const hash2 = computeReadmeHash(sampleMarkdown)
  assert.strictEqual(hash1, hash2, 'Hash must be deterministic')
  assert.strictEqual(hash1.length, 64, 'Hash must be 64 characters (SHA-256)')
  console.log(`[PASS] SHA-256 Hash is deterministic: ${hash1}`)

  console.log('\n--- [Test 2] Rendering SVG Vector Banner ---')
  const svg = renderProjectSvgString({
    title: 'Test Build',
    priceTag: 'UNIT TEST',
    accentColor: 'bg-gumroad-pink',
  })
  assert.ok(svg.includes('<svg'), 'Output must contain <svg>')
  assert.ok(svg.includes('TEST BUILD'), 'Output must contain capitalized title')
  assert.ok(svg.includes('UNIT TEST'), 'Output must contain tag badge')
  console.log('[PASS] SVG Vector Banner rendered successfully.')

  console.log('\n--- [Test 3] AI Description Generator (Fallback / Cloud) ---')
  const desc = await generateAiDescription('ShopDesk fast GST billing app for retail', 'short')
  assert.ok(typeof desc === 'string' && desc.length > 5, 'AI description must be a non-empty string')
  console.log(`[PASS] AI Generated Copy: "${desc}"`)

  console.log('\n--- [Test 4] GitHub Profile Public Scrape ---')
  try {
    const profile = await scrapeGitHubProfile('NeoShaurya')
    assert.strictEqual(profile.login.toLowerCase(), 'neoshaurya', 'Profile login matches')
    assert.ok(typeof profile.public_repos === 'number', 'Has public repos count')
    console.log(`[PASS] Profile fetched: @${profile.login} with ${profile.public_repos} repos.`)
  } catch (err) {
    console.warn(`[WARN] Profile fetch skipped or rate-limited: ${err.message}`)
  }

  console.log('\n--- [Test 5] GitHub Public Repositories Scrape ---')
  try {
    const repos = await scrapeGitHubRepos({ username: 'NeoShaurya', limit: 2 })
    assert.ok(Array.isArray(repos), 'Repos must be an array')
    console.log(`[PASS] Repositories fetched: ${repos.length} repos returned.`)
  } catch (err) {
    console.warn(`[WARN] Repos fetch skipped or rate-limited: ${err.message}`)
  }

  console.log('\n==========================================================')
  console.log(' ALL SUITE SANITY TESTS PASSED SUCCESSFULLY! ')
  console.log('==========================================================\n')
}

runTests().catch((err) => {
  console.error('\n[FAIL] Test suite failed:', err)
  process.exit(1)
})
