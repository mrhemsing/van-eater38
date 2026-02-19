"use client";

import { useMemo, useState } from 'react';
import type { Version } from '@/lib/history';
import { buildFrequency, versionDiff } from '@/lib/history';

export function HistoryDashboard({ versions }: { versions: Version[] }) {
  const [selectedId, setSelectedId] = useState(versions[versions.length - 1]?.id);

  const selectedIndex = versions.findIndex((v) => v.id === selectedId);
  const selectedVersion = versions[selectedIndex] ?? versions[versions.length - 1];
  const previousVersion = selectedIndex > 0 ? versions[selectedIndex - 1] : undefined;

  const frequencies = useMemo(() => buildFrequency(versions), [versions]);
  const { added, removed } = versionDiff(selectedVersion, previousVersion);

  const totalUnique = frequencies.size;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <header className="mb-8 rounded-3xl border border-neutral-800 bg-neutral-950/80 p-8 shadow-2xl shadow-orange-500/10">
        <p className="text-xs uppercase tracking-[0.22em] text-orange-300">Vancouver Eater 38 Tracker</p>
        <h1 className="mt-3 text-3xl font-semibold text-white md:text-5xl">Track every Eater 38 version</h1>
        <p className="mt-4 max-w-2xl text-neutral-300">
          See every archived list, what changed each update, and which restaurants are perennial picks.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Stat label="Versions captured" value={String(versions.length)} />
          <Stat label="Unique restaurants" value={String(totalUnique)} />
          <Stat label="Current list size" value={String(selectedVersion.restaurants.length)} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
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
                  <div className="text-sm font-medium">{version.date}</div>
                  <div className="text-xs text-neutral-400">{version.restaurants.length} restaurants</div>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="space-y-6">
          <section className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-5">
            <h3 className="text-lg font-semibold text-white">Changes in {selectedVersion.date}</h3>
            <p className="mt-1 text-sm text-neutral-400">
              Compared with {previousVersion ? previousVersion.date : 'the earliest captured version'}
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <ChangeCard title="Added" color="text-emerald-300" restaurants={added} emptyText="No new additions in this snapshot" />
              <ChangeCard title="Removed" color="text-rose-300" restaurants={removed} emptyText="No removals in this snapshot" />
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-5">
            <h3 className="text-lg font-semibold text-white">Restaurants in this version</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {selectedVersion.restaurants.map((restaurant) => {
                const appearances = frequencies.get(restaurant.slug)?.count ?? 0;
                return (
                  <article key={restaurant.slug} className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-neutral-100">{restaurant.name}</p>
                        {restaurant.address ? <p className="text-xs text-neutral-400">{restaurant.address}</p> : null}
                      </div>
                      <span className="shrink-0 rounded-full bg-orange-500/20 px-2 py-1 text-xs text-orange-200">
                        {appearances}x
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-black/50 p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-neutral-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}

function ChangeCard({
  title,
  restaurants,
  color,
  emptyText,
}: {
  title: string;
  restaurants: { name: string; eaterUrl?: string }[];
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
              {r.eaterUrl ? (
                <a href={r.eaterUrl} target="_blank" rel="noreferrer" className="underline decoration-neutral-600 underline-offset-2 hover:decoration-neutral-300">
                  {r.name}
                </a>
              ) : (
                r.name
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-neutral-500">{emptyText}</p>
      )}
    </div>
  );
}
