# GoalConsensus

**Multi-Agent Settlement Verification Engine for Football Prediction Markets**

GoalConsensus verifies football match results before prediction market settlement using three independent verification agents with Byzantine-inspired consensus. No single source can lie.

## Problem

Prediction markets settle bets based on match results from a single data source. If that source is wrong or manipulated, bets settle incorrectly. GoalConsensus solves this by:

1. Requiring agreement from multiple independent football data providers
2. Running three independent verification agents (Statistical, LLM, Rules)
3. Applying Byzantine-inspired consensus before recommending settlement

## Architecture

```
Football Data Providers (2)
         ↓
Canonical Match State
         ↓
┌─────────────────────────────────┐
│  Statistical Agent              │
│  (Poisson + Monte Carlo + xG)   │
├─────────────────────────────────┤
│  LLM Reasoning Agent            │
│  (Groq / LLaMA 3.3 70B)        │
├─────────────────────────────────┤
│  Deterministic Rules Agent      │
│  (7 data integrity checks)      │
└─────────────────────────────────┘
         ↓
Byzantine-Inspired Consensus
  (ceil(2n/3) threshold)
         ↓
Settlement Recommendation
         ↓
Injective MCP Server
         ↓
x402 Micropayments (0.001 USDC)
```

### Canonical Match State

Two independent football-only providers establish the **canonical match state**:

| Provider | Source | API Key |
|---|---|---|
| `football-data` | football-data.org | `FOOTBALL_DATA_API_KEY` |
| `thesportsdb` | thesportsdb.com | Free (no key) |

Both providers are filtered to return only football competitions. Non-football events are rejected. If fewer than 2 providers respond, the system returns `INSUFFICIENT_DATA`.

### Verification Agents

#### Statistical Agent
- Dynamic team rating service (cached 24h)
- Poisson regression for goal prediction
- Expected goals (xG) with attack/defense modifiers
- Home advantage factor (+0.35 xG)
- Head-to-head modifier
- Monte Carlo simulation (1,500 iterations)
- Entropy-based confidence calculation

#### LLM Reasoning Agent
- Groq with configurable model (`GROQ_MODEL` env var, default: `llama-3.3-70b-versatile`)
- Structured JSON output with prediction, confidence, and key factors
- Graceful fallback when API unavailable
- Rate limiting and caching
- Consensus continues using remaining agents when LLM fails

#### Deterministic Rules Agent
- Provider agreement validation (2+ required)
- Match completion verification
- Timestamp validation (-24h to +48h)
- Score consistency checks
- Provider health verification
- Response latency monitoring
- Duplicate detection

### Consensus Engine

Byzantine-inspired majority voting across active agents (excluding zero-confidence agents):

- **n** = active verification agents (typically 3)
- **threshold** = ceil(2n/3) agents that must agree
- **Confidence** = weighted average: agent confidence (60%) + agreement ratio (40%)

| Decision | Condition |
|---|---|
| `SETTLE` | Threshold met + match FINISHED + provider agreement |
| `DO_NOT_SETTLE` | Agents disagree or threshold not met |
| `PENDING` | Match not yet finished |
| `INSUFFICIENT_DATA` | <2 providers or no agent outputs |
| `UNSUPPORTED_SPORT` | Non-football sport received |

## Agent Skills (MCP Tools)

| Tool | Description | Input | Price |
|---|---|---|---|
| `get_consensus_result` | Full multi-agent consensus with settlement decision | `homeTeam`, `awayTeam` | 0.001 USDC |
| `get_match_prediction` | Individual agent predictions with evidence | `homeTeam`, `awayTeam` | 0.001 USDC |
| `verify_settlement` | Check if result is safe for on-chain settlement | `matchId` | 0.001 USDC |
| `get_live_matches` | All football matches with consensus status | None | Free |

All tools return structured JSON with agent reasoning, evidence chains, provider health, and x402 payment receipts.

## Tech Stack

- **Next.js 14** — App Router, API Routes, standalone build
- **TypeScript** — Full type safety across all layers
- **Tailwind CSS** — Design system with custom tokens
- **@modelcontextprotocol/sdk** — MCP Server (StdioServerTransport)
- **Groq SDK** — Configurable LLM for reasoning agent
- **Axios** — Parallel provider calls with retry/timeout
- **lucide-react** — Icon library
- **Node.js test runner** — Built-in unit testing

## Installation

```bash
git clone <repo-url>
cd goalconsensus
npm install

cp .env.example .env
# Configure:
#   FOOTBALL_DATA_API_KEY — https://www.football-data.org/client/register
#   GROQ_API_KEY — optional, for LLM Reasoning Agent
#   GROQ_MODEL — optional, defaults to llama-3.3-70b-versatile
```

## Running

```bash
npm run dev      # Next.js app at http://localhost:3000
npm run build    # Production build
npm run start    # Production server
npm run mcp      # MCP Server (stdio transport)
npm test         # Unit tests (24 test cases)
```

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/matches` | GET | Football matches with agent consensus + provider health |
| `/api/consensus` | POST | Full consensus: `{ homeTeam, awayTeam }` |
| `/api/predict` | POST | Agent predictions: `{ homeTeam, awayTeam }` |

## Deployment (Render)

The `render.yaml` deploys:
- **Web service** — Next.js production build
- **Cron job** — Keep-alive ping every 10 minutes

```yaml
services:
  - type: web
    name: goalconsensus
    runtime: node
    plan: free
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: GROQ_MODEL
        value: llama-3.3-70b-versatile
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
        "GROQ_API_KEY": "",
        "GROQ_MODEL": "llama-3.3-70b-versatile"
      }
    }
  }
}
```

## Test Coverage

24 unit tests covering:
- Football consensus (SETTLE, DO_NOT_SETTLE, PENDING)
- Unsupported sports (rugby, basketball, baseball)
- Provider timeout / insufficient data
- Provider disagreement
- One/two/three providers available
- LLM unavailable (zero confidence agent)
- All agents zero confidence
- Evidence aggregation and reasoning
- Confidence calculation (weighted average)
- Canonical state propagation

## Project Structure

```
goalconsensus/
├── app/
│   ├── page.tsx                  # Landing + search + verification flow
│   ├── layout.tsx                # Root layout with design system
│   ├── globals.css               # Design tokens + component styles
│   └── api/
│       ├── matches/route.ts      # GET — football matches + consensus
│       ├── predict/route.ts      # POST — agent predictions
│       └── consensus/route.ts    # POST — full consensus + settlement
├── lib/
│   ├── providers.ts              # 2 football data providers + canonical state
│   ├── team-ratings.ts           # Dynamic team rating service (24h cache)
│   ├── consensus.ts              # Byzantine-inspired voting engine
│   ├── groq.ts                   # Groq SDK utility
│   ├── x402.ts                   # x402 payment integration
│   ├── utils.ts                  # Shared utilities
│   ├── api.ts                    # Frontend API adapters
│   ├── sources.ts                # Re-exports
│   └── agents/
│       ├── types.ts              # Agent interfaces
│       ├── index.ts              # Agent registry
│       ├── statistical-agent.ts  # Poisson + xG + Monte Carlo + dynamic ratings
│       ├── llm-reasoning-agent.ts # Groq reasoning (graceful fallback)
│       └── deterministic-rules-agent.ts # 7-rule data integrity checks
├── components/
│   ├── Header.tsx                # Navigation header
│   ├── SearchBar.tsx             # Search with autocomplete + keyboard nav
│   ├── MatchCard.tsx             # Match card with consensus status
│   ├── ConsensusDisplay.tsx      # Full consensus result view
│   ├── ConfidenceGauge.tsx       # SVG confidence ring
│   ├── SettlementBadge.tsx       # Status badge (VERIFIED/DISPUTED/PENDING)
│   ├── VerificationTimeline.tsx  # Multi-stage loading visualization
│   ├── AgentCard.tsx             # Individual agent output card
│   ├── EvidenceCard.tsx          # Evidence chain viewer
│   ├── ProviderStatus.tsx        # Provider health display
│   ├── EmptyState.tsx            # Empty/error states
│   ├── Skeleton.tsx              # Loading skeletons
│   ├── LiveDashboard.tsx         # Auto-refreshing match grid
│   └── ConsensusIndicator.tsx    # Agent voting visualization
├── mcp-server/
│   └── index.ts                  # MCP Server v2.1.0 (4 tools, JSON output)
├── render.yaml                   # Render deployment config
└── .env.example                  # Environment variables
```

## Research Foundation

Implements BFT consensus principles from:

> [Byzantine Fault Tolerant Consensus for Decentralized Oracle Networks](https://zenodo.org/records/20577665)

## License

MIT
