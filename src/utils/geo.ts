export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface MeetingPointOption {
  label: string;
  hint: string;
  lat: number;
  lng: number;
}

export interface CampusDefinition {
  id: string;
  name: string;
  shortName: string;
  headerLabel: string;
  city: string;
  centerLat: number;
  centerLng: number;
  geofenceRadiusMeters: number;
  meetingPoints: MeetingPointOption[];
}

export const SALVADOR_CAMPUSES: CampusDefinition[] = [
  {
    id: 'ucsal-paralela',
    name: 'UCSAL · Campus Pituaçu (Av. Paralela)',
    shortName: 'Av. Paralela',
    headerLabel: 'CAMPUS PITUAÇU · SALVADOR',
    city: 'Salvador',
    centerLat: -12.9438,
    centerLng: -38.4071,
    geofenceRadiusMeters: 650,
    meetingPoints: [
      {
        label: 'Portão Principal · Av. Paralela',
        hint: 'Encontre o grupo dentro do campus, próximo à portaria.',
        lat: -12.9445,
        lng: -38.4081,
      },
      {
        label: 'Biblioteca · Bloco A',
        hint: 'Ponto iluminado em frente à entrada da biblioteca.',
        lat: -12.9436,
        lng: -38.4069,
      },
      {
        label: 'Estacionamento · Bloco B',
        hint: 'Área interna de embarque de caronas do campus.',
        lat: -12.9431,
        lng: -38.4062,
      },
      {
        label: 'Passarela · Saída Paralela',
        hint: 'Encontre o grupo ainda dentro do perímetro do campus.',
        lat: -12.9451,
        lng: -38.4086,
      },
    ],
  },
  {
    id: 'ucsal-federacao',
    name: 'UCSAL · Campus Federação',
    shortName: 'Federação',
    headerLabel: 'CAMPUS FEDERAÇÃO · SALVADOR',
    city: 'Salvador',
    centerLat: -12.9998,
    centerLng: -38.5086,
    geofenceRadiusMeters: 500,
    meetingPoints: [
      {
        label: 'Portaria Central · Cardeal da Silva',
        hint: 'Encontre o grupo na área interna da portaria.',
        lat: -12.9999,
        lng: -38.5088,
      },
      {
        label: 'Pátio Interno · Cantina',
        hint: 'Ponto de encontro iluminado dentro do campus.',
        lat: -12.9994,
        lng: -38.5082,
      },
    ],
  },
];

export interface SalvadorDestinationOption {
  label: string;
  shortLabel: string;
  lat: number;
  lng: number;
}

export const SALVADOR_DESTINATIONS: SalvadorDestinationOption[] = [
  {
    label: 'Cajazeiras VIII, Salvador',
    shortLabel: 'Cajazeiras VIII',
    lat: -12.8992,
    lng: -38.4148,
  },
  {
    label: 'Cabula, Salvador',
    shortLabel: 'Cabula',
    lat: -12.9524,
    lng: -38.4581,
  },
  {
    label: 'Imbuí, Salvador',
    shortLabel: 'Imbuí',
    lat: -12.9672,
    lng: -38.4319,
  },
  {
    label: 'Boca do Rio, Salvador',
    shortLabel: 'Boca do Rio',
    lat: -12.9718,
    lng: -38.4184,
  },
  {
    label: 'Pau da Lima, Salvador',
    shortLabel: 'Pau da Lima',
    lat: -12.9225,
    lng: -38.4372,
  },
  {
    label: 'Itapuã, Salvador',
    shortLabel: 'Itapuã',
    lat: -12.9396,
    lng: -38.3629,
  },
  {
    label: 'Brotas, Salvador',
    shortLabel: 'Brotas',
    lat: -12.9879,
    lng: -38.4911,
  },
];

export const CLASS_END_TIME_OPTIONS = [
  '21:45',
  '22:00',
  '22:15',
  '22:30',
  '22:45',
];

export function haversineDistanceMeters(a: GeoPoint, b: GeoPoint): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function haversineDistanceKm(a: GeoPoint, b: GeoPoint): number {
  return haversineDistanceMeters(a, b) / 1000;
}

export function isInsideCampusGeofence(
  point: GeoPoint,
  campus: CampusDefinition
): boolean {
  const dist = haversineDistanceMeters(point, {
    lat: campus.centerLat,
    lng: campus.centerLng,
  });
  return dist <= campus.geofenceRadiusMeters;
}

export function formatDistanceLabel(meters: number): string {
  if (meters < 1000) {
    const rounded = Math.max(50, Math.round(meters / 50) * 50);
    return `a ${rounded} m do seu destino`;
  }
  const km = (meters / 1000).toFixed(1).replace('.', ',');
  return `a ${km} km do seu destino`;
}

export function extractShortDestination(fullDestination: string): string {
  const firstPart = fullDestination.split(',')[0]?.trim();
  return firstPart || 'Cajazeiras VIII';
}

export function parseTimeToMinutes(hhmm: string): number {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return 22 * 60 + 30;
  return h * 60 + m;
}

export function timeDiffMinutes(timeA: string, timeB: string): number {
  const minA = parseTimeToMinutes(timeA);
  const minB = parseTimeToMinutes(timeB);
  const direct = Math.abs(minA - minB);
  // Handle midnight wrap (e.g., 23:55 vs 00:05)
  return Math.min(direct, 1440 - direct);
}

export function addMinutesToHHMM(hhmm: string, minutesToAdd: number): string {
  const total = (parseTimeToMinutes(hhmm) + minutesToAdd + 1440) % 1440;
  const h = Math.floor(total / 60)
    .toString()
    .padStart(2, '0');
  const m = (total % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function getCampusById(campusId: string): CampusDefinition {
  return (
    SALVADOR_CAMPUSES.find((c) => c.id === campusId) || SALVADOR_CAMPUSES[0]
  );
}

export function resolveSalvadorDestination(label: string): SalvadorDestinationOption {
  const lower = label.trim().toLowerCase();
  const exact = SALVADOR_DESTINATIONS.find(
    (d) =>
      d.label.toLowerCase() === lower || d.shortLabel.toLowerCase() === lower
  );
  if (exact) return exact;

  const partial = SALVADOR_DESTINATIONS.find(
    (d) =>
      lower.includes(d.shortLabel.toLowerCase()) ||
      d.shortLabel.toLowerCase().includes(lower)
  );
  if (partial) {
    return {
      ...partial,
      label,
      shortLabel: extractShortDestination(label),
    };
  }

  return {
    label,
    shortLabel: extractShortDestination(label),
    lat: SALVADOR_DESTINATIONS[0].lat,
    lng: SALVADOR_DESTINATIONS[0].lng,
  };
}

export function computeTodayScheduledMs(hhmm: string): number {
  const [hStr, mStr] = hhmm.split(':');
  const now = new Date();
  const target = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    Number(hStr) || 22,
    Number(mStr) || 30,
    0,
    0
  );
  return target.getTime();
}
