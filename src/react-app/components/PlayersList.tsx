import { useState } from 'react';
import { useApi, apiRequest } from '@/react-app/hooks/useApi';
import { Player } from '@/shared/types';
import Card, { CardHeader, CardContent } from '@/react-app/components/Card';
import Button from '@/react-app/components/Button';
import Input from '@/react-app/components/Input';
import { UserPlus, Trash2, Edit2, Loader2, X } from 'lucide-react';

export default function PlayersList() {
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

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </div>
        );
    }

    if (error) {
        return <p className="text-center text-red-400 py-12">Erro ao carregar jogadores</p>;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
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
                                placeholder="Digite o nome"
                                required
                            />
                            <div className="flex space-x-3">
                                <Button type="submit" loading={submitting} className="flex-1">
                                    {editingId ? 'Atualizar' : 'Adicionar'}
                                </Button>
                                <Button type="button" variant="secondary" onClick={handleCancel}>
                                    Cancelar
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {!players || players.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Nenhum jogador cadastrado ainda</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {players.map((player) => (
                        <div
                            key={player.id}
                            className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                        >
                            <span className="text-white font-medium">{player.name}</span>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => handleEdit(player)}
                                    className="p-2 text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(player.id)}
                                    className="p-2 text-red-400 hover:text-red-300 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
