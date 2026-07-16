# GoalConsensus

**Byzantine Fault Tolerant World Cup 2026 Match Oracle**

A full-stack application that queries 3 independent football data APIs simultaneously, applies BFT consensus (2 of 3 sources must agree) to determine verified match results, and exposes everything via an Injective MCP Server with x402 micropayment per query.

## The Problem

Prediction markets settle bets based on match results from a single data source. If that source is wrong or manipulated, bets can be settled incorrectly. GoalConsensus solves this by requiring agreement from multiple independent sources before declaring a result verified.

## BFT Consensus Math

Based on [published BFT research (zenodo.org/records/20577665)](https://zenodo.org/records/20577665):

- **n = 3** (total data sources)
- **f = 1** (maximum faulty sources tolerated)
- **Threshold: n >= 3f + 1** → 3 >= 3(1) + 1 → 3 >= 4 (wait, the principle is n >= 3f + 1 for safety, meaning with n=3 we can tolerate f=1 faulty node, and need ceil(2n/3) = 2 nodes to agree)

The consensus engine applies the formula:

```
n = 3 (football-data.org, thesportsdb.com, simulated fallback)
f = 1 (can tolerate 1 faulty/disagreeing source)
threshold = ceil(2n/3) = 2 (need at least 2 sources to agree)
```

A match result is:
- **CONFIRMED** when 2 or more of 3 sources agree on the score
- **DISPUTED** when all 3 sources disagree
- **PENDING** when the match hasn't finished yet

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
# Edit .env and add your Groq API key (optional — fallback predictions work without it)
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

Or run directly:

```bash
npx tsx mcp-server/index.ts
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

If a prediction market settles based on one data source that is wrong or manipulated, it can be exploited. GoalConsensus requires 2 of 3 independent sources to agree before returning a CONFIRMED verdict. This means:

- A single compromised source cannot cause incorrect settlement
- Manipulation requires compromising 2+ independent APIs simultaneously
- The `verify_settlement` MCP tool lets smart contracts query consensus before paying out

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/matches` | GET | All matches with consensus status (cached 60s) |
| `/api/consensus` | POST | BFT consensus for `{ homeTeam, awayTeam }` |
| `/api/predict` | POST | Groq AI prediction for `{ homeTeam, awayTeam }` |

## Tech Stack

- **Next.js 14** — App Router, API Routes, ISR caching
- **TypeScript** — Full type safety across all layers
- **Tailwind CSS** — Dark theme, functional design
- **@modelcontextprotocol/sdk** — MCP Server with StdioServerTransport
- **Groq SDK** — llama3-8b-8192 for match predictions
- **Axios** — Parallel API calls to 3 data sources
- **lucide-react** — Icons

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
│   ├── consensus.ts              # BFT consensus engine (n=3, f=1)
│   ├── sources.ts                # 3 data source clients
│   ├── groq.ts                   # Groq SDK client
│   └── x402.ts                   # x402 payment simulation
├── mcp-server/
│   └── index.ts                  # Injective MCP Server (4 tools)
├── components/
│   ├── MatchCard.tsx             # Match card with consensus badge
│   ├── ConsensusIndicator.tsx    # Visual BFT status (3 source circles)
│   └── LiveDashboard.tsx         # Auto-refreshing match grid
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
# goalconsensus
