# GoalConsensus — The World Cup Intelligence Terminal

**Five AI agents. Live debate. Premium reports. Predictions markets. Built on Injective.**

A full-stack multi-agent AI intelligence platform that analyzes every match in the 2026 FIFA World Cup using five specialist agents, live AI debate, premium deep-dive reports, and a prediction market with cross-chain USDC settlement.

---

## What It Does

### Five Specialist Agents

Each agent is an autonomous domain expert:

| Agent | Domain | Approach |
|---|---|---|
| **Tactical Analyst** | Formation analysis, pressing triggers, set-piece vulnerability | ELO-weighted team ratings, home advantage factor (+0.35 xG), historical matchup data |
| **Statistical Agent** | Goal prediction, win probabilities, expected goals | Poisson regression, Monte Carlo simulation (10,000 iterations), entropy-based confidence |
| **Market Analyst** | Odds analysis, value detection, line movement | Poisson-derived odds vs bookmaker odds, value identification, market consensus |
| **Injury Analyst** | Squad fitness, recovery timelines, depth assessment | Injury database matching, ELO-adjusted squad strength, position coverage analysis |
| **News Analyst** | Form analysis, context, motivation, travel factors | Recent form calculation (last 5 matches), home/away performance, rest days |

### Live AI Debate

After all five agents produce their individual analyses, a structured debate runs:

1. **Round 1** — Each agent presents their stance (agree/disagree/neutral) with the tactical analyst's prediction
2. **Round 2** — Agents respond to each other's arguments
3. **Consensus** — The system derives a winner, confidence score, agreement level, and minority opinion

Every message in the debate is visible to the user with agent name, stance badge, and reasoning.

### Premium Reports

Deep-dive intelligence reports gated behind x402 micropayments:

| Report | Price | Content |
|---|---|---|
| Full Tactical Breakdown | 0.005 USDC | 3,000+ word formation analysis, pressing triggers, key battles |
| Historical Deep Dive | 0.003 USDC | Head-to-head records, venue-specific trends, rivalry context |
| Player Impact Report | 0.002 USDC | Key player profiles, form analysis, tactical roles, impact scores |
| Market Intelligence | 0.004 USDC | Odds comparison, value opportunities, market sentiment, line movement |
| Risk Assessment | 0.01 USDC | Injury risks, fatigue factors, discipline concerns, squad depth |

### Prediction Markets

Stake on match outcomes with cross-chain USDC settlement:

- View dynamic odds based on AI agent consensus
- Place stakes (win/draw/loss) with confidence-weighted payouts
- Markets resolve automatically when verified results are confirmed
- CCTP bridge supports cross-chain USDC transfers (Ethereum, Arbitrum, Base)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     The Intelligence Terminal                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐                │
│   │ Tactical  │  │Statistical│  │ Market   │  ... (5)      │
│   │ Analyst   │  │  Agent   │  │ Analyst  │                │
│   └─────┬─────┘  └─────┬────┘  └─────┬────┘               │
│         │              │              │                     │
│         ▼              ▼              ▼                     │
│   ┌─────────────────────────────────────────────┐           │
│   │            AI Debate Engine                  │           │
│   │  (Round 1 → Round 2 → Consensus)            │           │
│   └──────────────────┬──────────────────────────┘           │
│                      │                                       │
│          ┌───────────┼────────────┐                          │
│          ▼           ▼            ▼                          │
│   ┌────────────┐ ┌─────────┐ ┌──────────┐                  │
│   │ Prediction  │ │Premium  │ │Prediction│                  │
│   │  Engine     │ │Reports  │ │ Markets  │                  │
│   │(Ensemble)   │ │(x402)   │ │(CCTP)    │                  │
│   └──────┬─────┘ └────┬────┘ └────┬─────┘                  │
│          │            │            │                         │
│          ▼            ▼            ▼                         │
│   ┌─────────────────────────────────────────────┐           │
│   │              MCP Server (15 tools)           │           │
│   │         x402 micropayment receipts           │           │
│   └─────────────────────────────────────────────┘           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Data Pipeline

1. **Canonical State** — Two football-only providers (football-data.org, thesportsdb.com) establish the source of truth
2. **Specialist Analysis** — Five agents independently analyze the match using team ratings, Poisson models, injury data, and news context
3. **AI Debate** — Agents debate and form consensus with visible agreement/disagreement
4. **Intelligence Delivery** — Results served via MCP Server, REST API, or UI

---

## Injective Technology Integration

| Technology | Implementation | Purpose |
|---|---|---|
| **MCP Server** | `@modelcontextprotocol/sdk` with StdioServerTransport | Agent tool protocol — 15 tools for match intelligence |
| **x402** | Payment receipts per API/MCP call (0.001 USDC) | Micropayments for premium reports and market access |
| **CCTP** | Cross-chain USDC transfers via Axelar | Prediction market settlement across EVM chains |
| **Agent Skills** | Structured MCP tool definitions with reasoning | Full agent reasoning, evidence, and provider health in every response |

### MCP Tools (15)

| Tool | Category | Description |
|---|---|---|
| `analyze_match` | Intelligence | Full specialist analysis with all 5 agents |
| `compare_teams` | Intelligence | Head-to-head comparison with specialist breakdown |
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
| `get_live_matches` | General | All matches with mode-aware status |
| `get_report_catalog` | Premium | Available report types and pricing |
| `get_qualification_scenarios` | Intelligence | World Cup group stage scenarios |

---

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/matches` | GET | Football matches with predictions/verification |
| `/api/consensus` | POST | Full BFT consensus (`{ homeTeam, awayTeam }`) |
| `/api/predict` | POST | Ensemble prediction (`{ homeTeam, awayTeam }`) |
| `/api/intelligence` | POST | Full specialist analysis (`{ homeTeam, awayTeam }`) |
| `/api/reports/catalog` | GET | Premium report types and pricing |
| `/api/reports/generate` | POST | Generate premium report |
| `/api/market` | GET | Prediction market odds for all matches |
| `/api/market/stake` | POST | Place a stake on match outcome |
| `/api/market/resolve` | POST | Resolve a prediction market |

---

## Setup

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

## Running

```bash
npm run dev      # Next.js app — http://localhost:3000
npm run mcp      # MCP Server (stdio)
npm test         # 24 unit tests
npm run build    # Production build
```

## Claude Desktop Integration

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
- **lucide-react** — Icons
- **Node.js test runner** — 24 unit tests

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

## Project Structure

```
goalconsensus/
├── app/
│   ├── page.tsx                      # World Cup Intelligence Terminal homepage
│   ├── layout.tsx                    # Root layout with metadata
│   ├── globals.css                   # Design system + animations
│   └── api/
│       ├── matches/route.ts          # GET — matches with predictions/verification
│       ├── predict/route.ts          # POST — ensemble prediction
│       ├── consensus/route.ts        # POST — full BFT consensus
│       ├── intelligence/route.ts     # POST — specialist agent analysis
│       ├── reports/
│       │   ├── catalog/route.ts      # GET — premium report catalog
│       │   └── generate/route.ts     # POST — generate premium report
│       └── market/
│           ├── route.ts              # GET — prediction market odds
│           ├── stake/route.ts        # POST — place a stake
│           └── resolve/route.ts      # POST — resolve market
├── lib/
│   ├── agents/
│   │   ├── types.ts                  # 15+ types: specialist agents, debate, reports, markets
│   │   ├── index.ts                  # Agent registry (legacy + 5 specialists)
│   │   ├── tactical-analyst.ts       # Specialist — formation, pressing, set pieces
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
│   ├── ConsensusDisplay.tsx          # AI Ensemble / BFT display
│   ├── VerificationTimeline.tsx      # Step-by-step verification
│   ├── MatchCard.tsx                 # Match cards
│   └── Header.tsx                    # Terminal / Developers / Docs nav
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

## License

MIT
