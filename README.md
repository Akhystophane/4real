# 4RealEstate Flow

**Every real estate agent, their own marketing team.**

Real estate agents are losing listings to better marketers, not better agents. 73% of homeowners now say they're more likely to list with an agent who uses video marketing — but most agents face two bad options: pay €3,000+ a month for a content agency, or use generic AI tools that produce videos their audience scrolls past. Neither works.

4RealEstate Flow is the end-to-end AI content engine built for real estate agents. Four specialized AI agents run the entire content operation:

- **Content Planner** — continuously analyzes viral content across social media to build a weekly content calendar tailored to each agent's market
- **Video Agent** — handles creative execution end-to-end: script, edit, motion design, captions
- **Listing Video Maker** — turns property photos and details into cinematic listing videos in minutes
- **Ads Manager** — dynamically allocates paid spend based on which content is actually converting

From the first idea to the last click. Autonomously.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| Backend | Node.js, Express 5 |
| AI — Primary | Anthropic Claude (via AWS Bedrock, `eu-north-1`) |
| AI — Alternative | Google Gemini 2.0 Flash (switchable via `AI_PROVIDER=gemini`) |
| Voice-over | ElevenLabs multilingual v2 |
| Video pipeline | Pyramid API (compose, storyboard, render) |
| Stock footage | Pexels API |
| Hosting | Vultr — Milan, IT (2 vCPUs, 8 GB RAM) |
| Process manager | PM2 |
| Web server | nginx |

---

## Getting Started

```bash
# Install dependencies
npm install

# Copy and fill in your environment variables
cp .env.example .env

# Run frontend + backend
npm run dev        # Vite dev server → http://localhost:5173
npm run server     # Express API    → http://localhost:3001
```

### Environment Variables

```env
ANTHROPIC_API_KEY=        # Bedrock long-lived key (ABSK...) or Anthropic key (sk-ant-...)
ELEVENLABS_API_KEY=
PYRAMID_API_URL=
PYRAMID_API_KEY=
GEMINI_API_KEY=           # Optional — Google Gemini
AI_PROVIDER=anthropic     # Switch to "gemini" to route all AI calls through Gemini
```

---

## Live Demo

**http://66.245.203.24**
