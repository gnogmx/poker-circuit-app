import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useApi, apiRequest } from '@/react-app/hooks/useApi';
import { useChampionship } from '@/react-app/contexts/ChampionshipContext';
import { useLanguage } from '@/react-app/hooks/useLanguage';
import { TournamentSettings } from '@/shared/types';
import Layout from '@/react-app/components/Layout';
import Card, { CardHeader, CardContent } from '@/react-app/components/Card';
import Button from '@/react-app/components/Button';
import Input from '@/react-app/components/Input';
import { Play, Pause, ChevronUp, ChevronDown, CheckCircle, Trophy, Users, X, Coffee, Shuffle, Trash2 } from 'lucide-react';
import ConfirmationModal from '@/react-app/components/ConfirmationModal';
import TableDrawModal from '@/react-app/components/TableDrawModal';

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
  is_final_table?: number;
  players: Array<{ id: number; name: string }>;
  results: Array<unknown>;
  // Timer state from server
  timer_started_at: number | null;
  current_level: number;
  is_paused: number;
  time_remaining_seconds: number;
}

export default function LiveGame() {
  const navigate = useNavigate();
  const { data: activeRound, refresh: refreshRound } = useApi<ActiveRound | null>('/api/rounds/active');
  const { isAdmin, isSingleTournament, currentChampionship } = useChampionship();
  const { data: settings, loading: loadingSettings } = useApi<TournamentSettings>('/api/tournament-settings');
  const { data: prizePool } = useApi<{ final_table_pot: number }>('/api/championships/prize-pool');
  const { t, language } = useLanguage();

  // All hooks must be called before any conditional returns
  const audioUnlockedRef = useRef(false);

  const [gamePlayers, setGamePlayers] = useState<GamePlayer[]>([]);
  const [isPaused, setIsPaused] = useState(true); // Default to paused to prevent jumpy timer before sync
  const [currentLevel, setCurrentLevel] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [blindLevels, setBlindLevels] = useState<string[]>([]);
  const [levelDurations, setLevelDurations] = useState<Record<number, number>>({});
  const [nextPosition, setNextPosition] = useState(1);
  const [showEliminateDialog, setShowEliminateDialog] = useState(false);
  const [playerToEliminate, setPlayerToEliminate] = useState<GamePlayer | null>(null);
  const [eliminatorId, setEliminatorId] = useState<string>('');
  const [eliminationKnockout, setEliminationKnockout] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [lastTriggeredLevel, setLastTriggeredLevel] = useState<number | null>(null);
  const [showPrizeModal, setShowPrizeModal] = useState(false);
  const [prizeDistribution, setPrizeDistribution] = useState<{
    total: number;
    grossTotal: number;
    finalTableAmount: number;
    dealerAmount: number;
    totalEntries: number;
    buyInValue: number;
    prizes: Array<{
      id: number;
      name: string;
      amount: number;
      position: number;
    }>;
    isFinalTable?: boolean;
  } | null>(null);

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

  const [needsAudioActivation, setNeedsAudioActivation] = useState(false);
  const [showTableDrawModal, setShowTableDrawModal] = useState(false);
  const [showFinalTableDrawModal, setShowFinalTableDrawModal] = useState(false);
  const intervalRef = useRef<number | null>(null);
  // Audio element for jingle (MP3 file - iOS/Android compatible)
  const jingleAudioRef = useRef<HTMLAudioElement | null>(null);

  // Global unlock for iOS/Android - Call on ANY interaction
  const unlockAudio = useCallback(() => {
    if (audioUnlockedRef.current) return;

    try {
      // 1. Prime SpeechSynthesis for iOS with a real (but silent) utterance
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(' ');
        utterance.volume = 0;
        utterance.rate = 10; // Extra fast
        window.speechSynthesis.speak(utterance);
        console.log('🎤 Speech primed');
      }

      // 2. Unlock Audio using a DUMMY element to avoid messing with jingleAudioRef
      const dummy = new Audio();
      dummy.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhAAQACABAAAABkYXRhAgAAAAEA';
      dummy.muted = true;
      dummy.play().then(() => {
        dummy.pause();
        console.log('🔓 Audio context unlocked via dummy');
      }).catch(() => { });

      // 3. Just ensure jingle exists and starts loading (NO play/pause here)
      if (!jingleAudioRef.current) {
        jingleAudioRef.current = new Audio('/jingle.mp3');
        jingleAudioRef.current.preload = 'auto';
      }
      jingleAudioRef.current.load();

      audioUnlockedRef.current = true;
    } catch (e) {
      console.warn('Audio unlock failed', e);
    }
  }, []);

  // Get duration for a specific level (uses custom duration if set, otherwise default)
  const getLevelDuration = useCallback((levelIndex: number) => {
    const customDuration = levelDurations[levelIndex];
    if (customDuration !== undefined && customDuration > 0) {
      return customDuration * 60; // Convert minutes to seconds
    }
    return (settings?.blind_level_duration || 15) * 60;
  }, [levelDurations, settings?.blind_level_duration]);

  // Add global listeners for first interaction
  useEffect(() => {
    const handleInteraction = () => {
      unlockAudio();
      setNeedsAudioActivation(false);
    };
    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, [unlockAudio]);

  // Prevent accidental page refresh during active game
  useEffect(() => {
    if (!activeRound?.is_started) return;

    // Block F5, Ctrl+R, Cmd+R keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F5' ||
        (e.ctrlKey && e.key === 'r') ||
        (e.metaKey && e.key === 'r')
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Block pull-to-refresh on mobile (touch devices)
    const handleTouchMove = (e: TouchEvent) => {
      // Only prevent if at top of page and pulling down
      if (window.scrollY === 0 && e.touches[0].clientY > 0) {
        const touch = e.touches[0];
        const startY = touch.clientY;

        const handleTouchEnd = () => {
          document.removeEventListener('touchend', handleTouchEnd);
        };

        // If pulling down from top, prevent default
        if (startY > 50 && document.documentElement.scrollTop === 0) {
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    // Add CSS to prevent overscroll/pull-to-refresh
    document.body.style.overscrollBehavior = 'none';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('touchmove', handleTouchMove);
      document.body.style.overscrollBehavior = '';
    };
  }, [activeRound?.is_started]);

  // iOS/Mac: Show audio activation prompt when entering a game that's already started
  useEffect(() => {
    if (activeRound?.is_started && !audioUnlockedRef.current) {
      // Show for ANY platform if we're in a started round but audio isn't active
      setNeedsAudioActivation(true);
    }
  }, [activeRound?.is_started]);

  // Sync Timer/Level with Server (Absolute Sync to avoid drift)
  useEffect(() => {
    if (activeRound) {
      // Sync pause state
      setIsPaused(!!activeRound.is_paused);
      setCurrentLevel(activeRound.current_level);

      if (activeRound.is_paused) {
        setTimeRemaining(activeRound.time_remaining_seconds);
      } else if (activeRound.timer_started_at) {
        // Calculate remaining time based on absolute start time
        const elapsedMs = Date.now() - activeRound.timer_started_at;
        const elapsedSec = Math.floor(elapsedMs / 1000);
        const remaining = Math.max(0, activeRound.time_remaining_seconds - elapsedSec);

        // Guard: only set remaining if it's not going to trigger a double-level up instantly
        // If it's already at 0, let the timer interval handle the transition once per level
        setTimeRemaining(remaining);
      } else {
        setTimeRemaining(activeRound.time_remaining_seconds);
      }

      console.log(`⏱️ Server Sync: Level ${activeRound.current_level}, Time ${activeRound.time_remaining_seconds}, Paused: ${!!activeRound.is_paused}`);
    }
  }, [activeRound?.id, activeRound?.timer_started_at, activeRound?.is_paused]);

  useEffect(() => {
    // Preload jingle
    if (!jingleAudioRef.current) {
      jingleAudioRef.current = new Audio('/jingle.mp3');
      jingleAudioRef.current.preload = 'auto';
      jingleAudioRef.current.load();
    }

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        console.log('✅ Voices loaded:', voices.length);
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const safeSpeak = (text: string) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();

    setTimeout(() => {
      const voices = window.speechSynthesis.getVoices();
      const currentLang = language;

      let selectedVoice;
      let voiceLang;

      if (currentLang === 'pt') {
        selectedVoice = voices.find(v => v.name.toLowerCase().includes('felipe')) ||
          voices.find(v => v.name.toLowerCase().includes('luciana')) ||
          voices.find(v => v.lang.startsWith('pt'));
        voiceLang = 'pt-BR';
      } else if (currentLang === 'es') {
        selectedVoice = voices.find(v => v.name.toLowerCase().includes('paulina')) ||
          voices.find(v => v.name.toLowerCase().includes('monica')) ||
          voices.find(v => v.lang.startsWith('es'));
        voiceLang = 'es-ES';
      } else {
        selectedVoice = voices.find(v => v.name.toLowerCase().includes('samantha')) ||
          voices.find(v => v.name.toLowerCase().includes('alex')) ||
          voices.find(v => v.lang.startsWith('en'));
        voiceLang = 'en-US';
      }

      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.startsWith(voiceLang.split('-')[0]));
      }

      const utterance = new SpeechSynthesisUtterance(text);
      if (selectedVoice) utterance.voice = selectedVoice;
      utterance.lang = voiceLang;
      utterance.rate = 1.0;

      console.log(`%c 🎤 TTS (${voiceLang}): "${text}"`, 'color: #00ff00; font-size: 14px; font-weight: bold;');
      window.speechSynthesis.speak(utterance);
    }, 100);
  };

  const playLevelUpJingle = (onPlay?: () => void): Promise<void> => {
    return new Promise((resolve) => {
      try {
        if (!jingleAudioRef.current) {
          jingleAudioRef.current = new Audio('/jingle.mp3');
          jingleAudioRef.current.preload = 'auto';
        }

        const audio = jingleAudioRef.current;
        audio.currentTime = 0;
        audio.volume = 1.0;

        let hasTriggeredPlay = false;
        let checkSyncInterval: number | null = null;

        const triggerPlay = () => {
          if (hasTriggeredPlay) return;
          hasTriggeredPlay = true;
          console.log('🎵 Jingle audible start detected');
          if (onPlay) onPlay();
          if (checkSyncInterval) {
            window.clearInterval(checkSyncInterval);
            checkSyncInterval = null;
          }
        };

        const handleEnded = () => {
          cleanup();
          resolve();
        };

        const handleError = (e: any) => {
          console.error('Jingle play error:', e);
          cleanup();
          resolve();
        };

        const cleanup = () => {
          if (checkSyncInterval) {
            window.clearInterval(checkSyncInterval);
            checkSyncInterval = null;
          }
          audio.removeEventListener('playing', triggerPlay);
          audio.removeEventListener('timeupdate', checkTime);
          audio.removeEventListener('ended', handleEnded);
          audio.removeEventListener('error', handleError);
        };

        const checkTime = () => {
          if (audio.currentTime > 0.01) {
            triggerPlay();
          }
        };

        audio.addEventListener('playing', triggerPlay);
        audio.addEventListener('timeupdate', checkTime);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('error', handleError);

        checkSyncInterval = window.setInterval(() => {
          if (audio.currentTime > 0) {
            triggerPlay();
          }
        }, 32);

        console.log('🎵 Requesting jingle play...');
        const playPromise = audio.play();

        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error('Jingle play rejected:', error);
            // Fallback: If audio fails, still trigger the visual effect
            if (onPlay) onPlay();
            cleanup();
            resolve();
          });
        }

        setTimeout(() => {
          if (!hasTriggeredPlay) triggerPlay();
          cleanup();
          resolve();
        }, 5000);
      } catch (e) {
        console.error('Jingle error:', e);
        resolve();
      }
    });
  };

  useEffect(() => {
    if (settings) {
      const levels = settings.blind_levels.split(',').map(l => l.trim());
      setBlindLevels(levels);

      // Load custom level durations
      if (settings.blind_level_durations) {
        const durations = typeof settings.blind_level_durations === 'string'
          ? JSON.parse(settings.blind_level_durations)
          : settings.blind_level_durations;
        // Convert string keys to numbers
        const parsedDurations: Record<number, number> = {};
        Object.entries(durations || {}).forEach(([key, value]) => {
          parsedDurations[parseInt(key)] = value as number;
        });
        setLevelDurations(parsedDurations);
      }

      // Only set initial duration if round is not yet started
      // If started, the server sync effect handles it
      if (!activeRound?.is_started) {
        // Use custom duration for level 0 if set
        const level0Duration = (settings.blind_level_durations as Record<number, number> | undefined)?.[0]
          || settings.blind_level_duration;
        setTimeRemaining(level0Duration * 60);
      }
    }
  }, [settings, activeRound?.is_started]);

  // Load elimination state from server
  const loadEliminationState = useCallback(async () => {
    if (!activeRound?.id) return;
    try {
      const response = await apiRequest(`/api/rounds/${activeRound.id}/elimination-state`) as { elimination_state: GamePlayer[] | null };
      if (response.elimination_state && response.elimination_state.length > 0) {
        setGamePlayers(response.elimination_state);
        const activeCount = response.elimination_state.filter(p => p.isActive).length;
        setNextPosition(activeCount);
      }
    } catch (err) {
      console.error('Failed to load elimination state:', err);
    }
  }, [activeRound?.id]);

  // Save elimination state to server (admin only)
  const saveEliminationState = useCallback(async (players: GamePlayer[]) => {
    if (!activeRound?.id || !isAdmin) return;
    try {
      await apiRequest(`/api/rounds/${activeRound.id}/elimination-state`, {
        method: 'POST',
        body: JSON.stringify({ elimination_state: JSON.stringify(players) }),
      });
    } catch (err) {
      console.error('Failed to save elimination state:', err);
    }
  }, [activeRound?.id, isAdmin]);

  useEffect(() => {
    if (activeRound && activeRound.players && activeRound.players.length > 0) {
      const existingIds = gamePlayers.map(p => p.id).sort().join(',');
      const newIds = activeRound.players.map(p => p.id).sort().join(',');

      if (existingIds !== newIds) {
        // First try to load saved elimination state
        loadEliminationState().then(() => {
          // If no saved state or gamePlayers is still empty, initialize with players
          setGamePlayers(prev => {
            if (prev.length === 0) {
              const initialPlayers = activeRound.players.map(p => ({
                id: p.id,
                name: p.name,
                position: null,
                isActive: true,
                eliminatedAt: null,
                rebuys: 0,
                knockout_earnings: 0,
              }));
              setNextPosition(initialPlayers.length);
              return initialPlayers;
            }
            return prev;
          });
        });
      }
    }
  }, [activeRound, gamePlayers.length, loadEliminationState]);

  // Periodically sync elimination state for non-admin users
  useEffect(() => {
    if (!activeRound?.id || !activeRound.is_started || isAdmin) return;

    const syncInterval = setInterval(() => {
      loadEliminationState();
    }, 5000); // Sync every 5 seconds for non-admin users

    return () => clearInterval(syncInterval);
  }, [activeRound?.id, activeRound?.is_started, isAdmin, loadEliminationState]);

  const updateTimerState = async (updates: {
    is_paused?: boolean;
    current_level?: number;
    timer_started_at?: number | null;
    time_remaining_seconds?: number;
  }) => {
    if (!activeRound) return;
    try {
      await apiRequest(`/api/rounds/${activeRound.id}/timer-state`, {
        method: 'POST',
        body: JSON.stringify(updates),
      });
      refreshRound();
    } catch (err) {
      console.error('Failed to update timer state:', err);
    }
  };

  const triggerLevelEffects = useCallback((levelIndex: number, isStart = false) => {
    // This function only plays the audio/visual effects
    playLevelUpJingle(() => {
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 4000);
    }).then(() => {
      const levelText = blindLevels[levelIndex];
      if (isStart) {
        let blindMsg = "";
        if (levelText?.includes('/')) {
          const parts = levelText.split('/');
          blindMsg = `${t('ttsSmallBlind')} ${parts[0]}, ${t('ttsBigBlind')} ${parts[1]}`;
        } else {
          blindMsg = levelText || "";
        }
        const speechText = t('ttsTournamentStarted').replace('{blindInfo}', blindMsg);
        safeSpeak(speechText);
      } else {
        if (isBreakLevel(levelText)) {
          safeSpeak(t('ttsBreakTime'));
        } else {
          const parts = levelText.split('/');
          if (parts.length === 2) {
            const small = parts[0].trim();
            const big = parts[1].trim();
            const msg = t('ttsBlindsChanged')
              .replace('{small}', small)
              .replace('{big}', big);
            safeSpeak(msg);
          } else {
            safeSpeak(levelText);
          }
        }
      }
    });
  }, [blindLevels, t]);

  useEffect(() => {
    if (activeRound && activeRound.is_started && !isPaused) {
      intervalRef.current = window.setInterval(() => {
        setTimeRemaining((prev) => {
          // Warning at 1 minute
          if (prev === 60 && audioUnlockedRef.current) {
            playLevelUpJingle(() => {
              setIsFlashing(true);
              setTimeout(() => setIsFlashing(false), 4000);
            }).then(() => {
              safeSpeak(t('ttsLastMinute'));
            });
          }

          if (prev <= 1 && prev !== null) {
            // Level Up logic
            if (lastTriggeredLevel !== currentLevel && audioUnlockedRef.current) {
              setLastTriggeredLevel(currentLevel); // Mark that we fired for THIS level
              const nextLevel = currentLevel + 1;
              if (nextLevel < blindLevels.length) {
                // iOS: Trigger effects FIRST
                triggerLevelEffects(nextLevel);

                setCurrentLevel(nextLevel);
                const nextTime = getLevelDuration(nextLevel);

                // Check if rebuy deadline passed
                const nextLevelText = blindLevels[nextLevel];
                if (isBreakLevel(nextLevelText) && activeRound && !activeRound.rebuy_deadline_passed) {
                  apiRequest(`/api/rounds/${activeRound.id}/rebuy-deadline`, {
                    method: 'POST',
                  }).then(() => refreshRound());
                }

                if (isAdmin) {
                  updateTimerState({
                    current_level: nextLevel,
                    time_remaining_seconds: nextTime,
                    timer_started_at: Date.now()
                  });
                }

                // Return the new time directly to update state immediately
                // preventing double-trigger/race conditions
                return nextTime;
              }
            }
            // If not triggered (e.g. max level reached), stay at 0
            return 0;
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
  }, [activeRound, isPaused, settings, blindLevels, refreshRound, t, currentLevel, lastTriggeredLevel, getLevelDuration, isAdmin]);

  const handleStartGame = async () => {
    if (!activeRound) return;

    try {
      setStarting(true);

      unlockAudio();
      if ('speechSynthesis' in window) {
        const p = new SpeechSynthesisUtterance(' ');
        p.volume = 0;
        window.speechSynthesis.speak(p);
      }

      await apiRequest(`/api/rounds/${activeRound.id}/start`, {
        method: 'POST',
      });

      const initialTime = getLevelDuration(0);
      await updateTimerState({
        current_level: 0,
        time_remaining_seconds: initialTime,
        timer_started_at: Date.now()
      });

      setLastTriggeredLevel(-1); // Use -1 for start game
      triggerLevelEffects(0, true);
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

    if (activeRound?.round_type === 'knockout' && currentActivePlayers.length > 2 && !eliminatorId) {
      alert('Em rodadas Knockout, você deve selecionar quem eliminou este jogador para contabilizar o bounty.');
      return;
    }

    let updatedPlayers: GamePlayer[];

    if (currentActivePlayers.length === 2) {
      const otherPlayer = currentActivePlayers.find(p => p.id !== playerToEliminate.id);

      updatedPlayers = gamePlayers.map(p => {
        if (p.id === playerToEliminate.id) {
          return {
            ...p,
            position: 2,
            isActive: false,
            eliminatedAt: Date.now(),
          };
        } else if (otherPlayer && p.id === otherPlayer.id) {
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
      });

      setGamePlayers(updatedPlayers);
      setNextPosition(0);
      setShowEliminateDialog(false);
      setPlayerToEliminate(null);
      setIsPaused(true);

      // Save elimination state immediately
      saveEliminationState(updatedPlayers);
    } else {
      updatedPlayers = gamePlayers.map(p => {
        if (p.id === playerToEliminate.id) {
          return {
            ...p,
            position: nextPosition,
            isActive: false,
            eliminatedAt: Date.now(),
          };
        }

        if (eliminatorId && p.id === parseInt(eliminatorId)) {
          return {
            ...p,
            knockout_earnings: p.knockout_earnings + eliminationKnockout,
          };
        }

        return p;
      });

      setGamePlayers(updatedPlayers);
      setNextPosition(prev => prev - 1);
      setShowEliminateDialog(false);
      setPlayerToEliminate(null);

      // Save elimination state immediately
      saveEliminationState(updatedPlayers);
    }
  };

  const handleRebuy = () => {
    if (!playerToEliminate) return;

    const updatedPlayers = gamePlayers.map(p =>
      p.id === playerToEliminate.id
        ? { ...p, rebuys: p.rebuys + 1 }
        : p
    );
    setGamePlayers(updatedPlayers);
    setShowEliminateDialog(false);
    setPlayerToEliminate(null);

    // Save state after rebuy
    saveEliminationState(updatedPlayers);
  };

  const handleRestorePlayer = (playerId: number) => {
    const player = gamePlayers.find(p => p.id === playerId);
    if (!player || !player.position) return;

    const updatedPlayers = gamePlayers.map(p =>
      p.id === playerId
        ? { ...p, position: null, isActive: true, eliminatedAt: null, rebuys: p.rebuys, knockout_earnings: 0 }
        : p
    );
    setGamePlayers(updatedPlayers);
    setNextPosition(prev => prev + 1);

    // Save state after restore
    saveEliminationState(updatedPlayers);
  };

  // Remove player from round (for no-shows)
  const handleRemovePlayer = async (player: GamePlayer) => {
    if (!activeRound) return;

    setConfirmModal({
      isOpen: true,
      title: t('removePlayer'),
      message: t('removePlayerConfirm').replace('{name}', player.name),
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await apiRequest(`/api/rounds/${activeRound.id}/remove-player`, {
            method: 'POST',
            body: JSON.stringify({ player_id: player.id }),
          });
          // Remove from local state
          setGamePlayers(prev => prev.filter(p => p.id !== player.id));
          setNextPosition(prev => prev - 1);
          refreshRound();
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Erro ao remover jogador';
          alert(message);
        }
      }
    });
  };

  const handleLevelUp = () => {
    if (currentLevel < blindLevels.length - 1) {
      const nextLevel = currentLevel + 1;
      const nextTime = getLevelDuration(nextLevel);

      // iOS: Trigger effects FIRST in the click handler to maintain user gesture trust
      triggerLevelEffects(nextLevel);

      setCurrentLevel(nextLevel);
      setTimeRemaining(nextTime);
      setLastTriggeredLevel(currentLevel);

      updateTimerState({
        current_level: nextLevel,
        time_remaining_seconds: nextTime,
        timer_started_at: isPaused ? null : Date.now()
      });
    }
  };

  const handleLevelDown = () => {
    if (currentLevel > 0) {
      const nextLevel = currentLevel - 1;
      const nextTime = getLevelDuration(nextLevel);

      // iOS: Trigger effects FIRST in the click handler to maintain user gesture trust
      triggerLevelEffects(nextLevel);

      setCurrentLevel(nextLevel);
      setTimeRemaining(nextTime);
      setLastTriggeredLevel(currentLevel);

      updateTimerState({
        current_level: nextLevel,
        time_remaining_seconds: nextTime,
        timer_started_at: isPaused ? null : Date.now()
      });
    }
  };

  const handleCompleteRound = async (autoComplete = false) => {
    if (!activeRound || !settings) return;

    const activePlayersNow = gamePlayers.filter(p => p.isActive);

    if (!autoComplete) {
      if (activePlayersNow.length > 1) {
        setConfirmModal({
          isOpen: true,
          title: t('activePlayers'),
          message: `${t('stillActive')} ${activePlayersNow.length} ${t('finishAnyway')}`,
          variant: 'warning',
          onConfirm: () => {
            setConfirmModal({
              isOpen: true,
              title: t('finishRound'),
              message: t('confirmFinish'),
              onConfirm: () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                confirmAndCompleteRound([]);
              }
            });
          }
        });
        return;
      }

      setConfirmModal({
        isOpen: true,
        title: 'Finalizar Rodada',
        message: 'Tem certeza que deseja finalizar esta rodada? As posições serão salvas e não poderão ser alteradas.',
        onConfirm: () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          confirmAndCompleteRound([]);
        }
      });
      return;
    }

    try {
      setCompleting(true);

      let netPrizePool = 0;
      let buyInValue = 0;
      let totalEntries = 0;

      if (activeRound.is_final_table) {
        netPrizePool = prizePool?.final_table_pot || 0;

        const p1 = settings.final_table_1st_percentage || 40;
        const p2 = settings.final_table_2nd_percentage || 25;
        const p3 = settings.final_table_3rd_percentage || 20;
        const p4 = settings.final_table_4th_percentage || 10;
        const p5 = settings.final_table_5th_percentage || 5;

        const firstPlace = gamePlayers.find(p => p.position === 1);
        const secondPlace = gamePlayers.find(p => p.position === 2);
        const thirdPlace = gamePlayers.find(p => p.position === 3);
        const fourthPlace = gamePlayers.find(p => p.position === 4);
        const fifthPlace = gamePlayers.find(p => p.position === 5);

        if (firstPlace && secondPlace && thirdPlace) {
          const prizes = [
            { id: firstPlace.id, name: firstPlace.name, amount: Math.round(netPrizePool * (p1 / 100)), position: 1 },
            { id: secondPlace.id, name: secondPlace.name, amount: Math.round(netPrizePool * (p2 / 100)), position: 2 },
            { id: thirdPlace.id, name: thirdPlace.name, amount: Math.round(netPrizePool * (p3 / 100)), position: 3 }
          ];

          if (fourthPlace) {
            prizes.push({ id: fourthPlace.id, name: fourthPlace.name, amount: Math.round(netPrizePool * (p4 / 100)), position: 4 });
          }

          if (fifthPlace) {
            prizes.push({ id: fifthPlace.id, name: fifthPlace.name, amount: Math.round(netPrizePool * (p5 / 100)), position: 5 });
          }

          setPrizeDistribution({
            total: Math.round(netPrizePool),
            grossTotal: Math.round(netPrizePool),
            finalTableAmount: 0,
            dealerAmount: 0,
            totalEntries: gamePlayers.length,
            buyInValue: 0,
            isFinalTable: true,
            prizes: prizes
          });
          setShowPrizeModal(true);
        } else {
          await confirmAndCompleteRound([]);
        }

      } else {
        buyInValue = activeRound.buy_in_value || settings.default_buy_in || 600;
        const rebuyValue = activeRound.rebuy_value || settings.default_buy_in || 600;

        const totalRebuys = gamePlayers.reduce((sum, p) => sum + p.rebuys, 0);
        const totalPlayers = gamePlayers.length;
        totalEntries = totalPlayers + totalRebuys;

        const finalTablePercentage = settings.final_table_percentage || 33.33;
        const finalTableFixedValue = settings.final_table_fixed_value || 0;

        const grossPrizePool = (totalPlayers * buyInValue) + (totalRebuys * rebuyValue);

        let finalTableAmount = 0;
        if (isSingleTournament) {
          finalTableAmount = 0;
        } else if (finalTableFixedValue > 0) {
          const isFreezeout = activeRound.round_type === 'freezeout';
          const multiplier = isFreezeout ? 2 : 1;
          finalTableAmount = (finalTableFixedValue * multiplier) * totalEntries;
        } else {
          finalTableAmount = grossPrizePool * (finalTablePercentage / 100);
        }

        netPrizePool = Math.round(Math.max(0, grossPrizePool - finalTableAmount));

        let distributionPercentages: number[] = [];
        if (settings.prize_distribution) {
          if (Array.isArray(settings.prize_distribution)) {
            distributionPercentages = settings.prize_distribution;
          } else if (typeof settings.prize_distribution === 'string') {
            try {
              distributionPercentages = JSON.parse(settings.prize_distribution);
            } catch {
              distributionPercentages = [60, 30, 10];
            }
          }
        }

        if (distributionPercentages.length === 0) {
          const p1 = settings.first_place_percentage || 60;
          const p2 = settings.second_place_percentage || 30;
          const p3 = settings.third_place_percentage || 10;
          const p4 = settings.fourth_place_percentage || 0;
          const p5 = settings.fifth_place_percentage || 0;
          distributionPercentages = [p1, p2, p3, p4, p5].filter(p => p > 0);
          if (distributionPercentages.length === 0) distributionPercentages = [60, 30, 10];
        }

        const calculatedPrizes: { id: number; name: string; amount: number; position: number }[] = [];

        distributionPercentages.forEach((percentage, index) => {
          const position = index + 1;
          const player = gamePlayers.find(p => p.position === position);
          if (player && percentage > 0) {
            calculatedPrizes.push({
              id: player.id,
              name: player.name,
              amount: Math.round(netPrizePool * (percentage / 100)),
              position: position
            });
          }
        });

        if (calculatedPrizes.length > 0) {
          setPrizeDistribution({
            total: Math.round(netPrizePool),
            grossTotal: Math.round(grossPrizePool),
            finalTableAmount: Math.round(finalTableAmount),
            dealerAmount: 0,
            totalEntries: totalEntries,
            buyInValue: buyInValue,
            prizes: calculatedPrizes,
          });
          setShowPrizeModal(true);
        } else {
          await confirmAndCompleteRound([]);
        }
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
      alert(`Falha ao finalizar: ${message}`);
    } finally {
      setCompleting(false);
    }
  };

  useEffect(() => {
    const activeCount = gamePlayers.filter(p => p.isActive).length;
    const totalCount = gamePlayers.length;

    if (totalCount > 0 && activeCount === 0 && !completing && !showPrizeModal && activeRound) {
      const timer = setTimeout(() => {
        handleCompleteRound(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [gamePlayers, completing, showPrizeModal, activeRound]);

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

  if (!activeRound && !loadingSettings) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
          <Coffee className="w-16 h-16 text-gray-500 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">{t('noActiveRound')}</h2>
          <p className="text-gray-400 mb-6">{t('noActiveRoundMessage')}</p>
          <Button onClick={() => navigate('/rounds')}>
            {t('goToRounds')}
          </Button>
        </div>
      </Layout>
    );
  }

  if (!settings || !activeRound || loadingSettings || (activeRound.is_final_table && !prizePool)) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      </Layout>
    );
  }

  const maxRebuys = activeRound.round_type === 'regular' ? 2 : 0;
  const canRebuy = activeRound.round_type === 'regular' && !activeRound.rebuy_deadline_passed;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            {activeRound.is_final_table ? (
              <Trophy className="w-8 h-8 text-yellow-400 animate-pulse" />
            ) : (
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            )}
            <div>
              <h2 className="text-2xl font-bold text-white">
                {activeRound.is_final_table ? t('finalTable') : `${t('round')} ${activeRound.round_number}`}
              </h2>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <span>{activeRound.is_final_table ? t('titleDispute') : activeRound.round_type.toUpperCase()}</span>
                <span>•</span>
                <span>{new Date().toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Table draw button visible to all */}
            {!activeRound.is_started && (
              <Button
                variant="secondary"
                onClick={() => setShowTableDrawModal(true)}
                className="bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 border-yellow-500/50"
              >
                <Shuffle className="w-5 h-5" />
                <span>{t('drawTables')}</span>
              </Button>
            )}
            {/* Final table draw button when 10 or fewer players remain */}
            {activeRound.is_started && activePlayers.length <= 10 && activePlayers.length > 1 && (
              <Button
                variant="secondary"
                onClick={() => setShowFinalTableDrawModal(true)}
                className="bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 border-yellow-500/50"
              >
                <Shuffle className="w-5 h-5" />
                <span>{t('finalTable')} ({activePlayers.length})</span>
              </Button>
            )}
            {isAdmin && (
              <>
                {!activeRound.is_started ? (
                  <Button onClick={handleStartGame} loading={starting}>
                    <Play className="w-5 h-5" />
                    <span>Iniciar Jogo</span>
                  </Button>
                ) : (
                  <Button onClick={() => {
                    const newPaused = !isPaused;
                    setIsPaused(newPaused);
                    updateTimerState({
                      is_paused: newPaused,
                      time_remaining_seconds: timeRemaining,
                      timer_started_at: newPaused ? null : Date.now()
                    });
                  }}>
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
                  <span>{t('finishRound')}</span>
                </Button>

                {isSingleTournament && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: t('finishTournament'),
                        message: t('finishSingleGameConfirm'),
                        onConfirm: async () => {
                          setConfirmModal(prev => ({ ...prev, isOpen: false }));
                          try {
                            const championshipId = currentChampionship?.id;
                            if (championshipId) {
                              await apiRequest(`/api/championships/${championshipId}`, {
                                method: 'DELETE'
                              });
                            }
                            localStorage.removeItem('current_championship');
                            navigate('/');
                            window.location.reload();
                          } catch (err) {
                            console.error('Error finishing game:', err);
                            navigate('/');
                          }
                        }
                      });
                    }}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    <X className="w-5 h-5" />
                    <span>{t('finishAndExit')}</span>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        <Card className={isFlashing
          ? 'animate-flash-gold ring-8 ring-yellow-400 shadow-[0_0_50px_rgba(250,204,21,0.8)]'
          : 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 transition-all duration-300'
        }>
          <CardContent className="py-12">
            <div className="text-center space-y-6">
              <div className="text-gray-300 text-sm font-medium uppercase tracking-wider">
                Nível {currentLevel + 1}
              </div>

              <div className={`text-7xl md:text-9xl font-bold font-mono tracking-tight transition-colors ${timeRemaining <= 60 ? 'text-orange-400 animate-pulse' : 'text-white'
                }`}>
                {formatTime(timeRemaining)}
              </div>

              {isBreakLevel(currentLevelText) ? (
                <div className="flex items-center justify-center space-x-3">
                  <Coffee className="w-12 h-12 text-orange-400" />
                  <div className="text-5xl md:text-7xl font-bold text-orange-400">
                    {t('interval')}
                  </div>
                </div>
              ) : (
                <div className="text-5xl md:text-7xl font-bold text-white">
                  {currentLevelText}
                </div>
              )}

              {nextLevelInfo && (
                <div className="text-gray-300 text-lg">
                  {t('next')}: <span className="text-white font-semibold">{nextLevelInfo.level}</span>
                  {breakInfo.hasBreak && (
                    <span className="text-orange-400 ml-2">
                      ({t('breakIn')} {breakInfo.minutesUntilBreak} {t('min')})
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-center space-x-6 text-gray-300 text-lg">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-green-400" />
                  <span>
                    {activePlayers.length} de {gamePlayers.length} {t('playersRemaining')}
                  </span>
                </div>
              </div>

              {activeRound.is_started && isAdmin && (
                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-center space-x-4">
                    <Button variant="secondary" onClick={handleLevelDown} disabled={currentLevel === 0}>
                      <ChevronDown className="w-5 h-5" />
                      <span>{t('previousLevel')}</span>
                    </Button>
                    <Button variant="secondary" onClick={handleLevelUp} disabled={currentLevel === blindLevels.length - 1}>
                      <ChevronUp className="w-5 h-5" />
                      <span>{t('nextLevel')}</span>
                    </Button>
                  </div>
                </div>
              )}

              {timeRemaining <= 60 && timeRemaining > 0 && activeRound.is_started && (
                <div className="text-orange-400 font-semibold text-lg animate-pulse">
                  {t('lastMinute')}
                </div>
              )}

              {!activeRound.is_started && (
                <div className="text-yellow-400 font-semibold text-lg">
                  {t('clickStart')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {activeRound.is_started && (
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-green-400" />
                <h3 className="text-xl font-semibold text-white">
                  {t('activePlayers')} ({activePlayers.length})
                </h3>
              </div>
            </CardHeader>
            <CardContent>
              {activePlayers.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  {t('allPlayersEliminated')}
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
                            {player.rebuys} {player.rebuys > 1 ? t('rebuys') : t('rebuy')}
                          </div>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="danger"
                            onClick={() => handleEliminateClick(player)}
                            className="!px-3 !py-1"
                            title="Eliminar jogador"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => handleRemovePlayer(player)}
                            className="!px-2 !py-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20"
                            title="Remover da rodada (não compareceu)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {eliminatedPlayers.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <h3 className="text-xl font-semibold text-white">
                  {t('finalClassification')} ({eliminatedPlayers.length})
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
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${player.position === 1 ? 'bg-gradient-to-br from-yellow-400 to-amber-500' :
                        player.position === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                          player.position === 3 ? 'bg-gradient-to-br from-orange-500 to-orange-600' :
                            'bg-gradient-to-br from-blue-500 to-blue-600'
                        }`}>
                        <span className="text-white font-bold text-lg">{player.position}º</span>
                      </div>
                      <div>
                        <span className="text-white font-medium block">{player.name}</span>
                        {player.rebuys > 0 && (
                          <span className="text-gray-400 text-xs">
                            {player.rebuys} {player.rebuys > 1 ? t('rebuys') : t('rebuy')}
                          </span>
                        )}
                        {player.knockout_earnings > 0 && (
                          <span className="text-green-400 text-xs block">
                            {t('knockoutEarnings')}: $ {player.knockout_earnings.toFixed(0)}
                          </span>
                        )}
                      </div>
                    </div>
                    {prizeDistribution && prizeDistribution.prizes.length > 0 && (
                      <Input
                        type="number"
                        step="1"
                        value={Math.round(prizeDistribution.prizes.find(p => p.id === player.id)?.amount || 0)}
                        onChange={(e) => {
                          const newAmount = Math.round(parseFloat(e.target.value) || 0);
                          const newPrizes = prizeDistribution.prizes.map(p =>
                            p.id === player.id ? { ...p, amount: newAmount } : p
                          );
                          setPrizeDistribution({ ...prizeDistribution, prizes: newPrizes });
                        }}
                        className={`w-32 text-right font-bold bg-black/20 ${player.position === 1 ? 'text-yellow-400 border-yellow-500/30' :
                          player.position === 2 ? 'text-gray-300 border-gray-400/30' :
                            player.position === 3 ? 'text-orange-400 border-orange-500/30' :
                              'text-blue-400 border-blue-600/30'
                          }`}
                      />
                    )}
                    {!prizeDistribution && (
                      <Button
                        variant="secondary"
                        onClick={() => handleRestorePlayer(player.id)}
                        className="!px-3 !py-1"
                      >
                        {t('restore')}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

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
                <h3 className="text-2xl font-bold text-white mb-2">
                  {prizeDistribution.isFinalTable ? t('finalTable') : t('roundPrize')}
                </h3>
                <p className="text-gray-400">{t('success')}</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="text-center py-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-gray-400 text-xs mb-1">
                    {prizeDistribution.isFinalTable ? t('prizePool') : t('totalCollected')}
                  </div>
                  <div className="text-2xl font-bold text-white">
                    $ {Math.round(prizeDistribution.grossTotal)}
                  </div>
                  {!prizeDistribution.isFinalTable && (
                    <div className="text-gray-400 text-xs mt-1">
                      {prizeDistribution.totalEntries} {t('playersSelected')} × $ {Math.round(prizeDistribution.buyInValue)}
                    </div>
                  )}
                </div>

                {!prizeDistribution.isFinalTable && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-lg p-3 border border-orange-500/30">
                      <div className="text-orange-200 text-xs mb-1 uppercase tracking-wider">{t('finalTable')}</div>
                      <div className="text-xl font-bold text-orange-400">
                        $ {Math.round(prizeDistribution.finalTableAmount || 0)}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-lg p-3 border border-emerald-500/30">
                      <div className="text-emerald-200 text-xs mb-1 uppercase tracking-wider">{t('roundPrize')}</div>
                      <div className="text-xl font-bold text-emerald-400">
                        $ {Math.round(prizeDistribution.total)}
                      </div>
                    </div>
                  </div>
                )}

                {prizeDistribution.isFinalTable && (
                  <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg p-4 border border-yellow-500/30 text-center">
                    <div className="text-yellow-200 text-sm mb-1 uppercase tracking-wider">{t('prizePool')}</div>
                    <div className="text-3xl font-bold text-yellow-400">
                      $ {prizePool?.final_table_pot?.toLocaleString('pt-BR', { minimumFractionDigits: 0 }) || '0'}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {prizeDistribution.prizes.map((prize, index) => (
                  <div key={prize.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-700/20 to-gray-800/20 rounded-lg border border-gray-600/30">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${prize.position === 1 ? 'bg-gradient-to-br from-yellow-400 to-amber-500' :
                        prize.position === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                          prize.position === 3 ? 'bg-gradient-to-br from-orange-500 to-orange-600' :
                            'bg-gradient-to-br from-blue-500 to-blue-600'
                        }`}>
                        <span className="text-white font-bold text-lg">{prize.position}º</span>
                      </div>
                      <div>
                        <div className="text-white font-semibold">{prize.name}</div>
                        <div className="text-gray-400 text-sm">
                          {prize.position === 1 ? t('champion') :
                            prize.position === 2 ? t('runnerUp') :
                              `${prize.position}º ${t('place')}`}
                        </div>
                      </div>
                    </div>
                    <Input
                      type="number"
                      step="1"
                      value={Math.round(prize.amount)}
                      onChange={(e) => {
                        const newAmount = Math.round(parseFloat(e.target.value) || 0);
                        const newPrizes = [...prizeDistribution.prizes];
                        newPrizes[index] = { ...newPrizes[index], amount: newAmount };
                        setPrizeDistribution({ ...prizeDistribution, prizes: newPrizes });
                      }}
                      className={`w-32 text-right font-bold bg-black/20 ${prize.position === 1 ? 'text-yellow-400 border-yellow-500/30' :
                        prize.position === 2 ? 'text-gray-300 border-gray-400/30' :
                          prize.position === 3 ? 'text-orange-400 border-orange-500/30' :
                            'text-blue-400 border-blue-600/30'
                        }`}
                    />
                  </div>
                ))}

                {/* Campo Dealer */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-700/20 to-pink-700/20 rounded-lg border border-purple-500/30">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                      <span className="text-white font-bold text-lg">🎰</span>
                    </div>
                    <div>
                      <div className="text-white font-semibold">{t('dealer')}</div>
                      <div className="text-gray-400 text-sm">Pagamento aos dealers</div>
                    </div>
                  </div>
                  <Input
                    type="number"
                    step="1"
                    value={Math.round(prizeDistribution.dealerAmount)}
                    onChange={(e) => {
                      const newAmount = Math.round(parseFloat(e.target.value) || 0);
                      setPrizeDistribution({ ...prizeDistribution, dealerAmount: newAmount });
                    }}
                    className="w-32 text-right font-bold bg-black/20 text-purple-400 border-purple-500/30"
                  />
                </div>
              </div>

              <div className={`p-4 rounded-lg border ${Math.abs(prizeDistribution.prizes.reduce((sum, p) => sum + p.amount, 0) + prizeDistribution.dealerAmount - prizeDistribution.total) < 1
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-red-500/10 border-red-500/30'
                }`}>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 font-medium">{t('sumPrizesDealer')}:</span>
                  <span className={`font-bold text-xl ${Math.abs(prizeDistribution.prizes.reduce((sum, p) => sum + p.amount, 0) + prizeDistribution.dealerAmount - prizeDistribution.total) < 1
                    ? 'text-green-400'
                    : 'text-red-400'
                    }`}>
                    $ {(prizeDistribution.prizes.reduce((sum, p) => sum + p.amount, 0) + prizeDistribution.dealerAmount).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-gray-400 text-sm">Total Disponível:</span>
                  <span className="text-gray-300 font-semibold">$ {Math.round(prizeDistribution.total)}</span>
                </div>
              </div>

              <div className="pt-4">
                <Button
                  onClick={() => {
                    const prizes = prizeDistribution.prizes.map(p => ({
                      playerId: p.id,
                      amount: p.amount
                    }));
                    confirmAndCompleteRound(prizes);
                  }}
                  className="w-full"
                  loading={completing}
                  disabled={Math.abs(prizeDistribution.prizes.reduce((sum, p) => sum + p.amount, 0) + prizeDistribution.dealerAmount - prizeDistribution.total) >= 1}
                >
                  {t('confirmAndFinish')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showEliminateDialog && playerToEliminate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">{t('playerEliminated')}</h3>
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
                <div className="text-gray-300 mb-2">{t('player')}:</div>
                <div className="text-2xl font-bold text-white mb-4">{playerToEliminate.name}</div>
                {playerToEliminate.rebuys > 0 && (
                  <div className="text-sm text-gray-400 mb-2">
                    {t('rebuysSoFar')}: {playerToEliminate.rebuys}
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
                      {t('eliminatedBy')}
                    </label>
                    <select
                      value={eliminatorId}
                      onChange={(e) => setEliminatorId(e.target.value)}
                      className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">{t('player')}...</option>
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
                      step="1"
                      min="0"
                      value={eliminationKnockout}
                      onChange={(e) => setEliminationKnockout(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="0.00"
                      disabled={true}
                    />
                  )}
                </div>
              )}

              <div className="space-y-3 pt-4">
                {canRebuy && playerToEliminate.rebuys < maxRebuys && (
                  <Button onClick={handleRebuy} className="w-full" variant="secondary">
                    {t('makeRebuy')}
                  </Button>
                )}
                <Button onClick={handleConfirmEliminate} className="w-full">
                  {t('confirmElimination')}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowEliminateDialog(false)}
                  className="w-full"
                >
                  {t('cancel')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
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
        players={activeRound?.players || []}
        roundId={activeRound?.id}
      />
      <TableDrawModal
        isOpen={showFinalTableDrawModal}
        onClose={() => setShowFinalTableDrawModal(false)}
        players={activePlayers.map(p => ({ id: p.id, name: p.name }))}
        roundId={activeRound?.id}
        isFinalTableDraw={true}
      />
      {needsAudioActivation && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm p-4">
          <Card className="max-w-sm w-full border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.4)]">
            <CardContent className="py-8 text-center space-y-6">
              <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto">
                <Coffee className="w-10 h-10 text-purple-400 animate-bounce" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white">Ativar Áudio</h3>
                <p className="text-gray-400">Clique no botão abaixo para habilitar o som do cronômetro e as falas do jogo.</p>
              </div>
              <Button onClick={() => { unlockAudio(); setNeedsAudioActivation(false); }} className="w-full text-lg py-6 shadow-lg shadow-purple-500/20">
                Ativar Agora
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </Layout>
  );
}
