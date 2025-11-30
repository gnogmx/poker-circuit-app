import { useState } from 'react';
import { useApi, apiRequest } from '@/react-app/hooks/useApi';
import { Player, RoundWithResults } from '@/shared/types';
import Layout from '@/react-app/components/Layout';
import Card, { CardHeader, CardContent } from '@/react-app/components/Card';
import Button from '@/react-app/components/Button';
import Input from '@/react-app/components/Input';
import { Plus, Trash2, Loader2, X, Calendar, DollarSign, Radio } from 'lucide-react';

type RoundType = 'regular' | 'freezeout' | 'knockout';

export default function Rounds() {
  const { data: rounds, loading: loadingRounds, error, refresh: refreshRounds } = useApi<RoundWithResults[]>('/api/rounds');
  const { data: players, loading: loadingPlayers } = useApi<Player[]>('/api/players');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    round_date: new Date().toISOString().split('T')[0],
    notes: '',
    round_type: 'regular' as RoundType,
    buy_in_value: '600',
    rebuy_value: '600',
    knockout_value: '50',
  });
  const [selectedPlayers, setSelectedPlayers] = useState<Set<number>>(new Set());

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
        buy_in_value: '600',
        rebuy_value: '600',
        knockout_value: '50',
      });
      setSelectedPlayers(new Set());
      setShowForm(false);
      refreshRounds();
      alert('Rodada criada! Acesse a aba "Ao Vivo" para iniciar o jogo.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar rodada';
      alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta rodada?')) return;

    try {
      await apiRequest(`/api/rounds/${id}`, { method: 'DELETE' });
      refreshRounds();
    } catch (err) {
      console.error('Failed to delete round:', err);
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
  };

  const loading = loadingRounds || loadingPlayers;

  const getRoundTypeLabel = (type: string) => {
    switch (type) {
      case 'regular': return 'Regular';
      case 'freezeout': return 'Freeze Out';
      case 'knockout': return 'Knockout';
      default: return type;
    }
  };

  const activeRound = rounds?.find(r => r.status === 'active');
  const completedRounds = rounds?.filter(r => r.status === 'completed') || [];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white">Rodadas</h2>
            <p className="text-gray-400 mt-1">Configure as rodadas do campeonato</p>
          </div>
          {!showForm && !activeRound && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4" />
              <span>Nova Rodada</span>
            </Button>
          )}
        </div>

        {activeRound && (
          <Card className="border-2 border-green-500/50 bg-green-500/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center space-x-4">
                    <Radio className="w-6 h-6 text-green-400 animate-pulse" />
                    <h3 className="text-xl font-semibold text-white">
                      Rodada {activeRound.round_number} - Em Andamento
                    </h3>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300">
                      {getRoundTypeLabel(activeRound.round_type)}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm">
                    Acesse a aba "Ao Vivo" para acompanhar e controlar esta rodada
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(activeRound.id)}
                  className="text-gray-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
          </Card>
        )}

        {showForm && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Nova Rodada</h3>
                <button onClick={handleCancel} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                    <div className="text-sm text-gray-300 mb-1">Número da Rodada</div>
                    <div className="text-2xl font-bold text-white">
                      Rodada {rounds && rounds.length > 0 ? Math.max(...rounds.map(r => r.round_number)) + 1 : 1}
                    </div>
                  </div>

                  <Input
                    label="Data"
                    type="date"
                    value={formData.round_date}
                    onChange={(e) => setFormData({ ...formData, round_date: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tipo de Rodada
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, round_type: 'regular' })}
                      className={`p-3 rounded-lg border transition-all ${formData.round_type === 'regular'
                        ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                        }`}
                    >
                      <div className="font-semibold">Regular</div>
                      <div className="text-xs mt-1">Até 2 recompras</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, round_type: 'freezeout' })}
                      className={`p-3 rounded-lg border transition-all ${formData.round_type === 'freezeout'
                        ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                        }`}
                    >
                      <div className="font-semibold">Freeze Out</div>
                      <div className="text-xs mt-1">Sem recompra</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, round_type: 'knockout' })}
                      className={`p-3 rounded-lg border transition-all ${formData.round_type === 'knockout'
                        ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                        }`}
                    >
                      <div className="font-semibold">Knockout</div>
                      <div className="text-xs mt-1">Bounty por eliminação</div>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Buy-in ($)"
                    type="number"
                    step="0.01"
                    value={formData.buy_in_value}
                    onChange={(e) => setFormData({ ...formData, buy_in_value: e.target.value })}
                    placeholder="600"
                  />
                  {formData.round_type === 'regular' && (
                    <Input
                      label="Recompra ($)"
                      type="number"
                      step="0.01"
                      value={formData.rebuy_value}
                      onChange={(e) => setFormData({ ...formData, rebuy_value: e.target.value })}
                      placeholder="600"
                    />
                  )}
                  {formData.round_type === 'knockout' && (
                    <Input
                      label="Knockout/Bounty ($)"
                      type="number"
                      step="0.01"
                      value={formData.knockout_value}
                      onChange={(e) => setFormData({ ...formData, knockout_value: e.target.value })}
                      placeholder="50"
                    />
                  )}
                </div>

                <Input
                  label="Observações (opcional)"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Adicione observações sobre esta rodada..."
                />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">
                      Jogadores Participantes
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
                      Nenhum jogador cadastrado
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
                      {selectedPlayers.size} jogador{selectedPlayers.size !== 1 ? 'es' : ''} selecionado{selectedPlayers.size !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                <div className="flex space-x-3">
                  <Button type="submit" loading={submitting}>
                    Criar Rodada
                  </Button>
                  <Button type="button" variant="secondary" onClick={handleCancel}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-white">Rodadas Finalizadas</h3>
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
              </CardContent>
            </Card>
          ) : error ? (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-red-400">Erro ao carregar rodadas</p>
              </CardContent>
            </Card>
          ) : completedRounds.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-gray-400">Nenhuma rodada finalizada ainda</p>
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
                          Rodada {round.round_number}
                        </h3>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300">
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
                            <span>Buy-in: $ {round.buy_in_value.toFixed(2)}</span>
                          </div>
                        )}
                        {round.rebuy_value && round.round_type === 'regular' && (
                          <div className="flex items-center space-x-1">
                            <DollarSign className="w-3 h-3" />
                            <span>Recompra: $ {round.rebuy_value.toFixed(2)}</span>
                          </div>
                        )}
                        {round.knockout_value && round.round_type === 'knockout' && (
                          <div className="flex items-center space-x-1">
                            <DollarSign className="w-3 h-3" />
                            <span>Knockout: $ {round.knockout_value.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(round.id)}
                      className="text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
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
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-300">Posição</th>
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-300">Jogador</th>
                          {round.round_type === 'regular' && (
                            <th className="px-4 py-2 text-center text-sm font-semibold text-gray-300">Recompras</th>
                          )}
                          {round.round_type === 'knockout' && (
                            <th className="px-4 py-2 text-right text-sm font-semibold text-gray-300">Knockout</th>
                          )}
                          <th className="px-4 py-2 text-right text-sm font-semibold text-gray-300">Pontos</th>
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
                                {result.knockout_earnings > 0 ? `$ ${result.knockout_earnings.toFixed(2)}` : '-'}
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
    </Layout>
  );
}
