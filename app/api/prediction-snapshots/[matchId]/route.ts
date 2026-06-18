import { NextResponse } from 'next/server';
import { getMatchDriftHistory } from '@/lib/prediction-history';

export async function GET(
  _request: Request,
  { params }: { params: { matchId: string } }
) {
  try {
    const { matchId } = params;
    const snapshots = await getMatchDriftHistory(matchId);
    return NextResponse.json(snapshots);
  } catch (error) {
    return NextResponse.json([], { status: 500 });
  }
}