import type { AppState } from "../types";

export async function handleLeaderboard(req: Request, state: AppState) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const leaderboard = state.db.prepare(`
    WITH domain_catches AS (
      SELECT
        ra.registrar_id,
        d.score,
        COUNT(*) as count,
        SUM(CASE WHEN ra.timestamp >= ? THEN 1 ELSE 0 END) as today_count
      FROM registrar_actions ra
      JOIN domains d ON ra.domain = d.name
      WHERE ra.action = 'create'
        AND ra.success = 1
        AND ra.registrar_id != 'registry'
      GROUP BY ra.registrar_id,
        CASE
          WHEN d.score >= 90 THEN 'rare'
          WHEN d.score >= 70 THEN 'valuable'
          WHEN d.score >= 30 THEN 'average'
          ELSE 'low'
        END
    )
    SELECT
      registrar_id,
      SUM(count) as total_domains,
      SUM(today_count) as today_count,
      SUM(CASE WHEN score >= 90 THEN count ELSE 0 END) as rare_count,
      SUM(CASE WHEN score >= 70 AND score < 90 THEN count ELSE 0 END) as valuable_count,
      SUM(CASE WHEN score >= 30 AND score < 70 THEN count ELSE 0 END) as average_count,
      SUM(CASE WHEN score < 30 THEN count ELSE 0 END) as low_count,
      SUM(score * count) as total_score
    FROM domain_catches
    GROUP BY registrar_id
    HAVING total_domains > 0
    ORDER BY total_score DESC, rare_count DESC, valuable_count DESC
  `).all(yesterday.getTime()) as {
    registrar_id: string;
    total_domains: number;
    today_count: number;
    rare_count: number;
    valuable_count: number;
    average_count: number;
    low_count: number;
    total_score: number;
  }[];

  return new Response(JSON.stringify(leaderboard, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}
