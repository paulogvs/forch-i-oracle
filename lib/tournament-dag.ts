// FORCH.i ORACLE — Tournament Bracket DAG (Directed Acyclic Graph)
// Inspired by WorldCupBench's feeds_into pattern.
//
// The knockout bracket is a DAG where each match feeds into the next:
//    R32 → R16 → QF → SF → Final (+ 3rd Place from SF losers)
//
// This utility generates the DAG structure by parsing match slot references
// (e.g., "W-R32-1" means "winner of R32-1").
//
// No changes to existing Match type needed — the DAG is derived from the
// existing slot references in knockout match definitions.

import { ALL_MATCHES, type Match } from './matches';

// ═══════════════════════════════════════════════════════════════
// DAG TYPES
// ═══════════════════════════════════════════════════════════════

export interface DAGNode {
  matchId: string;
  round: string;
  roundLabel: string;
  feedsInto: string | null;       // matchId this winner goes to
  feedsIntoSlot: 'home' | 'away' | null;
  feedsFrom: string[];            // matchIds that feed into this match
  isThirdPlaceFrom?: string;      // if this is 3rd place, which SF loser feeds it
  children: DAGNode[];
}

export interface TournamentDAG {
  nodes: DAGNode[];
  root: DAGNode | null;           // Final match (terminal node)
  leafNodes: DAGNode[];           // R32 matches (entry points)
  depth: number;                  // Max depth of the bracket (R32=1, Final=5)
}

// ═══════════════════════════════════════════════════════════════
// ROUND ORDER — For sorting and depth calculation
// ═══════════════════════════════════════════════════════════════

const ROUND_ORDER: Record<string, number> = {
  'round-32': 1,
  'round-16': 2,
  quarter: 3,
  semi: 4,
  third: 4.5,
  final: 5,
};

const ROUND_LABELS: Record<string, string> = {
  'round-32': '1/16 Final',
  'round-16': 'Octavos',
  quarter: 'Cuartos',
  semi: 'Semis',
  third: '3° Puesto',
  final: 'Final',
};

// ═══════════════════════════════════════════════════════════════
// DAG CONSTRUCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Build the complete tournament bracket DAG from ALL_MATCHES.
 * Parses slot references ("W-R32-1", "L-SF-1") to determine
 * which matches feed into which.
 */
export function buildTournamentDAG(): TournamentDAG {
  const knockoutMatches = ALL_MATCHES.filter(m => m.round !== 'group');
  const matchMap = new Map<string, Match>();
  for (const m of knockoutMatches) {
    matchMap.set(m.id, m);
  }

  // Build nodes
  const nodeMap = new Map<string, DAGNode>();
  for (const match of knockoutMatches) {
    const feedsInto = findFeedsInto(match.id, knockoutMatches);
    const feedsFrom = findFeedsFrom(match, knockoutMatches);
    const slot = feedsInto ? (feedsInto.homeTeam.includes(match.id) ? 'home' : 'away') : null;

    const node: DAGNode = {
      matchId: match.id,
      round: match.round,
      roundLabel: ROUND_LABELS[match.round] || match.round,
      feedsInto: feedsInto?.id || null,
      feedsIntoSlot: slot,
      feedsFrom: feedsFrom.map(m => m.id),
      children: [],
    };

    // Third place: identify which SF loser feeds it
    if (match.round === 'third' && match.homeTeam.startsWith('L-')) {
      node.isThirdPlaceFrom = match.homeTeam.replace('L-', '');
    } else if (match.round === 'third' && match.awayTeam.startsWith('L-')) {
      node.isThirdPlaceFrom = match.awayTeam.replace('L-', '');
    }

    nodeMap.set(match.id, node);
  }

  // Build children relationships
  const allNodes = Array.from(nodeMap.values());
  for (const node of allNodes) {
    if (node.feedsInto) {
      const parent = nodeMap.get(node.feedsInto);
      if (parent) {
        parent.children.push(node);
      }
    }
  }

  // Sort children by order
  for (const node of allNodes) {
    node.children.sort((a, b) => {
      const orderA = ROUND_ORDER[a.round] || 0;
      const orderB = ROUND_ORDER[b.round] || 0;
      return orderB - orderA; // Descending: deeper rounds first
    });
  }

  const nodes = Array.from(nodeMap.values()).sort(
    (a, b) => (ROUND_ORDER[a.round] || 0) - (ROUND_ORDER[b.round] || 0)
  );

  const finalNode = nodeMap.get('Final') || null;
  const leafNodes = nodes.filter(n => n.feedsFrom.length === 0);
  const maxRound = Math.max(...nodes.map(n => ROUND_ORDER[n.round] || 0));

  return {
    nodes,
    root: finalNode,
    leafNodes,
    depth: maxRound,
  };
}

/**
 * Find which match this match feeds into.
 * Example: R16-1 has `homeTeam: 'W-R32-1'` and `awayTeam: 'W-R32-2'`.
 * R32-1 feeds into R16-1.
 */
function findFeedsInto(matchId: string, allMatches: Match[]): Match | null {
  for (const m of allMatches) {
    if (m.homeTeam.includes(matchId) || m.awayTeam.includes(matchId)) {
      return m;
    }
  }
  return null;
}

/**
 * Find which matches feed into this match.
 * Example: R16-1 has homeTeam: 'W-R32-1', awayTeam: 'W-R32-2'.
 * So R32-1 and R32-2 feed into R16-1.
 */
function findFeedsFrom(match: Match, allMatches: Match[]): Match[] {
  const results: Match[] = [];
  for (const m of allMatches) {
    if (m.id === match.id) continue;
    // Check if this match's ID is referenced in the slot
    if (match.homeTeam.includes(m.id) || match.awayTeam.includes(m.id)) {
      results.push(m);
    }
  }
  return results;
}

/**
 * Get the bracket depth for a match round.
 */
export function getRoundDepth(round: string): number {
  return ROUND_ORDER[round] || 0;
}

/**
 * Get human-readable round label.
 */
export function getRoundLabel(round: string): string {
  return ROUND_LABELS[round] || round;
}

/**
 * Get all matches in a bracket "path" from a starting match to the final.
 * Useful for showing which teams a bracket pick affects.
 */
export function getBracketPath(matchId: string, dag?: TournamentDAG): string[] {
  const dagInstance = dag || buildTournamentDAG();
  const path: string[] = [matchId];
  let current = dagInstance.nodes.find(n => n.matchId === matchId);
  while (current?.feedsInto) {
    path.push(current.feedsInto);
    current = dagInstance.nodes.find(n => n.matchId === current!.feedsInto);
  }
  return path;
}
