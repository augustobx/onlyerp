"use client";

import { Printer } from "lucide-react";

export default function BotonImprimir() {
    return (
        <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition"
        >
            <Printer className="h-4 w-4" /> Imprimir Documento
        </button>
    );
}
