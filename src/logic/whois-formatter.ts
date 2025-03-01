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
  const now = new Date().toISOString();

  return [
    `% BULLSHIT WHOIS server`,
    `% for more information on BULLSHIT, visit https://nic.bullshit.video`,
    `% This query returned 1 object`,
    ``,
    `domain:       ${domain.name.toLowerCase()}`,
    `organisation: BULLSHIT Registry Services`,
    `registrar:    ${domain.registrar}`,
    `status:       ${domain.status.toUpperCase()}`,
    `created:      ${formatDate(domain.created_at)}`,
    `changed:      ${domain.updated_at ? formatDate(domain.updated_at) : 'not available'}`,
    `expires:      ${domain.expiry_date ? formatDate(domain.expiry_date) : 'not available'}`,
    ``,
    `nserver:      ns1.todo.bullshit.video`,
    `dnssec:       unsigned`,
    ``,
    `whois:        whois.nic.bullshit.video`,
    `source:       BULLSHIT`,
    ``,
    `>>> Last update of WHOIS database: ${now} <<<`,
  ].join('\n');
}

function formatRegistrarSection(registrar: Registrar, domains?: Domain[]): string {
  const section = [
    `registrar:      ${registrar.id}`,
    `organisation:   BULLSHIT Registry Accredited Registrar`,
    `credits:        ${registrar.credits}`,
  ];

  if (domains?.length) {
    section.push(
      ``,
      `domains:       ${domains.length}`,
      ...domains.map(d => `    ${d.name.toLowerCase()} (${d.status})`)
    );
  }

  section.push(
    ``,
    `source:        BULLSHIT`
  );


  return section.join("\n");
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toISOString();
}
