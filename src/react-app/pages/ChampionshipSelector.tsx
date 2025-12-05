import { useState } from 'react';
import { useChampionship } from '@/react-app/contexts/ChampionshipContext';
import { useAuth } from '@/react-app/contexts/AuthContext';
import Card, { CardHeader, CardContent } from '@/react-app/components/Card';
import Button from '@/react-app/components/Button';
import Input from '@/react-app/components/Input';
import { Trophy, Plus, Users } from 'lucide-react';
import { apiRequest } from '@/react-app/hooks/useApi';

export default function ChampionshipSelector() {
    const { championships, setCurrentChampionship, refreshChampionships } = useChampionship();
    const { } = useAuth();
    const [view, setView] = useState<'list' | 'create' | 'join'>('list');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Create championship state
    const [championshipName, setChampionshipName] = useState('');

    // Join championship state
    const [joinCode, setJoinCode] = useState('');

    const handleCreateChampionship = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const championship = await apiRequest('/api/championships', {
                method: 'POST',
                body: JSON.stringify({ name: championshipName }),
            });

            await refreshChampionships();
            setCurrentChampionship(championship);
            setChampionshipName('');
            setView('list');
        } catch (err: any) {
            setError(err.message || 'Erro ao criar campeonato');
        } finally {
            setLoading(false);
        }
    };

    const handleJoinChampionship = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const championship = await apiRequest('/api/championships/join', {
                method: 'POST',
                body: JSON.stringify({ code: joinCode.toUpperCase() }),
            });

            await refreshChampionships();
            setCurrentChampionship(championship);
            setJoinCode('');
            setView('list');
        } catch (err: any) {
            setError(err.message || 'Código inválido');
        } finally {
            setLoading(false);
        }
    };

    if (view === 'create') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <div className="flex items-center justify-center space-x-3 mb-2">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                <Plus className="w-6 h-6 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">Novo Campeonato</h2>
                        </div>
                        <p className="text-gray-400 text-center">Crie seu campeonato de poker</p>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateChampionship} className="space-y-4">
                            <Input
                                label="Nome do Campeonato"
                                type="text"
                                value={championshipName}
                                onChange={(e) => setChampionshipName(e.target.value)}
                                placeholder="Ex: Poker Night 2024"
                                required
                            />

                            {error && (
                                <div className="text-red-400 text-sm text-center">{error}</div>
                            )}

                            <div className="flex space-x-3">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setView('list')}
                                    className="flex-1"
                                >
                                    Voltar
                                </Button>
                                <Button type="submit" loading={loading} className="flex-1">
                                    Criar
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (view === 'join') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <div className="flex items-center justify-center space-x-3 mb-2">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                <Users className="w-6 h-6 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">Participar</h2>
                        </div>
                        <p className="text-gray-400 text-center">Entre com o código do campeonato</p>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleJoinChampionship} className="space-y-4">
                            <Input
                                label="Código"
                                type="text"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                placeholder="ABC123"
                                required
                                maxLength={6}
                            />

                            {error && (
                                <div className="text-red-400 text-sm text-center">{error}</div>
                            )}

                            <div className="flex space-x-3">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setView('list')}
                                    className="flex-1"
                                >
                                    Voltar
                                </Button>
                                <Button type="submit" loading={loading} className="flex-1">
                                    Participar
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <div className="flex items-center justify-center space-x-3 mb-2">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <Trophy className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Meus Campeonatos</h2>
                    </div>
                    <p className="text-gray-400 text-center">Selecione um campeonato ou crie um novo</p>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {championships.length > 0 ? (
                            <div className="grid gap-3">
                                {championships.map((championship) => (
                                    <button
                                        key={championship.id}
                                        onClick={() => setCurrentChampionship(championship)}
                                        className="w-full p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-left"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-lg font-semibold text-white">{championship.name}</h3>
                                                <p className="text-sm text-gray-400">Código: {championship.code}</p>
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${championship.role === 'admin'
                                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                }`}>
                                                {championship.role === 'admin' ? 'Admin' : 'Jogador'}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-400">
                                Você ainda não participa de nenhum campeonato
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 pt-4">
                            <Button
                                onClick={() => setView('create')}
                                className="w-full"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Criar Novo</span>
                            </Button>
                            <Button
                                onClick={() => setView('join')}
                                variant="secondary"
                                className="w-full"
                            >
                                <Users className="w-4 h-4" />
                                <span>Participar</span>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
