# Deploy — SAVDO-POS

Bu stack **izolyatsiya qilingan**: alohida Docker project nomi (`savdo-pos`),
ichki (localhost) DB/Redis, nostandart portlar. Serverdagi boshqa loyihalarga
**tegmaydi**.

| Xizmat | Port (host) | Tashqi |
|--------|-------------|--------|
| Admin panel (+ API proxy) | `8090` | ✅ ochiq |
| Backend API | `127.0.0.1:3010` | faqat lokal |
| PostgreSQL | `127.0.0.1:55432` | faqat lokal |
| Redis | `127.0.0.1:56379` | faqat lokal |

## Serverda ishga tushirish

```bash
# 1. Kodni serverga olib kelish (variantlardan biri):
#    a) GitHub orqali (repo'da kod bo'lsa):  git clone https://github.com/jaxongr/posavtomat.git /opt/savdo-pos
#    b) Lokaldan:                            scp/rsync bilan /opt/savdo-pos ga

cd /opt/savdo-pos

# 2. Maxfiy kalitlar
cp deploy/.env.prod.example deploy/.env.prod
nano deploy/.env.prod        # parol/sirlarni to'ldiring

# 3. Deploy (build + migrate + seed)
bash deploy/deploy.sh
```

Talab: serverda **Docker + Docker Compose**. Boshqa hech narsa o'rnatish shart emas
(Node/pnpm image ichida).

## To'xtatish / yangilash

```bash
docker compose -p savdo-pos -f deploy/docker-compose.prod.yml down      # to'xtatish (ma'lumot saqlanadi)
git pull && bash deploy/deploy.sh                                       # yangilash
```

## Flutter POS ilovasi

Server API'siga ulash uchun build vaqtida:

```bash
flutter run --dart-define=API_BASE_URL=http://<SERVER_IP>:8090/api/v1
```

## Masofaviy kirish uchun kerak bo'lgan kredensiallar

- **GitHub push**: Personal Access Token (oddiy parol ishlamaydi).
- **Server SSH**: hozir parol auth o'chirilgan (faqat publickey). Avtomatik deploy
  uchun SSH private key yoki parol auth yoqilishi kerak.
