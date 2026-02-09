import { useAuth } from '@/react-app/contexts/AuthContext';
import { useChampionship } from '@/react-app/contexts/ChampionshipContext';
import { useLocation, Navigate } from 'react-router';
import ChampionshipSelector from '@/react-app/pages/ChampionshipSelector';

export default function RequireChampionship({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const { currentChampionship, loading } = useChampionship();
    const location = useLocation();

    // Don't require championship for login/register/quick-setup pages
    if (location.pathname === '/login' ||
        location.pathname === '/register' ||
        location.pathname === '/quick-setup') {
        return <>{children}</>;
    }

    // If not logged in, redirect to login page
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // If loading, show nothing (or a loader)
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="text-white">Carregando...</div>
            </div>
        );
    }

    // If no championship selected, show selector
    if (!currentChampionship) {
        return <ChampionshipSelector />;
    }

    // Otherwise, show the app
    return <>{children}</>;
}
