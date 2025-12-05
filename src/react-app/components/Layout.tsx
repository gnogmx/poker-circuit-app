import { Link, useLocation, useNavigate } from 'react-router';
import { Trophy, ListOrdered, Settings, Radio, LogIn, LogOut, Shield, RefreshCw } from 'lucide-react';
import { useAuth } from '@/react-app/contexts/AuthContext';
import { useChampionship } from '@/react-app/contexts/ChampionshipContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuth();
  const { currentChampionship, setCurrentChampionship } = useChampionship();

  const navItems = [
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <nav className="bg-black/30 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/50">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Poker Pro
              </h1>
              {currentChampionship && (
                <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-purple-500/20 border border-purple-500/30">
                  <span className="text-xs font-semibold text-purple-400">{currentChampionship.name}</span>
                </div>
              )}
              {user && (
                <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-white/10 border border-white/20">
                  <Shield className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-400">{user.name}</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${isActive
                      ? 'bg-purple-500/20 text-purple-300 shadow-lg shadow-purple-500/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="hidden sm:inline font-medium">{item.label}</span>
                  </Link>
                );
              })
              }
              {currentChampionship && (
                <button
                  onClick={handleSwitchChampionship}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  <RefreshCw className="w-5 h-5" />
                  <span className="hidden sm:inline font-medium">Trocar</span>
                </button>
              )}
              {isAdmin ? (
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
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
