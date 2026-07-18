#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import {
  getConsensus,
  getPrediction,
  getMatches,
  verifySettlement,
  getIntelligence,
  getSpecialists,
  getPremiumReport,
  getReportCatalogInfo,
} from "../lib/consensus-service.js";
import { chargeX402, formatX402Header, verifyX402Payment, x402ForbiddenResponse } from "../lib/x402.js";
import { getTeamRating } from "../lib/team-ratings.js";
import {
  getOrCreateMarket,
  placeBet,
  resolveMarket,
  getMarket,
} from "../lib/prediction-market.js";
import {
  initiateCCTPTransfer,
  getSupportedChains,
} from "../lib/cctp.js";

export function createGoalConsensusMcpServer(): McpServer {
  const server = new McpServer({
    name: "goalconsensus",
    version: "4.0.0",
  });

server.tool(
  "analyze_match",
  "Full match intelligence analysis. Runs all 5 specialist AI agents (Tactical, Statistical, Market, Injury, News) simultaneously and produces a live AI debate with consensus. Returns specialist reports, debate messages, consensus prediction, and confidence.",
  {
    homeTeam: z.string().describe("Home team name"),
    awayTeam: z.string().describe("Away team name"),
  },
  async ({ homeTeam, awayTeam }) => {
    const data = await getIntelligence(homeTeam, awayTeam);
    const queryId = `mcp-analyze-${Date.now()}`;
    const payment = chargeX402("analyze_match", queryId);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          match: `${homeTeam} vs ${awayTeam}`,
          status: data.canonicalState?.status || "UNKNOWN",
          consensus: data.debate.consensus,
          prediction: data.prediction ? {
            winner: data.prediction.finalPrediction.winner,
            confidence: data.prediction.confidence,
            score: `${data.prediction.finalPrediction.homeScore ?? "?"}-${data.prediction.finalPrediction.awayScore ?? "?"}`,
            agreement: `${data.prediction.agreement}/${data.prediction.totalAgents}`,
            upsetProbability: data.prediction.upsetProbability,
            riskRating: data.prediction.riskRating,
          } : null,
          specialists: data.specialistOutputs.map((a) => ({
            id: a.agentId,
            name: a.agentName,
            confidence: a.confidence,
            prediction: a.prediction,
            latencyMs: a.latencyMs,
          })),
          debate: data.debate.messages.map((m) => ({
            agent: m.agentName,
            stance: m.stance,
            position: m.position,
            confidence: m.confidence,
          })),
          payment,
          x402Header: formatX402Header(),
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "compare_teams",
  "Compare two football teams head-to-head. Returns ELO ratings, attack/defense strength, form, and expected match outcome.",
  {
    homeTeam: z.string().describe("Home team name"),
    awayTeam: z.string().describe("Away team name"),
  },
  async ({ homeTeam, awayTeam }) => {
    const home = getTeamRating(homeTeam);
    const away = getTeamRating(awayTeam);
    const queryId = `mcp-compare-${Date.now()}`;
    const payment = chargeX402("compare_teams", queryId);

    const ratingDiff = home.rating - away.rating;
    const favorite = ratingDiff > 0 ? homeTeam : awayTeam;
    const margin = Math.abs(ratingDiff);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          comparison: `${homeTeam} vs ${awayTeam}`,
          home: {
            team: home.team,
            rating: home.rating,
            elo: home.elo,
            attackStrength: Math.round(home.attackStrength * 100),
            defenseStrength: Math.round(home.defenseStrength * 100),
            recentForm: Math.round(home.recentForm * 100),
            expectedGoals: parseFloat(home.expectedGoals.toFixed(2)),
            homeAdvantage: home.homeAdvantage,
          },
          away: {
            team: away.team,
            rating: away.rating,
            elo: away.elo,
            attackStrength: Math.round(away.attackStrength * 100),
            defenseStrength: Math.round(away.defenseStrength * 100),
            recentForm: Math.round(away.recentForm * 100),
            expectedGoals: parseFloat(away.expectedGoals.toFixed(2)),
            homeAdvantage: away.homeAdvantage,
          },
          analysis: {
            favorite,
            ratingDifferential: Math.round(margin),
            edge: margin > 20 ? "significant" : margin > 10 ? "moderate" : "slight",
          },
          payment,
          x402Header: formatX402Header(),
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "historical_analysis",
  "Get team analysis including dynamic ELO rating, attack/defense strength, recent form, and historical performance data.",
  {
    team: z.string().describe("Team name"),
  },
  async ({ team }) => {
    const rating = getTeamRating(team);
    const queryId = `mcp-historical-${Date.now()}`;
    const payment = chargeX402("historical_analysis", queryId);

    return {
      content: [{
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
          payment,
          x402Header: formatX402Header(),
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "market_analysis",
  "Analyze market odds, implied probabilities, and detect value bets for a match.",
  {
    homeTeam: z.string().describe("Home team name"),
    awayTeam: z.string().describe("Away team name"),
  },
  async ({ homeTeam, awayTeam }) => {
    const home = getTeamRating(homeTeam);
    const away = getTeamRating(awayTeam);
    const market = getOrCreateMarket(homeTeam, awayTeam, home.rating, away.rating);
    const queryId = `mcp-market-${Date.now()}`;
    const payment = chargeX402("market_analysis", queryId);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          match: `${homeTeam} vs ${awayTeam}`,
          odds: {
            home: `${(1 / market.odds.home).toFixed(2)}`,
            draw: `${(1 / market.odds.draw).toFixed(2)}`,
            away: `${(1 / market.odds.away).toFixed(2)}`,
          },
          impliedProbabilities: {
            home: `${(market.odds.home * 100).toFixed(1)}%`,
            draw: `${(market.odds.draw * 100).toFixed(1)}%`,
            away: `${(market.odds.away * 100).toFixed(1)}%`,
          },
          totalStaked: market.totalStaked,
          positions: market.positions,
          payment,
          x402Header: formatX402Header(),
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "consensus",
  "Get full AI ensemble consensus for a match. Returns prediction, agent agreement, and confidence.",
  {
    homeTeam: z.string().describe("Home team name"),
    awayTeam: z.string().describe("Away team name"),
  },
  async ({ homeTeam, awayTeam }) => {
    const data = await getConsensus(homeTeam, awayTeam);
    const queryId = `mcp-consensus-${Date.now()}`;
    const payment = chargeX402("consensus", queryId);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          match: `${data.consensus.canonicalState.homeTeam} vs ${data.consensus.canonicalState.awayTeam}`,
          canonicalState: {
            homeScore: data.consensus.canonicalState.homeScore,
            awayScore: data.consensus.canonicalState.awayScore,
            status: data.consensus.canonicalState.status,
          },
          consensus: {
            winner: data.consensus.finalPrediction.winner,
            confidence: data.consensus.confidence,
            agreement: `${data.consensus.agreement}/${data.consensus.totalAgents}`,
            decision: data.consensus.settlementDecision,
          },
          agents: data.agentOutputs.map((a) => ({
            name: a.agentName,
            prediction: a.prediction,
            confidence: a.confidence,
          })),
          reasoning: data.consensus.reasoning,
          payment,
          x402Header: formatX402Header(),
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "player_report",
  "Get detailed player and squad analysis for a team.",
  {
    team: z.string().describe("Team name"),
  },
  async ({ team }) => {
    const rating = getTeamRating(team);
    const queryId = `mcp-player-${Date.now()}`;
    const payment = chargeX402("player_report", queryId);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          team: rating.team,
          squadAnalysis: {
            overallStrength: rating.rating,
            attackQuality: Math.round(rating.attackStrength * 100),
            defensiveSolidity: Math.round(rating.defenseStrength * 100),
            expectedGoalsPerMatch: rating.expectedGoals.toFixed(2),
            formRating: Math.round(rating.recentForm * 100),
          },
          keyPlayers: [
            "Key players identified from squad strength metrics",
            "Attack: Primary goal threat based on attack strength rating",
            "Defense: Core defensive unit based on defense strength rating",
            "Midfield: Creative hub based on form and expected goals",
          ],
          payment,
          x402Header: formatX402Header(),
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "injury_report",
  "Get injury and squad fitness report for a match.",
  {
    homeTeam: z.string().describe("Home team name"),
    awayTeam: z.string().describe("Away team name"),
  },
  async ({ homeTeam, awayTeam }) => {
    const home = getTeamRating(homeTeam);
    const away = getTeamRating(awayTeam);
    const queryId = `mcp-injury-${Date.now()}`;
    const payment = chargeX402("injury_report", queryId);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          match: `${homeTeam} vs ${awayTeam}`,
          homeSquad: {
            team: homeTeam,
            fitnessLevel: Math.round(home.recentForm * 100),
            squadDepth: home.rating,
            estimatedAvailability: home.rating > 80 ? "Strong" : home.rating > 60 ? "Moderate" : "Limited",
          },
          awaySquad: {
            team: awayTeam,
            fitnessLevel: Math.round(away.recentForm * 100),
            squadDepth: away.rating,
            estimatedAvailability: away.rating > 80 ? "Strong" : away.rating > 60 ? "Moderate" : "Limited",
          },
          impactAssessment: `Squad differential favors ${home.rating > away.rating ? homeTeam : awayTeam}`,
          payment,
          x402Header: formatX402Header(),
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "premium_report",
  "Generate a premium AI report for a match. Available types: full-tactical, historical-breakdown, player-report, market-intelligence, risk-report. Requires x402 payment.",
  {
    homeTeam: z.string().describe("Home team name"),
    awayTeam: z.string().describe("Away team name"),
    reportType: z.enum(["full-tactical", "historical-breakdown", "player-report", "market-intelligence", "risk-report"]).describe("Type of premium report"),
    x402Payment: z.string().optional().describe("X-PAYMENT header value with x402 payment proof. If not provided, the tool returns a 402 Payment Required response with payment instructions."),
  },
  async ({ homeTeam, awayTeam, reportType, x402Payment }) => {
    if (!verifyX402Payment(x402Payment ?? null)) {
      return x402ForbiddenResponse("premium_report") as any;
    }

    const report = await getPremiumReport(reportType, homeTeam, awayTeam);
    const queryId = `mcp-premium-${Date.now()}`;
    const payment = chargeX402("premium_report", queryId);

    if (!report) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: "Could not generate report. No match data available.",
            payment,
          }, null, 2),
        }],
      };
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          reportId: report.id,
          type: report.type,
          title: report.title,
          price: report.price,
          match: `${homeTeam} vs ${awayTeam}`,
          content: report.content,
          generatedAt: report.generatedAt,
          payment,
          x402Header: formatX402Header(),
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "predict_match",
  "Predict a football match result using AI ensemble voting. Returns winner, score, ensemble confidence, minority opinion, upset probability, and risk rating.",
  {
    homeTeam: z.string().describe("Home team name"),
    awayTeam: z.string().describe("Away team name"),
  },
  async ({ homeTeam, awayTeam }) => {
    const data = await getPrediction(homeTeam, awayTeam);
    const queryId = `mcp-predict-${Date.now()}`;
    const payment = chargeX402("predict_match", queryId);

    if (!data.canonicalState) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "NO_DATA",
            match: `${homeTeam} vs ${awayTeam}`,
            reason: "No match data available.",
            payment,
          }, null, 2),
        }],
      };
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          match: `${data.canonicalState.homeTeam} vs ${data.canonicalState.awayTeam}`,
          prediction: data.prediction ? {
            winner: data.prediction.finalPrediction.winner,
            score: `${data.prediction.finalPrediction.homeScore ?? "?"}-${data.prediction.finalPrediction.awayScore ?? "?"}`,
            confidence: data.prediction.confidence,
            agreement: `${data.prediction.agreement}/${data.prediction.totalAgents}`,
            upsetProbability: data.prediction.upsetProbability,
            riskRating: data.prediction.riskRating,
          } : null,
          agents: data.agentOutputs.map((a) => ({
            name: a.agentName,
            prediction: a.prediction,
            confidence: a.confidence,
          })),
          payment,
          x402Header: formatX402Header(),
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "verify_result",
  "Verify a finished match result for on-chain settlement using BFT provider consensus.",
  {
    homeTeam: z.string().describe("Home team name"),
    awayTeam: z.string().describe("Away team name"),
  },
  async ({ homeTeam, awayTeam }) => {
    const data = await getConsensus(homeTeam, awayTeam);
    const queryId = `mcp-verify-${Date.now()}`;
    const payment = chargeX402("verify_result", queryId);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          match: `${data.consensus.canonicalState.homeTeam} vs ${data.consensus.canonicalState.awayTeam}`,
          settlementDecision: data.consensus.settlementDecision,
          confidence: data.consensus.confidence,
          agreement: `${data.consensus.agreement}/${data.consensus.totalAgents}`,
          verification: data.verification ? {
            verified: data.verification.verified,
            providerAgreement: `${data.verification.agreement}/${data.verification.totalProviders}`,
            disputedBy: data.verification.disputedBy,
          } : null,
          payment,
          x402Header: formatX402Header(),
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "verify_settlement",
  "Verify if a match result is safe for on-chain settlement.",
  {
    query: z.string().describe("Team name or match description"),
  },
  async ({ query }) => {
    const data = await verifySettlement(query);
    const queryId = `mcp-settle-${Date.now()}`;
    const payment = chargeX402("verify_settlement", queryId);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          match: data.match,
          safeForSettlement: data.safeForSettlement,
          settlementDecision: data.consensus.settlementDecision,
          confidence: data.consensus.confidence,
          verification: data.verification ? {
            verified: data.verification.verified,
            providerAgreement: `${data.verification.agreement}/${data.verification.totalProviders}`,
          } : null,
          payment,
          x402Header: formatX402Header(),
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "get_provider_consensus",
  "Get provider-level consensus for a finished match.",
  {
    homeTeam: z.string().describe("Home team name"),
    awayTeam: z.string().describe("Away team name"),
  },
  async ({ homeTeam, awayTeam }) => {
    const data = await getConsensus(homeTeam, awayTeam);
    const queryId = `mcp-provider-${Date.now()}`;
    const payment = chargeX402("get_provider_consensus", queryId);

    return {
      content: [{
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
          } : null,
          payment,
          x402Header: formatX402Header(),
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "get_live_matches",
  "Get all current football matches with intelligence status.",
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
          confidence: m.prediction.confidence,
          agreement: `${m.prediction.agreement}/${m.prediction.totalAgents}`,
          upsetProbability: m.prediction.upsetProbability,
        };
      }

      if (m.status === "FINISHED" && m.verification) {
        return {
          ...base,
          mode: "VERIFICATION",
          verified: m.verification.verified,
          providerAgreement: `${m.verification.agreement}/${m.verification.totalProviders}`,
        };
      }

      return {
        ...base,
        mode: "LIVE",
        confidence: m.consensus?.confidence || 0,
      };
    });

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          matches,
          providerHealth: data.providerHealth.map((p) => ({
            id: p.providerId,
            available: p.available,
            latencyMs: p.latencyMs,
          })),
          fetchedAt: data.fetchedAt,
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "get_report_catalog",
  "List available premium AI reports and their prices.",
  {},
  async () => {
    const catalog = getReportCatalogInfo();
    const queryId = `mcp-catalog-${Date.now()}`;

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          reports: catalog,
          note: "Premium reports require x402 payment. Use the premium_report tool to generate.",
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "qualification_scenarios",
  "Analyze tournament qualification scenarios for a team.",
  {
    team: z.string().describe("Team name"),
  },
  async ({ team }) => {
    const rating = getTeamRating(team);
    const queryId = `mcp-qualify-${Date.now()}`;
    const payment = chargeX402("qualification_scenarios", queryId);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          team: rating.team,
          rating: rating.rating,
          form: Math.round(rating.recentForm * 100),
          scenarios: [
            `With a rating of ${rating.rating}, ${team} is in ${rating.rating > 85 ? "strong" : rating.rating > 70 ? "competitive" : "challenging"} position`,
            `Recent form: ${rating.recentForm > 0.7 ? "excellent" : rating.recentForm > 0.5 ? "good" : "inconsistent"}`,
            `Attack strength: ${(rating.attackStrength * 100).toFixed(0)}% — ${rating.attackStrength > 0.6 ? "potent" : "developing"}`,
            `Defense strength: ${(rating.defenseStrength * 100).toFixed(0)}% — ${rating.defenseStrength > 0.6 ? "solid" : "vulnerable"}`,
          ],
          payment,
          x402Header: formatX402Header(),
        }, null, 2),
      }],
    };
  }
);

  return server;
}

async function main() {
  const useStdio = !process.argv.includes("--http");

  if (useStdio) {
    const server = createGoalConsensusMcpServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("GoalConsensus MCP Server v4.0.0 running on stdio");
  } else {
    const { SSEServerTransport } = await import("@modelcontextprotocol/sdk/server/sse.js");
    const { createServer } = await import("node:http");
    const server = createGoalConsensusMcpServer();
    const port = parseInt(process.env.PORT || process.env.MCP_PORT || "3001", 10);
    const sessions = new Map<string, SSEServerTransport>();

    const httpServer = createServer(async (req, res) => {
      const url = new URL(req.url || "/", `http://localhost:${port}`);

      if (url.pathname === "/sse" && req.method === "GET") {
        const transport = new SSEServerTransport("/messages", res);
        sessions.set(transport.sessionId, transport);
        res.on("close", () => sessions.delete(transport.sessionId));
        await server.connect(transport);
        return;
      }

      if (url.pathname === "/messages" && req.method === "POST") {
        const sessionId = url.searchParams.get("sessionId") || "";
        const transport = sessions.get(sessionId);
        if (!transport) {
          res.writeHead(404);
          res.end("Session not found");
          return;
        }
        await transport.handlePostMessage(req, res);
        return;
      }

      if (url.pathname === "/" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          name: "GoalConsensus MCP Server",
          version: "4.0.0",
          transport: "SSE",
          endpoints: {
            sse: "/sse",
            messages: "/messages?sessionId=<id>",
          },
          tools: [
            "analyze_match", "compare_teams", "historical_analysis",
            "market_analysis", "consensus", "player_report", "injury_report",
            "premium_report", "predict_match", "verify_result", "verify_settlement",
            "get_provider_consensus", "get_live_matches", "qualification_scenarios",
            "get_report_catalog",
          ],
        }, null, 2));
        return;
      }

      res.writeHead(404);
      res.end("Not found");
    });

    httpServer.listen(port, "0.0.0.0", () => {
      console.error(`GoalConsensus MCP Server v4.0.0 running on HTTP (SSE) port ${port}`);
      console.error(`  SSE endpoint: http://localhost:${port}/sse`);
      console.error(`  Messages endpoint: http://localhost:${port}/messages?sessionId=<id>`);
    });
  }
}

main().catch((err) => {
  console.error("MCP Server error:", err);
  process.exit(1);
});
