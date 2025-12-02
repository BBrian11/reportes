#!/usr/bin/env bash
set -euo pipefail

BASE="https://cloudconnect.iotcloud.studio:4430"

read -p "Email: " EMAIL
read -s -p "Password: " PASS; echo

LOGIN_JSON="$(curl -sS \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -X POST "$BASE/api/auth/login" \
  --data "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")"

TOKEN="$(printf "%s" "$LOGIN_JSON" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')"
echo "TOKEN len=${#TOKEN}"
[ -z "$TOKEN" ] && echo "No token. Respuesta:" && echo "$LOGIN_JSON" && exit 1

api_get () {
  local path="$1"
  local code
  code=$(curl -sS -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Accept: application/json" \
    "$BASE$path")
  echo "$code $path"
}

echo "== Probing endpoints (GET) =="
for p in \
  /api/users/current \
  /api/users /api/user \
  /api/clients /api/client /api/customers /api/customer \
  /api/devices /api/device \
  /api/events /api/event /api/alarms /api/alarm \
  /api/sites /api/site /api/locations /api/location \
  /api/companies /api/company \
  /api/settings /api/config \
  /api/roles /api/permissions
do
  api_get "$p"
done
