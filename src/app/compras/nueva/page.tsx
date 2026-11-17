import { CompraForm } from "./compra-form";
import { PackagePlus } from "lucide-react";
import prisma from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant-context";

export default async function NuevaCompraPage() {
  const tenant = await getTenantContext();
  if (!tenant) {
    return (
      <div className="p-8 text-center text-red-500 font-bold">
        Error: Empresa no identificada para registrar compras.
      </div>
    );
  }

  const productos = await prisma.producto.findMany({
    where: { tenantId: tenant.id },
    select: {
      id: true,
      nombre_producto: true,
      codigo_articulo: true,
      precio_costo: true,
      proveedor: { select: { id: true, nombre: true } },
      marca: { select: { id: true, nombre: true } },
      categoria: { select: { id: true, nombre: true } },
    },
    orderBy: {
      nombre_producto: "asc"
    }
  });

  const proveedores = await prisma.proveedor.findMany({
    where: { tenantId: tenant.id },
    select: { id: true, nombre: true },
    orderBy: { nombre: 'asc' }
  });

  const marcas = await prisma.marca.findMany({
    where: { tenantId: tenant.id },
    select: { id: true, nombre: true },
    orderBy: { nombre: 'asc' }
  });

  const categorias = await prisma.categoria.findMany({
    where: { tenantId: tenant.id },
    select: { id: true, nombre: true },
    orderBy: { nombre: 'asc' }
  });

  const depositos = await prisma.deposito.findMany({
    where: { tenantId: tenant.id, estado: true },
    select: { id: true, nombre: true }
  });

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl">
          <PackagePlus className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Registrar Compra</h1>
          <p className="text-sm text-slate-500">
            Ingresa los detalles de la compra, costo base e impuestos para actualizar el costo del producto.
          </p>
        </div>
      </div>

      <CompraForm 
        productos={productos} 
        proveedores={proveedores} 
        marcas={marcas} 
        categorias={categorias} 
        depositos={depositos}
      />
    </div>
  );
}
