import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/react-app/contexts/AuthContext';
import Card, { CardHeader, CardContent } from '@/react-app/components/Card';
import Button from '@/react-app/components/Button';
import Input from '@/react-app/components/Input';
import { Lock, ArrowLeft } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const success = await login(email, password);

        if (success) {
            // Clear any previous championship selection
            localStorage.removeItem('current_championship');
            navigate('/');
        } else {
            setError('Email ou senha incorretos');
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <div className="flex items-center justify-center space-x-3 mb-2">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <Lock className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Login</h2>
                    </div>
                    <p className="text-gray-400 text-center">Entre com sua conta</p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            label="Email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                            required
                        />

                        <Input
                            label="Senha"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Digite sua senha"
                            required
                        />

                        {error && (
                            <div className="text-red-400 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <div className="flex space-x-3">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => navigate('/')}
                                className="flex-1"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span>Voltar</span>
                            </Button>
                            <Button type="submit" loading={loading} className="flex-1">
                                Entrar
                            </Button>
                        </div>

                        <div className="text-center text-sm text-gray-400">
                            Não tem conta? <Link to="/register" className="text-purple-400 hover:text-purple-300">Cadastre-se</Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
