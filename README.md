# GoalConsensus

**Multi-Agent Settlement Verification Platform**

A full-stack application that establishes canonical match state from independent data providers, then verifies results through three independent analysis agents with Byzantine-inspired consensus — exposing everything via an MCP Server with x402 micropayments.

## Architecture

```
Data Providers (2)          Verification Agents (3)         Consensus
┌─────────────────┐         ┌──────────────────────┐       ┌─────────────────┐
│ football-data   │──┐      │ Statistical Agent    │──┐    │                 │
│ thesportsdb     │──┼──────│ LLM Reasoning Agent  │──┼───▶│ Byzantine Vote  │──▶ Settlement
│                 │──┘      │ Deterministic Rules  │──┘    │                 │
└─────────────────┘         └──────────────────────┘       └─────────────────┘
     Canonical State               Agent Outputs                Decision
```

### Data Layer

Two independent providers establish the **canonical match state**:

| Provider | Source | API Key |
|---|---|---|
| `football-data` | football-data.org | `FOOTBALL_DATA_API_KEY` |
| `thesportsdb` | thesportsdb.com | Free (no key) |

If fewer than 2 providers respond, the canonical state cannot be established and the system returns `INSUFFICIENT_DATA`.

### Analysis Layer

Three independent verification agents analyze the canonical state:

#### 1. Statistical Agent
- Poisson regression model for goal prediction
- Team strength ratings (0-100 scale)
- Monte Carlo simulation for win/draw/loss probabilities
- Produces predicted score and confidence

#### 2. LLM Reasoning Agent
- Uses Groq (llama3-8b-8192) for contextual analysis
- Reasons about form, venue advantage, squad depth, tournament momentum
- Produces structured JSON with prediction, confidence, and key factors
- Falls back to home advantage heuristic when API unavailable

#### 3. Deterministic Rules Agent
- Provider agreement validation (2+ providers required)
- Match completion verification
- Timestamp validation (within ±24h to +48h)
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

Byzantine-inspired majority voting across the three agents:

- **n = 3** (verification agents)
- **threshold = ceil(2n/3) = 2** (agents that must agree)
- Confidence = `(agreeing_agents / total_agents) * 100`

| Decision | Condition |
|---|---|
| `SETTLE` | ≥2 agents agree + match FINISHED + provider agreement |
| `DO_NOT_SETTLE` | Agents disagree or threshold not met |
| `PENDING` | Match not yet finished |
| `INSUFFICIENT_DATA` | <2 providers or no agent outputs |

Consensus returns:
```typescript
{
  finalPrediction,
  agreement,
  confidence,
  minorityOpinion,
  evidence,
  reasoning,
  settlementDecision,
  agents,           // individual agent outputs
  canonicalState    // raw provider data
}
```

## The Problem

Prediction markets settle bets based on match results from a single data source. If that source is wrong or manipulated, bets can be settled incorrectly. GoalConsensus solves this by:
1. Requiring agreement from multiple independent data providers
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
```

## Running

```bash
npm run dev      # Next.js app at http://localhost:3000
npm run mcp      # MCP Server (stdio)
npm test         # Unit tests (18 test cases)
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
        "GROQ_API_KEY": ""
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
| `get_live_matches` | All matches with consensus status | None |
| `verify_settlement` | Check if result is safe for on-chain settlement | `matchId` |

All tools return agent reasoning, evidence, provider health, and x402 payment receipts.

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/matches` | GET | Matches with agent consensus + provider health |
| `/api/consensus` | POST | Full consensus: `{ homeTeam, awayTeam }` |
| `/api/predict` | POST | Agent predictions: `{ homeTeam, awayTeam }` |

## Test Coverage

18 unit tests covering:
- Three agreeing agents (SETTLE)
- Two agreeing, one disagreeing (SETTLE with minority)
- All three disagreeing (DO_NOT_SETTLE)
- Match not finished (PENDING)
- Provider disagreement (INSUFFICIENT_DATA)
- Null canonical state
- No agent outputs
- Two agents only
- Evidence aggregation
- Reasoning text generation
- Canonical state propagation

## Tech Stack

- **Next.js 14** — App Router, API Routes, ISR caching
- **TypeScript** — Full type safety across all layers
- **Tailwind CSS** — Dark theme, functional design
- **@modelcontextprotocol/sdk** — MCP Server with StdioServerTransport
- **Groq SDK** — llama3-8b-8192 for LLM Reasoning Agent
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
│       ├── matches/route.ts      # GET — matches with agent consensus
│       ├── predict/route.ts      # POST — individual agent predictions
│       └── consensus/route.ts    # POST — full consensus with settlement
├── lib/
│   ├── providers.ts              # 2 data providers + canonical state builder
│   ├── sources.ts                # Re-exports
│   ├── consensus.ts              # Agent-based Byzantine voting
│   ├── groq.ts                   # Groq SDK utility (used by LLM agent)
│   ├── x402.ts                   # x402 payment simulation
│   ├── agents/
│   │   ├── types.ts              # Agent interfaces and types
│   │   ├── index.ts              # Agent registry
│   │   ├── statistical-agent.ts  # Poisson model + Monte Carlo
│   │   ├── llm-reasoning-agent.ts # Groq-based reasoning
│   │   └── deterministic-rules-agent.ts # Rule-based validation
│   └── __tests__/
│       └── consensus.test.ts     # 18 unit tests
├── mcp-server/
│   └── index.ts                  # MCP Server v2.0 (4 tools)
├── components/
│   ├── MatchCard.tsx             # Match card with agent details + evidence
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
