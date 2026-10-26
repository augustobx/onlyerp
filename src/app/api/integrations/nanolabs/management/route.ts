import prisma from '@/lib/prisma';
import { authenticateBearer, authenticateSignature, limitedBody, rootSchema, HubError } from '@/lib/hub-contract';
import { createHubManagement } from '@/lib/hub-management';
import { hubFailure, hubHeaders } from '@/lib/hub-http';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const management = createHubManagement(prisma);
export async function GET(req: Request) {
  try {
    const key = authenticateBearer(req, 'management'); authenticateSignature(req, '', key);
    const data = await management.read(new URL(req.url).searchParams);
    return Response.json({ success: true, contract: 'nanolabs.saas.management.v1', product: 'onlyerp', data }, { headers: hubHeaders });
  } catch (e) { return hubFailure(e); }
}
export async function POST(req: Request) {
  try {
    const key = authenticateBearer(req, 'management');
    if (!req.headers.get('content-type')?.startsWith('application/json')) throw new HubError(415, 'CONTENT_TYPE', 'Se requiere JSON.');
    const body = await limitedBody(req), actor = authenticateSignature(req, body, key), cmd = rootSchema.parse(JSON.parse(body));
    if (cmd.actor !== actor) throw new HubError(403, 'ACTOR', 'La identidad no coincide con la firma.');
    const data = await management.command(cmd, key);
    return Response.json({ success: true, contract: 'nanolabs.saas.management.v1', product: 'onlyerp', requestId: cmd.requestId, data }, { headers: hubHeaders });
  } catch (e) { return hubFailure(e); }
}
