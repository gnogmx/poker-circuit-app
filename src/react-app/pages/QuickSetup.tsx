import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useChampionship } from '@/react-app/contexts/ChampionshipContext';
import { useApi, apiRequest } from '@/react-app/hooks/useApi';
import { Player, TournamentSettings, ChampionshipWithRole } from '@/shared/types';
import Layout from '@/react-app/components/Layout';
import Card, { CardHeader, CardContent } from '@/react-app/components/Card';
import Button from '@/react-app/components/Button';
import Input from '@/react-app/components/Input';
import { Users, DollarSign, Play, X, Clock, Target, Skull, Shield } from 'lucide-react';

export default function QuickSetup() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { isAdmin, currentChampionship, setCurrentChampionship } = useChampionship();
    const { data: players, refresh: refreshPlayers } = useApi<Player[]>('/api/players');
    const { data: settings } = useApi<TournamentSettings>('/api/tournament-settings');

    const [playerName, setPlayerName] = useState('');
    const [selectedPlayers, setSelectedPlayers] = useState<Set<number>>(new Set());
    const [buyIn, setBuyIn] = useState('600');
    const [rebuy, setRebuy] = useState('600');
    const [roundType, setRoundType] = useState<'regular' | 'freezeout' | 'knockout'>('regular');
    const [blindLevels, setBlindLevels] = useState('');
    const [blindDuration, setBlindDuration] = useState('15');
    const [prizeDistribution, setPrizeDistribution] = useState([
        { place: 1, percentage: 60 },
        { place: 2, percentage: 30 },
        { place: 3, percentage: 10 },
    ]);
    const [creating, setCreating] = useState(false);
    const [addingPlayer, setAddingPlayer] = useState(false);
    const [loadingChampionship, setLoadingChampionship] = useState(false);

    // Load championship from URL parameter if not in context
    useEffect(() => {
        const championshipId = searchParams.get('championshipId');

        if (championshipId && !currentChampionship) {
            setLoadingChampionship(true);

            // Fetch all championships and find the one we need
            apiRequest('/api/championships')
                .then((championships: ChampionshipWithRole[]) => {
                    const championship = championships.find(c => c.id === parseInt(championshipId));
                    if (championship) {
                        setCurrentChampionship(championship);
                    }
                })
                .catch((err) => {
                    console.error('Failed to load championship:', err);
                })
                .finally(() => {
                    setLoadingChampionship(false);
                });
        }
    }, [searchParams, currentChampionship, setCurrentChampionship]);

    // Initialize blind levels from settings when they load
    if (settings && !blindLevels) {
        setBlindLevels(settings.blind_levels || '100/200,200/400,400/800,800/1600,1600/3200');
    }

    // Auto-select all players when they load
    useEffect(() => {
        if (players && players.length > 0) {
            setSelectedPlayers(new Set(players.map(p => p.id)));
        }
    }, [players]);

    const handleAddPrizePlace = () => {
        setPrizeDistribution([...prizeDistribution, { place: prizeDistribution.length + 1, percentage: 0 }]);
    };

    const handleRemovePrizePlace = (index: number) => {
        if (prizeDistribution.length > 1) {
            setPrizeDistribution(prizeDistribution.filter((_, i) => i !== index));
        }
    };

    const handlePrizePercentageChange = (index: number, value: string) => {
        const newDistribution = [...prizeDistribution];
        newDistribution[index].percentage = parseFloat(value) || 0;
        setPrizeDistribution(newDistribution);
    };

    // Show loading while fetching championship
    if (loadingChampionship) {
        return (
            <Layout>
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <p className="text-gray-400">Carregando...</p>
                </div>
            </Layout>
        );
    }

    // Only admin can access this page
    if (!isAdmin) {
        return (
            <Layout>
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <p className="text-gray-400">Apenas administradores podem configurar jogos.</p>
                </div>
            </Layout>
        );
    }

    const handleAddPlayer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!playerName.trim()) return;

        setAddingPlayer(true);
        try {
            const newPlayer = await apiRequest('/api/players', {
                method: 'POST',
                body: JSON.stringify({ name: playerName.trim() }),
            });
            setPlayerName('');
            await refreshPlayers();

            // Auto-select the newly added player
            setSelectedPlayers(prev => new Set(prev).add(newPlayer.id));
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao adicionar jogador';
            alert(message);
        } finally {
            setAddingPlayer(false);
        }
    };

    const handlePlayerToggle = (playerId: number) => {
        const newSelected = new Set(selectedPlayers);
        if (newSelected.has(playerId)) {
            newSelected.delete(playerId);
        } else {
            newSelected.add(playerId);
        }
        setSelectedPlayers(newSelected);
    };

    const handleStartGame = async () => {
        if (selectedPlayers.size === 0) {
            alert('Selecione pelo menos um jogador');
            return;
        }

        setCreating(true);
        try {
            // Update tournament settings with prize distribution
            await apiRequest('/api/tournament-settings', {
                method: 'PUT',
                body: JSON.stringify({
                    blind_level_duration: parseInt(blindDuration),
                    blind_levels: blindLevels,
                    default_buy_in: parseFloat(buyIn) || 600,
                    first_place_percentage: prizeDistribution[0]?.percentage || 60,
                    second_place_percentage: prizeDistribution[1]?.percentage || 30,
                    third_place_percentage: prizeDistribution[2]?.percentage || 10,
                    fourth_place_percentage: prizeDistribution[3]?.percentage || 0,
                    fifth_place_percentage: prizeDistribution[4]?.percentage || 0,
                }),
            });

            // Create the round (don't start automatically - let admin start manually for music/voice effects)
            await apiRequest('/api/rounds', {
                method: 'POST',
                body: JSON.stringify({
                    round_number: 1,
                    round_date: new Date().toISOString().split('T')[0],
                    notes: 'Jogo Único',
                    round_type: roundType,
                    buy_in_value: parseFloat(buyIn) || 600,
                    rebuy_value: parseFloat(rebuy) || 600,
                    knockout_value: roundType === 'knockout' ? 50 : 0,
                    player_ids: Array.from(selectedPlayers),
                }),
            });

            // Navigate to live game (admin will start manually)
            navigate('/live');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao iniciar jogo';
            alert(message);
        } finally {
            setCreating(false);
        }
    };

    const handleCancel = () => {
        navigate('/');
    };

    return (
        <Layout>
            <div className="space-y-6 max-w-4xl mx-auto">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/50">
                        <DollarSign className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">⚡ Configuração Rápida</h2>
                    <p className="text-gray-400">Configure seu jogo em apenas 2 passos!</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Players Section */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center space-x-2">
                                <Users className="w-5 h-5 text-blue-400" />
                                <h3 className="text-xl font-semibold text-white">1. Jogadores</h3>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {/* Add player form */}
                                <form onSubmit={handleAddPlayer} className="flex space-x-2">
                                    <Input
                                        value={playerName}
                                        onChange={(e) => setPlayerName(e.target.value)}
                                        placeholder="Nome do jogador"
                                        className="flex-1"
                                    />
                                    <Button type="submit" loading={addingPlayer} variant="secondary">
                                        Adicionar
                                    </Button>
                                </form>

                                {/* Players list */}
                                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                    {!players || players.length === 0 ? (
                                        <p className="text-center text-gray-500 py-4 text-sm">
                                            Adicione jogadores acima
                                        </p>
                                    ) : (
                                        players.map((player) => (
                                            <label
                                                key={player.id}
                                                className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedPlayers.has(player.id)
                                                    ? 'bg-blue-500/10 border-blue-500/50'
                                                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPlayers.has(player.id)}
                                                    onChange={() => handlePlayerToggle(player.id)}
                                                    className="w-4 h-4 rounded border-gray-300"
                                                />
                                                <span className="text-white flex-1">{player.name}</span>
                                            </label>
                                        ))
                                    )}
                                </div>

                                {selectedPlayers.size > 0 && (
                                    <p className="text-sm text-gray-400 text-center">
                                        {selectedPlayers.size} jogador{selectedPlayers.size !== 1 ? 'es' : ''} selecionado{selectedPlayers.size !== 1 ? 's' : ''}
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Config Section */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center space-x-2">
                                <DollarSign className="w-5 h-5 text-green-400" />
                                <h3 className="text-xl font-semibold text-white">2. Configuração</h3>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <Input
                                        label="Buy-in ($)"
                                        type="number"
                                        step="1"
                                        value={buyIn}
                                        onChange={(e) => setBuyIn(e.target.value)}
                                        placeholder="600"
                                    />
                                    <Input
                                        label="Rebuy ($)"
                                        type="number"
                                        step="1"
                                        value={rebuy}
                                        onChange={(e) => setRebuy(e.target.value)}
                                        placeholder="600"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Tipo de Rodada
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setRoundType('regular')}
                                            className={`p-3 rounded-lg border transition-all ${roundType === 'regular'
                                                ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                                                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                                }`}
                                        >
                                            <Target className="w-5 h-5 mx-auto mb-1" />
                                            <div className="text-xs font-semibold">Regular</div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setRoundType('freezeout')}
                                            className={`p-3 rounded-lg border transition-all ${roundType === 'freezeout'
                                                ? 'bg-red-500/20 border-red-500 text-red-300'
                                                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                                }`}
                                        >
                                            <Shield className="w-5 h-5 mx-auto mb-1" />
                                            <div className="text-xs font-semibold">Freeze Out</div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setRoundType('knockout')}
                                            className={`p-3 rounded-lg border transition-all ${roundType === 'knockout'
                                                ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                                                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                                }`}
                                        >
                                            <Skull className="w-5 h-5 mx-auto mb-1" />
                                            <div className="text-xs font-semibold">Knockout</div>
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        <Clock className="w-4 h-4 inline mr-1" />
                                        Duração por Nível
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['10', '15', '20'].map((duration) => (
                                            <button
                                                key={duration}
                                                type="button"
                                                onClick={() => setBlindDuration(duration)}
                                                className={`p-3 rounded-lg border transition-all ${blindDuration === duration
                                                    ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                                                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                                    }`}
                                            >
                                                <div className="font-semibold">{duration} min</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            📊 Níveis de Blind
                                        </label>
                                        <textarea
                                            value={blindLevels}
                                            onChange={(e) => setBlindLevels(e.target.value)}
                                            placeholder="100/200,200/400,400/800,800/1600,1600/3200"
                                            rows={3}
                                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Separar níveis com vírgula. Ex: 100/200,200/400,400/800
                                        </p>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-sm font-medium text-gray-300">
                                                🏆 Premiação (%)
                                            </label>
                                            <button
                                                type="button"
                                                onClick={handleAddPrizePlace}
                                                className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors"
                                            >
                                                + Adicionar
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {prizeDistribution.map((prize, index) => (
                                                <div key={index} className="flex items-center space-x-2">
                                                    <span className="text-sm text-gray-400 w-8">{prize.place}º</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        step="1"
                                                        value={prize.percentage}
                                                        onChange={(e) => handlePrizePercentageChange(index, e.target.value)}
                                                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                        placeholder="0"
                                                    />
                                                    <span className="text-sm text-gray-400">%</span>
                                                    {prizeDistribution.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemovePrizePlace(index)}
                                                            className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                                                        >
                                                            ×
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            <p className="text-xs text-gray-500 mt-1">
                                                Total: {prizeDistribution.reduce((sum, p) => sum + p.percentage, 0)}%
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center space-x-4">
                    <Button
                        variant="secondary"
                        onClick={handleCancel}
                        className="min-w-[150px]"
                    >
                        <X className="w-4 h-4" />
                        <span>Cancelar</span>
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleStartGame}
                        loading={creating}
                        disabled={selectedPlayers.size === 0}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-lg py-6"
                    >
                        <Play className="w-6 h-6" />
                        <span>🚀 Começar Jogo!</span>
                    </Button>
                </div>
            </div>
        </Layout>
    );
}
