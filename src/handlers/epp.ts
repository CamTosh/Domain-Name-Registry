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

    // Skip session validation for login commands
    if (command.type !== "login") {
      if (!command.sessionId || !state.sessionManager.validateSession(command.sessionId)) {
        socket.write(generateResponse("authError"));
        return;
      }
    }

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
    if (error instanceof Error) {
      if (error.message === "Unknown command") {
        socket.write(generateResponse("unknownCommand"));
      } else {
        logger.error("EPP error:", error);
        socket.write(generateResponse("systemError"));
      }
    }
  }
}

function handleLogin(socket: Socket, command: LoginCommand, state: AppState) {
  const { id, pw } = command;
  const registrar = queries.checkRegistrar(state.db, id, pw);

  if (!registrar) {
    socket.write(generateResponse("authError"));
    return;
  }

  const sessionId = state.sessionManager.createSession(id);
  socket.write(generateResponse("loginSuccess", { sessionId }));
}

function handleCheck(socket: Socket, command: CheckCommand, state: AppState) {
  if (!command.sessionId) {
    socket.write(generateResponse("authError"));
    return;
  }

  const domain = queries.checkDomain(state.db, command.domain);
  socket.write(generateResponse("checkResponse", {
    domain: command.domain,
    available: !domain,
    sessionId: command.sessionId,
  }));
}

function handleCreate(socket: Socket, command: CreateCommand, state: AppState) {
  try {
    if (!command.sessionId) {
      socket.write(generateResponse("authError"));
      return;
    }

    queries.createDomain(state.db, command.domain, command.registrar);
    const domain = queries.getDomainInfo(state.db, command.domain);

    // Maybe wrote a better check
    if (!domain || domain.registrar !== command.registrar) {
      socket.write(generateResponse("notFound"));
      return;
    }

    socket.write(generateResponse("createSuccess", {
      ...domain,
      sessionId: command.sessionId
    }));
  } catch (error) {
    socket.write(generateResponse("createError"));
  }
}

function handleInfo(socket: Socket, command: InfoCommand, state: AppState) {
  try {
    if (!command.sessionId) {
      socket.write(generateResponse("authError"));
      return;
    }

    const domain = queries.getDomainInfo(state.db, command.domain);
    if (!domain) {
      socket.write(generateResponse("notFound"));
      return;
    }

    socket.write(generateResponse("infoResponse", {
      ...domain,
      sessionId: command.sessionId
    }));
  } catch (error) {
    logger.error("Info command error:", error);
    socket.write(generateResponse("systemError"));
  }
}
