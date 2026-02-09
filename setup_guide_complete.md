# Guia Completo: Configuração e Duplicação do Projeto

## 🎯 Estratégia: Dois Ambientes Separados

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  PWA ATUAL (Produção)          APP STORES (Novo)            │
│  ────────────────────          ──────────────────           │
│                                                              │
│  • URL atual (Cloudflare)      • Google Play                │
│  • Banco atual (D1)            • Apple App Store            │
│  • Campeonato 2026             • Banco novo (D1)            │
│  • SEM MEXER EM NADA!          • Com correções segurança    │
│  • Roda até dezembro           • Testes e validação         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## PARTE 1: Configuração das Contas (Você Já Pagou ✅)

### 1.1 Google Play Console - Primeiro Acesso

#### Passo 1: Acessar o Console
1. Ir para: https://play.google.com/console
2. Fazer login com a conta Google que você usou para pagar
3. Se pediu pra preencher perfil de desenvolvedor, completar:
   - Nome do desenvolvedor (pode ser seu nome ou "Poker Circuit")
   - Email de contato público
   - Site (pode deixar em branco por enquanto)
   - Aceitar termos

#### Passo 2: Verificar Status da Conta
- Conta aprovada? Pode levar até 48h
- Status: "Verificada" ✅ ou "Pendente" ⏳
- Se pendente: aguardar email do Google

#### Passo 3: Configurar Informações Fiscais (Obrigatório)
1. No menu lateral: **Configurações** → **Conta**
2. **Informações fiscais**:
   - País: Brasil
   - Tipo: Individual ou Empresa
   - CPF ou CNPJ
   - Endereço completo
3. Salvar

---

### 1.2 Apple Developer - Primeiro Acesso

#### Passo 1: Acessar o Portal
1. Ir para: https://developer.apple.com/account
2. Login com Apple ID usado para pagar
3. Se pediu mais informações, preencher perfil

#### Passo 2: Verificar Status do Programa
1. Ir para: **Membership** (menu lateral)
2. Status esperado: "Active" ✅
3. Se "Pending": pode levar 24-48h
4. Tipo: "Apple Developer Program" (US$ 99)
5. Válido até: (renova anualmente)

#### Passo 3: Aceitar Contratos
1. Ir para: https://appstoreconnect.apple.com
2. **Agreements, Tax, and Banking**
3. **Paid Applications Agreement**:
   - Request (se ainda não fez)
   - Preencher informações legais
   - Informações bancárias (se for cobrar)
   - Aceitar termos

> [!NOTE]
> Para app gratuito, pode pular informações bancárias, mas precisa aceitar o contrato base.

---

## PARTE 2: Duplicação do Projeto

### 2.1 Estrutura de Diretórios

```bash
/Users/gnog/
├── extracted_poker_pro/           # PWA ATUAL - NÃO MEXER!
│   ├── src/
│   ├── wrangler.json
│   └── ... (código existente)
│
└── poker-circuit-app/             # NOVO - Para App Stores
    ├── src/
    ├── wrangler.json
    ├── ios/
    ├── android/
    └── ... (código duplicado + correções)
```

### 2.2 Passos para Duplicação

#### Passo 1: Copiar Projeto Completo
```bash
# No terminal:
cd /Users/gnog/

# Copiar tudo
cp -r extracted_poker_pro poker-circuit-app

# Entrar no novo projeto
cd poker-circuit-app

# Verificar que copiou tudo
ls -la
```

#### Passo 2: Criar Novo Banco D1 (Cloudflare)
```bash
# Criar banco separado para o app
npx wrangler d1 create poker-circuit-app-db

# Output vai mostrar algo como:
# database_name = "poker-circuit-app-db"
# database_id = "xxxx-xxxx-xxxx-xxxx"

# ANOTAR esse database_id!
```

#### Passo 3: Atualizar wrangler.json
```json
{
  "name": "poker-circuit-app",
  "main": "src/worker/index.ts",
  "compatibility_date": "2024-01-01",
  "node_compat": true,
  "account_id": "SEU_ACCOUNT_ID",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "poker-circuit-app-db",
      "database_id": "NOVO_DATABASE_ID"
    }
  ]
}
```

#### Passo 4: Criar Schema no Novo Banco
```bash
# Executar migrations no banco NOVO
npx wrangler d1 execute poker-circuit-app-db --remote --file=./schema.sql
```

#### Passo 5: Atualizar Configuração do App
Editar `capacitor.config.ts`:
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gnog.pokercircuit',
  appName: 'Poker Circuit',
  webDir: 'dist',
  server: {
    url: 'https://poker-circuit-app.SEU-DOMINIO.workers.dev',
    cleartext: true
  }
};

export default config;
```

---

## PARTE 3: Google Play Setup

### 3.1 Criar Keystore

```bash
cd /Users/gnog/poker-circuit-app

keytool -genkeypair -v \
  -keystore poker-circuit-release.keystore \
  -alias poker-circuit \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# ANOTAR senhas em lugar seguro!
# FAZER BACKUP do arquivo .keystore!
```

### 3.2 Configurar Signing

Criar `android/keystore.properties`:
```properties
storeFile=../../poker-circuit-release.keystore
storePassword=SUA_SENHA
keyAlias=poker-circuit
keyPassword=SUA_SENHA_CHAVE
```

Editar `android/app/build.gradle`:
```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
keystoreProperties.load(new FileInputStream(keystorePropertiesFile))

android {
    signingConfigs {
        release {
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

### 3.3 Gerar Build
```bash
npm run build
npx cap sync android
cd android
./gradlew bundleRelease
# Arquivo em: android/app/build/outputs/bundle/release/app-release.aab
```

### 3.4 Criar App e Enviar para Beta
1. Acessar [Google Play Console](https://play.google.com/console)
2. Criar app "Poker Circuit"
3. Preencher informações básicas
4. Ir para **Testes** → **Teste fechado**
5. Upload do AAB
6. Adicionar testadores (emails)
7. Lançar beta

---

## PARTE 4: Apple App Store Setup

### 4.1 Criar App ID
1. [Developer Portal](https://developer.apple.com/account/resources/identifiers)
2. Adicionar App ID
3. Bundle ID: `com.gnog.pokercircuit`

### 4.2 Configurar Xcode
```bash
npx cap sync ios
open ios/App/App.xcworkspace
```

No Xcode:
- Bundle ID: `com.gnog.pokercircuit`
- Team: Selecionar sua conta
- Signing: Automático ✅

### 4.3 Gerar Archive
1. Selecionar **Any iOS Device**
2. **Product** → **Archive**
3. **Distribute App** → **App Store Connect**
4. Upload

### 4.4 Criar App e TestFlight
1. [App Store Connect](https://appstoreconnect.apple.com)
2. Criar app "Poker Circuit"  
3. Preencher metadados
4. **TestFlight** → Adicionar testadores
5. Distribuir build

---

## PARTE 5: Materiais Necessários

### Criar:
- [ ] Ícone 1024x1024 (iOS)
- [ ] Ícone 512x512 (Android)
- [ ] Screenshots (6-8 telas principais)
- [ ] Descrição do app
- [ ] Política de Privacidade (URL)
- [ ] Email de suporte

---

## PARTE 6: Correções de Segurança (Apenas App Novo)

### Implementar:
```typescript
// Hash de senhas
import bcrypt from 'bcryptjs';
const hash = await bcrypt.hash(password, 10);

// JWT
import jwt from 'jsonwebtoken';
const token = jwt.sign({ userId }, SECRET, { expiresIn: '7d' });

// Proteger endpoints
async function requireAuth(request) {
  const token = request.headers.get('Authorization');
  return jwt.verify(token, SECRET);
}
```

**⚠️ Fazer APENAS no `poker-circuit-app`, não no `extracted_poker_pro`!**

---

## Checklist Resumido

### Configuração
- [ ] Google Play verificada
- [ ] Apple Developer ativa
- [ ] Projeto duplicado
- [ ] Novo banco D1 criado

### Google Play
- [ ] Keystore criado + backup
- [ ] Build AAB gerado
- [ ] Beta fechado configurado

### Apple
- [ ] App ID criado
- [ ] Archive gerado
- [ ] TestFlight configurado

### Segurança (App Novo)
- [ ] Hash senhas
- [ ] JWT tokens
- [ ] Endpoints protegidos

---

## Próximos Passos

**Quer que eu te ajude com qual parte primeiro?**

1. 🔄 Duplicar projeto agora
2. 🎨 Criar ícones e screenshots  
3. 🔑 Configurar keystore/certificados
4. 📝 Criar política de privacidade

**PWA atual permanece 100% intocado! 🎯**
