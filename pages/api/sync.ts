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

    // If only Task ID is provided, use it directly
    if (!actorId && taskId) {
      const taskUrl = `https://api.apify.com/v2/actor-tasks/${taskId}/runs?token=${token}`
      const taskResp = await fetch(taskUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({})
      })
      if (!taskResp.ok) {
        const taskErr = await taskResp.text().catch(() => '')
        console.error('[sync] Apify Task run failed', { status: taskResp.status, url: taskUrl, body: taskErr })
        return res.status(500).json({ error: 'Apify run failed', details: (taskErr || '').slice(0, 500) })
      }
      const taskData: any = await taskResp.json().catch(() => ({}))
      const taskRunId = taskData?.id || taskData?.data?.id || taskData?.data?.runId
      if (!taskRunId) {
        return res.status(500).json({ error: 'Apify Task run started but no runId in response', raw: taskData })
      }
      return res.status(200).json({ ok: true, runId: taskRunId })
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

      // If actor not found and taskId provided, fallback to Task run
      if (response.status === 404 && type === 'record-not-found' && taskId) {
        const taskUrl = `https://api.apify.com/v2/actor-tasks/${taskId}/runs?token=${token}`
        const taskResp = await fetch(taskUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({})
        })
        if (!taskResp.ok) {
          const taskErr = await taskResp.text().catch(() => '')
          console.error('[sync] Apify Task run failed', { status: taskResp.status, url: taskUrl, body: taskErr })
          return res.status(500).json({ error: 'Apify run failed', details: (taskErr || '').slice(0, 500) })
        }
        const taskData: any = await taskResp.json().catch(() => ({}))
        const taskRunId = taskData?.id || taskData?.data?.id || taskData?.data?.runId
        if (!taskRunId) {
          return res.status(500).json({ error: 'Apify Task run started but no runId in response', raw: taskData })
        }
        return res.status(200).json({ ok: true, runId: taskRunId })
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


