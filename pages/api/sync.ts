import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  console.log('[sync] starting run', new Date().toISOString())

  try {
    const token = process.env.APIFY_TOKEN
    const actorId = process.env.APIFY_ACTOR_ID
    const taskId = process.env.APIFY_TASK_ID

    const missing: string[] = []
    if (!token || token.length <= 10) missing.push('APIFY_TOKEN')
    if (!actorId && !taskId) missing.push('APIFY_ACTOR_ID or APIFY_TASK_ID')
    if (missing.length > 0) {
      return res.status(400).json({ error: `Missing env: ${missing.join(', ')}` })
    }

    // If Task ID is provided without Actor ID, run the Task directly
    if (!actorId && taskId) {
      const taskUrl = `https://api.apify.com/v2/actor-tasks/${taskId}/runs?token=${token}`
      const taskResp = await fetch(taskUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({})
      })
      if (!taskResp.ok) {
        const bodyText = await taskResp.text().catch(() => '')
        return res.status(500).json({ error: 'Apify Task run failed', details: bodyText.slice(0, 500) })
      }
      const taskData: any = await taskResp.json().catch(() => ({}))
      const taskRunId = taskData?.id || taskData?.data?.id || taskData?.data?.runId
      if (!taskRunId) return res.status(500).json({ error: 'Apify Task run started but no runId in response', raw: taskData })
      return res.status(200).json({ ok: true, runId: taskRunId })
    }

    // Otherwise, validate and run Actor
    // Validate Actor ID format (should be username~actor-name or UUID)
    const isValidActorFormat = actorId ? (
      /^[a-zA-Z0-9._-]+~[a-zA-Z0-9._-]+$/.test(actorId) ||
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(actorId)
    ) : false
    if (!isValidActorFormat) {
      // If the supplied "actorId" looks like a Task ID, try running it as a Task for convenience
      if (actorId) {
        const possibleTaskUrl = `https://api.apify.com/v2/actor-tasks/${actorId}/runs?token=${token}`
        const tResp = await fetch(possibleTaskUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({})
        })
        if (tResp.ok) {
          const tData: any = await tResp.json().catch(() => ({}))
          const tRunId = tData?.id || tData?.data?.id || tData?.data?.runId
          if (tRunId) {
            return res.status(200).json({ ok: true, runId: tRunId })
          }
        }
      }

      return res.status(400).json({
        error: 'Invalid Actor ID format',
        details: {
          message: `The Actor ID "${actorId}" doesn't match the expected format`,
          actorId,
          expectedFormats: [
            'username~actor-name (e.g., apify~tiktok-scraper)',
            'Actor UUID (e.g., 12345678-abcd-1234-abcd-123456789abc)'
          ],
          howToFix: [
            'Go to Apify → Actors → Your Actor → API tab',
            'Copy the exact ID from the Run URL: https://api.apify.com/v2/acts/<ACTOR_ID>/runs',
            'The ID should look like: username~actor-name or a UUID',
            'If you see a short ID, it may be a Task ID. Set APIFY_TASK_ID to use it, or keep APIFY_ACTOR_ID empty and the API will accept a Task ID automatically.'
          ]
        }
      })
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


