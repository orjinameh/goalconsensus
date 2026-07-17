import type {
  CanonicalMatchState,
  AgentOutput,
  SpecialistAgentId,
  DebateMessage,
  AIConsensus,
} from "./agents/types";
import { specialistAgents, type VerificationAgent } from "./agents";

const STANCE_THRESHOLD = 55;

function deriveStance(
  agentPrediction: string,
  majorityWinner: string,
  confidence: number
): "agree" | "disagree" | "neutral" {
  if (agentPrediction === majorityWinner) return "agree";
  if (confidence < STANCE_THRESHOLD) return "neutral";
  return "disagree";
}

function generatePosition(
  agentId: SpecialistAgentId,
  homeTeam: string,
  awayTeam: string,
  predictedWinner: string,
  confidence: number,
  evidence: { detail: string }[]
): string {
  const topEvidence = evidence.slice(0, 2).map((e) => e.detail).join("; ");
  const strength = confidence > 70 ? "strongly" : confidence > 50 ? "moderately" : "cautiously";

  const agentPositions: Record<string, string> = {
    "tactical-analyst": `From a tactical perspective, I ${strength} favor ${predictedWinner}. ${topEvidence}`,
    "statistical-analyst": `The statistical models ${strength} point to ${predictedWinner}. ${topEvidence}`,
    "market-analyst": `Market signals and implied odds ${strength} suggest ${predictedWinner}. ${topEvidence}`,
    "injury-analyst": `Squad availability and fitness data ${strength} favor ${predictedWinner}. ${topEvidence}`,
    "news-analyst": `Recent developments and contextual factors ${strength} support ${predictedWinner}. ${topEvidence}`,
  };

  return agentPositions[agentId] || `Analysis ${strength} supports ${predictedWinner}. ${topEvidence}`;
}

function generateReasoning(
  stance: "agree" | "disagree" | "neutral",
  agentName: string,
  position: string,
  respondingTo?: string
): string {
  if (respondingTo) {
    switch (stance) {
      case "agree":
        return `${agentName} concurs with the consensus. ${position}`;
      case "disagree":
        return `${agentName} raises a contrarian view. ${position}`;
      case "neutral":
        return `${agentName} offers a nuanced perspective. ${position}`;
    }
  }
  return position;
}

export function runDebate(
  agentOutputs: AgentOutput[],
  canonicalState: CanonicalMatchState
): { messages: DebateMessage[]; consensus: AIConsensus } {
  if (agentOutputs.length === 0) {
    return {
      messages: [],
      consensus: {
        winner: canonicalState.homeTeam,
        confidence: 0,
        agreement: 0,
        totalAgents: 0,
        messages: [],
        minorityOpinion: null,
      },
    };
  }

  const activeAgents = agentOutputs.filter((a) => a.confidence > 0);
  if (activeAgents.length === 0) {
    return {
      messages: [],
      consensus: {
        winner: canonicalState.homeTeam,
        confidence: 0,
        agreement: 0,
        totalAgents: agentOutputs.length,
        messages: [],
        minorityOpinion: null,
      },
    };
  }

  const winnerVotes = new Map<string, AgentOutput[]>();
  for (const a of activeAgents) {
    const key = a.prediction.winner;
    if (!winnerVotes.has(key)) winnerVotes.set(key, []);
    winnerVotes.get(key)!.push(a);
  }

  let majorityWinner = "";
  let majorityCount = 0;
  for (const [winner, voters] of winnerVotes) {
    if (voters.length > majorityCount) {
      majorityWinner = winner;
      majorityCount = voters.length;
    }
  }

  const messages: DebateMessage[] = [];
  const sortedAgents = [...activeAgents].sort((a, b) => b.confidence - a.confidence);

  for (let i = 0; i < sortedAgents.length; i++) {
    const agent = sortedAgents[i];
    const stance = deriveStance(agent.prediction.winner, majorityWinner, agent.confidence);
    const respondingTo = i > 0 ? sortedAgents[i - 1].agentId as SpecialistAgentId : undefined;
    const position = generatePosition(
      agent.agentId as SpecialistAgentId,
      canonicalState.homeTeam,
      canonicalState.awayTeam,
      agent.prediction.winner,
      agent.confidence,
      agent.evidence
    );
    const reasoning = generateReasoning(stance, agent.agentName, position, respondingTo);

    messages.push({
      agentId: agent.agentId as SpecialistAgentId,
      agentName: agent.agentName,
      stance,
      position,
      reasoning,
      confidence: agent.confidence,
      respondingTo,
      timestamp: agent.timestamp,
    });
  }

  const agreement = majorityCount;
  const totalAgents = activeAgents.length;
  const avgConfidence = activeAgents.reduce((s, a) => s + a.confidence, 0) / totalAgents;
  const agreementRatio = totalAgents > 0 ? agreement / totalAgents : 0;
  const ensembleConfidence = Math.round(avgConfidence * 0.6 + agreementRatio * 40);

  const minorityAgents = activeAgents.filter((a) => a.prediction.winner !== majorityWinner);
  const minorityOpinion = minorityAgents.length > 0
    ? { agent: minorityAgents[0].agentName, position: minorityAgents[0].explanation }
    : null;

  return {
    messages,
    consensus: {
      winner: majorityWinner,
      confidence: ensembleConfidence,
      agreement,
      totalAgents,
      messages,
      minorityOpinion,
    },
  };
}

export function getSpecialistAgent(id: SpecialistAgentId): VerificationAgent | undefined {
  return specialistAgents.find((a) => a.id === id);
}

export { specialistAgents };
