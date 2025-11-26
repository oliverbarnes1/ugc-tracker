import type { NextApiRequest, NextApiResponse } from 'next'
import { normalizeApifyItem } from '../../src/lib/apify'
import { db } from '../../src/lib/db'

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

    // Determine which ID to use (Task ID takes priority)
    const idToUse = taskId || actorId
    const isTask = !!taskId || (actorId && !/^[a-zA-Z0-9._-]+~[a-zA-Z0-9._-]+$/.test(actorId) && !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(actorId))

    // Start the run
    let runId: string
    if (isTask) {
      console.log(`[sync] Starting Task: ${idToUse}`)
      const taskUrl = `https://api.apify.com/v2/actor-tasks/${idToUse}/runs?token=${token}`
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
      runId = taskData?.data?.id || taskData?.id || taskData?.data?.runId
      if (!runId) return res.status(500).json({ error: 'Apify Task run started but no runId in response', raw: taskData })
    } else {
      const actorUrl = `https://api.apify.com/v2/acts/${idToUse}/runs?token=${token}`
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
        return res.status(500).json({ error: { type, message } })
      }
      const data: any = await response.json().catch(() => ({}))
      runId = data?.data?.id || data?.id || data?.data?.runId
      if (!runId) {
        return res.status(500).json({ error: 'Apify run started but no runId in response', raw: data })
      }
    }

    console.log(`[sync] Run started: ${runId}, waiting for completion...`)

    // Wait for the run to complete (polling)
    const maxWaitTime = 600000 // 10 minutes
    const pollInterval = 5000 // 5 seconds
    const startTime = Date.now()
    let datasetId: string | null = null

    while (Date.now() - startTime < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, pollInterval))
      
      const statusUrl = `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`
      const statusResp = await fetch(statusUrl)
      if (!statusResp.ok) {
        console.error(`[sync] Failed to check run status: ${statusResp.status}`)
        continue
      }
      
      const statusData: any = await statusResp.json().catch(() => ({}))
      const status = statusData?.data?.status
      console.log(`[sync] Run status: ${status}`)
      
      if (status === 'SUCCEEDED') {
        datasetId = statusData?.data?.defaultDatasetId
        break
      } else if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
        return res.status(500).json({ error: `Run ${status.toLowerCase()}` })
      }
    }

    if (!datasetId) {
      return res.status(500).json({ error: 'Run did not complete within timeout period' })
    }

    console.log(`[sync] Run completed, fetching dataset: ${datasetId}`)

    // Fetch dataset items
    const datasetUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}`
    const datasetResp = await fetch(datasetUrl)
    if (!datasetResp.ok) {
      return res.status(500).json({ error: 'Failed to fetch dataset' })
    }
    const items: any[] = await datasetResp.json().catch(() => [])
    console.log(`[sync] Fetched ${items.length} items from dataset`)

    // Get active creators
    const creators = await db.all(`
      SELECT id, external_id, platform, username, display_name, is_active
      FROM creators 
      WHERE is_active = 1 AND platform = 'tiktok'
    `) as Array<{ id: number; external_id: string; username: string }>

    if (creators.length === 0) {
      return res.status(200).json({ ok: true, runId, items: items.length, imported: 0, note: 'No active creators found' })
    }

    // Purge existing data
    const creatorIds = creators.map(c => c.id)
    const placeholders = creatorIds.map(() => '?').join(',')
    await db.run(`DELETE FROM post_stats WHERE post_id IN (SELECT id FROM posts WHERE creator_id IN (${placeholders}))`, creatorIds)
    await db.run(`DELETE FROM post_stats_original WHERE post_id IN (SELECT id FROM posts WHERE creator_id IN (${placeholders}))`, creatorIds)
    await db.run(`DELETE FROM posts WHERE creator_id IN (${placeholders})`, creatorIds)

    // Import new data
    let imported = 0
    const creatorMap = new Map(creators.map(c => [c.external_id.toLowerCase(), c.id]))
    
    for (const item of items) {
      const authorHandle = (item.authorMeta?.name || item.author?.uniqueId || '').toLowerCase().replace('@', '')
      const creator = creators.find(c => c.external_id.toLowerCase() === authorHandle || c.username.toLowerCase() === authorHandle)
      
      if (!creator) {
        // Try database lookup as fallback
        const dbCreator = await db.get(`SELECT id FROM creators WHERE LOWER(external_id) = LOWER(?) OR LOWER(username) = LOWER(?)`, [authorHandle, authorHandle]) as { id: number } | undefined
        if (!dbCreator) continue
        const normalized = normalizeApifyItem(item, dbCreator.id)
        if (!normalized) continue
        
        // Insert post
        const postResult = await db.run(`
          INSERT INTO posts (creator_id, external_id, platform, content_type, caption, media_url, thumbnail_url, post_url, published_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          normalized.post.creator_id,
          normalized.post.external_id,
          normalized.post.platform,
          normalized.post.content_type,
          normalized.post.caption,
          normalized.post.media_url,
          normalized.post.thumbnail_url,
          normalized.post.post_url,
          normalized.post.published_at
        ])
        
        const postId = postResult.lastInsertRowid
        if (postId) {
          await db.run(`
            INSERT INTO post_stats (post_id, likes, comments, shares, views, saves, engagement_rate)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [postId, normalized.stat.likes, normalized.stat.comments, normalized.stat.shares, normalized.stat.views, null, normalized.stat.engagement_rate])
          imported++
        }
        continue
      }

      const normalized = normalizeApifyItem(item, creator.id)
      if (!normalized) continue
      
      // Insert post
      const postResult = await db.run(`
        INSERT INTO posts (creator_id, external_id, platform, content_type, caption, media_url, thumbnail_url, post_url, published_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        normalized.post.creator_id,
        normalized.post.external_id,
        normalized.post.platform,
        normalized.post.content_type,
        normalized.post.caption,
        normalized.post.media_url,
        normalized.post.thumbnail_url,
        normalized.post.post_url,
        normalized.post.published_at
      ])
      
      const postId = postResult.lastInsertRowid
      if (postId) {
        await db.run(`
          INSERT INTO post_stats (post_id, likes, comments, shares, views, saves, engagement_rate)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [postId, normalized.stat.likes, normalized.stat.comments, normalized.stat.shares, normalized.stat.views, null, normalized.stat.engagement_rate])
        imported++
      }
    }

    console.log(`[sync] Imported ${imported} posts`)
    return res.status(200).json({ ok: true, runId, items: items.length, imported })
  } catch (err) {
    console.error('[sync] error', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return res.status(500).json({ error: message })
  }
}


