import { useState, useEffect } from 'react';
import PlayersList from '@/react-app/components/PlayersList';
import { useApi, apiRequest } from '@/react-app/hooks/useApi';
import { ScoringRule, TournamentSettings } from '@/shared/types';
import Layout from '@/react-app/components/Layout';
import Card, { CardHeader, CardContent } from '@/react-app/components/Card';
import Button from '@/react-app/components/Button';
import Input from '@/react-app/components/Input';
import { Save, Plus, Loader2, Clock, Coins, Coffee, Trophy, DollarSign, Users } from 'lucide-react';

export default function Settings() {
  const { data: rules, loading: loadingRules, error: rulesError, refresh: refreshRules } = useApi<ScoringRule[]>('/api/scoring-rules');
  const { data: tournamentSettings, loading: loadingSettings, error: settingsError, refresh: refreshSettings } = useApi<TournamentSettings>('/api/tournament-settings');

  const [editingRules, setEditingRules] = useState<{ position: number; points: number }[]>([]);
  const [hasRulesChanges, setHasRulesChanges] = useState(false);
  const [submittingRules, setSubmittingRules] = useState(false);

  const [blindDuration, setBlindDuration] = useState<number>(15);
  const [blindLevels, setBlindLevels] = useState<string>('');
  const [defaultBuyIn, setDefaultBuyIn] = useState<number>(600);
  const [finalTablePercentage, setFinalTablePercentage] = useState<number>(33.33);
  const [finalTableFixedValue, setFinalTableFixedValue] = useState<number>(0);
  const [finalTableType, setFinalTableType] = useState<'percentage' | 'fixed'>('percentage');
  const [totalRounds, setTotalRounds] = useState<number>(24);
  const [firstPlacePercentage, setFirstPlacePercentage] = useState<number>(60);
  const [secondPlacePercentage, setSecondPlacePercentage] = useState<number>(30);
  const [thirdPlacePercentage, setThirdPlacePercentage] = useState<number>(10);
  const [finalTableTopPlayers, setFinalTableTopPlayers] = useState<number>(9);
  const [hasSettingsChanges, setHasSettingsChanges] = useState(false);
  const [submittingSettings, setSubmittingSettings] = useState(false);

  // Load rules when they arrive from API
  useEffect(() => {
    if (rules && editingRules.length === 0) {
      setEditingRules(rules.map((r) => ({ position: r.position, points: r.points })));
    }
  }, [rules]);

  // Load settings when they arrive from API
  useEffect(() => {
    if (tournamentSettings) {
      setBlindDuration(tournamentSettings.blind_level_duration);
      setBlindLevels(tournamentSettings.blind_levels);
      setDefaultBuyIn(tournamentSettings.default_buy_in || 600);
      setFinalTablePercentage(tournamentSettings.final_table_percentage || 33.33);
      setFinalTableFixedValue(tournamentSettings.final_table_fixed_value || 0);
      setFinalTableType(tournamentSettings.final_table_fixed_value && tournamentSettings.final_table_fixed_value > 0 ? 'fixed' : 'percentage');
      setTotalRounds(tournamentSettings.total_rounds || 24);
      setFirstPlacePercentage(tournamentSettings.first_place_percentage || 60);
      setSecondPlacePercentage(tournamentSettings.second_place_percentage || 30);
      setThirdPlacePercentage(tournamentSettings.third_place_percentage || 10);
      setFinalTableTopPlayers(tournamentSettings.final_table_top_players || 9);
    }
  }, [tournamentSettings]);

  const handlePointsChange = (index: number, points: string) => {
    const newRules = [...editingRules];
    newRules[index].points = parseInt(points) || 0;
    setEditingRules(newRules);
    setHasRulesChanges(true);
  };

  const handleAddPosition = () => {
    const nextPosition = editingRules.length + 1;
    setEditingRules([...editingRules, { position: nextPosition, points: 0 }]);
    setHasRulesChanges(true);
  };

  const handleSaveRules = async () => {
    try {
      setSubmittingRules(true);

      for (const rule of editingRules) {
        await apiRequest(`/api/scoring-rules/${rule.position}`, {
          method: 'PUT',
          body: JSON.stringify(rule),
        });
      }

      setHasRulesChanges(false);
      refreshRules();
    } catch (err) {
      console.error('Failed to save scoring rules:', err);
    } finally {
      setSubmittingRules(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSubmittingSettings(true);

      await apiRequest('/api/tournament-settings', {
        method: 'PUT',
        body: JSON.stringify({
          blind_level_duration: blindDuration,
          blind_levels: blindLevels,
          default_buy_in: defaultBuyIn,
          final_table_percentage: finalTableType === 'percentage' ? finalTablePercentage : 0,
          final_table_fixed_value: finalTableType === 'fixed' ? finalTableFixedValue : 0,
          total_rounds: totalRounds,
          first_place_percentage: firstPlacePercentage,
          second_place_percentage: secondPlacePercentage,
          third_place_percentage: thirdPlacePercentage,
          final_table_top_players: finalTableTopPlayers,
        }),
      });

      setHasSettingsChanges(false);
      refreshSettings();
    } catch (err) {
      console.error('Failed to save tournament settings:', err);
    } finally {
      setSubmittingSettings(false);
    }
  };

  const isBreakLevel = (level: string) => {
    return level.toUpperCase().includes('BREAK') || level.toUpperCase().includes('INTERVALO');
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-white">Configurações</h2>
          <p className="text-gray-400 mt-1">Configure o campeonato e as regras de pontuação</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <DollarSign className="w-6 h-6 text-green-400" />
                <h3 className="text-xl font-semibold text-white">Configurações de Premiação</h3>
              </div>
              <Button onClick={handleSaveSettings} loading={submittingSettings} disabled={!hasSettingsChanges}>
                <Save className="w-4 h-4" />
                <span>Salvar</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingSettings ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
              </div>
            ) : settingsError ? (
              <p className="text-center text-red-400 py-12">Erro ao carregar configurações</p>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Buy-in Padrão ($)"
                    type="number"
                    step="0.01"
                    value={defaultBuyIn}
                    onChange={(e) => {
                      setDefaultBuyIn(parseFloat(e.target.value) || 600);
                      setHasSettingsChanges(true);
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Tipo de Valor para Mesa Final
                    </label>
                    <div className="flex space-x-4 mb-3">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={finalTableType === 'percentage'}
                          onChange={() => {
                            setFinalTableType('percentage');
                            setHasSettingsChanges(true);
                          }}
                          className="text-purple-500 focus:ring-purple-500"
                        />
                        <span className="text-gray-300">Porcentagem (%)</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={finalTableType === 'fixed'}
                          onChange={() => {
                            setFinalTableType('fixed');
                            setHasSettingsChanges(true);
                          }}
                          className="text-purple-500 focus:ring-purple-500"
                        />
                        <span className="text-gray-300">Valor Fixo ($)</span>
                      </label>
                    </div>

                    {finalTableType === 'percentage' ? (
                      <Input
                        label="% para Mesa Final"
                        type="number"
                        step="0.01"
                        value={finalTablePercentage}
                        onChange={(e) => {
                          setFinalTablePercentage(parseFloat(e.target.value) || 0);
                          setHasSettingsChanges(true);
                        }}
                      />
                    ) : (
                      <Input
                        label="Valor Fixo para Mesa Final ($)"
                        type="number"
                        step="0.01"
                        value={finalTableFixedValue}
                        onChange={(e) => {
                          setFinalTableFixedValue(parseFloat(e.target.value) || 0);
                          setHasSettingsChanges(true);
                        }}
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Total de Rodadas no Campeonato"
                    type="number"
                    min="1"
                    value={totalRounds}
                    onChange={(e) => {
                      setTotalRounds(parseInt(e.target.value) || 24);
                      setHasSettingsChanges(true);
                    }}
                  />
                  <Input
                    label="Top Jogadores para Mesa Final"
                    type="number"
                    min="1"
                    value={finalTableTopPlayers}
                    onChange={(e) => {
                      setFinalTableTopPlayers(parseInt(e.target.value) || 9);
                      setHasSettingsChanges(true);
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Distribuição de Prêmios por Rodada (%)
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    <Input
                      label="1º Lugar"
                      type="number"
                      step="0.01"
                      value={firstPlacePercentage}
                      onChange={(e) => {
                        setFirstPlacePercentage(parseFloat(e.target.value) || 60);
                        setHasSettingsChanges(true);
                      }}
                    />
                    <Input
                      label="2º Lugar"
                      type="number"
                      step="0.01"
                      value={secondPlacePercentage}
                      onChange={(e) => {
                        setSecondPlacePercentage(parseFloat(e.target.value) || 30);
                        setHasSettingsChanges(true);
                      }}
                    />
                    <Input
                      label="3º Lugar"
                      type="number"
                      step="0.01"
                      value={thirdPlacePercentage}
                      onChange={(e) => {
                        setThirdPlacePercentage(parseFloat(e.target.value) || 10);
                        setHasSettingsChanges(true);
                      }}
                    />
                  </div>
                  <p className="text-gray-400 text-sm mt-2">
                    Total: {(firstPlacePercentage + secondPlacePercentage + thirdPlacePercentage).toFixed(2)}%
                    (restante vai para mesa final)
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Clock className="w-6 h-6 text-purple-400" />
                <h3 className="text-xl font-semibold text-white">Estrutura do Torneio</h3>
              </div>
              <Button onClick={handleSaveSettings} loading={submittingSettings} disabled={!hasSettingsChanges}>
                <Save className="w-4 h-4" />
                <span>Salvar</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingSettings ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
              </div>
            ) : settingsError ? (
              <p className="text-center text-red-400 py-12">Erro ao carregar configurações</p>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Duração dos Níveis de Blinds
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[10, 15, 20].map((duration) => (
                      <button
                        key={duration}
                        type="button"
                        onClick={() => {
                          setBlindDuration(duration);
                          setHasSettingsChanges(true);
                        }}
                        className={`p-4 rounded-lg border transition-all ${blindDuration === duration
                          ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                          }`}
                      >
                        <div className="font-semibold text-lg">{duration} min</div>
                        <div className="text-xs mt-1">por nível</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Níveis de Blinds
                  </label>
                  <p className="text-gray-400 text-sm mb-3">
                    Digite os valores dos blinds separados por vírgula. Use "BREAK" ou "INTERVALO" para intervalos.
                    <br />
                    Exemplo: 100/200,200/400,BREAK,400/800,800/1600
                  </p>
                  <Input
                    value={blindLevels}
                    onChange={(e) => {
                      setBlindLevels(e.target.value);
                      setHasSettingsChanges(true);
                    }}
                    placeholder="100/200,200/400,BREAK,400/800,800/1600"
                    className="font-mono"
                  />
                  {blindLevels && (
                    <div className="mt-4 p-4 bg-white/5 rounded-lg">
                      <div className="text-sm font-medium text-gray-300 mb-2 flex items-center space-x-2">
                        <Coins className="w-4 h-4" />
                        <span>Preview dos Níveis:</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {blindLevels.split(',').map((level, index) => {
                          const isBreak = isBreakLevel(level);
                          return (
                            <div
                              key={index}
                              className={`px-3 py-2 rounded text-sm font-mono ${isBreak
                                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/50'
                                : 'bg-white/5 text-white'
                                }`}
                            >
                              {isBreak && <Coffee className="w-3 h-3 inline mr-1" />}
                              Nível {index + 1}: {level.trim()}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Trophy className="w-6 h-6 text-yellow-400" />
                <h3 className="text-xl font-semibold text-white">Pontuação por Posição</h3>
              </div>
              <div className="flex space-x-3">
                <Button variant="secondary" onClick={handleAddPosition}>
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Posição</span>
                </Button>
                <Button onClick={handleSaveRules} loading={submittingRules} disabled={!hasRulesChanges}>
                  <Save className="w-4 h-4" />
                  <span>Salvar</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingRules ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
              </div>
            ) : rulesError ? (
              <p className="text-center text-red-400 py-12">Erro ao carregar regras</p>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-400 text-sm">
                  Defina quantos pontos cada posição receberá. A partir da 13ª posição, todos recebem 5 pontos de participação.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {editingRules.map((rule, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <span className="text-gray-400 font-semibold w-16">{rule.position}º lugar</span>
                      <Input
                        type="number"
                        value={rule.points}
                        onChange={(e) => handlePointsChange(index, e.target.value)}
                        placeholder="0"
                        min="0"
                        className="flex-1"
                      />
                      <span className="text-gray-400 text-sm">pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <Users className="w-6 h-6 text-blue-400" />
              <h3 className="text-xl font-semibold text-white">Gestão de Jogadores</h3>
            </div>
          </CardHeader>
          <CardContent>
            <PlayersList />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold text-white">Sobre o Sistema</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-white font-medium mb-2">Como Funciona</h4>
              <ul className="text-gray-400 space-y-2 text-sm">
                <li>• Cadastre os jogadores que participarão do campeonato</li>
                <li>• Configure a estrutura do torneio (níveis de blinds, intervalos e duração)</li>
                <li>• Configure os prêmios e a mesa final</li>
                <li>• Defina as regras de pontuação por posição</li>
                <li>• Crie rodadas na aba "Rodadas" e selecione os jogadores</li>
                <li>• Use a tela "Ao Vivo" para acompanhar o jogo em tempo real</li>
                <li>• O sistema calcula automaticamente os prêmios e a mesa final</li>
                <li>• O ranking é atualizado em tempo real após cada rodada</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium mb-2">Sistema de Premiação</h4>
              <p className="text-gray-400 text-sm">
                {finalTableType === 'percentage'
                  ? `${finalTablePercentage.toFixed(2)}% de cada buy-in`
                  : `$${finalTableFixedValue.toFixed(2)} por rodada`} vai para o prêmio da mesa final.
                Os {finalTableTopPlayers} melhores jogadores após {totalRounds} rodadas disputam a mesa final.
                O restante é distribuído em cada rodada: {firstPlacePercentage}% para o 1º lugar,
                {secondPlacePercentage}% para o 2º e {thirdPlacePercentage}% para o 3º.
              </p>
            </div>
            <div>
              <h4 className="text-white font-medium mb-2">Critérios de Desempate</h4>
              <p className="text-gray-400 text-sm">
                Em caso de empate nos pontos, o desempate é feito por: melhor posição alcançada,
                seguido pelo número de rodadas jogadas.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
