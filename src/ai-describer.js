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
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
]

function getApiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ''
}

/**
 * Generate description using Google Gemini API
 */
async function generateWithGemini(project, apiKey) {
  const systemPrompt = `You are an elite technical copywriter for a high-contrast developer portfolio. Your tone is confident, technical, punchy, and zero-fluff.
Write an impressive 1 to 2 sentence card description for this GitHub repository.
Rules:
1. Exactly 1 to 2 sentences.
2. Under 180 characters total.
3. Bold, confident, direct. Highlight technical capabilities.
4. No cliché phrases like "This project is...", "A tool for...", or "Welcome to...".
5. Return ONLY the description text, nothing else (no quotes, no markdown headers, no formatting).`

  const userContent = `Project Name: ${project.name}
Language: ${project.language || 'Software'}
Topics: ${(project.topics || []).join(', ') || 'Development'}
Current Description: ${project.description || 'None provided'}
README Excerpt:
${(project.readme || '').slice(0, 1500)}`

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [{ parts: [{ text: userContent }] }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 1000,
          },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        let text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
        if (text) {
          text = text
            .replace(/^["'`]+|["'`]+$/g, '')
            .replace(/^\*\*.*?\*\*:?\s*/i, '')
            .replace(/^(?:description|overview|summary):\s*/i, '')
            .replace(/\r?\n/g, ' ')
            .trim()

          if (
            text.length > 20 &&
            !text.toLowerCase().includes('strict rules') &&
            !text.endsWith(',') &&
            !text.endsWith(':')
          ) {
            return text
          }
        }
      }
    } catch {}
  }
  return null
}

/**
 * Generate description using local Ollama instance (if available)
 */
async function generateWithOllama(project) {
  const host = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434'
  const model = process.env.OLLAMA_MODEL || 'llama3.2'
  const prompt = `Write a punchy, confident, 1-to-2 sentence description (under 180 chars) for this GitHub project: ${project.name} (${project.language || 'Software'}). Return ONLY the description text.`
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
      if (data.response && data.response.trim().length > 15) {
        return data.response.trim().replace(/^["'`]+|["'`]+$/g, '').replace(/\r?\n/g, ' ')
      }
    }
  } catch {}
  return null
}

/**
 * Smart Heuristic Fallback when neither cloud nor local AI is reachable
 */
function generateHeuristicDescription(project) {
  const name = (project.name || 'Software').replace(/[-_]/g, ' ')
  const lang = project.language || 'modern'
  const desc = (project.description || '').trim()

  if (desc && desc.length > 20 && desc.length < 180 && !desc.toLowerCase().startsWith('this is')) {
    return desc
  }

  const topicsStr = (project.topics || []).slice(0, 2).join(' and ')
  if (topicsStr) {
    return `High-speed ${name} built with ${lang}. Engineered for ${topicsStr} with a zero-bloat architecture.`
  }

  return `High-performance ${lang} engineering build focusing on speed, clean architecture, and modular workflows.`
}

/**
 * Generates a high-converting, neo-brutalist description for a project.
 */
export async function generateAiDescription(project) {
  const apiKey = getApiKey()

  // 1. Try Google Gemini Cloud AI
  if (apiKey) {
    const geminiResult = await generateWithGemini(project, apiKey)
    if (geminiResult) return geminiResult
  }

  // 2. Try Local Ollama AI
  const ollamaResult = await generateWithOllama(project)
  if (ollamaResult) return ollamaResult

  // 3. Fallback to smart heuristic
  return generateHeuristicDescription(project)
}
