import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

interface LatLng {
  lat: number;
  lng: number;
}

function haversineMeters(a: LatLng, b: LatLng): number {
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

function buildFallbackRoute(
  origin: LatLng,
  destination: LatLng,
  mode: string
) {
  const straight = haversineMeters(origin, destination);
  const roadDistance = Math.round(straight * 1.28);
  const speedMps = mode === 'bando' ? 1.35 : 8.8; // ~4.8 km/h a pé, ~31.7 km/h carro
  const durationSeconds = Math.max(180, Math.round(roadDistance / speedMps));
  const midLat = (origin.lat + destination.lat) / 2 + 0.0025;
  const midLng = (origin.lng + destination.lng) / 2 - 0.0025;
  return {
    provider: 'geodesic-fallback',
    coordinates: [
      [origin.lat, origin.lng],
      [midLat, midLng],
      [destination.lat, destination.lng],
    ],
    distanceMeters: roadDistance,
    durationSeconds,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      orsConfigured: Boolean(
        process.env.OPENROUTESERVICE_API_KEY &&
          process.env.OPENROUTESERVICE_API_KEY !== 'MY_OPENROUTESERVICE_API_KEY'
      ),
    });
  });

  app.post('/api/route', async (req: Request, res: Response) => {
    const body = req.body as {
      origin?: LatLng;
      destination?: LatLng;
      mode?: 'bando' | 'racha' | 'carona';
    };

    const origin = body?.origin;
    const destination = body?.destination;
    const mode = body?.mode || 'racha';

    if (
      !origin ||
      !destination ||
      typeof origin.lat !== 'number' ||
      typeof origin.lng !== 'number' ||
      typeof destination.lat !== 'number' ||
      typeof destination.lng !== 'number'
    ) {
      res.status(400).json({ error: 'Coordenadas de origem e destino inválidas.' });
      return;
    }

    const orsKey = process.env.OPENROUTESERVICE_API_KEY;
    const orsProfile = mode === 'bando' ? 'foot-walking' : 'driving-car';
    let routeFallbackReason = 'OPENROUTESERVICE_API_KEY não configurada';
    let orsHttpStatus: number | null = null;

    if (orsKey && orsKey !== 'MY_OPENROUTESERVICE_API_KEY') {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const orsRes = await fetch(
          `https://api.openrouteservice.org/v2/directions/${orsProfile}/geojson`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: orsKey,
            },
            body: JSON.stringify({
              coordinates: [
                [origin.lng, origin.lat],
                [destination.lng, destination.lat],
              ],
            }),
            signal: controller.signal,
          }
        );
        clearTimeout(timer);
        orsHttpStatus = orsRes.status;

        if (orsRes.ok) {
          const data = (await orsRes.json()) as {
            features?: Array<{
              geometry?: { coordinates?: Array<[number, number]> };
              properties?: { summary?: { distance?: number; duration?: number } };
            }>;
          };
          const feature = data.features?.[0];
          const rawCoords = feature?.geometry?.coordinates || [];
          const summary = feature?.properties?.summary;
          if (rawCoords.length >= 2) {
            res.json({
              provider: 'openrouteservice',
              coordinates: rawCoords.map(([lng, lat]) => [lat, lng]),
              distanceMeters: Math.round(summary?.distance || 0),
              durationSeconds: Math.round(summary?.duration || 0),
            });
            return;
          }
          routeFallbackReason = 'ORS directions retornou geometria vazia';
        } else {
          routeFallbackReason = `ORS directions retornou HTTP ${orsRes.status}`;
        }
      } catch (err: unknown) {
        routeFallbackReason =
          err instanceof Error && err.name === 'AbortError'
            ? 'Timeout ao consultar ORS directions'
            : 'Falha de rede ao consultar ORS directions';
      }
    }

    let osrmHttpStatus: number | null = null;
    try {
      const osrmProfile = mode === 'bando' ? 'foot' : 'driving';
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const osrmRes = await fetch(
        `https://router.project-osrm.org/route/v1/${osrmProfile}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`,
        {
          headers: { 'User-Agent': 'BoraJunto-Academic-App/1.0' },
          signal: controller.signal,
        }
      );
      clearTimeout(timer);
      osrmHttpStatus = osrmRes.status;

      if (osrmRes.ok) {
        const data = (await osrmRes.json()) as {
          routes?: Array<{
            distance?: number;
            duration?: number;
            geometry?: { coordinates?: Array<[number, number]> };
          }>;
        };
        const route = data.routes?.[0];
        const rawCoords = route?.geometry?.coordinates || [];
        if (rawCoords.length >= 2) {
          console.warn(
            '[route][fallback]',
            JSON.stringify({
              provider: 'openstreetmap-osrm',
              orsHttpStatus,
              fallbackHttpStatus: osrmHttpStatus,
              reason: routeFallbackReason,
            })
          );
          res.json({
            provider: 'openstreetmap-osrm',
            coordinates: rawCoords.map(([lng, lat]) => [lat, lng]),
            distanceMeters: Math.round(route?.distance || 0),
            durationSeconds: Math.round(route?.duration || 0),
          });
          return;
        }
        routeFallbackReason = `${routeFallbackReason}; OSRM retornou geometria vazia`;
      } else {
        routeFallbackReason = `${routeFallbackReason}; OSRM retornou HTTP ${osrmRes.status}`;
      }
    } catch (err: unknown) {
      const osrmErr =
        err instanceof Error && err.name === 'AbortError'
          ? 'Timeout ao consultar OSRM'
          : 'Falha de rede ao consultar OSRM';
      routeFallbackReason = `${routeFallbackReason}; ${osrmErr}`;
    }

    console.warn(
      '[route][fallback]',
      JSON.stringify({
        provider: 'geodesic-fallback',
        orsHttpStatus,
        osrmHttpStatus,
        reason: routeFallbackReason,
      })
    );
    res.json(buildFallbackRoute(origin, destination, mode));
  });

  type LocationType =
    | 'bairro'
    | 'rua'
    | 'endereco'
    | 'estabelecimento'
    | 'ponto_interesse'
    | 'municipio';

  const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
    bairro: 'Bairro',
    rua: 'Rua',
    endereco: 'Endereço completo',
    estabelecimento: 'Estabelecimento',
    ponto_interesse: 'Ponto de interesse',
    municipio: 'Município',
  };

  const RMS_MUNICIPALITIES = new Set([
    'salvador',
    'lauro de freitas',
    'camacari',
    'simoes filho',
    'candeias',
    'dias davila',
    "dias d'avila",
    'vera cruz',
    'itaparica',
    'madre de deus',
    'sao francisco do conde',
    'sao sebastiao do passe',
    'mata de sao joao',
    'pojuca',
  ]);

  const normalizeGeoText = (text: string): string =>
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const POI_PREFIX_OR_KEYWORD_RE =
    /\b(praia|farol|parque|arena|estadio|largo|praca|museu|teatro|pelourinho|estacao|terminal|metro|aeroporto|porto|universidade|faculdade|campus|hospital|igreja|capela|catedral|lagoa|dique|mirante|orla|memorial|forte|monumento|parada|ponto de onibus|ucsal|ufba|uneb|ifba|unifacs)\b/;

  const COMMERCIAL_KEYWORD_RE =
    /\b(shopping|mercado|supermercado|hiper|loja|clinica|hotel|hostel|pousada|edificio|condominio|residence|flat|posto|restaurante|bar|cafe|farmacia|academia|banco|empresarial|prefeitura|conjunto|apart|resort)\b/;

  const STREET_PREFIX_RE =
    /^(rua|r|av|avenida|travessa|tv|alameda|al|largo|praca|estrada|rodovia|loteamento|via|caminho|ladeira)\b/;

  const INSTITUTION_OR_POI_QUERY_RE =
    /\b(shopping|farol|arena|estadio|parque|praia|terminal|estacao|aeroporto|hospital|igreja|hotel|mercado|supermercado|universidade|faculdade|ucsal|ufba|uneb|ifba|unifacs|senai|sesi|campus|museu|teatro|pelourinho|dique|lagoa|banco|clinica|escola|colegio)\b/;

  const classifyLocation = (params: {
    layer?: string;
    name: string;
    street?: string;
    housenumber?: string;
    locality?: string;
    county?: string;
  }): { locationType: LocationType; locationTypeLabel: string } => {
    const layer = (params.layer || '').toLowerCase();
    const normName = normalizeGeoText(params.name);

    let locationType: LocationType;

    if (layer === 'venue') {
      if (COMMERCIAL_KEYWORD_RE.test(normName)) {
        locationType = 'estabelecimento';
      } else if (POI_PREFIX_OR_KEYWORD_RE.test(normName)) {
        locationType = 'ponto_interesse';
      } else {
        locationType = 'estabelecimento';
      }
    } else if (
      layer === 'address' ||
      (Boolean(params.street) && Boolean(params.housenumber))
    ) {
      locationType = 'endereco';
    } else if (layer === 'street') {
      locationType = 'rua';
    } else if (layer === 'neighbourhood' || layer === 'borough') {
      if (
        POI_PREFIX_OR_KEYWORD_RE.test(normName) &&
        normName.split(' ').length >= 2 &&
        !normName.startsWith('jardim ') &&
        !normName.startsWith('vila ')
      ) {
        locationType = 'ponto_interesse';
      } else {
        locationType = 'bairro';
      }
    } else if (
      layer === 'locality' ||
      layer === 'localadmin' ||
      layer === 'county' ||
      layer === 'macrocounty'
    ) {
      locationType = RMS_MUNICIPALITIES.has(normName) ? 'municipio' : 'bairro';
    } else if (STREET_PREFIX_RE.test(normName)) {
      locationType = /\d+/.test(normName) ? 'endereco' : 'rua';
    } else if (POI_PREFIX_OR_KEYWORD_RE.test(normName)) {
      locationType = 'ponto_interesse';
    } else {
      locationType = 'estabelecimento';
    }

    return {
      locationType,
      locationTypeLabel: LOCATION_TYPE_LABELS[locationType],
    };
  };

  interface OrsGeocodeFeature {
    geometry?: { coordinates?: [number, number] };
    properties?: {
      name?: string;
      label?: string;
      neighbourhood?: string;
      borough?: string;
      suburb?: string;
      locality?: string;
      county?: string;
      layer?: string;
      street?: string;
      housenumber?: string;
    };
  }

  interface GeocodedLocation {
    name: string;
    label: string;
    formattedAddress: string;
    neighbourhood: string;
    city: string;
    lat: number;
    lng: number;
    category: string;
    locationType: LocationType;
    locationTypeLabel: string;
    street?: string;
    housenumber?: string;
    orsLayer?: string;
  }

  const mapOrsFeatures = (
    features: OrsGeocodeFeature[],
    fallbackQuery: string
  ): GeocodedLocation[] => {
    return features
      .map((f): GeocodedLocation | null => {
        const [lng, lat] = f.geometry?.coordinates || [0, 0];
        if (!lat || !lng) return null;
        const p = f.properties || {};
        const name = p.name || p.street || fallbackQuery;
        const { locationType, locationTypeLabel } = classifyLocation({
          layer: p.layer,
          name,
          street: p.street,
          housenumber: p.housenumber,
          locality: p.locality,
          county: p.county,
        });

        const normName = normalizeGeoText(name);
        const normLocality = normalizeGeoText(p.locality || '');
        const rawCity =
          p.locality &&
          (RMS_MUNICIPALITIES.has(normLocality) || normLocality !== normName)
            ? p.locality
            : p.county || 'Salvador';
        const city =
          normalizeGeoText(rawCity) === 'salvador'
            ? 'Salvador'
            : rawCity || 'Salvador';

        const neighbourhood =
          p.neighbourhood ||
          p.borough ||
          p.suburb ||
          (locationType === 'bairro' ? name : '');

        const parts = [name];
        if (neighbourhood && neighbourhood !== name) parts.push(neighbourhood);
        if (city && city !== name && city !== neighbourhood) parts.push(city);

        const defaultFormatted = [
          name,
          p.street && p.street !== name
            ? `${p.street}${p.housenumber ? `, ${p.housenumber}` : ''}`
            : '',
          neighbourhood && neighbourhood !== name ? neighbourhood : '',
          city,
          'BA',
        ]
          .filter(Boolean)
          .join(', ');

        return {
          name,
          label: parts.join(' · '),
          formattedAddress:
            locationType === 'bairro' &&
            p.label &&
            normalizeGeoText(p.label).startsWith(normName) &&
            !normalizeGeoText(p.label).includes('salvador')
              ? `${name}, ${city}, BA`
              : p.label || defaultFormatted,
          neighbourhood,
          city,
          lat,
          lng,
          category: p.layer || 'address',
          locationType,
          locationTypeLabel,
          street: p.street,
          housenumber: p.housenumber,
          orsLayer: p.layer,
        };
      })
      .filter((item): item is GeocodedLocation => item !== null);
  };

  const scoreAndSortLocations = (
    items: GeocodedLocation[],
    rawQuery: string
  ): GeocodedLocation[] => {
    const normQuery = normalizeGeoText(rawQuery);
    const queryTokens = normQuery
      .split(' ')
      .filter((t) => t.length >= 2 || /^\d+$/.test(t));
    const queryNumbers: string[] = normQuery.match(/\b\d+\b/g) ?? [];
    const queryHasNumber = queryNumbers.length > 0;
    const queryHasStreet = STREET_PREFIX_RE.test(normQuery);
    const queryHasInstitutionOrVenue = INSTITUTION_OR_POI_QUERY_RE.test(normQuery);
    const queryHasParkWord = /\b(parque|lagoa|bosque)\b/.test(normQuery);
    const queryHasCampusOrUni = /\b(ucsal|ufba|uneb|ifba|unifacs|universidade|faculdade|campus)\b/.test(
      normQuery
    );
    const isPlaceOrNeighbourhoodIntent =
      !queryHasNumber && !queryHasStreet && !queryHasInstitutionOrVenue;

    // Deduplicate preserving highest-information / exact items
    const dedupedMap = new Map<string, GeocodedLocation>();
    for (const item of items) {
      const key =
        item.locationType === 'bairro' || item.locationType === 'municipio'
          ? `${normalizeGeoText(item.name)}|${item.locationType}|${normalizeGeoText(item.city)}`
          : `${normalizeGeoText(item.name)}|${item.locationType}|${item.lat.toFixed(4)}|${item.lng.toFixed(4)}`;
      if (!dedupedMap.has(key)) {
        dedupedMap.set(key, item);
      }
    }

    const scored = Array.from(dedupedMap.values()).map((item, originalIndex) => {
      let score = 0;
      const normName = normalizeGeoText(item.name);
      const normStreet = normalizeGeoText(item.street || '');
      const normFormatted = normalizeGeoText(item.formattedAddress || '');
      const normCity = normalizeGeoText(item.city || '');
      const searchable = `${normName} ${normStreet} ${normFormatted}`;

      // 1. Salvador / RMS area containment bonus (strong penalty outside RMS)
      const inRms =
        item.lat >= -13.35 &&
        item.lat <= -12.3 &&
        item.lng >= -39.1 &&
        item.lng <= -37.8;
      if (inRms) {
        score += 35;
      } else if (!RMS_MUNICIPALITIES.has(normCity)) {
        score -= 300;
      }
      if (RMS_MUNICIPALITIES.has(normCity)) score += 15;

      // 2. Textual match quality
      if (normName === normQuery) {
        score += 130;
      } else if (normName.startsWith(normQuery)) {
        score += 65;
      } else if (normName.includes(normQuery)) {
        score += 35;
      }

      if (queryTokens.length > 0) {
        let matchedTokens = 0;
        for (const tok of queryTokens) {
          if (searchable.includes(tok)) matchedTokens++;
        }
        score += Math.round((matchedTokens / queryTokens.length) * 60);
      }

      // 3. Intent-based relevance rules
      if (isPlaceOrNeighbourhoodIntent) {
        if (item.locationType === 'bairro') {
          if (normName === normQuery) {
            score += 160;
          } else if (normName.includes(normQuery)) {
            score += 90;
          } else {
            score += 35;
          }
        } else if (item.locationType === 'municipio') {
          if (normName === normQuery) {
            score += 165;
          } else if (normName.includes(normQuery)) {
            score += 80;
          }
        }
      }

      if (queryHasNumber || queryHasStreet) {
        const numberMatched =
          Boolean(item.housenumber) &&
          queryNumbers.includes(normalizeGeoText(item.housenumber || ''));
        if (item.locationType === 'endereco') {
          score += 140;
          if (numberMatched) {
            score += 95;
          }
        } else if (item.locationType === 'rua') {
          score += queryHasNumber ? 90 : 125;
        } else if (item.street && numberMatched) {
          score += 110;
        }
      }

      if (queryHasInstitutionOrVenue) {
        if (
          item.locationType === 'estabelecimento' ||
          item.locationType === 'ponto_interesse'
        ) {
          score += 85;
        }

        if (queryHasCampusOrUni) {
          if (
            /\b(universidade|faculdade|campus|instituto|centro universitario|ucsal|ufba|uneb|ifba|unifacs)\b/.test(
              normName
            )
          ) {
            score += 135;
          } else if (item.locationType === 'bairro') {
            score += 55;
          } else if (/\b(terminal|metro|estacao)\b/.test(normName)) {
            score += 40;
          }

          if (!queryHasParkWord && /\b(parque|lagoa)\b/.test(normName)) {
            score -= 65;
          }
        }
      }

      return { item, score, originalIndex };
    });

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.originalIndex - b.originalIndex;
    });

    return scored.slice(0, 10).map((entry) => entry.item);
  };

  const queryOrsGeocode = async (
    endpoint: 'autocomplete' | 'search',
    queryText: string,
    orsKey: string,
    layersFilter?: string,
    size = 10
  ): Promise<{
    ok: boolean;
    status: number | null;
    results: GeocodedLocation[];
    errorReason?: string;
  }> => {
    const controller = new AbortController();
    const timeoutMs = endpoint === 'search' ? 8500 : 5000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const orsUrl = new URL(
        `https://api.openrouteservice.org/geocode/${endpoint}`
      );
      orsUrl.searchParams.set('text', queryText);
      orsUrl.searchParams.set('boundary.country', 'BRA');
      orsUrl.searchParams.set('focus.point.lat', '-12.9714');
      orsUrl.searchParams.set('focus.point.lon', '-38.5014');
      orsUrl.searchParams.set('boundary.rect.min_lon', '-38.95');
      orsUrl.searchParams.set('boundary.rect.min_lat', '-13.25');
      orsUrl.searchParams.set('boundary.rect.max_lon', '-37.90');
      orsUrl.searchParams.set('boundary.rect.max_lat', '-12.40');
      orsUrl.searchParams.set('size', String(size));
      if (layersFilter) {
        orsUrl.searchParams.set('layers', layersFilter);
      }

      const orsRes = await fetch(orsUrl.toString(), {
        headers: {
          Authorization: orsKey,
          Accept: 'application/json, application/geo+json',
        },
        signal: controller.signal,
      });

      if (!orsRes.ok) {
        let orsErrDetail = '';
        try {
          const errText = await orsRes.text();
          const parsed = JSON.parse(errText) as {
            error?: string | { message?: string };
            message?: string;
          };
          if (typeof parsed.error === 'string') {
            orsErrDetail = parsed.error;
          } else if (parsed.error && typeof parsed.error.message === 'string') {
            orsErrDetail = parsed.error.message;
          } else if (typeof parsed.message === 'string') {
            orsErrDetail = parsed.message;
          }
        } catch {
          // ignore parse errors
        }
        return {
          ok: false,
          status: orsRes.status,
          results: [],
          errorReason: `ORS /geocode/${endpoint} retornou HTTP ${orsRes.status}${
            orsErrDetail ? ` (${orsErrDetail.slice(0, 120)})` : ''
          }`,
        };
      }

      const data = (await orsRes.json()) as {
        features?: OrsGeocodeFeature[];
      };
      const results = mapOrsFeatures(data.features || [], queryText);
      return {
        ok: true,
        status: orsRes.status,
        results,
      };
    } catch (err: unknown) {
      const errorReason =
        err instanceof Error && err.name === 'AbortError'
          ? `Timeout ao consultar ORS /geocode/${endpoint}`
          : `Falha de rede ao consultar ORS /geocode/${endpoint}`;
      return {
        ok: false,
        status: null,
        results: [],
        errorReason,
      };
    } finally {
      clearTimeout(timer);
    }
  };

  app.get('/api/geocode', async (req: Request, res: Response) => {
    const query = String(req.query.q || '').trim();
    if (query.length < 2 || query.length > 140) {
      res.status(400).json({ error: 'Consulta de endereço inválida.' });
      return;
    }

    const orsKey = process.env.OPENROUTESERVICE_API_KEY;
    let orsHttpStatus: number | null = null;
    let fallbackReason = 'OPENROUTESERVICE_API_KEY não configurada';

    // 1. OpenRouteService Geocode: /geocode/autocomplete -> fallback interno para /geocode/search
    if (orsKey && orsKey !== 'MY_OPENROUTESERVICE_API_KEY') {
      const normQ = normalizeGeoText(query);
      const shouldEnrichNeighbourhood =
        !/\d+/.test(normQ) &&
        !STREET_PREFIX_RE.test(normQ) &&
        !INSTITUTION_OR_POI_QUERY_RE.test(normQ);

      const autoRes = await queryOrsGeocode(
        'autocomplete',
        query,
        orsKey,
        undefined,
        15
      );
      orsHttpStatus = autoRes.status;

      let combinedAutoResults = autoRes.ok ? [...autoRes.results] : [];

      const hasExactPlaceResult = combinedAutoResults.some(
        (item) =>
          (item.locationType === 'bairro' ||
            item.locationType === 'municipio') &&
          normalizeGeoText(item.name) === normQ
      );

      if (autoRes.ok && shouldEnrichNeighbourhood && !hasExactPlaceResult) {
        const areaRes = await queryOrsGeocode(
          'autocomplete',
          query,
          orsKey,
          'neighbourhood,borough,locality,localadmin,county',
          5
        );
        if (areaRes.ok && areaRes.results.length > 0) {
          combinedAutoResults = [...areaRes.results, ...combinedAutoResults];
        }
      }

      if (autoRes.ok && combinedAutoResults.length > 0) {
        res.json({
          provider: 'openrouteservice',
          orsEndpoint: 'autocomplete',
          results: scoreAndSortLocations(combinedAutoResults, query),
        });
        return;
      }

      if (autoRes.ok && combinedAutoResults.length === 0) {
        console.info(
          '[geocode][ors-secondary]',
          JSON.stringify({
            provider: 'openrouteservice',
            from: '/geocode/autocomplete',
            to: '/geocode/search',
            status: autoRes.status,
            reason: '0 resultados em /geocode/autocomplete',
          })
        );

        const searchRes = await queryOrsGeocode(
          'search',
          query,
          orsKey,
          undefined,
          15
        );
        orsHttpStatus = searchRes.status;

        if (searchRes.ok && searchRes.results.length > 0) {
          res.json({
            provider: 'openrouteservice',
            orsEndpoint: 'search',
            results: scoreAndSortLocations(searchRes.results, query),
          });
          return;
        }

        fallbackReason = searchRes.ok
          ? 'ORS /geocode/autocomplete e /geocode/search retornaram 0 resultados'
          : searchRes.errorReason ||
            `ORS /geocode/search retornou HTTP ${searchRes.status}`;
      } else {
        fallbackReason =
          autoRes.errorReason ||
          `ORS /geocode/autocomplete retornou HTTP ${autoRes.status}`;
      }
    }

    // 2. Fallback externo: OpenStreetMap (Photon Pelias-compatible) focado em Salvador e RMS
    let photonHttpStatus: number | null = null;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lat=-12.9714&lon=-38.5014&limit=15`;
      const photonRes = await fetch(photonUrl, { signal: controller.signal });
      clearTimeout(timer);
      photonHttpStatus = photonRes.status;

      if (photonRes.ok) {
        const data = (await photonRes.json()) as {
          features?: Array<{
            geometry: { coordinates: [number, number] };
            properties: {
              name?: string;
              street?: string;
              housenumber?: string;
              district?: string;
              suburb?: string;
              city?: string;
              state?: string;
              type?: string;
            };
          }>;
        };

        const rmsBounds = { minLat: -13.35, maxLat: -12.3, minLng: -39.1, maxLng: -37.8 };
        const rawFeatures = data.features || [];

        const inRmsFeatures = rawFeatures.filter((f) => {
          const [lng, lat] = f.geometry.coordinates;
          return (
            lat >= rmsBounds.minLat &&
            lat <= rmsBounds.maxLat &&
            lng >= rmsBounds.minLng &&
            lng <= rmsBounds.maxLng
          );
        });
        const filtered =
          inRmsFeatures.length > 0
            ? inRmsFeatures
            : rawFeatures.filter((f) => f.properties.state === 'Bahia');

        if (filtered.length > 0) {
          const results: GeocodedLocation[] = filtered.map((f) => {
            const p = f.properties;
            const [lng, lat] = f.geometry.coordinates;
            const rawStreetAddr = p.street
              ? `${p.street}${p.housenumber ? `, ${p.housenumber}` : ''}`
              : '';
            const name = p.name || rawStreetAddr || query;
            const city = p.city || (p.type === 'city' ? p.name || 'Salvador' : 'Salvador');
            const neighbourhood = p.district || p.suburb || (p.type === 'neighbourhood' ? p.name || '' : '');
            const parts = [name];
            if (neighbourhood && neighbourhood !== name) parts.push(neighbourhood);
            if (city && city !== name && city !== neighbourhood) parts.push(city);

            const formattedParts = [name];
            if (rawStreetAddr && rawStreetAddr !== name) formattedParts.push(rawStreetAddr);
            if (neighbourhood && neighbourhood !== name) formattedParts.push(neighbourhood);
            if (city && city !== name) formattedParts.push(city);
            formattedParts.push('BA');

            const normPhotonName = normalizeGeoText(p.name || '');
            const normPhotonStreet = normalizeGeoText(p.street || '');
            const isNamedVenueOnHouse =
              p.type === 'house' &&
              Boolean(p.name) &&
              normPhotonName !== normPhotonStreet &&
              !/^\d+$/.test((p.name || '').trim()) &&
              !STREET_PREFIX_RE.test(normPhotonName);

            const mappedLayer =
              p.type === 'house'
                ? isNamedVenueOnHouse
                  ? 'venue'
                  : 'address'
                : p.type === 'street'
                ? 'street'
                : p.type === 'city'
                ? 'locality'
                : p.type === 'district' || p.type === 'suburb' || p.type === 'neighbourhood'
                ? 'neighbourhood'
                : 'venue';
            const { locationType, locationTypeLabel } = classifyLocation({
              layer: mappedLayer,
              name,
              street: p.street,
              housenumber: p.housenumber,
              locality: city,
            });

            return {
              name,
              label: parts.join(' · '),
              formattedAddress: formattedParts.join(', '),
              neighbourhood,
              city,
              lat,
              lng,
              category: p.type || 'place',
              locationType,
              locationTypeLabel,
              street: p.street,
              housenumber: p.housenumber,
              orsLayer: mappedLayer,
            };
          });

          console.warn(
            '[geocode][fallback]',
            JSON.stringify({
              provider: 'photon-osm',
              orsHttpStatus,
              fallbackHttpStatus: photonHttpStatus,
              reason: fallbackReason,
            })
          );
          res.json({
            provider: 'photon-osm',
            fallbackReason,
            results: scoreAndSortLocations(results, query),
          });
          return;
        }
        fallbackReason = `${fallbackReason}; Photon retornou 0 resultados em Salvador/RMS`;
      } else {
        fallbackReason = `${fallbackReason}; Photon retornou HTTP ${photonRes.status}`;
      }
    } catch (err: unknown) {
      const photonErr =
        err instanceof Error && err.name === 'AbortError'
          ? 'Timeout ao consultar Photon'
          : 'Falha de rede ao consultar Photon';
      fallbackReason = `${fallbackReason}; ${photonErr}`;
    }

    // 3. Fallback secundário: OpenStreetMap Nominatim com addressdetails
    let nominatimHttpStatus: number | null = null;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4500);
      const params = new URLSearchParams({
        q: query,
        format: 'jsonv2',
        addressdetails: '1',
        limit: '10',
        countrycodes: 'br',
        viewbox: '-39.10,-12.30,-37.80,-13.35',
        bounded: '1',
      });
      const nominatimRes = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        {
          headers: {
            'User-Agent': 'BoraJunto-Academic-App/1.0 (https://borajunto.edu.br)',
            'Accept-Language': 'pt-BR',
          },
          signal: controller.signal,
        }
      );
      clearTimeout(timer);
      nominatimHttpStatus = nominatimRes.status;

      if (nominatimRes.ok) {
        const items = (await nominatimRes.json()) as Array<{
          name?: string;
          display_name: string;
          lat: string;
          lon: string;
          type?: string;
          address?: {
            suburb?: string;
            neighbourhood?: string;
            city_district?: string;
            city?: string;
            town?: string;
            municipality?: string;
            road?: string;
            house_number?: string;
          };
        }>;

        const rmsItems = items.filter((item) => {
          const lat = Number(item.lat);
          const lng = Number(item.lon);
          return lat >= -13.35 && lat <= -12.3 && lng >= -39.1 && lng <= -37.8;
        });

        const results: GeocodedLocation[] = rmsItems.map((item) => {
          const addr = item.address || {};
          const rawName = (item.name || '').trim();
          const name =
            rawName && rawName !== addr.house_number
              ? rawName
              : addr.road
              ? `${addr.road}${addr.house_number ? `, ${addr.house_number}` : ''}`
              : item.display_name.split(',')[0].trim();
          const neighbourhood = addr.suburb || addr.neighbourhood || addr.city_district || '';
          const city = addr.city || addr.town || addr.municipality || 'Salvador';
          const parts = [name];
          if (neighbourhood && neighbourhood !== name) parts.push(neighbourhood);
          if (city && city !== name && city !== neighbourhood) parts.push(city);

          const mappedLayer =
            addr.house_number && addr.road && (!rawName || rawName === addr.house_number || rawName === addr.road)
              ? 'address'
              : item.type === 'residential' || item.type === 'primary' || item.type === 'secondary' || item.type === 'tertiary' || Boolean(addr.road && !rawName)
              ? 'street'
              : item.type === 'suburb' || item.type === 'neighbourhood' || item.type === 'quarter'
              ? 'neighbourhood'
              : item.type === 'city' || item.type === 'town' || item.type === 'municipality'
              ? 'locality'
              : 'venue';
          const { locationType, locationTypeLabel } = classifyLocation({
            layer: mappedLayer,
            name,
            street: addr.road,
            housenumber: addr.house_number,
            locality: city,
          });

          return {
            name,
            label: parts.join(' · '),
            formattedAddress: item.display_name,
            neighbourhood,
            city,
            lat: Number(item.lat),
            lng: Number(item.lon),
            category: item.type || 'place',
            locationType,
            locationTypeLabel,
            street: addr.road,
            housenumber: addr.house_number,
            orsLayer: mappedLayer,
          };
        });

        console.warn(
          '[geocode][fallback]',
          JSON.stringify({
            provider: 'nominatim',
            orsHttpStatus,
            photonHttpStatus,
            fallbackHttpStatus: nominatimHttpStatus,
            reason: fallbackReason,
          })
        );
        res.json({
          provider: 'nominatim',
          fallbackReason,
          results: scoreAndSortLocations(results, query),
        });
        return;
      }
      fallbackReason = `${fallbackReason}; Nominatim retornou HTTP ${nominatimRes.status}`;
    } catch (err: unknown) {
      const nomErr =
        err instanceof Error && err.name === 'AbortError'
          ? 'Timeout ao consultar Nominatim'
          : 'Falha de rede ao consultar Nominatim';
      fallbackReason = `${fallbackReason}; ${nomErr}`;
    }

    console.warn(
      '[geocode][fallback]',
      JSON.stringify({
        provider: 'fallback',
        orsHttpStatus,
        photonHttpStatus,
        nominatimHttpStatus,
        reason: fallbackReason,
      })
    );
    res.json({ provider: 'fallback', fallbackReason, results: [] });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BoraJunto server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start BoraJunto server:', err);
  process.exit(1);
});
