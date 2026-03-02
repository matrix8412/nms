import { prisma } from '@nms/db';
import { requireAdmin } from '@/lib/auth/session';
import { withErrorHandling } from '@/lib/route';
import { ok } from '@/lib/response';
import { parseBody } from '@/lib/validation';
import { assertCsrf } from '@/lib/auth/csrf';
import { z } from 'zod';
import type { NextRequest } from 'next/server';

const upsertSchema = z.object({
  enabled: z.boolean().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

type Params = { params: Promise<{ provider: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  return withErrorHandling(async () => {
    const { provider } = await params;
    await requireAdmin(request);
    const config = await prisma.integrationConfig.findUnique({ where: { provider } });
    if (!config) {
      // Return sensible defaults per provider
      const defaults: Record<string, { enabled: boolean; settings: Record<string, unknown> }> = {
        icmp: {
          enabled: true,
          settings: { intervalSec: 120, timeoutSec: 3, retries: 2 },
        },
      };
      const def = defaults[provider] ?? { enabled: false, settings: {} };
      return ok({
        data: { provider, enabled: def.enabled, settings: def.settings },
      });
    }
    return ok({ data: config });
  });
}

export async function PUT(request: NextRequest, { params }: Params) {
  return withErrorHandling(async () => {
    const { provider } = await params;
    const session = await requireAdmin(request);
    assertCsrf(request, session.csrfSecret);
    const body = await parseBody(request, upsertSchema);
    const config = await prisma.integrationConfig.upsert({
      where: { provider },
      create: {
        provider,
        enabled: body.enabled ?? false,
        settings: (body.settings ?? {}) as object,
      },
      update: {
        ...(body.enabled !== undefined && { enabled: body.enabled }),
        ...(body.settings !== undefined && { settings: body.settings as object }),
      },
    });
    return ok({ data: config });
  });
}
