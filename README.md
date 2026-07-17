# GoalConsensus

**Multi-Agent Football Intelligence Platform**

Predict and verify football match results across every competition using 3 independent AI agents with Byzantine-inspired consensus. Built for prediction market settlement on Injective.

## Architecture

```
Browser / MCP Client
       |
   REST API  /  MCP Server (stdio / remote)
       |
  ConsensusService  (single source of truth)
       |
   +---+---+---+
   |       |       |
Statistical  LLM   Deterministic
  Agent    Reasoning   Rules
  (Poisson   Agent    Agent
  + Monte   (Provider  (7 data
  Carlo)     Chain)    checks)
       |
  BFT Consensus Engine
       |
  Settlement Decision
```

### Two Modes

**Prediction Mode** (before kickoff)
- 3 independent AI agents predict winner, exact score, confidence, risk
- Byzantine consensus determines settlement recommendation

**Verification Mode** (after full time)
- Same agents verify official score, provider agreement, timestamp integrity
- Automatic settlement decision: SETTLE / DO_NOT_SETTLE / PENDING

## AI Agents

| Agent | Method | What It Does |
|-------|--------|--------------|
| Statistical | Poisson + 1500 Monte Carlo sims | Dynamic ELO, xG, home advantage, recent form |
| LLM Reasoning | Provider chain (Gemini / Groq / OpenRouter / Heuristic) | Tactical analysis, key factors, contextual reasoning |
| Deterministic Rules | 7 data integrity checks | Provider agreement, timestamps, score consistency |

### LLM Provider Chain

```
1. Google Gemini  (primary)
2. Groq           (secondary)
3. OpenRouter     (tertiary)
4. Heuristic      (always-available fallback)
```

- Circuit breaker per provider (3 failures = open, 60s recovery)
- Single-flight request deduplication (no duplicate LLM calls)
- 6-hour prediction cache
- Never exposes provider errors to users

## Supported Competitions

All competitions available from football-data.org and TheSportsDB:

- Premier League, La Liga, Bundesliga, Serie A, Ligue 1
- Champions League, Europa League, Conference League
- MLS, Copa Libertadores
- FIFA World Cup, UEFA Nations League
- And more as providers add them

## Consensus Engine

Byzantine Fault Tolerant voting:
- Agents group by predicted score
- BFT threshold: ceil(2n/3) agreement required
- Confidence = avg agent confidence * 0.6 + agreement ratio * 40
- Minority opinion tracked and surfaced

## MCP Server

GoalConsensus exposes a Model Context Protocol server with 5 tools:

| Tool | Description | Price |
|------|-------------|-------|
| `predict_match` | Full agent prediction for a fixture | 0.001 USDC |
| `verify_result` | Settlement verification with consensus | 0.001 USDC |
| `get_consensus` | Full consensus with all evidence | 0.001 USDC |
| `get_live_matches` | All matches across competitions | Free |
| `team_analysis` | ELO, attack/defense, form for any team | Free |

### Claude Desktop Integration

```json
{
  "mcpServers": {
    "goalconsensus": {
      "command": "npx",
      "args": ["tsx", "mcp-server/index.ts"],
      "cwd": "/path/to/goalconsensus"
    }
  }
}
```

## x402 Protocol

Micropayment integration for premium MCP tools:
- Payment happens before ConsensusService execution
- Injective Testnet for settlement
- Receipt includes tx hash, amount, chain, timestamp
- Free tier: live matches, team analysis

## Tech Stack

- **Framework**: Next.js 14 (App Router, standalone)
- **UI**: React 18, Tailwind CSS, Lucide icons
- **AI**: Provider chain (Gemini / Groq / OpenRouter / Heuristic)
- **MCP**: @modelcontextprotocol/sdk with stdio transport
- **Language**: TypeScript 5.4

## Getting Started

```bash
# Clone
git clone https://github.com/your-org/goalconsensus.git
cd goalconsensus

# Install
npm install

# Configure
cp .env.example .env
# Edit .env with your API keys

# Development
npm run dev

# Production build
npm run build
npm start

# MCP server
npm run mcp

# Tests
npm test
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FOOTBALL_DATA_API_KEY` | Yes | football-data.org API key |
| `GEMINI_API_KEY` | No | Google Gemini API key (primary LLM) |
| `GEMINI_MODEL` | No | Model name (default: gemini-2.0-flash) |
| `GROQ_API_KEY` | No | Groq API key (secondary LLM) |
| `GROQ_MODEL` | No | Model name (default: llama-3.3-70b-versatile) |
| `OPENROUTER_API_KEY` | No | OpenRouter API key (tertiary LLM) |
| `OPENROUTER_MODEL` | No | Model name (default: meta-llama/llama-3.3-70b-instruct) |

At least one LLM API key is recommended for AI reasoning. Without any, the heuristic fallback provides basic predictions.

## Deployment

### Render (Recommended)

The included `render.yaml` configures:
- Web service with health checks
- Keepalive cron job (prevents free-tier spin-down)
- All environment variables pre-configured

### Docker

```bash
docker build -t goalconsensus .
docker run -p 3000:3000 \
  -e FOOTBALL_DATA_API_KEY=your_key \
  -e GEMINI_API_KEY=your_key \
  goalconsensus
```

## Project Structure

```
goalconsensus/
  app/
    api/
      matches/route.ts     GET  - All matches with consensus
      consensus/route.ts   POST - Full consensus pipeline
      predict/route.ts     POST - Agent predictions
    layout.tsx             Root layout with metadata
    page.tsx               Main application
    globals.css            Design system
  lib/
    consensus-service.ts   Central service (all consumers call this)
    providers.ts           Football data providers (2 providers, all competitions)
    team-ratings.ts        Dynamic ELO-based team ratings
    consensus.ts           BFT consensus engine
    x402.ts                Payment protocol
    api.ts                 Frontend API client
    utils.ts               Utilities
    llm/
      chain.ts             LLM provider chain with circuit breaker
      types.ts             Provider interface
      single-flight.ts     Request deduplication
      circuit-breaker.ts   Circuit breaker pattern
      providers/
        gemini.ts          Google Gemini
        groq.ts            Groq
        openrouter.ts      OpenRouter
        heuristic.ts       Heuristic fallback
    agents/
      types.ts             Agent interfaces
      index.ts             Agent registry
      statistical-agent.ts Poisson + Monte Carlo
      llm-reasoning-agent.ts Provider chain agent
      deterministic-rules-agent.ts Data integrity checks
  components/              14 React components
  mcp-server/index.ts      MCP server (5 tools)
  render.yaml              Render deployment
  Dockerfile               Docker deployment
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/matches` | All matches with consensus |
| POST | `/api/consensus` | Full consensus for a fixture |
| POST | `/api/predict` | Agent predictions for a fixture |

## License

MIT
