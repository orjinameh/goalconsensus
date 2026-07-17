#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import {
  fetchAllProviders,
  fetchMatchesForPair,
  buildCanonicalState,
} from "../lib/providers.js";
import { agents } from "../lib/agents/index.js";
import { computeAgentConsensus } from "../lib/consensus.js";
import { chargeX402, formatX402Header } from "../lib/x402.js";
import type { CanonicalMatchState } from "../lib/agents/types.js";

const server = new McpServer({
  name: "goalconsensus",
  version: "2.1.0",
});

server.tool(
  "get_consensus_result",
  "Get multi-agent consensus for a football match. Canonical state from 2 providers, verified by 3 independent agents (Statistical, LLM Reasoning, Deterministic Rules) with Byzantine-inspired consensus voting. Returns settlement decision, confidence score, agent agreement, minority opinion, full evidence chain, and x402 payment receipt.",
  {
    homeTeam: z.string().describe("Home team name (e.g. Argentina, France, Brazil)"),
    awayTeam: z.string().describe("Away team name (e.g. France, Argentina, Germany)"),
  },
  async ({ homeTeam, awayTeam }) => {
    const canonicalState = await buildCanonicalState(homeTeam, awayTeam);

    if (!canonicalState) {
      const queryId = `mcp-consensus-${Date.now()}`;
      const payment = chargeX402("get_consensus_result", queryId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "INSUFFICIENT_DATA",
              match: `${homeTeam} vs ${awayTeam}`,
              reason: "No canonical match state available. Both providers returned no data for this fixture.",
              settlementDecision: "INSUFFICIENT_DATA",
              confidence: 0,
              agreement: 0,
              totalAgents: 0,
              agents: [],
              evidence: [],
              payment,
            }, null, 2),
          },
        ],
      };
    }

    if (canonicalState.sport !== "FOOTBALL") {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "UNSUPPORTED_SPORT",
              sport: canonicalState.sport,
              reason: "GoalConsensus only supports football. All verification agents reject non-football sports.",
            }, null, 2),
          },
        ],
      };
    }

    const agentOutputs = await Promise.all(
      agents.map((agent) => agent.verify(canonicalState))
    );

    const consensus = computeAgentConsensus(agentOutputs, canonicalState);
    const queryId = `mcp-consensus-${Date.now()}`;
    const payment = chargeX402("get_consensus_result", queryId);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            match: `${canonicalState.homeTeam} vs ${canonicalState.awayTeam}`,
            canonicalState: {
              homeTeam: canonicalState.homeTeam,
              awayTeam: canonicalState.awayTeam,
              homeScore: canonicalState.homeScore,
              awayScore: canonicalState.awayScore,
              status: canonicalState.status,
              providerAgreement: canonicalState.providerAgreement,
              providerCount: canonicalState.providerCount,
            },
            settlementDecision: consensus.settlementDecision,
            finalPrediction: consensus.finalPrediction,
            confidence: consensus.confidence,
            agreement: `${consensus.agreement}/${consensus.totalAgents}`,
            minorityOpinion: consensus.minorityOpinion
              ? {
                  agent: consensus.minorityOpinion.agentName,
                  predicted: consensus.minorityOpinion.prediction.winner,
                  confidence: consensus.minorityOpinion.confidence,
                }
              : null,
            agents: agentOutputs.map((a) => ({
              name: a.agentName,
              prediction: a.prediction,
              confidence: a.confidence,
              latencyMs: a.latencyMs,
              explanation: a.explanation,
            })),
            evidence: consensus.evidence.map((e) => ({
              source: e.source,
              detail: e.detail,
              weight: e.weight,
            })),
            reasoning: consensus.reasoning,
            payment,
            x402Header: formatX402Header(),
          }, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "get_match_prediction",
  "Get individual predictions from all 3 verification agents for a football match. Returns Statistical (Poisson + Monte Carlo), LLM Reasoning (Groq), and Deterministic Rules agent outputs with evidence chains.",
  {
    homeTeam: z.string().describe("Home team name"),
    awayTeam: z.string().describe("Away team name"),
  },
  async ({ homeTeam, awayTeam }) => {
    const canonicalState = await buildCanonicalState(homeTeam, awayTeam);

    if (!canonicalState) {
      const queryId = `mcp-predict-${Date.now()}`;
      const payment = chargeX402("get_match_prediction", queryId);
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

    const agentOutputs = await Promise.all(
      agents.map((agent) => agent.verify(canonicalState))
    );

    const queryId = `mcp-predict-${Date.now()}`;
    const payment = chargeX402("get_match_prediction", queryId);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            match: `${canonicalState.homeTeam} vs ${canonicalState.awayTeam}`,
            canonicalState: {
              status: canonicalState.status,
              homeScore: canonicalState.homeScore,
              awayScore: canonicalState.awayScore,
            },
            agents: agentOutputs.map((a) => ({
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
  "get_live_matches",
  "Get all current football matches with multi-agent consensus status. Returns match scores, settlement decisions, confidence scores, and agent agreement counts. Free endpoint — no x402 charge.",
  {},
  async () => {
    const providerResults = await fetchAllProviders();
    const allMatches = providerResults
      .flatMap((pr) => pr.matches)
      .filter((m) => m.sport === "FOOTBALL");

    const grouped = new Map<string, typeof allMatches>();
    for (const m of allMatches) {
      const key = `${m.homeTeam.toLowerCase()}-${m.awayTeam.toLowerCase()}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(m);
    }

    const matches: Array<{
      homeTeam: string;
      awayTeam: string;
      homeScore: number | null;
      awayScore: number | null;
      status: string;
      settlementDecision: string;
      confidence: number;
      agreement: string;
    }> = [];

    for (const [, group] of grouped) {
      const first = group[0];
      const responding = providerResults.filter(
        (pr) => pr.health.available
      );

      const canonicalState: CanonicalMatchState = {
        homeTeam: first.homeTeam,
        awayTeam: first.awayTeam,
        homeScore: first.homeScore,
        awayScore: first.awayScore,
        status: first.status,
        matchDate: first.matchDate,
        sport: "FOOTBALL",
        providerAgreement: responding.length >= 2,
        providerCount: responding.length,
        providerHealth: providerResults.map((pr) => pr.health),
        rawResults: group,
      };

      const agentOutputs = await Promise.all(
        agents.map((agent) => agent.verify(canonicalState))
      );
      const consensus = computeAgentConsensus(agentOutputs, canonicalState);

      matches.push({
        homeTeam: first.homeTeam,
        awayTeam: first.awayTeam,
        homeScore: first.homeScore,
        awayScore: first.awayScore,
        status: first.status,
        settlementDecision: consensus.settlementDecision,
        confidence: consensus.confidence,
        agreement: `${consensus.agreement}/${consensus.totalAgents}`,
      });
    }

    const providerHealth = providerResults.map((pr) => ({
      id: pr.providerId,
      available: pr.health.available,
      latencyMs: pr.health.latencyMs,
    }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            matches,
            providerHealth,
            fetchedAt: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "verify_settlement",
  "Check whether a football match result is safe for on-chain settlement using multi-agent consensus. Searches by team name or match ID. Returns boolean settlement safety, full consensus details, and x402 payment receipt.",
  {
    matchId: z.string().describe("Match ID, team name, or 'Home vs Away' string"),
  },
  async ({ matchId }) => {
    const providerResults = await fetchAllProviders();
    const allMatches = providerResults
      .flatMap((pr) => pr.matches)
      .filter((m) => m.sport === "FOOTBALL");

    const matching = allMatches.filter(
      (m) =>
        m.id.includes(matchId) ||
        m.homeTeam.toLowerCase().includes(matchId.toLowerCase()) ||
        m.awayTeam.toLowerCase().includes(matchId.toLowerCase()) ||
        `${m.homeTeam} vs ${m.awayTeam}`.toLowerCase().includes(matchId.toLowerCase())
    );

    if (matching.length === 0) {
      const queryId = `mcp-settle-${Date.now()}`;
      const payment = chargeX402("verify_settlement", queryId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              safeForSettlement: false,
              match: matchId,
              reason: `No matching football data found for "${matchId}".`,
              payment,
            }, null, 2),
          },
        ],
      };
    }

    const first = matching[0];
    const responding = providerResults.filter((pr) => pr.health.available);

    const canonicalState: CanonicalMatchState = {
      homeTeam: first.homeTeam,
      awayTeam: first.awayTeam,
      homeScore: first.homeScore,
      awayScore: first.awayScore,
      status: first.status,
      matchDate: first.matchDate,
      sport: "FOOTBALL",
      providerAgreement: responding.length >= 2,
      providerCount: responding.length,
      providerHealth: providerResults.map((pr) => pr.health),
      rawResults: matching,
    };

    const agentOutputs = await Promise.all(
      agents.map((agent) => agent.verify(canonicalState))
    );
    const consensus = computeAgentConsensus(agentOutputs, canonicalState);
    const safe = consensus.settlementDecision === "SETTLE";

    const queryId = `mcp-settle-${Date.now()}`;
    const payment = chargeX402("verify_settlement", queryId);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            safeForSettlement: safe,
            match: `${canonicalState.homeTeam} vs ${canonicalState.awayTeam}`,
            score: `${canonicalState.homeScore ?? "?"} - ${canonicalState.awayScore ?? "?"}`,
            settlementDecision: consensus.settlementDecision,
            confidence: consensus.confidence,
            agreement: `${consensus.agreement}/${consensus.totalAgents}`,
            canonicalResult: {
              homeTeam: canonicalState.homeTeam,
              awayTeam: canonicalState.awayTeam,
              homeScore: canonicalState.homeScore,
              awayScore: canonicalState.awayScore,
              status: canonicalState.status,
              providerAgreement: canonicalState.providerAgreement,
            },
            agents: agentOutputs.map((a) => ({
              name: a.agentName,
              prediction: a.prediction,
              confidence: a.confidence,
            })),
            reasoning: consensus.reasoning,
            recommendation: safe
              ? "This result has passed multi-agent Byzantine consensus. Safe to settle prediction market bets."
              : "DO NOT SETTLE. This result has NOT passed multi-agent consensus. Wait for more data or manual verification.",
            payment,
            x402Header: formatX402Header(),
          }, null, 2),
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("GoalConsensus MCP Server v2.1.0 running on stdio");
}

main().catch((err) => {
  console.error("MCP Server error:", err);
  process.exit(1);
});
