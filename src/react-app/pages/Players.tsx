import { useState } from 'react';
import { useApi, apiRequest } from '@/react-app/hooks/useApi';
import { useChampionship } from '@/react-app/contexts/ChampionshipContext';
import { Player } from '@/shared/types';
import Layout from '@/react-app/components/Layout';
import Card, { CardHeader, CardContent } from '@/react-app/components/Card';
import Button from '@/react-app/components/Button';
import Input from '@/react-app/components/Input';
import { UserPlus, Trash2, Edit2, Loader2, X } from 'lucide-react';

export default function Players() {
  const { data: players, loading, error, refresh } = useApi<Player[]>('/api/players');
  const { isAdmin } = useChampionship();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setSubmitting(true);
      if (editingId) {
        await apiRequest(`/api/players/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
      } else {
        await apiRequest('/api/players', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }
      setFormData({ name: '' });
      setShowForm(false);
      setEditingId(null);
      refresh();
    } catch (err) {
      console.error('Failed to save player:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (player: Player) => {
    setEditingId(player.id);
    setFormData({ name: player.name });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este jogador?')) return;

    try {
      await apiRequest(`/api/players/${id}`, { method: 'DELETE' });
      refresh();
    } catch (err) {
      console.error('Failed to delete player:', err);
    }
  };



  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white">Jogadores</h2>
            <p className="text-gray-400 mt-1">Gerencie os participantes do campeonato</p>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)}>
              <UserPlus className="w-4 h-4" />
              <span>Adicionar Jogador</span>
            </Button>
          )}
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">
                  {editingId ? 'Editar Jogador' : 'Novo Jogador'}
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Nome do jogador"
                    value={formData.name}
                    onChange={(e) => setFormData({ name: e.target.value })}
                    disabled={submitting}
                  />
                </div>
                <Button type="submit" loading={submitting}>
                  Salvar
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-red-400">Erro ao carregar jogadores</p>
            </CardContent>
          </Card>
        ) : !players || players.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-gray-400">Nenhum jogador cadastrado ainda</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {players?.map((player) => (
              <Card key={player.id} className="hover:bg-white/5 transition-colors">
                <CardContent className="flex justify-between items-center p-4">
                  <span className="text-lg font-medium text-white">{player.name}</span>
                  {isAdmin && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(player)}
                        className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(player.id)}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
