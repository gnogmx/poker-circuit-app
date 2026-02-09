# Poker Circuit - Pendentes e Melhorias

## Status Geral
- **Funcionalidade**: 100% operacional (Campeonato e Torneio Simples)
- **Segurança**: 60% - Precisa de correções antes de produção
- **Polimento Mobile**: 80% - Pequenos ajustes necessários

---

## 1. SEGURANCA (Critico)

### 1.1 Senhas em Texto Plano
- **Arquivo**: `src/worker/index.ts` (linhas 1234-1243)
- **Problema**: Senhas armazenadas sem hash no banco de dados
- **Risco**: Se o banco vazar, todas as senhas ficam expostas
- **Solucao**: Implementar bcrypt ou Argon2 para hash de senhas
- **Prioridade**: CRITICA

### 1.2 Tokens Inseguros
- **Arquivo**: `src/worker/index.ts` (linhas 86-91)
- **Problema**: Token de autenticacao e a propria senha em texto plano
- **Risco**: Tokens podem ser interceptados e usados indefinidamente
- **Solucao**: Implementar JWT com expiracao
- **Prioridade**: CRITICA

### 1.3 Endpoints Sem Autenticacao
- **Arquivos**: `src/worker/index.ts`
- **Problema**: GET endpoints como /api/players, /api/rankings, /api/export nao verificam autenticacao
- **Risco**: Qualquer pessoa pode acessar dados de qualquer campeonato
- **Solucao**: Adicionar middleware de autenticacao em todos os endpoints
- **Prioridade**: ALTA

### 1.4 Stack Traces Expostos
- **Arquivo**: `src/worker/index.ts` (linhas 53-58)
- **Problema**: Erros retornam stack trace completo para o cliente
- **Risco**: Expoe estrutura interna do codigo
- **Solucao**: Retornar apenas mensagens genericas em producao
- **Prioridade**: ALTA

### 1.5 Sem Rate Limiting
- **Problema**: Nenhum limite de requisicoes por IP/usuario
- **Risco**: Vulneravel a brute force em login
- **Solucao**: Implementar rate limiting (ex: 5 tentativas/minuto)
- **Prioridade**: ALTA

### 1.6 Sem CSRF Protection
- **Problema**: Operacoes POST/PUT/DELETE nao tem protecao CSRF
- **Risco**: Ataques de cross-site request forgery
- **Solucao**: Implementar tokens CSRF ou SameSite cookies
- **Prioridade**: MEDIA

### 1.7 Localhost no CORS
- **Arquivo**: `src/worker/index.ts` (linhas 31-36)
- **Problema**: URLs localhost permitidas em producao
- **Solucao**: Usar variaveis de ambiente para configurar origens
- **Prioridade**: MEDIA

### 1.8 IDs de Infraestrutura no Git
- **Arquivo**: `wrangler.json`
- **Problema**: account_id, database_id expostos no repositorio
- **Solucao**: Mover para variaveis de ambiente
- **Prioridade**: BAIXA

---

## 2. INTEGRIDADE DE DADOS

### 2.1 Deletar Jogador com Resultados
- **Arquivo**: `src/react-app/pages/Players.tsx` (linha 74)
- **Problema**: Permite deletar jogador que ja tem resultados em rodadas
- **Risco**: Rankings podem mostrar dados orfaos
- **Solucao**: Bloquear delete ou mostrar aviso com opcao de cascade
- **Prioridade**: MEDIA

### 2.2 Deletar Rodada Ativa
- **Arquivo**: `src/react-app/pages/Rounds.tsx` (linhas 330-334)
- **Problema**: Botao delete disponivel em rodadas em andamento
- **Solucao**: Desabilitar delete para rodadas ativas
- **Prioridade**: MEDIA

### 2.3 Validacao de Formularios
- **Problema**: Nomes de jogadores aceitam so espacos em branco
- **Solucao**: Adicionar trim() e validacao de comprimento minimo
- **Prioridade**: BAIXA

---

## 3. POLIMENTO MOBILE

### 3.1 Safe Area / Notch (iPhone)
- **Arquivo**: `index.html`
- **Problema**: Conteudo pode ser cortado em iPhones com notch
- **Solucao**: Adicionar viewport-fit=cover e CSS safe-area-inset
- **Prioridade**: MEDIA

### 3.2 Botao Voltar Android
- **Problema**: Botao voltar do Android pode fechar o app em vez de navegar
- **Solucao**: Implementar handler para hardware back button
- **Prioridade**: MEDIA

### 3.3 Orientacao de Tela
- **Problema**: App nao forca portrait no Android
- **Arquivo**: `android/app/src/main/AndroidManifest.xml`
- **Solucao**: Adicionar android:screenOrientation="portrait"
- **Prioridade**: BAIXA

### 3.4 Status Bar
- **Problema**: Status bar nao estilizada (cor padrao)
- **Solucao**: Usar plugin @capacitor/status-bar
- **Prioridade**: BAIXA

---

## 4. LIMPEZA DE CODIGO

### 4.1 Console.log de Debug
- **Problema**: 70+ console.log espalhados pelo codigo
- **Arquivos**: Varios (LiveGame.tsx, Settings.tsx, etc)
- **Solucao**: Remover ou usar logger condicional
- **Prioridade**: BAIXA

### 4.2 Mensagens de Erro para Usuario
- **Problema**: Erros de API so aparecem no console, usuario nao ve
- **Arquivos**: Players.tsx, Rounds.tsx, etc
- **Solucao**: Mostrar toast/alert quando API falhar
- **Prioridade**: MEDIA

---

## 5. MELHORIAS FUTURAS (Nice to Have)

### 5.1 Modo Offline
- **Status**: Service Worker desativado intencionalmente
- **Descricao**: App requer internet para funcionar

### 5.2 Push Notifications
- **Descricao**: Notificar jogadores sobre proximas rodadas

### 5.3 Compartilhamento de Ranking
- **Descricao**: Gerar imagem do ranking para compartilhar

### 5.4 Historico de Campeonatos
- **Descricao**: Arquivar campeonatos finalizados

### 5.5 Estatisticas de Jogador
- **Descricao**: Dashboard com historico de performance

---

## Ordem de Prioridade Sugerida

1. **Senhas em Texto Plano** (1.1) - CRITICO
2. **Tokens Inseguros** (1.2) - CRITICO
3. **Endpoints Sem Autenticacao** (1.3) - ALTA
4. **Stack Traces Expostos** (1.4) - ALTA
5. **Rate Limiting** (1.5) - ALTA
6. **Safe Area Mobile** (3.1) - MEDIA
7. **Mensagens de Erro** (4.2) - MEDIA
8. **Deletar Jogador** (2.1) - MEDIA
9. **CSRF Protection** (1.6) - MEDIA
10. **Resto** - BAIXA

---

## Checklist de Implementacao

- [ ] 1.1 Implementar hash de senhas
- [ ] 1.2 Implementar JWT
- [ ] 1.3 Proteger endpoints GET
- [ ] 1.4 Esconder stack traces
- [ ] 1.5 Adicionar rate limiting
- [ ] 1.6 CSRF protection
- [ ] 1.7 Remover localhost do CORS
- [ ] 1.8 Mover IDs para env vars
- [ ] 2.1 Validar delete de jogador
- [ ] 2.2 Bloquear delete rodada ativa
- [ ] 2.3 Validar formularios
- [ ] 3.1 Safe area CSS
- [ ] 3.2 Android back button
- [ ] 3.3 Forcar portrait
- [ ] 3.4 Estilizar status bar
- [ ] 4.1 Remover console.logs
- [ ] 4.2 Mostrar erros ao usuario
