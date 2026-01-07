import { DollarSign, Users } from 'lucide-react';
import { RankingEntry } from '@/shared/types';

interface FinalTableModalProps {
    isOpen: boolean;
    onClose: () => void;
    rankings: RankingEntry[];
    prizePool: number;
    topPlayersCount: number;
}

export default function FinalTableModal({
    isOpen,
    onClose,
    rankings,
    prizePool,
    topPlayersCount,
}: FinalTableModalProps) {
    if (!isOpen) return null;

    // Filter top N players
    const qualifiedPlayers = rankings.slice(0, topPlayersCount);

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full border border-white/10 animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-8 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-t-2xl">
                    <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30">
                            <DollarSign className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-white">Mesa Final</h2>
                            <p className="text-green-400 font-semibold text-lg">
                                Prêmio Acumulado: $ {prizePool.toFixed(0)}
                            </p>
                        </div>
                    </div>
                    <div className="text-right hidden sm:block">
                        <div className="text-gray-400 text-sm">Classificados</div>
                        <div className="text-2xl font-bold text-white flex items-center justify-end gap-2">
                            <Users className="w-6 h-6 text-blue-400" />
                            {qualifiedPlayers.length} / {topPlayersCount}
                        </div>
                    </div>
                </div>

                {/* Content - Scrollable */}
                <div className="p-0 overflow-y-auto flex-1">
                    <table className="w-full">
                        <thead className="bg-white/5 sticky top-0 backdrop-blur-md">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Pos</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Jogador</th>
                                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Pontos</th>
                                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Rodadas</th>
                                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Prêmio Acumulado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {qualifiedPlayers.map((player, index) => {
                                const position = index + 1;
                                const isTop3 = position <= 3;

                                return (
                                    <tr
                                        key={player.player_id}
                                        className={`border-b border-white/5 transition-colors ${isTop3 ? 'bg-yellow-500/5 hover:bg-yellow-500/10' : 'hover:bg-white/5'
                                            }`}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-2">
                                                {position === 1 && <span className="text-2xl">🥇</span>}
                                                {position === 2 && <span className="text-2xl">🥈</span>}
                                                {position === 3 && <span className="text-2xl">🥉</span>}
                                                {position > 3 && (
                                                    <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-gray-300">
                                                        {position}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`font-bold text-lg ${isTop3 ? 'text-yellow-100' : 'text-white'}`}>
                                                {player.player_name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-purple-400 font-bold text-lg">{player.total_points}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center text-gray-400">
                                            {player.rounds_played}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-green-400 font-medium">$ {(player.total_prize || 0).toFixed(0)}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 bg-slate-900/50 rounded-b-2xl flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition-all"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}
