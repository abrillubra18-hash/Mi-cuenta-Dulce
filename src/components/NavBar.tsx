"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/dashboard", label: "Balance" },
  { href: "/ventas", label: "Ventas" },
  { href: "/gastos", label: "Gastos" },
  { href: "/pendientes", label: "Pendientes" },
  { href: "/lotes", label: "Lotes" },
  { href: "/clientes", label: "Clientes" },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="border-b bg-white">
      <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-3">
        <span className="font-semibold text-amber-900">Mi Cuenta Dulce</span>
        <div className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-md text-sm ${
                pathname === link.href
                  ? "bg-amber-100 text-amber-900 font-medium"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={signOut}
            className="ml-2 px-3 py-1.5 rounded-md text-sm text-gray-500 hover:bg-gray-100"
          >
            Salir
          </button>
        </div>
      </div>
    </nav>
  );
}
