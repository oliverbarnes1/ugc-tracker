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

    // Extract hostname from URL (e.g., "database-name-org.turso.io" from "libsql://database-name-org.turso.io")
    let dbHost = '';
    try {
      const urlObj = new URL(url.replace(/^libsql:/, 'https:'));
      dbHost = urlObj.hostname;
    } catch {
      // Fallback: extract hostname manually if URL parsing fails
      const match = url.match(/libsql:\/\/([^\/]+)/);
      dbHost = match ? match[1] : url;
    }

    const client = createClient({
      url,
      authToken,
    });

    // Get table names
    const tablesResult = await client.execute(`
      SELECT name 
      FROM sqlite_schema 
      WHERE type='table' 
      ORDER BY name
    `);
    const tables = tablesResult.rows.map((row: any) => row.name);

    // Get row counts for specific tables
    const tableNames = ['creators', 'posts', 'post_stats', 'creator_stats_daily', 'sync_logs'];
    const counts: Record<string, number | null> = {};
    
    for (const tableName of tableNames) {
      try {
        const countResult = await client.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
        counts[tableName] = countResult.rows[0]?.count as number ?? null;
      } catch (err) {
        counts[tableName] = null;
      }
    }

    // Get sample creators (up to 3 rows)
    let samples: any[] = [];
    if (tables.includes('creators')) {
      try {
        const samplesResult = await client.execute(`
          SELECT id, username, display_name, follower_count 
          FROM creators 
          LIMIT 3
        `);
        samples = samplesResult.rows.map((row: any) => ({
          id: row.id,
          username: row.username,
          display_name: row.display_name,
          followers: row.follower_count ?? 0,
        }));
      } catch (err) {
        // Table exists but query failed
        samples = [];
      }
    }

    return NextResponse.json({
      ok: true,
      envCheck: {
        hasUrl: !!url,
        hasToken: !!authToken,
      },
      dbHost,
      tables,
      counts,
      samples,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('DB health check error:', message);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}

