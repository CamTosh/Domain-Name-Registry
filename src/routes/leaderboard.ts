import type { AppState } from "../types";

export async function handleLeaderboard(req: Request, state: AppState) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();

  // Get start of week (assuming week starts on Monday)
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);
  const weekStartTime = weekStart.getTime();

  const leaderboard = state.db.prepare(`
    WITH today_stats AS (
      SELECT
        registrar,
        COUNT(*) as today_count
      FROM domains
      WHERE created_at >= ?
      GROUP BY registrar
    ),
    week_stats AS (
      SELECT
        registrar,
        COUNT(*) as week_count
      FROM domains
      WHERE created_at >= ?
      GROUP BY registrar
    )
    SELECT
      r.id as registrar_id,
      COALESCE(t.today_count, 0) as today_count,
      COALESCE(w.week_count, 0) as week_count
    FROM registrars r
    LEFT JOIN today_stats t ON r.id = t.registrar
    LEFT JOIN week_stats w ON r.id = w.registrar
    WHERE r.id != 'registry'
    ORDER BY week_count DESC, today_count DESC, r.id ASC
  `).all(todayStart, weekStartTime) as {
    registrar_id: string;
    today_count: number;
    week_count: number;
  }[];

  return new Response(JSON.stringify(leaderboard, null, 2))
}
