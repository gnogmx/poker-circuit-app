-- Migration 8: Insert default tournament settings
INSERT OR IGNORE INTO tournament_settings (id, blind_level_duration, blind_levels, default_buy_in, final_table_percentage, total_rounds, first_place_percentage, second_place_percentage, third_place_percentage, final_table_top_players) 
VALUES (
  1, 
  15, 
  '100/200,200/400,300/600,BREAK,400/800,600/1200,800/1600,1000/2000,BREAK,1500/3000,2000/4000,3000/6000',
  600,
  33.33,
  24,
  60,
  30,
  10,
  9
);
