import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import PlayersList from '@/react-app/components/PlayersList';
import { useApi, apiRequest } from '@/react-app/hooks/useApi';
import { useChampionship } from '@/react-app/contexts/ChampionshipContext';
import { ScoringRule, TournamentSettings, RoundSchedule } from '@/shared/types';
import Layout from '@/react-app/components/Layout';
import Card, { CardHeader, CardContent } from '@/react-app/components/Card';
import Button from '@/react-app/components/Button';
import Input from '@/react-app/components/Input';
import { Save, Plus, Loader2, Clock, Coins, Coffee, Trophy, DollarSign, Users, RotateCcw, Copy, X } from 'lucide-react';

import ConfirmationModal from '@/react-app/components/ConfirmationModal';

export default function Settings() {
  const navigate = useNavigate();
  const { data: rules, loading: loadingRules, error: rulesError, refresh: refreshRules } = useApi<ScoringRule[]>('/api/scoring-rules');
  const { data: tournamentSettings, loading: loadingSettings, error: settingsError, refresh: refreshSettings } = useApi<TournamentSettings>('/api/tournament-settings');
  const { data: schedules, refresh: refreshSchedules } = useApi<RoundSchedule[]>('/api/schedules');
  const { data: rounds } = useApi<{ id: number; status: string; is_final_table?: boolean }[]>('/api/rounds');
  const { isAdmin, isSingleTournament, currentChampionship } = useChampionship();

  // Redirect if single tournament - settings not available
  useEffect(() => {
    if (isSingleTournament) {
      navigate('/live');
    }
  }, [isSingleTournament, navigate]);

  const [editingRules, setEditingRules] = useState<{ position: number; points: number }[]>([]);
  const [hasRulesChanges, setHasRulesChanges] = useState(false);
  const [submittingRules, setSubmittingRules] = useState(false);

  const [blindDuration, setBlindDuration] = useState<number>(15);
  const [blindLevels, setBlindLevels] = useState<string>('');
  const [defaultBuyIn, setDefaultBuyIn] = useState<number>(600);
  const [finalTablePercentage, setFinalTablePercentage] = useState<number>(33.33);
  const [finalTableFixedValue, setFinalTableFixedValue] = useState<number>(0);
  const [finalTableType, setFinalTableType] = useState<'percentage' | 'fixed'>('percentage');
  const [totalRounds, setTotalRounds] = useState<number>(24);
  const [prizeDistribution, setPrizeDistribution] = useState<number[]>([]);
  const [finalTableTopPlayers, setFinalTableTopPlayers] = useState<number>(9);
  const [finalTable1stPercentage, setFinalTable1stPercentage] = useState<number>(40);
  const [finalTable2ndPercentage, setFinalTable2ndPercentage] = useState<number>(25);
  const [finalTable3rdPercentage, setFinalTable3rdPercentage] = useState<number>(20);
  const [finalTable4thPercentage, setFinalTable4thPercentage] = useState<number>(10);
  const [finalTable5thPercentage, setFinalTable5thPercentage] = useState<number>(5);
  const [rulesText, setRulesText] = useState<string>('');
  const [scheduleDate, setScheduleDate] = useState<string>('');
  const [scheduleNotes, setScheduleNotes] = useState<string>('');
  const [finalTableDate, setFinalTableDate] = useState<string>('');
  const [hasSettingsChanges, setHasSettingsChanges] = useState(false);
  const [submittingSettings, setSubmittingSettings] = useState(false);

  // Load rules when they arrive from API
  useEffect(() => {
    if (rules && editingRules.length === 0) {
      setEditingRules(rules.map((r) => ({ position: r.position, points: r.points })));
    }
  }, [rules, editingRules.length]);

  // Load settings when they arrive from API
  useEffect(() => {
    if (tournamentSettings) {
      setBlindDuration(tournamentSettings.blind_level_duration);
      setBlindLevels(tournamentSettings.blind_levels);
      setDefaultBuyIn(tournamentSettings.default_buy_in || 600);
      setFinalTablePercentage(tournamentSettings.final_table_percentage || 33.33);
      setFinalTableFixedValue(tournamentSettings.final_table_fixed_value || 0);
      setFinalTableType(tournamentSettings.final_table_fixed_value && tournamentSettings.final_table_fixed_value > 0 ? 'fixed' : 'percentage');
      setTotalRounds(tournamentSettings.total_rounds || 24);

      // Load prize distribution
      if (tournamentSettings.prize_distribution) {
        if (Array.isArray(tournamentSettings.prize_distribution)) {
          setPrizeDistribution(tournamentSettings.prize_distribution);
        } else if (typeof tournamentSettings.prize_distribution === 'string') {
          try {
            setPrizeDistribution(JSON.parse(tournamentSettings.prize_distribution));
          } catch {
            setPrizeDistribution([]);
          }
        }
      } else {
        // Fallback to individual columns if no JSON
        const p1 = tournamentSettings.first_place_percentage || 0;
        const p2 = tournamentSettings.second_place_percentage || 0;
        const p3 = tournamentSettings.third_place_percentage || 0;
        const p4 = tournamentSettings.fourth_place_percentage || 0;
        const p5 = tournamentSettings.fifth_place_percentage || 0;
        if (p1 + p2 + p3 + p4 + p5 > 0) {
          setPrizeDistribution([p1, p2, p3, p4, p5].filter(p => p > 0));
        } else {
          setPrizeDistribution([60, 30, 10]);
        }
      }

      setFinalTableTopPlayers(tournamentSettings.final_table_top_players || 9);
      setFinalTable1stPercentage(tournamentSettings.final_table_1st_percentage || 40);
      setFinalTable2ndPercentage(tournamentSettings.final_table_2nd_percentage || 25);
      setFinalTable3rdPercentage(tournamentSettings.final_table_3rd_percentage || 20);
      setFinalTable4thPercentage(tournamentSettings.final_table_4th_percentage || 10);
      setFinalTable5thPercentage(tournamentSettings.final_table_5th_percentage || 5);
      setRulesText(tournamentSettings.rules_text || '');
      setFinalTableDate(tournamentSettings.final_table_date || '');
    }
  }, [tournamentSettings]);

  const handlePointsChange = (index: number, points: string) => {
    const newRules = [...editingRules];
    newRules[index].points = parseInt(points) || 0;
    setEditingRules(newRules);
    setHasRulesChanges(true);
  };

  const handleAddPosition = () => {
    const nextPosition = editingRules.length + 1;
    setEditingRules([...editingRules, { position: nextPosition, points: 0 }]);
    setHasRulesChanges(true);
  };

  const handleRestoreDefaults = () => {
    const defaultRules = [
      { position: 1, points: 150 },
      { position: 2, points: 125 },
      { position: 3, points: 105 },
      { position: 4, points: 90 },
      { position: 5, points: 80 },
      { position: 6, points: 60 },
      { position: 7, points: 40 },
      { position: 8, points: 35 },
      { position: 9, points: 24 },
      { position: 10, points: 15 },
      { position: 11, points: 5 },
      { position: 12, points: 5 }
    ];
    setEditingRules(defaultRules);
    setHasRulesChanges(true);
  };

  const handleSaveRules = async () => {
    try {
      setSubmittingRules(true);

      for (const rule of editingRules) {
        await apiRequest(`/api/scoring-rules/${rule.position}`, {
          method: 'PUT',
          body: JSON.stringify(rule),
        });
      }

      setHasRulesChanges(false);
      refreshRules();
    } catch (err) {
      console.error('Failed to save scoring rules:', err);
    } finally {
      setSubmittingRules(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSubmittingSettings(true);

      await apiRequest('/api/tournament-settings', {
        method: 'PUT',
        body: JSON.stringify({
          blind_level_duration: blindDuration,
          blind_levels: blindLevels,
          default_buy_in: defaultBuyIn,
          final_table_percentage: finalTableType === 'percentage' ? finalTablePercentage : 0,
          final_table_fixed_value: finalTableType === 'fixed' ? finalTableFixedValue : 0,
          total_rounds: totalRounds,
          prize_distribution: prizeDistribution,
          final_table_top_players: finalTableTopPlayers,
          final_table_1st_percentage: finalTable1stPercentage,
          final_table_2nd_percentage: finalTable2ndPercentage,
          final_table_3rd_percentage: finalTable3rdPercentage,
          final_table_4th_percentage: finalTable4thPercentage,
          final_table_5th_percentage: finalTable5thPercentage,
          rules_text: rulesText,
          final_table_date: finalTableDate,
        }),
      });

      setHasSettingsChanges(false);
      refreshSettings();
    } catch (err) {
      console.error('Failed to save tournament settings:', err);
    } finally {
      setSubmittingSettings(false);
    }
  };

  const handleAddSchedule = async () => {
    if (!scheduleDate) {
      alert('Por favor, preencha a data.');
      return;
    }

    // Validate date format (dd/mm)
    const datePattern = /^\d{1,2}\/\d{1,2}$/;
    if (!datePattern.test(scheduleDate)) {
      alert('Formato de data inválido. Use: dia/mês (ex: 15/12)');
      return;
    }

    // Check if we've reached the maximum number of schedules (total_rounds + 1 for final table)
    const maxSchedules = totalRounds + 1;
    const currentScheduleCount = schedules?.length || 0;

    if (currentScheduleCount >= maxSchedules) {
      alert(`Limite de agendamentos atingido! Máximo: ${totalRounds} rodadas regulares + 1 mesa final = ${maxSchedules} total.`);
      return;
    }

    try {
      // Calculate next round number
      const nextRoundNumber = (schedules?.length || 0) + 1;

      // Validate chronological order
      if (schedules && schedules.length > 0) {
        const lastSchedule = schedules[schedules.length - 1];
        const lastDate = lastSchedule.scheduled_date;

        // Parse dates (dd/mm format)
        const [newDay, newMonth] = scheduleDate.split('/').map(Number);
        const [lastDay, lastMonth] = lastDate.split('/').map(Number);

        // Compare dates (assuming same year or next year if month wraps)
        const isChronological =
          newMonth > lastMonth ||
          (newMonth === lastMonth && newDay >= lastDay) ||
          (newMonth < lastMonth && newMonth <= 2 && lastMonth >= 11); // Year wrap (Nov/Dec -> Jan/Feb)

        if (!isChronological) {
          alert(`Data inválida! A Rodada ${nextRoundNumber} (${scheduleDate}) não pode ser anterior à Rodada ${lastSchedule.round_number} (${lastDate}).`);
          return;
        }
      }

      await apiRequest('/api/schedules', {
        method: 'POST',
        body: JSON.stringify({
          round_number: nextRoundNumber,
          scheduled_date: scheduleDate,
          notes: scheduleNotes,
        }),
      });

      // Reset form
      setScheduleDate('');
      setScheduleNotes('');

      // Refresh list
      refreshSchedules();

      alert(`Rodada ${nextRoundNumber} adicionada com sucesso!`);
    } catch (err) {
      console.error('Failed to add schedule:', err);
      alert('Erro ao adicionar data. Tente novamente.');
    }
  };

  const handleDeleteSchedule = async (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remover Data',
      message: 'Tem certeza que deseja remover esta data?',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await apiRequest(`/api/schedules/${id}`, {
            method: 'DELETE',
          });
          refreshSchedules();
        } catch (err) {
          console.error('Failed to delete schedule:', err);
          alert('Erro ao remover data.');
        }
      }
    });
  };

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  const handleGenerateFinalTableRequest = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Gerar Mesa Final',
      message: 'Tem certeza que deseja gerar a Mesa Final? Esta ação criará uma nova rodada com os jogadores classificados.',
      onConfirm: handleGenerateFinalTable
    });
  };

  const handleGenerateFinalTable = async () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    try {
      const response = await apiRequest('/api/final-table/generate', {
        method: 'POST',
      });
      // ... existing logic ...


      alert(`Mesa Final criada com sucesso! ${response.player_count} jogadores adicionados.`);

      // Redirect to rounds page
      window.location.href = '/rounds';
    } catch (err: unknown) {
      console.error('Failed to generate final table:', err);
      const errorMsg = (err instanceof Error && err.message) || 'Erro ao gerar mesa final. Verifique o console do navegador para mais detalhes.';
      alert(errorMsg);
    }
  };

  const isBreakLevel = (level: string) => {
    return level.toUpperCase().includes('BREAK') || level.toUpperCase().includes('INTERVALO');
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-white">Configurações</h2>
          <p className="text-gray-400 mt-1">Configure o campeonato e as regras de pontuação</p>
        </div>

        {/* Championship Code Card */}
        {currentChampionship?.code && (
          <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">Código de Acesso</h3>
                  </div>
                  <p className="text-gray-400 text-sm mb-3">
                    Compartilhe este código com os jogadores para que possam participar
                  </p>
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 bg-black/30 rounded-lg px-4 py-3 border border-blue-500/30">
                      <code className="text-2xl font-mono font-bold text-blue-300 tracking-widest">
                        {currentChampionship.code}
                      </code>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        navigator.clipboard.writeText(currentChampionship.code);
                        alert('Código copiado!');
                      }}
                      className="bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/50"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Copiar</span>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <DollarSign className="w-6 h-6 text-green-400" />
                <h3 className="text-xl font-semibold text-white">Configurações de Premiação</h3>
              </div>
              {isAdmin && (
                <Button onClick={handleSaveSettings} loading={submittingSettings} disabled={!hasSettingsChanges}>
                  <Save className="w-4 h-4" />
                  <span>Salvar</span>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingSettings ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
              </div>
            ) : settingsError ? (
              <p className="text-center text-red-400 py-12">Erro ao carregar configurações</p>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Buy-in Padrão ($)"
                    type="number"
                    step="1"
                    value={defaultBuyIn || ''}
                    onChange={(e) => {
                      setDefaultBuyIn(parseFloat(e.target.value) || 0);
                      setHasSettingsChanges(true);
                    }}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Tipo de Valor para Mesa Final
                    </label>
                    <div className="flex space-x-4 mb-3">
                      <label className={`flex items-center space-x-2 ${isAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                        <input
                          type="radio"
                          checked={finalTableType === 'percentage'}
                          onChange={() => {
                            setFinalTableType('percentage');
                            setHasSettingsChanges(true);
                          }}
                          className="text-purple-500 focus:ring-purple-500"
                          disabled={!isAdmin}
                        />
                        <span className="text-gray-300">Porcentagem (%)</span>
                      </label>
                      <label className={`flex items-center space-x-2 ${isAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                        <input
                          type="radio"
                          checked={finalTableType === 'fixed'}
                          onChange={() => {
                            setFinalTableType('fixed');
                            setHasSettingsChanges(true);
                          }}
                          className="text-purple-500 focus:ring-purple-500"
                          disabled={!isAdmin}
                        />
                        <span className="text-gray-300">Valor Fixo ($)</span>
                      </label>
                    </div>

                    {finalTableType === 'percentage' ? (
                      <Input
                        label="% para Mesa Final"
                        type="number"
                        step="1"
                        value={finalTablePercentage || ''}
                        onChange={(e) => {
                          setFinalTablePercentage(parseFloat(e.target.value) || 0);
                          setHasSettingsChanges(true);
                        }}
                        disabled={!isAdmin}
                      />
                    ) : (
                      <Input
                        label="Valor Fixo para Mesa Final ($)"
                        type="number"
                        step="1"
                        value={finalTableFixedValue || ''}
                        onChange={(e) => {
                          setFinalTableFixedValue(parseFloat(e.target.value) || 0);
                          setHasSettingsChanges(true);
                        }}
                        disabled={!isAdmin}
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Total de Rodadas no Campeonato"
                    type="number"
                    min="1"
                    value={totalRounds || ''}
                    onChange={(e) => {
                      setTotalRounds(parseInt(e.target.value) || 0);
                      setHasSettingsChanges(true);
                    }}
                    disabled={!isAdmin}
                  />
                  <Input
                    label="Top Jogadores para Mesa Final"
                    type="number"
                    min="1"
                    value={finalTableTopPlayers || ''}
                    onChange={(e) => {
                      setFinalTableTopPlayers(parseInt(e.target.value) || 0);
                      setHasSettingsChanges(true);
                    }}
                    disabled={!isAdmin}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-300">
                      Distribuição de Prêmios por Rodada (%)
                    </label>
                    {isAdmin && (
                      <div className="flex space-x-2">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            if (prizeDistribution.length > 0) {
                              const newDist = prizeDistribution.slice(0, -1);
                              setPrizeDistribution(newDist);
                              setHasSettingsChanges(true);
                            }
                          }}
                          className="text-xs px-2 py-1 h-auto bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                          title="Remover última posição"
                          disabled={prizeDistribution.length === 0}
                        >
                          <X className="w-3 h-3 mr-1" />
                          Remover
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setPrizeDistribution([...prizeDistribution, 0]);
                            setHasSettingsChanges(true);
                          }}
                          className="text-xs px-2 py-1 h-auto"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Adicionar
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-5 gap-3">
                    {prizeDistribution.map((percentage, index) => (
                      <div key={index}>
                        <Input
                          label={`${index + 1}º`}
                          type="number"
                          step="0.01"
                          value={percentage}
                          onChange={(e) => {
                            const newDist = [...prizeDistribution];
                            newDist[index] = parseFloat(e.target.value) || 0;
                            setPrizeDistribution(newDist);
                            setHasSettingsChanges(true);
                          }}
                          disabled={!isAdmin}
                          className="mb-0"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10 flex justify-between items-center">
                    <span className="text-sm text-gray-300">Total Distribuído:</span>
                    <span className={`text-lg font-bold ${Math.abs(prizeDistribution.reduce((a, b) => a + b, 0) - 100) < 0.1 ? 'text-green-400' : 'text-red-400'}`}>
                      {prizeDistribution.reduce((a, b) => a + b, 0).toFixed(2)}%
                    </span>
                  </div>
                  {Math.abs(prizeDistribution.reduce((a, b) => a + b, 0) - 100) >= 0.1 && (
                    <p className="text-red-400 text-xs mt-1">
                      A soma das porcentagens deve ser exatamente 100%.
                    </p>
                  )}
                  <p className="text-gray-500 text-xs mt-2">
                    O valor líquido (após descontar a Mesa Final) será dividido conforme estas porcentagens.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Premiação da Mesa Final (%)
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    <Input
                      label="1º"
                      type="number"
                      step="1"
                      value={finalTable1stPercentage || ''}
                      onChange={(e) => {
                        setFinalTable1stPercentage(parseFloat(e.target.value) || 0);
                        setHasSettingsChanges(true);
                      }}
                      disabled={!isAdmin}
                    />
                    <Input
                      label="2º"
                      type="number"
                      step="1"
                      value={finalTable2ndPercentage || ''}
                      onChange={(e) => {
                        setFinalTable2ndPercentage(parseFloat(e.target.value) || 0);
                        setHasSettingsChanges(true);
                      }}
                      disabled={!isAdmin}
                    />
                    <Input
                      label="3º"
                      type="number"
                      step="1"
                      value={finalTable3rdPercentage || ''}
                      onChange={(e) => {
                        setFinalTable3rdPercentage(parseFloat(e.target.value) || 0);
                        setHasSettingsChanges(true);
                      }}
                      disabled={!isAdmin}
                    />
                    <Input
                      label="4º"
                      type="number"
                      step="1"
                      value={finalTable4thPercentage || ''}
                      onChange={(e) => {
                        setFinalTable4thPercentage(parseFloat(e.target.value) || 0);
                        setHasSettingsChanges(true);
                      }}
                      disabled={!isAdmin}
                    />
                    <Input
                      label="5º"
                      type="number"
                      step="1"
                      value={finalTable5thPercentage || ''}
                      onChange={(e) => {
                        setFinalTable5thPercentage(parseFloat(e.target.value) || 0);
                        setHasSettingsChanges(true);
                      }}
                      disabled={!isAdmin}
                    />
                  </div>
                  <p className="text-gray-400 text-sm mt-2">
                    Total: {(finalTable1stPercentage + finalTable2ndPercentage + finalTable3rdPercentage + finalTable4thPercentage + finalTable5thPercentage).toFixed(2)}%
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <Coffee className="w-5 h-5 text-purple-400" />
              Regulamento do Torneio
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Texto do Regulamento
                </label>
                <textarea
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed min-h-[200px]"
                  value={rulesText}
                  onChange={(e) => {
                    setRulesText(e.target.value);
                    setHasSettingsChanges(true);
                  }}
                  placeholder="Digite aqui o regulamento do torneio..."
                  disabled={!isAdmin}
                />
                <p className="text-gray-400 text-sm mt-2">
                  Este regulamento estará disponível para consulta de todos os participantes.
                </p>
              </div>

              {isAdmin && (
                <div className="flex justify-end">
                  <Button onClick={handleSaveSettings} loading={submittingSettings} disabled={!hasSettingsChanges}>
                    <Save className="w-4 h-4" />
                    <span>Salvar Configurações</span>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-400" />
              Calendário de Rodadas
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-400 text-sm">
                Registre as datas programadas para as rodadas futuras do campeonato.
              </p>

              {isAdmin && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <h4 className="text-white font-semibold mb-2">
                    Adicionar Rodada {(schedules?.length || 0) + 1}
                  </h4>
                  <div className="grid grid-cols-[1fr_1.5fr_auto] gap-2 items-end">
                    <Input
                      label="Data (dia/mês)"
                      type="text"
                      placeholder="Ex: 15/12"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                    />
                    <Input
                      label="Observações (opcional)"
                      placeholder="Ex: Final de ano"
                      value={scheduleNotes}
                      onChange={(e) => setScheduleNotes(e.target.value)}
                    />
                    <Button variant="secondary" onClick={handleAddSchedule} className="mb-0">
                      <Plus className="w-4 h-4" />
                      <span>Adicionar</span>
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-white font-semibold mb-3">Rodadas Programadas</h4>
                {!schedules || schedules.length === 0 ? (
                  <div className="text-gray-400 text-sm text-center py-8">
                    Nenhuma rodada programada ainda.
                  </div>
                ) : (
                  <div className="grid grid-cols-7 gap-1">
                    {schedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="bg-white/5 border border-white/10 rounded p-1 relative"
                      >
                        <div className="text-purple-400 font-bold text-sm mb-0.5">R{schedule.round_number}</div>
                        <div className="text-white text-sm leading-tight">
                          {schedule.scheduled_date}
                          {schedule.notes && (
                            <span className="font-semibold ml-1">• {schedule.notes}</span>
                          )}
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            className="absolute top-0 right-0 text-red-400 hover:text-red-300 transition-colors text-xs w-3 h-3 flex items-center justify-center"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Mesa Final Section */}
              <div className="mt-6 pt-6 border-t border-white/20">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  Mesa Final
                </h4>

                <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                    <Input
                      label="Data da Mesa Final"
                      type="text"
                      placeholder="Ex: 20/12"
                      value={finalTableDate}
                      onChange={(e) => {
                        setFinalTableDate(e.target.value);
                        setHasSettingsChanges(true);
                      }}
                      disabled={!isAdmin || (rounds?.filter(r => r.status === 'completed' && !r.is_final_table).length || 0) < (tournamentSettings?.total_rounds || 24)}
                    />
                    {isAdmin && (
                      <div className="flex flex-col items-end">
                        <Button
                          variant="primary"
                          onClick={handleGenerateFinalTableRequest}
                          className={`bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 ${(rounds?.filter(r => r.status === 'completed' && !r.is_final_table).length || 0) < (tournamentSettings?.total_rounds || 24)
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                            }`}
                          disabled={(rounds?.filter(r => r.status === 'completed' && !r.is_final_table).length || 0) < (tournamentSettings?.total_rounds || 24)}
                          title={(rounds?.filter(r => r.status === 'completed' && !r.is_final_table).length || 0) < (tournamentSettings?.total_rounds || 24)
                            ? `Ainda existem rodadas pendentes. Complete todas as ${tournamentSettings?.total_rounds || 24} rodadas.`
                            : 'Gerar Mesa Final'}
                        >
                          <Trophy className="w-4 h-4" />
                          <span>Gerar Mesa Final</span>
                        </Button>
                        {(rounds?.filter(r => r.status === 'completed' && !r.is_final_table).length || 0) < (tournamentSettings?.total_rounds || 24) && (
                          <span className="text-red-400 text-xs mt-1">
                            Complete todas as rodadas primeiro
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-yellow-200 text-xs mt-2">
                    Gera automaticamente uma rodada especial com os {tournamentSettings?.final_table_top_players || 9} melhores jogadores do ranking.
                  </p>
                </div>
              </div>
            </div>

          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Clock className="w-6 h-6 text-purple-400" />
                <h3 className="text-xl font-semibold text-white">Estrutura do Torneio</h3>
              </div>
              {isAdmin && (
                <Button onClick={handleSaveSettings} loading={submittingSettings} disabled={!hasSettingsChanges}>
                  <Save className="w-4 h-4" />
                  <span>Salvar</span>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingSettings ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
              </div>
            ) : settingsError ? (
              <p className="text-center text-red-400 py-12">Erro ao carregar configurações</p>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Duração dos Níveis de Blinds
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[10, 15, 20].map((duration) => (
                      <button
                        key={duration}
                        type="button"
                        onClick={() => {
                          setBlindDuration(duration);
                          setHasSettingsChanges(true);
                        }}
                        disabled={!isAdmin}
                        className={`p-4 rounded-lg border transition-all ${blindDuration === duration
                          ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                          } ${!isAdmin ? 'cursor-not-allowed opacity-60' : ''}`}
                      >
                        <div className="font-semibold text-lg">{duration} min</div>
                        <div className="text-xs mt-1">por nível</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Níveis de Blinds
                  </label>
                  <p className="text-gray-400 text-sm mb-3">
                    Digite os valores dos blinds separados por vírgula. Use "BREAK" ou "INTERVALO" para intervalos.
                    <br />
                    Exemplo: 100/200,200/400,BREAK,400/800,800/1600
                  </p>
                  <textarea
                    value={blindLevels}
                    onChange={(e) => {
                      setBlindLevels(e.target.value);
                      setHasSettingsChanges(true);
                    }}
                    className="w-full h-32 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm resize-none"
                    placeholder="Ex: 100/200, 200/400, 300/600..."
                    disabled={!isAdmin}
                  />
                  {blindLevels && (
                    <div className="mt-4 p-4 bg-white/5 rounded-lg">
                      <div className="text-sm font-medium text-gray-300 mb-2 flex items-center space-x-2">
                        <Coins className="w-4 h-4" />
                        <span>Preview dos Níveis:</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {blindLevels.split(',').map((level, index) => {
                          const isBreak = isBreakLevel(level);
                          return (
                            <div
                              key={index}
                              className={`px-3 py-2 rounded text-sm font-mono ${isBreak
                                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/50'
                                : 'bg-white/5 text-white'
                                }`}
                            >
                              {isBreak && <Coffee className="w-3 h-3 inline mr-1" />}
                              Nível {index + 1}: {level.trim()}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Trophy className="w-6 h-6 text-yellow-400" />
                <h3 className="text-xl font-semibold text-white">Pontuação por Posição</h3>
              </div>
              {isAdmin && (
                <div className="flex space-x-3">
                  <Button variant="secondary" onClick={handleAddPosition}>
                    <Plus className="w-4 h-4" />
                    <span>Adicionar Posição</span>
                  </Button>
                  <Button variant="secondary" onClick={handleRestoreDefaults} title="Restaurar Padrões">
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <Button onClick={handleSaveRules} loading={submittingRules} disabled={!hasRulesChanges}>
                    <Save className="w-4 h-4" />
                    <span>Salvar</span>
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingRules ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
              </div>
            ) : rulesError ? (
              <p className="text-center text-red-400 py-12">Erro ao carregar regras</p>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-400 text-sm">
                  Defina quantos pontos cada posição receberá. A partir da 13ª posição, todos recebem 5 pontos de participação.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {editingRules.map((rule, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <span className="text-gray-400 font-semibold w-16">{rule.position}º lugar</span>
                      <Input
                        type="number"
                        value={rule.points || ''}
                        onChange={(e) => handlePointsChange(index, e.target.value)}
                        placeholder="0"
                        min="0"
                        className="w-24 flex-1"
                        disabled={!isAdmin}
                      />
                      <span className="text-gray-400 text-sm">pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <Users className="w-6 h-6 text-blue-400" />
              <h3 className="text-xl font-semibold text-white">Gestão de Jogadores</h3>
            </div>
          </CardHeader>
          <CardContent>
            <PlayersList />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold text-white">Sobre o Sistema</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-white font-medium mb-2">Como Funciona</h4>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• Cadastre os jogadores que participarão do campeonato</li>
                <li>• Configure a estrutura do torneio (níveis de blinds, intervalos e duração)</li>
                <li>• Configure os prêmios e a mesa final</li>
                <li>• Defina as regras de pontuação por posição</li>
                <li>• Crie rodadas na aba "Rodadas" e selecione os jogadores</li>
                <li>• Use a tela "Ao Vivo" para acompanhar o jogo em tempo real</li>
                <li>• O sistema calcula automaticamente os prêmios e a mesa final</li>
                <li>• O ranking é atualizado em tempo real após cada rodada</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium mb-2">Sistema de Premiação</h4>
              <p className="text-gray-400 text-sm">
                {finalTableType === 'percentage'
                  ? `${finalTablePercentage.toFixed(0)}% de cada buy-in`
                  : `$${finalTableFixedValue.toFixed(0)} por rodada`} vai para o prêmio da mesa final.
                Os {finalTableTopPlayers} melhores jogadores após {totalRounds} rodadas disputam a mesa final.
                O restante é distribuído em cada rodada conforme as porcentagens definidas acima.
              </p>
            </div>
            <div>
              <h4 className="text-white font-medium mb-2">Critérios de Desempate</h4>
              <p className="text-gray-400 text-sm">
                Em caso de empate nos pontos, o desempate é feito por: melhor posição alcançada,
                seguido pelo número de rodadas jogadas.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
      />
    </Layout >
  );
}
