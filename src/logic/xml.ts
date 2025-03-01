import type { EppCommand } from "../types";

export function parseXml(xml: string): EppCommand {
  const commandMatch = xml.match(/<command>(.*?)<\/command>/s);
  if (!commandMatch) throw new Error("Invalid EPP command");

  const command = commandMatch[1];

  const clID = xml.match(/<clID>([^<]+)<\/clID>/)?.[1];
  const pw = xml.match(/<pw>([^<]+)<\/pw>/)?.[1];
  const domain = xml.match(/<domain:name>([^<]+)<\/domain:name>/)?.[1];
  const clTRID = xml.match(/<clTRID>([^<]+)<\/clTRID>/)?.[1];

  if (command.includes("<login>")) {
    if (!clID || !pw) throw new Error("Invalid login command");

    return { type: "login", id: clID, pw };
  }

  const baseCommand = { sessionId: clTRID };

  if (command.includes("<check>")) {
    if (!domain) throw new Error("Invalid check command");
    return {
      ...baseCommand,
      type: "check",
      domain
    };
  }

  if (command.includes("<create>")) {
    if (!domain || !clID) throw new Error("Invalid create command");
    return {
      ...baseCommand,
      type: "create",
      domain,
      registrar: clID
    };
  }

  if (command.includes("<info>")) {
    if (!domain) throw new Error("Invalid info command");
    return {
      ...baseCommand,
      type: "info",
      domain
    };
  }

  throw new Error("Unknown command");
}
