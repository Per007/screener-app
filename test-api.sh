#!/bin/bash
BASE_URL="http://localhost:3000"

echo "=== 1. Login ==="
TOKEN=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "Got token: ${TOKEN:0:20}..."

echo -e "\n=== 2. Get Parameters ==="
curl -s $BASE_URL/parameters -H "Authorization: Bearer $TOKEN" | python -m json.tool 2>/dev/null || cat

echo -e "\n=== 3. Get Companies ==="
curl -s $BASE_URL/companies -H "Authorization: Bearer $TOKEN" | python -m json.tool 2>/dev/null || cat

echo -e "\n=== 4. Get Clients ==="
curl -s $BASE_URL/clients -H "Authorization: Bearer $TOKEN" | python -m json.tool 2>/dev/null || cat

echo -e "\n=== 5. Get Criteria Sets ==="
curl -s $BASE_URL/criteria-sets -H "Authorization: Bearer $TOKEN" | python -m json.tool 2>/dev/null || cat

echo -e "\n=== 6. Get Screening History ==="
curl -s $BASE_URL/screening-results -H "Authorization: Bearer $TOKEN" | python -m json.tool 2>/dev/null || cat

echo -e "\n=== Done ==="
