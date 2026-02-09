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
        if (stored) {
            const parsed = JSON.parse(stored);
            // If stored data doesn't have role, clear it (stale data)
            if (!parsed.role) {
                console.log('🔄 Clearing stale championship data without role');
                localStorage.removeItem('current_championship');
                return null;
            }
            return parsed;
        }
        return null;
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

    // IMPORTANT: Sync currentChampionship with fresh data from API
    // This ensures role and other fields are always up-to-date
    useEffect(() => {
        if (currentChampionship && championships.length > 0) {
            const freshData = championships.find(c => c.id === currentChampionship.id);
            if (freshData) {
                // ALWAYS sync to ensure we have the latest role from API
                // This is critical because localStorage may have stale data
                console.log('🔄 Syncing championship data:', {
                    oldRole: currentChampionship.role,
                    newRole: freshData.role,
                    name: freshData.name
                });
                // Always update to ensure fresh data, even if it looks the same
                setCurrentChampionshipState(freshData);
                localStorage.setItem('current_championship', JSON.stringify(freshData));
            }
        }
    }, [championships]); // Only depend on championships, not currentChampionship to avoid loops

    // Debug: log whenever currentChampionship changes
    useEffect(() => {
        console.log('🔐 ChampionshipContext - currentChampionship changed:', {
            id: currentChampionship?.id,
            name: currentChampionship?.name,
            role: currentChampionship?.role,
            rawRole: JSON.stringify(currentChampionship?.role),
        });
    }, [currentChampionship]);

    const isAdmin = currentChampionship?.role === 'admin';
    // Handle both number (1) and boolean (true) from database/API
    const isSingleTournament = Boolean(currentChampionship?.is_single_tournament);

    // Debug: log isAdmin calculation
    console.log('🔐 ChampionshipContext isAdmin calculation:', {
        role: currentChampionship?.role,
        isAdmin,
        comparison: currentChampionship?.role === 'admin'
    });

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
