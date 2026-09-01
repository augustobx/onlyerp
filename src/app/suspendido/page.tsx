import { AlertTriangle, CreditCard, ShieldOff } from "lucide-react";

export default function SuspendidoPage() {
  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
          <ShieldOff className="w-10 h-10 text-red-400" />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold mb-4">
            <AlertTriangle className="w-3.5 h-3.5" />
            SERVICIO SUSPENDIDO
          </div>

          <h1 className="text-3xl font-bold text-white">
            Membresía vencida
          </h1>

          <p className="text-slate-400 mt-3 leading-relaxed">
            El acceso a OnlyERP se encuentra temporalmente suspendido
            porque la membresía de esta empresa está vencida.
          </p>

          <div className="mt-6 p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <CreditCard className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
            <p className="text-sm text-slate-300">
              Para restablecer el servicio, regularizá la membresía con NanoLabs.
            </p>
          </div>

          <p className="text-xs text-slate-500 mt-6">
            Una vez registrado el pago, el acceso será rehabilitado automáticamente.
          </p>
        </div>

        <p className="text-xs text-slate-600 mt-5">
          OnlyERP · Plataforma SaaS NanoLabs
        </p>
      </div>
    </main>
  );
}
