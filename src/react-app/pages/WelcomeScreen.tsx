import { useNavigate } from 'react-router';
import { useChampionship } from '@/react-app/contexts/ChampionshipContext';
import Card from '@/react-app/components/Card';
import Button from '@/react-app/components/Button';
import { Sparkles, Trophy, Play, Users, ArrowRight } from 'lucide-react';
import { apiRequest } from '@/react-app/hooks/useApi';
import { useState, useEffect } from 'react';

export default function WelcomeScreen() {
    const navigate = useNavigate();
    const { setCurrentChampionship } = useChampionship();
    const [loading, setLoading] = useState(false);

    // Clear any old championship data when welcome screen loads
    useEffect(() => {
        localStorage.removeItem('current_championship');
        setCurrentChampionship(null);
    }, [setCurrentChampionship]);

    const handleQuickStart = async () => {
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

            // Save to localStorage as backup
            localStorage.setItem('current_championship', JSON.stringify(championship));
            localStorage.setItem('hasCompletedOnboarding', 'true');

            // Navigate with championship ID in URL - QuickSetup will load it
            navigate(`/quick-setup?championshipId=${championship.id}`);
        } catch (err) {
            console.error('Error creating quick game:', err);
            alert('Erro ao criar jogo. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateChampionship = () => {
        localStorage.setItem('hasCompletedOnboarding', 'true');
        navigate('/?view=create');
    };

    const handleJoinChampionship = () => {
        localStorage.setItem('hasCompletedOnboarding', 'true');
        navigate('/?view=join');
    };

    const handleSkip = () => {
        localStorage.setItem('hasCompletedOnboarding', 'true');
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
            <Card className="w-full max-w-4xl">
                <div className="py-12 px-6">
                    <div className="text-center space-y-8">
                        {/* Welcome Header */}
                        <div className="space-y-4">
                            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/50 animate-pulse">
                                <Sparkles className="w-10 h-10 text-white" />
                            </div>
                            <h1 className="text-4xl font-bold text-white">
                                Bem-vindo ao Poker Circuit! 🎉
                            </h1>
                            <p className="text-xl text-gray-300">
                                Escolha como você quer começar
                            </p>
                        </div>

                        {/* 3 Main Options */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                            {/* Option 1: Quick Game */}
                            <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-2 border-green-500/30 rounded-xl p-6 space-y-4 hover:border-green-500/50 transition-all hover:scale-105">
                                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                                    <Play className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-white">🎲 Jogo Rápido</h3>
                                <p className="text-sm text-gray-300">
                                    Perfeito para começar!<br />
                                    Configure em 2 minutos
                                </p>
                                <ul className="text-xs text-gray-400 text-left space-y-1">
                                    <li>✓ Configuração simples</li>
                                    <li>✓ Sem ranking permanente</li>
                                    <li>✓ Ideal para testar</li>
                                </ul>
                                <Button
                                    onClick={handleQuickStart}
                                    loading={loading}
                                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                                >
                                    <span>Começar Agora</span>
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </div>

                            {/* Option 2: Create Championship */}
                            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-2 border-purple-500/30 rounded-xl p-6 space-y-4 hover:border-purple-500/50 transition-all hover:scale-105">
                                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                                    <Trophy className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-white">🏆 Campeonato</h3>
                                <p className="text-sm text-gray-300">
                                    Organize torneios<br />
                                    com múltiplas rodadas
                                </p>
                                <ul className="text-xs text-gray-400 text-left space-y-1">
                                    <li>✓ Ranking completo</li>
                                    <li>✓ Várias rodadas</li>
                                    <li>✓ Configurações avançadas</li>
                                </ul>
                                <Button
                                    onClick={handleCreateChampionship}
                                    variant="secondary"
                                    className="w-full"
                                >
                                    <span>Criar Campeonato</span>
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </div>

                            {/* Option 3: Join Championship */}
                            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-2 border-blue-500/30 rounded-xl p-6 space-y-4 hover:border-blue-500/50 transition-all hover:scale-105">
                                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                                    <Users className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-white">👥 Entrar</h3>
                                <p className="text-sm text-gray-300">
                                    Tem um código?<br />
                                    Entre em um torneio
                                </p>
                                <ul className="text-xs text-gray-400 text-left space-y-1">
                                    <li>✓ Use código de acesso</li>
                                    <li>✓ Participe como jogador</li>
                                    <li>✓ Acompanhe ranking</li>
                                </ul>
                                <Button
                                    onClick={handleJoinChampionship}
                                    variant="secondary"
                                    className="w-full"
                                >
                                    <span>Usar Código</span>
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Skip Option */}
                        <div className="pt-4">
                            <button
                                onClick={handleSkip}
                                className="text-gray-400 hover:text-white transition-colors underline text-sm"
                            >
                                Pular e explorar por conta própria
                            </button>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
