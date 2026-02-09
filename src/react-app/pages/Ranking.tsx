import { useApi } from '@/react-app/hooks/useApi';
import { RankingEntry, TournamentSettings } from '@/shared/types';
import Layout from '@/react-app/components/Layout';
import Card, { CardHeader, CardContent } from '@/react-app/components/Card';
import Button from '@/react-app/components/Button';
import { Trophy, Medal, Download, Loader2, DollarSign } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useChampionship } from '@/react-app/contexts/ChampionshipContext';
import ChampionshipPodiumModal from '@/react-app/components/ChampionshipPodiumModal';
import FinalTableModal from '@/react-app/components/FinalTableModal';
import { useLanguage } from '@/react-app/hooks/useLanguage';

interface RankingEntryWithRounds extends RankingEntry {
  round_results: { [key: number]: number };
}

interface RankingResponse {
  rankings: RankingEntryWithRounds[];
  final_table_prize_pool: number;
  rounds: Array<{ id: number; round_number: number }>;
}

// Calculate discarded rounds for a player
// IMPORTANT: Rounds where player didn't participate count as 0 points (worst)
function getDiscardedRounds(
  roundResults: { [key: number]: number },
  discardCount: number,
  discardAfterRound: number,
  completedRoundsCount: number,
  allRoundNumbers: number[]
): Set<number> {
  const discardedRounds = new Set<number>();

  // Only apply discards after the specified round
  if (completedRoundsCount < discardAfterRound || discardCount <= 0) {
    return discardedRounds;
  }

  // Build results for ALL rounds - missing rounds count as 0 points
  const results = allRoundNumbers.map(roundNum => ({
    round: roundNum,
    points: roundResults[roundNum] ?? 0  // Missing = 0 points
  }));

  // Sort by points ascending (worst scores first - 0s will be at the top)
  results.sort((a, b) => a.points - b.points);

  // Mark the worst N rounds as discarded
  for (let i = 0; i < Math.min(discardCount, results.length); i++) {
    discardedRounds.add(results[i].round);
  }

  return discardedRounds;
}

// Calculate points after discards
function calculatePointsWithDiscards(
  roundResults: { [key: number]: number },
  discardedRounds: Set<number>
): number {
  return Object.entries(roundResults)
    .filter(([round]) => !discardedRounds.has(parseInt(round)))
    .reduce((sum, [, points]) => sum + (points || 0), 0);
}

export default function Ranking() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { isSingleTournament, currentChampionship } = useChampionship();
  const { data, loading, error } = useApi<RankingResponse>('/api/rankings');
  const { data: settings } = useApi<TournamentSettings>('/api/tournament-settings');
  const [exporting, setExporting] = useState(false);
  const [showPodiumModal, setShowPodiumModal] = useState(false);
  const [showFinalTableModal, setShowFinalTableModal] = useState(false);

  // Redirect if single tournament - rankings not available
  useEffect(() => {
    if (isSingleTournament) {
      navigate('/live');
    }
  }, [isSingleTournament, navigate]);

  const rankings = data?.rankings || [];
  const finalTablePrizePool = data?.final_table_prize_pool || 0;
  const rounds = data?.rounds || [];

  // Check if championship completed the configured total_rounds (exclude final table)
  const totalRounds = settings?.total_rounds || 24;
  const completedRoundsCount = rounds.filter((r: unknown) => {
    const round = r as { status?: string; is_final_table?: number };
    return round.status === 'completed' && !round.is_final_table;
  }).length;
  const isChampionshipComplete = completedRoundsCount >= totalRounds && totalRounds > 0;

  // Discard settings
  const discardCount = settings?.discard_count || 0;
  const discardAfterRound = settings?.discard_after_round || 0;
  const discardsActive = discardCount > 0 && completedRoundsCount >= discardAfterRound;

  // Get all round numbers for discard calculation
  const allRoundNumbers = useMemo(() =>
    rounds.map(r => r.round_number),
    [rounds]
  );

  // Calculate discards for each player
  const rankingsWithDiscards = useMemo(() => {
    return rankings.map(entry => {
      const discardedRounds = getDiscardedRounds(
        entry.round_results,
        discardCount,
        discardAfterRound,
        completedRoundsCount,
        allRoundNumbers  // Pass all round numbers so missing rounds count as 0
      );
      const pointsWithDiscards = calculatePointsWithDiscards(
        entry.round_results,
        discardedRounds
      );
      return {
        ...entry,
        discardedRounds,
        pointsWithDiscards
      };
    }).sort((a, b) => b.pointsWithDiscards - a.pointsWithDiscards);
  }, [rankings, discardCount, discardAfterRound, completedRoundsCount, allRoundNumbers]);

  // Show podium modal when championship is completed (only once per championship)
  useEffect(() => {
    if (isChampionshipComplete && rankings.length > 0) {
      // Use championship-specific key
      const cId = currentChampionship?.id || 'default';
      const championshipKey = `podium_shown_${cId}`;
      const hasSeenPodium = sessionStorage.getItem(championshipKey);
      if (!hasSeenPodium) {
        setShowPodiumModal(true);
        sessionStorage.setItem(championshipKey, 'true');
      }
    }
  }, [isChampionshipComplete, rankings.length, currentChampionship?.id]);

  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await fetch('/api/export');
      const exportData = await response.json();

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `poker-championship-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white">{t('championshipRanking')}</h2>
            <p className="text-gray-400 mt-1">{t('trackOverallStandings')}</p>
          </div>
          <div className="flex gap-2 print:hidden">
            <Button onClick={() => window.print()} variant="secondary">
              <Download className="w-4 h-4" />
              <span>Imprimir</span>
            </Button>
            <Button onClick={handleExport} loading={exporting} variant="secondary">
              <Download className="w-4 h-4" />
              <span>{t('exportData')}</span>
            </Button>
          </div>
        </div>

        {finalTablePrizePool > 0 && (
          <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/50">
                    <DollarSign className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <div className="text-gray-300 text-sm font-medium">{t('finalTablePrize')}</div>
                    <div className="text-4xl font-bold text-white">
                      $ {finalTablePrizePool.toFixed(0)}
                    </div>
                  </div>
                </div>
                <div className="text-right text-gray-300 text-sm">
                  <div>{t('disputedByTop').replace('{count}', String(settings?.final_table_top_players || 9))}</div>
                  <div>{t('afterAllRounds')}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          {loading ? (
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </CardContent>
          ) : error ? (
            <CardContent className="py-12">
              <p className="text-center text-red-400">{t('error')}</p>
            </CardContent>
          ) : !rankings || rankings.length === 0 ? (
            <CardContent className="py-12">
              <p className="text-center text-gray-400">{t('noPlayersYet')}</p>
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              {discardsActive && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-2 mb-4 text-yellow-400 text-sm">
                  {t('discardActive').replace('{count}', String(discardCount)).replace('{round}', String(discardAfterRound))}
                </div>
              )}
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">{t('position')}</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">{t('player')}</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">{t('accumulatedPrize')}</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">{t('entries')}</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">{t('points')}</th>
                    {discardsActive && (
                      <th className="px-6 py-4 text-center text-sm font-semibold text-yellow-400 bg-yellow-500/10">{t('withDiscard')}</th>
                    )}
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">{t('rounds_played')}</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">{t('bestPosition')}</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">{t('average')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingsWithDiscards.map((entry, index) => {
                    const position = index + 1;
                    const iconColor = position === 1 ? 'text-yellow-400' : position === 2 ? 'text-gray-300' : position === 3 ? 'text-orange-400' : '';

                    return (
                      <tr key={entry.player_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            {position <= 3 ? (
                              position === 1 ? (
                                <Trophy className={`w-5 h-5 ${iconColor}`} />
                              ) : (
                                <Medal className={`w-5 h-5 ${iconColor}`} />
                              )
                            ) : (
                              <span className="text-gray-400 font-semibold">{position}º</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-white font-medium">{entry.player_name}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-green-400 font-bold">$ {(entry.total_prize || 0).toFixed(0)}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-red-400">{(entry.total_entries || 0).toFixed(0)}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-purple-400 font-bold text-lg">{entry.total_points}</span>
                        </td>
                        {discardsActive && (
                          <td className="px-6 py-4 text-center bg-yellow-500/10">
                            <span className="text-yellow-400 font-bold text-lg">{entry.pointsWithDiscards}</span>
                          </td>
                        )}
                        <td className="px-6 py-4 text-center">
                          <span className="text-gray-300">{entry.rounds_played}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-gray-300">
                            {entry.best_position ? `${entry.best_position}º` : '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-gray-300">
                            {entry.average_position ? entry.average_position.toFixed(1) : '-'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {rounds.length > 0 && rankings.length > 0 && (
          <Card className="print-page-break">
            <CardHeader>
              <h3 className="text-xl font-semibold text-white">{t('scoreByRound')}</h3>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-max">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300 sticky left-0 bg-slate-900/95 z-10">{t('player')}</th>
                      {rounds.map((round) => (
                        <th key={round.id} className="px-4 py-3 text-center text-sm font-semibold text-gray-300 min-w-[80px]">
                          R{round.round_number}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-center text-sm font-semibold text-purple-400 min-w-[100px]">{t('total')}</th>
                      {discardsActive && (
                        <th className="px-4 py-3 text-center text-sm font-semibold text-yellow-400 bg-yellow-500/10 min-w-[100px]">{t('withDiscard')}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {rankingsWithDiscards.map((entry) => (
                      <tr key={entry.player_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 text-white font-medium sticky left-0 bg-slate-900/95 z-10">
                          {entry.player_name}
                        </td>
                        {rounds.map((round) => {
                          const points = entry.round_results[round.round_number];
                          const isDiscarded = discardsActive && entry.discardedRounds.has(round.round_number);
                          return (
                            <td
                              key={round.id}
                              className={`px-4 py-3 text-center ${isDiscarded ? 'bg-yellow-500/20' : ''}`}
                            >
                              {points !== undefined ? (
                                <span className={isDiscarded ? 'text-yellow-400 line-through opacity-70' : 'text-gray-300'}>
                                  {points}
                                </span>
                              ) : (
                                <span className="text-gray-600">-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-center">
                          <span className="text-purple-400 font-bold text-lg">{entry.total_points}</span>
                        </td>
                        {discardsActive && (
                          <td className="px-4 py-3 text-center bg-yellow-500/10">
                            <span className="text-yellow-400 font-bold text-lg">{entry.pointsWithDiscards}</span>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <ChampionshipPodiumModal
          isOpen={showPodiumModal}
          onClose={() => setShowPodiumModal(false)}
          topPlayers={rankings.slice(0, 3)}
          onViewFinalTable={() => {
            setShowPodiumModal(false);
            setShowFinalTableModal(true);
          }}
        />

        <FinalTableModal
          isOpen={showFinalTableModal}
          onClose={() => setShowFinalTableModal(false)}
          rankings={rankings}
          prizePool={finalTablePrizePool}
          topPlayersCount={settings?.final_table_top_players || 9}
        />
      </div>
    </Layout>
  );
}
