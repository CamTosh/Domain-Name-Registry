# TSH Registry - EPP & WHOIS Server

A modern domain registry system implementing EPP (Extensible Provisioning Protocol) and WHOIS services for the .tsh TLD, built with Bun and 0 dependencies.

Hosted instance:
- `whois.nic.bullshit.video` (Example: `whois -h whois.nic.bullshit.video nic.tsh`)
- `epp.nic.bullshit.video`

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

## Domain Expiry System

The registry implements an automated domain expiry system that releases expired domains in a random order during a 42-minute window each day.

### How it Works

1. At 15:00 each day, the system identifies domains expiring that day
2. These domains are released randomly over a 42-minute period (15:00 - 15:42)
3. When a domain is released, its status changes from 'active' to 'inactive'
4. Released domains become available for registration

### Cron Setup

1. Edit your crontab:
```bash
crontab -e
```

2. Add this line to run the expiry process at 15:00 daily:
```bash
0 15 * * * cd /path/to/registry && bun run expire >> /var/log/registry/expiry.log 2>&1
```

The cron expression explained:
```
┌───────────── minute (0)
│ ┌───────────── hour (15)
│ │ ┌───────────── day of month (*)
│ │ │ ┌───────────── month (*)
│ │ │ │ ┌───────────── day of week (*)
│ │ │ │ │
0 15 * * *
```

### Prerequisites

1. Create log directory:
```bash
sudo mkdir -p /var/log/registry
sudo chown $USER:$USER /var/log/registry
```

2. Test the cron job:
```bash
bun run expire
tail -f /var/log/registry/expiry.log
```

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
- `GET /leaderboard` - Registrar leaderboard
- `GET /today-expiration` - List all the domains who will expire today
- `POST /registrar/create` - Registrar creation


### Creating a new registrar:

> Be careful, the passowrd is saved in clear.

```bash
curl -X POST http://localhost:3000/registrar/create \
  -H "Content-Type: application/json" \
  -d '{
    "id": "myregistrar",
    "password": "mypassword123"
  }'

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
│   ├── routes/            # API routes
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
