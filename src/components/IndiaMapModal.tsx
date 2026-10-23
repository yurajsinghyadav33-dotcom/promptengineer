import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, Navigation, Search, CheckCircle2, 
  ShieldAlert, Users, Layers, Compass
} from 'lucide-react';
import L from 'leaflet';
import type { 
  ExistingIncident, 
  ProximityMatch 
} from '../services/nearbyIncidentsService';
import { ProximityService } from '../services/nearbyIncidentsService';

interface IndiaMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocationString: string;
  onSelectLocation: (locationStr: string, matchedIncident?: ExistingIncident) => void;
  onShowToast: (msg: string) => void;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const IndiaMapModal: React.FC<IndiaMapModalProps> = ({
  isOpen,
  onClose,
  currentLocationString,
  onSelectLocation,
  onShowToast
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const radiusCircleRef = useRef<L.Circle | null>(null);
  const incidentMarkersRef = useRef<L.Marker[]>([]);
  const updatePositionRef = useRef<((lat: number, lng: number) => void) | null>(null);

  // Default coordinate: New Delhi (India Capital)
  const [selectedCoord, setSelectedCoord] = useState<{ lat: number; lng: number }>({
    lat: 28.6289,
    lng: 77.0788
  });
  const [detectedAddress, setDetectedAddress] = useState<string>(
    currentLocationString || 'Gali No. 4, Vikas Nagar near Primary School, New Delhi'
  );
  const [radiusMeters, setRadiusMeters] = useState<number>(500);
  const [proximityMatch, setProximityMatch] = useState<ProximityMatch | null>(null);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Update map state (user pin, radar circle, incident pins)
  const renderMapState = useCallback((lat: number, lng: number, radius: number) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // 1. Remove old user marker & circle
    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
    }
    if (radiusCircleRef.current) {
      map.removeLayer(radiusCircleRef.current);
    }

    // 2. Custom pulsing user pin icon
    const userIcon = L.divIcon({
      className: 'custom-user-marker',
      html: `<div style="
        width: 22px;
        height: 22px;
        background: #06b6d4;
        border: 3px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 0 16px #06b6d4;
        animation: pulse 1.5s infinite;
      "></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });

    const userMarker = L.marker([lat, lng], { icon: userIcon, draggable: true }).addTo(map);
    userMarker.bindPopup(`<strong>Your Location (GPS Pin)</strong><br/>${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`);
    userMarker.on('dragend', (e) => {
      const newPos = (e.target as L.Marker).getLatLng();
      updatePositionRef.current?.(newPos.lat, newPos.lng);
    });
    userMarkerRef.current = userMarker;

    // 3. Radar Radius Circle
    const circle = L.circle([lat, lng], {
      radius: radius,
      color: '#06b6d4',
      fillColor: '#06b6d4',
      fillOpacity: 0.12,
      weight: 2,
      dashArray: '6, 6'
    }).addTo(map);
    radiusCircleRef.current = circle;

    // 4. Incident Pins
    incidentMarkersRef.current.forEach(m => map.removeLayer(m));
    incidentMarkersRef.current = [];

    const allIncidents = ProximityService.getIncidents();
    allIncidents.forEach(inc => {
      const getPinColor = () => {
        switch (inc.urgency) {
          case 'Critical': return '#ef4444';
          case 'High': return '#f97316';
          case 'Medium': return '#eab308';
          default: return '#10b981';
        }
      };

      const pinIcon = L.divIcon({
        className: 'incident-marker-pin',
        html: `<div style="
          background: ${getPinColor()};
          width: 24px;
          height: 24px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 2px solid #ffffff;
          box-shadow: 0 4px 10px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
        "><span style="transform: rotate(45deg); font-size: 10px; font-weight: bold; color: #fff;">!</span></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 24]
      });

      const incMarker = L.marker([inc.lat, inc.lng], { icon: pinIcon }).addTo(map);
      incMarker.bindPopup(`
        <div style="font-family: sans-serif; min-width: 180px;">
          <div style="font-size: 11px; font-weight: bold; color: ${getPinColor()}; text-transform: uppercase;">
            ${escapeHtml(inc.urgency)} Urgency • ${escapeHtml(inc.category)}
          </div>
          <div style="font-size: 13px; font-weight: bold; margin: 4px 0;">${escapeHtml(inc.title)}</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">📍 ${escapeHtml(inc.address)}</div>
          <div style="font-size: 11px; color: #0284c7; font-weight: 600;">👥 ${inc.verificationsCount} Citizens Corroborated</div>
        </div>
      `);
      incidentMarkersRef.current.push(incMarker);
    });

    // 5. Evaluate Proximity Match
    const match = ProximityService.findProximityMatch(lat, lng, radius);
    setProximityMatch(match);
  }, []);

  const updatePosition = useCallback(async (lat: number, lng: number) => {
    setSelectedCoord({ lat, lng });
    renderMapState(lat, lng, radiusMeters);

    // Reverse geocode to human-readable address
    const address = await ProximityService.reverseGeocode(lat, lng);
    setDetectedAddress(address);
  }, [radiusMeters, renderMapState]);

  // Keep ref up to date
  useEffect(() => {
    updatePositionRef.current = updatePosition;
  }, [updatePosition]);

  // Keyboard accessibility (Escape key to close modal)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Initialize and manage Leaflet map
  useEffect(() => {
    if (!isOpen) return;

    // Small delay to ensure modal DOM is mounted
    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        // Create Leaflet map centered on current selected coordinate
        const map = L.map(mapContainerRef.current, {
          center: [selectedCoord.lat, selectedCoord.lng],
          zoom: 14,
          zoomControl: true
        });

        // OpenStreetMap Tile Layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        mapInstanceRef.current = map;

        // Click map to drop pin
        map.on('click', async (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          updatePositionRef.current?.(lat, lng);
        });
      } else {
        mapInstanceRef.current.invalidateSize();
      }

      // Render markers & check proximity
      renderMapState(selectedCoord.lat, selectedCoord.lng, radiusMeters);
    }, 150);

    return () => {
      clearTimeout(timer);
    };
  }, [isOpen, selectedCoord.lat, selectedCoord.lng, radiusMeters, renderMapState]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Browser GPS Geolocation detection
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      onShowToast('Geolocation is not supported by your browser.');
      return;
    }

    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsDetecting(false);
        const { latitude, longitude } = pos.coords;
        onShowToast(`GPS Position locked: ${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`);
        setSelectedCoord({ lat: latitude, lng: longitude });

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 15, { duration: 1.2 });
        }
        await updatePosition(latitude, longitude);
      },
      (err) => {
        setIsDetecting(false);
        onShowToast(`GPS Notice: ${err.message}. Using New Delhi central reference.`);
        updatePosition(28.6289, 77.0788);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Search locality in India via OpenStreetMap Nominatim
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const q = encodeURIComponent(`${searchQuery}, India`);
      const signal = AbortSignal.timeout(6000);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`, {
        headers: { 'User-Agent': 'SignalSetu-Civic-App/1.0' },
        signal
      });
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        setSelectedCoord({ lat, lng });
        setDetectedAddress(item.display_name.split(', ').slice(0, 4).join(', '));
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 15, { duration: 1.2 });
        }
        renderMapState(lat, lng, radiusMeters);
        onShowToast(`Jumped to: ${searchQuery}`);
      } else {
        onShowToast('Location not found. Try entering city name (e.g. "Dwarka, Delhi" or "Koramangala, Bengaluru").');
      }
    } catch {
      onShowToast('Search request timed out. You can click anywhere on the map to drop a pin.');
    } finally {
      setIsSearching(false);
    }
  };

  // Corroborate an existing nearby incident
  const handleCorroborate = (incidentId: string) => {
    const updated = ProximityService.corroborateIncident(incidentId);
    if (updated) {
      onShowToast(`Verification vote added! Incident now has ${updated.verificationsCount} citizen endorsements.`);
      renderMapState(selectedCoord.lat, selectedCoord.lng, radiusMeters);
    }
  };

  // Adopt incident and populate Action Console
  const handleAdoptIncident = (incident: ExistingIncident) => {
    onSelectLocation(incident.address, incident);
    onShowToast(`Loaded nearby incident: "${incident.title}" into Action Console!`);
    onClose();
  };

  // Confirm custom location
  const handleConfirmLocation = () => {
    onSelectLocation(detectedAddress, proximityMatch?.incident);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 120 }}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '960px', width: '95%', maxHeight: '92vh', padding: '24px' }}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ marginBottom: '14px' }}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Compass size={22} color="var(--accent-cyan)" />
              <span>India Geospatial Incident Radar</span>
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Detect GPS location, check 500m community radius, and discover nearby active situations.
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Search & GPS Toolbar */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '260px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                className="main-textarea"
                style={{ minHeight: 'unset', height: '40px', padding: '8px 12px 8px 36px', fontSize: '0.86rem' }}
                placeholder="Search any locality/city in India (e.g. Vikas Nagar Delhi, Koramangala)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-dim)' }} />
            </div>
            <button className="btn btn-secondary btn-sm" type="submit" disabled={isSearching}>
              <span>{isSearching ? 'Searching...' : 'Search'}</span>
            </button>
          </form>

          <button 
            className="btn btn-primary btn-sm" 
            onClick={handleDetectGPS} 
            disabled={isDetecting}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Navigation size={15} />
            <span>{isDetecting ? 'Detecting GPS...' : 'Detect My Live GPS'}</span>
          </button>
        </div>

        {/* Radius Selector Pills */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '12px', fontSize: '0.82rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
            <Layers size={15} color="var(--accent-violet)" />
            <span>Proximity Radar Radius:</span>
            {[
              { val: 100, label: '100m' },
              { val: 500, label: '500m (Standard)' },
              { val: 1000, label: '1 km' },
              { val: 5000, label: '5 km' }
            ].map(r => (
              <button
                key={r.val}
                className={`chip-btn ${radiusMeters === r.val ? 'active' : ''}`}
                style={{
                  background: radiusMeters === r.val ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.06)',
                  color: radiusMeters === r.val ? '#000000' : 'var(--text-main)',
                  fontWeight: radiusMeters === r.val ? 700 : 500,
                  fontSize: '0.74rem',
                  padding: '3px 10px'
                }}
                onClick={() => {
                  setRadiusMeters(r.val);
                  renderMapState(selectedCoord.lat, selectedCoord.lng, r.val);
                }}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem', color: 'var(--text-dim)' }}>
            <a 
              href="https://www.openstreetmap.org" 
              target="_blank" 
              rel="noreferrer" 
              style={{ color: 'var(--text-dim)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <span>OpenStreetMap ↗</span>
            </a>
            <span>• Click anywhere on map to move pin</span>
          </div>
        </div>

        {/* Interactive Leaflet Map Container */}
        <div 
          ref={mapContainerRef} 
          id="india-map-container"
          style={{ 
            width: '100%', 
            height: '340px', 
            borderRadius: 'var(--radius-sm)', 
            border: '1px solid rgba(6, 182, 212, 0.3)',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.6)',
            marginBottom: '16px'
          }} 
        />

        {/* Proximity Match Intelligence Banner */}
        {proximityMatch && proximityMatch.matchType !== 'none' && proximityMatch.incident ? (
          <div style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(15, 23, 42, 0.9))',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: 'var(--radius-sm)',
            padding: '14px 18px',
            marginBottom: '16px',
            animation: 'fadeIn 0.3s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} color="#ef4444" />
                <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f87171' }}>
                  {proximityMatch.matchType === 'exact' 
                    ? '⚠️ Exact Incident Match Detected (<50m)!' 
                    : `⚠️ Nearby Community Situation Detected (${proximityMatch.distanceMeters}m away)!`}
                </span>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', color: '#38bdf8', background: 'rgba(6, 182, 212, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                <Users size={12} />
                <span>{proximityMatch.incident.verificationsCount} Citizens Endorsed</span>
              </div>
            </div>

            <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
              {proximityMatch.incident.title}
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              📍 {proximityMatch.incident.address} • Category: {proximityMatch.incident.category} • Urgency: {proximityMatch.incident.urgency}
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleCorroborate(proximityMatch.incident!.id)}
                style={{ borderColor: 'var(--status-verified)', color: '#34d399' }}
              >
                <CheckCircle2 size={14} />
                <span>Corroborate This Issue (+1 Verified Vote)</span>
              </button>

              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleAdoptIncident(proximityMatch.incident!)}
              >
                <span>Adopt Incident Details</span>
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            marginBottom: '16px',
            fontSize: '0.82rem',
            color: '#a7f3d0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} />
            <span>No active community complaints within {radiusMeters}m radius. Ready to report a new situation.</span>
          </div>
        )}

        {/* Footer: Detected address & Apply button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px' }}>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700 }}>
              Detected Location Reference:
            </div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📍</span>
              <span>{detectedAddress}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleConfirmLocation}>
              Apply This Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
