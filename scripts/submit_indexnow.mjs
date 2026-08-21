/**
 * IndexNow bulk URL submission script
 * 
 * Usage:
 *   node scripts/submit_indexnow.mjs
 * 
 * Environment variables:
 *   INDEXNOW_KEY - Your IndexNow API key (get from https://www.indexnow.org/)
 *   INDEXNOW_URL - Optional: custom endpoint URL (default: https://api.indexnow.org/indexnow)
 * 
 * This script collects all URLs from the database and submits them to IndexNow.
 * IndexNow will notify Bing, Yandex, Naver and other participating search engines.
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '..', 'data', 'cdrama.db');
const SITE_URL = 'https://cdramabinge.com';
const INDEXNOW_ENDPOINT = process.env.INDEXNOW_URL || 'https://api.indexnow.org/indexnow';

function main() {
  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    console.error('ERROR: INDEXNOW_KEY environment variable is required.');
    console.error('Get your key from: https://www.indexnow.org/');
    process.exit(1);
  }

  console.log('Opening database...');
  const db = new Database(DB_PATH);

  // Collect all URLs
  const urls = [];

  // Homepage
  urls.push(`${SITE_URL}/en`);

  // Dramas
  const dramas = db.prepare('SELECT slug FROM dramas').all();
  console.log(`Found ${dramas.length} dramas`);

  for (const drama of dramas) {
    const slug = drama.slug;

    // Drama detail pages (all 4 locales)
    urls.push(`${SITE_URL}/en/drama/${slug}`);
    urls.push(`${SITE_URL}/vi/drama/${slug}`);
    urls.push(`${SITE_URL}/th/drama/${slug}`);
    urls.push(`${SITE_URL}/id/drama/${slug}`);

    // Dramas-like pages (all 4 locales)
    urls.push(`${SITE_URL}/en/dramas-like/${slug}`);
    urls.push(`${SITE_URL}/vi/dramas-like/${slug}`);
    urls.push(`${SITE_URL}/th/dramas-like/${slug}`);
    urls.push(`${SITE_URL}/id/dramas-like/${slug}`);
  }

  // Actors
  const actors = db.prepare('SELECT slug FROM actors').all();
  console.log(`Found ${actors.length} actors`);

  for (const actor of actors) {
    const slug = actor.slug;

    // Actor pages (all 4 locales)
    urls.push(`${SITE_URL}/en/actor/${slug}`);
    urls.push(`${SITE_URL}/vi/actor/${slug}`);
    urls.push(`${SITE_URL}/th/actor/${slug}`);
    urls.push(`${SITE_URL}/id/actor/${slug}`);
  }

  // Best/mood pages
  const moods = ['romantic', 'intense', 'empowering', 'light_fun', 'mindbending', 'wanna_cry', 'aesthetic', 'spooky'];
  for (const mood of moods) {
    urls.push(`${SITE_URL}/en/best/${mood}`);
    urls.push(`${SITE_URL}/vi/best/${mood}`);
    urls.push(`${SITE_URL}/th/best/${mood}`);
    urls.push(`${SITE_URL}/id/best/${mood}`);
  }

  // Genre pages
  const genres = ['romance', 'historical', 'wuxia', 'modern', 'fantasy', 'mystery', 'comedy'];
  for (const genre of genres) {
    urls.push(`${SITE_URL}/en/best/${genre}`);
    urls.push(`${SITE_URL}/vi/best/${genre}`);
    urls.push(`${SITE_URL}/th/best/${genre}`);
    urls.push(`${SITE_URL}/id/best/${genre}`);
  }

  // Remove duplicates
  const uniqueUrls = [...new Set(urls)];
  console.log(`\nTotal URLs to submit: ${uniqueUrls.length}`);

  db.close();

  // Submit to IndexNow in batches (IndexNow limit: 10000 URLs per request)
  const batchSize = 10000;
  const batches = [];
  for (let i = 0; i < uniqueUrls.length; i += batchSize) {
    batches.push(uniqueUrls.slice(i, i + batchSize));
  }

  console.log(`Splitting into ${batches.length} batch(es)`);

  // Submit each batch
  let totalSubmitted = 0;
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`\nSubmitting batch ${i + 1}/${batches.length} (${batch.length} URLs)...`);

    const payload = {
      host: 'cdramabinge.com',
      key: key,
      keyLocation: `${SITE_URL}/${key}.txt`,
      urlList: batch,
    };

    fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
      .then(async (response) => {
        const status = response.status;
        if (status === 200 || status === 202) {
          console.log(`✓ Batch ${i + 1} accepted (${batch.length} URLs)`);
          totalSubmitted += batch.length;
        } else {
          const text = await response.text();
          console.error(`✗ Batch ${i + 1} failed: ${status} - ${text}`);
        }

        // If this is the last batch, print summary
        if (i === batches.length - 1) {
          console.log(`\n========================================`);
          console.log(`Total submitted: ${totalSubmitted}/${uniqueUrls.length} URLs`);
          console.log(`========================================`);
        }
      })
      .catch((error) => {
        console.error(`✗ Batch ${i + 1} error:`, error.message);
      });

    // Wait a bit between batches to avoid rate limiting
    if (i < batches.length - 1) {
      console.log('Waiting 1 second before next batch...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

main();
