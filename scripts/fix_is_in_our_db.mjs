/**
 * 修复 full_filmography_json 中的 is_in_our_db 标记
 * Run: cd cdrama-database && node scripts/fix_is_in_our_db.mjs
 *
 * 逻辑: 通过 TMDB ID 精确匹配 dramas.tmdb_id,
 *       将我们数据库中存在的剧标记为 is_in_our_db: true
 *
 * 注意: 由于数据库在网络文件系统上, 先复制到本地 /tmp 操作, 再复制回去
 */

import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, copyFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, '..', 'data', 'cdrama.db');
const LOCAL_DB = '/tmp/cdrama_fix.db';

function sqliteQuery(dbPath, sql) {
  const result = execSync(`sqlite3 -json "${dbPath}"`, {
    input: sql,
    maxBuffer: 50 * 1024 * 1024,
    encoding: 'utf-8'
  });
  return result.trim() ? JSON.parse(result) : [];
}

function sqliteRun(dbPath, sql) {
  execSync(`sqlite3 "${dbPath}"`, {
    input: sql,
    maxBuffer: 50 * 1024 * 1024,
    encoding: 'utf-8'
  });
}

async function main() {
  // 1. 复制数据库到本地
  copyFileSync(DB_PATH, LOCAL_DB);
  console.log('Copied database to local /tmp for processing...');

  // 2. 构建 ourSlugs Set 和 tmdbId -> slug 映射
  const dramasRows = sqliteQuery(LOCAL_DB, "SELECT slug, tmdb_id, original_title FROM dramas;");

  const ourSlugs = new Set();
  const tmdbIdToSlug = new Map();
  for (const d of dramasRows) {
    ourSlugs.add(d.slug);
    if (d.tmdb_id) tmdbIdToSlug.set(d.tmdb_id, d.slug);
  }
  console.log(`Database has ${ourSlugs.size} dramas, ${tmdbIdToSlug.size} with TMDB IDs`);

  // 3. 读取全部演员
  const actorsRows = sqliteQuery(LOCAL_DB, "SELECT id, name, full_filmography_json FROM actors;");

  let totalFixed = 0;
  let actorsAffected = 0;
  const sqlLines = [];

  // 4. 逐个演员处理
  for (const actor of actorsRows) {
    let filmography;
    try {
      filmography = JSON.parse(actor.full_filmography_json || '[]');
    } catch {
      continue;
    }
    if (!filmography.length) continue;

    let changed = false;

    for (const entry of filmography) {
      if (entry.is_in_our_db && ourSlugs.has(entry.our_slug)) continue;

      let matchedSlug = null;

      // 策略 1: 通过 TMDB ID 精确匹配
      if (entry.id && tmdbIdToSlug.has(entry.id)) {
        matchedSlug = tmdbIdToSlug.get(entry.id);
      }

      // 策略 2: 已有 our_slug 且有效
      if (!matchedSlug && entry.our_slug && ourSlugs.has(entry.our_slug)) {
        matchedSlug = entry.our_slug;
      }

      if (matchedSlug) {
        if (!entry.is_in_our_db || entry.our_slug !== matchedSlug) {
          entry.is_in_our_db = true;
          entry.our_slug = matchedSlug;
          changed = true;
          totalFixed++;
        }
      }
    }

    if (changed) {
      const jsonStr = JSON.stringify(filmography).replace(/'/g, "''");
      sqlLines.push(`UPDATE actors SET full_filmography_json = '${jsonStr}' WHERE id = ${actor.id};`);
      actorsAffected++;
    }
  }

  // 5. 执行全部 SQL (带事务)
  if (sqlLines.length > 0) {
    const sql = `BEGIN TRANSACTION;\n${sqlLines.join('\n')}\nCOMMIT;\n`;
    console.log(`Executing ${sqlLines.length} UPDATE statements in transaction...`);
    sqliteRun(LOCAL_DB, sql);
  }

  // 6. 复制回网络文件系统
  copyFileSync(LOCAL_DB, DB_PATH);
  console.log('Copied database back to network storage.');

  // 7. 清理
  try { unlinkSync(LOCAL_DB); } catch {}

  console.log(`\nDone. Fixed ${totalFixed} entries across ${actorsAffected} actors.`);
}

main().catch(console.error);
