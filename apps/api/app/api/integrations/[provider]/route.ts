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

const icmpSettingsSchema = z.object({
  intervalSec: z.coerce.number().int().min(30).max(86400).optional(),
  timeoutSec: z.coerce.number().int().min(1).max(60).optional(),
  retries: z.coerce.number().int().min(1).max(10).optional(),
  historyRetentionDays: z.coerce.number().int().min(1).max(3650).optional(),
});

function getDefaultConfig(provider: string) {
  const defaults: Record<string, { enabled: boolean; settings: Record<string, unknown> }> = {
    icmp: {
      enabled: true,
      settings: { intervalSec: 120, timeoutSec: 3, retries: 2, historyRetentionDays: 30 },
    },
  };

  return defaults[provider] ?? { enabled: false, settings: {} };
}

function normalizeProviderSettings(provider: string, settings: Record<string, unknown> | undefined) {
  if (!settings) {
    return undefined;
  }

  if (provider === 'icmp') {
    return icmpSettingsSchema.parse(settings);
  }

  return settings;
}

type Params = { params: Promise<{ provider: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  return withErrorHandling(async () => {
    const { provider } = await params;
    await requireAdmin(request);
    const config = await prisma.integrationConfig.findUnique({ where: { provider } });
    if (!config) {
      const def = getDefaultConfig(provider);
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
    const normalizedSettings = normalizeProviderSettings(provider, body.settings);
    const config = await prisma.integrationConfig.upsert({
      where: { provider },
      create: {
        provider,
        enabled: body.enabled ?? false,
        settings: (normalizedSettings ?? {}) as object,
      },
      update: {
        ...(body.enabled !== undefined && { enabled: body.enabled }),
        ...(normalizedSettings !== undefined && { settings: normalizedSettings as object }),
      },
    });
    return ok({ data: config });
  });
}
