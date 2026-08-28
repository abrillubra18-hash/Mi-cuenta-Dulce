# Mi Cuenta Dulce

App de gestión para venta de alfajores y harinas sin gluten: clientes con
WhatsApp, ventas por forma de pago, gastos por categoría y balance general.

Next.js (App Router) + Supabase (Auth con Google + Postgres).

## Setup

1. Copiá `.env.local.example` a `.env.local` y completá la anon key de Supabase:

   ```bash
   cp .env.local.example .env.local
   ```

2. En Supabase, abrí **SQL Editor** y ejecutá [`supabase/schema.sql`](supabase/schema.sql)
   para crear las tablas (`clientes`, `ventas`, `gastos`) con RLS habilitado.

3. Configurá el proveedor de Google en Supabase (**Authentication > Providers > Google**)
   con las credenciales de Google Cloud (ver guía paso a paso en el chat).

4. Instalá dependencias y corré el servidor:

   ```bash
   npm install
   npm run dev
   ```

5. Abrí [http://localhost:3000](http://localhost:3000) — te va a redirigir a `/login`.

## Estructura

- `src/app/login` — login con Google (Supabase OAuth)
- `src/app/auth/callback` — intercambio de código OAuth por sesión
- `src/app/(app)/dashboard` — balance general (ventas, gastos, neto)
- `src/app/(app)/ventas` — alta y listado de ventas por producto/forma de pago
- `src/app/(app)/gastos` — alta y listado de gastos por categoría
- `src/app/(app)/clientes` — alta y listado de clientes con link directo a WhatsApp
- `src/lib/supabase` — clientes de Supabase (browser, server, middleware)
- `supabase/schema.sql` — esquema de base de datos y políticas de RLS
