import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { cookies, headers } from "next/headers";
import { jwtVerify } from "jose";
import { logout } from "@/app/actions/auth";
import prisma from "@/lib/prisma";
import { getSessionKey } from "@/lib/session-secret";
import { COOKIE_NAME } from "@/lib/session";
import { getSuperAdminSession } from "@/lib/superadmin-session";
import { getTenantContext } from "@/lib/tenant-context";
import { AppShell } from "@/components/app-sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OnlyERP | Plataforma SaaS de Gestión Comercial y Logística",
  description: "Sistema Integral Multi-Tenant de Facturación AFIP, Stock, Hojas de Ruta y Cobranzas",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#090d16",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const superAdminSession = await getSuperAdminSession();
  if (superAdminSession) {
    return (
      <html lang="es">
        <body className={`${inter.className} bg-slate-950 text-slate-50 antialiased`}>
          {children}
          <Toaster position="top-center" richColors />
        </body>
      </html>
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  // Resolver contexto del Tenant actual
  const tenant = await getTenantContext();

  let esAdmin = false;
  let esUsuarioPWA = false;
  let permisos: string[] = [];
  let isLogueado = false;
  let nombreUsuario = "";
  let rolUsuario = "";

  if (token) {
    try {
      const { payload } = await jwtVerify(token, getSessionKey());
      const usuarioDB = await prisma.usuario.findUnique({
        where: { id: Number(payload.id) },
        include: { tenant: true },
      });

      if (!usuarioDB || !usuarioDB.activo || usuarioDB.tenant?.estado === "SUSPENDIDO" || usuarioDB.tenant?.estado === "CANCELADO") {
        isLogueado = false;
      } else {
        esAdmin = payload.rol === "ADMIN";
        esUsuarioPWA = ["VENDEDOR", "REPARTIDOR", "MIXTO"].includes(payload.rol as string);
        rolUsuario = payload.rol as string;
        permisos = (payload.permisos as string[]) || [];
        nombreUsuario = payload.nombre as string;
        isLogueado = true;
      }
    } catch {
      isLogueado = false;
    }
  }

  return (
    <html lang="es">
      <body className={`${inter.className} bg-slate-100 dark:bg-zinc-950 text-slate-900 dark:text-slate-50 antialiased`}>
        {!isLogueado ? (
          <main className="w-full min-h-screen">{children}</main>
        ) : esUsuarioPWA ? (
          <main className="w-full min-h-screen relative bg-slate-100 dark:bg-zinc-950">
            {children}
          </main>
        ) : (
          <AppShell
            nombreUsuario={nombreUsuario}
            rolUsuario={rolUsuario}
            esAdmin={esAdmin}
            permisos={permisos}
            tenantNombre={tenant?.nombre || "OnlyERP"}
            tenantSlug={tenant?.slug}
            modulosActivos={tenant?.modulos}
            logoutAction={logout}
          >
            {children}
          </AppShell>
        )}

        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
