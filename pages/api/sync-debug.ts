import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = process.env.APIFY_TOKEN
  const actorId = process.env.APIFY_ACTOR_ID

  return res.status(200).json({
    ok: true,
    hasAPIFY_TOKEN: Boolean(token && token.length > 10),
    hasAPIFY_ACTOR_ID: Boolean(actorId),
    apifyUrlPreview: actorId ? `https://api.apify.com/v2/acts/${actorId}/runs?token=***` : null,
    nodeVersion: process.version,
    env: process.env.VERCEL ? 'vercel' : 'local'
  })
}


