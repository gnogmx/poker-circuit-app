# Configuração para Lançamento nas App Stores

## Objetivo
Preparar o app Poker Circuit para lançamento na Google Play Store e Apple App Store, duplicando o projeto para manter o PWA atual (com campeonato ativo) separado e intocado.

## Checklist

### [ ] Duplicação do Projeto
- [x] Copiar projeto `extracted_poker_pro` → `poker-circuit-app`
- [ ] Instalar dependências (`npm install`)
- [ ] Criar novo banco D1 separado
- [ ] Atualizar `wrangler.json` com novo database_id
- [ ] Executar migrations no novo banco
- [ ] Deploy do worker separado
- [ ] Atualizar `capacitor.config.ts` com nova URL

### [ ] Materiais de Marketing
- [ ] Gerar ícone 1024x1024 (iOS)
- [ ] Gerar ícone 512x512 (Android)
- [ ] Capturar screenshots das principais telas
- [ ] Escrever descrição do app
- [ ] Criar política de privacidade
- [ ] Configurar email de suporte

### [ ] Google Play Store
- [ ] Verificar conta Google Play ativa
- [ ] Criar keystore de produção
- [ ] Configurar signing no `build.gradle`
- [ ] Gerar build AAB
- [ ] Criar app no Google Play Console
- [ ] Preencher metadados
- [ ] Enviar para beta fechado
- [ ] Adicionar testadores

### [ ] Apple App Store
- [ ] Verificar Apple Developer ativa
- [ ] Criar App ID no portal
- [ ] Configurar certificados
- [ ] Configurar Xcode
- [ ] Gerar archive
- [ ] Criar app no App Store Connect
- [ ] Preencher metadados
- [ ] Configurar TestFlight
- [ ] Adicionar testadores

### [ ] Correções de Segurança (Apenas App Novo)
- [ ] Implementar hash de senhas (bcrypt)
- [ ] Implementar JWT com expiração
- [ ] Proteger endpoints GET com autenticação
- [ ] Adicionar rate limiting
- [ ] Esconder stack traces em produção
- [ ] Configurar CORS por environment

### [ ] Testes e Validação
- [ ] Testar app localmente
- [ ] Validar que PWA original não foi afetado
- [ ] Beta testing com usuários fechados
- [ ] Corrigir bugs encontrados
- [ ] Validação final antes de produção

### [ ] Lançamento
- [ ] Beta fechado funcionando estável
- [ ] Submeter para revisão (Google)
- [ ] Submeter para revisão (Apple)
- [ ] Monitorar aprovação
- [ ] Lançamento gradual
