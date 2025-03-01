import type { Domain, Registrar } from "../types";

interface WhoisResponseOptions {
  domain?: Domain;
  registrar?: Registrar;
  domains?: Domain[];
}

export function formatWhoisResponse(options: WhoisResponseOptions): string {
  const { domain, registrar, domains } = options;
  const sections: string[] = [];

  if (domain) {
    sections.push(formatDomainSection(domain));
  }

  if (registrar) {
    sections.push(formatRegistrarSection(registrar, domains));
  }

  return sections.join("\n\n") + "\n";
}

function formatDomainSection(domain: Domain): string {
  return [
    "Domain Information:",
    "-----------------",
    `Domain Name: ${domain.name}`,
    `Domain Status: ${domain.status}`,
    `Created Date: ${formatDate(domain.created_at)}`,
    domain.updated_at ? `Last Updated Date: ${formatDate(domain.updated_at)}` : null,
    domain.expiry_date ? `Expiration Date: ${formatDate(domain.expiry_date)}` : null,
    `Registrar: ${domain.registrar}`,
    "",
    "DNSSEC: unsigned",
  ].filter(Boolean).join("\n");
}

function formatRegistrarSection(registrar: Registrar, domains?: Domain[]): string {
  const section = [
    "Registrar Information:",
    "--------------------",
    `Registrar ID: ${registrar.id}`,
    `Available Credits: ${registrar.credits}`,
  ];

  if (domains?.length) {
    section.push(
      "",
      "Registered Domains:",
      "----------------",
      ...domains.map(d => `${d.name} (${d.status})`)
    );
  }

  return section.join("\n");
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toISOString();
}
