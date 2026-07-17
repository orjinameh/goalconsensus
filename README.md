# GoalConsensus — The AI Intelligence Marketplace for the 2026 World Cup

> **Five AI agents independently analyze every match, debate their positions, and produce a single transparent verdict you can verify.**

Football intelligence is broken. Single-source predictions with no debate, no accountability, and no transparency. GoalConsensus fixes this with a marketplace of specialist AI agents that disagree, challenge each other, and reach consensus — all visible to you.

Built for the **Injective Global Cup**.

---

## The Problem

- **Single-source bias** — Most prediction sites use one model. When it's wrong, there's no fallback.
- **No debate** — No system shows you *why* agents agree or disagree. You get a number, not reasoning.
- **No accountability** — Black-box predictions with no evidence trail. You can't verify anything.
- **No developer access** — Closed APIs, rate limits, and subscriptions lock out builders.

## The Solution

GoalConsensus is an intelligence marketplace where five specialist AI agents work independently, debate openly, and produce consensus transparently.

```
  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
  │  Football    │───▶│  Canonical   │───▶│  5 Specialist   │
  │  Data APIs   │    │  State       │    │  AI Agents      │
  └─────────────┘    └──────────────┘    └────────┬────────┘
                                                  │
                      ┌───────────────────────────┘
                      ▼
              ┌──────────────┐    ┌──────────────────────┐
              │  AI Debate   │───▶│  Consensus Output    │
              │  Engine      │    │  + Premium Reports   │
              └──────────────┘    │  + Prediction Market │
                                  └──────────────────────┘
```

---

## The Agents

Each agent is an independent domain expert. They analyze the same match from different angles, then debate to reach consensus.

| Agent | Domain | Approach |
|---|---|---|
| **Tactical Analyst** | Formations, pressing, set pieces | ELO-weighted ratings, home advantage, historical matchups |
| **Statistical Agent** | Goal prediction, win probabilities | Poisson regression, Monte Carlo (10k iterations), entropy-based confidence |
| **Market Analyst** | Odds analysis, value detection | Poisson-derived odds vs bookmaker odds, market consensus |
| **Injury Analyst** | Squad fitness, suspensions | Injury database, ELO-adjusted squad strength, position coverage |
| **News Analyst** | Form, motivation, context | Recent form (last 5 matches), home/away splits, rest days |

### Live Debate

After all five agents produce their analyses, a structured debate runs:

1. **Round 1** — Each agent presents their stance (supports/challenges/nuanced) with the tactical analyst's prediction
2. **Round 2** — Agents respond to each other's arguments
3. **Consensus** — A weighted verdict emerges with confidence score, agreement level, and minority opinion

Every message in the debate is visible — agent name, stance, reasoning, and confidence.

---

## Injective Technology

| Technology | What it does | Why it matters |
|---|---|---|
| **MCP Server** | 15 tools via Model Context Protocol | Any AI agent can access GoalConsensus intelligence |
| **x402 Payments** | HTTP 402 micropayments in USDC | Premium reports gated at $0.002–$0.01 per query |
| **CCTP Bridge** | Cross-chain USDC via Axelar | Prediction market settlement across EVM chains |
| **Agent Skills** | Structured tool definitions with reasoning | Full evidence chain in every response |

### MCP Tools (15)

| Tool | Category | Description |
|---|---|---|
| `analyze_match` | Intelligence | Full 5-agent specialist analysis |
| `compare_teams` | Intelligence | Head-to-head with specialist breakdown |
| `historical_analysis` | Intelligence | Historical matchup and venue data |
| `predict_match` | Prediction | AI ensemble prediction with upset probability |
| `market_analysis` | Specialist | Odds analysis and value detection |
| `player_report` | Specialist | Player impact and form analysis |
| `injury_report` | Specialist | Squad fitness and injury assessment |
| `premium_report` | Premium | Deep-dive report (x402 payment required) |
| `verify_result` | Verification | BFT provider verification |
| `verify_settlement` | Verification | Settlement safety check |
| `get_provider_consensus` | Verification | Cross-provider score comparison |
| `consensus` | Legacy | BFT agent consensus for live matches |
| `get_live_matches` | General | All matches with intelligence status |
| `get_report_catalog` | Premium | Available report types and pricing |
| `qualification_scenarios` | Intelligence | World Cup group stage scenarios |

---

## Premium Reports

Deep-dive intelligence reports gated behind x402 micropayments:

| Report | Price | Content |
|---|---|---|
| Full Tactical Breakdown | 0.005 USDC | 3,000+ word formation analysis, pressing triggers, key battles |
| Historical Deep Dive | 0.003 USDC | Head-to-head records, venue trends, rivalry context |
| Player Impact Report | 0.002 USDC | Key player profiles, form, tactical roles, impact scores |
| Market Intelligence | 0.004 USDC | Odds comparison, value opportunities, line movement |
| Risk Assessment | 0.01 USDC | Injury risks, fatigue, discipline, squad depth |

---

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/matches` | GET | Football matches with intelligence status |
| `/api/intelligence` | POST | Full 5-agent specialist analysis |
| `/api/consensus` | POST | BFT agent consensus (legacy) |
| `/api/predict` | POST | Ensemble prediction (scheduled) |
| `/api/reports/catalog` | GET | Premium report types and pricing |
| `/api/reports/generate` | POST | Generate premium report (x402) |
| `/api/market` | GET | Prediction market odds |
| `/api/market/stake` | POST | Place a stake (CCTP) |
| `/api/market/resolve` | POST | Resolve a market |

---

## Quick Start

```bash
git clone https://github.com/orjinameh/goalconsensus.git
cd goalconsensus
npm install

cp .env.example .env
# Required:
#   FOOTBALL_DATA_API_KEY — https://www.football-data.org/client/register
# Optional (LLM providers, in priority order):
#   GEMINI_API_KEY — Primary LLM
#   GROQ_API_KEY — Fallback LLM
#   OPENROUTER_API_KEY — Third fallback
```

```bash
npm run dev      # Next.js app — http://localhost:3000
npm run mcp      # MCP Server (stdio)
npm test         # 24 unit tests
npm run build    # Production build
```

### Claude Desktop Integration

```json
{
  "mcpServers": {
    "goalconsensus": {
      "command": "npx",
      "args": ["tsx", "/path/to/goalconsensus/mcp-server/index.ts"],
      "env": {
        "FOOTBALL_DATA_API_KEY": "",
        "GEMINI_API_KEY": "",
        "GROQ_API_KEY": ""
      }
    }
  }
}
```

---

## Tech Stack

- **Next.js 14** — App Router, API Routes, ISR caching
- **TypeScript** — Full type safety across all layers
- **Tailwind CSS** — Dark theme, Bloomberg/Perplexity-inspired design
- **@modelcontextprotocol/sdk** — MCP Server with 15 tools
- **Gemini / Groq / OpenRouter** — Multi-provider LLM chain with circuit breaker
- **Axios** — Parallel provider calls with retry and timeout
- **Node.js test runner** — 24 unit tests

---

## Project Structure

```
goalconsensus/
├── app/
│   ├── page.tsx                      # Homepage — agent marketplace + live intelligence
│   ├── layout.tsx                    # Root layout with metadata
│   ├── globals.css                   # Design system + animations
│   └── api/
│       ├── matches/route.ts          # GET — matches with intelligence status
│       ├── intelligence/route.ts     # POST — 5-agent specialist analysis
│       ├── consensus/route.ts        # POST — BFT consensus (legacy)
│       ├── predict/route.ts          # POST — ensemble prediction
│       ├── reports/
│       │   ├── catalog/route.ts      # GET — premium report catalog
│       │   └── generate/route.ts     # POST — generate premium report (x402)
│       └── market/
│           ├── route.ts              # GET — prediction market odds
│           ├── stake/route.ts        # POST — place a stake
│           └── resolve/route.ts      # POST — resolve market
├── lib/
│   ├── agents/
│   │   ├── types.ts                  # 15+ types: specialist agents, debate, reports, markets
│   │   ├── index.ts                  # Agent registry
│   │   ├── tactical-analyst.ts       # Specialist — formations, pressing, set pieces
│   │   ├── statistical-agent.ts      # Specialist — Poisson, Monte Carlo, xG
│   │   ├── market-analyst.ts         # Specialist — odds, value, line movement
│   │   ├── injury-analyst.ts         # Specialist — fitness, recovery, depth
│   │   ├── news-analyst.ts           # Specialist — form, context, motivation
│   │   ├── llm-reasoning-agent.ts    # Multi-LLM reasoning (graceful fallback)
│   │   └── deterministic-rules-agent.ts # Rule-based validation
│   ├── debate-engine.ts              # AI debate: runDebate(), consensus derivation
│   ├── premium-reports.ts            # Premium report generation (5 types)
│   ├── prediction-market.ts          # Prediction market logic
│   ├── cctp.ts                       # CCTP bridge integration
│   ├── prediction-engine.ts          # Weighted ensemble voting
│   ├── verification-engine.ts        # BFT provider verification
│   ├── consensus.ts                  # Legacy BFT agent consensus
│   ├── consensus-service.ts          # Central service: specialists, intelligence, reports
│   ├── team-ratings.ts               # Dynamic ELO + attack/defense strength
│   ├── providers.ts                  # Football data providers + canonical state
│   ├── llm/
│   │   ├── index.ts                  # Gemini → Groq → OpenRouter chain
│   │   ├── single-flight.ts          # Request deduplication
│   │   └── circuit-breaker.ts        # Provider failure isolation
│   ├── x402.ts                       # x402 payment receipts
│   └── __tests__/
│       └── consensus.test.ts         # 24 unit tests
├── components/
│   ├── IntelligencePanel.tsx         # Main intelligence orchestrator
│   ├── SpecialistCard.tsx            # Individual specialist agent card
│   ├── DebateFeed.tsx                # AI debate message feed
│   ├── PremiumReportCard.tsx         # Premium report purchase card
│   ├── PredictionMarketPanel.tsx     # Prediction market interface
│   ├── ConsensusDisplay.tsx          # AI ensemble / BFT display
│   ├── VerificationTimeline.tsx      # Step-by-step verification
│   ├── ConfidenceGauge.tsx           # Consensus confidence ring
│   ├── MatchCard.tsx                 # Match cards with intelligence status
│   ├── SearchBar.tsx                 # Match search with autocomplete
│   ├── EmptyState.tsx                # Empty/error state component
│   ├── Skeleton.tsx                  # Loading skeletons
│   ├── Header.tsx                    # Terminal / Developers / Docs nav
│   └── ProviderStatus.tsx            # Provider health display
├── mcp-server/
│   └── index.ts                      # MCP Server v4.0.0 (15 tools)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── Dockerfile
├── render.yaml
└── .env.example
```

---

## Test Coverage

24 tests covering:
- Football match consensus (SETTLE, DO_NOT_SETTLE, PENDING)
- Unsupported sports rejection
- Provider timeout and insufficient data
- Provider disagreement handling
- LLM unavailability and zero-confidence agents
- Evidence aggregation across agents
- Confidence calculation and minority opinion
- Canonical state propagation

---

## License

MIT
