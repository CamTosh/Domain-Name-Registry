import type { Socket } from "bun";
import { parseXml } from "../utils/xml";
import { generateResponse } from "../utils/epp-responses";
import { checkRateLimit } from "../utils/rate-limit";
import { logger } from "../utils/logger";
import { queries } from "../database";
import type { AppState, LoginCommand, CheckCommand, CreateCommand, InfoCommand } from "../types";

export async function handleEppRequest(socket: Socket, data: Buffer, state: AppState) {
  const clientIP = socket.remoteAddress;

  if (!checkRateLimit(clientIP, state.rateLimit)) {
    socket.write(generateResponse("rateLimitExceeded"));
    return;
  }

  try {
    const request = data.toString();
    const command = parseXml(request);

    switch (command.type) {
      case "login":
        handleLogin(socket, command, state);
        break;
      case "check":
        handleCheck(socket, command, state);
        break;
      case "create":
        handleCreate(socket, command, state);
        break;
      case "info":
        handleInfo(socket, command, state);
        break;
      default:
        socket.write(generateResponse("unknownCommand"));
    }
  } catch (error) {
    logger.error("EPP error:", error);
    socket.write(generateResponse("systemError"));
  }
}

function handleLogin(socket: Socket, command: LoginCommand, state: AppState) {
  const { id, pw } = command;
  const registrar = queries.checkRegistrar(state.db, id, pw);

  if (registrar) {
    const sessionId = crypto.randomUUID();
    state.sessions.set(sessionId, {
      registrar: id,
      loginTime: Date.now()
    });
    socket.write(generateResponse("loginSuccess", { sessionId }));
  } else {
    socket.write(generateResponse("authError"));
  }
}

function handleCheck(socket: Socket, command: CheckCommand, state: AppState) {
  const domain = queries.checkDomain(state.db, command.domain);
  socket.write(generateResponse("checkResponse", {
    domain: command.domain,
    available: !domain
  }));
}

function handleCreate(socket: Socket, command: CreateCommand, state: AppState) {
  try {
    queries.createDomain(state.db, command.domain, command.registrar);
    const domain = queries.getDomainInfo(state.db, command.domain);
    // Not sure of this one
    if (domain && domain.registrar === command.registrar) {
      socket.write(generateResponse("createSuccess", domain));
    } else {
      socket.write(generateResponse("notFound"));
    }


  } catch (error) {
    socket.write(generateResponse("createError"));
  }
}

function handleInfo(socket: Socket, command: InfoCommand, state: AppState) {
  const domain = queries.getDomainInfo(state.db, command.domain);
  if (domain) {
    socket.write(generateResponse("infoResponse", domain));
  } else {
    socket.write(generateResponse("notFound"));
  }
}
