# GoalConsensus

**Byzantine Fault Tolerant Oracle for Football Match Settlement**

GoalConsensus is a full-stack application that aggregates football match data from multiple independent providers, applies Byzantine Fault Tolerant (BFT) consensus to verify results, and exposes verified outcomes through an Injective MCP server with x402 micropayments.

Instead of trusting a single API, GoalConsensus requires agreement between multiple independent sources before a result is considered safe for settlement.

---

## Why GoalConsensus?

Prediction markets, betting protocols, and autonomous agents often rely on a single oracle for sports results. If that source is unavailable, incorrect, or manipulated, settlements may become inaccurate.

GoalConsensus addresses this by introducing a consensus layer that validates match results across multiple providers before returning a verdict.

Benefits include:

- Multi-source verification instead of a single oracle
- Byzantine Fault Tolerant consensus
- MCP tools for AI agents
- x402 micropayment support
- Designed for prediction market settlement

---

# Architecture

```
                     Football APIs
      ┌─────────────┬─────────────┬─────────────┐
      │ football-data.org │ TheSportsDB │ Fallback Source │
      └─────────────┴─────────────┴─────────────┘
                     │
                     ▼
            BFT Consensus Engine
                     │
      Requires at least 2 of 3 sources
             to agree on a result
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
      REST API             MCP Server
                               │
                               ▼
                    AI Agents / Prediction Markets
                               │
                               ▼
                     x402 Micropayment Layer
```

---

# How Consensus Works

GoalConsensus follows Byzantine Fault Tolerant principles.

For this implementation:

- **n = 3** independent data providers
- **threshold = 2**
- Up to **one provider** may disagree while consensus is still achieved.

Possible outcomes are:

| Status | Meaning |
|---------|---------|
| **CONFIRMED** | At least 2 providers agree |
| **DISPUTED** | All providers disagree |
| **PENDING** | Match has not finished |

This prevents a single faulty or compromised provider from determining the final result.

---

# Features

- Multi-source football result verification
- Byzantine Fault Tolerant consensus engine
- Injective MCP server
- x402 micropayment support
- REST API
- AI match predictions
- Live match dashboard
- Settlement verification endpoint

---

# Technology Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- Axios
- Groq SDK
- Model Context Protocol (MCP)
- Injective x402
- Node.js

---

# Project Structure

```
goalconsensus/
├── app/
│   ├── api/
│   │   ├── consensus/
│   │   ├── matches/
│   │   └── predict/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── ConsensusIndicator.tsx
│   ├── LiveDashboard.tsx
│   └── MatchCard.tsx
│
├── lib/
│   ├── consensus.ts
│   ├── groq.ts
│   ├── sources.ts
│   └── x402.ts
│
├── mcp-server/
│   └── index.ts
│
├── package.json
├── tsconfig.json
└── .env.example
```

---

# Installation

Clone the repository:

```bash
git clone https://github.com/orjinameh/goalconsensus.git

cd goalconsensus
```

Install dependencies:

```bash
npm install
```

Create your environment file:

```bash
cp .env.example .env
```

Add your API keys if available.

---

# Running the Application

Start the web application:

```bash
npm run dev
```

The dashboard will be available at:

```
http://localhost:3000
```

---

# Running the MCP Server

Start the MCP server:

```bash
npm run mcp
```

or

```bash
npx tsx mcp-server/index.ts
```

---

# Claude Desktop Configuration

```json
{
  "mcpServers": {
    "goalconsensus": {
      "command": "npx",
      "args": [
        "tsx",
        "/absolute/path/to/goalconsensus/mcp-server/index.ts"
      ],
      "env": {
        "GROQ_API_KEY": ""
      }
    }
  }
}
```

---

# MCP Tools

### get_consensus_result

Returns the verified consensus result for a match.

Input:

- homeTeam
- awayTeam

---

### get_match_prediction

Returns an AI prediction and confidence score.

Input:

- homeTeam
- awayTeam

---

### get_live_matches

Returns all live matches with their current consensus status.

Input:

None

---

### verify_settlement

Determines whether a match is safe for on-chain settlement.

Input:

- matchId

---

# REST API

## Get Live Matches

```
GET /api/matches
```

Returns all available matches with consensus status.

---

## Consensus Result

```
POST /api/consensus
```

Example request:

```json
{
  "homeTeam": "Argentina",
  "awayTeam": "Brazil"
}
```

---

## Match Prediction

```
POST /api/predict
```

Example request:

```json
{
  "homeTeam": "Argentina",
  "awayTeam": "Brazil"
}
```

---

# Use Cases

GoalConsensus can be integrated into:

- Prediction markets
- AI trading agents
- Autonomous betting agents
- Oracle networks
- Sports analytics platforms
- Smart contract settlement systems

---

# Research Basis

The consensus mechanism is inspired by Byzantine Fault Tolerant research for decentralized oracle networks, adapting multi-source agreement principles to football match verification.

---

# License

MIT License
