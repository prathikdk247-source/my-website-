# Auth Testing Playbook (AgroConnect)

## Seeded credentials
- Farmer (admin): ravi@agroconnect.in / Farm@123

## Endpoints
- POST /api/auth/register   { name, phone, email, password, role(optional: farmer|buyer) }
- POST /api/auth/login      { email, password }
- POST /api/auth/logout
- GET  /api/auth/me
- POST /api/auth/refresh

## Quick test
```
API=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d= -f2)
curl -s -c /tmp/c.txt -X POST "$API/api/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"ravi@agroconnect.in","password":"Farm@123"}'
curl -s -b /tmp/c.txt "$API/api/auth/me"
```
