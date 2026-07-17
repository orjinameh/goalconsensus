#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import {
  getConsensus,
  getPrediction,
  getMatches,
  verifySettlement,
} from "../lib/consensus-service.js";
import { chargeX402, formatX402Header } from "../lib/x402.js";

const server = new McpServer({
  name: "goalconsensus",
  version: "3.0.0",
});

server.tool(
  "predict_match",
  "Predict a football match result using 3 independent AI agents (Statistical, LLM Reasoning, Deterministic Rules) with Byzantine-inspired consensus. Returns winner, score, confidence, reasoning, and evidence chain.",
  {
    homeTeam: z.string().describe("Home team name (e.g. Argentina, Arsenal, Real Madrid)"),
    awayTeam: z.string().describe("Away team name (e.g. France, Chelsea, Barcelona)"),
  },
  async ({ homeTeam, awayTeam }) => {
    const data = await getPrediction(homeTeam, awayTeam);
    const queryId = `mcp-predict-${Date.now()}`;
    const payment = chargeX402("predict_match", queryId);

    if (!data.canonicalState) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "NO_DATA",
              match: `${homeTeam} vs ${awayTeam}`,
              reason: "No match data available for this fixture from any provider.",
              agents: [],
              payment,
            }, null, 2),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            match: `${data.canonicalState.homeTeam} vs ${data.canonicalState.awayTeam}`,
            canonicalState: {
              status: data.canonicalState.status,
              homeScore: data.canonicalState.homeScore,
              awayScore: data.canonicalState.awayScore,
            },
            agents: data.agentOutputs.map((a) => ({
              id: a.agentId,
              name: a.agentName,
              prediction: a.prediction,
              confidence: a.confidence,
              latencyMs: a.latencyMs,
              explanation: a.explanation,
              evidence: a.evidence.map((e) => ({
                detail: e.detail,
                weight: e.weight,
              })),
            })),
            payment,
            x402Header: formatX402Header(),
          }, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "verify_result",
  "Verify a football match result for on-chain settlement using multi-agent consensus. Searches by team name. Returns settlement decision, confidence, agent agreement, and evidence chain.",
  {
    homeTeam: z.string().describe("Home team name"),
    awayTeam: z.string().describe("Away team name"),
  },
  async ({ homeTeam, awayTeam }) => {
    const data = await getConsensus(homeTeam, awayTeam);
    const queryId = `mcp-consensus-${Date.now()}`;
    const payment = chargeX402("verify_result", queryId);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            match: `${data.consensus.canonicalState.homeTeam} vs ${data.consensus.canonicalState.awayTeam}`,
            canonicalState: {
              homeTeam: data.consensus.canonicalState.homeTeam,
              awayTeam: data.consensus.canonicalState.awayTeam,
              homeScore: data.consensus.canonicalState.homeScore,
              awayScore: data.consensus.canonicalState.awayScore,
              status: data.consensus.canonicalState.status,
              providerAgreement: data.consensus.canonicalState.providerAgreement,
              providerCount: data.consensus.canonicalState.providerCount,
            },
            settlementDecision: data.consensus.settlementDecision,
            finalPrediction: data.consensus.finalPrediction,
            confidence: data.consensus.confidence,
            agreement: `${data.consensus.agreement}/${data.consensus.totalAgents}`,
            minorityOpinion: data.consensus.minorityOpinion
              ? {
                  agent: data.consensus.minorityOpinion.agentName,
                  predicted: data.consensus.minorityOpinion.prediction.winner,
                  confidence: data.consensus.minorityOpinion.confidence,
                }
              : null,
            agents: data.agentOutputs.map((a) => ({
              name: a.agentName,
              prediction: a.prediction,
              confidence: a.confidence,
              latencyMs: a.latencyMs,
              explanation: a.explanation,
            })),
            evidence: data.consensus.evidence.map((e) => ({
              source: e.source,
              detail: e.detail,
              weight: e.weight,
            })),
            reasoning: data.consensus.reasoning,
            payment,
            x402Header: formatX402Header(),
          }, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "get_live_matches",
  "Get all current football matches across all competitions with multi-agent consensus status. Returns match scores, settlement decisions, confidence scores, and agent agreement counts. Free endpoint.",
  {},
  async () => {
    const data = await getMatches();

    const matches = data.matches.map((m) => ({
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      status: m.status,
      competition: m.competition,
      settlementDecision: m.consensus?.settlementDecision || "PENDING",
      confidence: m.consensus?.confidence || 0,
      agreement: m.consensus
        ? `${m.consensus.agreement}/${m.consensus.totalAgents}`
        : "0/0",
    }));

    const providerHealth = data.providerHealth.map((p) => ({
      id: p.providerId,
      available: p.available,
      latencyMs: p.latencyMs,
    }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            matches,
            providerHealth,
            fetchedAt: data.fetchedAt,
          }, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "get_consensus",
  "Get full multi-agent consensus for a specific football match. Returns canonical state, settlement decision, confidence, agent agreement, minority opinion, evidence chain, and reasoning.",
  {
    homeTeam: z.string().describe("Home team name"),
    awayTeam: z.string().describe("Away team name"),
  },
  async ({ homeTeam, awayTeam }) => {
    const data = await getConsensus(homeTeam, awayTeam);
    const queryId = `mcp-consensus-${Date.now()}`;
    const payment = chargeX402("get_consensus", queryId);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            match: `${data.consensus.canonicalState.homeTeam} vs ${data.consensus.canonicalState.awayTeam}`,
            canonicalState: {
              homeTeam: data.consensus.canonicalState.homeTeam,
              awayTeam: data.consensus.canonicalState.awayTeam,
              homeScore: data.consensus.canonicalState.homeScore,
              awayScore: data.consensus.canonicalState.awayScore,
              status: data.consensus.canonicalState.status,
              providerAgreement: data.consensus.canonicalState.providerAgreement,
              providerCount: data.consensus.canonicalState.providerCount,
            },
            settlementDecision: data.consensus.settlementDecision,
            finalPrediction: data.consensus.finalPrediction,
            confidence: data.consensus.confidence,
            agreement: `${data.consensus.agreement}/${data.consensus.totalAgents}`,
            minorityOpinion: data.consensus.minorityOpinion
              ? {
                  agent: data.consensus.minorityOpinion.agentName,
                  predicted: data.consensus.minorityOpinion.prediction.winner,
                  confidence: data.consensus.minorityOpinion.confidence,
                }
              : null,
            agents: data.agentOutputs.map((a) => ({
              name: a.agentName,
              prediction: a.prediction,
              confidence: a.confidence,
              latencyMs: a.latencyMs,
              explanation: a.explanation,
            })),
            evidence: data.consensus.evidence.map((e) => ({
              source: e.source,
              detail: e.detail,
              weight: e.weight,
            })),
            reasoning: data.consensus.reasoning,
            payment,
            x402Header: formatX402Header(),
          }, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "team_analysis",
  "Get team analysis including dynamic ELO rating, attack/defense strength, and recent form for any football team.",
  {
    team: z.string().describe("Team name (e.g. Arsenal, Real Madrid, Brazil)"),
  },
  async ({ team }) => {
    const { getTeamRating, getHeadToHeadModifier } = await import("../lib/team-ratings.js");
    const rating = getTeamRating(team);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            team: rating.team,
            rating: rating.rating,
            elo: rating.elo,
            attackStrength: Math.round(rating.attackStrength * 100),
            defenseStrength: Math.round(rating.defenseStrength * 100),
            recentForm: Math.round(rating.recentForm * 100),
            expectedGoals: rating.expectedGoals.toFixed(2),
            homeAdvantage: rating.homeAdvantage,
            lastUpdated: rating.lastUpdated,
          }, null, 2),
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("GoalConsensus MCP Server v3.0.0 running on stdio");
}

main().catch((err) => {
  console.error("MCP Server error:", err);
  process.exit(1);
});
