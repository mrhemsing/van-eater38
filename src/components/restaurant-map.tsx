// @ts-nocheck
"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import type { Restaurant } from '@/lib/history';
import 'leaflet/dist/leaflet.css';

export function RestaurantMap({ restaurants }: { restaurants: Restaurant[] }) {
  const points = restaurants.filter((r) => typeof r.latitude === 'number' && typeof r.longitude === 'number');

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-neutral-800">
      <MapContainer
        {...({
          center: [49.2827, -123.1207],
          zoom: 12,
          style: { height: 620, width: '100%' },
          scrollWheelZoom: true,
        } as any)}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {points.map((r) => (
          <CircleMarker
            key={r.slug}
            center={[r.latitude as number, r.longitude as number]}
            radius={7}
            pathOptions={{ color: '#fb923c', fillColor: '#f97316', fillOpacity: 0.85, weight: 1 }}
          >
            <Popup>
              <div className="min-w-[180px]">
                <div className="font-semibold">{r.name}</div>
                {r.address ? <div className="mt-1 text-xs text-neutral-700">{r.address}</div> : null}
                {r.website ? (
                  <a className="mt-2 inline-block text-xs text-blue-600 underline" href={r.website} target="_blank" rel="noreferrer">
                    Visit website
                  </a>
                ) : null}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
