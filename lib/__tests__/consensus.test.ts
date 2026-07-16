import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeConsensus } from "../consensus";
import { ProviderResult, ProviderHealth } from "../providers";

function healthyHealth(id: string): ProviderHealth {
  return {
    providerId: id,
    available: true,
    latencyMs: 120,
    lastChecked: new Date().toISOString(),
  };
}

function downHealth(id: string, error = "timeout"): ProviderHealth {
  return {
    providerId: id,
    available: false,
    latencyMs: 8000,
    lastChecked: new Date().toISOString(),
    error,
  };
}

function providerResult(
  id: string,
  matches: ProviderResult["matches"],
  available = true
): ProviderResult {
  return {
    providerId: id,
    matches,
    health: available ? healthyHealth(id) : downHealth(id),
  };
}

function match(
  id: string,
  home: string,
  away: string,
  hs: number | null,
  as: number | null,
  status: "SCHEDULED" | "LIVE" | "FINISHED",
  providerId: string
) {
  return {
    id,
    homeTeam: home,
    awayTeam: away,
    homeScore: hs,
    awayScore: as,
    status,
    matchDate: "2026-07-04T20:00:00Z",
    providerId,
  };
}

const ARG = "Argentina";
const FRA = "France";

describe("computeConsensus", () => {
  describe("one provider responding", () => {
    it("returns INSUFFICIENT_DATA with only one provider", () => {
      const results = [
        providerResult("football-data", [
          match("fd-1", ARG, FRA, 2, 1, "FINISHED", "football-data"),
        ]),
        providerResult("thesportsdb", [], false),
        providerResult("api-football", [], false),
      ];

      const v = computeConsensus(results);
      assert.equal(v.verdict, "INSUFFICIENT_DATA");
      assert.equal(v.totalNodes, 1);
      assert.equal(v.passingNodes, 0);
      assert.equal(v.confidence, 0);
      assert.equal(v.agreedResult, null);
      assert.equal(v.providerHealth.length, 3);
      assert.equal(v.providerHealth[0].available, true);
      assert.equal(v.providerHealth[1].available, false);
      assert.equal(v.providerHealth[2].available, false);
    });
  });

  describe("two agreeing providers", () => {
    it("returns CONFIRMED when both agree", () => {
      const results = [
        providerResult("football-data", [
          match("fd-1", ARG, FRA, 2, 1, "FINISHED", "football-data"),
        ]),
        providerResult("thesportsdb", [
          match("tsdb-1", ARG, FRA, 2, 1, "FINISHED", "thesportsdb"),
        ]),
        providerResult("api-football", [], false),
      ];

      const v = computeConsensus(results);
      assert.equal(v.verdict, "CONFIRMED");
      assert.equal(v.totalNodes, 2);
      assert.equal(v.passingNodes, 2);
      assert.equal(v.confidence, 100);
      assert.deepEqual(v.agreedResult, {
        homeTeam: ARG,
        awayTeam: FRA,
        homeScore: 2,
        awayScore: 1,
      });
      assert.equal(v.conflictingProviders.length, 0);
    });
  });

  describe("two disagreeing providers", () => {
    it("returns DISPUTED when both disagree", () => {
      const results = [
        providerResult("football-data", [
          match("fd-1", ARG, FRA, 2, 1, "FINISHED", "football-data"),
        ]),
        providerResult("thesportsdb", [
          match("tsdb-1", ARG, FRA, 1, 1, "FINISHED", "thesportsdb"),
        ]),
        providerResult("api-football", [], false),
      ];

      const v = computeConsensus(results);
      assert.equal(v.verdict, "DISPUTED");
      assert.equal(v.totalNodes, 2);
      assert.equal(v.passingNodes, 1);
      assert.equal(v.confidence, 0);
      assert.notEqual(v.agreedResult, null);
      assert.ok(v.conflictingProviders.includes("thesportsdb"));
    });
  });

  describe("three agreeing providers", () => {
    it("returns CONFIRMED with 100% confidence", () => {
      const results = [
        providerResult("football-data", [
          match("fd-1", ARG, FRA, 2, 1, "FINISHED", "football-data"),
        ]),
        providerResult("thesportsdb", [
          match("tsdb-1", ARG, FRA, 2, 1, "FINISHED", "thesportsdb"),
        ]),
        providerResult("api-football", [
          match("af-1", ARG, FRA, 2, 1, "FINISHED", "api-football"),
        ]),
      ];

      const v = computeConsensus(results);
      assert.equal(v.verdict, "CONFIRMED");
      assert.equal(v.totalNodes, 3);
      assert.equal(v.passingNodes, 3);
      assert.equal(v.confidence, 100);
      assert.deepEqual(v.agreedResult, {
        homeTeam: ARG,
        awayTeam: FRA,
        homeScore: 2,
        awayScore: 1,
      });
      assert.equal(v.conflictingProviders.length, 0);
    });
  });

  describe("three providers, two agree one disagrees", () => {
    it("returns CONFIRMED with 67% confidence", () => {
      const results = [
        providerResult("football-data", [
          match("fd-1", ARG, FRA, 2, 1, "FINISHED", "football-data"),
        ]),
        providerResult("thesportsdb", [
          match("tsdb-1", ARG, FRA, 2, 1, "FINISHED", "thesportsdb"),
        ]),
        providerResult("api-football", [
          match("af-1", ARG, FRA, 1, 1, "FINISHED", "api-football"),
        ]),
      ];

      const v = computeConsensus(results);
      assert.equal(v.verdict, "CONFIRMED");
      assert.equal(v.totalNodes, 3);
      assert.equal(v.passingNodes, 2);
      assert.equal(v.confidence, 67);
      assert.ok(v.conflictingProviders.includes("api-football"));
    });
  });

  describe("provider timeouts (unavailable)", () => {
    it("returns INSUFFICIENT_DATA when all providers timeout", () => {
      const results = [
        providerResult("football-data", [], false),
        providerResult("thesportsdb", [], false),
        providerResult("api-football", [], false),
      ];

      const v = computeConsensus(results);
      assert.equal(v.verdict, "INSUFFICIENT_DATA");
      assert.equal(v.totalNodes, 0);
      assert.equal(v.passingNodes, 0);
      assert.equal(v.confidence, 0);
      assert.equal(v.agreedResult, null);
    });

    it("returns INSUFFICIENT_DATA when two of three timeout", () => {
      const results = [
        providerResult("football-data", [
          match("fd-1", ARG, FRA, 2, 1, "FINISHED", "football-data"),
        ]),
        providerResult("thesportsdb", [], false),
        providerResult("api-football", [], false),
      ];

      const v = computeConsensus(results);
      assert.equal(v.verdict, "INSUFFICIENT_DATA");
      assert.equal(v.totalNodes, 1);
      assert.equal(v.passingNodes, 0);
      assert.equal(v.providerHealth.filter((h) => !h.available).length, 2);
    });

    it("uses data from available providers when one is down", () => {
      const results = [
        providerResult("football-data", [
          match("fd-1", ARG, FRA, 2, 1, "FINISHED", "football-data"),
        ]),
        providerResult("thesportsdb", [
          match("tsdb-1", ARG, FRA, 2, 1, "FINISHED", "thesportsdb"),
        ]),
        providerResult("api-football", [], false),
      ];

      const v = computeConsensus(results);
      assert.equal(v.verdict, "CONFIRMED");
      assert.equal(v.totalNodes, 2);
      assert.equal(v.passingNodes, 2);
      assert.equal(v.confidence, 100);
    });
  });

  describe("no results at all", () => {
    it("returns INSUFFICIENT_DATA when no matches returned", () => {
      const results = [
        providerResult("football-data", []),
        providerResult("thesportsdb", []),
        providerResult("api-football", []),
      ];

      const v = computeConsensus(results);
      assert.equal(v.verdict, "INSUFFICIENT_DATA");
      assert.ok(v.explanation.includes("No match data"));
    });
  });

  describe("no results with some providers down", () => {
    it("returns INSUFFICIENT_DATA when down providers return nothing and up providers also return nothing", () => {
      const results = [
        providerResult("football-data", []),
        providerResult("thesportsdb", [], false),
        providerResult("api-football", []),
      ];

      const v = computeConsensus(results);
      assert.equal(v.verdict, "INSUFFICIENT_DATA");
    });
  });

  describe("match not finished", () => {
    it("returns PENDING when match is not finished", () => {
      const results = [
        providerResult("football-data", [
          match("fd-1", ARG, FRA, null, null, "SCHEDULED", "football-data"),
        ]),
        providerResult("thesportsdb", [
          match("tsdb-1", ARG, FRA, null, null, "SCHEDULED", "thesportsdb"),
        ]),
        providerResult("api-football", [
          match("af-1", ARG, FRA, null, null, "SCHEDULED", "api-football"),
        ]),
      ];

      const v = computeConsensus(results);
      assert.equal(v.verdict, "PENDING");
      assert.equal(v.confidence, 0);
      assert.equal(v.agreedResult?.homeTeam, ARG);
    });
  });

  describe("LIVE matches only", () => {
    it("returns PENDING when only live matches", () => {
      const results = [
        providerResult("football-data", [
          match("fd-1", ARG, FRA, 1, 0, "LIVE", "football-data"),
        ]),
        providerResult("thesportsdb", [
          match("tsdb-1", ARG, FRA, 1, 0, "LIVE", "thesportsdb"),
        ]),
        providerResult("api-football", [
          match("af-1", ARG, FRA, 1, 0, "LIVE", "api-football"),
        ]),
      ];

      const v = computeConsensus(results);
      assert.equal(v.verdict, "PENDING");
      assert.equal(v.totalNodes, 3);
    });
  });

  describe("confidence calculation", () => {
    it("computes confidence as agree/total * 100, rounded", () => {
      const results = [
        providerResult("football-data", [
          match("fd-1", ARG, FRA, 3, 0, "FINISHED", "football-data"),
        ]),
        providerResult("thesportsdb", [
          match("tsdb-1", ARG, FRA, 3, 0, "FINISHED", "thesportsdb"),
        ]),
        providerResult("api-football", [
          match("af-1", ARG, FRA, 2, 1, "FINISHED", "api-football"),
        ]),
      ];

      const v = computeConsensus(results);
      assert.equal(v.verdict, "CONFIRMED");
      assert.equal(v.confidence, 67);
      assert.equal(v.passingNodes, 2);
      assert.equal(v.totalNodes, 3);
    });

    it("computes confidence for two providers as 100 when both agree", () => {
      const results = [
        providerResult("football-data", [
          match("fd-1", ARG, FRA, 1, 0, "FINISHED", "football-data"),
        ]),
        providerResult("thesportsdb", [
          match("tsdb-1", ARG, FRA, 1, 0, "FINISHED", "thesportsdb"),
        ]),
      ];

      const v = computeConsensus(results);
      assert.equal(v.confidence, 100);
    });
  });

  describe("provider health in verdict", () => {
    it("includes provider health for all providers in verdict", () => {
      const results = [
        providerResult("football-data", [
          match("fd-1", ARG, FRA, 2, 1, "FINISHED", "football-data"),
        ]),
        providerResult("thesportsdb", [
          match("tsdb-1", ARG, FRA, 2, 1, "FINISHED", "thesportsdb"),
        ]),
        providerResult("api-football", [], false),
      ];

      const v = computeConsensus(results);
      assert.equal(v.providerHealth.length, 3);
      assert.equal(v.providerHealth[0].providerId, "football-data");
      assert.equal(v.providerHealth[0].available, true);
      assert.equal(v.providerHealth[1].providerId, "thesportsdb");
      assert.equal(v.providerHealth[1].available, true);
      assert.equal(v.providerHealth[2].providerId, "api-football");
      assert.equal(v.providerHealth[2].available, false);
    });
  });

  describe("BFT threshold calculation", () => {
    it("threshold is ceil(2n/3) for dynamic n", () => {
      const results2 = [
        providerResult("football-data", [
          match("fd-1", ARG, FRA, 2, 1, "FINISHED", "football-data"),
        ]),
        providerResult("thesportsdb", [
          match("tsdb-1", ARG, FRA, 2, 1, "FINISHED", "thesportsdb"),
        ]),
      ];
      const v2 = computeConsensus(results2);
      assert.equal(v2.totalNodes, 2);
      assert.equal(v2.verdict, "CONFIRMED");

      const results3 = [
        providerResult("football-data", [
          match("fd-1", ARG, FRA, 2, 1, "FINISHED", "football-data"),
        ]),
        providerResult("thesportsdb", [
          match("tsdb-1", ARG, FRA, 2, 1, "FINISHED", "thesportsdb"),
        ]),
        providerResult("api-football", [
          match("af-1", ARG, FRA, 2, 1, "FINISHED", "api-football"),
        ]),
      ];
      const v3 = computeConsensus(results3);
      assert.equal(v3.totalNodes, 3);
      assert.equal(v3.verdict, "CONFIRMED");
    });

    it("two disagreeing with three total results in DISPUTED", () => {
      const results = [
        providerResult("football-data", [
          match("fd-1", ARG, FRA, 2, 1, "FINISHED", "football-data"),
        ]),
        providerResult("thesportsdb", [
          match("tsdb-1", ARG, FRA, 0, 0, "FINISHED", "thesportsdb"),
        ]),
        providerResult("api-football", [
          match("af-1", ARG, FRA, 1, 1, "FINISHED", "api-football"),
        ]),
      ];

      const v = computeConsensus(results);
      assert.equal(v.verdict, "DISPUTED");
      assert.equal(v.confidence, 0);
    });
  });

  describe("no simulated data references", () => {
    it("verdict never mentions simulated sources", () => {
      const results = [
        providerResult("football-data", [
          match("fd-1", ARG, FRA, 2, 1, "FINISHED", "football-data"),
        ]),
        providerResult("thesportsdb", [
          match("tsdb-1", ARG, FRA, 2, 1, "FINISHED", "thesportsdb"),
        ]),
        providerResult("api-football", [
          match("af-1", ARG, FRA, 2, 1, "FINISHED", "api-football"),
        ]),
      ];

      const v = computeConsensus(results);
      assert.ok(!v.explanation.toLowerCase().includes("simulated"));
      assert.equal(v.conflictingProviders.length, 0);
    });
  });
});
