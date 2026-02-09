# Plano de Lançamento - Google Play Store & Apple App Store

## 🚨 IMPORTANTE - Contexto Atual

**Status do App**: Torneio anual em andamento com usuários ativos
**Restrição CRÍTICA**: NÃO mexer em código que possa quebrar funcionalidades existentes
**Pendentes de Segurança**: Existem issues críticos documentados em `PENDENTES.md` que precisam ser resolvidos APÓS o torneio

---

## ⚠️ ADVERTÊNCIA DE SEGURANÇA

> [!CAUTION]
> O app possui vulnerabilidades de segurança críticas que **DEVEM** ser corrigidas antes do lançamento público:
> - Senhas em texto plano (CRÍTICO)
> - Tokens inseguros sem expiração (CRÍTICO)
> - Endpoints sem autenticação (ALTO)
> - Sem rate limiting (ALTO)
> - Stack traces expostos (ALTO)
>
> **Recomendação**: Publicar primeiro em **Beta Fechado** (TestFlight/Internal Testing) para corrigir issues de segurança antes do lançamento público.

---

## Estratégia Recomendada

### Fase 1: Durante o Torneio (SEM MEXER NO APP)
- ✅ Preparar contas de desenvolvedor
- ✅ Criar materiais de marketing (screenshots, descrições)
- ✅ Configurar builds e assinaturas
- ✅ Preparar lançamento em **Beta Fechado**

### Fase 2: Após o Torneio
- 🔒 Corrigir vulnerabilidades de segurança críticas
- 🧪 Testar extensivamente em beta
- 🚀 Lançamento público gradual

---

## 📱 PARTE 1: Google Play Store

### 1.1 Pré-requisitos

#### Conta Google Play Developer
- **Custo**: US$ 25 (pagamento único)
- **Tempo de aprovação**: Pode levar 48h
- **Link**: [Google Play Console](https://play.google.com/console)
- **Documentos necessários**:
  - Cartão de crédito válido
  - Informações fiscais (CPF/CNPJ)
  - Endereço de contato

#### Materiais de Marketing
- **Ícone do app**: 512x512 px (PNG, sem alpha)
- **Feature Graphic**: 1024x500 px (JPG ou PNG)
- **Screenshots**:
  - Mínimo: 2 screenshots
  - Recomendado: 8 screenshots mostrando principais funcionalidades
  - Tamanhos: 
    - Telefone: 1080x1920 px (ou qualquer tamanho 16:9)
    - Tablet (opcional): 1536x2048 px
- **Descrição curta**: Máximo 80 caracteres
- **Descrição completa**: Máximo 4000 caracteres
- **Vídeo promocional** (opcional): Link do YouTube

#### Informações Legais
- **Política de Privacidade**: URL obrigatório
- **Endereço de contato**: Email válido
- **Classificação de conteúdo**: Responder questionário IARC

---

### 1.2 Configuração do Projeto Android

#### Keystore (Assinatura do App)
```bash
# Gerar keystore de produção (FAZER BACKUP SEGURO!)
keytool -genkeypair -v -keystore poker-circuit-release.keystore \
  -alias poker-circuit -keyalg RSA -keysize 2048 -validity 10000

# IMPORTANTE: Guardar senhas em local seguro (1Password, Bitwarden)
# Se perder o keystore, NUNCA poderá atualizar o app!
```

**Informações do Keystore a guardar**:
- Caminho do arquivo `.keystore`
- Senha do keystore
- Alias da chave
- Senha da chave

#### Atualizar `android/app/build.gradle`
```gradle
android {
    signingConfigs {
        release {
            storeFile file("../../poker-circuit-release.keystore")
            storePassword "SUA_SENHA_KEYSTORE"
            keyAlias "poker-circuit"
            keyPassword "SUA_SENHA_CHAVE"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
        }
    }
}
```

> [!WARNING]
> **NÃO commitar** senhas no Git! Use variáveis de ambiente ou `keystore.properties` (adicionar ao `.gitignore`)

#### Build de Produção
```bash
# Navegar para pasta android
cd android

# Gerar AAB (Android App Bundle) - RECOMENDADO
./gradlew bundleRelease

# OU gerar APK (alternativa)
./gradlew assembleRelease

# Arquivo gerado em:
# android/app/build/outputs/bundle/release/app-release.aab
# android/app/build/outputs/apk/release/app-release.apk
```

---

### 1.3 Criar App no Google Play Console

#### Passo 1: Criar Aplicativo
1. Acessar [Google Play Console](https://play.google.com/console)
2. Clicar em **"Criar app"**
3. Preencher:
   - Nome do app: "Poker Circuit" (ou nome desejado)
   - Idioma padrão: Português (Brasil)
   - Tipo: App | Jogo
   - Gratuito ou pago: Gratuito
4. Aceitar políticas

#### Passo 2: Configurar Painel Principal
1. **Painel principal** → Completar tarefas obrigatórias:
   - ✅ Definir privacidade do app
   - ✅ Selecionar categoria
   - ✅ Fornecer informações de contato
   - ✅ Configurar política de privacidade

#### Passo 3: Enviar Build
1. **Produção** → **Criar nova versão**
2. Upload do arquivo `app-release.aab`
3. Preencher **"Notas da versão"** (changelog)
4. Revisar e lançar

#### Passo 4: Escolher Tipo de Lançamento

**Opção A: Beta Fechado (RECOMENDADO para você)**
- Permite testar com grupo limitado (até 100 testadores)
- Não aparece na busca pública
- Aprovação mais rápida
- Ideal para corrigir bugs de segurança

**Opção B: Beta Aberto**
- Qualquer pessoa pode participar
- Limite de até 10.000 testadores
- Aparece na Play Store como "Acesso antecipado"

**Opção C: Produção**
- Lançamento público completo
- Aprovação leva 1-7 dias
- **NÃO recomendado até corrigir vulnerabilidades**

---

### 1.4 Tempo de Aprovação

- **Beta Fechado**: 1-3 horas
- **Beta Aberto**: 1-2 dias
- **Produção**: 1-7 dias (média 2-3 dias)
- **Rejeição**: Se houver problemas, Google informa por email

---

## 🍎 PARTE 2: Apple App Store

### 2.1 Pré-requisitos

#### Apple Developer Program
- **Custo**: US$ 99/ano (renovação anual)
- **Tempo de aprovação**: Pode levar 48h-7 dias
- **Link**: [Apple Developer](https://developer.apple.com/programs/)
- **Documentos necessários**:
  - Cartão de crédito válido
  - Informações fiscais
  - Verificação de identidade (pode exigir foto de documento)

#### Materiais de Marketing (iOS)
- **Ícone do app**: 1024x1024 px (PNG, sem alpha, sem cantos arredondados)
- **Screenshots**:
  - iPhone 6.7" (obrigatório): 1290x2796 px
  - iPhone 6.5" (obrigatório): 1242x2688 px
  - iPad Pro 12.9" (se suportar): 2048x2732 px
  - Mínimo: 3 screenshots por tamanho
  - Máximo: 10 screenshots por tamanho
- **Prévia do app** (opcional): Vídeos de 15-30 segundos
- **Descrição do app**: Máximo 4000 caracteres
- **Texto promocional**: Máximo 170 caracteres (pode ser editado sem nova revisão)
- **Palavras-chave**: Máximo 100 caracteres (separadas por vírgula)

#### Informações Legais (iOS)
- **Política de Privacidade**: URL obrigatório
- **Suporte ao app**: URL ou email
- **EULA** (opcional): Termos de uso customizados
- **Classificação etária**: Responder questionário da Apple

---

### 2.2 Configuração do Projeto iOS

#### Certificados e Provisioning Profiles

1. **Acessar Apple Developer Portal**
   - Link: [Certificates, IDs & Profiles](https://developer.apple.com/account/resources/certificates)

2. **Criar App ID**
   - Identifier: `com.seudominio.pokercircuit` (ex: `com.gnog.pokercircuit`)
   - Capabilities necessárias:
     - ✅ Associated Domains (se usar links universais)
     - ✅ Push Notifications (se implementar futuramente)

3. **Criar Certificado de Distribuição**
   - Tipo: **iOS Distribution** (App Store and Ad Hoc)
   - Gerar CSR no Keychain Access (Mac):
     - Keychain Access → Certificate Assistant → Request Certificate from CA
     - Salvar arquivo `.certSigningRequest`
   - Upload do CSR no portal
   - Baixar certificado `.cer` e instalar no Keychain

4. **Criar Provisioning Profile**
   - Tipo: **App Store**
   - Selecionar App ID criado
   - Selecionar certificado de distribuição
   - Baixar perfil `.mobileprovision`

#### Xcode Configuration

1. **Abrir projeto no Xcode**
   ```bash
   cd ios
   open App.xcworkspace
   ```

2. **Configurar Signing**
   - Target: **App**
   - Signing & Capabilities:
     - ✅ Automatically manage signing (ou manual se preferir controle)
     - Team: Selecionar sua conta de desenvolvedor
     - Bundle Identifier: `com.seudominio.pokercircuit`

3. **Atualizar versão**
   - General → Identity:
     - Version: `1.0.0` (visível para usuário)
     - Build: `1` (número interno, incrementa a cada upload)

4. **Configurar App Icon**
   - Assets.xcassets → AppIcon:
     - Adicionar ícone 1024x1024 px

#### Build de Produção (iOS)

```bash
# Método 1: Via Xcode (RECOMENDADO)
# 1. Selecionar "Any iOS Device (arm64)" como destino
# 2. Product → Archive
# 3. Aguardar build
# 4. Window → Organizer → Archives
# 5. "Distribute App" → "App Store Connect" → Upload

# Método 2: Via linha de comando (avançado)
xcodebuild -workspace ios/App.xcworkspace \
  -scheme App \
  -configuration Release \
  -archivePath build/App.xcarchive \
  archive

xcodebuild -exportArchive \
  -archivePath build/App.xcarchive \
  -exportPath build \
  -exportOptionsPlist ExportOptions.plist
```

---

### 2.3 Criar App no App Store Connect

#### Passo 1: Criar Novo App
1. Acessar [App Store Connect](https://appstoreconnect.apple.com)
2. **My Apps** → **+ (Novo App)**
3. Preencher:
   - Plataforma: iOS
   - Nome: "Poker Circuit" (máx 30 caracteres)
   - Idioma principal: Português (Brasil)
   - Bundle ID: Selecionar o criado anteriormente
   - SKU: Código interno único (ex: `poker-circuit-001`)
   - Acesso do usuário: Acesso completo

#### Passo 2: Preencher Informações do App
1. **App Information**:
   - Categoria primária: Jogos → Card
   - Categoria secundária (opcional): Entretenimento
   - Política de privacidade (URL obrigatório)
   - Website de suporte

2. **Pricing and Availability**:
   - Preço: Gratuito
   - Disponibilidade: Todos os países (ou selecionar específicos)

3. **Preparar para Envio**:
   - Screenshots (por tamanho de dispositivo)
   - Descrição do app
   - Palavras-chave
   - URL de suporte
   - URL de marketing (opcional)

#### Passo 3: Enviar Build
1. Upload do build via Xcode (ver seção 2.2)
2. Aguardar processamento (5-30 minutos)
3. Em **App Store Connect**, seção **Build**:
   - Selecionar build enviado
   - Responder questionário de conformidade de exportação (geralmente "No")

#### Passo 4: TestFlight (Beta Fechado) - RECOMENDADO

**Configurar TestFlight**:
1. **TestFlight** → **Internal Testing**
2. Criar grupo de teste:
   - Nome: "Equipe Interna"
   - Adicionar testadores (até 100 emails)
3. Selecionar build
4. Testadores recebem convite automático via email
5. Instalam app **TestFlight** e testam

**Vantagens do TestFlight**:
- ✅ Aprovação automática (sem revisão da Apple)
- ✅ Feedback direto de testadores
- ✅ Distribuição rápida de atualizações
- ✅ Ideal para corrigir bugs antes do lançamento público

#### Passo 5: Enviar para Revisão (Produção)
1. Completar todas as seções obrigatórias
2. **App Review Information**:
   - Nome de contato
   - Telefone
   - Email
   - Notas para revisão (se houver login, fornecer credenciais de teste)
3. **Version Release**:
   - Lançamento manual (você controla quando)
   - Lançamento automático após aprovação
4. **Submit for Review**

---

### 2.4 Tempo de Aprovação (iOS)

- **TestFlight**: Imediato (sem revisão)
- **Primeira submissão**: 2-7 dias (média 3-4 dias)
- **Atualizações**: 1-3 dias
- **Rejeição**: Apple fornece motivos detalhados, permite correção e re-submissão

---

## 📋 CHECKLIST GERAL DE LANÇAMENTO

### Antes de Começar
- [ ] Criar conta Google Play Developer (US$ 25)
- [ ] Criar conta Apple Developer Program (US$ 99/ano)
- [ ] Criar página de Política de Privacidade (pode usar geradores online)
- [ ] Preparar email de suporte
- [ ] Criar ícone 1024x1024 (iOS) e 512x512 (Android)
- [ ] Tirar screenshots do app (ambas plataformas)
- [ ] Escrever descrição do app (português/inglês)

### Android (Google Play)
- [ ] Gerar keystore de produção (BACKUP SEGURO!)
- [ ] Configurar signing no `build.gradle`
- [ ] Build AAB: `./gradlew bundleRelease`
- [ ] Criar app no Google Play Console
- [ ] Upload do AAB
- [ ] Configurar beta fechado (RECOMENDADO)
- [ ] Convidar testadores beta
- [ ] Testar correções de segurança
- [ ] Promover para produção

### iOS (Apple)
- [ ] Criar App ID no Developer Portal
- [ ] Gerar certificado de distribuição
- [ ] Criar provisioning profile
- [ ] Configurar signing no Xcode
- [ ] Archive via Xcode
- [ ] Upload para App Store Connect
- [ ] Criar app no App Store Connect
- [ ] Preencher metadados completos
- [ ] Configurar TestFlight (RECOMENDADO)
- [ ] Convidar testadores beta
- [ ] Testar correções de segurança
- [ ] Submeter para revisão

---

## 🔒 CORREÇÕES DE SEGURANÇA PÓS-TORNEIO

> [!IMPORTANT]
> Estas correções são **OBRIGATÓRIAS** antes do lançamento público. Realizar durante fase de beta fechado.

### Prioridade CRÍTICA
1. **Hash de senhas** (bcrypt/Argon2)
   - Arquivo: `src/worker/index.ts` linhas 1234-1243
   - Impossível fazer migração sem downtime

2. **Tokens JWT** com expiração
   - Arquivo: `src/worker/index.ts` linhas 86-91
   - Usuários precisarão fazer login novamente

3. **Autenticação em endpoints GET**
   - Arquivo: `src/worker/index.ts`
   - Pode quebrar integrações existentes

### Prioridade ALTA
4. **Rate limiting** (proteção brute force)
5. **Esconder stack traces** em produção
6. **CORS** configurado por environment variables

### Teste Antes do Lançamento Público
- [ ] Criar ambiente de staging
- [ ] Testar autenticação completa
- [ ] Validar que usuários existentes migram corretamente
- [ ] Testar todos os fluxos principais
- [ ] Validar segurança com ferramentas (OWASP ZAP)

---

## 🚀 PLANO DE LANÇAMENTO GRADUAL

### Semana 1: Preparação (Durante Torneio)
- Criar contas de desenvolvedor
- Preparar materiais de marketing
- Gerar builds de produção
- Configurar apps nas lojas

### Semana 2: Beta Fechado (Após Torneio)
- Lançar em TestFlight (iOS) e Internal Testing (Android)
- Implementar correções críticas de segurança
- Testar extensivamente com equipe

### Semana 3-4: Beta Aberto (Opcional)
- Expandir testes para público maior
- Coletar feedback
- Corrigir bugs encontrados

### Semana 5+: Lançamento Público
- Submeter para produção na App Store
- Publicar na Google Play Store
- Monitorar reviews e crashes
- Lançamento gradual por país (recomendado)

---

## 💡 DICAS IMPORTANTES

### Geral
- ✅ **Sempre testar em beta primeiro** - nunca vá direto para produção
- ✅ **Backup do keystore Android** - perder = nunca poder atualizar o app
- ✅ **Versioning semântico** - 1.0.0, 1.0.1, 1.1.0, etc.
- ✅ **Changelogs claros** - usuários leem as notas de versão
- ⚠️ **Reviews negativos destroem apps** - lançar com bugs = desastre

### Google Play
- Aprovação é mais rápida que Apple
- Pode fazer lançamento gradual (5% → 10% → 50% → 100%)
- Beta fechado não aparece em buscas públicas
- Pode pausar rollout se detectar problema

### Apple App Store
- Revisão é mais criteriosa e demorada
- TestFlight é excelente para beta
- Pode rejeitar por bugs ou crashes
- Fornecer credenciais de teste facilita aprovação
- Notas para revisão ajudam a contextualizar o app

### Segurança
- **Nunca** lançar em produção com senhas em texto plano
- **Sempre** corrigir vulnerabilidades críticas antes de público
- Beta fechado é seguro porque você controla quem acessa
- Considere contratar audit de segurança antes do lançamento público

---

## 📞 RECURSOS E SUPORTE

### Google Play
- [Documentação oficial](https://developer.android.com/distribute)
- [Play Console](https://play.google.com/console)
- [Política de Conteúdo](https://play.google.com/about/developer-content-policy/)
- [Suporte](https://support.google.com/googleplay/android-developer)

### Apple
- [Documentação oficial](https://developer.apple.com/app-store/)
- [App Store Connect](https://appstoreconnect.apple.com/)
- [Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [TestFlight](https://developer.apple.com/testflight/)
- [Suporte](https://developer.apple.com/support/)

### Ferramentas Úteis
- **App Icon Generator**: [AppIcon.co](https://appicon.co/)
- **Screenshot Frames**: [Screenshot.rocks](https://screenshot.rocks/)
- **Privacy Policy Generator**: [PrivacyPolicies.com](https://www.privacypolicies.com/)
- **Versioning**: [Semantic Versioning](https://semver.org/)

---

## ✅ PRÓXIMOS PASSOS IMEDIATOS

### Hoje/Esta Semana (SEM TOCAR NO CÓDIGO)
1. Criar conta Google Play Developer
2. Criar conta Apple Developer Program
3. Gerar ícones do app (1024x1024 e 512x512)
4. Tirar screenshots de todas as telas principais
5. Escrever descrição do app
6. Criar URL para Política de Privacidade

### Após o Torneio Terminar
1. Criar branch de segurança (`security-fixes`)
2. Implementar correções críticas (hash senha, JWT, auth)
3. Testar extensivamente em staging
4. Lançar em beta fechado (TestFlight + Internal Testing)
5. Após validação → lançamento público gradual

---

**Última atualização**: 2026-02-09
**Versão do plano**: 1.0
