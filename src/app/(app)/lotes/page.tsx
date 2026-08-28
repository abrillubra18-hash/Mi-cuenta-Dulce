"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Gasto, Venta } from "@/lib/types";

function formatMoney(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

interface LoteReporte {
  lote: Gasto;
  vendido: number;
  cantVentas: number;
  costo: number;
  ganancia: number;
  pendiente: boolean;
  deuda: number;
  cubierto: number;
  falta: number;
}

export default function LotesPage() {
  const supabase = createClient();
  const [reportes, setReportes] = useState<LoteReporte[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: lotesData }, { data: ventasData }] = await Promise.all([
      supabase
        .from("gastos")
        .select("*")
        .not("nombre_lote", "is", null)
        .order("fecha_hora", { ascending: false })
        .returns<Gasto[]>(),
      supabase
        .from("ventas")
        .select("*")
        .not("lote_id", "is", null)
        .returns<Venta[]>(),
    ]);

    const ventas = ventasData ?? [];
    const rep = (lotesData ?? []).map<LoteReporte>((lote) => {
      const ventasDelLote = ventas.filter((v) => v.lote_id === lote.id);
      const vendido = ventasDelLote.reduce((sum, v) => sum + Number(v.monto), 0);
      const costo = lote.es_donacion ? 0 : Number(lote.monto);
      const pendiente = lote.estado_pago === "pendiente" && !lote.es_donacion;
      const deuda = pendiente ? Number(lote.monto) : 0;
      return {
        lote,
        vendido,
        cantVentas: ventasDelLote.length,
        costo,
        ganancia: vendido - costo,
        pendiente,
        deuda,
        cubierto: Math.min(vendido, deuda),
        falta: Math.max(deuda - vendido, 0),
      };
    });

    setReportes(rep);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Rendimiento por lote</h1>
        <p className="text-sm text-gray-500">
          Compra de insumos vinculada a las ventas que salieron de ella
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : reportes.length === 0 ? (
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-400">
            Todavía no hay lotes. Ponele un “nombre de lote” a un gasto de insumos
            y vinculá ventas a ese lote para ver su rendimiento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {reportes.map((r) => (
            <div key={r.lote.id} className="bg-white rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">📦 {r.lote.nombre_lote}</p>
                  <p className="text-sm text-gray-500">
                    {r.lote.detalle}
                    {r.lote.proveedor ? ` — ${r.lote.proveedor}` : ""} ·{" "}
                    {r.cantVentas} venta{r.cantVentas === 1 ? "" : "s"}
                  </p>
                </div>
                {r.lote.es_donacion ? (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 whitespace-nowrap">
                    🎁 Donación
                  </span>
                ) : r.pendiente ? (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 whitespace-nowrap">
                    Fiado / pendiente
                  </span>
                ) : null}
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4">
                <div>
                  <p className="text-xs text-gray-500">Costo del lote</p>
                  <p className="font-semibold text-red-700">
                    {r.lote.es_donacion ? "$0 · Donación" : formatMoney(r.costo)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Vendido</p>
                  <p className="font-semibold text-green-700">
                    {formatMoney(r.vendido)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Ganancia</p>
                  <p
                    className={`font-semibold ${
                      r.ganancia >= 0 ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {formatMoney(r.ganancia)}
                  </p>
                </div>
              </div>

              {r.pendiente && (
                <div className="mt-4 border-t pt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      Deuda del lote: {formatMoney(r.deuda)}
                    </span>
                    <span
                      className={
                        r.falta === 0 ? "text-green-700" : "text-amber-700"
                      }
                    >
                      {r.falta === 0
                        ? "✅ Deuda cubierta con las ventas"
                        : `Falta vender ${formatMoney(r.falta)}`}
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        r.falta === 0 ? "bg-green-600" : "bg-amber-500"
                      }`}
                      style={{
                        width: `${
                          r.deuda > 0
                            ? Math.min(100, (r.cubierto / r.deuda) * 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Cubierto {formatMoney(r.cubierto)} de {formatMoney(r.deuda)}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
