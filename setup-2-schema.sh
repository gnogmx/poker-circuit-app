#!/bin/bash

# Script 2: Executar schema no novo banco
# Rode APÓS atualizar o wrangler.json com o novo database_id

echo "🗄️  Executando schema no novo banco D1..."
echo ""

# Verificar se existe arquivo de schema
if [ ! -f "schema.sql" ]; then
  echo "⚠️  Arquivo schema.sql não encontrado"
  echo "Vou verificar se existe algum arquivo de migração..."
  
  # Procurar por arquivos de schema em pastas comuns
  if [ -d "migrations" ]; then
    echo "📁 Encontrei pasta migrations/"
    SCHEMA_FILE=$(ls migrations/*.sql 2>/dev/null | head -n 1)
    if [ -n "$SCHEMA_FILE" ]; then
      echo "Usando: $SCHEMA_FILE"
      npx wrangler d1 execute poker-circuit-app-db --remote --file="$SCHEMA_FILE"
    fi
  elif [ -d "src/worker" ]; then
    echo "📁 Procurando em src/worker..."
    SCHEMA_FILE=$(find src/worker -name "*.sql" 2>/dev/null | head -n 1)
    if [ -n "$SCHEMA_FILE" ]; then
      echo "Usando: $SCHEMA_FILE"
      npx wrangler d1 execute poker-circuit-app-db --remote --file="$SCHEMA_FILE"
    fi
  else
    echo "❌ Não encontrei arquivo de schema"
    echo "Você vai precisar criar as tabelas manualmente"
  fi
else
  npx wrangler d1 execute poker-circuit-app-db --remote --file=schema.sql
  echo "✅ Schema executado com sucesso"
fi

echo ""
echo "🎉 Configuração completa!"
echo ""
echo "Próximos passos:"
echo "1. Verificar que o banco foi criado: npx wrangler d1 list"
echo "2. Deploy do worker: npx wrangler deploy"
echo "3. Anotar a URL do worker que aparecer"
