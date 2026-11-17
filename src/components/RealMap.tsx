import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { GeoPoint } from '../utils/geo';
import { LiveLocation, TransportMode } from '../types';

interface RealMapProps {
  mode: 'preview' | 'active';
  origin: GeoPoint;
  destination: GeoPoint;
  campusLabel?: string;
  destinationLabel?: string;
  transportMode?: TransportMode;
  liveLocations?: LiveLocation[];
  currentUserId?: string;
  onRouteComputed?: (info: {
    distanceMeters: number;
    durationSeconds: number;
    provider: string;
  }) => void;
}

export const RealMap: React.FC<RealMapProps> = ({
  mode,
  origin,
  destination,
  campusLabel = 'Campus',
  destinationLabel = 'Destino',
  transportMode = 'racha',
  liveLocations = [],
  currentUserId,
  onRouteComputed,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const onRouteComputedRef = useRef(onRouteComputed);
  onRouteComputedRef.current = onRouteComputed;

  const [routeCoords, setRouteCoords] = useState<[number, number][]>([
    [origin.lat, origin.lng],
    [destination.lat, destination.lng],
  ]);
  const [routeProvider, setRouteProvider] = useState<string>('OpenStreetMap');

  const heightClass = mode === 'preview' ? 'h-[156px]' : 'h-[186px]';

  // Fetch route from OpenRouteService / OSRM proxy
  useEffect(() => {
    let cancelled = false;
    const fetchRoute = async () => {
      try {
        const res = await fetch('/api/route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin,
            destination,
            mode: transportMode,
          }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          provider?: string;
          coordinates?: [number, number][];
          distanceMeters?: number;
          durationSeconds?: number;
        };
        if (cancelled) return;
        if (Array.isArray(data.coordinates) && data.coordinates.length >= 2) {
          setRouteCoords(data.coordinates);
        }
        if (data.provider === 'openrouteservice') {
          setRouteProvider('OSM · OpenRouteService');
        } else if (data.provider === 'openstreetmap-osrm') {
          setRouteProvider('OSM · OSRM');
        } else {
          setRouteProvider('OpenStreetMap');
        }
        if (
          typeof data.distanceMeters === 'number' &&
          typeof data.durationSeconds === 'number' &&
          onRouteComputedRef.current
        ) {
          onRouteComputedRef.current({
            distanceMeters: data.distanceMeters,
            durationSeconds: data.durationSeconds,
            provider: data.provider || 'openstreetmap',
          });
        }
      } catch {
        if (!cancelled) {
          setRouteCoords([
            [origin.lat, origin.lng],
            [destination.lat, destination.lng],
          ]);
        }
      }
    };
    void fetchRoute();
    return () => {
      cancelled = true;
    };
  }, [origin.lat, origin.lng, destination.lat, destination.lng, transportMode]);

  // Initialize Leaflet map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(map);

    const group = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerGroupRef.current = group;

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // Sync markers, route polyline, and live GPS markers
  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    // Base route polyline
    L.polyline(routeCoords, {
      color: '#00C4F4',
      weight: 5,
      opacity: 0.92,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(group);

    // Campus origin pin
    L.circleMarker([origin.lat, origin.lng], {
      radius: 7,
      color: '#00C4F4',
      weight: 4,
      fillColor: '#102536',
      fillOpacity: 1,
    }).addTo(group);

    // Destination pin
    L.circleMarker([destination.lat, destination.lng], {
      radius: 7,
      color: '#FFFFFF',
      weight: 2,
      fillColor: '#F42563',
      fillOpacity: 1,
    }).addTo(group);

    // Live GPS member markers in active mode
    const activePts: [number, number][] = [...routeCoords];
    if (mode === 'active') {
      const activeLocs = liveLocations.filter((loc) => loc.sharingEnabled);
      for (const loc of activeLocs) {
        const isMe = loc.uid === currentUserId;
        L.circleMarker([loc.lat, loc.lng], {
          radius: isMe ? 8 : 6,
          color: '#FFFFFF',
          weight: 3,
          fillColor: isMe ? '#00D2FF' : '#137A59',
          fillOpacity: 1,
        }).addTo(group);
        activePts.push([loc.lat, loc.lng]);
      }
    }

    const bounds = L.latLngBounds(activePts);
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [26, 26], maxZoom: 15 });
    }
  }, [
    origin.lat,
    origin.lng,
    destination.lat,
    destination.lng,
    routeCoords,
    mode,
    liveLocations,
    currentUserId,
  ]);

  return (
    <div
      className={`borajunto-leaflet-map relative w-full ${heightClass} rounded-[20px] overflow-hidden bg-[#EBEFF4] dark:bg-[#222736] border border-[#E4E9F0] dark:border-[#2C3245] select-none`}
    >
      <div ref={containerRef} className="w-full h-full z-0" />

      {/* Floating Campus Tag */}
      <div className="pointer-events-none absolute left-[16px] top-[12px] z-[400] px-3 py-[4px] rounded-full bg-white/95 dark:bg-[#191D29]/95 text-[#102536] dark:text-white text-[11px] font-bold shadow-xs max-w-[140px] truncate">
        {campusLabel}
      </div>

      {/* Floating Destination Tag */}
      <div
        className={`pointer-events-none absolute right-[16px] z-[400] ${
          mode === 'preview' ? 'bottom-[12px]' : 'bottom-[14px]'
        } px-3.5 py-[4px] rounded-full bg-white/95 dark:bg-[#191D29]/95 text-[#102536] dark:text-white text-[11px] font-bold shadow-xs max-w-[140px] truncate`}
      >
        {destinationLabel}
      </div>

      {/* Attribution Caption */}
      <span className="pointer-events-none absolute left-[16px] bottom-[8px] z-[400] px-2 py-[2px] rounded-full bg-white/80 dark:bg-[#191D29]/80 text-[9.5px] font-medium text-[#596579] dark:text-[#94A3B8]">
        {routeProvider}
      </span>
    </div>
  );
};
