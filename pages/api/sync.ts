import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  console.log('[sync] starting run', new Date().toISOString())

  try {
    const token = process.env.APIFY_TOKEN
    const taskId = process.env.APIFY_TASK_ID

    const missing: string[] = []
    if (!token || token.length <= 10) missing.push('APIFY_TOKEN')
    if (!taskId) missing.push('APIFY_TASK_ID')
    if (missing.length > 0) {
      return res.status(400).json({ error: `Missing env: ${missing.join(', ')}` })
    }

    const url = `https://api.apify.com/v2/actor-tasks/${taskId}/runs?token=${token}`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({})
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      console.error('[sync] Apify run failed', { status: response.status, url, body })
      return res.status(500).json({
        error: 'Apify run failed',
        status: response.status,
        details: (body || '').slice(0, 300)
      })
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


