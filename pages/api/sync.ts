import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const token = process.env.APIFY_TOKEN
    const taskId = process.env.APIFY_TASK_ID

    if (!token || !taskId) {
      return res.status(500).json({ error: 'Missing APIFY_TOKEN or APIFY_TASK_ID' })
    }

    const url = `https://api.apify.com/v2/actor-tasks/${taskId}/runs?token=${token}`
    const response = await fetch(url, { method: 'POST' })

    if (!response.ok) {
      const text = await response.text()
      return res.status(500).json({ error: text || 'Failed to start Apify task' })
    }

    const data = await response.json()
    const runId = data?.data?.id

    return res.status(200).json({ runId })
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unknown error' })
  }
}


