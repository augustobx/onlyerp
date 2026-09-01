"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { emitirComprobanteAFIP, getDatosClientePorCUIT } from "./afip";
import { requireTenant, getTenantContext } from "@/lib/tenant-context";

export async function buscarCuitEnAfip(cuitStr: string) {
  const cuitNum = Number(cuitStr.replace(/[^0-9]/g, ""));
  if (!cuitNum) return { success: false, error: "CUIT inválido" };
  return await getDatosClientePorCUIT(cuitNum);
}

export async function getClientes() {
  const tenant = await getTenantContext();
  if (!tenant) return [];

  return await prisma.cliente.findMany({
    where: { tenantId: tenant.id },
    include: { lista_default: true, listas_permitidas: { include: { listaPrecio: true } } },
    orderBy: { nombre_razon_social: "asc" },
  });
}

export async function crearCliente(formData: FormData) {
  try {
    const tenant = await requireTenant();

    const nombre_razon_social = formData.get("nombre_razon_social") as string;
    const dni_cuit = formData.get("dni_cuit") as string;
    const direccion = formData.get("direccion") as string;
    const telefono = formData.get("telefono") as string;
    const comentarios = formData.get("comentarios") as string;
    const lista_default_id = formData.get("lista_default_id") as string;
    const comprobante_default = formData.get("comprobante_default") as string;
    const condicion_iva = formData.get("condicion_iva") as string;

    const limite_credito_str = formData.get("limite_credito") as string;
    const dias_aviso_deuda_str = formData.get("dias_aviso_deuda") as string;
    const limite_credito = limite_credito_str && limite_credito_str.trim() !== "" ? parseFloat(limite_credito_str) : null;
    const dias_aviso_deuda = dias_aviso_deuda_str && dias_aviso_deuda_str.trim() !== "" ? parseInt(dias_aviso_deuda_str) : 30;

    const listas_permitidas_str = formData.getAll("listas_permitidas") as string[];
    const listas_permitidas = listas_permitidas_str.map((id) => Number(id));

    if (lista_default_id && !listas_permitidas.includes(Number(lista_default_id))) {
      listas_permitidas.push(Number(lista_default_id));
    }

    if (!nombre_razon_social) return { success: false, error: "La Razón Social es obligatoria." };

    if (dni_cuit) {
      const existe = await prisma.cliente.findUnique({
        where: {
          tenantId_dni_cuit: {
            tenantId: tenant.id,
            dni_cuit,
          },
        },
      });
      if (existe) return { success: false, error: "Este DNI o CUIT ya está registrado en tu empresa." };
    }

    const conexionesListas = listas_permitidas.map((id) => ({
      listaPrecio: { connect: { id } },
    }));

    await prisma.cliente.create({
      data: {
        tenantId: tenant.id,
        nombre_razon_social,
        dni_cuit: dni_cuit || null,
        direccion,
        telefono,
        comentarios,
        condicion_iva: condicion_iva || "Consumidor Final",
        comprobante_default: comprobante_default || "COMPROBANTE_X",
        lista_default_id: lista_default_id ? Number(lista_default_id) : null,
        limite_credito,
        dias_aviso_deuda,
        listas_permitidas: { create: conexionesListas },
      },
    });

    revalidatePath("/clientes");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Ocurrió un error al guardar el cliente." };
  }
}

export async function getHistorialCliente(clienteId: number) {
  try {
    const tenant = await getTenantContext();
    if (!tenant) return { success: false, error: "Tenant no encontrado" };

    const ventas = await prisma.venta.findMany({
      where: { tenantId: tenant.id, clienteId },
      include: { usuario: { select: { nombre: true } } },
    });
    const movimientos = await prisma.movimientoCuentaCorriente.findMany({
      where: { tenantId: tenant.id, clienteId },
      include: { usuario: { select: { nombre: true } } },
    });

    const historial = [
      ...ventas.map((v) => ({
        id_unico: `v_${v.id}`,
        id_real: v.id,
        numero_comprobante: v.numero_comprobante,
        tipo: "VENTA",
        fecha: v.fecha_emision,
        titulo: `Facturación: ${v.tipo_comprobante.replace("_", " ")} 000${v.punto_venta}-${v.numero_comprobante}`,
        monto: v.total,
        estado: v.estado_pago,
        notas: v.notas_venta,
        cajero: v.usuario?.nombre || "SISTEMA",
      })),
      ...movimientos.map((m) => {
        const esDevolucion = m.notas?.toLowerCase().includes("nota de cr") || m.notas?.toLowerCase().includes("devoluc");
        const esUsoSaldo = m.metodo_pago === "SALDO_A_FAVOR" && m.tipo === "CARGO";

        let titulo = `Recibo de Pago (${m.metodo_pago.replace("_", " ")})`;
        if (esDevolucion) titulo = "NOTA DE CRÉDITO / DEVOLUCIÓN A FAVOR";
        if (esUsoSaldo) titulo = "USO DE SALDO A FAVOR";

        return {
          id_unico: `m_${m.id}`,
          id_real: m.id,
          tipo: m.tipo === "CARGO" ? "CARGO_CC" : esDevolucion ? "DEVOLUCION" : "PAGO",
          fecha: m.fecha,
          titulo: titulo,
          monto: m.monto,
          estado: "COMPLETADO",
          notas: m.notas,
          cajero: m.usuario?.nombre || "SISTEMA",
        };
      }),
    ];

    historial.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    return { success: true, data: historial };
  } catch {
    return { success: false, error: "Error al cargar el historial del cliente." };
  }
}

export async function actualizarCliente(id: number, formData: FormData) {
  try {
    const tenant = await requireTenant();

    const nombre_razon_social = formData.get("nombre_razon_social") as string;
    const dni_cuit = formData.get("dni_cuit") as string;
    const direccion = formData.get("direccion") as string;
    const telefono = formData.get("telefono") as string;
    const comentarios = formData.get("comentarios") as string;
    const lista_default_id = formData.get("lista_default_id") as string;
    const comprobante_default = formData.get("comprobante_default") as string;
    const condicion_iva = formData.get("condicion_iva") as string;

    const limite_credito_str = formData.get("limite_credito") as string;
    const dias_aviso_deuda_str = formData.get("dias_aviso_deuda") as string;
    const limite_credito = limite_credito_str && limite_credito_str.trim() !== "" ? parseFloat(limite_credito_str) : null;
    const dias_aviso_deuda = dias_aviso_deuda_str && dias_aviso_deuda_str.trim() !== "" ? parseInt(dias_aviso_deuda_str) : 30;

    if (!nombre_razon_social) return { success: false, error: "La Razón Social es obligatoria." };

    if (dni_cuit) {
      const existe = await prisma.cliente.findFirst({
        where: { tenantId: tenant.id, dni_cuit, id: { not: id } },
      });
      if (existe) return { success: false, error: "Este DNI/CUIT ya pertenece a otro cliente en tu empresa." };
    }

    await prisma.cliente.update({
      where: { id },
      data: {
        nombre_razon_social,
        dni_cuit: dni_cuit || null,
        direccion,
        telefono,
        comentarios,
        condicion_iva: condicion_iva || "Consumidor Final",
        comprobante_default: comprobante_default || "COMPROBANTE_X",
        lista_default_id: lista_default_id ? Number(lista_default_id) : null,
        limite_credito,
        dias_aviso_deuda,
      },
    });

    revalidatePath("/clientes");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Ocurrió un error al actualizar el cliente." };
  }
}

export async function eliminarCliente(id: number) {
  try {
    const tenant = await requireTenant();
    await prisma.cliente.delete({
      where: { id, tenantId: tenant.id },
    });
    revalidatePath("/clientes");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "No se puede eliminar. Es probable que este cliente tenga ventas o deudas registradas." };
  }
}

// ==========================================
// RESUMEN Y CUENTA CORRIENTE
// ==========================================

export async function getResumenFinancieroCliente(id: number) {
  try {
    const tenant = await requireTenant();

    const ventasDeuda = await prisma.venta.findMany({
      where: { tenantId: tenant.id, clienteId: id, saldo_pendiente: { gt: 0 } },
      orderBy: { fecha_emision: "asc" },
    });

    const deudaTotal = ventasDeuda.reduce((acc, v) => acc + v.saldo_pendiente, 0);
    const ventaMasAntigua = ventasDeuda.length > 0 ? ventasDeuda[0].fecha_emision : null;

    const movimientos = await prisma.movimientoCuentaCorriente.findMany({
      where: { tenantId: tenant.id, clienteId: id },
    });

    const totalCargos = movimientos.filter((m) => m.tipo === "CARGO").reduce((acc, m) => acc + m.monto, 0);
    const totalAbonos = movimientos.filter((m) => m.tipo === "ABONO").reduce((acc, m) => acc + m.monto, 0);

    const balanceNeto = totalAbonos - totalCargos;
    const saldo_a_favor = balanceNeto > 0 ? balanceNeto : 0;

    return {
      success: true,
      deuda: deudaTotal,
      saldo_a_favor,
      balance: saldo_a_favor > 0 ? saldo_a_favor : -deudaTotal,
      fecha_mas_antigua: ventaMasAntigua,
    };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Error al generar resumen financiero" };
  }
}

export async function cobrarCuentaCorriente(
  clienteId: number,
  pagos: { metodo_pago: string; monto: number }[],
  notas: string
) {
  try {
    const tenant = await requireTenant();

    const montoTotalAbonado = pagos.reduce((acc, p) => acc + p.monto, 0);
    if (montoTotalAbonado <= 0) return { success: false, error: "El monto no puede ser cero" };

    let restanteAbono = montoTotalAbonado;

    await prisma.$transaction(async (tx) => {
      const cajaAbierta = await tx.cajaDiaria.findFirst({
        where: { tenantId: tenant.id, estado: "ABIERTA" },
      });
      if (!cajaAbierta) throw new Error("No hay caja abierta para recibir el pago");

      for (const pago of pagos) {
        await tx.movimientoCuentaCorriente.create({
          data: {
            tenantId: tenant.id,
            clienteId,
            tipo: "ABONO",
            metodo_pago: pago.metodo_pago as any,
            monto: pago.monto,
            notas: notas ? `Abono (${pago.metodo_pago}) - ${notas}` : `Abono de Deuda (${pago.metodo_pago})`,
          },
        });

        if (pago.metodo_pago !== "SALDO_A_FAVOR" && pago.metodo_pago !== "CUENTA_CORRIENTE") {
          await tx.movimientoCaja.create({
            data: {
              cajaId: cajaAbierta.id,
              tipo: "COBRO_CC",
              metodo_pago: pago.metodo_pago as any,
              monto: pago.monto,
              descripcion: `Cobro Cta.Cte. Cliente #${clienteId} (${pago.metodo_pago})` + (notas ? ` - ${notas}` : ""),
            },
          });
        }
      }

      const ventasPendientes = await tx.venta.findMany({
        where: { tenantId: tenant.id, clienteId, saldo_pendiente: { gt: 0 } },
        orderBy: { fecha_emision: "asc" },
      });

      for (const v of ventasPendientes) {
        if (restanteAbono <= 0) break;

        const aPagar = Math.min(v.saldo_pendiente, restanteAbono);
        restanteAbono -= aPagar;

        const nuevoSaldo = v.saldo_pendiente - aPagar;

        await tx.venta.update({
          where: { id: v.id },
          data: {
            saldo_pendiente: nuevoSaldo,
            estado_pago: nuevoSaldo <= 0.01 ? "PAGADO" : "PARCIAL",
          },
        });
      }
    });

    revalidatePath("/clientes");
    revalidatePath("/ventas");
    revalidatePath("/caja");

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Error al cobrar cuenta corriente" };
  }
}

export async function registrarClientePWA(data: {
  nombre: string;
  cuit?: string;
  direccion?: string;
  telefono?: string;
}) {
  try {
    const tenant = await requireTenant();

    if (!data.nombre || !data.nombre.trim()) {
      return { success: false, error: "El nombre o razón social es obligatorio." };
    }

    const primeraLista = await prisma.listaPrecio.findFirst({
      where: { tenantId: tenant.id },
      orderBy: { id: "asc" },
    });

    const nuevo = await prisma.cliente.create({
      data: {
        tenantId: tenant.id,
        nombre_razon_social: data.nombre.trim(),
        dni_cuit: data.cuit && data.cuit.trim() !== "" ? data.cuit.trim() : null,
        direccion: data.direccion?.trim() || null,
        telefono: data.telefono?.trim() || null,
        condicion_iva: "CONSUMIDOR_FINAL",
        comprobante_default: "COMPROBANTE_X",
        lista_default_id: primeraLista ? primeraLista.id : null,
        listas_permitidas: primeraLista
          ? {
              create: [{ listaPrecioId: primeraLista.id }],
            }
          : undefined,
      },
      include: {
        lista_default: true,
        listas_permitidas: { include: { listaPrecio: true } },
      },
    });

    revalidatePath("/clientes");
    revalidatePath("/vendedor");
    return { success: true, cliente: nuevo };
  } catch (error: any) {
    if (error.code === "P2002") return { success: false, error: "El CUIT/DNI ya existe en esta empresa." };
    return { success: false, error: error.message || "Error al crear cliente." };
  }
}