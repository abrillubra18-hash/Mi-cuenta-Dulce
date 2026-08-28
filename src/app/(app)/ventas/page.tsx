"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Cliente, Venta, Gasto, Producto, FormaPago } from "@/lib/types";
import { PRODUCTOS, FORMAS_PAGO, mapsLink } from "@/lib/types";

function formatMoney(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

export default function VentasPage() {
  const supabase = createClient();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [lotes, setLotes] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [clienteId, setClienteId] = useState("");
  const [producto, setProducto] = useState<Producto>("alfajores");
  const [descripcion, setDescripcion] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [monto, setMonto] = useState("");
  const [formaPago, setFormaPago] = useState<FormaPago>("efectivo");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [direccionEntrega, setDireccionEntrega] = useState("");
  const [costoDelivery, setCostoDelivery] = useState("");
  const [loteId, setLoteId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: v }, { data: c }, { data: l }] = await Promise.all([
      supabase
        .from("ventas")
        .select("*, clientes(nombre)")
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false })
        .returns<Venta[]>(),
      supabase.from("clientes").select("*").order("nombre").returns<Cliente[]>(),
      supabase
        .from("gastos")
        .select("*")
        .not("nombre_lote", "is", null)
        .order("fecha_hora", { ascending: false })
        .returns<Gasto[]>(),
    ]);
    setVentas(v ?? []);
    setClientes(c ?? []);
    setLotes(l ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!monto || Number(monto) < 0) return;
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("ventas").insert({
      user_id: user?.id,
      cliente_id: clienteId || null,
      producto,
      descripcion: descripcion.trim() || null,
      cantidad: Number(cantidad) || 1,
      monto: Number(monto),
      forma_pago: formaPago,
      fecha,
      direccion_entrega: direccionEntrega.trim() || null,
      costo_delivery: Number(costoDelivery) || 0,
      lote_id: loteId || null,
    });
    setDescripcion("");
    setMonto("");
    setCantidad("1");
    setDireccionEntrega("");
    setCostoDelivery("");
    setLoteId("");
    setSaving(false);
    load();
  }

  async function handleDelete(id: string) {
    await supabase.from("ventas").delete().eq("id", id);
    load();
  }

  const total = ventas.reduce(
    (sum, v) => sum + Number(v.monto) + Number(v.costo_delivery),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Ventas</h1>
          <p className="text-sm text-gray-500">Alfajores y harinas sin gluten</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Total</p>
          <p className="font-semibold text-green-700">{formatMoney(total)}</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 items-end"
      >
        <div>
          <label className="block text-xs text-gray-500 mb-1">Producto</label>
          <select
            value={producto}
            onChange={(e) => setProducto(e.target.value as Producto)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            {PRODUCTOS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Cliente</label>
          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Sin cliente</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Cantidad</label>
          <input
            type="number"
            min="0"
            step="1"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Monto productos</label>
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
          <label className="block text-xs text-gray-500 mb-1">Delivery</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={costoDelivery}
            onChange={(e) => setCostoDelivery(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Forma de pago</label>
          <select
            value={formaPago}
            onChange={(e) => setFormaPago(e.target.value as FormaPago)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            {FORMAS_PAGO.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Descripción</label>
          <input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Opcional"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">
            Lote de insumos (opcional)
          </label>
          <select
            value={loteId}
            onChange={(e) => setLoteId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Sin lote</option>
            {lotes.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nombre_lote}
                {l.es_donacion ? " (donación)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">
            Dirección de entrega
          </label>
          <input
            value={direccionEntrega}
            onChange={(e) => setDireccionEntrega(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Opcional"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="col-span-2 sm:col-span-1 bg-amber-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Agregar venta"}
        </button>
      </form>

      <div className="bg-white rounded-xl border divide-y">
        {loading ? (
          <p className="p-4 text-sm text-gray-400">Cargando...</p>
        ) : ventas.length === 0 ? (
          <p className="p-4 text-sm text-gray-400">Todavía no hay ventas</p>
        ) : (
          ventas.map((v) => (
            <div key={v.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-gray-900">
                  {PRODUCTOS.find((p) => p.value === v.producto)?.label}
                  {v.clientes?.nombre ? ` — ${v.clientes.nombre}` : ""}
                </p>
                <p className="text-sm text-gray-500">
                  {v.fecha} · {FORMAS_PAGO.find((f) => f.value === v.forma_pago)?.label}
                  {Number(v.costo_delivery) > 0
                    ? ` · Delivery ${formatMoney(Number(v.costo_delivery))}`
                    : ""}
                  {v.descripcion ? ` · ${v.descripcion}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {v.direccion_entrega && (
                  <a
                    href={mapsLink(v.direccion_entrega)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-700 hover:underline"
                  >
                    Abrir en Maps
                  </a>
                )}
                <span className="font-medium text-green-700">
                  {formatMoney(Number(v.monto) + Number(v.costo_delivery))}
                </span>
                <button
                  onClick={() => handleDelete(v.id)}
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
