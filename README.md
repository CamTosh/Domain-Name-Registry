
# Domain Drop Catching Game - .TSH Registry

A hobby project implementing a domain registry system for practicing drop catching techniques. Built with Bun and zero dependencies.

Live instance: https://nic.bullshit.video

## Overview

Drop catching is the practice of registering domain names the moment they expire. This project provides a playground for developing and testing drop catching algorithms with:

- Random domain releases during a 42-minute window
- Score-based domain values (1-100)
- Rate limiting with progressive penalties
- Real-time competition between registrars

## Features

- EPP Server (Port 700) for domain registration
- WHOIS Server (Port 43) for domain information
- Built-in rate limiting with penalties
- Domain value scoring system (1-100)
- Automatic domain expiry and replenishment

## System Components

### Domain Expiry (Cron)
- Runs daily at 15:00 (France/Paris)
- 42-minute release window
- Random release timing for each domain
- Minimum 42 domains per session

### Rate Limiting
- 5000 requests/hour
- 500 requests/minute (~8 requests/second)
- Penalties after 5 violations:
  - 1-second delay added to requests
  - 2 tokens deducted from balance

### Domain Scoring
- Rare (90-100): 5% chance
- Valuable (70-89): 15% chance
- Average (30-69): 60% chance
- Low (1-29): 20% chance

## Usage Examples

### WHOIS Queries
```bash
# Domain lookup
whois -h whois.nic.bullshit.video example.tsh

# Registrar lookup
whois -h whois.nic.bullshit.video "registrar test1"

# Help
whois -h whois.nic.bullshit.video help
```

### EPP Commands
```xml
<!-- Login -->
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<epp xmlns="urn:ietf:params:xml:ns:epp-1.0">
  <command>
    <login>
      <clID>test1</clID>
      <pw>test1</pw>
    </login>
  </command>
</epp>

<!-- Check Domain -->
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<epp xmlns="urn:ietf:params:xml:ns:epp-1.0">
  <command>
    <check>
      <domain:name>example.tsh</domain:name>
    </check>
    <clTRID>ABC-12345</clTRID>
  </command>
</epp>

<!-- Create Domain -->
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<epp xmlns="urn:ietf:params:xml:ns:epp-1.0">
  <command>
    <create>
      <domain:name>example.tsh</domain:name>
      <clID>test1</clID>
    </create>
    <clTRID>ABC-12345</clTRID>
  </command>
</epp>
```

## Development Setup

1. Install [Bun](https://bun.sh)
2. Clone and install:
```bash
git clone https://github.com/CamTosh/Domain-Name-Registry
cd Domain-Name-Registry
```

3. Start the servers:
```bash
bun start
```

## Full Rules & Documentation

For complete game rules, scoring system, and API documentation, visit:
[https://nic.bullshit.video](https://nic.bullshit.video)

## Contributing

This is a hobby project aimed at creating interesting technical challenges around domain drop catching. Contributions and creative drop-catching solutions are welcome!
