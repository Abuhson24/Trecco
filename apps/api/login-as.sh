#!/bin/bash
RESPONSE=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$1\",\"password\":\"$2\"}")

TOKEN=$(echo "$RESPONSE" | grep -o '"accessToken":"[^"]*' | sed 's/"accessToken":"//')

if [ -z "$TOKEN" ]; then
  echo "Login failed. Full response:"
  echo "$RESPONSE"
else
  export TOKEN
  echo "Logged in as $1. Token saved to \$TOKEN"
fi
