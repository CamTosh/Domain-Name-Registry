import { env, sleep, type TCPSocket } from "bun";

/*
 * Domain Drop Catcher for .TSH Registry
 *
 * Usage:
 * bun run simple-dropcatcher.ts --id=<registrar_id> --password=<password>
 *
 *
 * This script monitors and attempts to register expiring domains by:
 * 1. Fetching the list of expiring domains from the API
 * 2. Creating an EPP session with the registry
 * 3. Running two parallel monitoring loops:
 *    - Main Loop (100ms): Checks domain availability and attempts registration
 *    - Domain Check Loop (5s): Updates the domain list from the API
 *
 * Features:
 * - Automatic session management and cleanup
 * - Real-time statistics display
 * - Registration timestamp tracking
 * - Rate-limiting friendly (100ms between checks)
 * - Graceful shutdown on completion or interrupt
 *
 * Limitations:
 * - Basic implementation: does not consider domain scores/values
 * - Attempts to register all available domains equally
 * - No prioritization or strategic catching
 *
 * Environment:
 * Development (default):
 *   EPP_HOST: localhost
 *   API_URL: http://localhost:3000/today-expiration
 *
 * Production (NODE_ENV=production):
 *   EPP_HOST: epp.nic.bullshit.video
 *   API_URL: https://nic.bullshit.video/today-expiration
 *
 */

const API_URL = env.NODE_ENV === "production" ? "https://nic.bullshit.video/today-expiration" : "http://localhost:3000/today-expiration";
const EPP_HOST = env.NODE_ENV === 'production' ? "epp.nic.bullshit.video" : "localhost";
const EPP_PORT = 700;

const MAIN_LOOP_INTERVAL = 100;
const DOMAIN_CHECK_INTERVAL = 5_000;

const args = process.argv.slice(2);
const registrarId = args.find((arg) => arg.startsWith('--id='))?.split('=')[1] || 'test1';
const password = args.find((arg) => arg.startsWith('--password='))?.split('=')[1] || 'test1';

process.on('SIGINT', () => shutdown('\nShutting down...', 0));
start(registrarId, password);

/*
 * Main Loops
*/
let monitorInterval: Timer | null = null;
let domainCheckInterval: Timer | null = null;

let session: TCPSocket | null = null;
let domains: Set<string> = new Set();
let attempting: Set<string> = new Set();

async function start(registrarId: string, password: string) {
  console.log(`Starting drop catcher with registrar ID: ${registrarId}`);

  const expiringDomains = await fetch(API_URL).then((res) => res.json());
  domains = new Set(expiringDomains);
  console.log(`Monitoring ${domains.size} domains.`);

  await sleep(2_000);

  await createEPPSession(registrarId, password);
  await monitorDomains(registrarId);

  // Start checking remaining domains every 5 seconds
  domainCheckInterval = setInterval(async () => {
    try {
      const remainingDomains: Set<string> = new Set(
        await fetch(API_URL).then((res) => res.json())
      );

      // Update current domains based on API response
      for (const domain of domains.values()) {
        if (!remainingDomains.has(domain)) {
          domains.delete(domain);
        }
      }

      if (domains.size === 0) {
        shutdown('\nNo more domains to monitor. Shutting down...', 0);
      }
    } catch { }
  }, DOMAIN_CHECK_INTERVAL);
}

async function monitorDomains(registrarId: string) {
  let cycle = 0;
  let stats = {
    domains: domains.size,
    attempts: 0,
    success: 0,
    errors: 0
  };

  const createdDomains = new Map<string, Date>();

  // Store interval reference for cleanup
  monitorInterval = setInterval(async () => {
    console.clear();
    const now = new Date().toLocaleTimeString();
    console.log(`Dropcatch Monitor - Cycle ${++cycle} - ${now}\nDomains: ${stats.domains} | Attempts: ${stats.attempts} | Success: ${stats.success} | Errors: ${stats.errors}\n─────────────────────────────────────────────────────`);

    for (const domain of domains) {
      if (attempting.has(domain)) continue;

      try {
        const isAvailable = await checkDomain(domain);
        if (!isAvailable) {
          continue;
        }

        attempting.add(domain);
        stats.attempts++;
        console.write(`\rAttempting: ${domain}`);

        let success = await createDomain(domain, registrarId);
        if (success) {
          createdDomains.set(domain, new Date());
          stats.success++;
          domains.delete(domain);
        }

        attempting.delete(domain);
      } catch (error) {
        stats.errors++;
        attempting.delete(domain);
      }
    }

    stats.domains = domains.size;

    createdDomains.entries().forEach(([domain, registeredAt]) => {
      console.write(`\r✓ [${registeredAt.toLocaleTimeString()}] Registered: ${domain}    \n`)
    });

  }, MAIN_LOOP_INTERVAL);
}

/*
 * EPP
*/
async function createEPPSession(registrarId: string, password: string) {
  const loginXML = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
    <epp xmlns="urn:ietf:params:xml:ns:epp-1.0">
      <command>
        <login>
          <clID>${registrarId}</clID>
          <pw>${password}</pw>
        </login>
      </command>
    </epp>`;

  session = await Bun.connect({
    hostname: EPP_HOST,
    port: EPP_PORT,
    socket: {
      data(socket, data) {
        const response = new TextDecoder().decode(data);
        if (responseResolve) {
          responseResolve(response);
          responseResolve = null;
        }
      },
      error(socket, error) {
        console.error('Socket error:', error);
        if (responseResolve) {
          responseResolve('');
          responseResolve = null;
        }
      },
      close(socket) {
        console.log('Socket closed');
        if (responseResolve) {
          responseResolve('');
          responseResolve = null;
        }
      },
      open(socket) {
        console.log('Socket opened');
      }
    }
  });

  if (!session) {
    throw 'no session';
  }

  session.write(loginXML);
  const response = await waitForResponse();

  if (!response.includes("<result code=\"1000\"") && !response.includes("<greeting>")) {
    throw new Error("EPP login failed");
  }
}

async function checkDomain(domain: string) {
  if (!session) return false;

  const checkXML = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
    <epp xmlns="urn:ietf:params:xml:ns:epp-1.0">
      <command>
        <check>
          <domain:name>${domain}</domain:name>
        </check>
        <clTRID>${Math.random().toString(36)}</clTRID>
      </command>
    </epp>`;

  session.write(checkXML);
  const response = await waitForResponse();

  return response.includes("<domain:name avail=\"1\"");
}

async function createDomain(domain: string, registrarId: string) {
  if (!session) return false;

  const createXML = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
    <epp xmlns="urn:ietf:params:xml:ns:epp-1.0">
      <command>
        <create>
          <domain:name>${domain}</domain:name>
          <clID>${registrarId}</clID>
        </create>
        <clTRID>${Math.random().toString(36)}</clTRID>
      </command>
    </epp>`;

  session.write(createXML);
  const response = await waitForResponse();

  return response.includes("<result code=\"1000\"");
}

/*
 * Utils
*/
let responseResolve: ((value: string) => void) | null = null;

function waitForResponse(timeout = 5000): Promise<string> {
  return new Promise((resolve) => {
    responseResolve = resolve;
    setTimeout(() => {
      if (responseResolve) {
        responseResolve('');
        responseResolve = null;
      }
    }, timeout);
  });
}

function shutdown(message: string, code: number) {
  if (message) console.log(message);

  if (domainCheckInterval) clearInterval(domainCheckInterval);
  if (monitorInterval) clearInterval(monitorInterval);

  if (session) {
    session.end();
    session = null;
  }

  process.exit(code);
}
