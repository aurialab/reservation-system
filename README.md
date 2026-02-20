# Reservation System Backend

API backend per a la gestió de reserves del Reservation System.

## Stack tecnològic

- **Runtime**: Node.js (TypeScript)
- **Framework HTTP**: Express
- **Contracte API**: OpenAPI (`openapi/openapi.json`) amb `openapi-backend`
- **Base de dades**: PostgreSQL
- **ORM**: Prisma
- **Autenticació**: JWT (capçalera personalitzada `token`)
- **Correu electrònic**: Nodemailer (SMTP)
- **Logging**: Winston
- **Tests**: Vitest + Supertest + MSW

## Estructura principal

- `src/handlers`: capa HTTP
- `src/services`: lògica de negoci
- `src/repositories`: accés a dades (Prisma)
- `src/openapi`: càrrega i normalització de l’especificació
- `prisma`: esquema i migracions
- `tests`: proves unitàries i d’integració (aïllades)

## Requisits previs

- Node.js 20+ (recomanat)
- npm
- Docker i Docker Compose (per a PostgreSQL + Adminer)

## Configuració

1. Copia les variables d’entorn:

```bash
cp .env.example .env
```

2. Revisa com a mínim:

- `DATABASE_URL`
- `JWT_SECRET`
- `LOG_LEVEL`
- `LOG_FILE_PATH` (ruta absoluta recomanada en producció)
- `SMTP_*` (si vols enviament de correus)

Si `LOG_FILE_PATH` no s’informa, per defecte s’escriu a `backend.log` a l’arrel del backend.

## Execució en local

1. Instal·lar dependències:

```bash
npm install
```

2. Arrencar PostgreSQL i Adminer:

```bash
docker compose up -d
```

3. Aplicar migracions Prisma:

```bash
npx prisma migrate dev
```

4. Arrencar el backend en mode desenvolupament:

```bash
npm run dev
```

L’API queda disponible a `http://localhost:3000`.

## Serveis Docker inclosos

El fitxer `docker-compose.yml` aixeca:

- **PostgreSQL**
  - Host: `localhost`
  - Port: `5432`
  - BD: `reservation_system`
  - Usuari/contrasenya: `postgres` / `postgres`
- **Adminer (UI web)**
  - URL: `http://localhost:8080`

## Scripts útils

- `npm run dev`: backend en desenvolupament (watch)
- `npm run build`: compila TypeScript a `dist/`
- `npm start`: executa el build compilat
- `npm test`: executa la suite de proves
- `npm run prisma:generate`: genera el client Prisma
- `npm run prisma:migrate`: crea/aplica migracions en entorn dev
- `npm run prisma:studio`: UI local de Prisma

## Desplegament (producció)

Flux recomanat:

1. Arrencar serveis de suport (PostgreSQL i Adminer) amb Docker Compose:

```bash
docker compose up -d
```

3. Configurar variables d'entorn de producció (`DATABASE_URL`, `JWT_SECRET`, `LOG_LEVEL`, `LOG_FILE_PATH`, `SMTP_*`, `PORT`).

3. Instal·lar dependències:

```bash
npm ci
```

4. Aplicar migracions en mode deploy:

```bash
npx prisma migrate deploy
```

5. Compilar i arrencar:

```bash
npm run build
npm start
```

Per aturar els contenidors quan no calguin:

```bash
docker compose down
```

## Documentació API

- Swagger UI: `http://localhost:3000/docs`
- OpenAPI raw: `http://localhost:3000/openapi.json`

## Notes de testing

- Les proves estan pensades per ser aïllades (sense tocar BD real ni APIs externes).
- En proves d’integració d’HTTP extern s’utilitza MSW.
