import type { IncomingMessage, ServerResponse } from 'http';
import { createSupabaseApiRouter, type ApiRequest, type ApiResponse } from './_lib/supabaseApi.js';

const apiRouter = createSupabaseApiRouter();
const MAX_BODY_BYTES = 12 * 1024 * 1024; // 12 MB

type VercelRequestLike = IncomingMessage & {
  body?: unknown;
  query?: Record<string, unknown>;
};

type VercelResponseLike = ServerResponse & {
  status?: (code: number) => VercelResponseLike;
  json?: (payload: unknown) => unknown;
};

async function readJsonBody(req: VercelRequestLike): Promise<unknown> {
  const method = (req.method || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return {};
  }

  // First check if the Vercel runtime already parsed req.body
  try {
    const existing = req.body;
    if (existing !== undefined && existing !== null) {
      if (typeof existing === 'string') {
        const trimmed = existing.trim();
        return trimmed ? JSON.parse(trimmed) : {};
      }
      if (Buffer.isBuffer(existing)) {
        const text = existing.toString('utf8').trim();
        return text ? JSON.parse(text) : {};
      }
      if (typeof existing === 'object') {
        return existing;
      }
    }
  } catch {
    // Fall through to stream read if getter threw
  }

  if (req.readableEnded) {
    return {};
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buf.length;
    if (totalBytes > MAX_BODY_BYTES) {
      throw Object.assign(new Error('Request payload exceeds 12MB limit.'), { status: 413 });
    }
    chunks.push(buf);
  }

  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw Object.assign(new Error('Invalid JSON request body.'), { status: 400 });
  }
}

function createApiResponse(res: VercelResponseLike): ApiResponse {
  let statusCode = res.statusCode || 200;
  const wrapped: ApiResponse = {
    get headersSent() {
      return res.headersSent;
    },
    status(code: number) {
      statusCode = code;
      res.statusCode = code;
      return wrapped;
    },
    json(payload: unknown) {
      if (!res.headersSent) {
        res.statusCode = statusCode;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(payload));
      }
      return wrapped;
    },
  };
  return wrapped;
}

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  const apiRes = createApiResponse(res);
  try {
    const rawUrl = req.url || '/';
    const parsed = new URL(rawUrl, 'http://localhost');

    let targetPath = parsed.pathname;
    const subpath = parsed.searchParams.get('__subpath');
    if (subpath !== null) {
      parsed.searchParams.delete('__subpath');
      targetPath = `/${subpath.replace(/^\/+/, '')}`;
    } else if (targetPath === '/api/db' || targetPath.startsWith('/api/db/')) {
      targetPath = targetPath.slice('/api/db'.length) || '/';
    }

    const query: Record<string, string> = {};
    parsed.searchParams.forEach((v, k) => {
      if (k !== '__subpath') query[k] = v;
    });
    const remainingQs = parsed.searchParams.toString();
    const normalizedUrl = `${targetPath}${remainingQs ? `?${remainingQs}` : ''}`;

    const body = await readJsonBody(req);
    const forwarded = req.headers['x-forwarded-for'];
    const ip =
      (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : undefined) ||
      req.socket?.remoteAddress ||
      'unknown';

    const apiReq: ApiRequest = {
      method: (req.method || 'GET').toUpperCase(),
      url: normalizedUrl,
      headers: (req.headers || {}) as Record<string, string | string[] | undefined>,
      params: {},
      query,
      body,
      ip,
    };

    await apiRouter.handle(apiReq, apiRes);
  } catch (err) {
    console.error('[Vercel /api/db error]:', err);
    if (!apiRes.headersSent) {
      const status =
        typeof (err as { status?: number })?.status === 'number'
          ? (err as { status: number }).status
          : 500;
      apiRes.status(status).json({
        error: err instanceof Error ? err.message : 'Unexpected server error.',
      });
    }
  }
}
