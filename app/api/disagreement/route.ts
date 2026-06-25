// FORCH.i ORACLE — API Route: Model Disagreement Analysis
// Returns how much the 4 ensemble models disagree on each match.
// Higher disagreement = more uncertain match = lower confidence.

import { NextRequest, NextResponse } from 'next/server';
import { ALL_MATCHES } from '@/lib/matches';
import { getDataLayerAsync } from '@/lib/data-layer';
import { calculateEnsemblePrediction } from '@/lib/ensemble-engine';
import { getDisagreementLevel, interpretEntropy } from '@/lib/disagreement';

export async function GET(request: NextRequest) {
  try {
    const db = await getDataLayerAsync();
    const url = new URL(request.url);
    const matchId = url.searchParams.get('matchId');
    const homeTeam = url.searchParams.get('homeTeam');
    const awayTeam = url.searchParams.get('awayTeam');
    const minDisagreement = parseFloat(url.searchParams.get('minDisagreement') || '0');

    // If specific match is requested
    if (matchId) {
      // Try DB first
      const dbPred = await db.getPrediction(matchId);
      if (dbPred?.agreement && dbPred?.uncertainty) {
        return NextResponse.json({
          success: true,
          matchId,
          fromCache: true,
          agreement: dbPred.agreement,
          uncertainty: dbPred.uncertainty,
          models: dbPred.models,
          confidenceScore: dbPred.confidenceScore,
          interpretation: {
            disagreement: getDisagreementLevel(dbPred.agreement.agreementScore),
            entropy: interpretEntropy(dbPred.uncertainty.entropy),
          },
        });
      }

      // Compute fresh
      const match = ALL_MATCHES.find(m => m.id === matchId);
      if (!match) {
        return NextResponse.json(
          { success: false, error: 'Match not found' },
          { status: 404 }
        );
      }

      // Use homeTeam/awayTeam from match or params
      const hTeam = homeTeam || match.homeTeam;
      const aTeam = awayTeam || match.awayTeam;

      if (hTeam === 'TBD' || aTeam === 'TBD') {
        return NextResponse.json({
          success: true,
          matchId,
          message: 'Teams not yet determined',
          agreement: null,
          uncertainty: null,
        });
      }

      const ensemble = calculateEnsemblePrediction(hTeam, aTeam);

      return NextResponse.json({
        success: true,
        matchId,
        fromCache: false,
        agreement: ensemble.agreement,
        uncertainty: ensemble.uncertainty,
        models: {
          dixonColes: { homeWin: ensemble.models.dixonColes.homeWin, draw: ensemble.models.dixonColes.draw, awayWin: ensemble.models.dixonColes.awayWin },
          eloPoisson: { homeWin: ensemble.models.eloPoisson.homeWin, draw: ensemble.models.eloPoisson.draw, awayWin: ensemble.models.eloPoisson.awayWin },
          bayesian: { homeWin: ensemble.models.dynamic.homeWinPct, draw: ensemble.models.dynamic.drawPct, awayWin: ensemble.models.dynamic.awayWinPct },
          purePoisson: ensemble.models.purePoisson,
        },
        confidenceScore: ensemble.confidenceScore,
        interpretation: {
          disagreement: getDisagreementLevel(ensemble.agreement.agreementScore),
          entropy: interpretEntropy(ensemble.uncertainty.entropy),
        },
      });
    }

    // Return all matches with disagreement data
    const allMatchIds = ALL_MATCHES.map(m => m.id);
    const dbPredictions = await db.getPredictionsForMatches(allMatchIds);

    const results: any[] = [];
    for (const pred of dbPredictions) {
      if (!pred.agreement || !pred.uncertainty) continue;
      if (pred.agreement.agreementScore < (1 - minDisagreement)) continue;

      const match = ALL_MATCHES.find(m => m.id === pred.matchId);
      results.push({
        matchId: pred.matchId,
        homeTeam: match?.homeTeam || 'Unknown',
        awayTeam: match?.awayTeam || 'Unknown',
        round: match?.round || 'group',
        agreement: pred.agreement,
        uncertainty: pred.uncertainty,
        confidenceScore: pred.confidenceScore,
        interpretation: {
          disagreement: getDisagreementLevel(pred.agreement.agreementScore),
          entropy: interpretEntropy(pred.uncertainty.entropy),
        },
      });
    }

    // Sort by disagreement (most disagreed first)
    results.sort((a, b) => a.agreement.agreementScore - b.agreement.agreementScore);

    return NextResponse.json({
      success: true,
      total: results.length,
      results,
    });
  } catch (error) {
    console.error('[disagreement] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to compute disagreement' },
      { status: 500 }
    );
  }
}
