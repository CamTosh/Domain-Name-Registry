# TSH Registry - EPP & WHOIS Server

A modern domain registry system implementing EPP (Extensible Provisioning Protocol) and WHOIS services for the .tsh TLD, built with Bun and 0 dependencies.

## Features

- EPP Server (Port 700) for domain registration and management
- WHOIS Server (Port 43) for domain information lookup
- HTTP API (Port 3000) for monitoring and metrics
- Built-in rate limiting
- Session management
- SQLite database for persistence

## Prerequisites

- [Bun](https://bun.sh) runtime
- WHOIS client (usually pre-installed on Unix systems)

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/tsh-registry.git
cd tsh-registry
```

2. Install dependencies:
```bash
bun install
```

3. Seed the database with initial data:
```bash
bun run seed
```

4. Start the server:
```bash
bun run start
```

## Usage Control System

The registry implements a sophisticated usage control system to manage registrar activity and prevent abuse.

### Request Limits

Each registrar is subject to the following limits:
- 1000 requests per hour
- 100 requests per minute

### Penalty System

The system implements a graduated penalty mechanism:

1. **Soft Limits**
   - First violations only result in request rejection
   - Counters reset automatically:
     - Minute counters: Every 60 seconds
     - Hour counters: Every 60 minutes

2. **Hard Penalties**
   After 3 limit violations within an hour:
   - Request Processing Delay: 2 second delay added
   - Token Consumption: 5 tokens deducted from registrar's credit

## Using WHOIS

The WHOIS service runs on port 43 and supports several query types:

### Domain Lookup
```bash
whois -h localhost domain.tsh
```

Example:
```bash
whois -h localhost nic.tsh
```

### Registrar Lookup
```bash
whois -h localhost "registrar test1"
```

### Help
```bash
whois -h localhost help
```

## Using the EPP Server

The EPP server runs on port 700 and supports standard EPP commands. Here are some example XML commands:

### Login
```xml
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<epp xmlns="urn:ietf:params:xml:ns:epp-1.0">
  <command>
    <login>
      <clID>test1</clID>
      <pw>test1</pw>
    </login>
  </command>
</epp>
```

### Check Domain
```xml
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<epp xmlns="urn:ietf:params:xml:ns:epp-1.0">
  <command>
    <check>
      <domain:name>example.tsh</domain:name>
    </check>
    <clTRID>ABC-12345</clTRID>
  </command>
</epp>
```

### Create Domain
```xml
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<epp xmlns="urn:ietf:params:xml:ns:epp-1.0">
  <command>
    <create>
      <domain:name>mynewdomain.tsh</domain:name>
      <clID>test1</clID>
    </create>
    <clTRID>ABC-12345</clTRID>
  </command>
</epp>
```

## Test Accounts

The system comes with two test registrar accounts:

- ID: `test1`, Password: `test1`
- ID: `test2`, Password: `test2`

Each test account comes with 1000 initial credits.

## Reserved Domains

The following domains are reserved for registry operations:

- `nic.tsh` - Registry information
- `whois.tsh` - WHOIS service
- `rdds.tsh` - Registration Data Directory Services
- `epp.tsh` - EPP service

## API Endpoints

The HTTP API runs on port 3000 and provides the following endpoints:

- `GET /health` - Service health check
- `GET /metrics` - System metrics (sessions, rate limits)

## Development

### Project Structure

## Project Structure

```
epp-server/
├── src/
│   ├── handlers/           # Request handlers
│   │   ├── epp.ts         # EPP protocol handler
│   │   ├── greeting.ts    # EPP greeting handler
│   │   └── whois.ts       # WHOIS protocol handler
│   │
│   ├── logic/             # Business logic
│   ├── utils/             # Utility functions
│   ├── scripts/           # Scripts
│   │   └── seed.ts        # Database seeding
│   │
│   ├── database.ts        # Database operations
│   ├── types.ts           # TypeScript type definitions
│   └── index.ts           # Application entry point
│
├── package.json
├── tsconfig.json
└── README.md
```

### Running Tests

```bash
bun test
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
