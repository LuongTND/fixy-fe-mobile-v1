import Constants from 'expo-constants';

export interface LocationCoord {
  lat: number;
  lng: number;
}

export interface DistanceMatrixResult {
  distanceKm: number;
  distanceText: string;
  estimatedArrivalMinutes: number;
  durationText: string;
  status: string;
}

/**
 * Calculates distance and estimated arrival time using Goong Distance Matrix API v2.
 *
 * @param origin Start location { lat, lng } (e.g., Customer location)
 * @param destinations Destination location(s) Array of { lat, lng } (e.g., Workers' locations)
 * @param vehicle Vehicle type: 'car' | 'bike' | 'motorcycle' | 'truck' (default: 'motorcycle')
 * @returns Matrix results corresponding to each destination
 */
export async function calculateDistanceMatrix(
  origin: LocationCoord,
  destinations: LocationCoord[],
  vehicle: 'car' | 'bike' | 'motorcycle' | 'truck' = 'motorcycle'
): Promise<DistanceMatrixResult[]> {
  if (!destinations || destinations.length === 0) return [];

  const apiKey = Constants.expoConfig?.extra?.goongApiKey || '';
  if (!apiKey) {
    console.warn('[DistanceMatrix] GOONG_API_KEY is not configured in app.config.js / .env.local');
    return [];
  }

  const originsParam = `${origin.lat},${origin.lng}`;
  const destinationsParam = destinations.map((d) => `${d.lat},${d.lng}`).join('|');

  const url = `https://rsapi.goong.io/v2/distancematrix?origins=${originsParam}&destinations=${encodeURIComponent(
    destinationsParam
  )}&vehicle=${vehicle}&api_key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.rows || !data.rows[0] || !data.rows[0].elements) {
      console.warn('[DistanceMatrix] Invalid response format:', data);
      return [];
    }

    const elements = data.rows[0].elements;
    return elements.map((item: any) => {
      if (item.status !== 'OK' || !item.duration || !item.distance) {
        return {
          distanceKm: 0,
          distanceText: '',
          estimatedArrivalMinutes: 0,
          durationText: '',
          status: item.status || 'ERROR',
        };
      }

      // 1. duration.value (giây) -> quy đổi ra số phút (làm tròn lên Math.ceil)
      const estimatedArrivalMinutes = Math.ceil(item.duration.value / 60);

      // 2. distance.value (mét) -> quy đổi ra km
      const distanceKm = Number((item.distance.value / 1000).toFixed(2));

      return {
        distanceKm,
        distanceText: item.distance.text, // e.g., "11.99 km"
        estimatedArrivalMinutes, // e.g., 34 (phút)
        durationText: item.duration.text, // e.g., "34 phút"
        status: item.status,
      };
    });
  } catch (error) {
    console.error('[DistanceMatrix] Error calling Goong Distance Matrix API v2:', error);
    return [];
  }
}
