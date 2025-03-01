import type { AppState } from "../types";

export async function handleLeaderboard(req: Request, state: AppState) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const leaderboard = state.db.prepare(`
    SELECT
      registrar_id,
      COUNT(*) as domain_count,
      SUM(CASE WHEN timestamp >= ? THEN 1 ELSE 0 END) as today_count
    FROM registrar_actions
    WHERE action = 'create'
      AND success = 1
      AND registrar_id != 'registry'
    GROUP BY registrar_id
    HAVING domain_count > 0
    ORDER BY domain_count DESC, today_count DESC
  `).all(yesterday.getTime()) as {
    registrar_id: string;
    domain_count: number;
    today_count: number;
  }[];

  return new Response(JSON.stringify(leaderboard, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}
