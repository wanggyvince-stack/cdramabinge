#!/usr/bin/env node
/**
 * Hotfix: Actor Pinyin/Name Corrections v1.1
 * Date: 2026-08-19
 * 
 * Fixes A/B/C/D class issues from the hotfix workorder.
 */

import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = `file:${path.resolve(__dirname, '..', 'data', 'cdrama.db')}`;

const db = createClient({ url: DB_PATH });

async function executeHotfix() {
  console.log('Starting actor hotfix v1.1...\n');

  // A. 英文名完全错误（2处）
  console.log('=== A. 英文名完全错误 ===');
  
  await db.execute({
    sql: `UPDATE actors SET name = 'Tan Jianci', names_json = json_set(names_json, '$.en', 'Tan Jianci') WHERE slug = 'tan-jianci'`,
    args: []
  });
  console.log('✓ #1 tan-jianci: Dang Wei → Tan Jianci');

  await db.execute({
    sql: `UPDATE actors SET name = 'Jiang Xin', names_json = json_set(names_json, '$.en', 'Jiang Xin') WHERE slug = 'jiang-xin'`,
    args: []
  });
  console.log('✓ #2 jiang-xin: Jiang Shan → Jiang Xin');

  // B. 拼音拼写错误（9处）
  console.log('\n=== B. 拼音拼写错误 ===');

  await db.execute({
    sql: `UPDATE actors SET name = 'Ao Ruipeng', names_json = json_set(names_json, '$.en', 'Ao Ruipeng') WHERE slug = 'ao-ruipeng'`,
    args: []
  });
  console.log('✓ #3 ao-ruipeng: Ao Ruihao → Ao Ruipeng');

  // #4: 陈幽篁 - slug 也要改
  await db.execute({
    sql: `UPDATE actors SET slug = 'chen-youhuang', name = 'Chen Youhuang', names_json = json_set(names_json, '$.en', 'Chen Youhuang') WHERE slug = '陈幽篁'`,
    args: []
  });
  console.log('✓ #4 陈幽篁 → chen-youhuang: Chen Youwang → Chen Youhuang');

  await db.execute({
    sql: `UPDATE actors SET name = 'Huang Riying', names_json = json_set(names_json, '$.en', 'Huang Riying') WHERE slug = 'huang-riying'`,
    args: []
  });
  console.log('✓ #5 huang-riying: Huang Riyng → Huang Riying');

  await db.execute({
    sql: `UPDATE actors SET name = 'Hui Qiuqiu', names_json = json_set(names_json, '$.en', 'Hui Qiuqiu') WHERE slug = 'hui-qiuqiu'`,
    args: []
  });
  console.log('✓ #6 hui-qiuqiu: Hui Ziqiu → Hui Qiuqiu');

  // #7: liu-yihan → liu-yihang
  await db.execute({
    sql: `UPDATE actors SET slug = 'liu-yihang', name = 'Liu Yihang', names_json = json_set(names_json, '$.en', 'Liu Yihang') WHERE slug = 'liu-yihan'`,
    args: []
  });
  console.log('✓ #7 liu-yihan → liu-yihang: Liu Yihan → Liu Yihang');

  // #8: song-zuoer → song-zuer
  await db.execute({
    sql: `UPDATE actors SET slug = 'song-zuer', name = 'Song Zuer', names_json = json_set(names_json, '$.en', 'Song Zuer') WHERE slug = 'song-zuoer'`,
    args: []
  });
  console.log('✓ #8 song-zuoer → song-zuer: Song Zuoer → Song Zuer');

  await db.execute({
    sql: `UPDATE actors SET name = 'Wu Jiayi', names_json = json_set(names_json, '$.en', 'Wu Jiayi') WHERE slug = 'wu-jiayi'`,
    args: []
  });
  console.log('✓ #9 wu-jiayi: Wu Jiaxin → Wu Jiayi');

  await db.execute({
    sql: `UPDATE actors SET name = 'Yang Shize', names_json = json_set(names_json, '$.en', 'Yang Shize') WHERE slug = 'yang-shize'`,
    args: []
  });
  console.log('✓ #10 yang-shize: Yang Shi → Yang Shize');

  await db.execute({
    sql: `UPDATE actors SET name = 'Zhang Yijie', names_json = json_set(names_json, '$.en', 'Zhang Yijie') WHERE slug = 'zhang-yijie'`,
    args: []
  });
  console.log('✓ #11 zhang-yijie: Zhang Yixin → Zhang Yijie');

  // C. Slug 是中文字符（3处，#4 已在 B 类处理）
  console.log('\n=== C. Slug 是中文字符 ===');

  await db.execute({
    sql: `UPDATE actors SET slug = 'zheng-yingying' WHERE slug = '郑英瑛'`,
    args: []
  });
  console.log('✓ #12 郑英瑛 → zheng-yingying');

  await db.execute({
    sql: `UPDATE actors SET slug = 'ma-yake' WHERE slug = '马雅柯'`,
    args: []
  });
  console.log('✓ #13 马雅柯 → ma-yake');

  await db.execute({
    sql: `UPDATE actors SET slug = 'chao-xu' WHERE slug = '朝旭'`,
    args: []
  });
  console.log('✓ #14 朝旭 → chao-xu');

  // D. 角色名错误 / 演员归属错误
  console.log('\n=== D. 角色名/归属错误 ===');

  // #15: 贾冰角色名 高启盛 → 徐江
  await db.execute({
    sql: `UPDATE actors SET dramas_json = json_set(dramas_json, '$[0].character', '徐江') WHERE name = 'Jia Bing' AND dramas_json LIKE '%the-knockout%'`,
    args: []
  });
  console.log('✓ #15 Jia Bing: 高启盛 → 徐江');

  // #16: 删除刘浩存记录
  await db.execute({
    sql: `DELETE FROM actors WHERE slug = 'liu-haocun'`,
    args: []
  });
  console.log('✓ #16 Deleted liu-haocun (data corrupted, not in cast)');

  // E. 更新 collaborations_json 中的旧 slug 引用
  console.log('\n=== E. 更新 collaborations 引用 ===');

  const collabUpdates = [
    { old: 'liu-yihan', new: 'liu-yihang' },
    { old: 'song-zuoer', new: 'song-zuer' },
    { old: '陈幽篁', new: 'chen-youhuang' },
  ];

  for (const { old, new: newSlug } of collabUpdates) {
    const result = await db.execute({
      sql: `UPDATE actors SET collaborations_json = REPLACE(collaborations_json, ?, ?) WHERE collaborations_json LIKE ?`,
      args: [old, newSlug, `%${old}%`]
    });
    console.log(`✓ Updated ${old} → ${newSlug}: ${result.rowsAffected} actors`);
  }

  // 验证
  console.log('\n=== 验证 ===');

  const chineseSlugCheck = await db.execute({
    sql: `SELECT COUNT(*) as count FROM actors WHERE slug LIKE '%[^a-zA-Z0-9-]%'`,
    args: []
  });
  console.log(`中文 slug 数量: ${chineseSlugCheck.rows[0].count}`);

  const liuHaocunCheck = await db.execute({
    sql: `SELECT COUNT(*) as count FROM actors WHERE slug = 'liu-haocun'`,
    args: []
  });
  console.log(`刘浩存记录: ${liuHaocunCheck.rows[0].count} (应为 0)`);

  console.log('\n✅ Hotfix v1.1 完成');
  console.log('请执行: git add data/cdrama.db && git commit -m "hotfix: actor pinyin/name corrections v1.1" && git push');
}

executeHotfix().catch(err => {
  console.error('Hotfix failed:', err);
  process.exit(1);
});
