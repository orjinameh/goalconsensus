# GoalConsensus — AI Intelligence Marketplace Skill

## What this is

GoalConsensus is a multi-agent AI intelligence platform for the 2026 FIFA World Cup. Five specialist AI agents independently analyze every match, debate their positions, and produce a single transparent consensus verdict. All capabilities are exposed via MCP tools and REST APIs.

## When to use this skill

Use this skill when the user asks about:
- Football/soccer match predictions, analysis, or intelligence
- World Cup 2026 match data, odds, or statistics
- Team comparisons, player reports, or injury assessments
- Premium deep-dive match reports
- Prediction markets or match settlement
- Anything involving football data + AI analysis

## MCP Server Setup

The GoalConsensus MCP server exposes 15 tools. Connect via stdio:

```json
{
  "mcpServers": {
    "goalconsensus": {
      "command": "npx",
      "args": ["tsx", "/path/to/goalconsensus/mcp-server/index.ts"],
      "env": {
        "FOOTBALL_DATA_API_KEY": "",
        "GEMINI_API_KEY": ""
      }
    }
  }
}
```

Or via HTTP (SSE transport) — deployed at:

```json
{
  "mcpServers": {
    "goalconsensus": {
      "url": "https://goalconsensus.onrender.com/mcp/sse"
    }
  }
}
```

Local HTTP mode:
```bash
npm run mcp:http   # Starts on port 3001
# SSE endpoint: http://localhost:3001/sse
# Messages endpoint: http://localhost:3001/messages?sessionId=<id>
# Health check: http://localhost:3001/
```

Or query the REST API directly:
```
POST http://localhost:3000/api/intelligence
GET  http://localhost:3000/api/matches
POST http://localhost:3000/api/reports/generate
GET  http://localhost:3000/api/market
POST http://localhost:3000/api/market/stake
```

## The 5 Specialist Agents

| Agent | Domain | MCP Tools |
|---|---|---|
| **Tactical Analyst** | Formations, pressing triggers, set pieces, player matchups | `analyze_match`, `compare_teams` |
| **Statistical Agent** | Poisson models, Monte Carlo simulation, xG, win probabilities | `historical_analysis`, `qualification_scenarios` |
| **Market Analyst** | Betting odds, value detection, line movement, market sentiment | `market_analysis` |
| **Injury Analyst** | Squad fitness, suspensions, recovery timelines, depth assessment | `injury_report`, `player_report` |
| **News Analyst** | Recent form, motivation, manager quotes, contextual factors | (via `analyze_match`) |

## All 15 MCP Tools

### Intelligence Tools
- `analyze_match(homeTeam, awayTeam)` — Full 5-agent specialist analysis with live debate and consensus
- `compare_teams(homeTeam, awayTeam)` — Head-to-head ELO comparison with attack/defense ratings
- `historical_analysis(team)` — Dynamic ELO, form, historical performance data
- `qualification_scenarios(team)` — World Cup group stage qualification math

### Prediction Tools
- `predict_match(homeTeam, awayTeam)` — Ensemble prediction with upset probability and risk rating

### Specialist Tools
- `market_analysis(homeTeam, awayTeam)` — Odds analysis, implied probabilities, value detection
- `player_report(team)` — Squad analysis, key players, form ratings
- `injury_report(homeTeam, awayTeam)` — Fitness assessment for both squads

### Premium Tools (x402 payment required)
- `premium_report(homeTeam, awayTeam, reportType)` — Deep-dive report. Types: `full-tactical`, `historical-breakdown`, `player-report`, `market-intelligence`, `risk-report`
- `get_report_catalog()` — List available reports and prices

### Verification Tools
- `verify_result(homeTeam, awayTeam)` — BFT provider consensus verification
- `verify_settlement(query)` — Check if result is safe for on-chain settlement
- `get_provider_consensus(homeTeam, awayTeam)` — Cross-provider score comparison

### General Tools
- `get_live_matches()` — All active matches with intelligence status
- `consensus(homeTeam, awayTeam)` — BFT agent consensus (legacy)

## Typical Workflow

### Quick match analysis
```
1. analyze_match("Spain", "Argentina")
   → Returns specialist predictions, debate transcript, consensus verdict
```

### Deep dive with premium report
```
1. analyze_match("Spain", "Argentina")
   → Get consensus and specialist breakdowns
2. premium_report("Spain", "Argentina", "full-tactical")
   → Returns detailed tactical report (costs 0.002 USDC via x402)
```

### Prediction market flow
```
1. analyze_match("Spain", "Argentina")
   → Get consensus prediction and confidence
2. Place stake via REST API: POST /api/market/stake
   → CCTP settlement memo generated (Base Sepolia → Injective testnet)
3. After match: POST /api/market/resolve
   → Winners paid via CCTP cross-chain settlement
```

### Team comparison
```
1. compare_teams("Spain", "Argentina")
   → ELO ratings, attack/defense strength, form, expected outcome
2. historical_analysis("Spain")
   → Detailed historical performance and trends
```

## x402 Payment Flow

Premium reports and certain MCP tools require x402 micropayment (HTTP 402).

1. Client sends request without payment header
2. Server returns HTTP 402 with payment requirements:
   ```json
   {
     "status": 402,
     "protocol": "x402",
     "payment": {
       "amount": "0.001 USDC",
       "token": "USDC",
       "chain": "Injective Testnet",
       "networkId": "injective-testnet",
       "endpoint": "injective-testnet.evm.neutron.org"
     },
     "x402Version": "1"
   }
   ```
3. Client includes `X-PAYMENT` header with payment proof
4. Server validates and returns result with `X-PAYMENT-RESPONSE`

Prices: 0.001 USDC per MCP query, 0.002–0.01 USDC per premium report.

## CCTP Settlement Flow

Prediction market stakes are settled via Circle CCTP (Cross-Chain Transfer Protocol):

1. User places stake → CCTP transfer initiated (Base Sepolia → Injective testnet)
2. Transfer includes: source chain, destination chain, USDC amount, attestation hash
3. After market resolution, winners receive payouts via CCTP
4. All transfers tracked with tx hashes on both chains

## Example Agent Prompts

When the user asks "Who will win Spain vs Argentina?", do:
```
1. Call analyze_match("Spain", "Argentina")
2. Read the consensus.winner and consensus.confidence
3. Summarize: which agent agreed/disagreed and why
4. If confidence < 60%, mention the minority opinion
```

When the user asks for a deep analysis, do:
```
1. Call analyze_match("Spain", "Argentina") for overview
2. Call premium_report("Spain", "Argentina", "full-tactical") for tactical depth
3. Combine both into a comprehensive briefing
```

When the user asks about odds or betting value, do:
```
1. Call market_analysis("Spain", "Argentina")
2. Highlight any value bets (where AI probability differs from market)
3. Cross-reference with analyze_match consensus
```

## Response Format

All MCP tools return JSON with:
- `match`: "HomeTeam vs AwayTeam"
- `consensus`: { winner, confidence, agreement, totalAgents }
- `specialists`: Array of agent predictions with confidence and evidence
- `debate`: Array of agent messages with stance (supports/challenges/nuanced)
- `payment`: x402 receipt with tx hash
- `x402Header`: Payment protocol header

## Important Notes

- Agent confidence is weighted by evidence quality, not just agreement count
- "Challenges consensus" does NOT mean the agent is wrong — minority opinions often identify upset opportunities
- Premium reports use LLM-generated content with evidence attribution
- All predictions are for informational purposes, not financial advice
- CCTP transfers use testnet USDC (no real money)
