/**
 * 计算全部演员的 Frequent Collaborators
 * Run: cd cdrama-database && node scripts/compute_collaborations.mjs
 *
 * 逻辑: 通过 actors.dramas_json 反向索引,
 *       统计任意两名演员共同出演的剧集数量。
 * 输出: collaborations_json = [{name, slug, count}], count >= 2
 *
 * 注意: 由于数据库在网络文件系统上, 先复制到本地 /tmp 操作, 再复制回去
 */

import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, copyFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, '..', 'data', 'cdrama.db');
const LOCAL_DB = '/tmp/cdrama_work.db';
const MIN_COLLAB_COUNT = 2;

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
  // 1. 复制数据库到本地文件系统
  copyFileSync(DB_PATH, LOCAL_DB);
  console.log('Copied database to local /tmp for processing...');

  // 2. 读取全部演员
  const rows = sqliteQuery(LOCAL_DB, "SELECT id, slug, name, names_json, dramas_json FROM actors;");
  console.log(`Loaded ${rows.length} actors.`);

  // 3. 构建反向索引
  const dramaToActors = new Map(); // dramaSlug -> [{id, slug, displayName}]
  const actorDramaMap = new Map(); // actorId -> [dramaSlug]
  const slugToName = new Map();    // actorSlug -> displayName

  for (const row of rows) {
    const actorId = row.id;
    const actorSlug = row.slug;
    const displayName = getDisplayName(row.names_json, row.name);
    slugToName.set(actorSlug, displayName);

    let dramas = [];
    try { dramas = JSON.parse(row.dramas_json || '[]'); } catch { continue; }

    actorDramaMap.set(actorId, []);

    for (const d of dramas) {
      const slug = typeof d === 'string' ? d : d.slug;
      if (!slug) continue;

      if (!dramaToActors.has(slug)) dramaToActors.set(slug, []);
      dramaToActors.get(slug).push({ id: actorId, slug: actorSlug, name: displayName });
      actorDramaMap.get(actorId).push(slug);
    }
  }

  console.log(`Built reverse index: ${dramaToActors.size} dramas with actor data.`);

  // 4. 为每个演员计算 collaborations, 构建 SQL
  let actorsWithCollabs = 0;
  const sqlLines = ['BEGIN TRANSACTION;'];

  for (const row of rows) {
    const actorId = row.id;
    const collabCount = new Map();

    const myDramas = actorDramaMap.get(actorId) || [];
    for (const dramaSlug of myDramas) {
      const coActors = dramaToActors.get(dramaSlug) || [];
      for (const co of coActors) {
        if (co.id === actorId) continue;
        collabCount.set(co.slug, (collabCount.get(co.slug) || 0) + 1);
      }
    }

    const collaborations = [...collabCount.entries()]
      .filter(([, count]) => count >= MIN_COLLAB_COUNT)
      .sort((a, b) => b[1] - a[1])
      .map(([slug, count]) => ({
        name: slugToName.get(slug) || slug,
        slug,
        count
      }));

    if (collaborations.length > 0) actorsWithCollabs++;

    const jsonStr = JSON.stringify(collaborations).replace(/'/g, "''");
    sqlLines.push(`UPDATE actors SET collaborations_json = '${jsonStr}' WHERE id = ${actorId};`);
  }

  sqlLines.push('COMMIT;');

  // 5. 执行全部 SQL
  const sqlFile = '/tmp/collabs_update.sql';
  writeFileSync(sqlFile, sqlLines.join('\n') + '\n', 'utf-8');
  console.log(`Generated ${rows.length} UPDATE statements in transaction. Executing...`);

  sqliteRun(LOCAL_DB, `BEGIN TRANSACTION;\n${sqlLines.slice(1, -1).join('\n')}\nCOMMIT;\n`);

  // 6. 复制回网络文件系统
  copyFileSync(LOCAL_DB, DB_PATH);
  console.log('Copied database back to network storage.');

  // 7. 清理
  try { unlinkSync(LOCAL_DB); } catch {}
  try { unlinkSync(sqlFile); } catch {}

  console.log(`\nDone. Updated ${rows.length} actors.`);
  console.log(`${actorsWithCollabs} actors have at least one collaborator with count >= ${MIN_COLLAB_COUNT}.`);
}

function getDisplayName(namesJson, fallbackName) {
  try {
    const names = typeof namesJson === 'string' ? JSON.parse(namesJson) : namesJson;
    return names?.en || fallbackName || '';
  } catch {
    return fallbackName || '';
  }
}

main().catch(console.error);
