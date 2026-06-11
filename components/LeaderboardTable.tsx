'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  ALL_MODELS,
  buildConsensus,
  evaluateResults,
  type LeaderboardEntry,
  type MatchResult,
} from '@/lib/worldcup-bench-data';

const STORAGE_KEY = 'forchi-oracle-real-results';

export function getStoredResults(): MatchResult[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveResult(result: MatchResult): void {
  const existing = getStoredResults();
  // Replace if matchId already exists, append otherwise
  const filtered = existing.filter(r => r.matchId !== result.matchId);
  filtered.push(result);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function deleteResult(matchId: number): void {
  const existing = getStoredResults();
  const filtered = existing.filter(r => r.matchId !== matchId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export default function LeaderboardTable() {
  const [results, setResults] = useState<MatchResult[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showInput, setShowInput] = useState(false);
  const [inputMatchId, setInputMatchId] = useState('');
  const [inputHome, setInputHome] = useState('');
  const [inputAway, setInputAway] = useState('');
  const [inputHomeScore, setInputHomeScore] = useState('');
  const [inputAwayScore, setInputAwayScore] = useState('');

  useEffect(() => {
    const stored = getStoredResults();
    setResults(stored);
  }, []);

  // Re-compute leaderboard whenever results change
  useEffect(() => {
    if (results.length > 0) {
      const lb = evaluateResults(results);
      setLeaderboard(lb);
    } else {
      // Show initial state (all zeros)
      const empty: LeaderboardEntry[] = ALL_MODELS.map((name, i) => ({
        rank: 0,
        modelName: name,
        correctOutcomes: 0,
        exactScores: 0,
        totalEvaluated: 0,
        accuracy: 0,
        brierAvg: null,
        bracketPoints: 0,
        champion: '',
        runnerUp: '',
      }));
      setLeaderboard(empty);
    }
  }, [results]);

  const handleAddResult = () => {
    const matchId = parseInt(inputMatchId, 10);
    const homeScore = parseInt(inputHomeScore, 10);
    const awayScore = parseInt(inputAwayScore, 10);
    if (isNaN(matchId) || isNaN(homeScore) || isNaN(awayScore)) return;

    const result: MatchResult = {
      matchId,
      homeTeam: inputHome.toUpperCase(),
      awayTeam: inputAway.toUpperCase(),
      homeScore,
      awayScore,
      result: homeScore > awayScore ? 'home' : awayScore > homeScore ? 'away' : 'draw',
    };

    saveResult(result);
    setResults(getStoredResults());
    setInputMatchId('');
    setInputHome('');
    setInputAway('');
    setInputHomeScore('');
    setInputAwayScore('');
  };

  const handleDeleteResult = (matchId: number) => {
    deleteResult(matchId);
    setResults(getStoredResults());
  };

  const handleClearAll = () => {
    if (confirm('Clear all results? This will reset the leaderboard.')) {
      localStorage.removeItem(STORAGE_KEY);
      setResults([]);
    }
  };

  const totalMatches = leaderboard[0]?.totalEvaluated ?? 0;

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="text-2xl">📊</div>
        <div>
          <h2 className="text-lg font-bold text-white">Leaderboard</h2>
          <p className="text-sm text-[var(--wc-silver)]">
            {totalMatches > 0
              ? `${totalMatches} matches evaluated · Updated live`
              : 'Enter real match results to start tracking'}
          </p>
        </div>
        {results.length > 0 && (
          <span className="ml-auto text-xs text-[var(--wc-silver)] bg-white/5 px-3 py-1 rounded-full">
            {results.length} results
          </span>
        )}
      </div>

      {/* Input toggle */}
      <button
        onClick={() => setShowInput(!showInput)}
        className="w-full mb-4 p-2 text-xs text-[var(--wc-silver)] hover:text-white border border-dashed border-white/10 rounded-lg transition-colors"
      >
        {showInput ? '− Close result entry' : '+ Add real match result'}
      </button>

      {/* Input form */}
      {showInput && (
        <div className="mb-4 p-4 bg-white/[0.03] rounded-xl space-y-3">
          <div className="grid grid-cols-5 gap-2">
            <input
              value={inputMatchId}
              onChange={(e) => setInputMatchId(e.target.value)}
              placeholder="Match ID"
              className="col-span-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
            <input
              value={inputHome}
              onChange={(e) => setInputHome(e.target.value)}
              placeholder="Home (e.g. MEX)"
              className="col-span-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
            <input
              value={inputAway}
              onChange={(e) => setInputAway(e.target.value)}
              placeholder="Away (e.g. RSA)"
              className="col-span-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
            <div className="col-span-1 flex gap-1">
              <input
                value={inputHomeScore}
                onChange={(e) => setInputHomeScore(e.target.value)}
                placeholder="H"
                type="number"
                min="0"
                max="20"
                className="w-1/2 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-white text-center"
              />
              <input
                value={inputAwayScore}
                onChange={(e) => setInputAwayScore(e.target.value)}
                placeholder="A"
                type="number"
                min="0"
                max="20"
                className="w-1/2 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-white text-center"
              />
            </div>
            <button
              onClick={handleAddResult}
              disabled={!inputMatchId || !inputHome || !inputAway || !inputHomeScore || !inputAwayScore}
              className="btn-premium text-xs px-3 py-2 disabled:opacity-50"
            >
              Save
            </button>
          </div>
          <p className="text-[10px] text-[var(--wc-silver)]">
            Match IDs: 1-72 (group stage) · 73-104 (knockout). See tournament.json for reference.
          </p>
        </div>
      )}

      {/* Leaderboard table */}
      {leaderboard.length > 0 && totalMatches > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[var(--wc-silver)] text-xs uppercase tracking-wider border-b border-white/5">
                <th className="text-left py-2 pr-2">#</th>
                <th className="text-left py-2 px-2">Model</th>
                <th className="text-center py-2 px-2">Correct</th>
                <th className="text-center py-2 px-2">Exact</th>
                <th className="text-center py-2 px-2">Accuracy</th>
                <th className="text-center py-2 px-2">Brier</th>
                <th className="text-center py-2 px-2">Top-4 Picks</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, i) => {
                const prev = leaderboard[i - 1];
                const delta = prev ? prev.correctOutcomes - entry.correctOutcomes : 0;
                const isTop3 = i < 3;
                return (
                  <tr
                    key={entry.modelName}
                    className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors
                      ${isTop3 ? 'bg-gradient-to-r from-transparent via-white/[0.02] to-transparent' : ''}`}
                  >
                    <td className="py-3 pr-2">
                      <span className={`font-bold ${
                        entry.rank === 1 ? 'text-[var(--wc-gold)]' :
                        entry.rank === 2 ? 'text-[var(--wc-silver)]' :
                        entry.rank === 3 ? 'text-amber-700' :
                        'text-white/50'
                      }`}>
                        #{entry.rank}
                      </span>
                    </td>
                    <td className="py-3 px-2 font-semibold text-white text-xs">
                      {entry.modelName}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="font-bold text-white">
                        {entry.correctOutcomes}
                      </span>
                      <span className="text-[var(--wc-silver)] text-xs ml-1">
                        /{entry.totalEvaluated}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center text-[var(--wc-silver)] text-xs">
                      {entry.exactScores}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${entry.accuracy}%`,
                              background: entry.accuracy >= 50
                                ? 'linear-gradient(90deg, var(--wc-gold), #E6BC4A)'
                                : 'linear-gradient(90deg, var(--wc-blue), var(--wc-blue-glow))',
                            }}
                          />
                        </div>
                        <span className="text-xs font-bold text-white">{entry.accuracy}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center text-xs text-[var(--wc-silver)]">
                      {entry.brierAvg !== null ? entry.brierAvg.toFixed(4) : '—'}
                    </td>
                    <td className="py-3 px-2 text-center text-xs">
                      <span className="text-[var(--wc-gold)]">{entry.champion}</span>
                      <span className="text-[var(--wc-silver)] mx-1">·</span>
                      <span className="text-[var(--wc-silver)]">{entry.runnerUp}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-[var(--wc-silver)] text-sm">
          <div className="text-4xl mb-3">⚽</div>
          <p>No results entered yet.</p>
          <p className="text-xs mt-1">Match 1 (MEX vs RSA) is today — add the result here!</p>
        </div>
      )}

      {/* Recent results */}
      {results.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-[var(--wc-silver)] uppercase tracking-wider">
              Recent results
            </h3>
            <button
              onClick={handleClearAll}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Clear all
            </button>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {[...results].reverse().slice(0, 20).map((r) => (
              <div key={r.matchId} className="flex items-center justify-between text-xs py-1.5 px-2 rounded hover:bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <span className="text-[var(--wc-silver)] w-6">#{r.matchId}</span>
                  <span className="font-semibold">{r.homeTeam}</span>
                  <span className="text-[var(--wc-silver)]">
                    {r.homeScore}–{r.awayScore}
                  </span>
                  <span className="font-semibold">{r.awayTeam}</span>
                </div>
                <button
                  onClick={() => handleDeleteResult(r.matchId)}
                  className="text-[var(--wc-silver)] hover:text-red-400 transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
