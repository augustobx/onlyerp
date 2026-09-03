import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getSessionKey } from "@/lib/session-secret";

export const COOKIE_NAME = 'onlyerp_session';

export type UserSessionPayload = {
  id: number;
  tenantId: number;
  tenantSlug?: string;
  nombre: string;
  username?: string;
  rol: string;
  permisos: string[];
  sucursalId?: number | null;
  listaPrecioId?: number | null;
  listas_permitidas?: string | null;
  [key: string]: any;
};

// ========================================================
// LÓGICA DE TIEMPO: Expira al final del turno operativo
// ========================================================
function obtenerProximoCierre() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(now);

  const getPart = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || '0', 10);

  const year = getPart('year');
  const month = getPart('month') - 1;
  const day = getPart('day');
  const currentHour = getPart('hour');

  // Cierre diario a las 18:00 (21:00 UTC) o 12 horas desde login
  const cierreUTC = new Date(Date.UTC(year, month, day, 21, 0, 0, 0));

  if (currentHour >= 18) {
    cierreUTC.setDate(cierreUTC.getDate() + 1);
  }

  return cierreUTC;
}

// ========================================================
// CONTROL DE SESIÓN MULTI-TENANT
// ========================================================
export async function crearSesion(usuario: any, tenantId?: number) {
  const expiresAt = obtenerProximoCierre();
  const expUnix = Math.floor(expiresAt.getTime() / 1000);

  const payload: UserSessionPayload = {
    id: usuario.id,
    tenantId: tenantId ?? usuario.tenantId,
    nombre: usuario.nombre,
    username: usuario.username,
    rol: usuario.rol,
    permisos: typeof usuario.permisos === 'string' ? JSON.parse(usuario.permisos || "[]") : (usuario.permisos || []),
    sucursalId: usuario.sucursalId,
    listaPrecioId: usuario.listaPrecioId ?? null,
    listas_permitidas: usuario.listas_permitidas ?? null,
  };

  const sessionToken = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expUnix)
    .sign(getSessionKey());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
}

export async function getSessionUser(): Promise<UserSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSessionKey());
    return payload as unknown as UserSessionPayload;
  } catch {
    return null;
  }
}

export async function cerrarSesion() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
