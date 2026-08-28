-- Esquema para Mi Cuenta Dulce
-- Ejecutar en Supabase: Project > SQL Editor > New query
-- Este archivo se puede volver a pegar y ejecutar sin problema
-- (todos los pasos están armados para no fallar si ya existen).

create extension if not exists "pgcrypto";

-- Clientes
create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  nombre text not null,
  whatsapp text,
  notas text,
  created_at timestamptz not null default now()
);

-- Ventas
create table if not exists ventas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  cliente_id uuid references clientes(id) on delete set null,
  producto text not null check (producto in ('alfajores', 'harinas_sin_gluten', 'otro')),
  descripcion text,
  cantidad numeric not null default 1,
  monto numeric not null check (monto >= 0),
  forma_pago text not null check (forma_pago in ('efectivo', 'transferencia', 'tarjeta', 'otro')),
  fecha date not null default current_date,
  direccion_entrega text,
  costo_delivery numeric not null default 0 check (costo_delivery >= 0),
  lote_id uuid,
  created_at timestamptz not null default now()
);

alter table ventas add column if not exists direccion_entrega text;
alter table ventas add column if not exists costo_delivery numeric not null default 0;
alter table ventas add column if not exists lote_id uuid;
do $$ begin
  alter table ventas add constraint ventas_costo_delivery_check check (costo_delivery >= 0);
exception when duplicate_object then null;
end $$;

-- Gastos
create table if not exists gastos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  detalle text not null,
  categoria text,
  proveedor text,
  monto numeric not null check (monto >= 0),
  fecha_hora timestamptz not null default now(),
  estado_pago text not null default 'transferencia',
  fecha_pago date,
  tipo text not null default 'negocio',
  es_donacion boolean not null default false,
  nombre_lote text,
  created_at timestamptz not null default now()
);

-- Migración de instalaciones previas: gastos pasa de
-- (categoria obligatoria, descripcion, fecha) a
-- (detalle libre, categoria opcional, proveedor, fecha_hora, estado_pago, fecha_pago).
--
-- Todo el bloque es robusto ante cualquier estado de la tabla: antes de
-- usar una columna vieja (descripcion, categoria, fecha) verifica en
-- information_schema.columns si existe, y si no, la omite en vez de fallar.
do $$
declare
  has_descripcion boolean;
  has_categoria boolean;
  has_fecha boolean;
  detalle_expr text;
begin
  -- Asegurar columnas nuevas (seguro aunque ya existan)
  alter table gastos add column if not exists detalle text;
  alter table gastos add column if not exists categoria text;
  alter table gastos add column if not exists proveedor text;
  alter table gastos add column if not exists fecha_hora timestamptz;
  alter table gastos add column if not exists estado_pago text;
  alter table gastos add column if not exists fecha_pago date;
  alter table gastos add column if not exists tipo text;
  alter table gastos add column if not exists es_donacion boolean;
  alter table gastos add column if not exists nombre_lote text;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'gastos' and column_name = 'descripcion'
  ) into has_descripcion;
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'gastos' and column_name = 'categoria'
  ) into has_categoria;
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'gastos' and column_name = 'fecha'
  ) into has_fecha;

  -- Backfill de detalle usando solo las columnas viejas que existan
  detalle_expr := 'detalle';
  if has_descripcion then detalle_expr := detalle_expr || ', descripcion'; end if;
  if has_categoria then detalle_expr := detalle_expr || ', categoria'; end if;
  execute format(
    'update gastos set detalle = coalesce(%s, ''Gasto'') where detalle is null',
    detalle_expr
  );
  alter table gastos alter column detalle set not null;

  -- Normalizar categoria (opcional) solo si la columna existe
  if has_categoria then
    execute 'alter table gastos alter column categoria drop not null';
    execute $q$update gastos set categoria = 'otro'
      where categoria is not null
        and categoria not in ('insumos', 'servicios', 'transporte', 'otro')$q$;
  end if;

  -- Backfill de fecha_hora desde fecha vieja si existe, si no desde now()
  if has_fecha then
    execute 'update gastos set fecha_hora = coalesce(fecha_hora, fecha::timestamptz, now()) where fecha_hora is null';
  else
    execute 'update gastos set fecha_hora = coalesce(fecha_hora, now()) where fecha_hora is null';
  end if;
  alter table gastos alter column fecha_hora set not null;
  alter table gastos alter column fecha_hora set default now();

  update gastos set estado_pago = coalesce(estado_pago, 'transferencia') where estado_pago is null;
  alter table gastos alter column estado_pago set not null;
  alter table gastos alter column estado_pago set default 'transferencia';

  update gastos set tipo = coalesce(tipo, 'negocio') where tipo is null;
  alter table gastos alter column tipo set not null;
  alter table gastos alter column tipo set default 'negocio';

  update gastos set es_donacion = coalesce(es_donacion, false) where es_donacion is null;
  alter table gastos alter column es_donacion set not null;
  alter table gastos alter column es_donacion set default false;

  -- Quitar columnas viejas si todavía existen
  alter table gastos drop column if exists descripcion;
  alter table gastos drop column if exists fecha;
end $$;

do $$ begin
  alter table gastos add constraint gastos_categoria_check
    check (categoria in ('insumos', 'servicios', 'transporte', 'otro'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table gastos add constraint gastos_estado_pago_check
    check (estado_pago in ('transferencia', 'pendiente'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table gastos add constraint gastos_tipo_check
    check (tipo in ('negocio', 'personal'));
exception when duplicate_object then null;
end $$;

-- FK de ventas.lote_id -> gastos(id): se agrega acá, ya creada la tabla gastos.
do $$ begin
  alter table ventas add constraint ventas_lote_id_fkey
    foreign key (lote_id) references gastos(id) on delete set null;
exception when duplicate_object then null;
end $$;

drop index if exists gastos_fecha_idx;
create index if not exists gastos_fecha_hora_idx on gastos (fecha_hora);
create index if not exists gastos_fecha_pago_idx on gastos (fecha_pago) where estado_pago = 'pendiente';
create index if not exists gastos_nombre_lote_idx on gastos (nombre_lote) where nombre_lote is not null;
create index if not exists ventas_fecha_idx on ventas (fecha);
create index if not exists ventas_cliente_idx on ventas (cliente_id);
create index if not exists ventas_lote_id_idx on ventas (lote_id);

-- Row Level Security: los datos son compartidos entre todo el equipo
-- (Alaia, Abril, etc). Cualquier usuario autenticado con Google puede
-- leer y escribir todas las filas. La columna user_id se mantiene como
-- "vendedor/registrado por" para el reporte del día, pero no restringe
-- la visibilidad.
alter table clientes enable row level security;
alter table ventas enable row level security;
alter table gastos enable row level security;

drop policy if exists "clientes_select_own" on clientes;
drop policy if exists "clientes_insert_own" on clientes;
drop policy if exists "clientes_update_own" on clientes;
drop policy if exists "clientes_delete_own" on clientes;
drop policy if exists "clientes_select_team" on clientes;
drop policy if exists "clientes_insert_team" on clientes;
drop policy if exists "clientes_update_team" on clientes;
drop policy if exists "clientes_delete_team" on clientes;

create policy "clientes_select_team" on clientes for select to authenticated using (true);
create policy "clientes_insert_team" on clientes for insert to authenticated with check (true);
create policy "clientes_update_team" on clientes for update to authenticated using (true);
create policy "clientes_delete_team" on clientes for delete to authenticated using (true);

drop policy if exists "ventas_select_own" on ventas;
drop policy if exists "ventas_insert_own" on ventas;
drop policy if exists "ventas_update_own" on ventas;
drop policy if exists "ventas_delete_own" on ventas;
drop policy if exists "ventas_select_team" on ventas;
drop policy if exists "ventas_insert_team" on ventas;
drop policy if exists "ventas_update_team" on ventas;
drop policy if exists "ventas_delete_team" on ventas;

create policy "ventas_select_team" on ventas for select to authenticated using (true);
create policy "ventas_insert_team" on ventas for insert to authenticated with check (true);
create policy "ventas_update_team" on ventas for update to authenticated using (true);
create policy "ventas_delete_team" on ventas for delete to authenticated using (true);

drop policy if exists "gastos_select_own" on gastos;
drop policy if exists "gastos_insert_own" on gastos;
drop policy if exists "gastos_update_own" on gastos;
drop policy if exists "gastos_delete_own" on gastos;
drop policy if exists "gastos_select_team" on gastos;
drop policy if exists "gastos_insert_team" on gastos;
drop policy if exists "gastos_update_team" on gastos;
drop policy if exists "gastos_delete_team" on gastos;

create policy "gastos_select_team" on gastos for select to authenticated using (true);
create policy "gastos_insert_team" on gastos for insert to authenticated with check (true);
create policy "gastos_update_team" on gastos for update to authenticated using (true);
create policy "gastos_delete_team" on gastos for delete to authenticated using (true);
