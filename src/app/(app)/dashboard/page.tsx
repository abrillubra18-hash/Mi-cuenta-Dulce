import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  FORMAS_PAGO,
  type FormaPago,
  type Venta,
  type Gasto,
} from "@/lib/types";

function formatMoney(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

function diasHasta(fecha: string) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const destino = new Date(fecha + "T00:00:00");
  return Math.round((destino.getTime() - hoy.getTime()) / 86400000);
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: ventas }, { data: gastos }] = await Promise.all([
    supabase.from("ventas").select("*").returns<Venta[]>(),
    supabase.from("gastos").select("*").returns<Gasto[]>(),
  ]);

  const ventasList = ventas ?? [];
  const gastosList = gastos ?? [];

  // Ventas: productos + delivery cobrado
  const totalProductos = ventasList.reduce((sum, v) => sum + Number(v.monto), 0);
  const totalDeliveryCobrado = ventasList.reduce(
    (sum, v) => sum + Number(v.costo_delivery),
    0
  );
  const totalVentas = totalProductos + totalDeliveryCobrado;

  // Gastos reales (sin donaciones/regalos), separados por tipo
  const gastosNegocio = gastosList
    .filter((g) => g.tipo === "negocio" && !g.es_donacion)
    .reduce((sum, g) => sum + Number(g.monto), 0);
  const gastosPersonales = gastosList
    .filter((g) => g.tipo === "personal" && !g.es_donacion)
    .reduce((sum, g) => sum + Number(g.monto), 0);
  const gastosReales = gastosNegocio + gastosPersonales;

  // Donaciones (solo informativo, no resta de la ganancia)
  const donaciones = gastosList
    .filter((g) => g.es_donacion)
    .reduce((sum, g) => sum + Number(g.monto), 0);

  // Ganancia = ventas (productos + delivery) − gastos reales
  const ganancia = totalVentas - gastosReales;

  // Delivery: se paga solo? cobrado vs gastado en transporte (combustible/arriendo auto)
  const deliveryGastado = gastosList
    .filter((g) => g.categoria === "transporte" && !g.es_donacion)
    .reduce((sum, g) => sum + Number(g.monto), 0);
  const deliveryNeto = totalDeliveryCobrado - deliveryGastado;

  const ventasPorFormaPago = FORMAS_PAGO.map(({ value, label }) => ({
    label,
    total: ventasList
      .filter((v) => v.forma_pago === (value as FormaPago))
      .reduce((sum, v) => sum + Number(v.monto) + Number(v.costo_delivery), 0),
  })).filter((x) => x.total > 0);

  const pendientes = gastosList
    .filter((g) => g.estado_pago === "pendiente")
    .sort((a, b) => (a.fecha_pago ?? "9999").localeCompare(b.fecha_pago ?? "9999"))
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Balance</h1>
        <p className="text-sm text-gray-500">Resumen general del negocio</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Ventas totales</p>
          <p className="text-2xl font-semibold text-green-700">
            {formatMoney(totalVentas)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Productos {formatMoney(totalProductos)} + delivery{" "}
            {formatMoney(totalDeliveryCobrado)}
          </p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Gastos reales</p>
          <p className="text-2xl font-semibold text-red-700">
            {formatMoney(gastosReales)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Sin contar regalos/donaciones</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Ganancia</p>
          <p
            className={`text-2xl font-semibold ${
              ganancia >= 0 ? "text-green-700" : "text-red-700"
            }`}
          >
            {formatMoney(ganancia)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Ventas − gastos reales</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <h2 className="font-medium text-gray-900 mb-3">
            Ventas por forma de pago
          </h2>
          {ventasPorFormaPago.length === 0 ? (
            <p className="text-sm text-gray-400">Sin ventas todavía</p>
          ) : (
            <ul className="space-y-2">
              {ventasPorFormaPago.map((item) => (
                <li
                  key={item.label}
                  className="flex justify-between text-sm text-gray-700"
                >
                  <span>{item.label}</span>
                  <span className="font-medium">{formatMoney(item.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-xl border p-4">
          <h2 className="font-medium text-gray-900 mb-3">Desglose de gastos</h2>
          <ul className="space-y-2">
            <li className="flex justify-between text-sm text-gray-700">
              <span>Insumos / proveedores</span>
              <span className="font-medium">{formatMoney(gastosNegocio)}</span>
            </li>
            <li className="flex justify-between text-sm text-gray-700">
              <span>Gastos libres (personales)</span>
              <span className="font-medium">{formatMoney(gastosPersonales)}</span>
            </li>
            <li className="flex justify-between text-sm text-pink-700 border-t pt-2 mt-1">
              <span>🎁 Donaciones recibidas (no resta)</span>
              <span className="font-medium">{formatMoney(donaciones)}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4">
        <h2 className="font-medium text-gray-900 mb-3">Delivery</h2>
        <ul className="space-y-2">
          <li className="flex justify-between text-sm text-gray-700">
            <span>Cobrado a clientes</span>
            <span className="font-medium text-green-700">
              {formatMoney(totalDeliveryCobrado)}
            </span>
          </li>
          <li className="flex justify-between text-sm text-gray-700">
            <span>Gastado (combustible + arriendo auto)</span>
            <span className="font-medium text-red-700">
              {formatMoney(deliveryGastado)}
            </span>
          </li>
          <li className="flex justify-between text-sm border-t pt-2 mt-1">
            <span className="text-gray-700">
              {deliveryNeto >= 0 ? "El delivery se paga solo" : "El delivery cuesta plata"}
            </span>
            <span
              className={`font-medium ${
                deliveryNeto >= 0 ? "text-green-700" : "text-red-700"
              }`}
            >
              {formatMoney(deliveryNeto)}
            </span>
          </li>
        </ul>
        <p className="text-xs text-gray-400 mt-2">
          El gasto de delivery se toma de los gastos con categoría “Transporte”.
        </p>
      </div>

      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-gray-900">Próximos a vencer</h2>
          <Link
            href="/pendientes"
            className="text-sm text-amber-700 hover:underline"
          >
            Ver todos
          </Link>
        </div>
        {pendientes.length === 0 ? (
          <p className="text-sm text-gray-400">No hay gastos pendientes de pago</p>
        ) : (
          <ul className="space-y-2">
            {pendientes.map((g) => {
              const dias = g.fecha_pago ? diasHasta(g.fecha_pago) : null;
              return (
                <li
                  key={g.id}
                  className="flex justify-between text-sm text-gray-700"
                >
                  <span>
                    {g.detalle}
                    {g.proveedor ? ` — ${g.proveedor}` : ""}
                    {dias !== null && (
                      <span
                        className={
                          dias < 0
                            ? " text-red-700"
                            : dias <= 3
                            ? " text-amber-700"
                            : " text-gray-500"
                        }
                      >
                        {" "}
                        ({g.fecha_pago})
                      </span>
                    )}
                  </span>
                  <span className="font-medium">{formatMoney(Number(g.monto))}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
