# GoalConsensus

**Multi-Agent Football Intelligence Platform**

A full-stack football-only application that predicts upcoming match results using AI ensemble voting and verifies finished results through BFT provider consensus — exposing everything via an MCP Server with x402 micropayments on Injective.

## Two-Engine Architecture

```
                    ┌─────────────────────────┐
                    │   Match Status Router     │
                    └──────┬──────────┬────────┘
                           │          │
              SCHEDULED    │          │  FINISHED
                           ▼          ▼
              ┌────────────────┐  ┌─────────────────────┐
              │ Prediction     │  │ Verification Engine  │
              │ Engine         │  │ (BFT Provider)       │
              │ (Ensemble)     │  │                      │
              └───────┬────────┘  └──────────┬───────────┘
                      │                      │
        ┌─────────────┼──────────┐    ┌──────┼────────────┐
        ▼             ▼          ▼    ▼      ▼            ▼
   Statistical    LLM       Rules  API-FB  SportMonks  Football-Data
   (Poisson)    (Groq)    (Check)   │         │            │
        │             │          │    └──────┬──┘            │
        └─────┬───────┘          │         │               │
              │                  │    Provider Score     Provider Score
              ▼                  │         │               │
     Weighted Ensemble           │         └───────┬───────┘
     Voting                      │                 │
              │                  │         Majority Agreement
              ▼                  │                 │
     AI Ensemble Prediction      ▼                 ▼
     (upset prob, risk)    BFT Verification   Verified/Disputed
```

### Prediction Engine (Scheduled Matches)

Uses **weighted ensemble voting** (NOT BFT) to predict upcoming match results:

- Each of 3 agents votes on winner and score
- Votes weighted by agent confidence
- Ensemble picks majority score, then majority winner
- Returns: ensemble confidence, agreement %, minority opinion, upset probability, risk rating

| Decision | Condition |
|---|---|
| `UNANIMOUS` | All 3 agents agree on score |
| `STRONG_MAJORITY` | ≥67% agents agree |
| `MAJORITY` | ≥2 agents agree |
| `SPLIT` | No clear majority |
| `COMPLETED` | Match already finished |
| `INSUFFICIENT_DATA` | No agent outputs |

### Verification Engine (Finished Matches)

Uses **BFT provider consensus** to verify finished match results:

- Compares scores across API-Football, SportMonks, and Football-Data
- Requires ≥67% provider agreement on score
- Verifies canonical state matches majority provider score
- Returns: verified/disputed, provider agreement, disputed providers

| Decision | Condition |
|---|---|
| `VERIFIED` | ≥67% providers agree + canonical state confirmed |
| `DISPUTED` | Providers report different scores |
| `INSUFFICIENT_DATA` | <2 providers available |

### Live Matches

Live matches use the legacy BFT agent consensus (Statistical + LLM + Rules agents) for real-time monitoring.

## Data Layer

Two independent football-only providers establish the **canonical match state**:

| Provider | Source | API Key |
|---|---|---|
| `football-data` | football-data.org | `FOOTBALL_DATA_API_KEY` |
| `thesportsdb` | thesportsdb.com | Free (no key) |

Both providers are filtered to return only football competitions. Non-football events are rejected.

If fewer than 2 providers respond, the canonical state cannot be established and the system returns `INSUFFICIENT_DATA`.

## Analysis Layer

Three independent verification agents analyze the canonical state:

#### 1. Statistical Agent
- Poisson regression model for football goal prediction
- Expected goals (xG) calculation based on team strength
- Home advantage factor (+0.35 xG)
- Monte Carlo simulation (10,000 iterations) for win/draw/loss probabilities
- Entropy-based confidence calculation from model certainty
- Produces predicted score and confidence

#### 2. LLM Reasoning Agent
- Uses Gemini (primary), Groq (fallback), OpenRouter (fallback)
- Multi-provider LLM chain with automatic failover
- Reasons about form, venue advantage, historical matchups, squad depth, tactical matchup
- Produces structured JSON with prediction, confidence, and key factors
- Gracefully falls back when all APIs unavailable
- Consensus continues using remaining agents when LLM fails

#### 3. Deterministic Rules Agent
- Provider agreement validation (2+ providers required)
- Match completion verification
- Timestamp validation (within -24h to +48h)
- Data consistency checks (plausible scores)
- Provider health verification

Each agent returns:
```typescript
{
  prediction: { winner, homeScore, awayScore },
  confidence: number,       // 0-100
  explanation: string,
  evidence: AgentEvidence[]
}
```

### LLM Provider Chain

When the primary LLM fails:
- Real API error is logged on the server only
- System automatically falls back to next provider in chain: Gemini → Groq → OpenRouter → Heuristic
- Circuit breaker prevents repeated failures to same provider
- User sees clean fallback messages
- Application continues functioning normally

## The Problem

Prediction markets settle bets based on match results from a single data source. If that source is wrong or manipulated, bets can be settled incorrectly. GoalConsensus solves this by:
1. Requiring agreement from multiple independent football data providers (BFT verification)
2. Running three independent AI agents with ensemble voting for predictions
3. Automatic mode switching based on match status

## Injective Technology Integration

| Technology | Usage |
|---|---|
| **MCP Server** | Tool transport — 7 tools via `@modelcontextprotocol/sdk` |
| **x402** | Per-query micropayments — 0.001 USDC per API/MCP call |
| **CCTP** | Cross-chain USDC settlement for prediction market payouts |
| **Agent Skills** | 7 MCP tools with full agent reasoning and evidence |

## Installation

```bash
git clone <repo-url>
cd goalconsensus
npm install

cp .env.example .env
# Configure:
#   FOOTBALL_DATA_API_KEY — https://www.football-data.org/client/register
#   GEMINI_API_KEY — optional, primary LLM provider
#   GROQ_API_KEY — optional, fallback LLM provider
#   OPENROUTER_API_KEY — optional, third fallback LLM provider
```

## Running

```bash
npm run dev      # Next.js app at http://localhost:3000
npm run mcp      # MCP Server (stdio)
npm test         # Unit tests (24 test cases)
```

### Claude Desktop

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

## MCP Tools

### Prediction Tools (Scheduled Matches)

| Tool | Description | Input |
|---|---|---|
| `predict_match` | AI ensemble prediction with upset probability and risk rating | `homeTeam`, `awayTeam` |
| `prediction_reasoning` | Detailed ensemble reasoning with minority opinion | `homeTeam`, `awayTeam` |

### Verification Tools (Finished Matches)

| Tool | Description | Input |
|---|---|---|
| `verify_result` | BFT provider verification with settlement decision | `homeTeam`, `awayTeam` |
| `verify_settlement` | Check if result is safe for on-chain settlement | `query` |
| `get_provider_consensus` | Provider-level score comparison across data sources | `homeTeam`, `awayTeam` |

### General Tools

| Tool | Description | Input |
|---|---|---|
| `get_live_matches` | All matches with mode-aware status (prediction/verification/live) | None |
| `team_analysis` | Dynamic ELO rating, attack/defense strength, recent form | `team` |

All tools return agent reasoning, evidence, provider health, and x402 payment receipts.

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/matches` | GET | Football matches with predictions (scheduled) or verification (finished) |
| `/api/consensus` | POST | Full consensus: `{ homeTeam, awayTeam }` — auto-routes by match status |
| `/api/predict` | POST | Ensemble prediction: `{ homeTeam, awayTeam }` |

## Test Coverage

24 unit tests covering:
- Football matches (SETTLE, DO_NOT_SETTLE, PENDING)
- Unsupported sports (rugby, basketball, baseball)
- Provider timeout / insufficient data
- Provider disagreement
- One provider available
- Two providers available
- Three providers available
- LLM unavailable (zero confidence agent)
- All agents zero confidence
- Successful consensus
- Evidence aggregation
- Reasoning text generation
- Canonical state propagation
- Confidence calculation
- Minority opinion handling

## Tech Stack

- **Next.js 14** — App Router, API Routes, ISR caching
- **TypeScript** — Full type safety across all layers
- **Tailwind CSS** — Dark theme, functional design
- **@modelcontextprotocol/sdk** — MCP Server with StdioServerTransport
- **Gemini / Groq / OpenRouter** — Multi-provider LLM chain with circuit breaker
- **Axios** — Parallel provider calls with retry and timeout
- **lucide-react** — Icons
- **Node.js test runner** — Built-in unit testing

## Project Structure

```
goalconsensus/
├── app/
│   ├── page.tsx                  # Dashboard with mode-aware UI
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # Tailwind base
│   └── api/
│       ├── matches/route.ts      # GET — matches with predictions/verification
│       ├── predict/route.ts      # POST — ensemble prediction
│       └── consensus/route.ts    # POST — full consensus by match status
├── lib/
│   ├── providers.ts              # Football data providers + canonical state builder
│   ├── prediction-engine.ts      # Weighted ensemble voting (scheduled matches)
│   ├── verification-engine.ts    # BFT provider verification (finished matches)
│   ├── consensus.ts              # Legacy BFT agent consensus (live matches)
│   ├── consensus-service.ts      # Routes by match status: predict/verify/live
│   ├── team-ratings.ts           # Dynamic ELO + attack/defense strength
│   ├── llm/
│   │   ├── index.ts              # Gemini → Groq → OpenRouter chain
│   │   ├── single-flight.ts      # Request deduplication
│   │   └── circuit-breaker.ts    # Provider failure isolation
│   ├── agents/
│   │   ├── types.ts              # Agent interfaces, PredictionResult, ConsensusResult
│   │   ├── index.ts              # Agent registry
│   │   ├── statistical-agent.ts  # Poisson model + xG + Monte Carlo
│   │   ├── llm-reasoning-agent.ts # Multi-LLM reasoning (graceful fallback)
│   │   └── deterministic-rules-agent.ts # Rule-based validation
│   ├── x402.ts                   # x402 payment integration
│   └── __tests__/
│       └── consensus.test.ts     # 24 unit tests
├── mcp-server/
│   └── index.ts                  # MCP Server v3.1 (7 tools)
├── components/
│   ├── MatchCard.tsx             # Match card with mode-aware labels
│   ├── ConsensusDisplay.tsx      # AI Ensemble / BFT Verification display
│   ├── VerificationTimeline.tsx  # Step-by-step verification progress
│   └── SearchBar.tsx             # Match search
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── Dockerfile
├── render.yaml
└── .env.example
```

## Research Foundation

This project implements BFT consensus principles from:

> [Byzantine Fault Tolerant Consensus for Decentralized Oracle Networks](https://zenodo.org/records/20577665) — Published research on fault-tolerant consensus mechanisms for blockchain oracle systems.

## License

MIT
