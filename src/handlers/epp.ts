import type { Socket } from "bun";
import { logger } from "../utils/logger";
import { queries } from "../database";
import type { AppState, LoginCommand, CheckCommand, CreateCommand, InfoCommand } from "../types";
import { generateResponse } from "../logic/epp-responses";
import { checkRateLimit } from "../logic/rate-limit";
import { parseXml } from "../logic/xml";
import { isValidDomain } from "../utils/domains";

export async function handleEppRequest(socket: Socket, data: Buffer, state: AppState) {
  const clientIP = socket.remoteAddress;
  if (!checkRateLimit(clientIP, state.rateLimit)) {
    socket.write(generateResponse("rateLimitExceeded"));
    return;
  }

  try {
    const request = data.toString();
    const command = parseXml(request);

    // Handle session and get registrar ID
    let registrarId: string | undefined;

    if (command.type === "login") {
      registrarId = command.id;
    } else {
      // For non-login commands, validate session and get registrar
      if (!command.sessionId) {
        socket.write(generateResponse("authError"));
        return;
      }

      const session = state.sessionManager.validateSession(command.sessionId);
      if (!session) {
        socket.write(generateResponse("authError"));
        return;
      }
      registrarId = session.registrar;
    }

    // Check usage limits for the registrar
    const usage = await state.usageManager.checkUsage(registrarId);
    if (!usage.allowed) {
      socket.write(generateResponse("usageLimitExceeded"));
      return;
    }

    // Apply penalties if any
    if (usage.delay > 0) {
      await Bun.sleep(usage.delay);
    }

    if (usage.penaltyTokens > 0) {
      queries.updateRegistrarCredits(state.db, registrarId, -usage.penaltyTokens);
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

    const domain = command.domain.toLowerCase();

    if (!isValidDomain(domain)) {
      socket.write(generateResponse("invalidDomain"));
      return;
    }

    const availability = queries.isDomainAvailable(state.db, domain);
    if (!availability.available) {
      socket.write(generateResponse("domainUnavailable"));
      return;
    }

    if (availability.status === 'inactive') {
      queries.transferDomain(state.db, domain, command.registrar);
    } else {
      queries.createDomain(state.db, domain, command.registrar);
    }

    const domainInfo = queries.getDomainInfo(state.db, domain);

    if (!domainInfo) {
      socket.write(generateResponse("createError"));
      return;
    }

    socket.write(generateResponse("createSuccess", {
      ...domainInfo,
      sessionId: command.sessionId
    }));
  } catch (error) {
    logger.error("Create domain error:", error);
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
