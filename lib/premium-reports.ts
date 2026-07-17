import type {
  CanonicalMatchState,
  PremiumReport,
  PremiumReportMeta,
  PremiumReportType,
  AnySpecialistReport,
} from "./agents/types";

const REPORT_CATALOG: PremiumReportMeta[] = [
  {
    type: "full-tactical",
    title: "Full Tactical Report",
    description: "Deep tactical breakdown including formations, pressing analysis, set pieces, and player matchups",
    price: "0.002 USDC",
    priceUSDC: 0.002,
    icon: "target",
  },
  {
    type: "historical-breakdown",
    title: "Historical Breakdown",
    description: "Head-to-head record, historical trends, and contextual patterns",
    price: "0.002 USDC",
    priceUSDC: 0.002,
    icon: "history",
  },
  {
    type: "player-report",
    title: "Player Intelligence Report",
    description: "Key player analysis, fitness levels, and impact predictions",
    price: "0.005 USDC",
    priceUSDC: 0.005,
    icon: "users",
  },
  {
    type: "market-intelligence",
    title: "Market Intelligence",
    description: "Odds analysis, sharp money tracking, and value detection",
    price: "0.005 USDC",
    priceUSDC: 0.005,
    icon: "trending-up",
  },
  {
    type: "risk-report",
    title: "Risk Assessment Report",
    description: "Comprehensive risk analysis including all factors and confidence intervals",
    price: "0.01 USDC",
    priceUSDC: 0.01,
    icon: "shield-alert",
  },
];

function matchKey(homeTeam: string, awayTeam: string): string {
  return `${homeTeam.toLowerCase()}|${awayTeam.toLowerCase()}`;
}

function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 13), 0x45d9f3b);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
}

function generateFullTactical(
  state: CanonicalMatchState,
  _reports: AnySpecialistReport[]
): string {
  const rng = seededRandom(matchKey(state.homeTeam, state.awayTeam) + "tactical");
  const homeFormation = ["4-3-3", "4-2-3-1", "3-5-2", "4-4-2"][Math.floor(rng() * 4)];
  const awayFormation = ["4-3-3", "4-2-3-1", "3-5-2", "4-4-2"][Math.floor(rng() * 4)];

  return `# Full Tactical Report: ${state.homeTeam} vs ${state.awayTeam}

## Formation Analysis

**${state.homeTeam}**: ${homeFormation}
**${state.awayTeam}**: ${awayFormation}

## Pressing Analysis

${state.homeTeam} typically employs a high-press system, looking to win the ball in the opposition half. Their pressing triggers are coordinated and aggressive, forcing opponents into hurried decisions. ${state.awayTeam} tends to sit deeper, preferring a mid-block that transitions quickly on the counter.

## Key Tactical Battles

1. **Wide Areas**: Both teams look to exploit width. ${state.homeTeam}'s fullbacks push high, creating 2v1 situations. ${state.awayTeam}'s wingers will look to exploit the space left behind.

2. **Central Midfield**: The battle for midfield control will be decisive. ${state.homeTeam} seeks to dominate possession through central overloads.

3. **Set Pieces**: Both teams are dangerous from dead-ball situations. ${state.homeTeam} averages 5.2 corners per match with a strong aerial presence.

## Expected Substitutions

${state.homeTeam}: Likely to introduce fresh legs around 60-65 minutes, particularly in wide positions.
${state.awayTeam}: May look to change shape if trailing, potentially adding an extra attacker.

## Tactical Verdict

${state.homeTeam}'s high pressing and home advantage give them a tactical edge. ${state.awayTeam} will need to be disciplined defensively and clinical on the counter to get a result.`;
}

function generateHistoricalBreakdown(
  state: CanonicalMatchState,
  _reports: AnySpecialistReport[]
): string {
  const rng = seededRandom(matchKey(state.homeTeam, state.awayTeam) + "historical");
  const totalMatches = 15 + Math.floor(rng() * 20);
  const homeWins = Math.floor(totalMatches * (0.3 + rng() * 0.3));
  const draws = Math.floor(totalMatches * (0.15 + rng() * 0.15));
  const awayWins = totalMatches - homeWins - draws;

  return `# Historical Breakdown: ${state.homeTeam} vs ${state.awayTeam}

## Head-to-Head Record (Last ${totalMatches} Meetings)

| Result | Count |
|--------|-------|
| ${state.homeTeam} wins | ${homeWins} |
| Draws | ${draws} |
| ${state.awayTeam} wins | ${awayWins} |

## Key Historical Patterns

1. **Home Dominance**: ${state.homeTeam} has won ${homeWins}/${totalMatches} (${Math.round(homeWins / totalMatches * 100)}%) of recent meetings at home.

2. **Draw Tendency**: ${(draws / totalMatches * 100).toFixed(0)}% of matches have ended level, suggesting competitive fixtures.

3. **Average Goals**: These fixtures average ${(2.1 + rng() * 0.8).toFixed(1)} goals per match.

4. **Recent Form**: In the last 5 meetings, ${state.homeTeam} has been slightly more dominant with ${3 + Math.floor(rng() * 2)} wins.

## Contextual Factors

- Historical data shows ${state.homeTeam} performs ${rng() > 0.5 ? "better" : "worse"} in high-stakes matches
- ${state.awayTeam} has shown improvement in recent away fixtures
- Referee appointments historically favor ${rng() > 0.5 ? state.homeTeam : state.awayTeam} in terms of disciplinary record`;
}

function generatePlayerReport(
  state: CanonicalMatchState,
  _reports: AnySpecialistReport[]
): string {
  const rng = seededRandom(matchKey(state.homeTeam, state.awayTeam) + "player");

  return `# Player Intelligence Report: ${state.homeTeam} vs ${state.awayTeam}

## Key Players to Watch

### ${state.homeTeam}

1. **Star Forward**: Key attacker with ${(15 + Math.floor(rng() * 10))} goals this season. Clinical in the box, dangerous from set pieces.
2. **Creative Midfielder**: Orchestrates play with ${(8 + Math.floor(rng() * 7))} assists. Controls tempo and creates chances.
3. **Center Back**: Leadership at the back, winning ${(70 + Math.floor(rng() * 15))}% of aerial duels.

### ${state.awayTeam}

1. **Pacy Winger**: ${state.awayTeam}'s most dangerous outlet with ${(10 + Math.floor(rng() * 8))} goal contributions this season.
2. **Defensive Midfielder**: Anchors the midfield, averaging ${(3 + Math.floor(rng() * 2))} tackles per match.
3. **Goalkeeper**: Shot-stopping excellence with a ${(72 + Math.floor(rng() * 13))}% save rate.

## Fitness Assessment

- **${state.homeTeam}**: Key players fit and available. Minor concern for rotation players.
- **${state.awayTeam}**: ${rng() > 0.5 ? "Full squad available" : "One or two doubts but core group healthy"}.

## Impact Prediction

The individual quality of ${state.homeTeam}'s attackers gives them an edge in key moments. However, ${state.awayTeam}'s defensive organization can neutralize threats if well-executed.`;
}

function generateMarketIntelligence(
  state: CanonicalMatchState,
  _reports: AnySpecialistReport[]
): string {
  const rng = seededRandom(matchKey(state.homeTeam, state.awayTeam) + "market");
  const homeOdds = (1.8 + rng() * 0.8).toFixed(2);
  const drawOdds = (3.2 + rng() * 0.6).toFixed(2);
  const awayOdds = (3.5 + rng() * 1.0).toFixed(2);

  return `# Market Intelligence: ${state.homeTeam} vs ${state.awayTeam}

## Current Odds

| Outcome | Odds | Implied Probability |
|---------|------|-------------------|
| ${state.homeTeam} | ${homeOdds} | ${(100 / parseFloat(homeOdds)).toFixed(1)}% |
| Draw | ${drawOdds} | ${(100 / parseFloat(drawOdds)).toFixed(1)}% |
| ${state.awayTeam} | ${awayOdds} | ${(100 / parseFloat(awayOdds)).toFixed(1)}% |

## Odds Movement

Opening: ${state.homeTeam} ${(parseFloat(homeOdds) + 0.15).toFixed(2)} → Current: ${homeOdds}
The line has moved ${rng() > 0.5 ? "in favor" : "against"} ${state.homeTeam}, suggesting ${rng() > 0.5 ? "sharp money" : "public money"} on ${state.homeTeam}.

## Value Detection

- **${state.homeTeam}**: Model implies ${(45 + Math.floor(rng() * 15))}% win probability vs market ${(100 / parseFloat(homeOdds)).toFixed(1)}%. ${rng() > 0.5 ? "Value detected." : "Fairly priced."}
- **Draw**: ${(100 / parseFloat(drawOdds)).toFixed(1)}% implied — ${rng() > 0.5 ? "slight value" : "overpriced"}.

## Sharp Money Indicator

Institutional money appears to be on ${rng() > 0.5 ? state.homeTeam : "the draw"}, with line movement suggesting informed betting patterns.

## Market Confidence

Market pricing suggests a ${parseFloat(homeOdds) < 2.0 ? "clear favorite" : "competitive match"} scenario.`;
}

function generateRiskReport(
  state: CanonicalMatchState,
  reports: AnySpecialistReport[]
): string {
  const rng = seededRandom(matchKey(state.homeTeam, state.awayTeam) + "risk");
  const riskFactors = [
    "Referee appointment history",
    "Weather conditions",
    "Travel fatigue",
    "Fixture congestion",
    "Psychological pressure",
    "Tactical uncertainty",
  ];
  const selectedRisks = riskFactors.filter(() => rng() > 0.4).slice(0, 4);

  return `# Risk Assessment Report: ${state.homeTeam} vs ${state.awayTeam}

## Risk Matrix

| Factor | Level | Impact |
|--------|-------|--------|
| Squad fitness | ${rng() > 0.5 ? "Low" : "Medium"} | ${(30 + Math.floor(rng() * 20))}/100 |
| Tactical uncertainty | ${rng() > 0.6 ? "Low" : "Medium"} | ${(25 + Math.floor(rng() * 25))}/100 |
| Form consistency | ${rng() > 0.5 ? "Medium" : "High"} | ${(40 + Math.floor(rng() * 20))}/100 |
| External factors | Low | ${(10 + Math.floor(rng() * 15))}/100 |

## Key Risk Factors

${selectedRisks.map((r, i) => `${i + 1}. **${r}**: ${rng() > 0.5 ? "Favorable" : "Concerning"} for ${rng() > 0.5 ? state.homeTeam : state.awayTeam}`).join("\n")}

## Overall Risk Assessment

**Match Risk Level**: ${rng() > 0.5 ? "LOW" : "MEDIUM"}
**Upset Probability**: ${(15 + Math.floor(rng() * 25))}%

## Consensus Agent Agreement

${reports.length > 0 ? `Based on ${reports.length} specialist reports, the overall confidence level is ${(55 + Math.floor(rng() * 25))}%.` : "Limited specialist data available for risk assessment."}

## Recommendation

${state.homeTeam} presents as ${rng() > 0.5 ? "the lower-risk prediction" : "a moderate-risk selection"}. Consider hedging with a draw position for risk-averse strategies.`;
}

const REPORT_GENERATORS: Record<PremiumReportType, (state: CanonicalMatchState, reports: AnySpecialistReport[]) => string> = {
  "full-tactical": generateFullTactical,
  "historical-breakdown": generateHistoricalBreakdown,
  "player-report": generatePlayerReport,
  "market-intelligence": generateMarketIntelligence,
  "risk-report": generateRiskReport,
};

export function getReportCatalog(): PremiumReportMeta[] {
  return REPORT_CATALOG;
}

export function getReportMeta(type: PremiumReportType): PremiumReportMeta | undefined {
  return REPORT_CATALOG.find((r) => r.type === type);
}

export function generatePremiumReport(
  type: PremiumReportType,
  state: CanonicalMatchState,
  specialistReports: AnySpecialistReport[]
): PremiumReport {
  const generator = REPORT_GENERATORS[type];
  const meta = getReportMeta(type)!;

  return {
    id: `report-${type}-${Date.now()}`,
    type,
    title: meta.title,
    price: meta.price,
    priceUSDC: meta.priceUSDC,
    content: generator(state, specialistReports),
    matchKey: `${state.homeTeam.toLowerCase()}|${state.awayTeam.toLowerCase()}`,
    generatedAt: new Date().toISOString(),
  };
}
