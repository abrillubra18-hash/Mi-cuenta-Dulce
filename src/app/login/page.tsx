"use client";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50">
      <div className="bg-white shadow-md rounded-2xl p-8 w-full max-w-sm text-center space-y-6">
        <h1 className="text-2xl font-semibold text-amber-900">
          Mi Cuenta Dulce
        </h1>
        <p className="text-sm text-gray-500">
          Alfajores y harinas sin gluten — ventas, clientes y gastos
        </p>
        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-lg py-2 px-4 hover:bg-gray-50 transition"
        >
          Iniciar sesión con Google
        </button>
      </div>
    </div>
  );
}
