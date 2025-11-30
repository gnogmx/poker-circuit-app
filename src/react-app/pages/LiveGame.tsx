import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useApi, apiRequest } from '@/react-app/hooks/useApi';
import { TournamentSettings } from '@/shared/types';
import Layout from '@/react-app/components/Layout';
import Card, { CardHeader, CardContent } from '@/react-app/components/Card';
import Button from '@/react-app/components/Button';
import Input from '@/react-app/components/Input';
import { Play, Pause, ChevronUp, ChevronDown, X, Coffee, Users, Trophy, CheckCircle } from 'lucide-react';

interface GamePlayer {
  id: number;
  name: string;
  position: number | null;
  isActive: boolean;
  eliminatedAt: number | null;
  rebuys: number;
  knockout_earnings: number;
}

interface ActiveRound {
  id: number;
  round_number: number;
  round_type: string;
  buy_in_value: number | null;
  rebuy_value: number | null;
  knockout_value: number | null;
  is_started: number;
  rebuy_deadline_passed: number;
  players: Array<{ id: number; name: string }>;
  results: Array<unknown>;
}

export default function LiveGame() {
  const navigate = useNavigate();
  const { data: activeRound, refresh: refreshRound } = useApi<ActiveRound | null>('/api/rounds/active');
  const { data: settings } = useApi<TournamentSettings>('/api/tournament-settings');

  const [gamePlayers, setGamePlayers] = useState<GamePlayer[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [blindLevels, setBlindLevels] = useState<string[]>([]);
  const [nextPosition, setNextPosition] = useState(1);
  const [showEliminateDialog, setShowEliminateDialog] = useState(false);
  const [playerToEliminate, setPlayerToEliminate] = useState<GamePlayer | null>(null);
  const [eliminatorId, setEliminatorId] = useState<string>('');
  const [eliminationKnockout, setEliminationKnockout] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [hasPlayedWarning, setHasPlayedWarning] = useState(false);
  const [hasPlayedLevelUp, setHasPlayedLevelUp] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [showPrizeModal, setShowPrizeModal] = useState(false);
  const [prizeDistribution, setPrizeDistribution] = useState<{
    total: number;
    grossTotal: number;
    finalTableAmount: number;
    totalEntries: number;
    buyInValue: number;
    first: { name: string; amount: number; id: number };
    second: { name: string; amount: number; id: number };
    third: { name: string; amount: number; id: number };
  } | null>(null);

  const intervalRef = useRef<number | null>(null);
  const warningAudioRef = useRef<HTMLAudioElement | null>(null);
  const levelUpAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio elements for alerts
    warningAudioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZRBAMTJ7i7bNiHQU7k9n0yoIsBS+Ax/LaiDcIGmi96+ebSw8MTp/k7bFhHAU7ktj0zIQrBCyAy/Lbhj0IGmi76+iaUhELTaDk7bNiHQU+ktf0y4MtBCt/x/LciDkHGWi+6+maTBEMT5/l7LJjHQQ/ktj0yoMrBSuAyPLbhj0IF2i76+iaTRELUKDl7bFhHAU7k9j0yoQrBCx/xvLdiDkHGGi+6+maUhEMTZ/k7bFiHQU7k9n0yoMsBCuAx/LbiDkHGGi+6+maTBEMTZ/k7bNiHQU6k9f0yoMtBCuAx/LciDgHGGi+6+maTBEMTp/l7LJiHQU7k9j0yoMrBSuAyPLbhj0IF2i76+mZTBEMT5/k7bNiHQU/k9j0yoMrBSuAx/LciDgHGGi+6+maTBEMT5/k7bNiHQU/k9j0yoMrBSuAx/LciDgHGGi+6+maTBEMT5/k7bNiHQU/k9j0yoMrBSuAx/LciDgHGGi+6+maTBEMT5/k7bNiHQU/k9j0yoMrBSuAx/LciDgHGGi+6+maTBEMT5/k7bNiHQU/k9j0yoMrBSuAx/LciDgHGGi+6+maTBEMT5/k7bNiHQU/k9j0yoMrBSuAx/LciDgHGGi+6+maTBEMT5/k7bNiHQU/k9j0yoMrBSuAx/LciDgHGGi+6+maTBEMT5/k7bNiHQU/k9j0yoMrBSuAx/LciDgHGGi+6+maTBEMT5/k7bNiHQU/k9j0yoMrBSuAx/LciDgHGGi+6+maTBEMT5/k7bNiHQU/k9j0yoMrBSuAx/LciDgHGGi+6+maTBEMT5/k7bNiHQU/k9j0yoMrBSuAx/LciDgHGGi+6+maTBEMT5/k7bNiHQU/k9j0yoMrBSuAx/LciDgHGGi+6+maTBEMT5/k7Q==');
    levelUpAudioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZRBAMTJ7i7bNiHQU7k9n0yoIsBS+Ax/LaiDcIGmi96+ebSw8MTp/k7bFhHAU7ktj0zIQrBCyAy/Lbhj0IGmi76+iaUhELTaDk7bNiHQU+ktf0y4MtBCt/x/LciDkHGWi+6+maTBEMT5/l7LJjHQQ/ktj0yoMrBSuAyPLbhj0IF2i76+iaTRELUKDl7bFhHAU7k9j0yoQrBCx/xvLdiDkHGGi+6+maUhEMTZ/k7bFiHQU7k9n0yoMsBCuAx/LbiDkHGGi+6+maTBEMTZ/k7bNiHQU6k9f0yoMtBCuAx/LciDgHGGi+6+maTBEMTp/l7LJiHQU7k9j0yoMrBSuAyPLbhj0IF2i76+mZTBEMT5/k7bNiHQU/k9j0yoMrBSuAx/LciDgHGGi+6+maTBEMT5/k7bNiHQU/k9j0yoMrBSuAx/LciDgHGGi+6+maTBEMT5/k7bNiHQU/k9j0yoMrBSuAx/LciDgHGGi+6+maTBEMT5/k7bNiHQU/k9j0yoMrBSuAx/LciDgHGGi+6+maTBEMT5/k7bNiHQU/k9j0yoMrBSuAx/LciDgHGGi+6+maTBEMT5/k7bNiHQU/k9j0yoMrBSuAx/LciDgHGGi+6+maTBEMT5/k7bNiHQU/k9j0yoMrBSuAx/LciDgHGGi+6+maTBEMT5/k7bNiHQU/k9j0yoMrBSuAx/LciDgHGGi+6+maTBEMT5/k7bNiHQU/k9j0yoMrBSuAx/LciDgHGGi+6+maTBEMT5/k7bNiHQU/k9j0yoMrBSuAx/LciDgHGGi+6+maTBEMT5/k7bNiHQU/k9j0yoMrBSuAx/LciDgHGGi+6+maTBEMT5/k7Q==');
  }, []);

  useEffect(() => {
    if (settings) {
      const levels = settings.blind_levels.split(',').map(l => l.trim());
      setBlindLevels(levels);
      setTimeRemaining(settings.blind_level_duration * 60);
    }
  }, [settings]);

  useEffect(() => {
    if (activeRound && activeRound.players) {
      const initialPlayers = activeRound.players.map(p => ({
        id: p.id,
        name: p.name,
        position: null,
        isActive: true,
        eliminatedAt: null,
        rebuys: 0,
        knockout_earnings: 0,
      }));
      setGamePlayers(initialPlayers);
      setNextPosition(initialPlayers.length);
    }
  }, [activeRound]);

  useEffect(() => {
    if (activeRound && activeRound.is_started && !isPaused) {
      intervalRef.current = window.setInterval(() => {
        setTimeRemaining((prev) => {
          // Play warning sound at 1 minute remaining
          if (prev === 60 && !hasPlayedWarning && warningAudioRef.current) {
            warningAudioRef.current.play().catch(() => { });
            setHasPlayedWarning(true);
            setIsFlashing(true);
          }

          if (prev <= 1) {
            // Play level up sound
            if (!hasPlayedLevelUp && levelUpAudioRef.current) {
              levelUpAudioRef.current.play().catch(() => { });
              setHasPlayedLevelUp(true);
            }

            setIsFlashing(true);
            setTimeout(() => setIsFlashing(false), 3000);

            setCurrentLevel((level) => {
              const nextLevel = level + 1;
              if (nextLevel < blindLevels.length) {
                setHasPlayedWarning(false);
                setHasPlayedLevelUp(false);

                // Check if we've passed the break level to mark rebuy deadline
                const currentLevelText = blindLevels[nextLevel];
                if (isBreakLevel(currentLevelText) && activeRound && !activeRound.rebuy_deadline_passed) {
                  apiRequest(`/api/rounds/${activeRound.id}/rebuy-deadline`, {
                    method: 'POST',
                  }).then(() => refreshRound());
                }

                return nextLevel;
              }
              return level;
            });
            return settings ? settings.blind_level_duration * 60 : prev;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [activeRound, isPaused, settings, blindLevels.length, hasPlayedWarning, hasPlayedLevelUp]);

  // Auto-complete round when all players are inactive (game over)
  useEffect(() => {
    const activeCount = gamePlayers.filter(p => p.isActive).length;
    const totalCount = gamePlayers.length;

    if (totalCount > 0 && activeCount === 0 && !completing && !showPrizeModal && activeRound) {
      // Small delay to ensure state is settled and UI updates
      const timer = setTimeout(() => {
        handleCompleteRound(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [gamePlayers, completing, showPrizeModal, activeRound]);

  useEffect(() => {
    if (timeRemaining > 60) {
      setIsFlashing(false);
    }
  }, [timeRemaining]);

  const handleStartGame = async () => {
    if (!activeRound) return;

    try {
      setStarting(true);
      await apiRequest(`/api/rounds/${activeRound.id}/start`, {
        method: 'POST',
      });
      refreshRound();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao iniciar jogo';
      alert(message);
    } finally {
      setStarting(false);
    }
  };

  const handleEliminateClick = (player: GamePlayer) => {
    setPlayerToEliminate(player);
    setEliminatorId('');
    setEliminationKnockout(activeRound?.knockout_value || 0);
    setShowEliminateDialog(true);
  };

  const handleConfirmEliminate = () => {
    if (!playerToEliminate) return;

    const currentActivePlayers = gamePlayers.filter(p => p.isActive);

    // If only 2 active players and eliminating one, assign position 2 to eliminated and position 1 to remaining
    if (currentActivePlayers.length === 2) {
      const otherPlayer = currentActivePlayers.find(p => p.id !== playerToEliminate.id);

      setGamePlayers(prev => prev.map(p => {
        if (p.id === playerToEliminate.id) {
          return {
            ...p,
            position: 2,
            isActive: false,
            eliminatedAt: Date.now(),
          };
        } else if (otherPlayer && p.id === otherPlayer.id) {
          // If there's an eliminator (which must be the other player in heads-up), credit them
          // But in heads-up, the winner is the eliminator.
          // If I selected an eliminator for the 2nd place, it must be the 1st place.
          // So we add knockout earnings to the winner (position 1).
          const knockoutBonus = eliminatorId && parseInt(eliminatorId) === p.id ? eliminationKnockout : 0;

          return {
            ...p,
            position: 1,
            isActive: false,
            eliminatedAt: Date.now(),
            knockout_earnings: p.knockout_earnings + knockoutBonus,
          };
        }
        return p;
      }));
      setNextPosition(0);

      // All players eliminated, auto-complete will be triggered by useEffect
      setShowEliminateDialog(false);
      setPlayerToEliminate(null);
      setIsPaused(true);
    } else {
      setGamePlayers(prev => prev.map(p => {
        // Update eliminated player
        if (p.id === playerToEliminate.id) {
          return {
            ...p,
            position: nextPosition,
            isActive: false,
            eliminatedAt: Date.now(),
          };
        }

        // Update eliminator if selected
        if (eliminatorId && p.id === parseInt(eliminatorId)) {
          return {
            ...p,
            knockout_earnings: p.knockout_earnings + eliminationKnockout,
          };
        }

        return p;
      }));
      setNextPosition(prev => prev - 1);

      setShowEliminateDialog(false);
      setPlayerToEliminate(null);
    }
  };

  const handleRebuy = () => {
    if (!playerToEliminate) return;

    setGamePlayers(prev => prev.map(p =>
      p.id === playerToEliminate.id
        ? { ...p, rebuys: p.rebuys + 1 }
        : p
    ));
    setShowEliminateDialog(false);
    setPlayerToEliminate(null);
  };

  const handleRestorePlayer = (playerId: number) => {
    const player = gamePlayers.find(p => p.id === playerId);
    if (!player || !player.position) return;

    setGamePlayers(prev => prev.map(p =>
      p.id === playerId
        ? { ...p, position: null, isActive: true, eliminatedAt: null, rebuys: p.rebuys, knockout_earnings: 0 }
        : p
    ));
    setNextPosition(prev => prev + 1);
  };

  const handleLevelUp = () => {
    if (currentLevel < blindLevels.length - 1) {
      setCurrentLevel(prev => prev + 1);
      setTimeRemaining(settings ? settings.blind_level_duration * 60 : 0);
      setHasPlayedWarning(false);
      setHasPlayedLevelUp(false);
    }
  };

  const handleLevelDown = () => {
    if (currentLevel > 0) {
      setCurrentLevel(prev => prev - 1);
      setTimeRemaining(settings ? settings.blind_level_duration * 60 : 0);
      setHasPlayedWarning(false);
      setHasPlayedLevelUp(false);
    }
  };

  const handleCompleteRound = async (autoComplete = false) => {
    if (!activeRound || !settings) return;

    const activePlayersNow = gamePlayers.filter(p => p.isActive);

    // Skip confirmations if auto-completing
    if (!autoComplete) {
      if (activePlayersNow.length > 1) {
        if (!confirm(`Ainda há ${activePlayersNow.length} jogadores ativos. Deseja finalizar mesmo assim?`)) {
          return;
        }
      }

      if (!confirm('Tem certeza que deseja finalizar esta rodada? As posições serão salvas e não poderão ser alteradas.')) {
        return;
      }
    }

    try {
      setCompleting(true);

      // Calculate prize distribution
      const buyInValue = activeRound.buy_in_value || settings.default_buy_in || 600;
      const rebuyValue = activeRound.rebuy_value || settings.default_buy_in || 600;

      const totalRebuys = gamePlayers.reduce((sum, p) => sum + p.rebuys, 0);
      const totalPlayers = gamePlayers.length;
      const totalEntries = totalPlayers + totalRebuys;

      // Calculate prize pool breakdown
      const finalTablePercentage = settings.final_table_percentage || 33.33;
      const finalTableFixedValue = settings.final_table_fixed_value || 0;

      const grossPrizePool = (totalPlayers * buyInValue) + (totalRebuys * rebuyValue);

      let finalTableAmount = 0;
      if (finalTableFixedValue > 0) {
        finalTableAmount = finalTableFixedValue;
      } else {
        finalTableAmount = grossPrizePool * (finalTablePercentage / 100);
      }

      const netPrizePool = Math.max(0, grossPrizePool - finalTableAmount);

      const firstPlacePercentage = settings.first_place_percentage || 60;
      const secondPlacePercentage = settings.second_place_percentage || 30;
      const thirdPlacePercentage = settings.third_place_percentage || 10;

      const firstPlace = gamePlayers.find(p => p.position === 1);
      const secondPlace = gamePlayers.find(p => p.position === 2);
      const thirdPlace = gamePlayers.find(p => p.position === 3);

      if (firstPlace && secondPlace && thirdPlace) {
        setPrizeDistribution({
          total: netPrizePool,
          grossTotal: grossPrizePool,
          finalTableAmount: finalTableAmount,
          totalEntries: totalEntries,
          buyInValue: buyInValue,
          first: {
            name: firstPlace.name,
            amount: netPrizePool * (firstPlacePercentage / 100),
            id: firstPlace.id
          },
          second: {
            name: secondPlace.name,
            amount: netPrizePool * (secondPlacePercentage / 100),
            id: secondPlace.id
          },
          third: {
            name: thirdPlace.name,
            amount: netPrizePool * (thirdPlacePercentage / 100),
            id: thirdPlace.id
          },
        });
        setShowPrizeModal(true);
      } else {
        // If not enough players for prizes, just complete
        await confirmAndCompleteRound([]);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao calcular prêmios';
      alert(message);
    } finally {
      setCompleting(false);
    }
  };

  const confirmAndCompleteRound = async (prizes: { playerId: number; amount: number }[]) => {
    if (!activeRound) return;

    try {
      setCompleting(true);

      const results = gamePlayers
        .filter(p => !p.isActive && p.position !== null)
        .map(p => {
          const prize = prizes.find(pr => pr.playerId === p.id)?.amount || 0;
          return {
            player_id: p.id,
            position: p.position!,
            rebuys: p.rebuys,
            knockout_earnings: p.knockout_earnings,
            prize: prize
          };
        });

      await apiRequest(`/api/rounds/${activeRound.id}/complete`, {
        method: 'POST',
        body: JSON.stringify({ results }),
      });

      setShowPrizeModal(false);
      navigate('/rounds');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao finalizar rodada';
      alert(message);
    } finally {
      setCompleting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isBreakLevel = (level: string) => {
    return level.toUpperCase().includes('BREAK') || level.toUpperCase().includes('INTERVALO');
  };

  const getNextNonBreakLevel = () => {
    for (let i = currentLevel + 1; i < blindLevels.length; i++) {
      if (!isBreakLevel(blindLevels[i])) {
        return { level: blindLevels[i], index: i };
      }
    }
    return null;
  };

  const getBreakInfo = () => {
    let totalMinutes = 0;
    for (let i = currentLevel + 1; i < blindLevels.length; i++) {
      if (isBreakLevel(blindLevels[i])) {
        return { hasBreak: true, minutesUntilBreak: totalMinutes };
      }
      totalMinutes += settings?.blind_level_duration || 0;
    }
    return { hasBreak: false, minutesUntilBreak: 0 };
  };

  const activePlayers = gamePlayers.filter(p => p.isActive);
  const eliminatedPlayers = gamePlayers.filter(p => !p.isActive).sort((a, b) => (a.position || 0) - (b.position || 0));
  const currentLevelText = blindLevels[currentLevel] || '---';
  const nextLevelInfo = getNextNonBreakLevel();
  const breakInfo = getBreakInfo();

  if (!activeRound) {
    return (
      <Layout>
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-white">Jogo ao Vivo</h2>
            <p className="text-gray-400 mt-1">Nenhuma rodada ativa no momento</p>
          </div>

          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <p className="text-gray-400">
                  Crie uma nova rodada na aba "Rodadas" para começar
                </p>
                <Button onClick={() => navigate('/rounds')}>
                  Ir para Rodadas
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const maxRebuys = activeRound.round_type === 'regular' ? 2 : 0;
  const canRebuy = activeRound.round_type === 'regular' && !activeRound.rebuy_deadline_passed;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white">Rodada {activeRound.round_number}</h2>
            <p className="text-gray-400 mt-1">
              {activeRound.round_type === 'regular' ? 'Regular' : activeRound.round_type === 'freezeout' ? 'Freeze Out' : 'Knockout'}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {!activeRound.is_started ? (
              <Button onClick={handleStartGame} loading={starting}>
                <Play className="w-5 h-5" />
                <span>Iniciar Jogo</span>
              </Button>
            ) : (
              <Button onClick={() => setIsPaused(!isPaused)}>
                {isPaused ? (
                  <>
                    <Play className="w-5 h-5" />
                    <span>Continuar</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-5 h-5" />
                    <span>Pausar</span>
                  </>
                )}
              </Button>
            )}
            <Button
              variant="primary"
              onClick={() => handleCompleteRound(false)}
              loading={completing}
              disabled={eliminatedPlayers.length === 0}
            >
              <CheckCircle className="w-4 h-4" />
              <span>Finalizar Rodada</span>
            </Button>
          </div>
        </div>

        {/* Main Blind Display */}
        <Card className={`bg-gradient-to-br from-purple-500/20 to-pink-500/20 transition-all duration-300 ${isFlashing ? 'ring-4 ring-yellow-400 shadow-2xl shadow-yellow-400/50' : ''
          }`}>
          <CardContent className="py-12">
            <div className="text-center space-y-6">
              <div className="text-gray-300 text-sm font-medium uppercase tracking-wider">
                Nível {currentLevel + 1}
              </div>

              {/* Timer */}
              <div className={`text-7xl md:text-9xl font-bold font-mono tracking-tight transition-colors ${timeRemaining <= 60 ? 'text-orange-400 animate-pulse' : 'text-white'
                }`}>
                {formatTime(timeRemaining)}
              </div>

              {/* Current Blinds */}
              {isBreakLevel(currentLevelText) ? (
                <div className="flex items-center justify-center space-x-3">
                  <Coffee className="w-12 h-12 text-orange-400" />
                  <div className="text-5xl md:text-7xl font-bold text-orange-400">
                    INTERVALO
                  </div>
                </div>
              ) : (
                <div className="text-5xl md:text-7xl font-bold text-white">
                  {currentLevelText}
                </div>
              )}

              {/* Next Level Info */}
              {nextLevelInfo && (
                <div className="text-gray-300 text-lg">
                  Próximo: <span className="text-white font-semibold">{nextLevelInfo.level}</span>
                  {breakInfo.hasBreak && (
                    <span className="text-orange-400 ml-2">
                      (intervalo em {breakInfo.minutesUntilBreak} min)
                    </span>
                  )}
                </div>
              )}

              {/* Players Remaining */}
              <div className="flex items-center justify-center space-x-6 text-gray-300 text-lg">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-green-400" />
                  <span>
                    {activePlayers.length} de {gamePlayers.length} jogadores
                  </span>
                </div>
              </div>

              {/* Level Controls */}
              {activeRound.is_started && (
                <div className="flex items-center justify-center space-x-4 pt-4">
                  <Button variant="secondary" onClick={handleLevelDown} disabled={currentLevel === 0}>
                    <ChevronDown className="w-5 h-5" />
                    <span>Nível Anterior</span>
                  </Button>
                  <Button variant="secondary" onClick={handleLevelUp} disabled={currentLevel === blindLevels.length - 1}>
                    <ChevronUp className="w-5 h-5" />
                    <span>Próximo Nível</span>
                  </Button>
                </div>
              )}

              {timeRemaining <= 60 && timeRemaining > 0 && activeRound.is_started && (
                <div className="text-orange-400 font-semibold text-lg animate-pulse">
                  Último minuto!
                </div>
              )}

              {!activeRound.is_started && (
                <div className="text-yellow-400 font-semibold text-lg">
                  Clique em "Iniciar Jogo" para começar o cronômetro
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Active Players */}
        {activeRound.is_started && (
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-green-400" />
                <h3 className="text-xl font-semibold text-white">
                  Jogadores Ativos ({activePlayers.length})
                </h3>
              </div>
            </CardHeader>
            <CardContent>
              {activePlayers.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  Todos os jogadores foram eliminados
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activePlayers.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <div>
                        <span className="text-white font-medium">{player.name}</span>
                        {player.rebuys > 0 && (
                          <div className="text-xs text-gray-400">
                            {player.rebuys} recompra{player.rebuys > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="danger"
                        onClick={() => handleEliminateClick(player)}
                        className="!px-3 !py-1"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Eliminated Players - Shown in order (1st place at top) */}
        {eliminatedPlayers.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <h3 className="text-xl font-semibold text-white">
                  Classificação Final ({eliminatedPlayers.length})
                </h3>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {eliminatedPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">{player.position}º</span>
                      </div>
                      <div>
                        <span className="text-white font-medium block">{player.name}</span>
                        {player.rebuys > 0 && (
                          <span className="text-gray-400 text-xs">
                            {player.rebuys} recompra{player.rebuys > 1 ? 's' : ''}
                          </span>
                        )}
                        {player.knockout_earnings > 0 && (
                          <span className="text-green-400 text-xs block">
                            Knockout: $ {player.knockout_earnings.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => handleRestorePlayer(player.id)}
                      className="!px-3 !py-1"
                    >
                      Restaurar
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Prize Distribution Modal */}
      {showPrizeModal && prizeDistribution && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <Card className="max-w-2xl w-full my-8">
            <CardHeader>
              <div className="relative text-center">
                <button
                  onClick={() => {
                    setShowPrizeModal(false);
                    navigate('/rounds');
                  }}
                  className="absolute -top-2 -right-2 p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-2xl font-bold text-white mb-2">Premiação da Rodada</h3>
                <p className="text-gray-400">Parabéns aos vencedores!</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="text-center py-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-gray-400 text-xs mb-1">Total Arrecadado</div>
                  <div className="text-2xl font-bold text-white">
                    $ {prizeDistribution.grossTotal.toFixed(2)}
                  </div>
                  <div className="text-gray-400 text-xs mt-1">
                    {prizeDistribution.totalEntries} entradas × $ {prizeDistribution.buyInValue.toFixed(2)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center py-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
                    <div className="text-orange-300 text-xs mb-1">Mesa Final</div>
                    <div className="text-xl font-bold text-orange-400">
                      $ {prizeDistribution.finalTableAmount.toFixed(2)}
                    </div>
                  </div>

                  <div className="text-center py-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg border border-green-500/30">
                    <div className="text-gray-300 text-xs mb-1">Premiação Rodada</div>
                    <div className="text-xl font-bold text-green-400">
                      $ {prizeDistribution.total.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-lg border border-yellow-500/30">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">1º</span>
                    </div>
                    <div>
                      <div className="text-white font-semibold">{prizeDistribution.first.name}</div>
                      <div className="text-yellow-300 text-sm">Campeão</div>
                    </div>
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    value={prizeDistribution.first.amount}
                    onChange={(e) => setPrizeDistribution({
                      ...prizeDistribution,
                      first: { ...prizeDistribution.first, amount: parseFloat(e.target.value) || 0 }
                    })}
                    className="w-32 text-right font-bold text-yellow-400 bg-black/20 border-yellow-500/30"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-400/20 to-gray-500/20 rounded-lg border border-gray-400/30">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">2º</span>
                    </div>
                    <div>
                      <div className="text-white font-semibold">{prizeDistribution.second.name}</div>
                      <div className="text-gray-300 text-sm">Vice-Campeão</div>
                    </div>
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    value={prizeDistribution.second.amount}
                    onChange={(e) => setPrizeDistribution({
                      ...prizeDistribution,
                      second: { ...prizeDistribution.second, amount: parseFloat(e.target.value) || 0 }
                    })}
                    className="w-32 text-right font-bold text-gray-300 bg-black/20 border-gray-400/30"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-600/20 to-orange-700/20 rounded-lg border border-orange-600/30">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">3º</span>
                    </div>
                    <div>
                      <div className="text-white font-semibold">{prizeDistribution.third.name}</div>
                      <div className="text-orange-300 text-sm">Terceiro Lugar</div>
                    </div>
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    value={prizeDistribution.third.amount}
                    onChange={(e) => setPrizeDistribution({
                      ...prizeDistribution,
                      third: { ...prizeDistribution.third, amount: parseFloat(e.target.value) || 0 }
                    })}
                    className="w-32 text-right font-bold text-orange-400 bg-black/20 border-orange-600/30"
                  />
                </div>
              </div>

              {/* Prize Total Validation */}
              <div className={`p-4 rounded-lg border ${Math.abs((prizeDistribution.first.amount + prizeDistribution.second.amount + prizeDistribution.third.amount) - prizeDistribution.total) < 0.01
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-red-500/10 border-red-500/30'
                }`}>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 font-medium">Soma dos Prêmios:</span>
                  <span className={`font-bold text-xl ${Math.abs((prizeDistribution.first.amount + prizeDistribution.second.amount + prizeDistribution.third.amount) - prizeDistribution.total) < 0.01
                    ? 'text-green-400'
                    : 'text-red-400'
                    }`}>
                    $ {(prizeDistribution.first.amount + prizeDistribution.second.amount + prizeDistribution.third.amount).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-gray-400 text-sm">Total Disponível:</span>
                  <span className="text-gray-300 font-semibold">$ {prizeDistribution.total.toFixed(2)}</span>
                </div>
                {Math.abs((prizeDistribution.first.amount + prizeDistribution.second.amount + prizeDistribution.third.amount) - prizeDistribution.total) >= 0.01 && (
                  <div className="mt-2 text-red-400 text-sm text-center">
                    ⚠️ A soma dos prêmios deve ser igual ao total disponível!
                  </div>
                )}
              </div>

              <div className="pt-4">
                <Button
                  onClick={() => confirmAndCompleteRound([
                    { playerId: prizeDistribution.first.id, amount: prizeDistribution.first.amount },
                    { playerId: prizeDistribution.second.id, amount: prizeDistribution.second.amount },
                    { playerId: prizeDistribution.third.id, amount: prizeDistribution.third.amount },
                  ])}
                  className="w-full"
                  loading={completing}
                  disabled={Math.abs((prizeDistribution.first.amount + prizeDistribution.second.amount + prizeDistribution.third.amount) - prizeDistribution.total) >= 0.01}
                >
                  Confirmar e Finalizar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Eliminate Dialog */}
      {showEliminateDialog && playerToEliminate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Jogador Eliminado</h3>
                <button
                  onClick={() => setShowEliminateDialog(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-4">
                <div className="text-gray-300 mb-2">Jogador:</div>
                <div className="text-2xl font-bold text-white mb-4">{playerToEliminate.name}</div>
                {playerToEliminate.rebuys > 0 && (
                  <div className="text-sm text-gray-400 mb-2">
                    Recompras até agora: {playerToEliminate.rebuys}
                  </div>
                )}
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
                  <span className="text-white font-bold text-3xl">{nextPosition}º</span>
                </div>
              </div>

              {activeRound.round_type === 'knockout' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Eliminado por
                    </label>
                    <select
                      value={eliminatorId}
                      onChange={(e) => setEliminatorId(e.target.value)}
                      className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Selecione o jogador...</option>
                      {activePlayers
                        .filter(p => p.id !== playerToEliminate.id)
                        .map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))
                      }
                    </select>
                  </div>

                  {eliminatorId && (
                    <Input
                      label="Valor do Bounty ($)"
                      type="number"
                      step="0.01"
                      min="0"
                      value={eliminationKnockout}
                      onChange={(e) => setEliminationKnockout(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="0.00"
                    />
                  )}
                </div>
              )}

              <div className="space-y-3 pt-4">
                {canRebuy && playerToEliminate.rebuys < maxRebuys && (
                  <Button onClick={handleRebuy} className="w-full" variant="secondary">
                    Fazer Recompra e Continuar
                  </Button>
                )}
                <Button onClick={handleConfirmEliminate} className="w-full">
                  Confirmar Eliminação
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowEliminateDialog(false)}
                  className="w-full"
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
      }
    </Layout >
  );
}
