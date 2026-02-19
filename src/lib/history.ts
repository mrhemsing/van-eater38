import raw from '@/data/versions.json';
import closedSlugs from '@/data/closed-slugs.json';

export type Restaurant = {
  name: string;
  slug: string;
  address?: string;
  eaterUrl?: string;
  website?: string;
  phone?: string;
};

export type Version = {
  id: string;
  date: string;
  source: string;
  restaurants: Restaurant[];
};

export function getVersions(): Version[] {
  return [...raw.versions].sort((a, b) => b.date.localeCompare(a.date));
}

const closedSet = new Set((closedSlugs as string[]).map((s) => s.toLowerCase()));

export function isClosed(slug: string) {
  return closedSet.has(slug.toLowerCase());
}

export function buildFrequency(versions: Version[]) {
  const counts = new Map<string, { name: string; count: number }>();

  for (const version of versions) {
    for (const restaurant of version.restaurants) {
      const existing = counts.get(restaurant.slug);
      if (existing) existing.count += 1;
      else counts.set(restaurant.slug, { name: restaurant.name, count: 1 });
    }
  }

  return counts;
}

export function versionDiff(current: Version, previous?: Version) {
  if (!previous) return { added: current.restaurants, removed: [] as Restaurant[] };

  const previousSlugs = new Set(previous.restaurants.map((r) => r.slug));
  const currentSlugs = new Set(current.restaurants.map((r) => r.slug));

  const added = current.restaurants.filter((r) => !previousSlugs.has(r.slug));
  const removed = previous.restaurants.filter((r) => !currentSlugs.has(r.slug));

  return { added, removed };
}
