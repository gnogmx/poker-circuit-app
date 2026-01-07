import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { ChampionshipWithRole } from '@/shared/types';
import { useAuth } from './AuthContext';

interface ChampionshipContextType {
    currentChampionship: ChampionshipWithRole | null;
    championships: ChampionshipWithRole[];
    loading: boolean;
    isAdmin: boolean;
    isSingleTournament: boolean;
    setCurrentChampionship: (championship: ChampionshipWithRole | null) => void;
    refreshChampionships: () => Promise<void>;
}

const ChampionshipContext = createContext<ChampionshipContextType | undefined>(undefined);

export function ChampionshipProvider({ children }: { children: ReactNode }) {
    const { user, token } = useAuth();

    // Initialize from localStorage if available
    const [currentChampionship, setCurrentChampionshipState] = useState<ChampionshipWithRole | null>(() => {
        const stored = localStorage.getItem('current_championship');
        return stored ? JSON.parse(stored) : null;
    });

    const [championships, setChampionships] = useState<ChampionshipWithRole[]>([]);
    const [loading, setLoading] = useState(true);

    const setCurrentChampionship = (championship: ChampionshipWithRole | null) => {
        setCurrentChampionshipState(championship);
        if (championship) {
            localStorage.setItem('current_championship', JSON.stringify(championship));
        } else {
            localStorage.removeItem('current_championship');
        }
    };

    const refreshChampionships = useCallback(async () => {
        if (!user || !token) {
            setChampionships([]);
            setLoading(false);
            return;
        }

        try {
            const data = await fetch('/api/championships', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            }).then(res => res.json());

            setChampionships(data);
        } catch (error) {
            console.error('Failed to fetch championships:', error);
        } finally {
            setLoading(false);
        }
    }, [user, token]);

    useEffect(() => {
        refreshChampionships();
    }, [refreshChampionships]);

    // Re-sync from localStorage if context is null but localStorage has data
    // This handles race condition when navigate() happens right after localStorage.setItem()
    useEffect(() => {
        if (!currentChampionship) {
            const stored = localStorage.getItem('current_championship');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    setCurrentChampionshipState(parsed);
                } catch (e) {
                    console.error('Failed to parse stored championship:', e);
                }
            }
        }
    }, [currentChampionship]);

    const isAdmin = currentChampionship?.role === 'admin';
    // Handle both number (1) and boolean (true) from database/API  
    const isSingleTournament = Boolean(currentChampionship?.is_single_tournament);

    return (
        <ChampionshipContext.Provider value={{
            currentChampionship,
            championships,
            loading,
            isAdmin,
            isSingleTournament,
            setCurrentChampionship,
            refreshChampionships
        }}>
            {children}
        </ChampionshipContext.Provider>
    );
}

export function useChampionship() {
    const context = useContext(ChampionshipContext);
    if (!context) {
        throw new Error('useChampionship must be used within ChampionshipProvider');
    }
    return context;
}
