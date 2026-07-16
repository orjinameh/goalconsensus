#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { fetchAllProviders, fetchMatchesForPair, buildCanonicalState } from "../lib/providers.js";
import { agents } from "../lib/agents/index.js";
import { computeAgentConsensus } from "../lib/consensus.js";
import { chargeX402, formatX402Header } from "../lib/x402.js";

const server = new McpServer({
  name: "goalconsensus-mcp",
  version: "2.0.0",
});

server.tool(
  "get_consensus_result",
  "Get multi-agent consensus for a World Cup 2026 match. Canonical state from 2 providers, verified by 3 analysis agents with Byzantine-inspired voting.",
  {
    homeTeam: z.string().describe("Home team name (e.g. Argentina)"),
    awayTeam: z.string().describe("Away team name (e.g. France)"),
  },
  async ({ homeTeam, awayTeam }) => {
    const canonicalState = await buildCanonicalState(homeTeam, awayTeam);

    if (!canonicalState) {
      const queryId = `mcp-consensus-${Date.now()}`;
      const payment = chargeX402("get_consensus_result", queryId);
      return {
        content: [{
          type: "text",
          text: [
            `## Consensus: ${homeTeam} vs ${awayTeam}`,
            ``,
            `**Status:** INSUFFICIENT_DATA`,
            `**Reason:** No canonical match state available. Both providers returned no data.`,
            ``,
            `---`,
            `**x402 Payment:** ${payment.amount} on ${payment.chain}`,
            `**TX Hash:** \`${payment.txHash}\``,
          ].join("\n"),
        }],
      };
    }

    const agentOutputs = await Promise.all(
      agents.map((agent) => agent.verify(canonicalState))
    );

    const consensus = computeAgentConsensus(agentOutputs, canonicalState);
    const queryId = `mcp-consensus-${Date.now()}`;
    const payment = chargeX402("get_consensus_result", queryId);

    const agentLines = agentOutputs
      .map(
        (a) =>
          `  - ${a.agentName}: ${a.prediction.winner} (${a.confidence}%) — ${a.explanation.slice(0, 120)}...`
      )
      .join("\n");

    const evidenceLines = consensus.evidence
      .map((e) => `  - [${e.source}] ${e.detail}`)
      .join("\n");

    const text = [
      `## Multi-Agent Consensus: ${homeTeam} vs ${awayTeam}`,
      ``,
      `**Canonical State:** ${canonicalState.homeTeam} ${canonicalState.homeScore ?? "?"} - ${canonicalState.awayScore ?? "?"} ${canonicalState.awayTeam} [${canonicalState.status}]`,
      `**Provider Agreement:** ${canonicalState.providerAgreement ? "YES" : "NO"} (${canonicalState.providerCount} providers)`,
      ``,
      `**Settlement Decision:** ${consensus.settlementDecision}`,
      `**Agreement:** ${consensus.agreement}/${consensus.totalAgents} agents`,
      `**Confidence:** ${consensus.confidence}%`,
      ``,
      consensus.minorityOpinion
        ? `**Minority Opinion:** ${consensus.minorityOpinion.agentName} predicted ${consensus.minorityOpinion.prediction.winner}`
        : "",
      ``,
      `**Agent Outputs:**`,
      agentLines,
      ``,
      `**Evidence:**`,
      evidenceLines,
      ``,
      `**Reasoning:** ${consensus.reasoning}`,
      ``,
      `---`,
      `**x402 Payment:** ${payment.amount} on ${payment.chain}`,
      `**TX Hash:** \`${payment.txHash}\``,
      `**Header:** ${formatX402Header()}`,
    ]
      .filter(Boolean)
      .join("\n");

    return { content: [{ type: "text", text }] };
  }
);

server.tool(
  "get_match_prediction",
  "Get individual agent predictions for a World Cup 2026 match. Returns output from all 3 verification agents.",
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
        content: [{
          type: "text",
          text: `No match data available for ${homeTeam} vs ${awayTeam}.\nx402: ${payment.amount}`,
        }],
      };
    }

    const agentOutputs = await Promise.all(
      agents.map((agent) => agent.verify(canonicalState))
    );

    const queryId = `mcp-predict-${Date.now()}`;
    const payment = chargeX402("get_match_prediction", queryId);

    const agentSections = agentOutputs
      .map(
        (a) =>
          `### ${a.agentName}\n` +
          `**Prediction:** ${a.prediction.winner} ${a.prediction.homeScore ?? "?"}-${a.prediction.awayScore ?? "?"}\n` +
          `**Confidence:** ${a.confidence}%\n` +
          `**Latency:** ${a.latencyMs}ms\n` +
          `**Explanation:** ${a.explanation}\n` +
          `**Evidence:**\n${a.evidence.map((e) => `  - ${e.detail}`).join("\n")}`
      )
      .join("\n\n");

    const text = [
      `## Agent Predictions: ${homeTeam} vs ${awayTeam}`,
      ``,
      `**Canonical State:** ${canonicalState.status} — ${canonicalState.homeScore ?? "?"}-${canonicalState.awayScore ?? "?"}`,
      ``,
      agentSections,
      ``,
      `---`,
      `**x402 Payment:** ${payment.amount} on ${payment.chain}`,
      `**TX Hash:** \`${payment.txHash}\``,
    ].join("\n");

    return { content: [{ type: "text", text }] };
  }
);

server.tool(
  "get_live_matches",
  "Get all current World Cup 2026 matches with multi-agent consensus status.",
  {},
  async () => {
    const providerResults = await fetchAllProviders();
    const allMatches = providerResults.flatMap((pr) => pr.matches);
    const grouped = new Map<string, typeof allMatches>();
    for (const m of allMatches) {
      const key = `${m.homeTeam.toLowerCase()}-${m.awayTeam.toLowerCase()}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(m);
    }

    const lines: string[] = ["## Live World Cup 2026 Matches", ""];

    for (const [, group] of grouped) {
      const first = group[0];
      const responding = providerResults.filter((pr) => pr.health.available);
      const canonicalState = {
        homeTeam: first.homeTeam,
        awayTeam: first.awayTeam,
        homeScore: first.homeScore,
        awayScore: first.awayScore,
        status: first.status,
        matchDate: first.matchDate,
        providerAgreement: responding.length >= 2,
        providerCount: responding.length,
        providerHealth: providerResults.map((pr) => pr.health),
        rawResults: group,
      };

      const agentOutputs = await Promise.all(
        agents.map((agent) => agent.verify(canonicalState))
      );
      const consensus = computeAgentConsensus(agentOutputs, canonicalState);

      const score =
        first.homeScore !== null && first.awayScore !== null
          ? `${first.homeScore} - ${first.awayScore}`
          : "vs";

      lines.push(
        `**${first.homeTeam}** ${score} **${first.awayTeam}** [${first.status}]`,
        `  Settlement: ${consensus.settlementDecision} | Confidence: ${consensus.confidence}% | Votes: ${consensus.agreement}/${consensus.totalAgents}`,
        ""
      );
    }

    const healthLines = providerResults
      .map(
        (pr) =>
          `  - ${pr.providerId}: ${pr.health.available ? `OK (${pr.health.latencyMs}ms)` : `DOWN`}`
      )
      .join("\n");

    const queryId = `mcp-live-${Date.now()}`;
    const payment = chargeX402("get_live_matches", queryId);

    lines.push(
      "---",
      `**Provider Health:**`,
      healthLines,
      ``,
      `**x402 Payment:** ${payment.amount} on ${payment.chain}`,
      `**TX Hash:** \`${payment.txHash}\``
    );

    return { content: [{ type: "text", text: lines.join("\n") }] };
  }
);

server.tool(
  "verify_settlement",
  "Check whether a match result is safe for on-chain settlement using multi-agent consensus.",
  {
    matchId: z.string().describe("Match ID or team pair identifier"),
  },
  async ({ matchId }) => {
    const providerResults = await fetchAllProviders();
    const allMatches = providerResults.flatMap((pr) => pr.matches);
    const matching = allMatches.filter(
      (m) =>
        m.id.includes(matchId) ||
        m.homeTeam.toLowerCase().includes(matchId.toLowerCase()) ||
        m.awayTeam.toLowerCase().includes(matchId.toLowerCase())
    );

    if (matching.length === 0) {
      const queryId = `mcp-settle-${Date.now()}`;
      const payment = chargeX402("verify_settlement", queryId);
      return {
        content: [{
          type: "text",
          text: [
            `## Settlement Verification: ${matchId}`,
            ``,
            `**Safe for Settlement:** NO`,
            `**Reason:** No matching data found for "${matchId}".`,
            ``,
            `---`,
            `**x402 Payment:** ${payment.amount} on ${payment.chain}`,
            `**TX Hash:** \`${payment.txHash}\``,
          ].join("\n"),
        }],
      };
    }

    const first = matching[0];
    const responding = providerResults.filter((pr) => pr.health.available);
    const canonicalState = {
      homeTeam: first.homeTeam,
      awayTeam: first.awayTeam,
      homeScore: first.homeScore,
      awayScore: first.awayScore,
      status: first.status,
      matchDate: first.matchDate,
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

    const agentLines = agentOutputs
      .map((a) => `  - ${a.agentName}: ${a.prediction.winner} (${a.confidence}%)`)
      .join("\n");

    const text = [
      `## Settlement Verification: ${matchId}`,
      ``,
      `**Safe for Settlement:** ${safe ? "YES" : "NO"}`,
      `**Settlement Decision:** ${consensus.settlementDecision}`,
      `**Confidence:** ${consensus.confidence}%`,
      `**Agreement:** ${consensus.agreement}/${consensus.totalAgents} agents`,
      ``,
      `**Canonical Result:** ${canonicalState.homeTeam} ${canonicalState.homeScore ?? "?"} - ${canonicalState.awayScore ?? "?"} ${canonicalState.awayTeam}`,
      `**Provider Agreement:** ${canonicalState.providerAgreement ? "YES" : "NO"}`,
      ``,
      `**Agent Outputs:**`,
      agentLines,
      ``,
      `**Reasoning:** ${consensus.reasoning}`,
      ``,
      safe
        ? "This result has passed multi-agent Byzantine consensus. Safe to settle prediction market bets."
        : "DO NOT SETTLE. This result has NOT passed multi-agent consensus. Wait for more data or manual verification.",
      ``,
      `---`,
      `**x402 Payment:** ${payment.amount} on ${payment.chain}`,
      `**TX Hash:** \`${payment.txHash}\``,
    ]
      .filter(Boolean)
      .join("\n");

    return { content: [{ type: "text", text }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("GoalConsensus MCP Server v2.0 running on stdio");
}

main().catch((err) => {
  console.error("MCP Server error:", err);
  process.exit(1);
});
