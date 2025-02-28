import type { EppCommand } from "../types";

export async function parseXml(xml: string): Promise<EppCommand> {
  xml = xml.trim().replace(/\s+/g, ' ');

  const domain = xml.match(/domain>([^<]+)</)?.[1];
  const id = xml.match(/clID>([^<]+)</)?.[1];
  const pw = xml.match(/pw>([^<]+)</)?.[1];

  console.log({ domain, id, pw })

  if (xml.includes("<login>")) {
    if (!id || !pw) throw new Error("Invalid login command");

    return {
      type: "login",
      id,
      pw
    };
  }

  if (xml.includes("<check>")) {
    if (!domain) throw new Error("Invalid check command");

    return {
      type: "check",
      domain
    };
  }

  if (xml.includes("<create>")) {
    if (!domain || !id) throw new Error("Invalid create command");

    return {
      type: "create",
      domain,
      registrar: id
    };
  }

  if (xml.includes("<info>")) {
    if (!domain) throw new Error("Invalid info command");

    return {
      type: "info",
      domain
    };
  }

  throw new Error("Unknown command");
}
