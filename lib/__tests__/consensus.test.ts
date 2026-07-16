import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeAgentConsensus } from "../consensus";
import {
  AgentOutput,
  CanonicalMatchState,
  AgentEvidence,
} from "../agents/types";

function makeEvidence(source: string, detail: string): AgentEvidence {
  return { source, detail, weight: 0.5 };
}

function makeAgent(
  id: string,
  winner: string,
  homeScore: number | null,
  awayScore: number | null,
  confidence: number
): AgentOutput {
  return {
    agentId: id,
    agentName: `${id} Agent`,
    prediction: { winner, homeScore, awayScore },
    confidence,
    explanation: `${id} predicts ${winner}`,
    evidence: [makeEvidence(id, `predicts ${winner}`)],
    timestamp: new Date().toISOString(),
    latencyMs: 50,
  };
}

function makeCanonical(
  overrides: Partial<CanonicalMatchState> = {}
): CanonicalMatchState {
  return {
    homeTeam: "Argentina",
    awayTeam: "France",
    homeScore: 2,
    awayScore: 1,
    status: "FINISHED",
    matchDate: new Date().toISOString(),
    sport: "FOOTBALL",
    providerAgreement: true,
    providerCount: 2,
    providerHealth: [],
    rawResults: [],
    ...overrides,
  };
}

describe("computeAgentConsensus", () => {
  describe("null canonical state", () => {
    it("returns INSUFFICIENT_DATA with zero confidence", () => {
      const agents = [
        makeAgent("statistical", "Argentina", 2, 1, 70),
        makeAgent("llm-reasoning", "Argentina", 2, 1, 65),
        makeAgent("deterministic-rules", "Argentina", 2, 1, 80),
      ];
      const result = computeAgentConsensus(agents, null);
      assert.equal(result.settlementDecision, "INSUFFICIENT_DATA");
      assert.equal(result.confidence, 0);
    });
  });

  describe("no agent outputs", () => {
    it("returns INSUFFICIENT_DATA", () => {
      const result = computeAgentConsensus([], makeCanonical());
      assert.equal(result.settlementDecision, "INSUFFICIENT_DATA");
      assert.equal(result.totalAgents, 0);
    });
  });

  describe("unsupported sport", () => {
    it("returns UNSUPPORTED_SPORT for rugby", () => {
      const canonical = makeCanonical({ sport: "RUGBY" as any });
      const agents = [
        makeAgent("statistical", "Unknown", null, null, 0),
        makeAgent("llm-reasoning", "Unknown", null, null, 0),
        makeAgent("deterministic-rules", "Unknown", null, null, 0),
      ];
      const result = computeAgentConsensus(agents, canonical);
      assert.equal(result.settlementDecision, "UNSUPPORTED_SPORT");
      assert.equal(result.confidence, 0);
    });

    it("returns UNSUPPORTED_SPORT for basketball", () => {
      const canonical = makeCanonical({ sport: "BASKETBALL" as any });
      const agents = [
        makeAgent("statistical", "Unknown", null, null, 0),
        makeAgent("llm-reasoning", "Unknown", null, null, 0),
        makeAgent("deterministic-rules", "Unknown", null, null, 0),
      ];
      const result = computeAgentConsensus(agents, canonical);
      assert.equal(result.settlementDecision, "UNSUPPORTED_SPORT");
    });

    it("returns UNSUPPORTED_SPORT for baseball", () => {
      const canonical = makeCanonical({ sport: "BASEBALL" as any });
      const agents = [
        makeAgent("statistical", "Unknown", null, null, 0),
        makeAgent("llm-reasoning", "Unknown", null, null, 0),
        makeAgent("deterministic-rules", "Unknown", null, null, 0),
      ];
      const result = computeAgentConsensus(agents, canonical);
      assert.equal(result.settlementDecision, "UNSUPPORTED_SPORT");
    });
  });

  describe("three agreeing agents", () => {
    it("returns SETTLE with high confidence", () => {
      const agents = [
        makeAgent("statistical", "Argentina", 2, 1, 70),
        makeAgent("llm-reasoning", "Argentina", 2, 1, 65),
        makeAgent("deterministic-rules", "Argentina", 2, 1, 80),
      ];
      const result = computeAgentConsensus(agents, makeCanonical());
      assert.equal(result.settlementDecision, "SETTLE");
      assert.equal(result.agreement, 3);
      assert.equal(result.totalAgents, 3);
      assert.ok(result.confidence > 50);
      assert.equal(result.minorityOpinion, null);
      assert.equal(result.finalPrediction.winner, "Argentina");
    });
  });

  describe("two agreeing, one disagreeing", () => {
    it("returns SETTLE with minority opinion", () => {
      const agents = [
        makeAgent("statistical", "Argentina", 2, 1, 70),
        makeAgent("llm-reasoning", "Argentina", 2, 1, 65),
        makeAgent("deterministic-rules", "France", 1, 2, 60),
      ];
      const result = computeAgentConsensus(agents, makeCanonical());
      assert.equal(result.settlementDecision, "SETTLE");
      assert.equal(result.agreement, 2);
      assert.notEqual(result.minorityOpinion, null);
      assert.equal(
        result.minorityOpinion!.agentId,
        "deterministic-rules"
      );
    });
  });

  describe("all three disagree", () => {
    it("returns DO_NOT_SETTLE", () => {
      const agents = [
        makeAgent("statistical", "Argentina", 2, 1, 40),
        makeAgent("llm-reasoning", "France", 1, 2, 45),
        makeAgent("deterministic-rules", "Draw", 1, 1, 35),
      ];
      const result = computeAgentConsensus(agents, makeCanonical());
      assert.equal(result.settlementDecision, "DO_NOT_SETTLE");
      assert.equal(result.agreement, 1);
    });
  });

  describe("match not finished", () => {
    it("returns PENDING regardless of agreement", () => {
      const agents = [
        makeAgent("statistical", "Argentina", null, null, 60),
        makeAgent("llm-reasoning", "Argentina", null, null, 55),
        makeAgent("deterministic-rules", "Argentina", null, null, 70),
      ];
      const result = computeAgentConsensus(
        agents,
        makeCanonical({
          status: "SCHEDULED",
          homeScore: null,
          awayScore: null,
        })
      );
      assert.equal(result.settlementDecision, "PENDING");
    });

    it("returns PENDING for LIVE matches", () => {
      const agents = [
        makeAgent("statistical", "Argentina", 2, 1, 70),
        makeAgent("llm-reasoning", "Argentina", 2, 1, 65),
        makeAgent("deterministic-rules", "Argentina", 2, 1, 80),
      ];
      const result = computeAgentConsensus(
        agents,
        makeCanonical({ status: "LIVE" })
      );
      assert.equal(result.settlementDecision, "PENDING");
    });
  });

  describe("provider disagreement", () => {
    it("returns INSUFFICIENT_DATA when providers disagree", () => {
      const agents = [
        makeAgent("statistical", "Argentina", 2, 1, 70),
        makeAgent("llm-reasoning", "Argentina", 2, 1, 65),
        makeAgent("deterministic-rules", "Argentina", 2, 1, 80),
      ];
      const result = computeAgentConsensus(
        agents,
        makeCanonical({ providerAgreement: false })
      );
      assert.equal(result.settlementDecision, "INSUFFICIENT_DATA");
    });
  });

  describe("provider timeout - single provider", () => {
    it("returns INSUFFICIENT_DATA with one provider", () => {
      const agents = [
        makeAgent("statistical", "Argentina", 2, 1, 70),
        makeAgent("llm-reasoning", "Argentina", 2, 1, 65),
        makeAgent("deterministic-rules", "Argentina", 2, 1, 80),
      ];
      const result = computeAgentConsensus(
        agents,
        makeCanonical({
          providerAgreement: false,
          providerCount: 1,
        })
      );
      assert.equal(result.settlementDecision, "INSUFFICIENT_DATA");
    });
  });

  describe("provider data - two providers available", () => {
    it("returns SETTLE with provider agreement", () => {
      const agents = [
        makeAgent("statistical", "Argentina", 2, 1, 70),
        makeAgent("llm-reasoning", "Argentina", 2, 1, 65),
        makeAgent("deterministic-rules", "Argentina", 2, 1, 80),
      ];
      const result = computeAgentConsensus(
        agents,
        makeCanonical({
          providerAgreement: true,
          providerCount: 2,
        })
      );
      assert.equal(result.settlementDecision, "SETTLE");
    });
  });

  describe("provider data - three providers available", () => {
    it("returns SETTLE with strong provider agreement", () => {
      const agents = [
        makeAgent("statistical", "Argentina", 2, 1, 70),
        makeAgent("llm-reasoning", "Argentina", 2, 1, 65),
        makeAgent("deterministic-rules", "Argentina", 2, 1, 80),
      ];
      const result = computeAgentConsensus(
        agents,
        makeCanonical({
          providerAgreement: true,
          providerCount: 3,
        })
      );
      assert.equal(result.settlementDecision, "SETTLE");
      assert.equal(result.agreement, 3);
    });
  });

  describe("LLM unavailable - zero confidence agent", () => {
    it("excludes zero-confidence agents from consensus", () => {
      const agents = [
        makeAgent("statistical", "Argentina", 2, 1, 70),
        {
          ...makeAgent(
            "llm-reasoning",
            "Argentina",
            null,
            null,
            0
          ),
          explanation:
            "LLM temporarily unavailable. Consensus continued using the remaining verification agents.",
        },
        makeAgent("deterministic-rules", "Argentina", 2, 1, 80),
      ];
      const result = computeAgentConsensus(agents, makeCanonical());
      assert.equal(result.settlementDecision, "SETTLE");
      assert.equal(result.agreement, 2);
      assert.equal(result.totalAgents, 2);
    });

    it("returns INSUFFICIENT_DATA when all agents have zero confidence", () => {
      const agents = [
        makeAgent("statistical", "Argentina", null, null, 0),
        makeAgent("llm-reasoning", "Argentina", null, null, 0),
        makeAgent("deterministic-rules", "Argentina", null, null, 0),
      ];
      const result = computeAgentConsensus(agents, makeCanonical());
      assert.equal(result.settlementDecision, "INSUFFICIENT_DATA");
    });
  });

  describe("successful consensus", () => {
    it("includes all evidence from all agents", () => {
      const agents = [
        makeAgent("statistical", "Argentina", 2, 1, 70),
        makeAgent("llm-reasoning", "Argentina", 2, 1, 65),
        makeAgent("deterministic-rules", "Argentina", 2, 1, 80),
      ];
      const result = computeAgentConsensus(agents, makeCanonical());
      assert.equal(result.evidence.length, 3);
    });

    it("includes agent summaries in reasoning", () => {
      const agents = [
        makeAgent("statistical", "Argentina", 2, 1, 70),
        makeAgent("llm-reasoning", "Argentina", 2, 1, 65),
        makeAgent("deterministic-rules", "Argentina", 2, 1, 80),
      ];
      const result = computeAgentConsensus(agents, makeCanonical());
      assert.ok(result.reasoning.includes("3/3 agents agree"));
      assert.ok(result.reasoning.includes("statistical Agent"));
      assert.ok(
        result.reasoning.includes("llm-reasoning Agent")
      );
      assert.ok(
        result.reasoning.includes("deterministic-rules Agent")
      );
    });

    it("includes canonical state in result", () => {
      const canonical = makeCanonical();
      const agents = [
        makeAgent("statistical", "Argentina", 2, 1, 70),
        makeAgent("llm-reasoning", "Argentina", 2, 1, 65),
        makeAgent("deterministic-rules", "Argentina", 2, 1, 80),
      ];
      const result = computeAgentConsensus(agents, canonical);
      assert.equal(result.canonicalState.homeTeam, "Argentina");
      assert.equal(result.canonicalState.awayTeam, "France");
      assert.equal(result.canonicalState.status, "FINISHED");
      assert.equal(result.canonicalState.sport, "FOOTBALL");
    });
  });

  describe("two agents only", () => {
    it("returns SETTLE when both agree", () => {
      const agents = [
        makeAgent("statistical", "Argentina", 2, 1, 70),
        makeAgent("llm-reasoning", "Argentina", 2, 1, 65),
      ];
      const result = computeAgentConsensus(agents, makeCanonical());
      assert.equal(result.settlementDecision, "SETTLE");
      assert.equal(result.agreement, 2);
      assert.ok(result.confidence > 60);
    });

    it("returns DO_NOT_SETTLE when they disagree", () => {
      const agents = [
        makeAgent("statistical", "Argentina", 2, 1, 70),
        makeAgent("llm-reasoning", "France", 1, 2, 65),
      ];
      const result = computeAgentConsensus(agents, makeCanonical());
      assert.equal(result.settlementDecision, "DO_NOT_SETTLE");
      assert.equal(result.agreement, 1);
    });
  });

  describe("insufficient provider data", () => {
    it("returns INSUFFICIENT_DATA when providerCount is 0", () => {
      const agents = [
        makeAgent("statistical", "Argentina", 2, 1, 70),
        makeAgent("llm-reasoning", "Argentina", 2, 1, 65),
        makeAgent("deterministic-rules", "Argentina", 2, 1, 80),
      ];
      const result = computeAgentConsensus(
        agents,
        makeCanonical({
          providerAgreement: false,
          providerCount: 0,
        })
      );
      assert.equal(result.settlementDecision, "INSUFFICIENT_DATA");
    });
  });

  describe("confidence calculation", () => {
    it("computes confidence as weighted average of agent confidence and agreement", () => {
      const agents = [
        makeAgent("statistical", "Argentina", 2, 1, 80),
        makeAgent("llm-reasoning", "Argentina", 2, 1, 80),
        makeAgent("deterministic-rules", "Argentina", 2, 1, 80),
      ];
      const result = computeAgentConsensus(agents, makeCanonical());
      assert.ok(result.confidence > 70);
      assert.ok(result.confidence <= 100);
    });

    it("lower confidence when agents disagree", () => {
      const agents = [
        makeAgent("statistical", "Argentina", 2, 1, 80),
        makeAgent("llm-reasoning", "Argentina", 2, 1, 80),
        makeAgent("deterministic-rules", "France", 1, 2, 80),
      ];
      const result = computeAgentConsensus(agents, makeCanonical());
      const allAgreeAgents = [
        makeAgent("statistical", "Argentina", 2, 1, 80),
        makeAgent("llm-reasoning", "Argentina", 2, 1, 80),
        makeAgent("deterministic-rules", "Argentina", 2, 1, 80),
      ];
      const allAgreeResult = computeAgentConsensus(
        allAgreeAgents,
        makeCanonical()
      );
      assert.ok(result.confidence < allAgreeResult.confidence);
    });
  });
});
