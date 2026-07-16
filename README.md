# GoalConsensus

**Byzantine Fault Tolerant World Cup 2026 Match Oracle**

A full-stack application that queries 3 independent football data providers, applies BFT consensus to determine verified match results, and exposes everything via an MCP Server with x402 micropayment per query.

## Architecture

GoalConsensus uses a **provider-based architecture** where every match result must come from a verified, independent data provider. No simulated or fabricated data is used at any layer.

### Provider Interface

Each data source implements the `Provider` interface:

```typescript
interface Provider {
  metadata: ProviderMetadata;  // id, name, baseUrl, rateLimit
  fetchMatches(): Promise<MatchResult[]>;
  healthCheck(): Promise<ProviderHealth>;
}
```

Providers include built-in timeout, retry logic (2 retries with exponential backoff), and health reporting.

### Registered Providers

| Provider | Source | API Key |
|---|---|---|
| `football-data` | football-data.org | `FOOTBALL_DATA_API_KEY` |
| `thesportsdb` | thesportsdb.com | Free (no key) |
| `api-football` | api-football via RapidAPI | `APIFOOTBALL_API_KEY` |

### BFT Consensus

Consensus is computed dynamically based on how many providers actually respond:

```
n = number of responding providers (dynamic)
f = floor((n-1)/3) — maximum faulty sources tolerated
threshold = ceil(2n/3) — providers that must agree
min_providers = 2 — minimum needed for any verdict
```

- **CONFIRMED** — threshold or more providers agree on the score
- **DISPUTED** — providers respond but disagree; threshold not met
- **PENDING** — match has not finished yet
- **INSUFFICIENT_DATA** — fewer than 2 providers responded

Confidence is calculated as `(agreeing_providers / total_responding) * 100`, reflecting actual provider agreement rather than a fixed denominator.

### Provider Health

Every API response includes `providerHealth` — an array showing each provider's availability, latency, and any error. The UI displays provider status in real time, showing unavailable providers instead of silently substituting fake data.

## The Problem

Prediction markets settle bets based on match results from a single data source. If that source is wrong or manipulated, bets can be settled incorrectly. GoalConsensus solves this by requiring agreement from multiple independent sources before declaring a result verified.

## Injective Technology Integration

| Technology | Usage |
|---|---|
| **MCP Server** | Tool transport layer — 4 tools exposed via `@modelcontextprotocol/sdk` StdioServerTransport |
| **x402** | Per-query micropayments — 0.001 USDC charged per API/MCP call with on-chain tx hash |
| **CCTP** | Cross-chain USDC settlement layer for prediction market payouts |
| **Agent Skills** | 4 MCP tools: `get_consensus_result`, `get_match_prediction`, `get_live_matches`, `verify_settlement` |

## Installation

```bash
# Clone and install
git clone <repo-url>
cd goalconsensus
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your API keys:
#   FOOTBALL_DATA_API_KEY — get from https://www.football-data.org/client/register
#   APIFOOTBALL_API_KEY — get from https://rapidapi.com/api-sports/api/api-football
#   GROQ_API_KEY — optional, for AI predictions
```

## Running

### Web App (Next.js)

```bash
npm run dev
```

Opens at [http://localhost:3000](http://localhost:3000).

### MCP Server (Claude Desktop)

```bash
npm run mcp
```

### Tests

```bash
npm test
```

### Connect to Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "goalconsensus": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/goalconsensus/mcp-server/index.ts"],
      "env": {
        "FOOTBALL_DATA_API_KEY": "",
        "APIFOOTBALL_API_KEY": "",
        "GROQ_API_KEY": ""
      }
    }
  }
}
```

## MCP Tools

| Tool | Description | Input |
|---|---|---|
| `get_consensus_result` | BFT consensus for a specific match | `homeTeam`, `awayTeam` |
| `get_match_prediction` | Groq AI prediction with probability | `homeTeam`, `awayTeam` |
| `get_live_matches` | All current matches with consensus status | None |
| `verify_settlement` | Check if result is safe for on-chain settlement | `matchId` |

## Why BFT Consensus Matters

If a prediction market settles based on one data source that is wrong or manipulated, it can be exploited. GoalConsensus requires agreement from multiple independent providers before returning a CONFIRMED verdict. This means:

- A single compromised source cannot cause incorrect settlement
- Manipulation requires compromising multiple independent APIs simultaneously
- The `verify_settlement` MCP tool lets smart contracts query consensus before paying out

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/matches` | GET | All matches with consensus status and provider health |
| `/api/consensus` | POST | BFT consensus for `{ homeTeam, awayTeam }` with provider health |
| `/api/predict` | POST | Groq AI prediction for `{ homeTeam, awayTeam }` |

All responses include `providerHealth` showing the status of each data provider.

## Test Coverage

Unit tests cover the consensus engine with 18 test cases:

- One provider responding (insufficient data)
- Two agreeing providers (confirmed)
- Two disagreeing providers (disputed)
- Three agreeing providers (confirmed, 100% confidence)
- Three providers with partial agreement (confirmed, 67% confidence)
- All providers unavailable (insufficient data)
- Two of three providers timing out (insufficient data)
- One provider down, two agreeing (confirmed)
- No match data returned (insufficient data)
- Scheduled/live matches (pending)
- Dynamic BFT threshold calculation
- Provider health propagation
- No simulated data references

## Tech Stack

- **Next.js 14** — App Router, API Routes, ISR caching
- **TypeScript** — Full type safety across all layers
- **Tailwind CSS** — Dark theme, functional design
- **@modelcontextprotocol/sdk** — MCP Server with StdioServerTransport
- **Groq SDK** — llama3-8b-8192 for match predictions
- **Axios** — Parallel API calls with retry and timeout
- **lucide-react** — Icons
- **Node.js test runner** — Built-in unit testing

## Project Structure

```
goalconsensus/
├── app/
│   ├── page.tsx                  # Main dashboard
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # Tailwind base
│   └── api/
│       ├── matches/route.ts      # GET — live matches with consensus
│       ├── predict/route.ts      # POST — Groq AI prediction
│       └── consensus/route.ts    # POST — BFT consensus engine
├── lib/
│   ├── providers.ts              # Provider interface, registry, fetch logic
│   ├── sources.ts                # Re-exports from providers
│   ├── consensus.ts              # BFT consensus engine (dynamic n)
│   ├── groq.ts                   # Groq SDK client
│   ├── x402.ts                   # x402 payment simulation
│   └── __tests__/
│       └── consensus.test.ts     # 18 unit tests for consensus
├── mcp-server/
│   └── index.ts                  # MCP Server (4 tools)
├── components/
│   ├── MatchCard.tsx             # Match card with consensus badge
│   ├── ConsensusIndicator.tsx    # Visual provider status display
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
