# Fursan League | دوري الفرسان

Tournament manager (teams, players, matches, standings) with a small zero-dependency Node.js backend.
موقع لإدارة بطولة: فرق، لاعبين، مباريات وترتيب، مع باك اند بسيط بدون أي مكتبات.

## Features
- Data saved on the server (`data/db.json`) with automatic backups (`data/backups`, last 30)
- Admin login checked on the server (token session, rate-limited login)
- Viewers auto-refresh every 15 seconds
- Falls back to local mode (browser storage) if the server is down

## Run
Requires Node.js 16+. No `npm install` needed.

```bash
# Windows CMD
set "ADMIN_PASS=YourStrongPassword"
node server.js

# macOS / Linux
ADMIN_PASS=YourStrongPassword node server.js
```

Open http://localhost:3737 — if `ADMIN_PASS` is not set, a random password is printed in the console.

| Variable | Default | Description |
|---|---|---|
| `ADMIN_PASS` | random | Admin password |
| `PORT` | `3737` | Server port |

## API
| Method | Path | Auth | |
|---|---|---|---|
| GET | `/api/db` | no | read data |
| PUT | `/api/db` | admin | save data |
| POST | `/api/login` | no | `{password}` → `{token}` |
| POST | `/api/logout` | admin | end session |

## Notes
- Sessions live in memory and reset when the server restarts.
- Put it behind HTTPS (e.g. a reverse proxy) before exposing it to the internet.
- Data lives in a JSON file, which suits small tournaments, not heavy traffic.

## License
MIT
