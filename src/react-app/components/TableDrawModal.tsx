import { useState, useEffect, useCallback } from 'react';
import Card, { CardHeader, CardContent } from '@/react-app/components/Card';
import Button from '@/react-app/components/Button';
import { useLanguage } from '@/react-app/hooks/useLanguage';
import { useChampionship } from '@/react-app/contexts/ChampionshipContext';
import { apiRequest } from '@/react-app/hooks/useApi';
import { X, Users, Shuffle, Loader2 } from 'lucide-react';

interface Player {
  id: number;
  name: string;
}

interface TableDrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  roundId?: number;
  isFinalTableDraw?: boolean; // For final 10 players draw
}

interface TableAssignment {
  tableNumber: number;
  players: Array<{
    seat: number;
    name: string;
  }>;
}

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function distributeToTables(players: Player[], isFinalTable = false): TableAssignment[] {
  const shuffled = shuffleArray(players);
  const total = shuffled.length;

  // For final table (10 players), single table
  if (isFinalTable || total <= 10) {
    return [
      {
        tableNumber: 1,
        players: shuffled.map((p, idx) => ({
          seat: idx + 1,
          name: p.name,
        })),
      },
    ];
  }

  // Split into 2 balanced tables (if odd, table 1 gets extra)
  const table1Count = Math.ceil(total / 2);
  const table1Players = shuffled.slice(0, table1Count);
  const table2Players = shuffled.slice(table1Count);

  return [
    {
      tableNumber: 1,
      players: table1Players.map((p, idx) => ({
        seat: idx + 1,
        name: p.name,
      })),
    },
    {
      tableNumber: 2,
      players: table2Players.map((p, idx) => ({
        seat: idx + 1,
        name: p.name,
      })),
    },
  ];
}

export default function TableDrawModal({
  isOpen,
  onClose,
  players,
  roundId,
  isFinalTableDraw = false,
}: TableDrawModalProps) {
  const { t } = useLanguage();
  const { isAdmin } = useChampionship();
  const [tables, setTables] = useState<TableAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasSavedDraw, setHasSavedDraw] = useState(false);

  // Load existing draw or generate new one
  const loadOrGenerateDraw = useCallback(async () => {
    if (!isOpen || players.length === 0) {
      setTables([]);
      return;
    }

    // If we have a roundId, try to load existing draw
    if (roundId) {
      setLoading(true);
      try {
        const response = await apiRequest(`/api/rounds/${roundId}/table-draw`) as { table_draw: TableAssignment[] | null };
        if (response.table_draw) {
          setTables(response.table_draw);
          setHasSavedDraw(true);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('Failed to load table draw:', err);
      }
      setLoading(false);
    }

    // No saved draw - only admin can generate new one
    if (isAdmin) {
      const newTables = distributeToTables(players, isFinalTableDraw);
      setTables(newTables);
      setHasSavedDraw(false);
    } else {
      setTables([]);
      setHasSavedDraw(false);
    }
  }, [isOpen, players, roundId, isAdmin, isFinalTableDraw]);

  useEffect(() => {
    loadOrGenerateDraw();
  }, [loadOrGenerateDraw]);

  // Save the draw
  const handleSaveDraw = async () => {
    if (!roundId || !isAdmin || tables.length === 0) return;

    setSaving(true);
    try {
      await apiRequest(`/api/rounds/${roundId}/table-draw`, {
        method: 'POST',
        body: JSON.stringify({ table_draw: JSON.stringify(tables) }),
      });
      setHasSavedDraw(true);
    } catch (err: unknown) {
      const error = err as Error & { existing_draw?: TableAssignment[] };
      if (error.existing_draw) {
        // Draw already exists, load it
        setTables(error.existing_draw);
        setHasSavedDraw(true);
      } else {
        console.error('Failed to save table draw:', err);
        alert('Erro ao salvar sorteio');
      }
    } finally {
      setSaving(false);
    }
  };

  // Re-shuffle (only if not saved yet)
  const handleReshuffle = () => {
    if (hasSavedDraw) return;
    const newTables = distributeToTables(players, isFinalTableDraw);
    setTables(newTables);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl bg-gray-900 border-gray-800 max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <Shuffle className="w-5 h-5 text-green-400" />
              {isFinalTableDraw ? 'Sorteio Mesa Final' : t('tableDrawTitle')}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {hasSavedDraw && (
            <div className="mt-2 px-3 py-1 bg-green-500/20 text-green-300 text-sm rounded-lg inline-flex items-center gap-1">
              <span>✓</span> Sorteio oficial salvo
            </div>
          )}
        </CardHeader>
        <CardContent className="overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </div>
          ) : players.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              Nenhum jogador na rodada
            </div>
          ) : tables.length === 0 && !isAdmin ? (
            <div className="text-center py-8 text-gray-400">
              Aguardando o administrador realizar o sorteio...
            </div>
          ) : (
            <div className={`grid gap-6 ${tables.length === 1 ? 'grid-cols-1 max-w-lg mx-auto' : 'grid-cols-1 md:grid-cols-2'}`}>
              {tables.map((table) => (
                <div
                  key={table.tableNumber}
                  className="bg-white/5 rounded-lg border border-white/10 overflow-hidden"
                >
                  <div className={`px-4 py-3 border-b border-white/10 ${isFinalTableDraw ? 'bg-yellow-500/20' : 'bg-green-500/20'}`}>
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-bold text-white flex items-center gap-2">
                        <Users className={`w-5 h-5 ${isFinalTableDraw ? 'text-yellow-400' : 'text-green-400'}`} />
                        {isFinalTableDraw ? 'Mesa Final' : `${t('table')} ${table.tableNumber}`}
                      </h4>
                      <span className="text-sm text-gray-400">
                        {table.players.length} jogadores
                      </span>
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    {table.players.map((player) => (
                      <div
                        key={player.seat}
                        className="flex items-center gap-3 p-2 rounded-lg bg-white/5"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isFinalTableDraw ? 'bg-yellow-500/20 text-yellow-300' : 'bg-green-500/20 text-green-300'}`}>
                          {player.seat}
                        </div>
                        <span className="text-white font-medium">
                          {player.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-center gap-3 mt-6 pt-4 border-t border-white/10">
            {isAdmin && !hasSavedDraw && tables.length > 0 && (
              <>
                <Button variant="secondary" onClick={handleReshuffle}>
                  <Shuffle className="w-4 h-4 mr-1" />
                  Sortear Novamente
                </Button>
                {roundId && (
                  <Button onClick={handleSaveDraw} loading={saving}>
                    Confirmar e Salvar
                  </Button>
                )}
              </>
            )}
            <Button variant="secondary" onClick={onClose}>
              {t('close')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
