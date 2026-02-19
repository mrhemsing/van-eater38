// @ts-nocheck
"use client";

import { Fragment } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { isClosed, type Restaurant } from '@/lib/history';
import 'leaflet/dist/leaflet.css';

export function RestaurantMap({ restaurants }: { restaurants: Restaurant[] }) {
  const points = restaurants.filter(
    (r) => typeof r.latitude === 'number' && typeof r.longitude === 'number' && !isClosed(r.slug),
  );

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-neutral-800">
      <MapContainer
        {...({
          center: [49.2827, -123.1207],
          zoom: 13,
          style: { height: 620, width: '100%' },
          scrollWheelZoom: true,
        } as any)}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {points.map((r) => (
          <Fragment key={r.slug}>
            <CircleMarker
              center={[r.latitude as number, r.longitude as number]}
              radius={7}
              pathOptions={{ color: '#c20000', fillColor: '#c20000', fillOpacity: 1, weight: 1 }}
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
            <CircleMarker
              center={[r.latitude as number, r.longitude as number]}
              radius={2.2}
              pathOptions={{ color: '#fff', fillColor: '#fff', fillOpacity: 1, weight: 0 }}
              interactive={false}
            />
          </Fragment>
        ))}
      </MapContainer>
    </div>
  );
}
