#!/bin/bash

# Execute migrations in correct order
MIGRATIONS=(
  "migrations/1.sql"
  "migrations/2.sql"
  "migrations/3.sql"
  "migrations/4.sql"
  "migrations/5.sql"
  "migrations/6.sql"
  "migrations/7.sql"
  "migrations/8.sql"
  "migrations/9.sql"
  "migrations/10.sql"
  "migrations/11.sql"
  "migrations/12.sql"
  "migrations/13.sql"
  "migrations/14.sql"
  "migrations/15.sql"
  "migrations/16.sql"
  "migrations/17.sql"
  "migrations/18.sql"
  "migrations/19.sql"
  "migrations/20_add_final_table_percentages.sql"
  "migrations/21_add_rules_text.sql"
  "migrations/22_add_round_schedule.sql"
  "migrations/23_add_final_table.sql"
  "migrations/24_add_substituted_flag.sql"
  "migrations/0025_add_more_prize_places.sql"
  "migrations/0026_add_single_tournament.sql"
  "migrations/0027_dynamic_prize_distribution.sql"
  "migrations/28_add_discard_settings.sql"
  "migrations/29_add_table_draw.sql"
  "migrations/30_add_blind_level_durations.sql"
  "migrations/31_add_elimination_state.sql"
  "migrations/seed_schedules.sql"
)

for migration in "${MIGRATIONS[@]}"; do
  if [ -f "$migration" ]; then
    echo "========================================="
    echo "Applying: $migration"
    echo "========================================="
    npx wrangler d1 execute poker-circuit-app-db --remote --file="$migration" --yes
    if [ $? -ne 0 ]; then
      echo "ERROR: Failed to apply $migration"
      exit 1
    fi
    echo ""
  else
    echo "WARNING: $migration not found, skipping..."
  fi
done

echo "========================================="
echo "All migrations completed successfully!"
echo "========================================="
