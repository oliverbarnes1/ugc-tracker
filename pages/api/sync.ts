import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  console.log('[sync] starting run', new Date().toISOString())

  try {
    const token = process.env.APIFY_TOKEN
    const actorId = process.env.APIFY_ACTOR_ID

    const missing: string[] = []
    if (!token || token.length <= 10) missing.push('APIFY_TOKEN')
    if (!actorId) missing.push('APIFY_ACTOR_ID')
    if (missing.length > 0) {
      return res.status(400).json({ error: `Missing env: ${missing.join(', ')}` })
    }

    const actorUrl = `https://api.apify.com/v2/acts/${actorId}/runs?token=${token}`
    const response = await fetch(actorUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({})
    })

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '')
      let parsed: any = null
      try { parsed = JSON.parse(bodyText) } catch {}
      const type = parsed?.error?.type || parsed?.type
      const message = parsed?.error?.message || parsed?.message || bodyText

      if (response.status === 404 && type === 'record-not-found') {
        // Provide clear, actionable guidance for fixing Actor ID
        return res.status(400).json({
          error: 'Apify Actor not found',
          details: {
            message: message || 'Actor was not found',
            actorId,
            actorUrl,
            howToFix: [
              'Use the exact Actor ID from Apify → Actor → API tab (acts/<ID>/runs)',
              'Accepted formats: username~actor-name or the Actor UUID',
              'Ensure APIFY_TOKEN belongs to an account with access to this Actor',
            ]
          }
        })
      }

      console.error('[sync] Apify Actor run failed', { status: response.status, url: actorUrl, type, message })
      return res.status(500).json({ error: { type, message } })
    }

    const data: any = await response.json().catch(() => ({}))
    const runId = data?.id || data?.data?.id || data?.data?.runId

    if (!runId) {
      return res.status(500).json({ error: 'Apify run started but no runId in response', raw: data })
    }

    return res.status(200).json({ ok: true, runId })
  } catch (err) {
    console.error('[sync] error', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}


