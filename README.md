# epp-server

To install dependencies:

```bash
bun install
```

To run:
```bash
bun run src/index.ts
```

Test it with:
```bash
# EPP (port 700)
nc localhost 700
# WHOIS (port 43)
whois -h localhost example.com
# API (port 3000)
curl http://localhost:3000/health
```
