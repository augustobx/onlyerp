/**
 * Utilidades para formateo de teléfonos y generación de links de WhatsApp (wa.me)
 * adaptado a la numeración argentina e internacional.
 */

export function limpiarNumeroWhatsApp(telefono: string | null | undefined): string {
    if (!telefono) return "";
    
    // Dejar solo números
    let limpio = telefono.replace(/\D/g, "");
    
    if (!limpio) return "";

    // Si empieza con 0 (ej: 03329...), quitar el 0 inicial
    if (limpio.startsWith("0")) {
        limpio = limpio.substring(1);
    }

    // Si tiene 10 dígitos (ej: 3329155544 o 1144556677), anteponer código país Argentina 549
    if (limpio.length === 10) {
        limpio = `549${limpio}`;
    } else if (limpio.length === 11 && limpio.startsWith("15")) {
        // En caso de que pongan 15 al inicio (ej: 1544556677)
        limpio = `54911${limpio.substring(2)}`;
    } else if (!limpio.startsWith("54") && limpio.length >= 8) {
        limpio = `549${limpio}`;
    }

    return limpio;
}

export function generarLinkWhatsAppComprobante(params: {
    telefono: string;
    clienteNombre: string;
    tipoComprobante: string;
    puntoVenta: number;
    numeroComprobante: number;
    total: number;
    urlComprobante?: string;
    nombreEmpresa?: string;
}): string {
    const tel = limpiarNumeroWhatsApp(params.telefono);
    const empresa = params.nombreEmpresa || "Sanu Distribuidora";
    const compTexto = params.tipoComprobante.replace("_", " ");
    const nroCompleto = `000${params.puntoVenta}-${String(params.numeroComprobante).padStart(8, '0')}`;
    const totalFmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(params.total);

    let mensaje = `Hola *${params.clienteNombre}*, te compartimos el comprobante de tu compra en *${empresa}*:\n\n` +
        `📄 *${compTexto} N° ${nroCompleto}*\n` +
        `💰 *Importe Total:* ${totalFmt}\n\n`;

    if (params.urlComprobante) {
        mensaje += `🔗 Podés ver o descargar tu comprobante digital aquí:\n${params.urlComprobante}\n\n`;
    }

    mensaje += `¡Muchas gracias por confiar en nosotros! 🙌`;

    return `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`;
}

export function generarLinkWhatsAppPresupuesto(params: {
    telefono: string;
    clienteNombre: string;
    numeroPresupuesto: number;
    total: number;
    validezDias?: number;
    urlPresupuesto?: string;
    nombreEmpresa?: string;
}): string {
    const tel = limpiarNumeroWhatsApp(params.telefono);
    const empresa = params.nombreEmpresa || "Sanu Distribuidora";
    const totalFmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(params.total);
    const validez = params.validezDias || 7;

    let mensaje = `Hola *${params.clienteNombre}*, te enviamos el presupuesto solicitado en *${empresa}*:\n\n` +
        `📋 *Presupuesto N° ${params.numeroPresupuesto}*\n` +
        `💰 *Total Cotizado:* ${totalFmt}\n` +
        `⏳ *Validez de precios:* ${validez} días\n\n`;

    if (params.urlPresupuesto) {
        mensaje += `🔗 Podés revisar el detalle de artículos cotizados aquí:\n${params.urlPresupuesto}\n\n`;
    }

    mensaje += `Quedamos a tu disposición por cualquier consulta. ¡Saludos!`;

    return `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`;
}

export function generarLinkWhatsAppSaldoCC(params: {
    telefono: string;
    clienteNombre: string;
    saldoDeuda: number;
    facturasVencidas?: number;
    cbuAlias?: string;
    nombreEmpresa?: string;
}): string {
    const tel = limpiarNumeroWhatsApp(params.telefono);
    const empresa = params.nombreEmpresa || "Sanu Distribuidora";
    const saldoFmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(params.saldoDeuda);

    let mensaje = `Estimado/a *${params.clienteNombre}*, te contactamos desde el área de administración de *${empresa}* para informarte el estado de tu cuenta corriente:\n\n` +
        `💳 *Saldo Pendiente a la fecha:* ${saldoFmt}\n`;

    if (params.facturasVencidas && params.facturasVencidas > 0) {
        mensaje += `⚠️ *Comprobantes pendientes:* ${params.facturasVencidas}\n`;
    }

    if (params.cbuAlias) {
        mensaje += `\n🏦 *Datos para transferencia bancaria:*\n` +
            `• *Alias / CBU:* ${params.cbuAlias}\n\n` +
            `Por favor, una vez realizado el pago, envianos el comprobante por este medio.\n\n`;
    } else {
        mensaje += `\nPodés coordinar tu pago por transferencia o con tu preventista habitual.\n\n`;
    }

    mensaje += `¡Muchas gracias!`;

    return `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`;
}

export function generarLinkWhatsAppPedido(params: {
    telefono: string;
    clienteNombre: string;
    numeroPedido: number;
    total: number;
    fechaEntrega?: string;
    nombreEmpresa?: string;
}): string {
    const tel = limpiarNumeroWhatsApp(params.telefono);
    const empresa = params.nombreEmpresa || "Sanu Distribuidora";
    const totalFmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(params.total);

    let mensaje = `Hola *${params.clienteNombre}*, registramos tu *Pedido N° ${params.numeroPedido}* en *${empresa}*:\n\n` +
        `📦 *Total del pedido:* ${totalFmt}\n`;

    if (params.fechaEntrega) {
        mensaje += `🚚 *Entrega programada:* ${params.fechaEntrega}\n`;
    }

    mensaje += `\nTe avisaremos cuando el camión esté en camino. ¡Muchas gracias!`;

    return `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`;
}
