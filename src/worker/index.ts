import { Hono } from "hono";
import { cors } from "hono/cors";
import { zValidator } from "@hono/zod-validator";
import {
  CreatePlayerSchema,
  UpdatePlayerSchema,
  CreateRoundSchema,
  CompleteRoundSchema,
  UpdateScoringRuleSchema,
  UpdateTournamentSettingsSchema,
  type Round,
  type ScoringRule,
  type RoundResult,
  type RankingEntry,
  type TournamentSettings,
} from "@/shared/types";

const app = new Hono<{ Bindings: Env }>();

app.use("/*", cors());

// Players endpoints
app.get("/api/players", async (c) => {
  const db = c.env.DB;
  const players = await db.prepare("SELECT * FROM players ORDER BY name").all();
  return c.json(players.results);
});

app.post("/api/players", zValidator("json", CreatePlayerSchema), async (c) => {
  const db = c.env.DB;
  const data = c.req.valid("json");

  const result = await db.prepare(
    "INSERT INTO players (name) VALUES (?) RETURNING *"
  ).bind(data.name).first();

  return c.json(result);
});

app.put("/api/players/:id", zValidator("json", UpdatePlayerSchema), async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const data = c.req.valid("json");

  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) {
    updates.push("name = ?");
    values.push(data.name);
  }

  if (data.is_active !== undefined) {
    updates.push("is_active = ?");
    values.push(data.is_active);
  }

  if (updates.length === 0) {
    return c.json({ error: "No updates provided" }, 400);
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");
  values.push(id);

  const result = await db.prepare(
    `UPDATE players SET ${updates.join(", ")} WHERE id = ? RETURNING *`
  ).bind(...values).first();

  if (!result) {
    return c.json({ error: "Player not found" }, 404);
  }

  return c.json(result);
});

app.delete("/api/players/:id", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");

  await db.prepare("DELETE FROM players WHERE id = ?").bind(id).run();

  return c.json({ success: true });
});

// Rounds endpoints
app.get("/api/rounds", async (c) => {
  const db = c.env.DB;
  const rounds = await db.prepare(
    "SELECT * FROM rounds ORDER BY round_number DESC"
  ).all();

  const roundsWithResults = await Promise.all(
    rounds.results.map(async (round: unknown) => {
      const r = round as Round;
      const results = await db.prepare(`
        SELECT rr.*, p.name as player_name 
        FROM round_results rr
        JOIN players p ON rr.player_id = p.id
        WHERE rr.round_id = ?
        ORDER BY rr.position
      `).bind(r.id).all();

      return {
        ...r,
        results: results.results,
      };
    })
  );

  return c.json(roundsWithResults);
});

app.get("/api/rounds/active", async (c) => {
  const db = c.env.DB;
  const round = await db.prepare(
    "SELECT * FROM rounds WHERE status = 'active' ORDER BY id DESC LIMIT 1"
  ).first();

  if (!round) {
    return c.json(null);
  }

  const players = await db.prepare(`
    SELECT p.* 
    FROM players p
    JOIN round_players rp ON p.id = rp.player_id
    WHERE rp.round_id = ?
    ORDER BY p.name
  `).bind(round.id).all();

  const results = await db.prepare(`
    SELECT rr.*, p.name as player_name 
    FROM round_results rr
    JOIN players p ON rr.player_id = p.id
    WHERE rr.round_id = ?
    ORDER BY rr.position
  `).bind(round.id).all();

  return c.json({
    ...round,
    players: players.results,
    results: results.results,
  });
});

app.get("/api/rounds/:id", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");

  const round = await db.prepare("SELECT * FROM rounds WHERE id = ?").bind(id).first();

  if (!round) {
    return c.json({ error: "Round not found" }, 404);
  }

  const results = await db.prepare(`
    SELECT rr.*, p.name as player_name 
    FROM round_results rr
    JOIN players p ON rr.player_id = p.id
    WHERE rr.round_id = ?
    ORDER BY rr.position
  `).bind(id).all();

  return c.json({
    ...round,
    results: results.results,
  });
});

app.post("/api/rounds", zValidator("json", CreateRoundSchema), async (c) => {
  const db = c.env.DB;
  const data = c.req.valid("json");

  // Check if round number already exists
  const existing = await db.prepare(
    "SELECT id FROM rounds WHERE round_number = ?"
  ).bind(data.round_number).first();

  if (existing) {
    return c.json({ error: "Rodada já existe" }, 400);
  }

  // Check if there's already an active round
  const activeRound = await db.prepare(
    "SELECT id FROM rounds WHERE status = 'active'"
  ).first();

  if (activeRound) {
    return c.json({ error: "Já existe uma rodada ativa" }, 400);
  }

  // Create round
  const round = await db.prepare(
    "INSERT INTO rounds (round_number, round_date, notes, round_type, buy_in_value, rebuy_value, knockout_value, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'active') RETURNING *"
  ).bind(
    data.round_number,
    data.round_date,
    data.notes || null,
    data.round_type,
    data.buy_in_value || null,
    data.rebuy_value || null,
    data.knockout_value || null
  ).first();

  if (!round) {
    return c.json({ error: "Failed to create round" }, 500);
  }

  // Add players to round
  for (const playerId of data.player_ids) {
    await db.prepare(
      "INSERT INTO round_players (round_id, player_id) VALUES (?, ?)"
    ).bind(round.id, playerId).run();
  }

  return c.json(round);
});

app.post("/api/rounds/:id/complete", zValidator("json", CompleteRoundSchema), async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const data = c.req.valid("json");

  const round = await db.prepare("SELECT * FROM rounds WHERE id = ?").bind(id).first();

  if (!round) {
    return c.json({ error: "Round not found" }, 404);
  }

  // Get scoring rules
  const scoringRules = await db.prepare(
    "SELECT * FROM scoring_rules ORDER BY position"
  ).all();

  const rulesMap = new Map(
    scoringRules.results.map((rule: unknown) => [(rule as ScoringRule).position, (rule as ScoringRule).points])
  );

  // Insert results with calculated points
  for (const result of data.results) {
    const points = rulesMap.get(result.position) || 0;

    await db.prepare(
      "INSERT INTO round_results (round_id, player_id, position, points, rebuys, knockout_earnings, prize) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      id,
      result.player_id,
      result.position,
      points,
      result.rebuys || 0,
      result.rebuys || 0,
      result.knockout_earnings || 0,
      result.prize || 0
    ).run();
  }

  // Mark round as completed
  await db.prepare(
    "UPDATE rounds SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).bind(id).run();

  // Fetch complete round with results
  const results = await db.prepare(`
    SELECT rr.*, p.name as player_name 
    FROM round_results rr
    JOIN players p ON rr.player_id = p.id
    WHERE rr.round_id = ?
    ORDER BY rr.position
  `).bind(id).all();

  const updatedRound = await db.prepare("SELECT * FROM rounds WHERE id = ?").bind(id).first();

  return c.json({
    ...updatedRound,
    results: results.results,
  });
});

app.delete("/api/rounds/:id", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");

  await db.prepare("DELETE FROM round_results WHERE round_id = ?").bind(id).run();
  await db.prepare("DELETE FROM round_players WHERE round_id = ?").bind(id).run();
  await db.prepare("DELETE FROM rounds WHERE id = ?").bind(id).run();

  return c.json({ success: true });
});

// Scoring rules endpoints
app.get("/api/scoring-rules", async (c) => {
  const db = c.env.DB;
  const rules = await db.prepare(
    "SELECT * FROM scoring_rules ORDER BY position"
  ).all();
  return c.json(rules.results);
});

app.put("/api/scoring-rules/:position", zValidator("json", UpdateScoringRuleSchema), async (c) => {
  const db = c.env.DB;
  const position = c.req.param("position");
  const data = c.req.valid("json");

  const existing = await db.prepare(
    "SELECT id FROM scoring_rules WHERE position = ?"
  ).bind(position).first();

  if (existing) {
    const result = await db.prepare(
      "UPDATE scoring_rules SET points = ?, updated_at = CURRENT_TIMESTAMP WHERE position = ? RETURNING *"
    ).bind(data.points, position).first();
    return c.json(result);
  } else {
    const result = await db.prepare(
      "INSERT INTO scoring_rules (position, points) VALUES (?, ?) RETURNING *"
    ).bind(data.position, data.points).first();
    return c.json(result);
  }
});

// Rankings endpoint
app.get("/api/rankings", async (c) => {
  const db = c.env.DB;

  const settings = await db.prepare(
    "SELECT * FROM tournament_settings ORDER BY id DESC LIMIT 1"
  ).first();

  const rankings = await db.prepare(`
    SELECT 
      p.id as player_id,
      p.name as player_name,
      COALESCE(SUM(rr.points), 0) as total_points,
      COUNT(DISTINCT rr.round_id) as rounds_played,
      MIN(rr.position) as best_position,
      AVG(rr.position) as average_position
    FROM players p
    LEFT JOIN round_results rr ON p.id = rr.player_id
    WHERE p.is_active = 1
    GROUP BY p.id, p.name
    ORDER BY total_points DESC, best_position ASC, rounds_played DESC
  `).all();

  // Get all completed rounds
  const rounds = await db.prepare(`
    SELECT id, round_number 
    FROM rounds 
    WHERE status = 'completed' 
    ORDER BY round_number
  `).all();

  // Get all round results
  const allResults = await db.prepare(`
    SELECT rr.player_id, r.round_number, rr.points, rr.rebuys, rr.position, rr.knockout_earnings, rr.prize
    FROM round_results rr
    JOIN rounds r ON rr.round_id = r.id
    WHERE r.status = 'completed'
  `).all();

  // Build round-by-round data
  const roundByRound = (rankings.results as unknown[]).map((ranking: unknown) => {
    const playerResults: { [key: number]: number } = {};

    (allResults.results as unknown[]).forEach((result: unknown) => {
      const res = result as RoundResult & { round_number: number };
      const rank = ranking as RankingEntry;
      if (res.player_id === rank.player_id) {
        playerResults[res.round_number] = res.points;
      }
    });

    return {
      ...(ranking as RankingEntry),
      round_results: playerResults,
    };
  });

  // Calculate final table prize pool
  const completedRounds = await db.prepare(
    "SELECT COUNT(*) as count FROM rounds WHERE status = 'completed'"
  ).first();

  const roundsCount = (completedRounds as { count: number })?.count || 0;
  const defaultBuyIn = (settings as TournamentSettings)?.default_buy_in || 600;
  const finalTablePercentage = (settings as TournamentSettings)?.final_table_percentage || 33.33;
  const finalTableFixedValue = (settings as TournamentSettings)?.final_table_fixed_value || 0;

  const playersPerRound = await db.prepare(`
    SELECT COUNT(DISTINCT rp.player_id) as avg_count
    FROM round_players rp
    JOIN rounds r ON rp.round_id = r.id
    WHERE r.status = 'completed'
    GROUP BY rp.round_id
  `).all();

  let avgPlayersPerRound = 0;
  if (playersPerRound.results.length > 0) {
    const sum = playersPerRound.results.reduce((acc: number, curr: unknown) => acc + (curr as { avg_count: number }).avg_count, 0);
    avgPlayersPerRound = sum / playersPerRound.results.length;
  }

  let finalTablePrizePool = 0;
  if (finalTableFixedValue > 0) {
    finalTablePrizePool = roundsCount * finalTableFixedValue;
  } else {
    finalTablePrizePool = roundsCount * avgPlayersPerRound * defaultBuyIn * (finalTablePercentage / 100);
  }

  // Calculate total prize and entries for each player
  const enrichedRankings = (roundByRound as RankingEntry[]).map(player => {
    let totalPrize = 0;
    let totalEntries = 0;

    // Iterate over all completed rounds to calculate prizes
    const completedRoundsList = rounds.results as Round[];

    completedRoundsList.forEach(round => {
      // Get all results for this round
      const roundResults = (allResults.results as any[]).filter((r: any) => r.round_number === round.round_number);

      // Calculate round prize pool
      const roundBuyIn = round.buy_in_value || defaultBuyIn;
      const roundRebuy = round.rebuy_value || (roundBuyIn / 2); // Default rebuy logic if not set

      const totalPlayers = roundResults.length;
      const totalRebuys = roundResults.reduce((acc: number, curr: any) => acc + (curr.rebuys || 0), 0);

      const grossPrizePool = (totalPlayers * roundBuyIn) + (totalRebuys * roundRebuy);

      let finalTableCut = 0;
      if (finalTableFixedValue > 0) {
        finalTableCut = finalTableFixedValue;
      } else {
        finalTableCut = grossPrizePool * (finalTablePercentage / 100);
      }

      const netPrizePool = Math.max(0, grossPrizePool - finalTableCut);




      // Check if player played this round
      const playerResult = roundResults.find((r: any) => r.player_id === player.player_id);

      if (playerResult) {
        // Add entries cost
        totalEntries += roundBuyIn + ((playerResult.rebuys || 0) * roundRebuy);

        // Add prizes
        totalPrize += (playerResult.prize || 0);

        // Add knockout earnings
        totalPrize += (playerResult.knockout_earnings || 0);
      }
    });

    return {
      ...player,
      total_prize: totalPrize,
      total_entries: totalEntries
    };
  });

  return c.json({
    rankings: enrichedRankings,
    final_table_prize_pool: finalTablePrizePool,
    rounds: rounds.results,
  });
});

// Tournament settings endpoints
app.get("/api/tournament-settings", async (c) => {
  const db = c.env.DB;
  const settings = await db.prepare(
    "SELECT * FROM tournament_settings ORDER BY id DESC LIMIT 1"
  ).first();

  if (!settings) {
    const defaultSettings = await db.prepare(
      `INSERT INTO tournament_settings (
        blind_level_duration, 
        blind_levels,
        default_buy_in,
        final_table_percentage,
        final_table_fixed_value,
        total_rounds,
        first_place_percentage,
        second_place_percentage,
        third_place_percentage,
        final_table_top_players
      ) VALUES (15, '100/200,200/400,400/800,800/1600,1600/3200', 600, 33.33, 0, 24, 60, 30, 10, 9) RETURNING *`
    ).first();
    return c.json(defaultSettings);
  }

  return c.json(settings);
});

app.put("/api/tournament-settings", zValidator("json", UpdateTournamentSettingsSchema), async (c) => {
  const db = c.env.DB;
  const data = c.req.valid("json");

  const existing = await db.prepare(
    "SELECT id FROM tournament_settings ORDER BY id DESC LIMIT 1"
  ).first();

  if (existing) {
    const result = await db.prepare(
      `UPDATE tournament_settings SET 
        blind_level_duration = ?, 
        blind_levels = ?,
        default_buy_in = ?,
        final_table_percentage = ?,
        final_table_fixed_value = ?,
        total_rounds = ?,
        first_place_percentage = ?,
        second_place_percentage = ?,
        third_place_percentage = ?,
        final_table_top_players = ?,
        updated_at = CURRENT_TIMESTAMP 
      WHERE id = ? RETURNING *`
    ).bind(
      data.blind_level_duration,
      data.blind_levels,
      data.default_buy_in ?? 600,
      data.final_table_percentage ?? 33.33,
      data.final_table_fixed_value ?? 0,
      data.total_rounds ?? 24,
      data.first_place_percentage ?? 60,
      data.second_place_percentage ?? 30,
      data.third_place_percentage ?? 10,
      data.final_table_top_players ?? 9,
      existing.id
    ).first();
    return c.json(result);
  } else {
    const result = await db.prepare(
      `INSERT INTO tournament_settings (
        blind_level_duration, 
        blind_levels,
        default_buy_in,
        final_table_percentage,
        final_table_fixed_value,
        total_rounds,
        first_place_percentage,
        second_place_percentage,
        third_place_percentage,
        final_table_top_players
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
    ).bind(
      data.blind_level_duration,
      data.blind_levels,
      data.default_buy_in ?? 600,
      data.final_table_percentage ?? 33.33,
      data.final_table_fixed_value ?? 0,
      data.total_rounds ?? 24,
      data.first_place_percentage ?? 60,
      data.second_place_percentage ?? 30,
      data.third_place_percentage ?? 10,
      data.final_table_top_players ?? 9
    ).first();
    return c.json(result);
  }
});

// Start round endpoint
app.post("/api/rounds/:id/start", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");

  const round = await db.prepare("SELECT * FROM rounds WHERE id = ?").bind(id).first();

  if (!round) {
    return c.json({ error: "Round not found" }, 404);
  }

  if (round.status !== 'active') {
    return c.json({ error: "Round is not active" }, 400);
  }

  await db.prepare(
    "UPDATE rounds SET is_started = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).bind(id).run();

  return c.json({ success: true });
});

// Mark rebuy deadline passed
app.post("/api/rounds/:id/rebuy-deadline", async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");

  await db.prepare(
    "UPDATE rounds SET rebuy_deadline_passed = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).bind(id).run();

  return c.json({ success: true });
});

// Export data endpoint
app.get("/api/export", async (c) => {
  const db = c.env.DB;

  const players = await db.prepare("SELECT * FROM players ORDER BY name").all();
  const rounds = await db.prepare("SELECT * FROM rounds ORDER BY round_number").all();
  const results = await db.prepare(`
    SELECT rr.*, p.name as player_name, r.round_number
    FROM round_results rr
    JOIN players p ON rr.player_id = p.id
    JOIN rounds r ON rr.round_id = r.id
    ORDER BY r.round_number, rr.position
  `).all();
  const scoringRules = await db.prepare("SELECT * FROM scoring_rules ORDER BY position").all();
  const tournamentSettings = await db.prepare("SELECT * FROM tournament_settings ORDER BY id DESC LIMIT 1").first();

  return c.json({
    players: players.results,
    rounds: rounds.results,
    results: results.results,
    scoring_rules: scoringRules.results,
    tournament_settings: tournamentSettings,
    exported_at: new Date().toISOString(),
  });
});

export default app;
