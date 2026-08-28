export type Producto = "alfajores" | "harinas_sin_gluten" | "otro";
export type FormaPago = "efectivo" | "transferencia" | "tarjeta" | "otro";
export type CategoriaGasto = "insumos" | "servicios" | "transporte" | "otro";
export type EstadoPagoGasto = "transferencia" | "pendiente";
export type TipoGasto = "negocio" | "personal";

export interface Cliente {
  id: string;
  nombre: string;
  whatsapp: string | null;
  notas: string | null;
  created_at: string;
}

export interface Venta {
  id: string;
  cliente_id: string | null;
  producto: Producto;
  descripcion: string | null;
  cantidad: number;
  monto: number;
  forma_pago: FormaPago;
  fecha: string;
  direccion_entrega: string | null;
  costo_delivery: number;
  lote_id: string | null;
  created_at: string;
  clientes?: { nombre: string } | null;
}

export interface Gasto {
  id: string;
  detalle: string;
  categoria: CategoriaGasto | null;
  proveedor: string | null;
  monto: number;
  fecha_hora: string;
  estado_pago: EstadoPagoGasto;
  fecha_pago: string | null;
  tipo: TipoGasto;
  es_donacion: boolean;
  nombre_lote: string | null;
  created_at: string;
}

export const PRODUCTOS: { value: Producto; label: string }[] = [
  { value: "alfajores", label: "Alfajores" },
  { value: "harinas_sin_gluten", label: "Harinas sin gluten" },
  { value: "otro", label: "Otro" },
];

export const FORMAS_PAGO: { value: FormaPago; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "otro", label: "Otro" },
];

export const CATEGORIAS_GASTO: { value: CategoriaGasto; label: string }[] = [
  { value: "insumos", label: "Insumos" },
  { value: "servicios", label: "Servicios" },
  { value: "transporte", label: "Transporte" },
  { value: "otro", label: "Otro" },
];

export const ESTADOS_PAGO_GASTO: { value: EstadoPagoGasto; label: string }[] = [
  { value: "transferencia", label: "Transferencia (ya pagado)" },
  { value: "pendiente", label: "Pendiente de pago" },
];

export function whatsappLink(numero: string) {
  const digits = numero.replace(/\D/g, "");
  return `https://wa.me/${digits}`;
}

export function mapsLink(direccion: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    direccion
  )}`;
}
