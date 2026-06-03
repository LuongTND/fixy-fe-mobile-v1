/**
 * Parses web-style deep links from notifications and maps them to application routes.
 */
export interface ParsedRoute {
  pathname: string;
  params: Record<string, string>;
}

export function parseDeepLink(deepLink: string | null | undefined): ParsedRoute | null {
  if (!deepLink) return null;

  const path = deepLink.trim();

  // Pattern 1: /customer/bookings/:id
  const customerBookingMatch = path.match(/\/customer\/bookings\/([a-fA-F0-9-]{36})/);
  if (customerBookingMatch) {
    return {
      pathname: '/booking-detail',
      params: { bookingId: customerBookingMatch[1] },
    };
  }

  // Pattern 2: /worker/bookings/:id
  const workerBookingMatch = path.match(/\/worker\/bookings\/([a-fA-F0-9-]{36})/);
  if (workerBookingMatch) {
    return {
      pathname: '/(worker)/worker-job-detail',
      params: { id: workerBookingMatch[1] },
    };
  }

  // Pattern 3: /bookings/:id (General fallback)
  const generalBookingMatch = path.match(/\/bookings\/([a-fA-F0-9-]{36})/);
  if (generalBookingMatch) {
    return {
      pathname: '/booking-detail',
      params: { bookingId: generalBookingMatch[1] },
    };
  }

  return null;
}
