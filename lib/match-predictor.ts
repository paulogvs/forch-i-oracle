import { calculateEnsemblePrediction } from './ensemble-engine';
import { calculateStatisticalPrediction } from './predictor-engine';

export function predictSingleMatch(
  homeTeam: string,
  awayTeam: string,
  matchId: string,
  useEnhanced: boolean = true
): any {
  if (homeTeam === 'TBD' || awayTeam === 'TBD') {
    return {
      id: matchId,
      homeTeam: homeTeam,
      awayTeam: awayTeam,
      predictedScore: null,
      confidence: null,
      homeWinPct: null,
      drawPct: null,
      awayWinPct: null,
      xG: null,
    };
  }

  let prediction;

  if (useEnhanced) {
    const ensemble = calculateEnsemblePrediction(homeTeam, awayTeam);
    prediction = {
      homeWin: ensemble.homeWin,
      draw: ensemble.draw,
      awayWin: ensemble.awayWin,
      homeGoals: ensemble.predictedScoreHome,
      awayGoals: ensemble.predictedScoreAway,
      confidence: ensemble.confidence,
      homeXG: ensemble.homeExpectedGoals,
      awayXG: ensemble.awayExpectedGoals,
      agreement: ensemble.agreement,
      uncertainty: ensemble.uncertainty,
      confidenceScore: ensemble.confidenceScore,
    };
  } else {
    const stat = calculateStatisticalPrediction(homeTeam, awayTeam);
    prediction = {
      homeWin: stat.homeWin,
      draw: stat.draw,
      awayWin: stat.awayWin,
      homeGoals: stat.predictedScoreHome,
      awayGoals: stat.predictedScoreAway,
      confidence: stat.confidence,
      homeXG: stat.homeExpectedGoals,
      awayXG: stat.awayExpectedGoals,
    };
  }

  return {
    id: matchId,
    homeTeam,
    awayTeam,
    predictedScore: [prediction.homeGoals, prediction.awayGoals],
    confidence: prediction.confidence,
    homeWinPct: prediction.homeWin,
    drawPct: prediction.draw,
    awayWinPct: prediction.awayWin,
    xG: [prediction.homeXG, prediction.awayXG],
    winner: prediction.homeGoals > prediction.awayGoals ? homeTeam :
            prediction.homeGoals < prediction.awayGoals ? awayTeam : homeTeam, // Home wins draws in knockout
    agreement: (prediction as any).agreement,
    uncertainty: (prediction as any).uncertainty,
    confidenceScore: (prediction as any).confidenceScore,
  };
}
