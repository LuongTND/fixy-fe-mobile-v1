import Constants from 'expo-constants';

export const GOONG_API_KEY = Constants.expoConfig?.extra?.goongApiKey || '';
export const GOONG_MAPTILES_API_KEY = Constants.expoConfig?.extra?.goongMaptilesApiKey || '';

export type LatLng = {
  lat: number;
  lng: number;
};

export type DistanceMatrixVehicle = 'car' | 'bike' | 'truck' | 'taxi' | 'hd' | 'motorcycle';

export type DistanceMatrixElement = {
  status: 'OK' | 'NOT_FOUND' | 'ZERO_RESULTS' | string;
  distance?: {
    text: string; // e.g. "11.99 km"
    value: number; // in meters, e.g. 11988
  };
  duration?: {
    text: string; // e.g. "34 phút"
    value: number; // in seconds, e.g. 2016
  };
};

export type DistanceMatrixRow = {
  elements: DistanceMatrixElement[];
};

export type DistanceMatrixResponse = {
  rows: DistanceMatrixRow[];
};

function normalizeVehicle(vehicle?: string): string {
  if (!vehicle || vehicle === 'motorcycle') return 'bike';
  if (['car', 'bike', 'truck', 'taxi', 'hd'].includes(vehicle)) return vehicle;
  return 'bike';
}

/**
 * Fetch Distance Matrix V2 from Goong Maps API
 * Calculates distance & duration between origins and destinations.
 * 
 * @param origins Single coordinate or array of coordinates { lat, lng }
 * @param destinations Array of destination coordinates [{ lat, lng }]
 * @param vehicle 'bike' | 'car' | 'truck' | 'taxi' | 'hd' (default: 'bike')
 */
export async function getDistanceMatrix(
  origins: LatLng | LatLng[],
  destinations: LatLng[],
  vehicle: DistanceMatrixVehicle = 'bike'
): Promise<DistanceMatrixResponse | null> {
  try {
    if (!GOONG_API_KEY) {
      console.warn('[Goong API] Missing GOONG_API_KEY');
      return null;
    }

    const rawOrigins = Array.isArray(origins) ? origins : [origins];
    const originsArr = rawOrigins.filter(
      (o) => o && !isNaN(Number(o.lat)) && !isNaN(Number(o.lng)) && (Number(o.lat) !== 0 || Number(o.lng) !== 0)
    );

    const destsArr = (destinations || []).filter(
      (d) => d && !isNaN(Number(d.lat)) && !isNaN(Number(d.lng)) && (Number(d.lat) !== 0 || Number(d.lng) !== 0)
    );

    if (originsArr.length === 0 || destsArr.length === 0) {
      return null;
    }

    const originsStr = originsArr.map((o) => `${o.lat},${o.lng}`).join('%7C');
    const destinationsStr = destsArr.map((d) => `${d.lat},${d.lng}`).join('%7C');
    const vehicleType = normalizeVehicle(vehicle);

    const url = `https://rsapi.goong.io/v2/distancematrix?origins=${originsStr}&destinations=${destinationsStr}&vehicle=${vehicleType}&api_key=${GOONG_API_KEY}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[Goong API] HTTP ${response.status}:`, errorBody, `URL: ${url}`);
      return null;
    }

    const data: DistanceMatrixResponse = await response.json();
    return data;
  } catch (error) {
    console.error('[Goong API] Error fetching Distance Matrix:', error);
    return null;
  }
}

/**
 * Helper to calculate distance & estimated duration between 2 points (origin -> destination)
 */
export async function getDistanceAndDuration(
  origin: LatLng,
  destination: LatLng,
  vehicle: DistanceMatrixVehicle = 'motorcycle'
): Promise<{ distanceText: string; distanceMeters: number; durationText: string; durationSeconds: number } | null> {
  const result = await getDistanceMatrix(origin, [destination], vehicle);
  const element = result?.rows?.[0]?.elements?.[0];

  if (
    element &&
    (element.status === 'OK' || element.status === 'ok') &&
    element.distance &&
    element.duration
  ) {
    return {
      distanceText: element.distance.text,
      distanceMeters: element.distance.value,
      durationText: element.duration.text,
      durationSeconds: element.duration.value,
    };
  }

  return null;
}

/**
 * Decode an encoded polyline string (Google/Goong format) into an array of [lng, lat] coordinates.
 * Used to draw route lines on the map.
 */
export function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lng / 1e5, lat / 1e5]); // [lng, lat] for GeoJSON/Goong
  }

  return points;
}

export type DirectionsResult = {
  encodedPolyline: string;
  decodedCoords: [number, number][];
  distanceText: string;
  distanceMeters: number;
  durationText: string;
  durationSeconds: number;
};

/**
 * Fetch Directions from Goong Maps API.
 * Returns the route polyline and distance/duration info between origin and destination.
 *
 * @param origin Start coordinate { lat, lng }
 * @param destination End coordinate { lat, lng }
 * @param vehicle 'car' | 'bike' (default: 'bike')
 */
export async function getDirections(
  origin: LatLng,
  destination: LatLng,
  vehicle: 'car' | 'bike' = 'bike'
): Promise<DirectionsResult | null> {
  try {
    if (!GOONG_API_KEY) {
      console.warn('[Goong API] Missing GOONG_API_KEY');
      return null;
    }

    if (
      !origin || !destination ||
      isNaN(origin.lat) || isNaN(origin.lng) ||
      isNaN(destination.lat) || isNaN(destination.lng)
    ) {
      return null;
    }

    const url = `https://rsapi.goong.io/Direction?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&vehicle=${vehicle}&api_key=${GOONG_API_KEY}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[Goong API] Directions HTTP ${response.status}:`, errorBody);
      return null;
    }

    const data = await response.json();
    const route = data?.routes?.[0];

    if (!route) {
      console.warn('[Goong API] No routes found');
      return null;
    }

    const leg = route.legs?.[0];
    const encodedPolyline = route.overview_polyline?.points || '';
    const decodedCoords = encodedPolyline ? decodePolyline(encodedPolyline) : [];

    return {
      encodedPolyline,
      decodedCoords,
      distanceText: leg?.distance?.text || '',
      distanceMeters: leg?.distance?.value || 0,
      durationText: leg?.duration?.text || '',
      durationSeconds: leg?.duration?.value || 0,
    };
  } catch (error) {
    console.error('[Goong API] Error fetching Directions:', error);
    return null;
  }
}
