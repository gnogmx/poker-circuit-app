import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useApi, apiRequest } from '@/react-app/hooks/useApi';
import { useChampionship } from '@/react-app/contexts/ChampionshipContext';
import { Player, RoundWithResults, TournamentSettings, RankingEntry } from '@/shared/types';
import Layout from '@/react-app/components/Layout';
import Card, { CardHeader, CardContent } from '@/react-app/components/Card';
import Button from '@/react-app/components/Button';
import Input from '@/react-app/components/Input';
import { Plus, Trash2, Loader2, X, Calendar, DollarSign, Radio, Trophy, Users, RefreshCw, Shuffle } from 'lucide-react';
import ChampionshipPodiumModal from '@/react-app/components/ChampionshipPodiumModal';
import FinalTableModal from '@/react-app/components/FinalTableModal';
import ConfirmationModal from '@/react-app/components/ConfirmationModal';
import TableDrawModal from '@/react-app/components/TableDrawModal';
import { useLanguage } from '@/react-app/hooks/useLanguage';

type RoundType = 'regular' | 'freezeout' | 'knockout';

interface RankingResponse {
  rankings: RankingEntry[];
  final_table_prize_pool: number;
  rounds: Array<{ id: number; round_number: number }>;
}

export default function Rounds() {
  const navigate = useNavigate();
  const { data: rounds, loading: loadingRounds, error, refresh: refreshRounds } = useApi<RoundWithResults[]>('/api/rounds');
  const { isAdmin, isSingleTournament, currentChampionship } = useChampionship();
  const { data: players, loading: loadingPlayers } = useApi<Player[]>('/api/players');
  const { data: rankingData } = useApi<RankingResponse>('/api/rankings');
  const { data: settings } = useApi<TournamentSettings>('/api/tournament-settings');
  const { t } = useLanguage();

  // Redirect if single tournament - rounds not available
  useEffect(() => {
    if (isSingleTournament) {
      navigate('/live');
    }
  }, [isSingleTournament, navigate]);

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    round_date: new Date().toISOString().split('T')[0],
    notes: '',
    round_type: 'regular' as RoundType,
    buy_in_value: '0',
    rebuy_value: '0',
    knockout_value: '50',
  });

  // Update default values when settings load
  useEffect(() => {
    if (settings?.default_buy_in) {
      setFormData(prev => ({
        ...prev,
        buy_in_value: (settings.default_buy_in || 0).toString(),
        rebuy_value: (settings.default_buy_in || 0).toString()
      }));
    }
  }, [settings]);

  const [selectedPlayers, setSelectedPlayers] = useState<Set<number>>(new Set());
  const [managingRound, setManagingRound] = useState<RoundWithResults | null>(null);
  const [replacingPlayerId, setReplacingPlayerId] = useState<number | null>(null);

  // Modal states
  const [showPodiumModal, setShowPodiumModal] = useState(false);
  const [showFinalTableModal, setShowFinalTableModal] = useState(false);
  const [showTableDrawModal, setShowTableDrawModal] = useState(false);
  const [tableDrawPlayers, setTableDrawPlayers] = useState<Array<{ id: number; name: string }>>([]);
  const [tableDrawRoundId, setTableDrawRoundId] = useState<number | undefined>(undefined);

  // Check for championship completion
  useEffect(() => {
    if (!rounds || !settings || !rankingData || !currentChampionship) return;

    const totalRounds = settings.total_rounds || 24;
    const completedRoundsCount = rounds.filter(r => r.status === 'completed' && !r.is_final_table).length;

    // Trigger if we reached the limit. Ensure rankings exist (safeguard).
    if (completedRoundsCount >= totalRounds && rankingData.rankings.length > 0) {
      // Use championship-specific key to avoid conflicts
      const championshipKey = `podium_shown_${currentChampionship.id}`;
      const hasSeenPodium = sessionStorage.getItem(championshipKey);

      if (!hasSeenPodium) {
        setShowPodiumModal(true);
        sessionStorage.setItem(championshipKey, 'true');
      }
    }
  }, [rounds, settings, rankingData, currentChampionship]);

  const handlePlayerToggle = (playerId: number) => {
    const newSelected = new Set(selectedPlayers);
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId);
    } else {
      newSelected.add(playerId);
    }
    setSelectedPlayers(newSelected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedPlayers.size === 0) {
      alert('Selecione pelo menos um jogador');
      return;
    }

    // Check if we've reached the maximum number of rounds (total_rounds + 1 for final table)
    const totalRounds = settings?.total_rounds || 24;
    const maxRounds = totalRounds + 1; // +1 for final table
    const currentRoundCount = rounds?.length || 0;

    if (currentRoundCount >= maxRounds) {
      alert(`Limite de rodadas atingido! Máximo: ${totalRounds} rodadas regulares + 1 mesa final = ${maxRounds} total.`);
      return;
    }

    // Calculate next round number automatically
    const nextRoundNumber = rounds && rounds.length > 0
      ? Math.max(...rounds.map(r => r.round_number)) + 1
      : 1;

    try {
      setSubmitting(true);
      await apiRequest('/api/rounds', {
        method: 'POST',
        body: JSON.stringify({
          round_number: nextRoundNumber,
          round_date: formData.round_date,
          notes: formData.notes || undefined,
          round_type: formData.round_type,
          buy_in_value: parseFloat(formData.buy_in_value) || undefined,
          rebuy_value: parseFloat(formData.rebuy_value) || undefined,
          knockout_value: formData.round_type === 'knockout' ? parseFloat(formData.knockout_value) : undefined,
          player_ids: Array.from(selectedPlayers),
        }),
      });

      setFormData({
        round_date: new Date().toISOString().split('T')[0],
        notes: '',
        round_type: 'regular',
        buy_in_value: (settings?.default_buy_in || 0).toString(),
        rebuy_value: (settings?.default_buy_in || 0).toString(),
        knockout_value: '50',
      });
      setSelectedPlayers(new Set());
      setShowForm(false);
      refreshRounds();
      // Navigate to live page automatically
      navigate('/live');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar rodada';
      alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    // Confirm removed for ease of testing
    // if (!confirm('Tem certeza que deseja excluir esta rodada?')) return;

    try {
      await apiRequest(`/api/rounds/${id}`, { method: 'DELETE' });

      // Clear podium/final table flags so they can show again if championship becomes complete
      const championshipId = currentChampionship?.id || 'default';
      const championshipKey = `podium_shown_${championshipId}`;
      const finalTableKey = `final_table_shown_${championshipId}`;
      sessionStorage.removeItem(championshipKey);
      sessionStorage.removeItem(finalTableKey);

      refreshRounds();
    } catch (err: unknown) {
      console.error('Failed to delete round:', err);
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      alert('Erro ao excluir rodada: ' + message);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setFormData({
      round_date: new Date().toISOString().split('T')[0],
      notes: '',
      round_type: 'regular',
      buy_in_value: '600',
      rebuy_value: '600',
      knockout_value: '50',
    });
    setSelectedPlayers(new Set());
    setSelectedPlayers(new Set());
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

  const handleReplacePlayerRequest = (roundId: number, playerIdToRemove: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Substituir Jogador',
      message: 'Tem certeza que deseja substituir este jogador pelo próximo do ranking?',
      onConfirm: () => handleReplacePlayer(roundId, playerIdToRemove)
    });
  };

  const handleReplacePlayer = async (roundId: number, playerIdToRemove: number) => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    try {
      setReplacingPlayerId(playerIdToRemove);
      const res = await apiRequest(
        `/api/rounds/${roundId}/replace-player`,
        {
          method: 'POST',
          body: JSON.stringify({ playerIdToRemove })
        }
      ) as { success: boolean; replaced: boolean; newPlayer?: Player; message?: string };

      if (res.replaced && res.newPlayer) {
        refreshRounds();
        // Update local state to reflect change immediately
        if (managingRound) {
          setManagingRound({
            ...managingRound,
            players: managingRound.players?.map(p => p.id === playerIdToRemove ? { id: res.newPlayer!.id, name: res.newPlayer!.name } : p)
          });
        }
      } else {
        alert(res.message || 'Não foi possível substituir o jogador.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao substituir jogador';
      alert(message);
    } finally {
      setReplacingPlayerId(null);
    }
  };

  const loading = loadingRounds || loadingPlayers;

  const getRoundTypeLabel = (type: string) => {
    switch (type) {
      case 'regular': return t('regular');
      case 'freezeout': return t('freezeout');
      case 'knockout': return t('knockout');
      default: return type;
    }
  };

  const activeRound = rounds?.find(r => r.status === 'active');
  const completedRounds = rounds?.filter(r => r.status === 'completed') || [];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">{t('rounds')}</h2>
          <div className="flex gap-2">
            {isAdmin && !showForm && !activeRound && !rounds?.find(r => r.status === 'upcoming') && (
              <>
                {rounds && settings && rounds.filter(r => r.status === 'completed' && !r.is_final_table).length >= (settings.total_rounds || 24) ? (
                  !rounds.find(r => r.is_final_table) && (
                    <Button
                      onClick={async () => {
                        if (!confirm('Deseja gerar a Mesa Final agora? Isso irá selecionar os 9 melhores jogadores.')) return;
                        try {
                          await apiRequest('/api/final-table/generate', { method: 'POST' });
                          refreshRounds();
                          window.location.reload(); // Reload to ensure states update and podium/final table modals work if triggered
                        } catch (err: unknown) {
                          const message = err instanceof Error ? err.message : 'Erro ao gerar Mesa Final';
                          alert(message);
                        }
                      }}
                      className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                    >
                      <Trophy className="w-4 h-4 mr-2" />
                      Gerar Mesa Final
                    </Button>
                  )
                ) : (
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('newRound')}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {activeRound && (
          <Card className="border-2 border-green-500/50 bg-green-500/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center space-x-4">
                    <Radio className="w-6 h-6 text-green-400 animate-pulse" />
                    <h3 className="text-xl font-semibold text-white">
                      {t('roundNumber')} {activeRound.round_number} - {t('inProgress')}
                    </h3>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300">
                      {getRoundTypeLabel(activeRound.round_type)}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm">
                    {t('accessLive')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Table draw button visible to all */}
                  {activeRound.players && activeRound.players.length > 0 && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (activeRound.players) {
                          setTableDrawPlayers(activeRound.players);
                          setTableDrawRoundId(activeRound.id);
                          setShowTableDrawModal(true);
                        }
                      }}
                      className="bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 border-yellow-500/50"
                    >
                      <Shuffle className="w-4 h-4 mr-2" />
                      Sortear Mesas
                    </Button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(activeRound.id)}
                      className="text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Upcoming Round (Final Table) */}
        {rounds?.find(r => r.status === 'upcoming') && (
          <Card className="border-2 border-yellow-500/50 bg-yellow-500/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center space-x-4">
                    <Trophy className="w-6 h-6 text-yellow-400 animate-bounce" />
                    <h3 className="text-xl font-semibold text-white">
                      {rounds.find(r => r.status === 'upcoming')?.is_final_table ? 'Mesa Final' : `Rodada ${rounds.find(r => r.status === 'upcoming')?.round_number}`} - Pronta para Iniciar
                    </h3>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300">
                      {getRoundTypeLabel(rounds.find(r => r.status === 'upcoming')?.round_type || 'regular')}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm">
                    Esta rodada foi gerada e está aguardando início.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Table draw button visible to all */}
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const round = rounds.find(r => r.status === 'upcoming');
                      if (round?.players) {
                        setTableDrawPlayers(round.players);
                        setTableDrawRoundId(round.id);
                        setShowTableDrawModal(true);
                      }
                    }}
                    className="bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 border-yellow-500/50"
                  >
                    <Shuffle className="w-4 h-4 mr-2" />
                    Sortear Mesas
                  </Button>
                  {isAdmin && (
                    <>
                      <Button
                        variant="secondary"
                        onClick={() => setManagingRound(rounds.find(r => r.status === 'upcoming') || null)}
                        className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border-blue-500/50"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Gerenciar Jogadores
                      </Button>
                      <Button
                        onClick={async () => {
                          const round = rounds.find(r => r.status === 'upcoming');
                          if (!round) return;
                          if (!confirm('Deseja iniciar esta rodada agora?')) return;

                          try {
                            await apiRequest(`/api/rounds/${round.id}/start`, { method: 'POST' });
                            refreshRounds();
                            window.location.href = '/live';
                          } catch (err: unknown) {
                            const message = err instanceof Error ? err.message : 'Erro ao iniciar rodada';
                            alert(message);
                          }
                        }}
                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                      >
                        <Radio className="w-4 h-4 mr-2" />
                        Iniciar Agora
                      </Button>
                    </>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(rounds.find(r => r.status === 'upcoming')!.id)}
                      className="text-gray-400 hover:text-red-400 transition-colors p-2"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {showForm && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">{t('newRound')}</h3>
                <button onClick={handleCancel} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg border ${formData.round_type === 'regular'
                      ? 'bg-purple-500/10 border-purple-500/30'
                      : formData.round_type === 'freezeout'
                        ? 'bg-blue-500/10 border-blue-500/30'
                        : 'bg-yellow-500/10 border-yellow-500/30'
                    }`}>
                    <div className="text-sm text-gray-300 mb-1">{t('roundNumber')}</div>
                    <div className="text-2xl font-bold text-white">
                      {t('roundNumber')} {rounds && rounds.length > 0 ? Math.max(...rounds.map(r => r.round_number)) + 1 : 1}
                    </div>
                  </div>

                  <Input
                    label={t('date')}
                    type="date"
                    value={formData.round_date}
                    onChange={(e) => setFormData({ ...formData, round_date: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('roundType')}
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const baseBuyIn = settings?.default_buy_in || 0;
                        setFormData({
                          ...formData,
                          round_type: 'regular',
                          buy_in_value: baseBuyIn.toString(),
                          rebuy_value: baseBuyIn.toString()
                        });
                      }}
                      className={`p-3 rounded-lg border transition-all ${formData.round_type === 'regular'
                        ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                        }`}
                    >
                      <div className="font-semibold">{t('regular')}</div>
                      <div className="text-xs mt-1">{t('upToRebuys')}</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const baseBuyIn = settings?.default_buy_in || 0;
                        setFormData({
                          ...formData,
                          round_type: 'freezeout',
                          buy_in_value: (baseBuyIn * 2).toString(),
                          rebuy_value: '0'
                        });
                      }}
                      className={`p-3 rounded-lg border transition-all ${formData.round_type === 'freezeout'
                        ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                        }`}
                    >
                      <div className="font-semibold">{t('freezeout')}</div>
                      <div className="text-xs mt-1">{t('noRebuy')}</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const baseBuyIn = settings?.default_buy_in || 0;
                        setFormData({
                          ...formData,
                          round_type: 'knockout',
                          buy_in_value: baseBuyIn.toString(),
                          rebuy_value: baseBuyIn.toString()
                        });
                      }}
                      className={`p-3 rounded-lg border transition-all ${formData.round_type === 'knockout'
                        ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                        }`}
                    >
                      <div className="font-semibold">{t('knockout')}</div>
                      <div className="text-xs mt-1">{t('bountyPerElimination')}</div>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label={t('buyIn') + " ($)"}
                    type="number"
                    step="1"
                    value={formData.buy_in_value}
                    onChange={(e) => setFormData({ ...formData, buy_in_value: e.target.value })}
                    placeholder="600"
                  />
                  {formData.round_type === 'regular' && (
                    <Input
                      label={t('rebuy') + " ($)"}
                      type="number"
                      step="1"
                      value={formData.rebuy_value}
                      onChange={(e) => setFormData({ ...formData, rebuy_value: e.target.value })}
                      placeholder="600"
                    />
                  )}
                  {formData.round_type === 'knockout' && (
                    <Input
                      label="Knockout/Bounty ($)"
                      type="number"
                      step="1"
                      value={formData.knockout_value}
                      onChange={(e) => setFormData({ ...formData, knockout_value: e.target.value })}
                      placeholder="50"
                    />
                  )}
                </div>

                <Input
                  label={`${t('notes')} (${t('optional')})`}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={t('addNotes')}
                />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">
                      {t('participatingPlayers')}
                    </label>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!players) return;
                          const allPlayerIds = new Set(players.map(p => p.id));
                          setSelectedPlayers(allPlayerIds);
                        }}
                        className="text-xs px-3 py-1 rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors"
                      >
                        Selecionar Todos
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedPlayers(new Set())}
                        className="text-xs px-3 py-1 rounded bg-white/5 text-gray-400 hover:bg-white/10 transition-colors"
                      >
                        Desmarcar Todos
                      </button>
                    </div>
                  </div>
                  {!players || players.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      {t('noPlayersRegistered')}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {players.map((player) => (
                        <label
                          key={player.id}
                          className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedPlayers.has(player.id)
                            ? 'bg-purple-500/10 border-purple-500/50'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedPlayers.has(player.id)}
                            onChange={() => handlePlayerToggle(player.id)}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                          <span className="text-white">{player.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {selectedPlayers.size > 0 && (
                    <div className="text-gray-400 text-sm">
                      {selectedPlayers.size} {selectedPlayers.size !== 1 ? t('playersSelected') : t('playerSelected')}
                    </div>
                  )}
                </div>

                <div className="flex space-x-3">
                  <Button
                    type="submit"
                    loading={submitting}
                    className={
                      formData.round_type === 'regular'
                        ? 'bg-purple-500 hover:bg-purple-600'
                        : formData.round_type === 'freezeout'
                          ? 'bg-blue-500 hover:bg-blue-600'
                          : 'bg-yellow-500 hover:bg-yellow-600 text-black'
                    }
                  >
                    {t('createRound')}
                  </Button>
                  <Button type="button" variant="secondary" onClick={handleCancel}>
                    {t('cancel')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-white">{t('completedRounds')}</h3>
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
              </CardContent>
            </Card>
          ) : error ? (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-red-400">{t('error')}</p>
              </CardContent>
            </Card>
          ) : completedRounds.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-gray-400">{t('noCompletedRounds')}</p>
              </CardContent>
            </Card>
          ) : (
            completedRounds.map((round) => (
              <Card key={round.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-4">
                        <h3 className="text-xl font-semibold text-white">
                          {t('roundNumber')} {round.round_number}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${round.round_type === 'regular'
                            ? 'bg-purple-500/20 text-purple-300'
                            : round.round_type === 'freezeout'
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-yellow-500/20 text-yellow-300'
                          }`}>
                          {getRoundTypeLabel(round.round_type)}
                        </span>
                        <div className="flex items-center space-x-2 text-gray-400">
                          <Calendar className="w-4 h-4" />
                          <span className="text-sm">
                            {new Date(round.round_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        {round.buy_in_value && (
                          <div className="flex items-center space-x-1">
                            <DollarSign className="w-3 h-3" />
                            <span>{t('buyIn')}: $ {round.buy_in_value.toFixed(0)}</span>
                          </div>
                        )}
                        {round.rebuy_value && round.round_type === 'regular' && (
                          <div className="flex items-center space-x-1">
                            <DollarSign className="w-3 h-3" />
                            <span>{t('rebuy')}: $ {round.rebuy_value.toFixed(0)}</span>
                          </div>
                        )}
                        {round.knockout_value && round.round_type === 'knockout' && (
                          <div className="flex items-center space-x-1">
                            <DollarSign className="w-3 h-3" />
                            <span>Knockout: $ {round.knockout_value.toFixed(0)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* No delete button for completed rounds */}
                  </div>
                  {round.notes && (
                    <p className="text-gray-400 text-sm mt-2">{round.notes}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-300">{t('position')}</th>
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-300">{t('player')}</th>
                          {round.round_type === 'regular' && (
                            <th className="px-4 py-2 text-center text-sm font-semibold text-gray-300">{t('rebuys')}</th>
                          )}
                          {round.round_type === 'knockout' && (
                            <th className="px-4 py-2 text-right text-sm font-semibold text-gray-300">Knockout</th>
                          )}
                          <th className="px-4 py-2 text-right text-sm font-semibold text-gray-300">{t('points')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {round.results.map((result) => (
                          <tr key={result.id} className="border-b border-white/5">
                            <td className="px-4 py-3 text-gray-400">{result.position}º</td>
                            <td className="px-4 py-3 text-white">{result.player_name}</td>
                            {round.round_type === 'regular' && (
                              <td className="px-4 py-3 text-center text-gray-300">{result.rebuys}</td>
                            )}
                            {round.round_type === 'knockout' && (
                              <td className="px-4 py-3 text-right text-green-400">
                                {result.knockout_earnings > 0 ? `$ ${result.knockout_earnings.toFixed(0)}` : '-'}
                              </td>
                            )}
                            <td className="px-4 py-3 text-right text-purple-400 font-semibold">
                              {result.points}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Manage Players Modal */}
      {managingRound && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg bg-gray-900 border-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  Gerenciar Jogadores - Mesa Final
                </h3>
                <button
                  onClick={() => setManagingRound(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-400">
                  Lista de jogadores classificados. Se algum jogador não puder comparecer,
                  você pode substituí-lo pelo próximo colocado do ranking.
                </p>

                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                  {managingRound.players?.map((player, index) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <span className="text-white font-medium">{player.name}</span>
                      </div>
                      <button
                        onClick={() => handleReplacePlayerRequest(managingRound.id, player.id)}
                        disabled={replacingPlayerId === player.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors text-xs disabled:opacity-50"
                        title="Substituir pelo próximo do ranking"
                      >
                        {replacingPlayerId === player.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        Substituir
                      </button>
                    </div>
                  ))}
                  {(!managingRound.players || managingRound.players.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                      Nenhum jogador encontrado nesta rodada.
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4 border-t border-white/10">
                  <Button variant="secondary" onClick={() => setManagingRound(null)}>
                    Fechar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modals for Championship End */}
      {rankingData && (
        <>
          <ChampionshipPodiumModal
            isOpen={showPodiumModal}
            onClose={() => setShowPodiumModal(false)}
            topPlayers={rankingData.rankings.slice(0, 3)}
            onViewFinalTable={() => {
              setShowPodiumModal(false);
              setShowFinalTableModal(true);
            }}
          />

          <FinalTableModal
            isOpen={showFinalTableModal}
            onClose={() => setShowFinalTableModal(false)}
            rankings={rankingData.rankings}
            prizePool={rankingData.final_table_prize_pool}
            topPlayersCount={settings?.final_table_top_players || 9}
          />
        </>
      )}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
      />
      <TableDrawModal
        isOpen={showTableDrawModal}
        onClose={() => setShowTableDrawModal(false)}
        players={tableDrawPlayers}
        roundId={tableDrawRoundId}
      />
    </Layout>
  );
}
