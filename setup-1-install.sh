#!/bin/bash

# Script de configuração do projeto poker-circuit-app
# Rode este script a partir do diretório poker-circuit-app

echo "🚀 Configurando projeto poker-circuit-app..."
echo ""

# Passo 1: Instalar dependências
echo "📦 Instalando dependências do Node.js..."
npm install

if [ $? -ne 0 ]; then
  echo "❌ Erro ao instalar dependências"
  exit 1
fi

echo "✅ Dependências instaladas com sucesso"
echo ""

# Passo 2: Criar banco D1
echo "💾 Criando novo banco D1..."
npx wrangler d1 create poker-circuit-app-db

echo ""
echo "⚠️  IMPORTANTE:"
echo "1. Copie o 'database_id' que apareceu acima"
echo "2. Abra o arquivo wrangler.json"
echo "3. Substitua o database_id antigo pelo novo"
echo ""
echo "Depois rode: sh setup-2-schema.sh"
