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
  UserLoginSchema,
  RegisterSchema,
  CreateChampionshipSchema,
  JoinChampionshipSchema,
  CreateRoundScheduleSchema,
  type Round,
  type ScoringRule,
  type RoundResult,
  type RankingEntry,
  type TournamentSettings,
  type User,
  type Championship,
} from "@/shared/types";

type Variables = {
  user: User;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use("/*", cors());

// Helper function to generate unique championship code
function generateChampionshipCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Helper to get championship_id from header
function getChampionshipId(c: any): number | null {
  const championshipId = c.req.header('X-Championship-Id');
  return championshipId ? parseInt(championshipId, 10) : null;
}

// Auth middleware - Verifies user is logged in
const requireAuth = async (c: any, next: any) => {
  const db = c.env.DB;
  const authHeader = c.req.header("Authorization");

  if (!authHeader) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.replace("Bearer ", "");

  // In a real app, this would verify a JWT. For now, we use the password_hash as a simple token
  const user = await db.prepare(
    "SELECT id, email, name, created_at FROM users WHERE password_hash = ?"
  ).bind(token).first() as User | null;

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set('user', user);
  await next();
};

// Admin middleware - Verifies user is logged in AND is admin of the current championship
const requireAdmin = async (c: any, next: any) => {
  const db = c.env.DB;
  const championshipId = getChampionshipId(c);
  const user = c.get('user') as User;

  if (!user) {
    // Should be used after requireAuth, but just in case
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!championshipId) {
    return c.json({ error: "Championship ID required" }, 400);
  }

  const member = await db.prepare(
    "SELECT role FROM championship_members WHERE championship_id = ? AND user_id = ?"
  ).bind(championshipId, user.id).first();

  if (!member || member.role !== 'admin') {
    return c.json({ error: "Forbidden: Admin access required" }, 403);
  }

  await next();
};

// Players endpoints
app.get("/api/players", async (c) => {
  const db = c.env.DB;
  const championshipId = getChampionshipId(c);

  if (!championshipId) {
    return c.json({ error: "Championship ID required" }, 400);
  }

  const players = await db.prepare(
    "SELECT * FROM players WHERE championship_id = ? ORDER BY name"
  ).bind(championshipId).all();

  return c.json(players.results);
});

app.post("/api/players", requireAuth, requireAdmin, zValidator("json", CreatePlayerSchema), async (c) => {
  const db = c.env.DB;
  const data = c.req.valid("json");
  const championshipId = getChampionshipId(c);

  if (!championshipId) {
    return c.json({ error: "Championship ID required" }, 400);
  }

  // Check if player name already exists in this championship
  const existing = await db.prepare(
    "SELECT id FROM players WHERE championship_id = ? AND LOWER(name) = LOWER(?)"
  ).bind(championshipId, data.name).first();

  if (existing) {
    return c.json({ error: "Já existe um jogador com este nome. Por favor, use um nome diferente." }, 400);
  }

  const result = await db.prepare(
    "INSERT INTO players (name, championship_id) VALUES (?, ?) RETURNING *"
  ).bind(data.name, championshipId).first();

  return c.json(result);
});

app.put("/api/players/:id", requireAuth, requireAdmin, zValidator("json", UpdatePlayerSchema), async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const data = c.req.valid("json");
  const championshipId = getChampionshipId(c);

  if (!championshipId) {
    return c.json({ error: "Championship ID required" }, 400);
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) {
    // Check if new name conflicts with another player
    const existing = await db.prepare(
      "SELECT id FROM players WHERE championship_id = ? AND LOWER(name) = LOWER(?) AND id != ?"
    ).bind(championshipId, data.name, id).first();

    if (existing) {
      return c.json({ error: "Já existe outro jogador com este nome. Por favor, use um nome diferente." }, 400);
    }

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
  values.push(championshipId, id);

  const result = await db.prepare(
    `UPDATE players SET ${updates.join(", ")} WHERE championship_id = ? AND id = ? RETURNING *`
  ).bind(...values).first();

  if (!result) {
    return c.json({ error: "Player not found" }, 404);
  }

  return c.json(result);
});

app.delete("/api/players/:id", requireAuth, requireAdmin, async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const championshipId = getChampionshipId(c);

  if (!championshipId) {
    return c.json({ error: "Championship ID required" }, 400);
  }

  await db.prepare(
    "DELETE FROM players WHERE championship_id = ? AND id = ?"
  ).bind(championshipId, id).run();

  return c.json({ success: true });
});

// Rounds endpoints
app.get("/api/rounds", async (c) => {
  const db = c.env.DB;
  const championshipId = getChampionshipId(c);

  if (!championshipId) {
    return c.json({ error: "Championship ID required" }, 400);
  }

  const rounds = await db.prepare(
    "SELECT * FROM rounds WHERE championship_id = ? ORDER BY round_number DESC"
  ).bind(championshipId).all();

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

      const players = await db.prepare(`
        SELECT p.id, p.name
        FROM players p
        JOIN round_players rp ON p.id = rp.player_id
        WHERE rp.round_id = ?
        ORDER BY p.name
      `).bind(r.id).all();

      return {
        ...r,
        results: results.results,
        players: players.results,
      };
    })
  );

  return c.json(roundsWithResults);
});

app.get("/api/rounds/active", async (c) => {
  const db = c.env.DB;
  const championshipId = getChampionshipId(c);

  if (!championshipId) {
    return c.json({ error: "Championship ID required" }, 400);
  }

  const round = await db.prepare(
    "SELECT * FROM rounds WHERE championship_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1"
  ).bind(championshipId).first();

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
  const championshipId = getChampionshipId(c);

  if (!championshipId) {
    return c.json({ error: "Championship ID required" }, 400);
  }

  const round = await db.prepare("SELECT * FROM rounds WHERE id = ? AND championship_id = ?").bind(id, championshipId).first();

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

app.post("/api/rounds", requireAuth, requireAdmin, zValidator("json", CreateRoundSchema), async (c) => {
  const db = c.env.DB;
  const data = c.req.valid("json");
  const championshipId = getChampionshipId(c);

  if (!championshipId) {
    return c.json({ error: "Championship ID required" }, 400);
  }

  // Check if round number already exists
  const existing = await db.prepare(
    "SELECT id FROM rounds WHERE championship_id = ? AND round_number = ?"
  ).bind(championshipId, data.round_number).first();

  if (existing) {
    return c.json({ error: "Rodada já existe" }, 400);
  }

  // Check if there's already an active round
  const activeRound = await db.prepare(
    "SELECT id FROM rounds WHERE championship_id = ? AND status = 'active'"
  ).bind(championshipId).first();

  if (activeRound) {
    return c.json({ error: "Já existe uma rodada ativa" }, 400);
  }

  // Create round
  const round = await db.prepare(
    "INSERT INTO rounds (championship_id, round_number, round_date, notes, round_type, buy_in_value, rebuy_value, knockout_value, is_final_table, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active') RETURNING *"
  ).bind(
    championshipId,
    data.round_number,
    data.round_date,
    data.notes || null,
    data.round_type,
    data.buy_in_value || null,
    data.rebuy_value || null,
    data.knockout_value || null,
    data.is_final_table ? 1 : 0
  ).first();

  if (!round) {
    return c.json({ error: "Failed to create round" }, 500);
  }

  // Add players to round
  for (const playerId of data.player_ids) {
    await db.prepare(
      "INSERT OR IGNORE INTO round_players (round_id, player_id) VALUES (?, ?)"
    ).bind(round.id, playerId).run();
  }

  return c.json(round);
});

app.post("/api/rounds/:id/complete", requireAuth, requireAdmin, zValidator("json", CompleteRoundSchema), async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const data = c.req.valid("json");
  const championshipId = getChampionshipId(c);

  if (!championshipId) {
    return c.json({ error: "Championship ID required" }, 400);
  }

  const round = await db.prepare("SELECT * FROM rounds WHERE id = ? AND championship_id = ?").bind(id, championshipId).first();

  if (!round) {
    return c.json({ error: "Round not found" }, 404);
  }

  // Get scoring rules
  const scoringRules = await db.prepare(
    "SELECT * FROM scoring_rules WHERE championship_id = ? ORDER BY position"
  ).bind(championshipId).all();

  console.log(`[Complete Round] Championship ${championshipId}: Found ${scoringRules.results.length} scoring rules`);

  const rulesMap = new Map(
    scoringRules.results.map((rule: unknown) => [(rule as ScoringRule).position, (rule as ScoringRule).points])
  );

  console.log('[Complete Round] Rules map:', Array.from(rulesMap.entries()));

  // Delete existing results for this round first to allow re-completion or updates
  await db.prepare("DELETE FROM round_results WHERE round_id = ?").bind(id).run();

  // Insert results with calculated points
  for (const result of data.results) {
    const points = rulesMap.get(result.position) || 0;
    console.log(`[Complete Round] Player ${result.player_id} position ${result.position}: ${points} points`);

    await db.prepare(
      "INSERT INTO round_results (round_id, player_id, position, points, rebuys, knockout_earnings, prize) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      id,
      result.player_id,
      result.position,
      points,
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

app.delete("/api/rounds/:id", requireAuth, requireAdmin, async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const championshipId = getChampionshipId(c);

  if (!championshipId) {
    return c.json({ error: "Championship ID required" }, 400);
  }

  // Verify round belongs to championship
  const round = await db.prepare("SELECT id FROM rounds WHERE id = ? AND championship_id = ?").bind(id, championshipId).first();
  if (!round) {
    return c.json({ error: "Round not found" }, 404);
  }

  await db.prepare("DELETE FROM round_results WHERE round_id = ?").bind(id).run();
  await db.prepare("DELETE FROM round_players WHERE round_id = ?").bind(id).run();
  await db.prepare("DELETE FROM rounds WHERE id = ?").bind(id).run();

  return c.json({ success: true });
});

// Scoring rules endpoints
app.get("/api/scoring-rules", async (c) => {
  const db = c.env.DB;
  const championshipId = getChampionshipId(c);

  if (!championshipId) {
    return c.json({ error: "Championship ID required" }, 400);
  }

  const rules = await db.prepare(
    "SELECT * FROM scoring_rules WHERE championship_id = ? ORDER BY position"
  ).bind(championshipId).all();
  return c.json(rules.results);
});

app.put("/api/scoring-rules/:position", requireAuth, requireAdmin, zValidator("json", UpdateScoringRuleSchema), async (c) => {
  const db = c.env.DB;
  const position = parseInt(c.req.param("position"));
  const data = c.req.valid("json");
  const championshipId = getChampionshipId(c);

  if (!championshipId) {
    return c.json({ error: "Championship ID required" }, 400);
  }

  try {
    const existing = await db.prepare(
      "SELECT id FROM scoring_rules WHERE championship_id = ? AND position = ?"
    ).bind(championshipId, position).first();

    if (existing) {
      const result = await db.prepare(
        "UPDATE scoring_rules SET points = ?, updated_at = CURRENT_TIMESTAMP WHERE championship_id = ? AND position = ? RETURNING *"
      ).bind(data.points, championshipId, position).first();
      return c.json(result);
    } else {
      const result = await db.prepare(
        "INSERT INTO scoring_rules (championship_id, position, points) VALUES (?, ?, ?) RETURNING *"
      ).bind(championshipId, position, data.points).first();
      return c.json(result);
    }
  } catch (err) {
    console.error('[Scoring Rules] Error:', err);
    return c.json({ error: err instanceof Error ? err.message : 'Failed to save scoring rule' }, 500);
  }
});

// Rankings endpoint
app.get("/api/rankings", async (c) => {
  const db = c.env.DB;
  const championshipId = getChampionshipId(c);

  if (!championshipId) {
    return c.json({ error: "Championship ID required" }, 400);
  }

  const settings = await db.prepare(
    "SELECT * FROM tournament_settings WHERE championship_id = ? ORDER BY id DESC LIMIT 1"
  ).bind(championshipId).first();

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
    LEFT JOIN rounds r ON rr.round_id = r.id
    WHERE p.championship_id = ? AND p.is_active = 1 AND (r.is_final_table = 0 OR r.is_final_table IS NULL OR r.id IS NULL)
    GROUP BY p.id, p.name
    ORDER BY total_points DESC, best_position ASC, rounds_played DESC
  `).bind(championshipId).all();

  // Get all completed rounds (excluding final table)
  const rounds = await db.prepare(`
    SELECT id, round_number 
    FROM rounds 
    WHERE championship_id = ? AND status = 'completed' AND (is_final_table = 0 OR is_final_table IS NULL)
    ORDER BY round_number
  `).bind(championshipId).all();

  // Get all round results (excluding final table)
  const allResults = await db.prepare(`
    SELECT rr.player_id, r.round_number, rr.points, rr.rebuys, rr.position, rr.knockout_earnings, rr.prize
    FROM round_results rr
    JOIN rounds r ON rr.round_id = r.id
    WHERE r.championship_id = ? AND r.status = 'completed' AND (r.is_final_table = 0 OR r.is_final_table IS NULL)
  `).bind(championshipId).all();

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
    "SELECT COUNT(*) as count FROM rounds WHERE championship_id = ? AND status = 'completed'"
  ).bind(championshipId).first();

  const roundsCount = (completedRounds as { count: number })?.count || 0;
  const defaultBuyIn = (settings as TournamentSettings)?.default_buy_in || 600;
  const finalTablePercentage = (settings as TournamentSettings)?.final_table_percentage || 33.33;
  const finalTableFixedValue = (settings as TournamentSettings)?.final_table_fixed_value || 0;

  const playersPerRound = await db.prepare(`
    SELECT COUNT(DISTINCT rp.player_id) as avg_count
    FROM round_players rp
    JOIN rounds r ON rp.round_id = r.id
    WHERE r.championship_id = ? AND r.status = 'completed'
    GROUP BY rp.round_id
  `).bind(championshipId).all();

  let avgPlayersPerRound = 0;
  if (playersPerRound.results.length > 0) {
    const sum = playersPerRound.results.reduce((acc: number, curr: unknown) => acc + (curr as { avg_count: number }).avg_count, 0);
    avgPlayersPerRound = sum / playersPerRound.results.length;
  }

  let finalTablePrizePool = 0;
  if (finalTableFixedValue > 0) {
    finalTablePrizePool = roundsCount * avgPlayersPerRound * finalTableFixedValue;
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
  const championshipId = getChampionshipId(c);

  if (!championshipId) {
    return c.json({ error: "Championship ID required" }, 400);
  }

  const settings = await db.prepare(
    "SELECT * FROM tournament_settings WHERE championship_id = ? ORDER BY id DESC LIMIT 1"
  ).bind(championshipId).first();

  if (!settings) {
    const defaultSettings = await db.prepare(
      `INSERT INTO tournament_settings (
        championship_id,
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
      ) VALUES (?, 15, '100/200,200/400,400/800,800/1600,1600/3200', 600, 33.33, 0, 24, 60, 30, 10, 9) RETURNING *`
    ).bind(championshipId).first();
    return c.json(defaultSettings);
  }

  return c.json(settings);
});

app.put("/api/tournament-settings", requireAuth, requireAdmin, zValidator("json", UpdateTournamentSettingsSchema), async (c) => {
  const db = c.env.DB;
  const data = c.req.valid("json");
  const championshipId = getChampionshipId(c);

  if (!championshipId) {
    return c.json({ error: "Championship ID required" }, 400);
  }

  const existing = await db.prepare(
    "SELECT id FROM tournament_settings WHERE championship_id = ? ORDER BY id DESC LIMIT 1"
  ).bind(championshipId).first();

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
        final_table_1st_percentage = ?,
        final_table_2nd_percentage = ?,
        final_table_3rd_percentage = ?,
        final_table_4th_percentage = ?,
        final_table_5th_percentage = ?,
        rules_text = ?,
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
      data.final_table_1st_percentage ?? 40,
      data.final_table_2nd_percentage ?? 25,
      data.final_table_3rd_percentage ?? 20,
      data.final_table_4th_percentage ?? 10,
      data.final_table_5th_percentage ?? 5,
      data.rules_text ?? '',
      existing.id
    ).first();
    return c.json(result);
  } else {
    // Should not happen as GET creates default, but just in case
    return c.json({ error: "Settings not found" }, 404);
  }
});

// Get schedules endpoint
app.get("/api/schedules", requireAuth, async (c) => {
  const db = c.env.DB;
  const championshipId = getChampionshipId(c);

  if (!championshipId) {
    return c.json({ error: "Championship ID required" }, 400);
  }

  const schedules = await db.prepare(
    "SELECT * FROM round_schedule WHERE championship_id = ? ORDER BY round_number ASC"
  ).bind(championshipId).all();

  return c.json(schedules.results || []);
});

// Create schedule endpoint
app.post("/api/schedules", requireAuth, requireAdmin, zValidator("json", CreateRoundScheduleSchema), async (c) => {
  const db = c.env.DB;
  const data = c.req.valid("json");
  const championshipId = getChampionshipId(c);

  if (!championshipId) {
    return c.json({ error: "Championship ID required" }, 400);
  }

  // Check if round number already exists
  const existing = await db.prepare(
    "SELECT id FROM round_schedule WHERE championship_id = ? AND round_number = ?"
  ).bind(championshipId, data.round_number).first();

  if (existing) {
    return c.json({ error: "Rodada já possui data programada" }, 400);
  }

  const result = await db.prepare(
    "INSERT INTO round_schedule (championship_id, round_number, scheduled_date, notes) VALUES (?, ?, ?, ?) RETURNING *"
  ).bind(
    championshipId,
    data.round_number,
    data.scheduled_date,
    data.notes || null
  ).first();

  return c.json(result);
});

// Delete schedule endpoint
app.delete("/api/schedules/:id", requireAuth, requireAdmin, async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const championshipId = getChampionshipId(c);

  if (!championshipId) {
    return c.json({ error: "Championship ID required" }, 400);
  }

  await db.prepare(
    "DELETE FROM round_schedule WHERE id = ? AND championship_id = ?"
  ).bind(id, championshipId).run();

  return c.json({ success: true });
});

// Generate Final Table endpoint
app.post("/api/final-table/generate", requireAuth, requireAdmin, async (c) => {
  const db = c.env.DB;
  const championshipId = getChampionshipId(c);

  if (!championshipId) {
    return c.json({ error: "Championship ID required" }, 400);
  }

  try {
    // Check if final table already exists
    const existingFinalTable = await db.prepare(
      "SELECT id FROM rounds WHERE championship_id = ? AND is_final_table = 1"
    ).bind(championshipId).first();

    if (existingFinalTable) {
      return c.json({ error: "Mesa Final já foi criada" }, 400);
    }

    // Get tournament settings
    const settings = await db.prepare(
      "SELECT total_rounds, final_table_top_players, final_table_date FROM tournament_settings WHERE championship_id = ? ORDER BY id DESC LIMIT 1"
    ).bind(championshipId).first();

    const totalRounds = (settings?.total_rounds as number) || 24;
    const topPlayersCount = (settings?.final_table_top_players as number) || 9;
    const finalTableDate = (settings?.final_table_date as string) || new Date().toISOString().split('T')[0];

    // Check if all rounds are completed
    const completedRounds = await db.prepare(
      "SELECT COUNT(*) as count FROM rounds WHERE championship_id = ? AND status = 'completed' AND (is_final_table = 0 OR is_final_table IS NULL)"
    ).bind(championshipId).first();

    const completedCount = completedRounds?.count as number;

    if (completedCount < totalRounds) {
      return c.json({
        error: `Ainda existem rodadas pendentes. Complete todas as ${totalRounds} rodadas antes de gerar a Mesa Final. (Completas: ${completedCount})`
      }, 400);
    }

    // Get top N players using the correct ranking query
    const topPlayers = await db.prepare(`
      SELECT 
        p.id as player_id,
        COALESCE(SUM(rr.points), 0) as total_points,
        COUNT(DISTINCT rr.round_id) as rounds_played,
        MIN(rr.position) as best_position
      FROM players p
      LEFT JOIN round_results rr ON p.id = rr.player_id
      WHERE p.championship_id = ? AND p.is_active = 1
      GROUP BY p.id
      ORDER BY total_points DESC, best_position ASC, rounds_played DESC
      LIMIT ?
    `).bind(championshipId, topPlayersCount).all();

    if (!topPlayers.results || topPlayers.results.length === 0) {
      return c.json({ error: "Nenhum jogador encontrado no ranking" }, 400);
    }

    // Create final table round
    const round = await db.prepare(
      "INSERT INTO rounds (championship_id, round_number, round_date, notes, round_type, buy_in_value, rebuy_value, knockout_value, is_final_table, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'upcoming') RETURNING *"
    ).bind(
      championshipId,
      totalRounds + 1, // Round number is total + 1
      finalTableDate,
      'Mesa Final',
      'regular',
      null,
      null,
      null
    ).first();

    if (!round) {
      return c.json({ error: "Failed to create final table" }, 500);
    }

    // Add players to the round
    for (const player of topPlayers.results) {
      await db.prepare(
        "INSERT INTO round_players (round_id, player_id) VALUES (?, ?)"
      ).bind(round.id, player.player_id).run();
    }

    return c.json({
      round,
      player_count: topPlayers.results.length
    });
  } catch (error: any) {
    console.error('Error generating final table:', error);
    return c.json({ error: error.message || "Erro ao gerar mesa final" }, 500);
  }
});

// Start round endpoint
app.post("/api/rounds/:id/start", requireAuth, requireAdmin, async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const championshipId = getChampionshipId(c);

  if (!championshipId) {
    return c.json({ error: "Championship ID required" }, 400);
  }

  const round = await db.prepare("SELECT * FROM rounds WHERE id = ? AND championship_id = ?").bind(id, championshipId).first();

  if (!round) {
    return c.json({ error: "Round not found" }, 404);
  }

  if (round.status !== 'active' && round.status !== 'upcoming') {
    return c.json({ error: "Round is not active or upcoming" }, 400);
  }

  // If upcoming, set to active
  if (round.status === 'upcoming') {
    await db.prepare(
      "UPDATE rounds SET status = 'active', is_started = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(id).run();
  } else {
    // Just mark as started if already active
    await db.prepare(
      "UPDATE rounds SET is_started = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(id).run();
  }

  return c.json({ success: true });
});

// Mark rebuy deadline passed
app.post("/api/rounds/:id/rebuy-deadline", requireAuth, requireAdmin, async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const championshipId = getChampionshipId(c);

  if (!championshipId) {
    return c.json({ error: "Championship ID required" }, 400);
  }

  // Verify round belongs to championship
  const round = await db.prepare("SELECT id FROM rounds WHERE id = ? AND championship_id = ?").bind(id, championshipId).first();
  if (!round) {
    return c.json({ error: "Round not found" }, 404);
  }

  await db.prepare(
    "UPDATE rounds SET rebuy_deadline_passed = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).bind(id).run();

  return c.json({ success: true });
});

// Auth endpoints
app.post("/api/auth/register", zValidator("json", RegisterSchema), async (c) => {
  const db = c.env.DB;
  const data = c.req.valid("json");

  // Check if email already exists
  const existing = await db.prepare(
    "SELECT id FROM users WHERE email = ?"
  ).bind(data.email).first();

  if (existing) {
    return c.json({ error: "Email já cadastrado" }, 400);
  }

  // Create user (password stored as plain text for now - TODO: hash in production)
  const result = await db.prepare(
    "INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?) RETURNING *"
  ).bind(data.email, data.password, data.name).first();

  const user = result as User;

  return c.json({
    user: { id: user.id, email: user.email, name: user.name },
    token: data.password // Simple token for now
  });
});

app.post("/api/auth/login", zValidator("json", UserLoginSchema), async (c) => {
  const db = c.env.DB;
  const data = c.req.valid("json");

  const user = await db.prepare(
    "SELECT * FROM users WHERE email = ? AND password_hash = ?"
  ).bind(data.email, data.password).first() as User | null;

  if (!user) {
    return c.json({ error: "Email ou senha inválidos" }, 401);
  }

  return c.json({
    user: { id: user.id, email: user.email, name: user.name },
    token: data.password // Simple token for now
  });
});

app.get("/api/auth/me", requireAuth, async (c) => {
  const user = c.get('user');
  return c.json(user);
});

// Championship endpoints
app.get("/api/championships", requireAuth, async (c) => {
  const db = c.env.DB;
  const user = c.get('user');

  // Get user's championships with role
  const championships = await db.prepare(`
    SELECT c.*, cm.role
    FROM championships c
    JOIN championship_members cm ON c.id = cm.championship_id
    WHERE cm.user_id = ?
    ORDER BY c.created_at DESC
  `).bind(user.id).all();

  return c.json(championships.results);
});

app.post("/api/championships", requireAuth, zValidator("json", CreateChampionshipSchema), async (c) => {
  const db = c.env.DB;
  const data = c.req.valid("json");
  const user = c.get('user');

  // Generate unique code
  let code = generateChampionshipCode();
  let exists = await db.prepare("SELECT id FROM championships WHERE code = ?").bind(code).first();

  while (exists) {
    code = generateChampionshipCode();
    exists = await db.prepare("SELECT id FROM championships WHERE code = ?").bind(code).first();
  }

  // Create championship
  const championship = await db.prepare(
    "INSERT INTO championships (name, code, logo_url, created_by) VALUES (?, ?, ?, ?) RETURNING *"
  ).bind(data.name, code, data.logo_url || null, user.id).first() as Championship;

  // Add creator as admin
  await db.prepare(
    "INSERT INTO championship_members (championship_id, user_id, role) VALUES (?, ?, 'admin')"
  ).bind(championship.id, user.id).run();

  // Create default settings for this championship
  await db.prepare(
    `INSERT INTO tournament_settings (
      championship_id, 
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
    ) VALUES (?, 15, '100/200, 200/400, 300/600, 400/800, 500/1000, BREAK, 600/1200, 800/1600, 1000/2000, 1500/3000, BREAK, 2000/4000, 3000/6000, 4000/8000, 5000/10000, BREAK, 6000/12000, 8000/16000, 10000/20000', 600, 33.33, 0, 24, 60, 30, 10, 9)`
  ).bind(championship.id).run();

  // Create default scoring rules
  const defaultRules = [
    { position: 1, points: 150 },
    { position: 2, points: 125 },
    { position: 3, points: 105 },
    { position: 4, points: 90 },
    { position: 5, points: 80 },
    { position: 6, points: 60 },
    { position: 7, points: 40 },
    { position: 8, points: 35 },
    { position: 9, points: 24 },
    { position: 10, points: 15 },
    { position: 11, points: 5 },
    { position: 12, points: 5 }
  ];

  // Insert rules sequentially to avoid potential batch issues
  console.log(`Creating default rules for championship ${championship.id}`);
  for (const rule of defaultRules) {
    try {
      await db.prepare(
        "INSERT INTO scoring_rules (championship_id, position, points) VALUES (?, ?, ?)"
      ).bind(championship.id, rule.position, rule.points).run();
      console.log(`Inserted rule for pos ${rule.position}`);
    } catch (err) {
      console.error(`Failed to insert rule for pos ${rule.position}:`, err);
    }
  }

  return c.json({ ...championship, role: 'admin' });
});

app.post("/api/championships/join", requireAuth, zValidator("json", JoinChampionshipSchema), async (c) => {
  const db = c.env.DB;
  const data = c.req.valid("json");
  const user = c.get('user');

  // Find championship by code
  const championship = await db.prepare(
    "SELECT * FROM championships WHERE code = ?"
  ).bind(data.code.toUpperCase()).first() as Championship | null;

  if (!championship) {
    return c.json({ error: "Código inválido" }, 404);
  }

  // Check if already a member
  const existing = await db.prepare(
    "SELECT id FROM championship_members WHERE championship_id = ? AND user_id = ?"
  ).bind(championship.id, user.id).first();

  if (existing) {
    return c.json({ error: "Você já é membro deste campeonato" }, 400);
  }

  // Add as player
  await db.prepare(
    "INSERT INTO championship_members (championship_id, user_id, role) VALUES (?, ?, 'player')"
  ).bind(championship.id, user.id).run();

  return c.json({ ...championship, role: 'player' });
});

// Export data endpoint
app.get("/api/export", async (c) => {
  const db = c.env.DB;
  const championshipId = getChampionshipId(c);

  if (!championshipId) {
    return c.json({ error: "Championship ID required" }, 400);
  }

  const players = await db.prepare("SELECT * FROM players WHERE championship_id = ? ORDER BY name").bind(championshipId).all();
  const rounds = await db.prepare("SELECT * FROM rounds WHERE championship_id = ? ORDER BY round_number").bind(championshipId).all();
  const results = await db.prepare(`
    SELECT rr.*, p.name as player_name, r.round_number
    FROM round_results rr
    JOIN players p ON rr.player_id = p.id
    JOIN rounds r ON rr.round_id = r.id
    WHERE r.championship_id = ?
    ORDER BY r.round_number, rr.position
  `).bind(championshipId).all();
  const scoringRules = await db.prepare("SELECT * FROM scoring_rules WHERE championship_id = ? ORDER BY position").bind(championshipId).all();
  const tournamentSettings = await db.prepare("SELECT * FROM tournament_settings WHERE championship_id = ? ORDER BY id DESC LIMIT 1").bind(championshipId).first();

  return c.json({
    players: players.results,
    rounds: rounds.results,
    results: results.results,
    scoring_rules: scoringRules.results,
    tournament_settings: tournamentSettings,
    exported_at: new Date().toISOString(),
  });
});

// Get championship prize pool
app.get("/api/championships/prize-pool", requireAuth, async (c) => {
  const db = c.env.DB;
  const championshipId = getChampionshipId(c);

  if (!championshipId) {
    return c.json({ error: "Championship ID required" }, 400);
  }

  // Get settings for final table percentage
  const settings = await db.prepare(
    "SELECT final_table_percentage, final_table_fixed_value FROM tournament_settings WHERE championship_id = ? ORDER BY id DESC LIMIT 1"
  ).bind(championshipId).first();

  const percentage = (settings?.final_table_percentage as number) || 33.33;
  const fixedValue = (settings?.final_table_fixed_value as number) || 0;

  // Calculate total gross prize pool from all regular rounds
  const roundsData = await db.prepare(`
    SELECT 
      r.buy_in_value, 
      r.rebuy_value,
      (SELECT COUNT(*) FROM round_players WHERE round_id = r.id) as player_count,
      (SELECT SUM(rebuys) FROM round_results WHERE round_id = r.id) as rebuy_count
    FROM rounds r
    WHERE r.championship_id = ? AND r.status = 'completed' AND (r.is_final_table = 0 OR r.is_final_table IS NULL)
  `).bind(championshipId).all();

  let totalGross = 0;
  if (roundsData.results) {
    for (const round of roundsData.results) {
      const buyIn = (round.buy_in_value as number) || 0;
      const rebuy = (round.rebuy_value as number) || 0;
      const players = (round.player_count as number) || 0;
      const rebuys = (round.rebuy_count as number) || 0;

      totalGross += (buyIn * players) + (rebuy * rebuys);
    }
  }

  // Calculate final table pot
  let finalTablePot = 0;
  if (fixedValue > 0) {
    // If fixed value per entry (players + rebuys)
    const totalEntries = roundsData.results.reduce((sum, r) => {
      return sum + ((r.player_count as number) || 0) + ((r.rebuy_count as number) || 0);
    }, 0);
    finalTablePot = fixedValue * totalEntries;
  } else {
    // Percentage of gross
    finalTablePot = totalGross * (percentage / 100);
  }



  return c.json({
    total_gross: totalGross,
    final_table_pot: finalTablePot,
    percentage,
    fixed_value: fixedValue
  });
});

// Replace player in round (for Final Table)
app.post("/api/rounds/:id/replace-player", requireAuth, requireAdmin, async (c) => {
  const db = c.env.DB;
  const roundId = c.req.param("id");
  const { playerIdToRemove } = await c.req.json<{ playerIdToRemove: number }>();
  const championshipId = getChampionshipId(c);

  if (!championshipId) {
    return c.json({ error: "Championship ID required" }, 400);
  }

  // Verify round exists and is upcoming/active
  const round = await db.prepare("SELECT * FROM rounds WHERE id = ?").bind(roundId).first();
  if (!round) {
    return c.json({ error: "Round not found" }, 404);
  }

  // Remove player
  await db.prepare("DELETE FROM round_players WHERE round_id = ? AND player_id = ?")
    .bind(roundId, playerIdToRemove).run();

  // Get current players in round to exclude them
  const currentPlayers = await db.prepare("SELECT player_id FROM round_players WHERE round_id = ?")
    .bind(roundId).all();

  const excludedIds = currentPlayers.results.map((p: any) => p.player_id);

  // Find next best player from ranking who is NOT in the round
  // Using the same ranking logic as before
  const nextPlayer = await db.prepare(`
    SELECT 
      p.id, p.name,
      COALESCE(SUM(rr.points), 0) as total_points,
      COUNT(DISTINCT rr.round_id) as rounds_played,
      MIN(rr.position) as best_position
    FROM players p
    LEFT JOIN round_results rr ON p.id = rr.player_id
    LEFT JOIN rounds r ON rr.round_id = r.id
    WHERE p.championship_id = ? AND p.is_active = 1 
      AND (r.is_final_table = 0 OR r.is_final_table IS NULL OR r.id IS NULL)
      AND p.id NOT IN (${excludedIds.join(',') || '0'})
    GROUP BY p.id
    ORDER BY total_points DESC, best_position ASC, rounds_played DESC
    LIMIT 1
  `).bind(championshipId).first();

  if (!nextPlayer) {
    // If no next player found, just return success (player removed but not replaced)
    return c.json({ message: "Player removed, but no replacement found", replaced: false });
  }

  // Add next player
  await db.prepare("INSERT INTO round_players (round_id, player_id) VALUES (?, ?)")
    .bind(roundId, nextPlayer.id).run();

  return c.json({
    success: true,
    replaced: true,
    newPlayer: nextPlayer
  });
});

export default app;
