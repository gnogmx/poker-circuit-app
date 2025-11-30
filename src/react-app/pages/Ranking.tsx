import { useApi } from '@/react-app/hooks/useApi';
import { RankingEntry } from '@/shared/types';
import Layout from '@/react-app/components/Layout';
import Card, { CardHeader, CardContent } from '@/react-app/components/Card';
import Button from '@/react-app/components/Button';
import { Trophy, Medal, Download, Loader2, DollarSign } from 'lucide-react';
import { useState } from 'react';

interface RankingEntryWithRounds extends RankingEntry {
  round_results: { [key: number]: number };
}

interface RankingResponse {
  rankings: RankingEntryWithRounds[];
  final_table_prize_pool: number;
  rounds: Array<{ id: number; round_number: number }>;
}

export default function Ranking() {
  const { data, loading, error } = useApi<RankingResponse>('/api/rankings');
  const [exporting, setExporting] = useState(false);

  const rankings = data?.rankings || [];
  const finalTablePrizePool = data?.final_table_prize_pool || 0;
  const rounds = data?.rounds || [];

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
            <h2 className="text-3xl font-bold text-white">Ranking do Campeonato</h2>
            <p className="text-gray-400 mt-1">Acompanhe a classificação geral dos jogadores</p>
          </div>
          <Button onClick={handleExport} loading={exporting} variant="secondary">
            <Download className="w-4 h-4" />
            <span>Exportar Dados</span>
          </Button>
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
                    <div className="text-gray-300 text-sm font-medium">Prêmio Acumulado Mesa Final</div>
                    <div className="text-4xl font-bold text-white">
                      $ {finalTablePrizePool.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="text-right text-gray-300 text-sm">
                  <div>Disputado pelos 9 melhores</div>
                  <div>após todas as rodadas</div>
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
              <p className="text-center text-red-400">Erro ao carregar ranking</p>
            </CardContent>
          ) : !rankings || rankings.length === 0 ? (
            <CardContent className="py-12">
              <p className="text-center text-gray-400">Nenhum jogador ainda</p>
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Posição</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Jogador</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Prêmio Acumulado</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Entradas</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Pontos</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Rodadas</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Melhor</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Média</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((entry, index) => {
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
                          <span className="text-green-400 font-bold">$ {(entry.total_prize || 0).toFixed(2)}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-red-400">$ {(entry.total_entries || 0).toFixed(2)}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-purple-400 font-bold text-lg">{entry.total_points}</span>
                        </td>
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
          <Card>
            <CardHeader>
              <h3 className="text-xl font-semibold text-white">Pontuação por Rodada</h3>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-max">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300 sticky left-0 bg-slate-900/95 z-10">Jogador</th>
                      {rounds.map((round) => (
                        <th key={round.id} className="px-4 py-3 text-center text-sm font-semibold text-gray-300 min-w-[80px]">
                          R{round.round_number}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-center text-sm font-semibold text-purple-400 min-w-[100px]">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.map((entry) => (
                      <tr key={entry.player_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 text-white font-medium sticky left-0 bg-slate-900/95 z-10">
                          {entry.player_name}
                        </td>
                        {rounds.map((round) => {
                          const points = entry.round_results[round.round_number];
                          return (
                            <td key={round.id} className="px-4 py-3 text-center">
                              {points !== undefined ? (
                                <span className="text-gray-300">{points}</span>
                              ) : (
                                <span className="text-gray-600">-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-center">
                          <span className="text-purple-400 font-bold text-lg">{entry.total_points}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
