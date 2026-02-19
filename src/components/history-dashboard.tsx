"use client";

import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import type { Version } from '@/lib/history';
import { buildFrequency, isClosed, versionDiff } from '@/lib/history';

function toMonthYear(dateStr: string) {
  const [year, month] = dateStr.split('-').map(Number);
  if (!year || !month) return dateStr;
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

const RestaurantMap = dynamic(() => import('@/components/restaurant-map').then((m) => m.RestaurantMap), {
  ssr: false,
});

export function HistoryDashboard({ versions }: { versions: Version[] }) {
  const [selectedId, setSelectedId] = useState(versions[0]?.id);
  const [expandedSlugs, setExpandedSlugs] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  const selectedIndex = versions.findIndex((v) => v.id === selectedId);
  const selectedVersion = versions[selectedIndex] ?? versions[0];
  const previousVersion = selectedIndex >= 0 ? versions[selectedIndex + 1] : undefined;

  const frequencies = useMemo(() => buildFrequency(versions), [versions]);
  const { added, removed } = versionDiff(selectedVersion, previousVersion);

  const totalUnique = frequencies.size;

  return (
    <div className="mx-auto max-w-7xl overflow-x-hidden px-[14px] pt-6 pb-10 md:px-7">
      <header className="relative mb-5 rounded-3xl border border-neutral-800 bg-neutral-950/80 p-8 shadow-2xl shadow-orange-500/10">
        <Image
          src="/images/eater38-logo.svg"
          alt="Eater 38"
          width={560}
          height={315}
          className="mb-4 h-auto w-full max-w-[190px] rounded-xl mr-auto sm:mb-[12px]"
          priority
        />

        <div className="hidden lg:absolute lg:right-8 lg:top-8 lg:grid lg:w-[260px] lg:grid-cols-1 lg:gap-3">
          <Stat label="Versions captured" value={String(versions.length)} />
          <Stat label="Unique restaurants" value={String(totalUnique)} />
        </div>

        <p className="text-xs uppercase tracking-[0.22em] text-orange-300 leading-relaxed sm:leading-none">Old Eater 38 entries, saved for posterity</p>
        <h1 className="mt-3 whitespace-nowrap text-[1.45rem] font-semibold text-white sm:text-3xl md:text-5xl">Eater Vancouver 38 Archive</h1>
        <p className="mt-4 max-w-2xl text-neutral-300">
          See every archived list, what changed each update, and which restaurants are perennial picks. (Last updated:{' '}
          <a
            href="https://www.eater.com/maps/best-vancouver-restaurants-bc-canada"
            target="_blank"
            rel="noreferrer"
            className="text-neutral-400 hover:text-neutral-200"
          >
            12-10-2025
          </a>
          )
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:hidden md:mt-8">
          <Stat label="Versions captured" value={String(versions.length)} />
          <Stat label="Unique restaurants" value={String(totalUnique)} />
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <aside className="hidden rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4 lg:block">
          <h2 className="mb-3 text-sm uppercase tracking-[0.18em] text-neutral-400">Versions</h2>
          <div className="space-y-2">
            {versions.map((version) => {
              const isActive = version.id === selectedVersion.id;
              return (
                <button
                  key={version.id}
                  onClick={() => setSelectedId(version.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                    isActive
                      ? 'border-orange-400 bg-orange-500/15 text-orange-100'
                      : 'border-neutral-800 bg-neutral-900/60 text-neutral-200 hover:border-neutral-600'
                  }`}
                >
                  <div className="text-sm font-medium">{toMonthYear(version.date)}</div>
                  <div className="text-xs text-neutral-400">{version.restaurants.length} restaurants</div>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="min-w-0 space-y-6">
          <section className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-3 lg:hidden">
            <div className="mb-3 text-xs uppercase tracking-[0.16em] text-neutral-400">Versions</div>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-4">
              {versions.map((version) => {
                const isActive = version.id === selectedVersion.id;
                return (
                  <button
                    key={`mobile-${version.id}`}
                    onClick={() => setSelectedId(version.id)}
                    className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition ${
                      isActive
                        ? 'border-orange-400 bg-orange-500/15 text-orange-100'
                        : 'border-neutral-700 bg-neutral-900/60 text-neutral-300'
                    }`}
                  >
                    {toMonthYear(version.date)}
                  </button>
                );
              })}
            </div>
          </section>
          <section className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-5">
            <h3 className="text-lg font-semibold text-white">{toMonthYear(selectedVersion.date)}</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <ChangeCard title="Added" color="text-emerald-300" restaurants={added} emptyText="No new additions in this snapshot" />
              <ChangeCard title="Retired" color="text-rose-300" restaurants={removed} emptyText="No retirements in this snapshot" />
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-white">The 38 Best Restaurants in Vancouver</h3>
              <div className="relative inline-flex rounded-full border border-neutral-700 bg-neutral-900/70 p-1">
                <div
                  className={`pointer-events-none absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-orange-500/20 transition-transform duration-300 ease-out ${
                    viewMode === 'map' ? 'translate-x-full' : 'translate-x-0'
                  }`}
                  style={{ left: 4 }}
                />
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`relative z-10 w-[96px] rounded-full px-3 py-1 text-sm transition ${
                    viewMode === 'list' ? 'text-orange-200' : 'text-neutral-300 hover:text-neutral-100'
                  }`}
                >
                  View list
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('map')}
                  className={`relative z-10 w-[96px] rounded-full px-3 py-1 text-sm transition ${
                    viewMode === 'map' ? 'text-orange-200' : 'text-neutral-300 hover:text-neutral-100'
                  }`}
                >
                  View map
                </button>
              </div>
            </div>

            <p className="mt-1 text-sm text-neutral-400">{toMonthYear(selectedVersion.date)}</p>

            {viewMode === 'map' ? (
              <RestaurantMap restaurants={selectedVersion.restaurants} />
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3">
                {[...selectedVersion.restaurants]
                  .sort((a, b) => {
                    const aCount = frequencies.get(a.slug)?.count ?? 0;
                    const bCount = frequencies.get(b.slug)?.count ?? 0;
                    if (bCount !== aCount) return bCount - aCount;
                    return a.name.localeCompare(b.name);
                  })
                  .map((restaurant) => {
                    const appearances = frequencies.get(restaurant.slug)?.count ?? 0;
                    const isExpanded = !!expandedSlugs[restaurant.slug];

                    return (
                      <article key={restaurant.slug} className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/80">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedSlugs((prev) => ({
                              ...prev,
                              [restaurant.slug]: !prev[restaurant.slug],
                            }))
                          }
                          className="flex w-full items-start justify-between gap-3 p-3 text-left"
                        >
                          <div>
                            <p className="text-lg font-medium uppercase text-neutral-100 md:text-xl">
                              {restaurant.name}{' '}
                              {isClosed(restaurant.slug) ? (
                                <span className="ml-1 inline-flex -translate-y-[3px] items-center rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-rose-200">
                                  CLOSED
                                </span>
                              ) : null}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="shrink-0 rounded-full bg-orange-500/20 px-2 py-1 text-xs text-orange-200">{appearances}x</span>
                            <span className="text-neutral-400">{isExpanded ? '▴' : '▾'}</span>
                          </div>
                        </button>

                        {isExpanded ? (
                          <div className="border-t border-neutral-800 bg-neutral-950/60 px-3 py-2 text-sm text-neutral-200">
                            <DetailRow
                              icon="🍽"
                              label={restaurant.openFor ? `Open for: ${restaurant.openFor}` : 'Open for: Not available'}
                              dense
                            />
                            <DetailRow
                              icon="💲"
                              label={restaurant.priceRange ? `Price range: ${restaurant.priceRange}` : 'Price range: Not available'}
                              dense
                            />
                            {restaurant.descriptionText ? (
                              <div className="border-b border-neutral-800/80 py-2 text-[15px] leading-relaxed text-neutral-300 lg:pr-20 lg:text-[15px]">
                                {restaurant.descriptionText}
                              </div>
                            ) : (
                              <div className="border-b border-neutral-800/80 py-2 text-[15px] leading-relaxed text-neutral-500 lg:pr-20 lg:text-[15px]">
                                Description: Not available
                              </div>
                            )}
                            <DetailRow
                              icon="📍"
                              label={restaurant.address || 'Address not available from source'}
                              href={restaurant.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address)}` : undefined}
                            />
                            <DetailRow
                              icon="☎"
                              label={restaurant.phone || 'Not available'}
                              href={restaurant.phone ? `tel:${restaurant.phone.replace(/[^\d+]/g, '')}` : undefined}
                            />
                            <DetailRow
                              icon="🌐"
                              label={restaurant.website ? 'Visit website' : 'Website not available from source'}
                              href={restaurant.website || undefined}
                            />
                            {restaurant.imageUrl ? (
                              <div className="py-3">
                                <img
                                  src={restaurant.imageUrl}
                                  alt={`${restaurant.name} photo`}
                                  className="h-auto w-full max-w-[500px] rounded-lg border border-neutral-800 object-cover"
                                  loading="lazy"
                                />
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-black/50 p-4 text-left lg:text-right">
      <p className="text-xs uppercase tracking-[0.14em] text-neutral-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}

function DetailRow({ icon, label, href, dense = false }: { icon: string; label: string; href?: string; dense?: boolean }) {
  const content = (
    <div className={`flex items-center justify-between gap-3 ${dense ? 'py-0.5' : 'py-2'}`}>
      <div className="flex items-center gap-2">
        <span className="w-5 text-center text-base text-neutral-300">{icon}</span>
        <span>{label}</span>
      </div>
      {href ? <span className="text-neutral-400">↗</span> : null}
    </div>
  );

  if (!href) return content;

  return (
    <a href={href} target="_blank" rel="noreferrer" className="block border-b border-neutral-800/80 last:border-b-0 hover:text-orange-200">
      {content}
    </a>
  );
}

function ChangeCard({
  title,
  restaurants,
  color,
  emptyText,
}: {
  title: string;
  restaurants: { name: string; slug: string; eaterUrl?: string }[];
  color: string;
  emptyText: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-4">
      <h4 className={`text-sm font-semibold uppercase tracking-[0.14em] ${color}`}>{title} ({restaurants.length})</h4>
      {restaurants.length ? (
        <ul className="mt-3 space-y-2 text-sm text-neutral-200">
          {restaurants.map((r) => (
            <li key={`${title}-${r.name}`}>
              {r.name}
              {isClosed(r.slug) ? (
                <span className="ml-2 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-rose-200">CLOSED</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-neutral-500">{emptyText}</p>
      )}
    </div>
  );
}
