# GoalConsensus

**Football Settlement Verification Platform**

A full-stack football-only application that establishes canonical match state from two independent data providers, then verifies results through three independent analysis agents with Byzantine-inspired consensus — exposing everything via an MCP Server with x402 micropayments on Injective.

## Architecture

```
Football Data Providers (2)
        ↓
Canonical Match State
        ↓
Three Independent Verification Agents
        ↓
Byzantine-Inspired Consensus
        ↓
Settlement Verification
        ↓
Injective MCP Server
        ↓
x402 Micropayment
```

### Data Layer

Two independent football-only providers establish the **canonical match state**:

| Provider | Source | API Key |
|---|---|---|
| `football-data` | football-data.org | `FOOTBALL_DATA_API_KEY` |
| `thesportsdb` | thesportsdb.com | Free (no key) |

Both providers are filtered to return only football competitions. Non-football events are rejected.

If fewer than 2 providers respond, the canonical state cannot be established and the system returns `INSUFFICIENT_DATA`.

### Analysis Layer

Three independent verification agents analyze the canonical state:

#### 1. Statistical Agent
- Poisson regression model for football goal prediction
- Expected goals (xG) calculation based on team strength
- Home advantage factor (+0.35 xG)
- Monte Carlo simulation (10,000 iterations) for win/draw/loss probabilities
- Entropy-based confidence calculation from model certainty
- Produces predicted score and confidence

#### 2. LLM Reasoning Agent
- Uses Groq with configurable model (`GROQ_MODEL` env var)
- Defaults to `llama-3.3-70b-versatile`
- Reasons about form, venue advantage, historical matchups, squad depth, tactical matchup
- Produces structured JSON with prediction, confidence, and key factors
- Gracefully falls back when API unavailable — logs real error server-side, shows clean message to user
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

### Consensus Layer

Byzantine-inspired majority voting across active agents (excluding zero-confidence agents):

- **n = active verification agents** (typically 3)
- **threshold = ceil(2n/3)** (agents that must agree)
- **Confidence** = weighted average of agent confidence (60%) + agreement ratio (40%)

| Decision | Condition |
|---|---|
| `SETTLE` | Threshold agents agree + match FINISHED + provider agreement |
| `DO_NOT_SETTLE` | Agents disagree or threshold not met |
| `PENDING` | Match not yet finished |
| `INSUFFICIENT_DATA` | <2 providers or no agent outputs |
| `UNSUPPORTED_SPORT` | Non-football sport received |

### LLM Error Handling

When the Groq API fails:
- Real API error is logged on the server only
- User sees: "LLM temporarily unavailable. Consensus continued using the remaining verification agents."
- LLM agent returns zero confidence — excluded from consensus calculation
- Application continues functioning normally

## The Problem

Prediction markets settle bets based on match results from a single data source. If that source is wrong or manipulated, bets can be settled incorrectly. GoalConsensus solves this by:
1. Requiring agreement from multiple independent football data providers
2. Running three independent verification agents
3. Applying Byzantine-inspired consensus before recommending settlement

## Injective Technology Integration

| Technology | Usage |
|---|---|
| **MCP Server** | Tool transport — 4 tools via `@modelcontextprotocol/sdk` |
| **x402** | Per-query micropayments — 0.001 USDC per API/MCP call |
| **CCTP** | Cross-chain USDC settlement for prediction market payouts |
| **Agent Skills** | 4 MCP tools with full agent reasoning and evidence |

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
npm run mcp      # MCP Server (stdio)
npm test         # Unit tests (22 test cases)
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
        "GROQ_API_KEY": "",
        "GROQ_MODEL": "llama-3.3-70b-versatile"
      }
    }
  }
}
```

## MCP Tools

| Tool | Description | Input |
|---|---|---|
| `get_consensus_result` | Full multi-agent consensus with settlement decision | `homeTeam`, `awayTeam` |
| `get_match_prediction` | Individual agent predictions with evidence | `homeTeam`, `awayTeam` |
| `get_live_matches` | All football matches with consensus status | None |
| `verify_settlement` | Check if result is safe for on-chain settlement | `matchId` |

All tools return agent reasoning, evidence, provider health, and x402 payment receipts.

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/matches` | GET | Football matches with agent consensus + provider health |
| `/api/consensus` | POST | Full consensus: `{ homeTeam, awayTeam }` |
| `/api/predict` | POST | Agent predictions: `{ homeTeam, awayTeam }` |

## Test Coverage

22 unit tests covering:
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

## Tech Stack

- **Next.js 14** — App Router, API Routes, ISR caching
- **TypeScript** — Full type safety across all layers
- **Tailwind CSS** — Dark theme, functional design
- **@modelcontextprotocol/sdk** — MCP Server with StdioServerTransport
- **Groq SDK** — Configurable model for LLM Reasoning Agent
- **Axios** — Parallel provider calls with retry and timeout
- **lucide-react** — Icons
- **Node.js test runner** — Built-in unit testing

## Project Structure

```
goalconsensus/
├── app/
│   ├── page.tsx                  # Dashboard with architecture sidebar
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # Tailwind base
│   └── api/
│       ├── matches/route.ts      # GET — football matches with agent consensus
│       ├── predict/route.ts      # POST — individual agent predictions
│       └── consensus/route.ts    # POST — full consensus with settlement
├── lib/
│   ├── providers.ts              # 2 football data providers + canonical state builder
│   ├── sources.ts                # Re-exports
│   ├── consensus.ts              # Agent-based Byzantine voting
│   ├── groq.ts                   # Groq SDK utility (configurable model)
│   ├── x402.ts                   # x402 payment integration
│   ├── agents/
│   │   ├── types.ts              # Agent interfaces and types
│   │   ├── index.ts              # Agent registry
│   │   ├── statistical-agent.ts  # Poisson model + xG + Monte Carlo
│   │   ├── llm-reasoning-agent.ts # Groq-based reasoning (graceful fallback)
│   │   └── deterministic-rules-agent.ts # Rule-based validation
│   └── __tests__/
│       └── consensus.test.ts     # 22 unit tests
├── mcp-server/
│   └── index.ts                  # MCP Server v2.0 (4 tools)
├── components/
│   ├── MatchCard.tsx             # Match card with prediction/confidence display
│   ├── ConsensusIndicator.tsx    # Agent voting visualization
│   └── LiveDashboard.tsx         # Auto-refreshing match grid + provider health
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── .env.example
```

## Research Foundation

This project implements BFT consensus principles from:

> [Byzantine Fault Tolerant Consensus for Decentralized Oracle Networks](https://zenodo.org/records/20577665) — Published research on fault-tolerant consensus mechanisms for blockchain oracle systems.

## License

MIT
