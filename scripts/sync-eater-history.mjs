import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import * as cheerio from 'cheerio';

const TARGET_URL = 'https://www.eater.com/maps/best-vancouver-restaurants-bc-canada';
const CDX_URL = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(
  TARGET_URL,
)}&output=json&fl=timestamp,original,statuscode&filter=statuscode:200&collapse=timestamp:6&from=2017`;

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function normalizeRestaurants(items) {
  return items
    .map((item) => ({
      name: item?.name?.trim(),
      slug: slugify(item?.name || ''),
      address: item?.address?.trim() || '',
      eaterUrl: item?.eaterUrl || '',
      website: item?.website || '',
    }))
    .filter((r) => r.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function parseFromLdJson(html) {
  const $ = cheerio.load(html);
  const parsed = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text().trim();
    if (!raw) return;

    try {
      const data = JSON.parse(raw);
      const list = Array.isArray(data) ? data : [data];

      for (const entry of list) {
        if (entry?.['@type'] !== 'ItemList' || !Array.isArray(entry?.itemListElement)) continue;

        const restaurants = entry.itemListElement
          .map((x) => x?.item || x)
          .filter((x) => x && typeof x.name === 'string')
          .map((x) => ({
            name: x.name,
            address: x?.address?.streetAddress || x?.address?.name || '',
            eaterUrl: x?.url || '',
            website: '',
          }));

        if (restaurants.length >= 30) parsed.push(normalizeRestaurants(restaurants));
      }
    } catch {
      // ignore malformed blocks
    }
  });

  return parsed.sort((a, b) => b.length - a.length)[0] || null;
}

function parseFromNextData(html) {
  const marker = '<script id="__NEXT_DATA__" type="application/json">';
  const start = html.indexOf(marker);
  if (start === -1) return null;

  const end = html.indexOf('</script>', start);
  if (end === -1) return null;

  const jsonText = html.slice(start + marker.length, end);
  const next = JSON.parse(jsonText);
  const points = next?.props?.pageProps?.hydration?.responses?.[2]?.data?.node?.mapPoints;

  if (!Array.isArray(points) || points.length < 30) return null;

  return normalizeRestaurants(
    points.map((point) => ({
      name: point?.name,
      address: point?.address,
      eaterUrl: point?.url,
      website: point?.venue?.website,
    })),
  );
}

function parseRestaurants(html) {
  return parseFromLdJson(html) || parseFromNextData(html);
}

function toVersionDate(timestamp) {
  const year = Number(timestamp.slice(0, 4));
  const month = Number(timestamp.slice(4, 6)) - 1;
  const day = Number(timestamp.slice(6, 8));
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

function hashRestaurants(restaurants) {
  return createHash('sha1').update(JSON.stringify(restaurants.map((r) => r.slug))).digest('hex');
}

async function fetchText(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function main() {
  const cdxRaw = await fetchText(CDX_URL);
  const cdxRows = JSON.parse(cdxRaw).slice(1); // remove header

  const versions = [];
  let lastHash = null;

  for (const [timestamp] of cdxRows) {
    const archivedUrl = `https://web.archive.org/web/${timestamp}id_/${TARGET_URL}`;

    try {
      const html = await fetchText(archivedUrl);
      const restaurants = parseRestaurants(html);
      if (!restaurants || restaurants.length < 30) continue;

      const hash = hashRestaurants(restaurants);
      if (hash === lastHash) continue;

      versions.push({
        id: timestamp,
        date: toVersionDate(timestamp),
        source: archivedUrl,
        restaurants,
      });
      lastHash = hash;
    } catch {
      // Skip bad snapshots and keep going.
    }
  }

  // Always include latest live page as current version.
  const liveHtml = await fetchText(TARGET_URL);
  const liveRestaurants = parseRestaurants(liveHtml);

  if (liveRestaurants?.length) {
    const liveHash = hashRestaurants(liveRestaurants);
    const latestHash = versions.length ? hashRestaurants(versions[versions.length - 1].restaurants) : null;

    if (liveHash !== latestHash) {
      versions.push({
        id: 'live',
        date: new Date().toISOString().slice(0, 10),
        source: TARGET_URL,
        restaurants: liveRestaurants,
      });
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: TARGET_URL,
    versions,
  };

  await mkdir('src/data', { recursive: true });
  await writeFile('src/data/versions.json', `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  console.log(`Saved ${versions.length} unique versions.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
