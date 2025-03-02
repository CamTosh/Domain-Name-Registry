import type { Domain, SafeRegistrar } from "../types";

interface WhoisResponseOptions {
  domain?: Domain;
  registrar?: SafeRegistrar;
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

function formatRegistrarSection(registrar: SafeRegistrar, domains?: Domain[]): string {
  const section = [
    `registrar:      ${registrar.id}`,
    `organisation:   BULLSHIT Registry Accredited Registrar`,
    `domains:        ${(domains || []).length}`,
  ];

  if (domains?.length) {
    const maxDomainLength = Math.max(...domains.map(d => d.name.length));

    section.push(
      `    ${'domain'.padEnd(maxDomainLength)} ${'status'.padEnd(10)} - ${'score'.padStart(3)}`,
      ...domains.map((d) => {
        const domainPart = d.name.toLowerCase().padEnd(maxDomainLength);
        const statusPart = `(${d.status})`.padEnd(10);
        const scorePart = String(d.score).padStart(3);
        return `    ${domainPart} ${statusPart} - ${scorePart}`;
      })
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
