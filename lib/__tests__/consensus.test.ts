import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeAgentConsensus } from "../consensus";
import { AgentOutput, CanonicalMatchState, AgentEvidence } from "../agents/types";

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
    providerAgreement: true,
    providerCount: 2,
    providerHealth: [],
    rawResults: [],
    ...overrides,
  };
}

describe("computeAgentConsensus", () => {
  describe("null canonical state", () => {
    it("returns INSUFFICIENT_DATA", () => {
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
      assert.equal(result.confidence, 100);
      assert.equal(result.minorityOpinion, null);
      assert.equal(result.finalPrediction.winner, "Argentina");
    });
  });

  describe("two agreeing, one disagreeing", () => {
    it("returns SETTLE with 67% confidence and minority opinion", () => {
      const agents = [
        makeAgent("statistical", "Argentina", 2, 1, 70),
        makeAgent("llm-reasoning", "Argentina", 2, 1, 65),
        makeAgent("deterministic-rules", "France", 1, 2, 60),
      ];
      const result = computeAgentConsensus(agents, makeCanonical());
      assert.equal(result.settlementDecision, "SETTLE");
      assert.equal(result.agreement, 2);
      assert.equal(result.confidence, 67);
      assert.notEqual(result.minorityOpinion, null);
      assert.equal(result.minorityOpinion!.agentId, "deterministic-rules");
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
      assert.equal(result.confidence, 33);
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
        makeCanonical({ status: "SCHEDULED", homeScore: null, awayScore: null })
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

  describe("evidence aggregation", () => {
    it("collects all evidence from all agents", () => {
      const agents = [
        makeAgent("statistical", "Argentina", 2, 1, 70),
        makeAgent("llm-reasoning", "Argentina", 2, 1, 65),
        makeAgent("deterministic-rules", "Argentina", 2, 1, 80),
      ];
      const result = computeAgentConsensus(agents, makeCanonical());
      assert.equal(result.evidence.length, 3);
    });
  });

  describe("reasoning text", () => {
    it("includes agent summaries", () => {
      const agents = [
        makeAgent("statistical", "Argentina", 2, 1, 70),
        makeAgent("llm-reasoning", "Argentina", 2, 1, 65),
        makeAgent("deterministic-rules", "Argentina", 2, 1, 80),
      ];
      const result = computeAgentConsensus(agents, makeCanonical());
      assert.ok(result.reasoning.includes("3/3 agents agree"));
      assert.ok(result.reasoning.includes("statistical Agent"));
      assert.ok(result.reasoning.includes("llm-reasoning Agent"));
      assert.ok(result.reasoning.includes("deterministic-rules Agent"));
    });
  });

  describe("canonical state propagation", () => {
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
      assert.equal(result.confidence, 100);
    });

    it("returns DO_NOT_SETTLE when they disagree", () => {
      const agents = [
        makeAgent("statistical", "Argentina", 2, 1, 70),
        makeAgent("llm-reasoning", "France", 1, 2, 65),
      ];
      const result = computeAgentConsensus(agents, makeCanonical());
      assert.equal(result.settlementDecision, "DO_NOT_SETTLE");
      assert.equal(result.agreement, 1);
      assert.equal(result.confidence, 50);
    });
  });
});
