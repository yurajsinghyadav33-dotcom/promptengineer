export interface GeoLocation {
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  accuracyMeters?: number;
}

export interface ExistingIncident {
  id: string;
  title: string;
  category: 'Civic Infrastructure' | 'Emergency & Safety' | 'Health & Medication' | 'Accessibility & Rights' | 'General Civic';
  urgency: 'Low' | 'Medium' | 'High' | 'Critical';
  lat: number;
  lng: number;
  address: string;
  timeReported: string;
  status: 'Active' | 'Under Investigation' | 'Dispatched' | 'Resolved';
  verificationsCount: number;
  description: string;
}

export interface ProximityMatch {
  matchType: 'exact' | 'nearby' | 'area' | 'none';
  distanceMeters: number;
  incident?: ExistingIncident;
  allNearby: { incident: ExistingIncident; distanceMeters: number }[];
}

// Calculate Haversine distance in meters between two lat/lng coordinates
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    return Infinity;
  }
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Pre-seeded realistic active community incidents across Indian coordinates
export const DEFAULT_EXISTING_INCIDENTS: ExistingIncident[] = [
  // Delhi NCR
  {
    id: 'inc-del-1',
    title: 'Pedestrian Streetlight Blackout & School Route Hazard (Pole #L-42)',
    category: 'Civic Infrastructure',
    urgency: 'High',
    lat: 28.6289,
    lng: 77.0788,
    address: 'Gali No. 4, Vikas Nagar near Primary School, New Delhi',
    timeReported: '3 days ago',
    status: 'Active',
    verificationsCount: 4,
    description: 'Streetlight has been inoperative for 3 nights, school students returning in dark.'
  },
  {
    id: 'inc-del-2',
    title: 'High-Voltage 11KV Transformer Sparking near Community Park',
    category: 'Emergency & Safety',
    urgency: 'Critical',
    lat: 28.5823,
    lng: 77.0500,
    address: 'Corner of Main Road, near Community Park, Sector 12, Dwarka',
    timeReported: '45 mins ago',
    status: 'Dispatched',
    verificationsCount: 7,
    description: 'Continuous arc flashes emitting from Phase-C bushing insulator, children playing nearby.'
  },
  {
    id: 'inc-del-3',
    title: 'SDM Office Main Gate Inaccessible for Wheelchairs (No Ramp)',
    category: 'Accessibility & Rights',
    urgency: 'Medium',
    lat: 28.6928,
    lng: 77.1512,
    address: 'Sub-Divisional Magistrate Office, North District, Delhi',
    timeReported: '2 days ago',
    status: 'Under Investigation',
    verificationsCount: 3,
    description: 'Steep 4-step concrete entrance with absent ramp violating RPwD Act 2016.'
  },
  {
    id: 'inc-del-4',
    title: 'Drinking Water Pipeline Breach & Road Submersion',
    category: 'Civic Infrastructure',
    urgency: 'High',
    lat: 28.5700,
    lng: 77.2450,
    address: 'Block C, Lajpat Nagar, New Delhi',
    timeReported: '2 hours ago',
    status: 'Active',
    verificationsCount: 5,
    description: 'Underground potable pipe ruptured causing 6-inch waterlogging on road.'
  },
  // Bengaluru
  {
    id: 'inc-blr-1',
    title: 'Deep Road Pothole & Waterlogging Cavity',
    category: 'Civic Infrastructure',
    urgency: 'High',
    lat: 12.9352,
    lng: 77.6245,
    address: '80 Feet Road, 4th Block, Koramangala, Bengaluru',
    timeReported: '1 day ago',
    status: 'Active',
    verificationsCount: 8,
    description: '8-inch pothole causing frequent two-wheeler skidding near signal.'
  },
  // Mumbai
  {
    id: 'inc-mum-1',
    title: 'Open Manhole without Warning Barricade',
    category: 'Emergency & Safety',
    urgency: 'Critical',
    lat: 19.0178,
    lng: 72.8478,
    address: 'Near Dadar TT Circle, Mumbai',
    timeReported: '1 hour ago',
    status: 'Under Investigation',
    verificationsCount: 11,
    description: 'Stormwater manhole lid broken, high risk for pedestrians in heavy rain.'
  },
  // Pune
  {
    id: 'inc-pun-1',
    title: 'Elderly Fall Trauma & Unlevel Walkway',
    category: 'Health & Medication',
    urgency: 'Critical',
    lat: 18.5204,
    lng: 73.8567,
    address: 'JM Road near Sambhaji Park, Pune',
    timeReported: '30 mins ago',
    status: 'Dispatched',
    verificationsCount: 2,
    description: 'Elderly citizen slipped on broken paver tiles, 108 ambulance summoned.'
  }
];

export class ProximityService {
  private static STORAGE_KEY = 'signalsetu_community_incidents_v1';
  private static geocodeCache = new Map<string, string>();

  public static getIncidents(): ExistingIncident[] {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(i => ({ ...i }));
        }
      }
    } catch {
      // Graceful fallback on localStorage / parse errors
    }
    return DEFAULT_EXISTING_INCIDENTS.map(i => ({ ...i }));
  }

  public static saveIncident(incident: ExistingIncident): void {
    const list = this.getIncidents();
    list.unshift({ ...incident });
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
    } catch {
      // Handle storage quota issues gracefully
    }
  }

  public static corroborateIncident(incidentId: string): ExistingIncident | null {
    const list = this.getIncidents();
    const item = list.find(i => i.id === incidentId);
    if (item) {
      item.verificationsCount += 1;
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
      } catch {
        // Handle storage quota issues gracefully
      }
      return { ...item };
    }
    return null;
  }

  /**
   * Compares a given lat/lng to all existing saved incidents
   * @param lat target latitude
   * @param lng target longitude
   * @param radiusMeters matching radius threshold (default: 500m)
   */
  public static findProximityMatch(lat: number, lng: number, radiusMeters: number = 500): ProximityMatch {
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return {
        matchType: 'none',
        distanceMeters: Infinity,
        allNearby: []
      };
    }
    const safeRadius = Math.max(1, isNaN(radiusMeters) ? 500 : radiusMeters);
    const incidents = this.getIncidents();

    const scored = incidents.map(inc => {
      const dist = calculateDistanceMeters(lat, lng, inc.lat, inc.lng);
      return { incident: inc, distanceMeters: dist };
    });

    scored.sort((a, b) => a.distanceMeters - b.distanceMeters);

    const withinRadius = scored.filter(s => s.distanceMeters <= safeRadius);

    if (withinRadius.length > 0) {
      const closest = withinRadius[0];
      return {
        matchType: closest.distanceMeters <= 50 ? 'exact' : 'nearby',
        distanceMeters: closest.distanceMeters,
        incident: closest.incident,
        allNearby: withinRadius
      };
    }

    // Check area match (< 5km)
    const areaMatches = scored.filter(s => s.distanceMeters <= 5000);
    if (areaMatches.length > 0) {
      return {
        matchType: 'area',
        distanceMeters: areaMatches[0].distanceMeters,
        incident: areaMatches[0].incident,
        allNearby: areaMatches
      };
    }

    return {
      matchType: 'none',
      distanceMeters: scored.length > 0 ? scored[0].distanceMeters : Infinity,
      allNearby: []
    };
  }

  /**
   * Reverse geocodes coordinates into human-readable Indian locality address
   * Includes 4s abort timeout and in-memory caching to avoid hitting rate limits.
   */
  public static async reverseGeocode(lat: number, lng: number): Promise<string> {
    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (this.geocodeCache.has(cacheKey)) {
      return this.geocodeCache.get(cacheKey)!;
    }

    try {
      const signal = AbortSignal.timeout(4000);
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
        headers: { 'User-Agent': 'SignalSetu-Civic-App/1.0' },
        signal
      });
      if (res.ok) {
        const data = await res.json();
        if (data.display_name) {
          const parts = data.display_name.split(', ');
          const formatted = parts.slice(0, 4).join(', ');
          this.geocodeCache.set(cacheKey, formatted);
          return formatted;
        }
      }
    } catch {
      // Graceful fallback on network timeout, offline, or rate-limiting
    }
    const fallback = `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E (India)`;
    this.geocodeCache.set(cacheKey, fallback);
    return fallback;
  }
}
