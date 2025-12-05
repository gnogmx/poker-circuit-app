import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { ChampionshipWithRole } from '@/shared/types';
import { useAuth } from './AuthContext';

interface ChampionshipContextType {
    currentChampionship: ChampionshipWithRole | null;
    championships: ChampionshipWithRole[];
    loading: boolean;
    isAdmin: boolean;
    setCurrentChampionship: (championship: ChampionshipWithRole | null) => void;
    refreshChampionships: () => Promise<void>;
}

const ChampionshipContext = createContext<ChampionshipContextType | undefined>(undefined);

export function ChampionshipProvider({ children }: { children: ReactNode }) {
    const { user, token } = useAuth();
    const [currentChampionship, setCurrentChampionshipState] = useState<ChampionshipWithRole | null>(() => {
        const stored = localStorage.getItem('current_championship');
        return stored ? JSON.parse(stored) : null;
    });
    const [championships, setChampionships] = useState<ChampionshipWithRole[]>([]);
    const [loading, setLoading] = useState(false);

    const setCurrentChampionship = (championship: ChampionshipWithRole | null) => {
        setCurrentChampionshipState(championship);
        if (championship) {
            localStorage.setItem('current_championship', JSON.stringify(championship));
        } else {
            localStorage.removeItem('current_championship');
        }
    };

    const refreshChampionships = async () => {
        if (!user || !token) {
            setChampionships([]);
            setCurrentChampionship(null);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/championships', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setChampionships(data);

                // If no current championship or it's not in the list, select the first one
                if (!currentChampionship || !data.find((c: ChampionshipWithRole) => c.id === currentChampionship.id)) {
                    if (data.length > 0) {
                        setCurrentChampionship(data[0]);
                    } else {
                        setCurrentChampionship(null);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching championships:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshChampionships();
    }, [user, token]);

    const isAdmin = currentChampionship?.role === 'admin';

    return (
        <ChampionshipContext.Provider value={{
            currentChampionship,
            championships,
            loading,
            isAdmin,
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
