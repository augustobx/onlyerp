import { ZodError } from 'zod';
import { HubError } from './hub-contract';
export const hubHeaders = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
export function hubFailure(error: unknown) {
  if (error instanceof HubError) return Response.json({ success: false, code: error.code, error: error.message }, { status: error.status, headers: hubHeaders });
  if (error instanceof ZodError || error instanceof SyntaxError || error instanceof TypeError) return Response.json({ success: false, code: 'INVALID_INPUT', error: 'Los datos de la solicitud no son válidos.' }, { status: 422, headers: hubHeaders });
  // Never return/log SQL, request bodies, passwords, tokens or raw Prisma errors.
  const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' && /^P\d{4}$/.test(error.code) ? error.code : 'UNEXPECTED';
  console.error('[hub-integration]', code);
  return Response.json({ success: false, code: 'UNAVAILABLE', error: 'No se confirmó la operación. Conservá su identificador al reintentar.' }, { status: 503, headers: hubHeaders });
}
