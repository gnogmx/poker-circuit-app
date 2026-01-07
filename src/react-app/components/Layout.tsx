import { Link, useLocation, useNavigate } from 'react-router';
import { Trophy, ListOrdered, Settings, Radio, LogIn, LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '@/react-app/contexts/AuthContext';
import { useChampionship } from '@/react-app/contexts/ChampionshipContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { currentChampionship, setCurrentChampionship, isSingleTournament } = useChampionship();

  //Filter out all navigation for single tournament (only quick-setup and /live available)
  const navItems = isSingleTournament ? [
    { path: '/live', icon: Radio, label: 'Ao Vivo' },
    { path: '/quick-setup', icon: Settings, label: 'Configurações' },
  ] : [
    { path: '/', icon: Trophy, label: 'Ranking' },
    { path: '/rounds', icon: ListOrdered, label: 'Rodadas' },
    { path: '/live', icon: Radio, label: 'Ao Vivo' },
    { path: '/settings', icon: Settings, label: 'Configurações' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSwitchChampionship = () => {
    setCurrentChampionship(null);
  };

  // Force remount when championship type changes
  const layoutKey = `${currentChampionship?.id}-${isSingleTournament}`;

  return (
    <div key={layoutKey} className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <header className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 border-b border-white/10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Game Info */}
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Poker Pro
              </div>
              {currentChampionship && (
                <div className="flex items-center space-x-2">
                  <span className="text-white font-semibold">{currentChampionship.name}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${isSingleTournament
                    ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                    : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    }`}>
                    {isSingleTournament ? '🎲 JOGO ÚNICO' : '🏆 CAMPEONATO'}
                  </span>
                </div>
              )}
            </div>

            {/* Navigation */}
            <nav className="flex space-x-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${isActive
                        ? 'bg-white/10 text-white'
                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right side actions */}
            <div className="flex items-center space-x-3">
              {currentChampionship && (
                <button
                  onClick={handleSwitchChampionship}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                >
                  <RefreshCw className="w-5 h-5" />
                  <span className="hidden sm:inline font-medium">Trocar</span>
                </button>
              )}
              {user ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="hidden sm:inline font-medium">Sair</span>
                </button>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  <LogIn className="w-5 h-5" />
                  <span className="hidden sm:inline font-medium">Admin</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
