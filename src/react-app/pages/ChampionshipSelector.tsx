import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useChampionship } from '@/react-app/contexts/ChampionshipContext';
import { useAuth } from '@/react-app/contexts/AuthContext';
import Card, { CardHeader, CardContent } from '@/react-app/components/Card';
import Button from '@/react-app/components/Button';
import Input from '@/react-app/components/Input';
import { Trophy, Plus, Users, DollarSign, LogOut, X } from 'lucide-react';
import ConfirmationModal from '@/react-app/components/ConfirmationModal';
import { apiRequest } from '@/react-app/hooks/useApi';

export default function ChampionshipSelector() {
    const navigate = useNavigate();
    const { championships, setCurrentChampionship, refreshChampionships } = useChampionship();
    const { logout } = useAuth();
    const [view, setView] = useState<'list' | 'create' | 'join'>('list');
    const [championshipName, setChampionshipName] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
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

    const handleLogout = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Sair da Conta',
            message: 'Deseja sair da sua conta?',
            variant: 'info',
            onConfirm: () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                // Clear current championship from context
                setCurrentChampionship(null);
                // Logout clears all localStorage
                logout();
                // Redirect to login
                navigate('/login');
            }
        });
    };

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
            // Navigate to settings page for configuration
            navigate('/settings');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Erro ao criar campeonato';
            setError(message);
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

            // Redirect based on championship type
            if (championship.is_single_tournament) {
                navigate('/live'); // Single tournament goes to live game
            } else {
                navigate('/settings'); // Normal championship goes to settings
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Código inválido';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSimpleGame = async () => {
        setError('');
        setLoading(true);

        try {
            const todayFormatted = new Date().toLocaleDateString('pt-BR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });

            const championship = await apiRequest('/api/championships', {
                method: 'POST',
                body: JSON.stringify({
                    name: `Jogo Único - ${todayFormatted}`,
                    is_single_tournament: true,
                }),
            });

            await refreshChampionships();
            setCurrentChampionship(championship);
            // Redirect to quick setup instead of returning to selector
            navigate('/quick-setup');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Erro ao criar jogo';
            setError(message);
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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-4">
            {/* Logout Button */}
            <div className="absolute top-4 right-4">
                <Button
                    variant="secondary"
                    onClick={handleLogout}
                    className="flex items-center space-x-2"
                >
                    <LogOut className="w-4 h-4" />
                    <span>Sair</span>
                </Button>
            </div>

            <div className="text-center mb-12 space-y-4">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-purple-500/30">
                    <Trophy className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-white">Poker Tournament Pro</h1>
                <p className="text-gray-400 text-lg max-w-md mx-auto">
                    Gerencie seus campeonatos de poker com estilo profissional.
                </p>
            </div>

            {/* Existing Championships List */}
            {championships.length > 0 && (
                <div className="w-full max-w-2xl mb-8">
                    <h2 className="text-2xl font-bold text-white mb-4">Meus Campeonatos</h2>
                    <div className="space-y-3">
                        {championships.map((championship) => {
                            const isSingleTournament = Boolean(championship.is_single_tournament);
                            return (
                                <Card
                                    key={championship.id}
                                    className="group hover:bg-purple-900/20 transition-all border-purple-500/30 hover:border-purple-400"
                                >
                                    <CardContent className="flex items-center justify-between p-4">
                                        <div className="flex items-center space-x-4 flex-1" onClick={() => setCurrentChampionship(championship)}>
                                            <div className={`p-3 rounded-lg ${isSingleTournament
                                                ? 'bg-green-500/10 group-hover:bg-green-500/20'
                                                : 'bg-purple-500/10 group-hover:bg-purple-500/20'
                                                } transition-colors`}>
                                                <Trophy className={`w-6 h-6 ${isSingleTournament ? 'text-green-400' : 'text-purple-400'
                                                    }`} />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="text-lg font-bold text-white">{championship.name}</h3>
                                                <p className="text-gray-400 text-sm">
                                                    {championship.role === 'admin' ? 'Administrador' : 'Participante'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isSingleTournament
                                                ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                                }`}>
                                                {isSingleTournament ? '🎲 JOGO ÚNICO' : '🏆 CAMPEONATO'}
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (championship.role === 'admin') {
                                                        setConfirmModal({
                                                            isOpen: true,
                                                            title: 'Deletar Campeonato',
                                                            message: `ATENÇÃO: Você é o ADMINISTRADOR.\n\nDeletar o campeonato "${championship.name}" apagará TODOS os dados permanentemente para TODOS os jogadores.\n\nTem certeza absoluta?`,
                                                            onConfirm: () => {
                                                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                                                apiRequest(`/api/championships/${championship.id}`, {
                                                                    method: 'DELETE'
                                                                }).then(() => {
                                                                    refreshChampionships();
                                                                }).catch((err) => {
                                                                    alert('Erro ao deletar: ' + err.message);
                                                                });
                                                            }
                                                        });
                                                    } else {
                                                        setConfirmModal({
                                                            isOpen: true,
                                                            title: 'Remover Campeonato',
                                                            message: `Deseja remover "${championship.name}" da sua lista?`,
                                                            onConfirm: () => {
                                                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                                                apiRequest(`/api/championships/${championship.id}/leave`, {
                                                                    method: 'POST'
                                                                }).then(() => {
                                                                    refreshChampionships();
                                                                }).catch((err) => {
                                                                    alert('Erro ao sair: ' + err.message);
                                                                });
                                                            }
                                                        });
                                                    }
                                                }}
                                                className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                                                title={championship.role === 'admin' ? "Deletar Campeonato (Admin)" : "Remover da lista"}
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                <Card
                    className="group hover:bg-purple-900/20 transition-all cursor-pointer border-purple-500/30 hover:border-purple-400"
                    onClick={() => setView('create')}
                >
                    <CardContent className="flex items-center p-6 space-x-4">
                        <div className="p-3 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                            <Plus className="w-8 h-8 text-purple-400" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-xl font-bold text-white">Novo Campeonato</h3>
                            <p className="text-gray-400 text-sm">Crie uma nova liga ou torneio</p>
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className="group hover:bg-emerald-900/20 transition-all cursor-pointer border-emerald-500/30 hover:border-emerald-400"
                    onClick={handleCreateSimpleGame}
                >
                    <CardContent className="flex items-center p-6 space-x-4">
                        <div className="p-3 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                            <DollarSign className="w-8 h-8 text-emerald-400" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-xl font-bold text-white">Novo Jogo Único</h3>
                            <p className="text-gray-400 text-sm">Torneio rápido (1 dia, sem liga)</p>
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className="group hover:bg-blue-900/20 transition-all cursor-pointer border-blue-500/30 hover:border-blue-400 col-span-1 md:col-span-2"
                    onClick={() => setView('join')}
                >
                    <CardContent className="flex items-center p-6 space-x-4">
                        <div className="p-3 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                            <Users className="w-8 h-8 text-blue-400" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-xl font-bold text-white">Participar</h3>
                            <p className="text-gray-400 text-sm">Entre com um código existente</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <p className="mt-12 text-gray-500 text-sm">
                v1.0.0 • Developed with ❤️ for Poker Players
            </p>
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                variant={confirmModal.variant}
            />
        </div>
    );
}
