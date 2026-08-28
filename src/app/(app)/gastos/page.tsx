"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Gasto, CategoriaGasto, EstadoPagoGasto } from "@/lib/types";
import { CATEGORIAS_GASTO, ESTADOS_PAGO_GASTO } from "@/lib/types";

function formatMoney(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

function formatFechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function nowForInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function GastosPage() {
  const supabase = createClient();
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Formulario de gasto de negocio
  const [detalle, setDetalle] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [categoria, setCategoria] = useState<CategoriaGasto | "">("");
  const [monto, setMonto] = useState("");
  const [fechaHora, setFechaHora] = useState(nowForInput);
  const [estadoPago, setEstadoPago] = useState<EstadoPagoGasto>("transferencia");
  const [fechaPago, setFechaPago] = useState("");
  const [esDonacion, setEsDonacion] = useState(false);
  const [nombreLote, setNombreLote] = useState("");

  // Formulario rápido de gasto personal
  const [pDetalle, setPDetalle] = useState("");
  const [pMonto, setPMonto] = useState("");
  const [savingP, setSavingP] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("gastos")
      .select("*")
      .order("fecha_hora", { ascending: false })
      .returns<Gasto[]>();
    setGastos(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!detalle.trim() || !monto || Number(monto) < 0) return;
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("gastos").insert({
      user_id: user?.id,
      detalle: detalle.trim(),
      proveedor: proveedor.trim() || null,
      categoria: categoria || null,
      monto: Number(monto),
      fecha_hora: new Date(fechaHora).toISOString(),
      estado_pago: esDonacion ? "transferencia" : estadoPago,
      fecha_pago:
        !esDonacion && estadoPago === "pendiente" ? fechaPago || null : null,
      tipo: "negocio",
      es_donacion: esDonacion,
      nombre_lote: nombreLote.trim() || null,
    });
    setDetalle("");
    setProveedor("");
    setCategoria("");
    setMonto("");
    setFechaHora(nowForInput());
    setEstadoPago("transferencia");
    setFechaPago("");
    setEsDonacion(false);
    setNombreLote("");
    setSaving(false);
    load();
  }

  async function handleSubmitPersonal(e: React.FormEvent) {
    e.preventDefault();
    if (!pDetalle.trim() || !pMonto || Number(pMonto) < 0) return;
    setSavingP(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("gastos").insert({
      user_id: user?.id,
      detalle: pDetalle.trim(),
      proveedor: null,
      categoria: null,
      monto: Number(pMonto),
      fecha_hora: new Date().toISOString(),
      estado_pago: "transferencia",
      fecha_pago: null,
      tipo: "personal",
      es_donacion: false,
    });
    setPDetalle("");
    setPMonto("");
    setSavingP(false);
    load();
  }

  async function handleDelete(id: string) {
    await supabase.from("gastos").delete().eq("id", id);
    load();
  }

  async function marcarPagado(id: string) {
    await supabase
      .from("gastos")
      .update({ estado_pago: "transferencia", fecha_pago: null })
      .eq("id", id);
    load();
  }

  // Total = gastos reales (excluye donaciones/regalos)
  const totalReal = gastos
    .filter((g) => !g.es_donacion)
    .reduce((sum, g) => sum + Number(g.monto), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Gastos</h1>
          <p className="text-sm text-gray-500">Ingredientes, proveedores y más</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Total (sin regalos)</p>
          <p className="font-semibold text-red-700">{formatMoney(totalReal)}</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 items-end"
      >
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Detalle</label>
          <input
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            required
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Ej: Gasolina 93, Proveedor: Harinas del Sur"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Proveedor</label>
          <input
            value={proveedor}
            onChange={(e) => setProveedor(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Opcional"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Categoría</label>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as CategoriaGasto | "")}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Sin categoría</option>
            {CATEGORIAS_GASTO.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Monto</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            required
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Fecha y hora</label>
          <input
            type="datetime-local"
            value={fechaHora}
            onChange={(e) => setFechaHora(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        {!esDonacion && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Forma de pago</label>
            <select
              value={estadoPago}
              onChange={(e) => setEstadoPago(e.target.value as EstadoPagoGasto)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              {ESTADOS_PAGO_GASTO.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>
        )}
        {!esDonacion && estadoPago === "pendiente" && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Fecha de pago
            </label>
            <input
              type="date"
              value={fechaPago}
              onChange={(e) => setFechaPago(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        )}
        <div className="col-span-2 sm:col-span-4">
          <label className="block text-xs text-gray-500 mb-1">
            Nombre del lote (opcional)
          </label>
          <input
            value={nombreLote}
            onChange={(e) => setNombreLote(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Ej: Harina tío - noviembre, Compra Juan - fiado"
          />
          <p className="text-xs text-gray-400 mt-1">
            Ponele nombre para poder vincular ventas y ver el rendimiento del lote.
          </p>
        </div>
        <label className="col-span-2 sm:col-span-4 flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={esDonacion}
            onChange={(e) => setEsDonacion(e.target.checked)}
            className="h-4 w-4"
          />
          Fue un regalo/donación, no un gasto pagado
        </label>
        <button
          type="submit"
          disabled={saving}
          className="col-span-2 sm:col-span-4 bg-amber-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Agregar gasto"}
        </button>
      </form>

      {/* Gastos libres (personales) — anotar rápido */}
      <div>
        <h2 className="font-medium text-gray-900 mb-1">Gastos libres (personales)</h2>
        <p className="text-sm text-gray-500 mb-3">
          Almuerzo, cosas chicas del día. Se guarda con fecha, hora y efectivo automáticos.
        </p>
        <form
          onSubmit={handleSubmitPersonal}
          className="bg-white rounded-xl border p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 items-end"
        >
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Detalle</label>
            <input
              value={pDetalle}
              onChange={(e) => setPDetalle(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Ej: Almuerzo"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Monto</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={pMonto}
              onChange={(e) => setPMonto(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="0.00"
            />
          </div>
          <button
            type="submit"
            disabled={savingP}
            className="bg-gray-800 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-900 disabled:opacity-50"
          >
            {savingP ? "Guardando..." : "Agregar personal"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border divide-y">
        {loading ? (
          <p className="p-4 text-sm text-gray-400">Cargando...</p>
        ) : gastos.length === 0 ? (
          <p className="p-4 text-sm text-gray-400">Todavía no hay gastos</p>
        ) : (
          gastos.map((g) => (
            <div key={g.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-gray-900 flex items-center gap-2">
                  <span>
                    {g.detalle}
                    {g.proveedor ? ` — ${g.proveedor}` : ""}
                  </span>
                  {g.es_donacion && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-pink-50 text-pink-700">
                      🎁 Regalo
                    </span>
                  )}
                  {g.tipo === "personal" && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      Personal
                    </span>
                  )}
                  {g.nombre_lote && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-800">
                      📦 {g.nombre_lote}
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-500">
                  {formatFechaHora(g.fecha_hora)}
                  {g.categoria
                    ? ` · ${CATEGORIAS_GASTO.find((c) => c.value === g.categoria)?.label}`
                    : ""}
                  {g.es_donacion ? (
                    ""
                  ) : g.estado_pago === "pendiente" ? (
                    <span className="text-amber-700">
                      {" "}
                      · Pendiente{g.fecha_pago ? ` (vence ${g.fecha_pago})` : ""}
                    </span>
                  ) : (
                    " · Pagado"
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {!g.es_donacion && g.estado_pago === "pendiente" && (
                  <button
                    onClick={() => marcarPagado(g.id)}
                    className="text-sm text-green-700 hover:underline"
                  >
                    Marcar pagado
                  </button>
                )}
                <span
                  className={`font-medium ${
                    g.es_donacion ? "text-pink-700" : "text-red-700"
                  }`}
                >
                  {formatMoney(Number(g.monto))}
                </span>
                <button
                  onClick={() => handleDelete(g.id)}
                  className="text-sm text-gray-400 hover:text-red-600"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
