import { Trophy } from 'lucide-react';
import { RankingEntry } from '@/shared/types';

interface ChampionshipPodiumModalProps {
    isOpen: boolean;
    onClose: () => void;
    topPlayers: RankingEntry[];
    onViewFinalTable: () => void;
}

export default function ChampionshipPodiumModal({
    isOpen,
    onClose,
    topPlayers,
    onViewFinalTable,
}: ChampionshipPodiumModalProps) {
    if (!isOpen) return null;

    const first = topPlayers[0];
    const second = topPlayers[1];
    const third = topPlayers[2];

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-purple-900/90 to-pink-900/90 rounded-2xl shadow-2xl max-w-2xl w-full border border-purple-500/50 animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="p-8 text-center border-b border-purple-500/30">
                    <div className="mb-4">
                        <Trophy className="w-16 h-16 mx-auto text-yellow-400 animate-bounce" />
                    </div>
                    <h2 className="text-4xl font-bold text-white mb-2">
                        🎉 Parabéns aos Campeões! 🎉
                    </h2>
                    <p className="text-purple-200">
                        O campeonato foi finalizado com sucesso!
                    </p>
                </div>

                {/* Podium */}
                <div className="p-8">
                    <div className="flex items-end justify-center gap-4 mb-8">
                        {/* 2nd Place */}
                        {second && (
                            <div className="flex flex-col items-center flex-1">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center mb-3 ring-4 ring-gray-400/50 shadow-xl">
                                    <span className="text-3xl">🥈</span>
                                </div>
                                <div className="bg-gradient-to-br from-gray-400/20 to-gray-500/20 rounded-lg p-4 w-full text-center border border-gray-400/30">
                                    <div className="text-gray-300 text-sm font-semibold mb-1">2º Lugar</div>
                                    <div className="text-white font-bold text-lg truncate">{second.player_name}</div>
                                    <div className="text-gray-300 text-sm mt-1">{second.total_points} pts</div>
                                </div>
                            </div>
                        )}

                        {/* 1st Place */}
                        {first && (
                            <div className="flex flex-col items-center flex-1 -mt-8">
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 flex items-center justify-center mb-3 ring-4 ring-yellow-400/50 shadow-2xl animate-pulse">
                                    <span className="text-4xl">🥇</span>
                                </div>
                                <div className="bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 rounded-lg p-4 w-full text-center border border-yellow-400/30">
                                    <div className="text-yellow-300 text-sm font-semibold mb-1">🏆 1º Lugar 🏆</div>
                                    <div className="text-white font-bold text-xl truncate">{first.player_name}</div>
                                    <div className="text-yellow-300 text-sm mt-1">{first.total_points} pts</div>
                                </div>
                            </div>
                        )}

                        {/* 3rd Place */}
                        {third && (
                            <div className="flex flex-col items-center flex-1">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-700 flex items-center justify-center mb-3 ring-4 ring-orange-500/50 shadow-xl">
                                    <span className="text-3xl">🥉</span>
                                </div>
                                <div className="bg-gradient-to-br from-orange-400/20 to-orange-600/20 rounded-lg p-4 w-full text-center border border-orange-400/30">
                                    <div className="text-orange-300 text-sm font-semibold mb-1">3º Lugar</div>
                                    <div className="text-white font-bold text-lg truncate">{third.player_name}</div>
                                    <div className="text-orange-300 text-sm mt-1">{third.total_points} pts</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-purple-500/30 flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={onViewFinalTable}
                        className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg"
                    >
                        Ver Classificados para Mesa Final →
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition-all"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}
