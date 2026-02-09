import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '@/react-app/contexts/AuthContext';
import Card, { CardContent } from '@/react-app/components/Card';
import Button from '@/react-app/components/Button';
import Input from '@/react-app/components/Input';
import { useLanguage } from '@/react-app/hooks/useLanguage';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const { t } = useLanguage();
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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4">
            {/* Logo and Title */}
            <div className="text-center mb-8 space-y-4">
                <img
                    src="/poker_pro_spade_logo.png"
                    alt="Poker Circuit"
                    className="w-60 h-60 mx-auto object-contain mix-blend-lighten"
                />
                <h1 className="text-3xl font-bold text-white">Poker Circuit</h1>
                <p className="text-gray-400">{t('loginTitle')}</p>
            </div>

            <Card className="w-full max-w-md">
                <CardContent className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            label={t('email')}
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                            required
                        />

                        <Input
                            label={t('password')}
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="*******"
                            required
                        />

                        {error && (
                            <div className="text-red-400 text-sm text-center">
                                {t('errorLogin')}
                            </div>
                        )}

                        <Button type="submit" loading={loading} className="w-full">
                            {t('login')}
                        </Button>

                        <div className="text-center text-sm text-gray-400 pt-2">
                            {t('noAccount')}{' '}
                            <Link to="/register" className="text-blue-400 hover:text-blue-300">
                                {t('registerConfig')}
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <p className="mt-8 text-gray-500 text-sm">
                {t('versionFooter')}
            </p>
        </div>
    );
}
