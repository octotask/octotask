# OctoTask

<div align="center">
  <img src="./public/logo.svg" alt="OctoTask Logo" width="600" />
  <p align="center">
    <strong>The Elite Open-Source AI Full-Stack Web Development Platform.</strong>
  </p>
  
  <p align="center">
    <a href="https://github.com/octotask/octotask/tree/stable"><img src="https://img.shields.io/badge/branch-stable-green?style=flat-square" alt="Stable Branch"></a>
    <a href="https://github.com/octotask/octotask/tree/main"><img src="https://img.shields.io/badge/branch-main-blue?style=flat-square" alt="Main Branch"></a>
    <a href="https://github.com/octotask/octotask/releases"><img src="https://img.shields.io/github/v/release/octotask/octotask?style=flat-square" alt="Latest Release"></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License"></a>
  </p>
</div>

Welcome to **OctoTask**, the definitive open-source platform for AI-assisted high-performance development. Engineered for professionals and built for the community, OctoTask empowers you to harness the world's most sophisticated LLMs to architect, deploy, and scale complex web applications directly within your browser.

-----
### 🚀 **[Quick Start Documentation](https://octotask.github.io/octotask/)**
-----

OctoTask represents a paradigm shift in AI-assisted coding. Originally inspired by the foundational concepts of Bolt.new, OctoTask has evolved into a comprehensive, high-scale ecosystem maintained by **KhulnaSoft** and a global network of elite developers.

## 🌟 Why OctoTask?

OctoTask isn't just a development tool—it's your intelligent partner in creation.

- **Unmatched Model Flexibility**: Seamlessly switch between 30+ cutting-edge models (OpenAI, Anthropic, DeepSeek, Groq, Ollama) on the fly.
- **True Full-Stack Browser Capability**: Run entire Node.js environments locally via advanced WebContainer technology. No local setup required.
- **Enterprise-Ready DevOps**: Integrated one-click deployment pipelines for Netlify, Vercel, and GitHub Pages.
- **Native Efficiency**: A purpose-built Electron desktop application for a distraction-free, high-performance experience.
- **AI-Native Terminal**: A terminal that understands your context, suggesting commands and fixing errors in real-time.

## 🛠️ Performance & Features

| Feature | Description |
| :--- | :--- |
| **Multi-Agent Engine** | Advanced agentic architecture for complex, multi-step code generation. |
| **Project Snapshots** | Robust state preservation—never lose a line of code again. |
| **MCP Integration** | Deep integration with the Model Context Protocol for seamless tool usage. |
| **Supabase Sync** | Full-stack data management with automated migrations. |
| **Visual Analytics** | Integrated data visualization for project metrics and performance. |
| **Voice-to-Code** | Speak your ideas; watch your application take form. |

## 🚀 Getting Started

### 📦 Binary Installation (Recommended)
Download the optimized production release for your OS:
[![GitHub release](https://img.shields.io/github/v/release/KhulnaSoft/octotask?label=Download%20OctoTask&style=for-the-badge&color=007BFF)](https://github.com/octotask/octotask/releases/latest)

> [!TIP]
> **macOS Security**: If the app reports as "damaged," run: `xattr -cr /path/to/OctoTask.app`

### 💻 Local Development
1. **Prepare Environment**:
   ```bash
   git clone https://github.com/octotask/octotask.git
   cd octotask
   pnpm install
   ```
2. **Configure API Keys**:
   ```bash
   cp .env.example .env.local
   # Define your PROVIDER_API_KEY in .env.local
   ```
3. **Launch**:
   ```bash
   pnpm run dev
   ```

## 🐳 Containerization
Run OctoTask in a standardized, isolated environment:
```bash
docker compose --profile production up -d
```

## 🌿 Branching Strategy

OctoTask uses a Git Flow-inspired branching model:

- **`stable`**: Production-ready releases (protected)
- **`main`**: Active development (protected)
- **`feature/*`**: New features
- **`bugfix/*`**: Bug fixes
- **`hotfix/*`**: Critical production fixes

For detailed branching guidelines, see [BRANCHING.md](./BRANCHING.md).

## 🤝 Join the Ecosystem
We are a community driven by innovation. Your contributions keep OctoTask at the cutting edge.
- **Discord**: [KhulnaSoft Community](https://discord.gg/khulnasoft)
- **Think Tank**: [oTTomator Discussion Board](https://thinktank.ottomator.ai)
- **AI Expert**: [OctoTask Studio](https://studio.ottomator.ai/)

## 📄 Licensing & Terms
Distributed under the **MIT License**.

> [!IMPORTANT]
> Use of WebContainer API for high-scale commercial operations requires a [commercial license](https://webcontainers.io/enterprise).

-----
<div align="center">
  Crafted with passion by <a href="https://khulnasoft.com">KhulnaSoft</a> and our Incredible Community.
</div>
