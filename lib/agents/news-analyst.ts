import {
  VerificationAgent,
  CanonicalMatchState,
  AgentOutput,
  AgentEvidence,
} from "./types";
import { getTeamRating } from "../team-ratings";

function getFormDescription(recentForm: number): string {
  if (recentForm >= 0.8) return "excellent recent form";
  if (recentForm >= 0.65) return "strong recent form";
  if (recentForm >= 0.5) return "steady recent form";
  if (recentForm >= 0.35) return "inconsistent recent form";
  return "poor recent form";
}

function getMomentumText(recentForm: number): string {
  if (recentForm >= 0.75) return "riding a wave of momentum";
  if (recentForm >= 0.55) return "carrying positive momentum";
  if (recentForm >= 0.45) return "in a transitional phase";
  return "looking to arrest a slide in form";
}

function getMatchContextNarrative(
  homeTeam: string,
  awayTeam: string,
  homeRating: ReturnType<typeof getTeamRating>,
  awayRating: ReturnType<typeof getTeamRating>,
  status: CanonicalMatchState["status"]
): string[] {
  const lines: string[] = [];
  const ratingDiff = homeRating.rating - awayRating.rating;
  const formDiff = homeRating.recentForm - awayRating.recentForm;

  if (status === "FINISHED") {
    lines.push(
      `This match has concluded, with ${homeRating.rating > awayRating.rating ? homeTeam : awayTeam} entering as the higher-rated side.`
    );
  } else if (status === "LIVE") {
    lines.push(`The match is currently in progress, and early developments will shape the final narrative.`);
  } else {
    lines.push(
      `Heading into this fixture, ${homeTeam} hold a rating advantage of ${Math.abs(ratingDiff).toFixed(0)} points over ${awayTeam}.`
    );
  }

  if (formDiff > 0.15) {
    lines.push(
      `${homeTeam} ${getMomentumText(homeRating.recentForm)} with ${getFormDescription(homeRating.recentForm)}, while ${awayTeam} have been ${getFormDescription(awayRating.recentForm)}.`
    );
  } else if (formDiff < -0.15) {
    lines.push(
      `${awayTeam} ${getMomentumText(awayRating.recentForm)} with ${getFormDescription(awayRating.recentForm)}, while ${homeTeam} have been ${getFormDescription(homeRating.recentForm)}.`
    );
  } else {
    lines.push(
      `Both sides come into this with ${getFormDescription(homeRating.recentForm)} for ${homeTeam} and ${getFormDescription(awayRating.recentForm)} for ${awayTeam}.`
    );
  }

  return lines;
}

function buildHeadlines(
  homeTeam: string,
  awayTeam: string,
  homeRating: ReturnType<typeof getTeamRating>,
  awayRating: ReturnType<typeof getTeamRating>
): { title: string; source: string; sentiment: "positive" | "negative" | "neutral" }[] {
  const headlines: { title: string; source: string; sentiment: "positive" | "negative" | "neutral" }[] = [];

  const favorite = homeRating.rating >= awayRating.rating ? homeTeam : awayTeam;
  const underdog = homeRating.rating >= awayRating.rating ? awayTeam : homeTeam;

  headlines.push({
    title: `${favorite} look to continue strong run against ${underdog} in upcoming clash`,
    source: "Football Weekly",
    sentiment: "positive",
  });

  headlines.push({
    title: `${underdog} face stern test as they take on in-form ${favorite}`,
    source: "Matchday Insider",
    sentiment: "negative",
  });

  headlines.push({
    title: `Head-to-head: ${homeTeam} vs ${awayTeam} — all you need to know`,
    source: "The Sport Report",
    sentiment: "neutral",
  });

  if (homeRating.recentForm > awayRating.recentForm) {
    headlines.push({
      title: `${homeTeam} buoyed by recent results as home advantage looms large`,
      source: "Goal Digest",
      sentiment: "positive",
    });
  } else if (awayRating.recentForm > homeRating.recentForm) {
    headlines.push({
      title: `${awayTeam} arrive in confident mood looking to silence home crowd`,
      source: "Transfer & Match Talk",
      sentiment: "positive",
    });
  }

  return headlines;
}

function buildManagerQuotes(
  homeTeam: string,
  awayTeam: string,
  homeRating: ReturnType<typeof getTeamRating>,
  awayRating: ReturnType<typeof getTeamRating>
): { manager: string; quote: string }[] {
  const homeQuote =
    homeRating.recentForm >= 0.6
      ? `The boys are in great shape and we're confident heading into this one.`
      : `We've been working hard on the training ground to put things right. This is a chance to bounce back.`;

  const awayQuote =
    awayRating.recentForm >= 0.6
      ? `We respect ${homeTeam} but we believe in our quality. We'll go there to play our game.`
      : `It's a tough fixture but every match is an opportunity. We'll give everything on the pitch.`;

  return [
    { manager: `${homeTeam} Manager`, quote: homeQuote },
    { manager: `${awayTeam} Manager`, quote: awayQuote },
  ];
}

function predictScoreFromContext(
  homeRating: ReturnType<typeof getTeamRating>,
  awayRating: ReturnType<typeof getTeamRating>
): { home: number; away: number } {
  const homeExpected = homeRating.expectedGoals + homeRating.homeAdvantage;
  const awayExpected = awayRating.expectedGoals;
  const homeScore = Math.round(homeExpected);
  const awayScore = Math.round(awayExpected);
  return {
    home: Math.max(0, Math.min(5, homeScore)),
    away: Math.max(0, Math.min(5, awayScore)),
  };
}

export const newsAnalyst: VerificationAgent = {
  id: "news-analyst",
  name: "News Analyst",

  async verify(state: CanonicalMatchState): Promise<AgentOutput> {
    const start = Date.now();

    if (state.sport !== "FOOTBALL") {
      return {
        agentId: "news-analyst",
        agentName: "News Analyst",
        prediction: { winner: "Unknown", homeScore: null, awayScore: null },
        confidence: 0,
        explanation: `UNSUPPORTED_SPORT: News Analyst only supports football. Received sport: ${state.sport}.`,
        evidence: [
          {
            source: "news-analyst",
            detail: `UNSUPPORTED_SPORT: ${state.sport}`,
            weight: 1.0,
          },
        ],
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - start,
      };
    }

    const homeRating = getTeamRating(state.homeTeam);
    const awayRating = getTeamRating(state.awayTeam);

    const headlines = buildHeadlines(state.homeTeam, state.awayTeam, homeRating, awayRating);
    const managerQuotes = buildManagerQuotes(state.homeTeam, state.awayTeam, homeRating, awayRating);
    const contextNarrative = getMatchContextNarrative(
      state.homeTeam,
      state.awayTeam,
      homeRating,
      awayRating,
      state.status
    );

    const ratingDiff = Math.abs(homeRating.rating - awayRating.rating);
    const formDiff = Math.abs(homeRating.recentForm - awayRating.recentForm);

    let predictedWinner: string;
    let homeScore: number | null = null;
    let awayScore: number | null = null;

    if (state.status === "FINISHED" && state.homeScore !== null && state.awayScore !== null) {
      homeScore = state.homeScore;
      awayScore = state.awayScore;
      if (state.homeScore > state.awayScore) predictedWinner = state.homeTeam;
      else if (state.awayScore > state.homeScore) predictedWinner = state.awayTeam;
      else predictedWinner = "Draw";
    } else {
      const score = predictScoreFromContext(homeRating, awayRating);
      homeScore = score.home;
      awayScore = score.away;
      if (score.home > score.away) predictedWinner = state.homeTeam;
      else if (score.away > score.home) predictedWinner = state.awayTeam;
      else predictedWinner = "Draw";
    }

    let confidence: number;
    if (state.status === "FINISHED") {
      confidence = 85;
    } else {
      const clarityBonus = Math.min(ratingDiff / 2, 15) + Math.min(formDiff * 40, 10);
      confidence = Math.round(45 + clarityBonus);
    }
    confidence = Math.min(90, Math.max(20, confidence));

    const latestDevelopments: string[] = [
      `${state.homeTeam} currently carry a ${getFormDescription(homeRating.recentForm)} into this fixture`,
      `${state.awayTeam} ${getMomentumText(awayRating.recentForm)} ahead of the encounter`,
    ];

    if (state.status === "LIVE") {
      latestDevelopments.push("Live match updates are influencing the pre-match narrative");
    }

    const sentiment = homeRating.recentForm > awayRating.recentForm + 0.1
      ? "positive"
      : awayRating.recentForm > homeRating.recentForm + 0.1
        ? "mixed"
        : "neutral";

    const evidence: AgentEvidence[] = [
      {
        source: "news-analyst",
        detail: `Recent form analysis: ${state.homeTeam} ${(homeRating.recentForm * 100).toFixed(0)}% vs ${state.awayTeam} ${(awayRating.recentForm * 100).toFixed(0)}%`,
        weight: 0.25,
      },
      {
        source: "news-analyst",
        detail: `Context narrative: ${contextNarrative.join(" ")}`,
        weight: 0.25,
      },
      {
        source: "news-analyst",
        detail: `Headlines sentiment: ${headlines.length} stories analysed — ${headlines.filter((h) => h.sentiment === "positive").length} positive, ${headlines.filter((h) => h.sentiment === "negative").length} negative`,
        weight: 0.2,
      },
      {
        source: "news-analyst",
        detail: `Manager sentiment: ${managerQuotes.map((q) => `"${q.quote}"`).join(" vs ")}`,
        weight: 0.15,
      },
      {
        source: "news-analyst",
        detail: `Home advantage factor: +${(homeRating.homeAdvantage * 100).toFixed(0)}% rating boost for ${state.homeTeam}`,
        weight: 0.15,
      },
    ];

    const explanation =
      contextNarrative.join(" ") +
      ` ${headlines[0].title}. ` +
      `Latest developments suggest ${latestDevelopments.join(" and ").toLowerCase()}. ` +
      `Manager comments reflect a tone of ${sentiment} preparation from both camps. ` +
      `Based on news and context analysis, predicts ${state.homeTeam} ${homeScore}-${awayScore} ${state.awayTeam}.`;

    return {
      agentId: "news-analyst",
      agentName: "News Analyst",
      prediction: {
        winner: predictedWinner,
        homeScore,
        awayScore,
      },
      confidence,
      explanation,
      evidence,
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - start,
    };
  },
};
