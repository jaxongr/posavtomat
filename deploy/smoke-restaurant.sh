#!/usr/bin/env bash
# Restaurant dine-in flow smoke test (localhost:3010).
set -uo pipefail
API="http://127.0.0.1:3010/api/v1"
PASS=0; FAIL=0
ok() { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }

echo "== Waiter login =="
W=$(curl -sS -X POST "$API/auth/login" -H 'Content-Type: application/json' -d '{"login":"+998901113355","password":"ofitsiant123"}')
T=$(echo "$W" | jq -r '.data.accessToken // empty'); B=$(echo "$W" | jq -r '.data.user.branchId')
[ -n "$T" ] && ok "ofitsiant token, branch=$B" || { bad "waiter login: $W"; exit 1; }
H=(-H "Authorization: Bearer $T" -H "x-branch-id: $B")

echo "== Tables =="
TABLE=$(curl -sS "${H[@]}" "$API/tables" | jq -r '.data[0].id')
TCOUNT=$(curl -sS "${H[@]}" "$API/tables" | jq '.data | length')
[ "$TCOUNT" -ge 1 ] && ok "stollar: $TCOUNT, birinchi=$TABLE" || bad "tables"

echo "== Dish & ingredient stock before =="
DISH=$(curl -sS "${H[@]}" "$API/products?limit=100" | jq -r '.data[] | select(.type=="DISH") | .id' | head -1)
PRICE=$(curl -sS "${H[@]}" "$API/products?limit=100" | jq -r '.data[] | select(.type=="DISH") | .price' | head -1)
ING0=$(curl -sS "${H[@]}" "$API/inventory/stock?limit=100" | jq -r '.data[] | select(.product.unit=="KG") | .quantity' | head -1)
echo "    dish=$DISH narx=$PRICE ingredient_qoldiq=$ING0"
[ -n "$DISH" ] && ok "taom topildi" || bad "dish yo'q"

echo "== Open shift =="
curl -sS -X POST "${H[@]}" -H 'Content-Type: application/json' "$API/shifts/open" -d '{"openCash":0}' >/dev/null 2>&1

echo "== Dine-in sale (2 porsiya) =="
KEY=$(cat /proc/sys/kernel/random/uuid)
AMT=$(awk "BEGIN{printf \"%.0f\", $PRICE*2}")
S=$(curl -sS -X POST "${H[@]}" -H 'Content-Type: application/json' "$API/sales" \
  -d "{\"idempotencyKey\":\"$KEY\",\"type\":\"DINE_IN\",\"tableId\":\"$TABLE\",\"items\":[{\"productId\":\"$DISH\",\"qty\":2}],\"payments\":[{\"provider\":\"CASH\",\"amount\":$AMT}]}")
SID=$(echo "$S" | jq -r '.data.id // empty')
[ -n "$SID" ] && ok "dine-in savdo: $SID" || bad "dine-in: $S"

echo "== Recipe depletion (ingredient 0.6 kamaydi) =="
ING1=$(curl -sS "${H[@]}" "$API/inventory/stock?limit=100" | jq -r '.data[] | select(.product.unit=="KG") | .quantity' | head -1)
echo "    ingredient: $ING0 -> $ING1"
awk "BEGIN{exit !($ING0 - $ING1 > 0.5 && $ING0 - $ING1 < 0.7)}" && ok "ingredient ~0.6 kamaydi (texkarta)" || bad "depletion: $ING0->$ING1"

echo "== Table occupied =="
TS=$(curl -sS "${H[@]}" "$API/tables" | jq -r ".data[] | select(.id==\"$TABLE\") | .status")
[ "$TS" = "OCCUPIED" ] && ok "stol band bo'ldi" || bad "table status: $TS"

echo "== KOT created (KDS) =="
KOT=$(curl -sS "${H[@]}" "$API/kitchen/kots" | jq -r ".data[] | select(.sale.id==\"$SID\") | .id")
[ -n "$KOT" ] && ok "KOT oshxonada: $KOT" || bad "kot yo'q"

echo "== KDS advance NEW->COOKING->READY->SERVED =="
for st in COOKING READY SERVED; do
  R=$(curl -sS -X PATCH "${H[@]}" -H 'Content-Type: application/json' "$API/kitchen/kots/$KOT/status" -d "{\"status\":\"$st\"}")
  [ "$(echo "$R" | jq -r '.data.status')" = "$st" ] && ok "holat: $st" || bad "status $st: $R"
done

echo "== Cook login + KDS access =="
CK=$(curl -sS -X POST "$API/auth/login" -H 'Content-Type: application/json' -d '{"login":"+998901113366","password":"oshpaz123"}')
CKT=$(echo "$CK" | jq -r '.data.accessToken // empty')
[ -n "$CKT" ] && ok "oshpaz kira oldi" || bad "cook login"

echo ""
echo "NATIJA: $PASS ✅  /  $FAIL ❌"
[ "$FAIL" -eq 0 ]
