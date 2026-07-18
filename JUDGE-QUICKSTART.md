# GoalConsensus — Judge Quick Start

> Five AI agents. Live debate. One consensus. Built on Injective.

## What this does

GoalConsensus is an AI intelligence marketplace for the 2026 World Cup. Five specialist AI agents (Tactical, Statistical, Market, Injury, News) independently analyze every match, debate their positions in a visible transcript, and produce a single consensus verdict with confidence scores and minority opinions.

## How to run it

```bash
git clone https://github.com/orjinameh/goalconsensus.git
cd goalconsensus
npm install
cp .env.example .env   # add your GEMINI_API_KEY and FOOTBALL_DATA_API_KEY
npm run dev             # opens at http://localhost:3000
```

No API keys? The app still loads — it will show matches from football-data.org without LLM analysis.

## What to click

1. **Homepage** — See the agent marketplace, stats bar, how-it-works flow
2. **Search a match** — Type "Spain" or click a suggested match
3. **Watch agents analyze** — 5 specialist cards appear one by one with predictions
4. **Read the debate** — Agents challenge each other's reasoning in real-time
5. **See consensus** — Confidence gauge, agent position breakdown, minority opinion
6. **Try a premium report** — Click "Purchase" on any report (x402 gated, 0.002 USDC)
7. **Prediction market** — Expand to see odds, place a stake, CCTP settlement shown
8. **Developer Portal** — Click "Developers" in nav for MCP tools, API docs, x402 pricing
9. **MCP Server** — Run `npm run mcp` then test with: `echo '{"tool":"get_live_matches"}' | npx tsx mcp-server/index.ts`

## Injective Technologies Used

| Technology | Where to find it | What it does |
|---|---|---|
| **MCP Server** | `mcp-server/index.ts` (15 tools) | Any AI agent can access GoalConsensus intelligence |
| **x402** | `lib/x402.ts`, premium reports API | HTTP 402 micropayments for premium reports (0.001–0.01 USDC) |
| **CCTP** | `lib/cctp.ts`, prediction market | Cross-chain USDC settlement (Base Sepolia → Injective testnet) |
| **Agent Skills** | `agent-skills/goalconsensus/SKILL.md` | Portable skill file teaching agents to use our MCP tools |

## Code map (where to look)

```
lib/agents/           → 5 specialist AI agents with LLM reasoning
lib/debate-engine.ts  → AI debate: agents challenge each other, reach consensus
lib/premium-reports.ts → 5 premium report types with x402 gating
lib/cctp.ts           → CCTP cross-chain USDC transfer logic
lib/x402.ts           → x402 payment receipts and 402 gating
mcp-server/index.ts   → MCP Server v4.0.0 with 15 tools
app/page.tsx          → Homepage with agent marketplace
components/           → UI components (IntelligencePanel, DebateFeed, SpecialistCard, etc.)
```

## Tests

```bash
npm test    # 24 unit tests covering consensus, providers, agents, confidence
```

## Tech stack

Next.js 14, TypeScript, Tailwind CSS, @modelcontextprotocol/sdk, Gemini/Groq/OpenRouter LLM chain, football-data.org + thesportsdb.com live data.
