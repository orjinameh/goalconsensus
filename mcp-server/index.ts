#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { fetchAllProviders, fetchMatchesForPair } from "../lib/providers.js";
import { computeConsensus } from "../lib/consensus.js";
import { predictMatch } from "../lib/groq.js";
import { chargeX402, formatX402Header } from "../lib/x402.js";

const server = new McpServer({
  name: "goalconsensus-mcp",
  version: "1.0.0",
});

server.tool(
  "get_consensus_result",
  "Get BFT consensus result for a World Cup 2026 match. Queries independent providers and applies Byzantine Fault Tolerant consensus.",
  {
    homeTeam: z.string().describe("Home team name (e.g. Argentina)"),
    awayTeam: z.string().describe("Away team name (e.g. France)"),
  },
  async ({ homeTeam, awayTeam }) => {
    const providerResults = await fetchMatchesForPair(homeTeam, awayTeam);
    const verdict = computeConsensus(providerResults);
    const queryId = `mcp-consensus-${Date.now()}`;
    const payment = chargeX402("get_consensus_result", queryId);

    const healthLines = providerResults
      .map(
        (pr) =>
          `  - ${pr.providerId}: ${pr.health.available ? `OK (${pr.health.latencyMs}ms)` : `DOWN (${pr.health.error || "unavailable"})`}`
      )
      .join("\n");

    const text = [
      `## BFT Consensus: ${homeTeam} vs ${awayTeam}`,
      ``,
      `**Verdict:** ${verdict.verdict}`,
      `**Confidence:** ${verdict.confidence}%`,
      `**Passing Nodes:** ${verdict.passingNodes}/${verdict.totalNodes}`,
      ``,
      verdict.agreedResult
        ? `**Result:** ${verdict.agreedResult.homeTeam} ${verdict.agreedResult.homeScore ?? "?"} - ${verdict.agreedResult.awayScore ?? "?"} ${verdict.agreedResult.awayTeam}`
        : "",
      ``,
      `**Explanation:** ${verdict.explanation}`,
      ``,
      verdict.conflictingProviders.length > 0
        ? `**Conflicting Providers:** ${verdict.conflictingProviders.join(", ")}`
        : "",
      ``,
      `**Provider Health:**`,
      healthLines,
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
  "Get AI-powered prediction for a World Cup 2026 match using Groq LLM.",
  {
    homeTeam: z.string().describe("Home team name"),
    awayTeam: z.string().describe("Away team name"),
  },
  async ({ homeTeam, awayTeam }) => {
    const prediction = await predictMatch(homeTeam, awayTeam);
    const queryId = `mcp-predict-${Date.now()}`;
    const payment = chargeX402("get_match_prediction", queryId);

    const text = [
      `## AI Prediction: ${homeTeam} vs ${awayTeam}`,
      ``,
      `**Predicted Winner:** ${prediction.predictedWinner}`,
      `**Win Probability:** ${prediction.winProbability}%`,
      `**Predicted Score:** ${prediction.predictedScore}`,
      `**Confidence:** ${prediction.confidence}`,
      ``,
      `**Key Factors:**`,
      ...prediction.keyFactors.map((f) => `- ${f}`),
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
  "Get all current World Cup 2026 matches with their BFT consensus status.",
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
      const matchProviderResults = providerResults.map((pr) => ({
        ...pr,
        matches: pr.matches.filter(
          (m) =>
            m.homeTeam.toLowerCase() === group[0].homeTeam.toLowerCase() &&
            m.awayTeam.toLowerCase() === group[0].awayTeam.toLowerCase()
        ),
      }));
      const verdict = computeConsensus(matchProviderResults);
      const m = group[0];
      const score =
        m.homeScore !== null && m.awayScore !== null
          ? `${m.homeScore} - ${m.awayScore}`
          : "vs";
      lines.push(
        `**${m.homeTeam}** ${score} **${m.awayTeam}** [${m.status}]`,
        `  Consensus: ${verdict.verdict} (${verdict.confidence}%) — ${verdict.explanation}`,
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
  "Check whether a match result has reached BFT consensus and is safe for on-chain settlement of prediction markets.",
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

    const matchProviderResults = providerResults.map((pr) => ({
      ...pr,
      matches: pr.matches.filter(
        (m) =>
          m.id.includes(matchId) ||
          m.homeTeam.toLowerCase().includes(matchId.toLowerCase()) ||
          m.awayTeam.toLowerCase().includes(matchId.toLowerCase())
      ),
    }));

    const verdict = computeConsensus(matchProviderResults);
    const safe = verdict.verdict === "CONFIRMED";

    const queryId = `mcp-settle-${Date.now()}`;
    const payment = chargeX402("verify_settlement", queryId);

    const healthLines = providerResults
      .map(
        (pr) =>
          `  - ${pr.providerId}: ${pr.health.available ? `OK (${pr.health.latencyMs}ms)` : `DOWN`}`
      )
      .join("\n");

    const text = [
      `## Settlement Verification: ${matchId}`,
      ``,
      `**Safe for Settlement:** ${safe ? "YES" : "NO"}`,
      `**Verdict:** ${verdict.verdict}`,
      `**Confidence:** ${verdict.confidence}%`,
      `**Passing Nodes:** ${verdict.passingNodes}/${verdict.totalNodes}`,
      ``,
      verdict.agreedResult
        ? `**Canonical Result:** ${verdict.agreedResult.homeTeam} ${verdict.agreedResult.awayScore ?? "?"} - ${verdict.agreedResult.awayScore ?? "?"} ${verdict.agreedResult.awayTeam}`
        : "",
      ``,
      `**Explanation:** ${verdict.explanation}`,
      ``,
      `**Provider Health:**`,
      healthLines,
      ``,
      safe
        ? "This result has passed BFT consensus threshold. Safe to settle prediction market bets."
        : "DO NOT SETTLE. This result has NOT passed BFT consensus. Wait for more provider data or manual verification.",
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
  console.error("GoalConsensus MCP Server running on stdio");
}

main().catch((err) => {
  console.error("MCP Server error:", err);
  process.exit(1);
});
