import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = process.env.APIFY_TOKEN
  const taskId = process.env.APIFY_TASK_ID

  return res.status(200).json({
    ok: true,
    hasAPIFY_TOKEN: Boolean(token && token.length > 10),
    hasAPIFY_TASK_ID: Boolean(taskId),
    apifyUrlPreview: taskId ? `https://api.apify.com/v2/actor-tasks/${taskId}/runs?token=***` : null,
    nodeVersion: process.version,
    env: process.env.VERCEL ? 'vercel' : 'local'
  })
}


