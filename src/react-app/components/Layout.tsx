import { Link, useLocation, useNavigate } from 'react-router';
import { Trophy, ListOrdered, Settings, Radio, LogIn, LogOut, RefreshCw, Globe } from 'lucide-react';
import { useAuth } from '@/react-app/contexts/AuthContext';
import { useChampionship } from '@/react-app/contexts/ChampionshipContext';
import { useLanguage } from '@/react-app/hooks/useLanguage';
import { useState } from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { currentChampionship, setCurrentChampionship, isSingleTournament } = useChampionship();
  const { language, setLanguage } = useLanguage();
  const [showLangMenu, setShowLangMenu] = useState(false);

  const languageLabels: Record<string, string> = {
    'pt': '🇧🇷 PT',
    'es': '🇪🇸 ES',
    'en': '🇺🇸 EN'
  };

  const { t } = useLanguage();

  //Filter out all navigation for single tournament (only quick-setup and /live available)
  const navItems = isSingleTournament ? [
    { path: '/live', icon: Radio, label: t('live') },
    { path: '/quick-setup', icon: Settings, label: t('settings') },
  ] : [
    { path: '/', icon: Trophy, label: t('ranking') },
    { path: '/rounds', icon: ListOrdered, label: t('rounds') },
    { path: '/live', icon: Radio, label: t('live') },
    { path: '/settings', icon: Settings, label: t('settings') },
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
    <div key={layoutKey} className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="bg-gradient-to-r from-slate-900/50 to-blue-900/50 border-b border-white/10 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-2 sm:py-0 sm:h-16 gap-2 sm:gap-0">
            {/* Logo and Game Info */}
            <div className="flex items-center space-x-2 sm:space-x-4 flex-1 sm:flex-none">
              <img
                src="/poker_pro_spade_logo.png"
                alt="Poker Circuit"
                className="h-8 w-8 sm:h-10 sm:w-10 object-contain flex-shrink-0"
              />
              {currentChampionship && (
                <div className="flex items-center space-x-2 min-w-0">
                  <span className="text-white text-sm sm:text-base font-semibold truncate max-w-[120px] sm:max-w-[200px]">{currentChampionship.name}</span>
                  <span className={`flex-shrink-0 px-1.5 sm:px-2 py-0.5 rounded text-xs font-semibold ${isSingleTournament
                    ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}>
                    {isSingleTournament ? '🎲' : '🏆'}
                  </span>
                </div>
              )}
            </div>

            {/* Navigation */}
            <nav className="flex space-x-1 w-full sm:w-auto order-3 sm:order-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center justify-center sm:justify-start space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 rounded-lg transition-colors flex-1 sm:flex-none ${isActive
                      ? 'bg-white/10 text-white'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs sm:text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right side actions */}
            <div className="flex items-center space-x-1 sm:space-x-3 order-2 sm:order-3 ml-auto sm:ml-0">
              {/* Language Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowLangMenu(!showLangMenu)}
                  className="flex items-center space-x-1 px-2 sm:px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                >
                  <Globe className="w-4 h-4" />
                  <span className="text-xs sm:text-sm font-medium hidden sm:inline">{languageLabels[language]}</span>
                </button>
                {showLangMenu && (
                  <div className="absolute right-0 mt-2 w-28 sm:w-32 bg-slate-800 border border-white/10 rounded-lg shadow-lg z-50">
                    {(['pt', 'es', 'en'] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => {
                          setLanguage(lang);
                          setShowLangMenu(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition-colors ${language === lang ? 'text-blue-400 bg-white/5' : 'text-gray-300'
                          }`}
                      >
                        {languageLabels[lang]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {currentChampionship && (
                <button
                  onClick={handleSwitchChampionship}
                  className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-all"
                  title="Trocar Campeonato"
                >
                  <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline font-medium text-sm">Trocar</span>
                </button>
              )}
              {user ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                  title="Sair"
                >
                  <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline font-medium text-sm">Sair</span>
                </button>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                  title="Login Admin"
                >
                  <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline font-medium text-sm">Admin</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <footer className="py-4 text-center text-xs text-gray-600">
        {t('versionFooter')}
      </footer>
    </div>
  );
}
