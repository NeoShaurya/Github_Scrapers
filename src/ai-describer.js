/**
 * Cloud AI & Local AI Project Description Generator
 * Part of GitHub Scrapers & OpenClaw Automation Suite
 * Author: NeoShaurya (https://neoshaurya.com)
 *
 * Uses Google Gemini (with graceful local Ollama & heuristic fallback) to write
 * bold, punchy, high-impact descriptions for developer portfolio cards.
 */

import dns from 'dns'

try {
  dns.setDefaultResultOrder('ipv4first')
} catch {}

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-flash-latest',
]

function getApiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ''
}

/**
 * Generate description using Google Gemini API
 */
async function generateWithGemini(prompt, apiKey) {
  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 140,
          },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
        if (text && text.length > 10) {
          return text.replace(/^["']|["']$/g, '').replace(/\r?\n/g, ' ')
        }
      }
    } catch {}
  }
  return null
}

/**
 * Generate description using local Ollama instance (if available)
 */
async function generateWithOllama(prompt) {
  const host = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434'
  const model = process.env.OLLAMA_MODEL || 'llama3.2'
  try {
    const res = await fetch(`${host}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
      }),
      signal: AbortSignal.timeout(6000),
    })

    if (res.ok) {
      const data = await res.json()
      if (data.response && data.response.trim().length > 10) {
        return data.response.trim().replace(/^["']|["']$/g, '').replace(/\r?\n/g, ' ')
      }
    }
  } catch {}
  return null
}

/**
 * Smart Heuristic Fallback when neither cloud nor local AI is reachable
 */
function generateHeuristicDescription(project) {
  const name = project.name || 'Project'
  const lang = project.language || 'Software'
  const desc = (project.description || '').trim()

  if (desc && desc.length > 20 && desc.length < 160 && !desc.toLowerCase().startsWith('this is')) {
    return desc
  }

  const cleanName = name.replace(/[-_]/g, ' ')
  return `High-performance ${lang} engineering build focusing on speed, clean architecture, and modular workflows.`
}

/**
 * Generates a high-converting, neo-brutalist description for a project.
 *
 * @param {Object} project
 * @param {string} project.name - Repo / project name
 * @param {string} [project.description] - GitHub repo description
 * @param {string} [project.language] - Primary programming language
 * @param {string[]} [project.topics] - GitHub repository topics/tags
 * @param {string} [project.readme] - Excerpt of project README
 * @returns {Promise<string>} The generated description
 */
export async function generateAiDescription(project) {
  const apiKey = getApiKey()

  const prompt = `You are an elite technical copywriter for a high-contrast developer portfolio. Your tone is confident, technical, punchy, and zero-fluff.

Write an impressive 1 to 2 sentence card description for this GitHub repository:

Project Name: ${project.name}
Language: ${project.language || 'Software'}
Topics: ${(project.topics || []).join(', ') || 'Development'}
Current Description: ${project.description || 'None provided'}
README Excerpt:
${(project.readme || '').slice(0, 1000)}

STRICT RULES:
1. Exactly 1 to 2 sentences.
2. Under 150 characters total.
3. Bold, confident, direct. Highlight technical capabilities.
4. Do NOT use cliché phrases like "This project is...", "A tool for...", or "Welcome to...".
5. Return ONLY the description text, nothing else (no quotes, no markdown, no filler).`

  // 1. Try Google Gemini Cloud AI
  if (apiKey) {
    const geminiResult = await generateWithGemini(prompt, apiKey)
    if (geminiResult) return geminiResult
  }

  // 2. Try Local Ollama AI
  const ollamaResult = await generateWithOllama(prompt)
  if (ollamaResult) return ollamaResult

  // 3. Fallback to smart heuristic
  return generateHeuristicDescription(project)
}
