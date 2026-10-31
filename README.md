# ⚡ GITHUB SCRAPERS & OPENCLAW AUTOMATION SUITE

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B%20LTS-green.svg?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Dependencies](https://img.shields.io/badge/Dependencies-0%20(Zero)-orange.svg?style=for-the-badge)](package.json)
[![MCP Compliant](https://img.shields.io/badge/Protocol-Model%20Context%20Protocol%20(MCP)-blueviolet.svg?style=for-the-badge)](src/server.js)
[![Style](https://img.shields.io/badge/Design-Neo--Brutalist-ff90e8.svg?style=for-the-badge)](https://neoshaurya.com)

> **Autonomous GitHub Scraping, Visual Asset & Screenshot Extraction, SHA-256 Update Detection, Cloud AI Summarization, and MCP Automation Engine.**

Built for developer portfolios, autonomous agents (OpenClaw, Claude Desktop, Cursor), and background synchronization pipelines.

---

## 🚀 Key Features

* **Zero External Dependencies** — Built completely on native Node.js 18+ (`fetch`, `crypto`, `Buffer`, `fs`, `readline`). No bulky `node_modules` required to run or install.
* **Smart Asset & Screenshot Scraping** — Extracts raw screenshots, hero diagrams, and image tags from GitHub READMEs and repository asset directories (`assets/`, `screenshots/`, `media/`, `docs/`).
* **Deterministic SHA-256 Update Tracking** — Automatically detects when a project's README or docs change using cryptographic hashing, updating portfolio copy only when actual changes occur.
* **Dual AI Copywriting Engine** — Produces punchy neo-brutalist descriptions using **Google Gemini 2.5/1.5 Flash**, with automatic local fallback to **Ollama** or zero-token heuristic regex.
* **Neo-Brutalist SVG Banner Generation** — Dynamically generates high-contrast SVG vector badges and project cards featuring Gumroad pastel accents (`#ff90e8`, `#23a094`, `#ffc900`, `#ff6b4a`) and hard drop shadows.
* **Official Model Context Protocol (MCP) Server** — Native JSON-RPC 2.0 stdio server ready to plug into Claude Desktop, OpenClaw, Cursor, and any MCP-compliant agent.
* **Background Automation & Silent Daemon** — Ready-to-run scripts for Windows Task Scheduler (`.vbs`, `.ps1`, `.cmd`) and Unix `cron`.

---

## 📦 Directory Structure

```text
Github_Scrapers/
├── bin/
│   └── cli.js              # Universal command-line interface
├── src/
│   ├── github-scraper.js   # Profiles, repos, READMEs, screenshots, privacy check
│   ├── ai-describer.js     # Gemini Cloud AI & Ollama local summarizer
│   ├── svg-generator.js    # Neo-brutalist SVG card and badge renderer
│   ├── sync-runner.js      # Autonomous end-to-end sync engine
│   └── server.js           # Model Context Protocol (MCP) stdio server
├── scripts/
│   ├── run-sync.cmd        # Windows batch launcher
│   ├── run-sync.ps1        # PowerShell automated sync script
│   └── run-sync.vbs        # Silent background launcher (no console popups)
├── test/
│   └── test.js             # Comprehensive integration and sanity test suite
├── .env.example            # Environment variables template
├── LICENSE                 # MIT License
└── package.json            # Package metadata and executable bin links
```

---

## 🛠️ Quick Start

### 1. Installation

```bash
git clone https://github.com/NeoShaurya/Github_Scrapers.git
cd Github_Scrapers
```

*(No `npm install` needed — this engine runs on pure Node.js!)*

### 2. Environment Configuration (Optional)

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Description | Default |
| :--- | :--- | :--- |
| `GITHUB_USERNAME` | Default GitHub account to scrape | `NeoShaurya` |
| `GITHUB_TOKEN` | GitHub Personal Access Token (for higher rate limits) | Optional |
| `GEMINI_API_KEY` | Google Gemini API Key for AI copywriting | Optional |
| `OLLAMA_HOST` | Local Ollama server endpoint | `http://127.0.0.1:11434` |

---

## 💻 CLI Usage

The suite includes an interactive command-line tool accessible via `npm run cli` or `./bin/cli.js`:

### Scrape GitHub Profile
```bash
node bin/cli.js profile NeoShaurya
```

### List Public Repositories
```bash
node bin/cli.js repos NeoShaurya --limit=10
```

### Fetch Raw README & Compute SHA-256
```bash
node bin/cli.js readme ShopDesk
```

### Extract Visual Screenshots & Diagrams
```bash
node bin/cli.js screenshots ShopDesk
```

### Check Repository Privacy / Classified Status
```bash
node bin/cli.js privacy ShopDesk
```

### Generate AI Copy (Cloud or Local)
```bash
node bin/cli.js ai "ShopDesk fast GST billing application for desktop" short
```

### Generate Neo-Brutalist SVG Banner
```bash
node bin/cli.js svg "NeoTerminal" "RUST" "bg-gumroad-yellow" ./banner.svg
```

### Run Full Autonomous Sync
```bash
node bin/cli.js sync --force
```

---

## 🤖 Model Context Protocol (MCP) Server

Connect your autonomous AI agents directly to GitHub scraping tools using standard stdio JSON-RPC 2.0.

### Starting the Server
```bash
npm run mcp
```

### Claude Desktop Configuration

Add the server to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "github-scrapers": {
      "command": "node",
      "args": [
        "c:/path/to/Github_Scrapers/src/server.js"
      ],
      "env": {
        "GITHUB_USERNAME": "NeoShaurya",
        "GITHUB_TOKEN": "ghp_your_token_here",
        "GEMINI_API_KEY": "your_gemini_api_key"
      }
    }
  }
}
```

### Available MCP Tools

1. `scrape_github_profile` — Fetches bio, follower counts, and public stats.
2. `scrape_github_repos` — Scrapes repo list, star counts, topics, and languages.
3. `scrape_repo_readme` — Retrieves markdown and computed SHA-256 update hash.
4. `scrape_repo_screenshots` — Discovers all visual screenshots and architecture images.
5. `check_repo_privacy` — Determines whether a repository is public, private, or classified.
6. `generate_ai_description` — Creates punchy portfolio copy using Gemini or Ollama.
7. `generate_project_svg` — Produces high-contrast SVG banner markup.
8. `run_portfolio_sync` — Executes the full sync pipeline and returns statistics.

---

## ⏰ Automated Scheduling

### Windows Task Scheduler (Silent Background Daemon)

To keep your portfolio or database continuously synchronized without a cmd window popping up:
1. Open **Task Scheduler** in Windows.
2. Create a new Task with Trigger: **Daily / Repeat every 1 hour**.
3. Action: **Start a program**.
4. Program/script: `wscript.exe`
5. Arguments: `"c:\path\to\Github_Scrapers\scripts\run-sync.vbs"`

---

## 🧪 Running Tests

Verify your environment and network connectivity:

```bash
npm test
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

Authored by **NeoShaurya** ([@NeoShaurya](https://github.com/NeoShaurya)) — [neoshaurya.com](https://neoshaurya.com)
