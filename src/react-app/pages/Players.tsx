import { useState } from 'react';
import { useApi, apiRequest } from '@/react-app/hooks/useApi';
import { Player } from '@/shared/types';
import Layout from '@/react-app/components/Layout';
import Card, { CardHeader, CardContent } from '@/react-app/components/Card';
import Button from '@/react-app/components/Button';
import Input from '@/react-app/components/Input';
import { UserPlus, Trash2, Edit2, Loader2, X } from 'lucide-react';

export default function Players() {
  const { data: players, loading, error, refresh } = useApi<Player[]>('/api/players');
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

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '' });
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
                <button onClick={handleCancel} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Nome do Jogador"
                  value={formData.name}
                  onChange={(e) => setFormData({ name: e.target.value })}
                  placeholder="Digite o nome..."
                  required
                />
                <div className="flex space-x-3">
                  <Button type="submit" loading={submitting}>
                    {editingId ? 'Salvar' : 'Adicionar'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={handleCancel}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          {loading ? (
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </CardContent>
          ) : error ? (
            <CardContent className="py-12">
              <p className="text-center text-red-400">Erro ao carregar jogadores</p>
            </CardContent>
          ) : !players || players.length === 0 ? (
            <CardContent className="py-12">
              <p className="text-center text-gray-400">Nenhum jogador cadastrado ainda</p>
            </CardContent>
          ) : (
            <div className="divide-y divide-white/5">
              {players.map((player) => (
                <div key={player.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <span className="text-white font-medium">{player.name}</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(player)}
                      className="p-2 text-gray-400 hover:text-purple-400 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(player.id)}
                      className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
