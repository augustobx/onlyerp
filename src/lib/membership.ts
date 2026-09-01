import prisma from "@/lib/prisma";

export function membresiaVencida(fechaVencimiento?: Date | null) {
  return Boolean(fechaVencimiento && fechaVencimiento.getTime() < Date.now());
}

export async function actualizarEstadoMembresiaTenant(tenantId: number) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) return null;

  if (
    membresiaVencida(tenant.fecha_vencimiento) &&
    (tenant.estado === "ACTIVO" || tenant.estado === "PRUEBA")
  ) {
    return prisma.tenant.update({
      where: { id: tenant.id },
      data: { estado: "SUSPENDIDO" },
    });
  }

  return tenant;
}

export async function suspenderTenantsVencidos() {
  const now = new Date();

  return prisma.tenant.updateMany({
    where: {
      fecha_vencimiento: { lt: now },
      estado: { in: ["ACTIVO", "PRUEBA"] },
    },
    data: {
      estado: "SUSPENDIDO",
    },
  });
}
