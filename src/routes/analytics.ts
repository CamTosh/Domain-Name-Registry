import { queries } from "../database";
import type { AppState } from "../types";

export async function handleAnalytics(req: Request, state: AppState) {
  const url = new URL(req.url);

  const registrarId = url.searchParams.get('registrar');
  const domain = url.searchParams.get('domain');
  const period = 'day'; // url.searchParams.get('period') || 'day';

  if (!registrarId && !domain) {
    return new Response('Missing registrar or domain parameter', { status: 400 });
  }

  if (domain) {
    const data = queries.getDomainHistory(state.db, domain);
    return new Response(JSON.stringify(data, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!registrarId) {
    return new Response('Missing registrar parameter', { status: 400 });
  }

  const startTime = getStartTime(period);
  const stats = queries.getRegistrarStats(state.db, registrarId, startTime);
  const timeline = queries.getRegistrarTimeline(state.db, registrarId, startTime);

  const data = { stats, timeline }

  return new Response(JSON.stringify(data, null, 2));
}

function getStartTime(period: string): number {
  const now = Date.now();
  switch (period) {
    case 'hour':
      return now - 3600000;
    case 'day':
      return now - 86400000;
    case 'week':
      return now - 604800000;
    case 'month':
      return now - 2592000000;
    default:
      return now - 86400000; // default to day
  }
}
