#!/usr/bin/env bash
# End-to-end smoke test against the running API (localhost:3010).
set -uo pipefail
API="http://127.0.0.1:3010/api/v1"
PASS=0; FAIL=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }

echo "== 1. Owner login =="
OWNER=$(curl -sS -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d '{"login":"+998901112233","password":"owner123"}')
OTOKEN=$(echo "$OWNER" | jq -r '.data.accessToken // empty')
[ -n "$OTOKEN" ] && ok "owner token olindi" || { bad "owner login: $OWNER"; exit 1; }

echo "== 2. Branches =="
BRANCH=$(curl -sS "$API/branches" -H "Authorization: Bearer $OTOKEN" | jq -r '.data[0].id')
[ -n "$BRANCH" ] && ok "branch: $BRANCH" || bad "branches"

echo "== 3. Products (owner, x-branch-id) =="
PCOUNT=$(curl -sS "$API/products" -H "Authorization: Bearer $OTOKEN" -H "x-branch-id: $BRANCH" | jq '.data | length')
[ "$PCOUNT" -ge 1 ] && ok "mahsulotlar: $PCOUNT ta" || bad "products"
PID=$(curl -sS "$API/products" -H "Authorization: Bearer $OTOKEN" -H "x-branch-id: $BRANCH" | jq -r '.data[0].id')
QTY0=$(curl -sS "$API/products" -H "Authorization: Bearer $OTOKEN" -H "x-branch-id: $BRANCH" | jq -r '.data[0].stocks[0].quantity')
echo "    product=$PID boshlang'ich qoldiq=$QTY0"

echo "== 4. Cashier login (password) =="
CASH=$(curl -sS -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d '{"login":"+998901112255","password":"kassir123"}')
CTOKEN=$(echo "$CASH" | jq -r '.data.accessToken // empty')
CBRANCH=$(echo "$CASH" | jq -r '.data.user.branchId')
[ -n "$CTOKEN" ] && ok "kassir token, branch=$CBRANCH" || bad "kassir login: $CASH"

echo "== 5. Open shift =="
SH=$(curl -sS -X POST "$API/shifts/open" -H "Authorization: Bearer $CTOKEN" -H "x-branch-id: $CBRANCH" \
  -H 'Content-Type: application/json' -d '{"openCash":0}')
echo "$SH" | jq -e '.data.status=="OPEN"' >/dev/null && ok "smena ochildi" || echo "    (smena allaqachon ochiq bo'lishi mumkin: $(echo $SH|jq -r '.error.code //empty'))"

echo "== 6. Sale (2x) — atomic =="
KEY=$(cat /proc/sys/kernel/random/uuid)
SALE=$(curl -sS -X POST "$API/sales" -H "Authorization: Bearer $CTOKEN" -H "x-branch-id: $CBRANCH" \
  -H 'Content-Type: application/json' \
  -d "{\"idempotencyKey\":\"$KEY\",\"type\":\"POS\",\"items\":[{\"productId\":\"$PID\",\"qty\":2}],\"payments\":[{\"provider\":\"CASH\",\"amount\":24000}]}")
SID=$(echo "$SALE" | jq -r '.data.id // empty')
[ -n "$SID" ] && ok "savdo yakunlandi: $SID" || bad "sale: $SALE"

echo "== 7. Stock decremented (2 kamaydi) =="
QTY1=$(curl -sS "$API/products" -H "Authorization: Bearer $CTOKEN" -H "x-branch-id: $CBRANCH" | jq -r ".data[] | select(.id==\"$PID\") | .stocks[0].quantity")
echo "    qoldiq: $QTY0 -> $QTY1"
[ "$(printf '%.0f' "$QTY0")" -eq "$(( $(printf '%.0f' "$QTY1") + 2 ))" ] && ok "qoldiq to'g'ri kamaydi" || bad "qoldiq: $QTY0 -> $QTY1"

echo "== 8. Idempotency (bir xil key) =="
SALE2=$(curl -sS -X POST "$API/sales" -H "Authorization: Bearer $CTOKEN" -H "x-branch-id: $CBRANCH" \
  -H 'Content-Type: application/json' \
  -d "{\"idempotencyKey\":\"$KEY\",\"type\":\"POS\",\"items\":[{\"productId\":\"$PID\",\"qty\":2}],\"payments\":[{\"provider\":\"CASH\",\"amount\":24000}]}")
SID2=$(echo "$SALE2" | jq -r '.data.id // empty')
[ "$SID" = "$SID2" ] && ok "bir xil savdo qaytdi (takror yo'q)" || bad "idempotency: $SID vs $SID2"
QTY2=$(curl -sS "$API/products" -H "Authorization: Bearer $CTOKEN" -H "x-branch-id: $CBRANCH" | jq -r ".data[] | select(.id==\"$PID\") | .stocks[0].quantity")
[ "$QTY1" = "$QTY2" ] && ok "qoldiq o'zgarmadi (idempotent)" || bad "idempotent qoldiq: $QTY1 vs $QTY2"

echo "== 9. Insufficient stock -> E4101 =="
KEY2=$(cat /proc/sys/kernel/random/uuid)
ERR=$(curl -sS -X POST "$API/sales" -H "Authorization: Bearer $CTOKEN" -H "x-branch-id: $CBRANCH" \
  -H 'Content-Type: application/json' \
  -d "{\"idempotencyKey\":\"$KEY2\",\"type\":\"POS\",\"items\":[{\"productId\":\"$PID\",\"qty\":999999}],\"payments\":[{\"provider\":\"CASH\",\"amount\":1}]}")
[ "$(echo "$ERR" | jq -r '.error.code')" = "E4101" ] && ok "qoldiq yetmasa E4101" || bad "stock guard: $ERR"

echo "== 10. Dashboard (owner) =="
DASH=$(curl -sS "$API/reports/dashboard" -H "Authorization: Bearer $OTOKEN" -H "x-branch-id: $BRANCH")
echo "    bugungi savdo: $(echo "$DASH" | jq -r '.todaySalesTotal // .data.todaySalesTotal') | cheklar: $(echo "$DASH" | jq -r '.todaySalesCount // .data.todaySalesCount')"
echo "$DASH" | jq -e '(.data.todaySalesCount // .todaySalesCount) >= 1' >/dev/null && ok "dashboard KPI" || bad "dashboard: $DASH"

echo "== 11. RBAC: cashier dashboard -> 403 (E1002) =="
RB=$(curl -sS "$API/reports/dashboard" -H "Authorization: Bearer $CTOKEN" -H "x-branch-id: $CBRANCH")
[ "$(echo "$RB" | jq -r '.error.code')" = "E1002" ] && ok "kassir dashboardni ko'rolmaydi (RBAC)" || bad "RBAC: $RB"

echo ""
echo "NATIJA: $PASS ✅  /  $FAIL ❌"
[ "$FAIL" -eq 0 ]
