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
  version: "3.1.0",
});

server.tool(
  "predict_match",
  "Predict a football match result using AI ensemble voting (Statistical, LLM Reasoning, Deterministic Rules). Returns winner, score, ensemble confidence, minority opinion, upset probability, risk rating, and evidence chain. Use for upcoming/scheduled matches.",
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
            prediction: data.prediction ? {
              decision: data.prediction.predictionDecision,
              finalPrediction: data.prediction.finalPrediction,
              confidence: data.prediction.confidence,
              agreement: `${data.prediction.agreement}/${data.prediction.totalAgents}`,
              minorityOpinion: data.prediction.minorityOpinion
                ? {
                    agent: data.prediction.minorityOpinion.agentName,
                    predicted: data.prediction.minorityOpinion.prediction.winner,
                    score: `${data.prediction.minorityOpinion.prediction.homeScore ?? "?"}-${data.prediction.minorityOpinion.prediction.awayScore ?? "?"}`,
                    confidence: data.prediction.minorityOpinion.confidence,
                  }
                : null,
              upsetProbability: data.prediction.upsetProbability,
              riskRating: data.prediction.riskRating,
              reasoning: data.prediction.reasoning,
            } : null,
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
  "prediction_reasoning",
  "Get detailed AI ensemble reasoning for a match prediction. Returns per-agent reasoning, minority opinion, ensemble confidence breakdown, and upset probability.",
  {
    homeTeam: z.string().describe("Home team name"),
    awayTeam: z.string().describe("Away team name"),
  },
  async ({ homeTeam, awayTeam }) => {
    const data = await getPrediction(homeTeam, awayTeam);
    const queryId = `mcp-reasoning-${Date.now()}`;
    const payment = chargeX402("prediction_reasoning", queryId);

    if (!data.prediction) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              match: `${homeTeam} vs ${awayTeam}`,
              error: "No prediction available.",
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
            match: `${homeTeam} vs ${awayTeam}`,
            predictionDecision: data.prediction.predictionDecision,
            ensembleConfidence: data.prediction.confidence,
            agreement: `${data.prediction.agreement}/${data.prediction.totalAgents}`,
            upsetProbability: data.prediction.upsetProbability,
            riskRating: data.prediction.riskRating,
            reasoning: data.prediction.reasoning,
            agents: data.agentOutputs.map((a) => ({
              name: a.agentName,
              prediction: a.prediction,
              confidence: a.confidence,
              explanation: a.explanation,
            })),
            minorityOpinion: data.prediction.minorityOpinion
              ? {
                  agent: data.prediction.minorityOpinion.agentName,
                  winner: data.prediction.minorityOpinion.prediction.winner,
                  score: `${data.prediction.minorityOpinion.prediction.homeScore ?? "?"}-${data.prediction.minorityOpinion.prediction.awayScore ?? "?"}`,
                  confidence: data.prediction.minorityOpinion.confidence,
                  explanation: data.prediction.minorityOpinion.explanation,
                }
              : null,
            evidence: data.prediction.evidence.map((e) => ({
              source: e.source,
              detail: e.detail,
              weight: e.weight,
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
  "Verify a finished football match result for on-chain settlement using provider-level Byzantine Fault Tolerant consensus. Compares scores across multiple data providers (API-Football, SportMonks, Football-Data). Returns verification status, provider agreement, and disputed providers.",
  {
    homeTeam: z.string().describe("Home team name"),
    awayTeam: z.string().describe("Away team name"),
  },
  async ({ homeTeam, awayTeam }) => {
    const data = await getConsensus(homeTeam, awayTeam);
    const queryId = `mcp-verify-${Date.now()}`;
    const payment = chargeX402("verify_result", queryId);

    const response: Record<string, unknown> = {
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
    };

    if (data.verification) {
      response.verification = {
        verified: data.verification.verified,
        decision: data.verification.verificationDecision,
        agreement: `${data.verification.agreement}/${data.verification.totalProviders}`,
        disputedBy: data.verification.disputedBy,
        reasoning: data.verification.reasoning,
        providerScores: data.verification.providerScores.map((s) => ({
          provider: s.providerName,
          homeScore: s.homeScore,
          awayScore: s.awayScore,
        })),
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "verify_settlement",
  "Verify if a match result is safe for on-chain settlement. Returns settlement decision (SETTLE/DO_NOT_SETTLE), provider verification, and confidence score.",
  {
    query: z.string().describe("Team name or match description to search for"),
  },
  async ({ query }) => {
    const data = await verifySettlement(query);
    const queryId = `mcp-settle-${Date.now()}`;
    const payment = chargeX402("verify_settlement", queryId);

    const response: Record<string, unknown> = {
      match: data.match,
      safeForSettlement: data.safeForSettlement,
      settlementDecision: data.consensus.settlementDecision,
      confidence: data.consensus.confidence,
      agreement: `${data.consensus.agreement}/${data.consensus.totalAgents}`,
      agents: data.agentOutputs.map((a) => ({
        name: a.agentName,
        prediction: a.prediction,
        confidence: a.confidence,
      })),
      payment,
      x402Header: formatX402Header(),
    };

    if (data.verification) {
      response.verification = {
        verified: data.verification.verified,
        decision: data.verification.verificationDecision,
        providerAgreement: `${data.verification.agreement}/${data.verification.totalProviders}`,
        disputedBy: data.verification.disputedBy,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "get_provider_consensus",
  "Get provider-level consensus for a finished match. Compares scores across API-Football, SportMonks, and Football-Data providers. Returns provider agreement status and disputed providers.",
  {
    homeTeam: z.string().describe("Home team name"),
    awayTeam: z.string().describe("Away team name"),
  },
  async ({ homeTeam, awayTeam }) => {
    const data = await getConsensus(homeTeam, awayTeam);
    const queryId = `mcp-provider-${Date.now()}`;
    const payment = chargeX402("get_provider_consensus", queryId);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            match: `${data.consensus.canonicalState.homeTeam} vs ${data.consensus.canonicalState.awayTeam}`,
            canonicalState: {
              homeScore: data.consensus.canonicalState.homeScore,
              awayScore: data.consensus.canonicalState.awayScore,
              status: data.consensus.canonicalState.status,
              providerAgreement: data.consensus.canonicalState.providerAgreement,
              providerCount: data.consensus.canonicalState.providerCount,
            },
            verification: data.verification ? {
              verified: data.verification.verified,
              decision: data.verification.verificationDecision,
              agreement: `${data.verification.agreement}/${data.verification.totalProviders}`,
              disputedBy: data.verification.disputedBy,
              providerScores: data.verification.providerScores.map((s) => ({
                provider: s.providerName,
                homeScore: s.homeScore,
                awayScore: s.awayScore,
              })),
              reasoning: data.verification.reasoning,
            } : null,
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
  "Get all current football matches across all competitions. Scheduled matches show AI ensemble predictions, finished matches show BFT verification status. Returns match scores, status, and confidence scores.",
  {},
  async () => {
    const data = await getMatches();

    const matches = data.matches.map((m) => {
      const base = {
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        status: m.status,
        competition: m.competition,
      };

      if (m.status === "SCHEDULED" && m.prediction) {
        return {
          ...base,
          mode: "PREDICTION",
          predictionDecision: m.prediction.predictionDecision,
          confidence: m.prediction.confidence,
          agreement: `${m.prediction.agreement}/${m.prediction.totalAgents}`,
          upsetProbability: m.prediction.upsetProbability,
          riskRating: m.prediction.riskRating,
        };
      }

      if (m.status === "FINISHED" && m.verification) {
        return {
          ...base,
          mode: "VERIFICATION",
          verificationDecision: m.verification.verificationDecision,
          verified: m.verification.verified,
          providerAgreement: `${m.verification.agreement}/${m.verification.totalProviders}`,
        };
      }

      return {
        ...base,
        mode: "LIVE",
        settlementDecision: m.consensus?.settlementDecision || "PENDING",
        confidence: m.consensus?.confidence || 0,
        agreement: m.consensus
          ? `${m.consensus.agreement}/${m.consensus.totalAgents}`
          : "0/0",
      };
    });

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
  console.error("GoalConsensus MCP Server v3.1.0 running on stdio");
}

main().catch((err) => {
  console.error("MCP Server error:", err);
  process.exit(1);
});
