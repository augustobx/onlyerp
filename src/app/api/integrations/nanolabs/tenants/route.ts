import prisma from '@/lib/prisma';
import { authenticateBearer, HubError } from '@/lib/hub-contract';
import { createHubManagement } from '@/lib/hub-management';
import { hubFailure, hubHeaders } from '@/lib/hub-http';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const management = createHubManagement(prisma);
export async function GET(req: Request) {
  try {
    authenticateBearer(req, 'read');
    const offset = new URL(req.url).searchParams.get('offset') || '0';
    if (!/^\d{1,6}$/.test(offset)) throw new HubError(422, 'INVALID_INPUT', 'Paginación inválida.');
    const data = await management.readTenants(Number(offset));
    return Response.json({ success: true, contract: 'nanolabs.saas.tenants.v1', product: 'onlyerp', capturedAt: new Date().toISOString(), capabilities: { tenantsRead: true, tenantWrite: false, moduleWrite: false }, ...data }, { headers: hubHeaders });
  } catch (e) { return hubFailure(e); }
}
