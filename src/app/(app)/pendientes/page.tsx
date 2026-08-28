"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Gasto } from "@/lib/types";
import { CATEGORIAS_GASTO } from "@/lib/types";

function formatMoney(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

function diasHasta(fecha: string) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const destino = new Date(fecha + "T00:00:00");
  return Math.round((destino.getTime() - hoy.getTime()) / 86400000);
}

function estiloVencimiento(dias: number) {
  if (dias < 0) return "text-red-700 bg-red-50";
  if (dias <= 3) return "text-amber-700 bg-amber-50";
  return "text-gray-600 bg-gray-50";
}

function textoVencimiento(dias: number) {
  if (dias < 0) return `Vencido hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? "" : "s"}`;
  if (dias === 0) return "Vence hoy";
  if (dias === 1) return "Vence mañana";
  return `Vence en ${dias} días`;
}

export default function PendientesPage() {
  const supabase = createClient();
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("gastos")
      .select("*")
      .eq("estado_pago", "pendiente")
      .order("fecha_pago", { ascending: true, nullsFirst: false })
      .returns<Gasto[]>();
    setGastos(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos
    load();
  }, [load]);

  async function marcarPagado(id: string) {
    await supabase
      .from("gastos")
      .update({ estado_pago: "transferencia", fecha_pago: null })
      .eq("id", id);
    load();
  }

  const total = gastos.reduce((sum, g) => sum + Number(g.monto), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Pendientes de pago</h1>
          <p className="text-sm text-gray-500">Ordenados por fecha de pago</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Total pendiente</p>
          <p className="font-semibold text-amber-700">{formatMoney(total)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border divide-y">
        {loading ? (
          <p className="p-4 text-sm text-gray-400">Cargando...</p>
        ) : gastos.length === 0 ? (
          <p className="p-4 text-sm text-gray-400">No hay gastos pendientes de pago</p>
        ) : (
          gastos.map((g) => {
            const dias = g.fecha_pago ? diasHasta(g.fecha_pago) : null;
            return (
              <div key={g.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-gray-900">
                    {g.detalle}
                    {g.proveedor ? ` — ${g.proveedor}` : ""}
                  </p>
                  <p className="text-sm text-gray-500">
                    {g.categoria
                      ? CATEGORIAS_GASTO.find((c) => c.value === g.categoria)?.label
                      : "Sin categoría"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {dias !== null && (
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${estiloVencimiento(
                        dias
                      )}`}
                    >
                      {textoVencimiento(dias)}
                    </span>
                  )}
                  <span className="font-medium text-amber-700">
                    {formatMoney(Number(g.monto))}
                  </span>
                  <button
                    onClick={() => marcarPagado(g.id)}
                    className="text-sm text-green-700 hover:underline"
                  >
                    Marcar pagado
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
