import { runJoshEventPlanner, type JoshPlannerRequest } from '../_lib/joshPlanner.js';

interface VercelRequestLike {
  method?: string;
  body?: unknown;
}

interface VercelResponseLike {
  status: (code: number) => VercelResponseLike;
  json: (body: unknown) => void;
  end: () => void;
}

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = (req.body ?? {}) as JoshPlannerRequest;
    if (!body.message || !String(body.message).trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }
    const result = await runJoshEventPlanner(body);
    return res.status(200).json(result);
  } catch (err) {
    console.error('[/api/ai/event-planner] Error:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Josh AI failed to generate a plan.',
    });
  }
}
