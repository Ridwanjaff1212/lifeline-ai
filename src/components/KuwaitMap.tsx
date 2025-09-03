import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  MapPin, 
  Hospital, 
  Shield, 
  Navigation, 
  Wifi, 
  WifiOff,
  Zap
} from "lucide-react";

interface KuwaitMapProps {
  currentLocation?: [number, number];
  emergencyMode?: boolean;
  onLocationUpdate?: (coords: [number, number]) => void;
}

interface LocationPoint {
  id: string;
  name: string;
  type: "hospital" | "police" | "fire" | "shelter";
  coordinates: [number, number];
  phone: string;
  distance?: number;
}

const kuwaitEmergencyPoints: LocationPoint[] = [
  // Hospitals
  {
    id: "alamiri",
    name: "Al-Amiri Hospital",
    type: "hospital",
    coordinates: [47.9774, 29.3759],
    phone: "22451000"
  },
  {
    id: "mubarak",
    name: "Mubarak Al-Kabeer Hospital", 
    type: "hospital",
    coordinates: [48.0193, 29.3117],
    phone: "25338888"
  },
  {
    id: "farwaniya",
    name: "Farwaniya Hospital",
    type: "hospital",
    coordinates: [47.9391, 29.2977],
    phone: "24880000"
  },
  {
    id: "sabah",
    name: "Sabah Hospital",
    type: "hospital",
    coordinates: [47.9293, 29.3375],
    phone: "24812000"
  },
  // Police Stations
  {
    id: "police-central",
    name: "Central Police Station",
    type: "police",
    coordinates: [47.9783, 29.3697],
    phone: "112"
  },
  {
    id: "police-hawalli",
    name: "Hawalli Police Station",
    type: "police",
    coordinates: [48.0263, 29.3328],
    phone: "112"
  },
  // Fire Stations
  {
    id: "fire-central",
    name: "Central Fire Station",
    type: "fire",
    coordinates: [47.9645, 29.3721],
    phone: "777"
  },
  {
    id: "fire-farwaniya",
    name: "Farwaniya Fire Station",
    type: "fire",
    coordinates: [47.9333, 29.2899],
    phone: "777"
  }
];

const kuwaitAreas = [
  "Kuwait City", "Hawalli", "Farwaniya", "Mubarak Al-Kabeer", 
  "Ahmadi", "Jahra", "Salmiya", "Fahaheel", "Jabriya", "Surra"
];

export const KuwaitMap = ({ currentLocation, emergencyMode, onLocationUpdate }: KuwaitMapProps) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [mapboxToken, setMapboxToken] = useState("");
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<[number, number]>(
    currentLocation || [47.9774, 29.3759] // Default to Kuwait City
  );
  const [nearbyPoints, setNearbyPoints] = useState<LocationPoint[]>([]);
  const [selectedArea, setSelectedArea] = useState("Kuwait City");
  
  const mapContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      // Calculate distances to emergency points
      const pointsWithDistance = kuwaitEmergencyPoints.map(point => ({
        ...point,
        distance: calculateDistance(selectedLocation, point.coordinates)
      })).sort((a, b) => (a.distance || 0) - (b.distance || 0));
      
      setNearbyPoints(pointsWithDistance.slice(0, 6));
      onLocationUpdate?.(selectedLocation);
    }
  }, [selectedLocation, onLocationUpdate]);

  const calculateDistance = (coord1: [number, number], coord2: [number, number]): number => {
    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getLocationIcon = (type: string) => {
    switch (type) {
      case "hospital": return <Hospital className="h-4 w-4 text-cyber-red" />;
      case "police": return <Shield className="h-4 w-4 text-cyber-blue" />;
      case "fire": return <Zap className="h-4 w-4 text-cyber-orange" />;
      default: return <MapPin className="h-4 w-4 text-cyber-green" />;
    }
  };

  const getAreaCoordinates = (area: string): [number, number] => {
    const coordinates: { [key: string]: [number, number] } = {
      "Kuwait City": [47.9774, 29.3759],
      "Hawalli": [48.0263, 29.3328],
      "Farwaniya": [47.9391, 29.2977],
      "Mubarak Al-Kabeer": [48.0193, 29.3117],
      "Ahmadi": [48.0837, 29.0769],
      "Jahra": [47.6581, 29.3375],
      "Salmiya": [48.0507, 29.3394],
      "Fahaheel": [48.1086, 29.0826],
      "Jabriya": [48.0193, 29.3117],
      "Surra": [47.9239, 29.3789]
    };
    return coordinates[area] || [47.9774, 29.3759];
  };

  const simulateGPSLocation = () => {
    // Simulate getting current GPS location
    const coords = getAreaCoordinates(selectedArea);
    // Add small random offset to simulate real GPS
    const newCoords: [number, number] = [
      coords[0] + (Math.random() - 0.5) * 0.01,
      coords[1] + (Math.random() - 0.5) * 0.01
    ];
    setSelectedLocation(newCoords);
  };

  const callEmergencyService = (phone: string, name: string) => {
    if (emergencyMode) {
      // In emergency mode, actually initiate call
      window.open(`tel:${phone}`, "_self");
    } else {
      // Show confirmation dialog
      if (confirm(`Call ${name} at ${phone}?`)) {
        window.open(`tel:${phone}`, "_self");
      }
    }
  };

  return (
    <div className="space-y-4 font-poppins">
      {/* Connection Status */}
      <Card className={`p-3 ${isOnline ? 'border-cyber-green/30' : 'border-cyber-red/30'}`}>
        <div className="flex items-center gap-2">
          {isOnline ? <Wifi className="h-4 w-4 text-cyber-green" /> : <WifiOff className="h-4 w-4 text-cyber-red" />}
          <span className={`text-sm ${isOnline ? 'text-cyber-green' : 'text-cyber-red'}`}>
            {isOnline ? "Online - Live Maps Available" : "Offline - Using Cached Kuwait Map"}
          </span>
        </div>
      </Card>

      {/* Area Selection */}
      <Card className="p-4 bg-[var(--gradient-card)] border-cyber-blue/30">
        <div className="flex items-center gap-2 mb-3">
          <Navigation className="h-4 w-4 text-cyber-blue" />
          <span className="font-medium text-cyber-blue">Current Location</span>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Select Kuwait Area:</label>
            <select 
              value={selectedArea}
              onChange={(e) => {
                setSelectedArea(e.target.value);
                setSelectedLocation(getAreaCoordinates(e.target.value));
              }}
              className="w-full p-2 bg-background border border-border rounded text-foreground"
            >
              {kuwaitAreas.map(area => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </div>

          <Button 
            onClick={simulateGPSLocation}
            className="w-full bg-cyber-green text-background"
            size="sm"
          >
            <Navigation className="h-4 w-4 mr-2" />
            Get GPS Location
          </Button>
        </div>

        <div className="mt-3 p-2 bg-background/30 rounded">
          <div className="text-xs text-muted-foreground">Coordinates:</div>
          <div className="font-mono text-sm">
            {selectedLocation[1].toFixed(6)}°N, {selectedLocation[0].toFixed(6)}°E
          </div>
        </div>
      </Card>

      {/* Map Placeholder (Offline Mode) */}
      {!isOnline && (
        <Card className="p-4 bg-[var(--gradient-card)] border-cyber-orange/30">
          <div className="text-center">
            <div className="text-6xl mb-4">🗺️</div>
            <h3 className="font-medium text-cyber-orange mb-2">Kuwait Emergency Map</h3>
            <p className="text-sm text-muted-foreground">
              Offline mode: Emergency locations cached locally
            </p>
            <div className="mt-4 p-3 bg-cyber-orange/10 rounded border border-cyber-orange/30">
              <div className="text-sm">
                <strong>Current Area:</strong> {selectedArea}<br/>
                <strong>Emergency Number:</strong> 112 (Police), 777 (Fire), 101 (Medical)
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Online Map with Mapbox Token Input */}
      {isOnline && (
        <Card className="p-4 bg-[var(--gradient-card)] border-cyber-purple/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-cyber-purple">Live Kuwait Map</h3>
            <Button
              size="sm"
              onClick={() => setShowTokenInput(!showTokenInput)}
              variant="outline"
            >
              Setup Map
            </Button>
          </div>
          
          {showTokenInput && (
            <div className="mb-4">
              <Input
                placeholder="Enter Mapbox public token (pk.)"
                value={mapboxToken}
                onChange={(e) => setMapboxToken(e.target.value)}
                className="mb-2"
              />
              <p className="text-xs text-muted-foreground">
                Get your token from <a href="https://mapbox.com" target="_blank" className="text-cyber-blue">mapbox.com</a>
              </p>
            </div>
          )}
          
          <div 
            ref={mapContainer}
            className="h-64 bg-background/30 rounded border border-border flex items-center justify-center"
          >
            {mapboxToken ? (
              <div className="text-center">
                <div className="text-4xl mb-2">🗺️</div>
                <p className="text-sm text-muted-foreground">
                  Interactive Kuwait map would load here
                </p>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-4xl mb-2">🔑</div>
                <p className="text-sm text-muted-foreground">
                  Click "Setup Map" to add Mapbox token
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Nearby Emergency Services */}
      <Card className="p-4 bg-[var(--gradient-card)] border-cyber-red/30">
        <h3 className="font-medium text-cyber-red mb-3 flex items-center gap-2">
          <Hospital className="h-4 w-4" />
          Nearest Emergency Services
        </h3>
        
        <div className="space-y-2">
          {nearbyPoints.map((point) => (
            <div
              key={point.id}
              className="flex items-center justify-between p-3 bg-background/30 rounded border border-border hover:border-cyber-red/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {getLocationIcon(point.type)}
                <div>
                  <div className="font-medium text-sm">{point.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {point.distance?.toFixed(1)} km away
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => callEmergencyService(point.phone, point.name)}
                className={`${
                  emergencyMode 
                    ? "bg-cyber-red text-white animate-pulse" 
                    : "bg-cyber-blue text-white"
                }`}
              >
                Call
              </Button>
            </div>
          ))}
        </div>
        
        {emergencyMode && (
          <div className="mt-4 p-3 bg-cyber-red/20 border border-cyber-red rounded">
            <div className="text-cyber-red font-medium text-sm">🚨 EMERGENCY MODE ACTIVE</div>
            <div className="text-xs text-muted-foreground mt-1">
              Tap any service above to call immediately
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};