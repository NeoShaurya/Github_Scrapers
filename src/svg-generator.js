/**
 * Vector Badge & Banner Generator
 * Part of GitHub Scrapers & OpenClaw Automation Suite
 * Author: NeoShaurya (https://neoshaurya.com)
 *
 * Generates high-contrast Neo-Brutalist SVG badges and preview artwork.
 */

import fs from 'fs'
import path from 'path'

function escapeXml(unsafe = '') {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

const ACCENT_HEX_MAP = {
  'bg-gumroad-pink': '#ff90e8',
  'bg-gumroad-teal': '#23a094',
  'bg-gumroad-yellow': '#ffc900',
  'bg-gumroad-orange': '#ff6b4a',
}

/**
 * Returns raw SVG string for a project banner
 */
export function renderProjectSvgString(project) {
  const title = (project.title || project.name || 'PROJECT').toUpperCase()
  const language = (project.language || 'Software').toUpperCase()
  const priceTag = (project.priceTag || project.tag || 'OPEN SOURCE').toUpperCase()
  const subtitle = `${priceTag} · ${language}`
  const tags = (project.tags || project.topics || [language]).slice(0, 3)
  const tagsText = tags.join(' · ').toUpperCase()

  const accentClass = project.accentColor || project.accentClass || 'bg-gumroad-yellow'
  const accentHex = ACCENT_HEX_MAP[accentClass] || '#ffc900'

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450" role="img" aria-label="${escapeXml(title)} Preview">
  <defs>
    <pattern id="grid-${escapeXml(title)}" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#000000" stroke-width="1" stroke-opacity="0.12"/>
    </pattern>
  </defs>

  <!-- Background Base -->
  <rect width="800" height="450" fill="#f4f4f0"/>
  <rect width="800" height="450" fill="url(#grid-${escapeXml(title)})"/>

  <!-- Brutalist Outer Card with Hard Shadow -->
  <rect x="56" y="56" width="688" height="338" fill="#000000" />
  <rect x="48" y="48" width="688" height="338" fill="#ffffff" stroke="#000000" stroke-width="8" />

  <!-- Accent Header Stripe -->
  <rect x="48" y="48" width="688" height="24" fill="${accentHex}" stroke="#000000" stroke-width="8" />

  <!-- Inner Content Group -->
  <g font-family="Space Grotesk, Inter, system-ui, sans-serif">
    <!-- Top Price/Type Badge -->
    <rect x="80" y="96" width="220" height="38" fill="${accentHex}" stroke="#000000" stroke-width="4" />
    <text x="96" y="121" font-size="14" font-weight="900" letter-spacing="1.5" fill="#000000">${escapeXml(subtitle)}</text>

    <!-- Main Title Card with Offset Shadow -->
    <rect x="86" y="162" width="612" height="114" fill="#000000" />
    <rect x="80" y="156" width="612" height="114" fill="${accentHex}" stroke="#000000" stroke-width="6" />
    <text x="104" y="234" font-size="52" font-weight="900" letter-spacing="-1.5" fill="#000000">${escapeXml(title)}</text>

    <!-- Bottom Metadata Bar -->
    <rect x="80" y="304" width="420" height="36" fill="#f0f0f0" stroke="#000000" stroke-width="3" />
    <text x="96" y="327" font-size="13" font-weight="800" letter-spacing="1" fill="#000000">${escapeXml(tagsText)}</text>

    <text x="670" y="328" text-anchor="end" font-size="15" font-weight="900" letter-spacing="1.5" fill="#000000">NEOSHAURYA</text>
  </g>
</svg>`
}

/**
 * Generates and saves a dedicated SVG banner to disk
 */
export function ensureProjectSvg(project, outputDir = './public/projects') {
  const slug = (project.name || project.id || project.title)
    .toLowerCase()
    .replace(/^proj-/, '')
    .replace(/[^a-z0-9_-]/g, '')

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const filename = `${slug}.svg`
  const filePath = path.join(outputDir, filename)

  if (fs.existsSync(filePath)) {
    return filePath
  }

  const svgContent = renderProjectSvgString(project)
  fs.writeFileSync(filePath, svgContent, 'utf-8')
  return filePath
}
