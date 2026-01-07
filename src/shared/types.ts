import z from "zod";

export const PlayerSchema = z.object({
  id: z.number(),
  name: z.string(),
  is_active: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreatePlayerSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
});

export const UpdatePlayerSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").optional(),
  is_active: z.number().int().optional(),
});

export const RoundSchema = z.object({
  id: z.number(),
  round_number: z.number(),
  round_date: z.string(),
  notes: z.string().nullable(),
  round_type: z.string(),
  buy_in_value: z.number().nullable(),
  rebuy_value: z.number().nullable(),
  knockout_value: z.number().nullable(),
  status: z.string(),
  is_final_table: z.number().optional(),
  is_started: z.number().optional(),
  rebuy_deadline_passed: z.number().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreateRoundSchema = z.object({
  round_number: z.number().int().positive(),
  round_date: z.string(),
  notes: z.string().optional(),
  round_type: z.enum(['regular', 'freezeout', 'knockout']),
  buy_in_value: z.number().optional(),
  rebuy_value: z.number().optional(),
  knockout_value: z.number().optional(),
  is_final_table: z.boolean().optional(),
  player_ids: z.array(z.number()).min(1),
});

export const RoundResultSchema = z.object({
  id: z.number(),
  round_id: z.number(),
  player_id: z.number(),
  position: z.number(),
  points: z.number(),
  rebuys: z.number(),
  knockout_earnings: z.number(),
  prize: z.number().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const ScoringRuleSchema = z.object({
  id: z.number(),
  position: z.number(),
  points: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const UpdateScoringRuleSchema = z.object({
  position: z.number().int().positive().optional(),
  points: z.number().int(),
});

export const RankingEntrySchema = z.object({
  player_id: z.number(),
  player_name: z.string(),
  total_points: z.number(),
  rounds_played: z.number(),
  best_position: z.number().nullable(),
  average_position: z.number().nullable(),
  total_prize: z.number().optional(),
  total_entries: z.number().optional(),
});

export const TournamentSettingsSchema = z.object({
  id: z.number(),
  blind_level_duration: z.number(),
  blind_levels: z.string(),
  default_buy_in: z.number().optional(),
  final_table_percentage: z.number().optional(),
  final_table_fixed_value: z.number().optional(),
  total_rounds: z.number().optional(),
  first_place_percentage: z.number().optional(),
  second_place_percentage: z.number().optional(),
  third_place_percentage: z.number().optional(),
  fourth_place_percentage: z.number().optional(),
  fifth_place_percentage: z.number().optional(),
  final_table_top_players: z.number().optional(),

  final_table_1st_percentage: z.number().optional(),
  final_table_2nd_percentage: z.number().optional(),
  final_table_3rd_percentage: z.number().optional(),
  final_table_4th_percentage: z.number().optional(),
  final_table_5th_percentage: z.number().optional(),
  rules_text: z.string().optional(),
  final_table_date: z.string().optional(),
  prize_distribution: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const UpdateTournamentSettingsSchema = z.object({
  blind_level_duration: z.number().int().positive(),
  blind_levels: z.string().min(1),
  default_buy_in: z.number().optional(),
  final_table_percentage: z.number().optional(),
  final_table_fixed_value: z.number().optional(),
  total_rounds: z.number().int().positive().optional(),
  first_place_percentage: z.number().optional(),
  second_place_percentage: z.number().optional(),
  third_place_percentage: z.number().optional(),
  fourth_place_percentage: z.number().optional(),
  fifth_place_percentage: z.number().optional(),
  final_table_top_players: z.number().int().positive().optional(),
  final_table_1st_percentage: z.number().optional(),
  final_table_2nd_percentage: z.number().optional(),
  final_table_3rd_percentage: z.number().optional(),
  final_table_4th_percentage: z.number().optional(),
  final_table_5th_percentage: z.number().optional(),
  rules_text: z.string().optional(),
  final_table_date: z.string().optional(),
  prize_distribution: z.array(z.number()).optional(),
});

export type Player = z.infer<typeof PlayerSchema>;
export type CreatePlayer = z.infer<typeof CreatePlayerSchema>;
export type UpdatePlayer = z.infer<typeof UpdatePlayerSchema>;
export type Round = z.infer<typeof RoundSchema>;
export type CreateRound = z.infer<typeof CreateRoundSchema>;
export type RoundResult = z.infer<typeof RoundResultSchema>;
export type ScoringRule = z.infer<typeof ScoringRuleSchema>;
export type UpdateScoringRule = z.infer<typeof UpdateScoringRuleSchema>;
export type RankingEntry = z.infer<typeof RankingEntrySchema>;

export type RoundWithResults = Round & {
  results: (RoundResult & { player_name: string })[];
  players?: { id: number; name: string }[];
};

export const CompleteRoundSchema = z.object({
  results: z.array(z.object({
    player_id: z.number(),
    position: z.number().int().positive(),
    rebuys: z.number().int().min(0).optional(),
    knockout_earnings: z.number().min(0).optional(),
    prize: z.number().min(0).optional(),
  })),
});

export type CompleteRound = z.infer<typeof CompleteRoundSchema>;

export const LoginSchema = z.object({
  password: z.string(),
});

export const ResetSchema = z.object({
  password: z.string(),
  championship_name: z.string().optional(),
});

export type LoginRequest = z.infer<typeof LoginSchema>;
export type ResetRequest = z.infer<typeof ResetSchema>;

export type TournamentSettings = z.infer<typeof TournamentSettingsSchema>;
export type UpdateTournamentSettings = z.infer<typeof UpdateTournamentSettingsSchema>;

// User schemas
export const UserSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string(),
  created_at: z.string(),
});

export const RegisterSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  name: z.string().min(1, "Nome é obrigatório"),
});

export const UserLoginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export type User = z.infer<typeof UserSchema>;
export type RegisterRequest = z.infer<typeof RegisterSchema>;
export type UserLoginRequest = z.infer<typeof UserLoginSchema>;

// Championship schemas
export const ChampionshipSchema = z.object({
  id: z.number(),
  name: z.string(),
  code: z.string(),
  logo_url: z.string().nullable(),
  created_by: z.number(),
  is_single_tournament: z.number().optional(),
  created_at: z.string(),
});

export const CreateChampionshipSchema = z.object({
  name: z.string().min(1),
  logo_url: z.string().optional(),
  is_single_tournament: z.boolean().optional(),
});

export const JoinChampionshipSchema = z.object({
  code: z.string().length(6, "Código deve ter 6 caracteres"),
});

export type Championship = z.infer<typeof ChampionshipSchema>;
export type CreateChampionship = z.infer<typeof CreateChampionshipSchema>;
export type JoinChampionship = z.infer<typeof JoinChampionshipSchema>;

// Championship Member schemas
export const ChampionshipMemberSchema = z.object({
  id: z.number(),
  championship_id: z.number(),
  user_id: z.number(),
  role: z.enum(['admin', 'player']),
  joined_at: z.string(),
});

export type ChampionshipMember = z.infer<typeof ChampionshipMemberSchema>;

// Round Schedule schemas
export const RoundScheduleSchema = z.object({
  id: z.number(),
  championship_id: z.number(),
  round_number: z.number().int().positive(),
  scheduled_date: z.string(),
  notes: z.string().optional(),
  created_at: z.string(),
});

export const CreateRoundScheduleSchema = z.object({
  round_number: z.number().int().positive(),
  scheduled_date: z.string(),
  notes: z.string().optional(),
});

export const UpdateRoundScheduleSchema = z.object({
  scheduled_date: z.string(),
  notes: z.string().optional(),
});

export type RoundSchedule = z.infer<typeof RoundScheduleSchema>;
export type CreateRoundSchedule = z.infer<typeof CreateRoundScheduleSchema>;
export type UpdateRoundSchedule = z.infer<typeof UpdateRoundScheduleSchema>;

// Extended types with relationships
export type ChampionshipWithRole = Championship & {
  role: 'admin' | 'player';
  is_single_tournament?: number;
};
