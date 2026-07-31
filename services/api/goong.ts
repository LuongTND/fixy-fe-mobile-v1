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
