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

const CANONICAL_RESTAURANTS = {
  'hawksworth-bar': { slug: 'hawksworth-restaurant', name: 'Hawksworth Restaurant' },
  'homer-st-cafe-and-bar': { slug: 'homer-street-cafe-and-bar', name: 'Homer Street Cafe and Bar' },
  'maruhachi-ra-men-canada-westend': { slug: 'maruhachi-ra-men', name: 'Maruhachi Ra-men' },
  'pidgin-restaurant': { slug: 'pidgin', name: 'Pidgin' },
  'suyo-modern-peruvian': { slug: 'suyo', name: 'Suyo' },
};

const PHONE_OVERRIDES = {
  'bar-tartare': '(604) 893-7832',
  'the-515-bar': '(604) 428-8226',
};

function normalizeAddress(address) {
  if (!address) return '';

  let out = address.trim();

  // Standardize province naming.
  out = out.replace(/\bBritish\s+Columbia\b/gi, 'BC');

  // Remove explicit country references.
  out = out.replace(/,?\s*Canada\b/gi, '');

  // Remove Canadian postal codes (e.g., V6G 2J6 or V6G2J6).
  out = out.replace(/\b[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d\b/gi, '');

  // Cleanup extra separators/spacing left by removals.
  out = out.replace(/\s{2,}/g, ' ');
  out = out.replace(/\s+,/g, ',');
  out = out.replace(/,{2,}/g, ',');
  out = out.replace(/,\s*,/g, ', ');

  // Normalize city/province punctuation, e.g. "Vancouver BC" -> "Vancouver, BC".
  out = out.replace(/\b([A-Za-z.'-]+(?:\s+[A-Za-z.'-]+)*)\s+BC\b/g, '$1, BC');
  out = out.replace(/,\s*,\s*BC\b/g, ', BC');

  // If address ends with ", BC" but has no explicit city segment, default to Vancouver.
  // Example: "3388 Main Street, BC" -> "3388 Main Street, Vancouver, BC"
  // Final trim of trailing separators/spaces.
  out = out.replace(/[\s,]+$/g, '');

  // After cleanup, if address still has only street + province, inject Vancouver.
  const commaCount = (out.match(/,/g) || []).length;
  if (/,[\s]*BC$/i.test(out) && commaCount === 1) {
    out = out.replace(/,[\s]*BC$/i, ', Vancouver, BC');
  }

  return out;
}

function normalizeRestaurants(items) {
  const canonicalized = items
    .map((item) => {
      const rawName = item?.name?.trim() || '';
      const rawSlug = slugify(rawName);
      const canonical = CANONICAL_RESTAURANTS[rawSlug];

      const normalizedSlug = canonical?.slug || rawSlug;

      return {
        name: canonical?.name || rawName,
        slug: normalizedSlug,
        address: normalizeAddress(item?.address?.trim() || ''),
        eaterUrl: item?.eaterUrl || '',
        website: item?.website || '',
        phone: PHONE_OVERRIDES[normalizedSlug] || item?.phone || '',
        openFor: item?.openFor || '',
        priceRange: item?.priceRange || '',
        descriptionText: item?.descriptionText || '',
        imageUrl: item?.imageUrl || '',
        latitude: typeof item?.latitude === 'number' ? item.latitude : undefined,
        longitude: typeof item?.longitude === 'number' ? item.longitude : undefined,
      };
    })
    .filter((r) => r.name);

  // De-duplicate by canonical slug inside each version.
  const bySlug = new Map();
  for (const r of canonicalized) {
    const existing = bySlug.get(r.slug);
    if (!existing) {
      bySlug.set(r.slug, r);
      continue;
    }

    bySlug.set(r.slug, {
      ...existing,
      address: existing.address || r.address,
      eaterUrl: existing.eaterUrl || r.eaterUrl,
      website: existing.website || r.website,
      phone: existing.phone || r.phone,
      openFor: existing.openFor || r.openFor,
      priceRange: existing.priceRange || r.priceRange,
      descriptionText: existing.descriptionText || r.descriptionText,
      imageUrl: existing.imageUrl || r.imageUrl,
      latitude: existing.latitude ?? r.latitude,
      longitude: existing.longitude ?? r.longitude,
    });
  }

  return [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function extractJsonArrayByKey(html, key) {
  const marker = `"${key}":[`;
  const start = html.indexOf(marker);
  if (start === -1) return null;

  let i = start + marker.length - 1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (; i < html.length; i++) {
    const ch = html[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '[') depth += 1;
    else if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        return html.slice(start + marker.length - 1, i + 1);
      }
    }
  }

  return null;
}

function parseMapDescription(description) {
  const parts = Array.isArray(description)
    ? description.map((d) => d?.plaintext || '').filter(Boolean)
    : [];

  let openFor = '';
  let priceRange = '';
  const descriptionLines = [];

  for (const part of parts) {
    if (/^Open for:/i.test(part)) {
      openFor = part.replace(/^Open for:\s*/i, '').trim();
      continue;
    }
    if (/^Price range:/i.test(part)) {
      priceRange = part.replace(/^Price range:\s*/i, '').trim();
      continue;
    }
    descriptionLines.push(part.trim());
  }

  return {
    openFor,
    priceRange,
    descriptionText: descriptionLines.join(' '),
  };
}

function parseFromMapPoints(html) {
  const arrayText = extractJsonArrayByKey(html, 'mapPoints');
  if (!arrayText) return null;

  const points = JSON.parse(arrayText);
  if (!Array.isArray(points) || points.length < 30) return null;

  return normalizeRestaurants(
    points.map((point) => {
      const parsed = parseMapDescription(point?.description);
      return {
        name: point?.name,
        address: point?.address || '',
        eaterUrl: point?.eaterUrl || '',
        website: point?.url || point?.venue?.website || '',
        phone: point?.phone || point?.venue?.phone || point?.venue?.telephone || '',
        openFor: parsed.openFor,
        priceRange: parsed.priceRange,
        descriptionText: parsed.descriptionText,
        imageUrl:
          point?.ledeMedia?.image?.thumbnails?.horizontal?.url ||
          point?.ledeMedia?.image?.thumbnails?.square?.url ||
          point?.ledeMedia?.image?.thumbnails?.vertical?.url ||
          '',
        latitude: typeof point?.location?.latitude === 'number' ? point.location.latitude : undefined,
        longitude: typeof point?.location?.longitude === 'number' ? point.location.longitude : undefined,
      };
    }),
  );
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
  return parseFromMapPoints(html) || parseFromLdJson(html) || parseFromNextData(html);
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
