/**
 * Módulo de validación de riesgo crediticio y control duro de morosidad
 */

export interface ResultadoCredito {
    habilitado: boolean;
    motivo?: string;
    limiteExcedido: boolean;
    tieneFacturasVencidas: boolean;
    facturasVencidasCount: number;
    saldoActual: number;
    limiteCredito: number;
    saldoDisponible: number;
}

export function validarEstadoCrediticioCliente(cliente: {
    limite_credito?: number | null;
    saldo_cc?: number | null;
    dias_aviso_deuda?: number | null;
    ventasPendientes?: Array<{ fecha_emision: Date | string; saldo_pendiente: number }>;
}, nuevoMonto: number = 0): ResultadoCredito {
    const limite = cliente.limite_credito || 0;
    const saldo = cliente.saldo_cc || 0;
    const diasTolerancia = cliente.dias_aviso_deuda || 30;

    const saldoProyectado = saldo + nuevoMonto;
    const saldoDisponible = Math.max(0, limite - saldo);

    // 1. Validar límite de crédito si tiene límite asignado (> 0)
    const limiteExcedido = limite > 0 && saldoProyectado > limite;

    // 2. Validar facturas vencidas
    const hoy = new Date().getTime();
    let facturasVencidasCount = 0;

    if (cliente.ventasPendientes && cliente.ventasPendientes.length > 0) {
        for (const v of cliente.ventasPendientes) {
            if (v.saldo_pendiente > 0) {
                const fechaFactura = new Date(v.fecha_emision).getTime();
                const diasTranscurridos = Math.floor((hoy - fechaFactura) / (1000 * 60 * 60 * 24));
                if (diasTranscurridos > diasTolerancia) {
                    facturasVencidasCount++;
                }
            }
        }
    }

    const tieneFacturasVencidas = facturasVencidasCount > 0;

    let habilitado = true;
    let motivo = "";

    if (limiteExcedido) {
        habilitado = false;
        motivo = `Supera el límite de crédito asignado ($${limite.toLocaleString('es-AR')}). Saldo actual + compra: $${saldoProyectado.toLocaleString('es-AR')}.`;
    } else if (tieneFacturasVencidas) {
        habilitado = false;
        motivo = `Posee ${facturasVencidasCount} comprobante(s) impago(s) con más de ${diasTolerancia} días de vencimiento.`;
    }

    return {
        habilitado,
        motivo: motivo || undefined,
        limiteExcedido,
        tieneFacturasVencidas,
        facturasVencidasCount,
        saldoActual: saldo,
        limiteCredito: limite,
        saldoDisponible
    };
}
