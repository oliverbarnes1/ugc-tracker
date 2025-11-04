import { createClient } from '@libsql/client';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url || !authToken) {
      return NextResponse.json(
        { ok: false, error: 'Turso envs missing' },
        { status: 500 }
      );
    }

    const client = createClient({
      url,
      authToken,
    });

    // Check if creators table exists
    let tableExists = false;
    try {
      const tableCheck = await client.execute(`
        SELECT name FROM sqlite_schema 
        WHERE type='table' AND name='creators'
      `);
      tableExists = tableCheck.rows.length > 0;
    } catch (err) {
      // Table doesn't exist
      tableExists = false;
    }

    if (!tableExists) {
      return NextResponse.json({
        ok: true,
        items: [],
        count: 0,
        note: 'creators table missing',
      });
    }

    // Query creators with calculated fields
    const result = await client.execute(`
      SELECT 
        c.id,
        c.username,
        c.display_name,
        c.follower_count as followers,
        COALESCE((
          SELECT COUNT(*) 
          FROM posts 
          WHERE creator_id = c.id
        ), 0) as posts_count,
        (
          SELECT MAX(published_at) 
          FROM posts 
          WHERE creator_id = c.id
        ) as last_post_at,
        c.created_at
      FROM creators c
      ORDER BY COALESCE(
        (SELECT MAX(published_at) FROM posts WHERE creator_id = c.id),
        c.created_at
      ) DESC
      LIMIT 50
    `);

    const items = result.rows.map((row: any) => ({
      id: row.id,
      username: row.username,
      display_name: row.display_name,
      followers: row.followers ?? 0,
      posts_count: row.posts_count ?? 0,
      last_post_at: row.last_post_at ?? null,
    }));

    return NextResponse.json({
      ok: true,
      items,
      count: items.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Creators API error:', message);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}

