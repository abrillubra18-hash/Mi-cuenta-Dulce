"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { whatsappLink, type Cliente } from "@/lib/types";

export default function ClientesPage() {
  const supabase = createClient();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("clientes")
      .select("*")
      .order("nombre", { ascending: true })
      .returns<Cliente[]>();
    setClientes(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("clientes").insert({
      user_id: user?.id,
      nombre: nombre.trim(),
      whatsapp: whatsapp.trim() || null,
      notas: notas.trim() || null,
    });
    setNombre("");
    setWhatsapp("");
    setNotas("");
    setSaving(false);
    load();
  }

  async function handleDelete(id: string) {
    await supabase.from("clientes").delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Clientes</h1>
        <p className="text-sm text-gray-500">Contactos y WhatsApp</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
      >
        <div className="sm:col-span-1">
          <label className="block text-xs text-gray-500 mb-1">Nombre</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Nombre del cliente"
          />
        </div>
        <div className="sm:col-span-1">
          <label className="block text-xs text-gray-500 mb-1">WhatsApp</label>
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="+54 9 11 ..."
          />
        </div>
        <div className="sm:col-span-1">
          <label className="block text-xs text-gray-500 mb-1">Notas</label>
          <input
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Opcional"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="bg-amber-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Agregar cliente"}
        </button>
      </form>

      <div className="bg-white rounded-xl border divide-y">
        {loading ? (
          <p className="p-4 text-sm text-gray-400">Cargando...</p>
        ) : clientes.length === 0 ? (
          <p className="p-4 text-sm text-gray-400">Todavía no hay clientes</p>
        ) : (
          clientes.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between p-4"
            >
              <div>
                <p className="font-medium text-gray-900">{c.nombre}</p>
                {c.notas && <p className="text-sm text-gray-500">{c.notas}</p>}
              </div>
              <div className="flex items-center gap-3">
                {c.whatsapp && (
                  <a
                    href={whatsappLink(c.whatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-green-700 hover:underline"
                  >
                    WhatsApp
                  </a>
                )}
                <button
                  onClick={() => handleDelete(c.id)}
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
