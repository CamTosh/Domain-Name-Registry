import type { TCPSocket } from "bun";

/*
 *
 * How to use it?
 * `bun run examples/simple-dropcatcher.ts --id=test1 --password=test1`
 *
*/


// const EPP_HOST = "epp.nic.bullshit.video";
// const EPP_PORT = 700;
// const API_URL = "https://nic.bullshit.video/today-expiration";

const EPP_HOST = "localhost";
const EPP_PORT = 700;
const API_URL = "http://localhost:3000/today-expiration";

let session: TCPSocket | null = null;
let domains: Set<string> = new Set();
let attempting: Set<string> = new Set();

let responseResolve: ((value: string) => void) | null = null;

const args = process.argv.slice(2);
const registrarId = args.find((arg) => arg.startsWith('--id='))?.split('=')[1] || 'test1';
const password = args.find((arg) => arg.startsWith('--password='))?.split('=')[1] || 'test1';

function waitForResponse(): Promise<string> {
  return new Promise((resolve) => {
    responseResolve = resolve;
  });
}

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

async function monitorDomains(registrarId: string) {
  let cycle = 0;
  let stats = {
    domains: domains.size,
    attempts: 0,
    success: 0,
    errors: 0
  };

  const createdDomains: string[] = [];
  setInterval(async () => {
    console.clear();
    console.log(`Dropcatch Monitor - Cycle ${++cycle}\nDomains: ${stats.domains} | Attempts: ${stats.attempts} | Success: ${stats.success} | Errors: ${stats.errors}\n─────────────────────────────────────────────────────`);

    for (const domain of domains) {
      if (attempting.has(domain)) continue;

      try {
        const isAvailable = await checkDomain(domain);

        if (isAvailable) {
          attempting.add(domain);
          stats.attempts++;
          console.write(`\rAttempting: ${domain}`);

          let success = await createDomain(domain, registrarId);

          if (success) {
            createdDomains.push(domain);

            stats.success++;
            domains.delete(domain);
          } else {
            console.write(`\r× Failed: ${domain}        \n`);
          }

          attempting.delete(domain);
        }
      } catch (error) {
        stats.errors++;
        attempting.delete(domain);
        console.write(`\r! Error: ${domain}            \n`);
      }
    }

    stats.domains = domains.size;
    createdDomains.forEach((domain) => console.write(`\r✓ Registered: ${domain}    \n`))
  }, 100);

}

async function start(registrarId: string, password: string) {
  try {
    console.log(`Starting drop catcher with registrar ID: ${registrarId}`);

    const expiringDomains = await fetch(API_URL).then((res) => res.json());
    domains = new Set(expiringDomains);
    console.log(`Monitoring ${domains.size} domains`);

    await createEPPSession(registrarId, password);
    await monitorDomains(registrarId);
  } catch (error) {
    console.error("Error starting drop catcher:", error);
  }
}

start(registrarId, password);
