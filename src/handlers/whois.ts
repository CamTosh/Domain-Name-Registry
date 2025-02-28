import type { Socket } from "bun";
import { queries } from "../database";
import type { AppState } from "../types";

export function handleWhoisRequest(socket: Socket, data: { domain: string }, state: AppState) {
  const domain = data.toString().trim();
  const domainInfo = queries.getDomainInfo(state.db, domain);

  if (domainInfo) {
    socket.write(`
Domain Name: ${domainInfo.name}
Registrar: ${domainInfo.registrar}
Created Date: ${new Date(domainInfo.created_at).toISOString()}
Status: ${domainInfo.status}
    `);
  } else {
    socket.write("No match for domain.\n");
  }

  socket.end();
}
