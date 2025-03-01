import type { Socket } from "bun";
import { queries } from "../database";
import type { AppState } from "../types";
import { formatWhoisResponse } from "../utils/whois-formatter";

const CRLF = "\r\n";

export function handleWhoisRequest(socket: Socket, data: Buffer, state: AppState) {
  try {
    // Parse the query - remove whitespace and extract domain
    const query = data.toString().trim().toLowerCase();

    if (query === "help" || query === "?") {
      sendHelp(socket);
      return;
    }

    // Handle domain lookup
    if (query.includes(".")) {
      handleDomainLookup(socket, query, state);
      return;
    }

    if (query.startsWith("registrar ")) {
      const registrarId = query.replace("registrar ", "").trim();
      handleRegistrarLookup(socket, registrarId, state);
      return;
    }

    sendError(socket, "Invalid query format");
  } catch (error) {
    sendError(socket, "Internal server error");
  } finally {
    socket.end();
  }
}

function handleDomainLookup(socket: Socket, domain: string, state: AppState) {
  const domainInfo = queries.getDomainInfo(state.db, domain);

  if (!domainInfo) {
    sendError(socket, `No match for domain "${domain}"`);
    return;
  }

  const registrarInfo = queries.getRegistrarInfo(state.db, domainInfo.registrar);
  const response = formatWhoisResponse({ domain: domainInfo, registrar: registrarInfo });

  socket.write(response + CRLF);
}

function handleRegistrarLookup(socket: Socket, registrarId: string, state: AppState) {
  const registrar = queries.getRegistrarInfo(state.db, registrarId);

  if (!registrar) {
    sendError(socket, `No match for registrar "${registrarId}"`);
    return;
  }

  const domains = queries.getRegistrarDomains(state.db, registrarId);
  const response = formatWhoisResponse({ registrar, domains });

  socket.write(response + CRLF);
}

function sendHelp(socket: Socket) {
  const help = [
    "Available WHOIS commands:",
    "  domain.tld       -- Look up a domain name",
    "  registrar ID    -- Look up a registrar",
    "  help or ?       -- Show this help",
    "",
    "Examples:",
    "  example.com",
    "  registrar test1",
    ""
  ].join(CRLF);

  socket.write(help);
}

function sendError(socket: Socket, message: string) {
  socket.write(`ERROR: ${message}${CRLF}`);
}
