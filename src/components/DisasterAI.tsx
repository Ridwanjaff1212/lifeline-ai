import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  Zap, 
  Flame, 
  Wind, 
  Droplets, 
  Thermometer,
  Radio,
  Satellite
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DisasterEvent {
  type: "earthquake" | "fire" | "gas_leak" | "flood" | "sandstorm" | "heat_wave";
  severity: "low" | "medium" | "high" | "critical";
  location: string;
  confidence: number;
  timestamp: Date;
  guidance: string[];
}

interface DisasterAIProps {
  onDisasterDetected: (event: DisasterEvent) => void;
  currentLocation: { lat: number; lng: number; city: string };
}

export const DisasterAI = ({ onDisasterDetected, currentLocation }: DisasterAIProps) => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [activeDisasters, setActiveDisasters] = useState<DisasterEvent[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [environmentalData, setEnvironmentalData] = useState({
    seismicActivity: 0,
    gasLevels: 0,
    temperature: 25,
    humidity: 60,
    windSpeed: 5
  });

  // Kuwait-specific disaster patterns
  const disasterPatterns = {
    earthquake: {
      triggers: ["seismic > 3.0", "accelerometer spike"],
      guidance: [
        "Drop, Cover, Hold On",
        "Stay away from windows and heavy objects",
        "If outdoors, move away from buildings",
        "Do not use elevators"
      ]
    },
    fire: {
      triggers: ["temperature spike", "smoke detection", "gas levels"],
      guidance: [
        "Evacuate immediately",
        "Stay low to avoid smoke",
        "Feel doors before opening",
        "Call Kuwait Fire Service: 777"
      ]
    },
    gas_leak: {
      triggers: ["gas sensor spike", "unusual smell reports"],
      guidance: [
        "Evacuate area immediately",
        "Do not use electrical devices",
        "Ventilate if safe to do so",
        "Call Kuwait Gas Emergency: 1888888"
      ]
    },
    heat_wave: {
      triggers: ["temperature > 45°C", "humidity patterns"],
      guidance: [
        "Stay indoors during peak hours",
        "Drink water frequently",
        "Wear light colored clothing",
        "Check on elderly neighbors"
      ]
    },
    sandstorm: {
      triggers: ["wind speed > 30km/h", "visibility < 1km"],
      guidance: [
        "Stay indoors with windows closed",
        "Wear protective masks if outside",
        "Avoid driving if possible",
        "Cover air conditioning units"
      ]
    },
    flood: {
      triggers: ["heavy rainfall", "drainage overflow"],
      guidance: [
        "Move to higher ground",
        "Avoid walking in moving water",
        "Do not drive through flooded roads",
        "Turn off electricity if water enters home"
      ]
    }
  };

  // Simulate Kuwait Civil Defense API
  const fetchKuwaitAlerts = useCallback(async () => {
    // Simulate API call to Kuwait Civil Defense
    const alerts = [
      {
        id: "KW-2024-001",
        type: "heat_wave" as const,
        severity: "high" as const,
        location: "Kuwait City",
        active: true,
        timestamp: new Date()
      },
      {
        id: "KW-2024-002", 
        type: "sandstorm" as const,
        severity: "medium" as const,
        location: "Ahmadi",
        active: false,
        timestamp: new Date(Date.now() - 3600000)
      }
    ];

    return alerts.filter(alert => alert.active);
  }, []);

  // Environmental sensor simulation
  const simulateEnvironmentalSensors = useCallback(() => {
    const newData = {
      seismicActivity: Math.random() * 2, // Simulated Richter scale
      gasLevels: Math.random() * 100, // PPM
      temperature: 25 + Math.random() * 25, // Celsius
      humidity: 40 + Math.random() * 40, // Percentage
      windSpeed: Math.random() * 40 // km/h
    };

    setEnvironmentalData(newData);
    
    // Check for disaster patterns
    checkForDisasters(newData);
    setLastUpdate(new Date());
  }, []);

  const checkForDisasters = useCallback((data: typeof environmentalData) => {
    const detectedEvents: DisasterEvent[] = [];

    // Earthquake detection
    if (data.seismicActivity > 3.0) {
      detectedEvents.push({
        type: "earthquake",
        severity: data.seismicActivity > 5.0 ? "critical" : "high",
        location: currentLocation.city,
        confidence: 0.9,
        timestamp: new Date(),
        guidance: disasterPatterns.earthquake.guidance
      });
    }

    // Heat wave detection
    if (data.temperature > 45) {
      detectedEvents.push({
        type: "heat_wave",
        severity: data.temperature > 50 ? "critical" : "high",
        location: currentLocation.city,
        confidence: 0.85,
        timestamp: new Date(),
        guidance: disasterPatterns.heat_wave.guidance
      });
    }

    // Sandstorm detection
    if (data.windSpeed > 30) {
      detectedEvents.push({
        type: "sandstorm",
        severity: data.windSpeed > 50 ? "critical" : "medium",
        location: currentLocation.city,
        confidence: 0.8,
        timestamp: new Date(),
        guidance: disasterPatterns.sandstorm.guidance
      });
    }

    // Gas leak detection
    if (data.gasLevels > 80) {
      detectedEvents.push({
        type: "gas_leak",
        severity: "critical",
        location: currentLocation.city,
        confidence: 0.95,
        timestamp: new Date(),
        guidance: disasterPatterns.gas_leak.guidance
      });
    }

    if (detectedEvents.length > 0) {
      setActiveDisasters(prev => [...prev, ...detectedEvents]);
      detectedEvents.forEach(event => onDisasterDetected(event));
    }
  }, [currentLocation, onDisasterDetected]);

  const startMonitoring = useCallback(async () => {
    setIsMonitoring(true);
    
    // Fetch initial alerts
    const alerts = await fetchKuwaitAlerts();
    console.log("Kuwait Civil Defense alerts:", alerts);
    
    // Start environmental monitoring
    const interval = setInterval(simulateEnvironmentalSensors, 5000);
    
    return () => clearInterval(interval);
  }, [fetchKuwaitAlerts, simulateEnvironmentalSensors]);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
  }, []);

  const getDisasterIcon = (type: string) => {
    switch (type) {
      case "earthquake": return Zap;
      case "fire": return Flame;
      case "gas_leak": return Radio;
      case "heat_wave": return Thermometer;
      case "sandstorm": return Wind;
      case "flood": return Droplets;
      default: return AlertTriangle;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low": return "text-cyber-green border-cyber-green";
      case "medium": return "text-cyber-orange border-cyber-orange";
      case "high": return "text-cyber-red border-cyber-red";
      case "critical": return "text-destructive border-destructive";
      default: return "text-muted-foreground border-muted";
    }
  };

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    
    if (isMonitoring) {
      startMonitoring().then(cleanupFn => {
        cleanup = cleanupFn;
      });
    }
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [isMonitoring, startMonitoring]);

  return (
    <Card className="p-6 bg-[var(--gradient-card)] border-2 border-cyber-orange/30">
      <div className="flex items-center gap-3 mb-4">
        <AlertTriangle className="h-6 w-6 text-cyber-orange animate-pulse" />
        <h3 className="text-xl font-bold text-foreground">Disaster-Aware AI</h3>
        <Badge variant="outline" className="text-cyber-orange border-cyber-orange/50">
          Kuwait Network
        </Badge>
      </div>

      {/* Control Panel */}
      <div className="flex gap-3 mb-6">
        <Button
          onClick={isMonitoring ? stopMonitoring : () => setIsMonitoring(true)}
          variant={isMonitoring ? "destructive" : "default"}
          className="flex-1"
        >
          <Satellite className="h-4 w-4 mr-2" />
          {isMonitoring ? "Stop Monitoring" : "Start Disaster Monitoring"}
        </Button>
      </div>

      {/* Environmental Sensors */}
      {isMonitoring && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <Card className="p-3 bg-muted/20">
            <div className="text-xs text-muted-foreground">Seismic</div>
            <div className="text-lg font-bold text-cyber-blue">
              {environmentalData.seismicActivity.toFixed(1)}
            </div>
          </Card>
          
          <Card className="p-3 bg-muted/20">
            <div className="text-xs text-muted-foreground">Gas PPM</div>
            <div className="text-lg font-bold text-cyber-green">
              {environmentalData.gasLevels.toFixed(0)}
            </div>
          </Card>
          
          <Card className="p-3 bg-muted/20">
            <div className="text-xs text-muted-foreground">Temp °C</div>
            <div className="text-lg font-bold text-cyber-orange">
              {environmentalData.temperature.toFixed(1)}
            </div>
          </Card>
          
          <Card className="p-3 bg-muted/20">
            <div className="text-xs text-muted-foreground">Humidity</div>
            <div className="text-lg font-bold text-cyber-blue">
              {environmentalData.humidity.toFixed(0)}%
            </div>
          </Card>
          
          <Card className="p-3 bg-muted/20">
            <div className="text-xs text-muted-foreground">Wind km/h</div>
            <div className="text-lg font-bold text-cyber-purple">
              {environmentalData.windSpeed.toFixed(1)}
            </div>
          </Card>
          
          <Card className="p-3 bg-muted/20">
            <div className="text-xs text-muted-foreground">Status</div>
            <div className="text-sm font-bold text-cyber-green">Live</div>
          </Card>
        </div>
      )}

      {/* Active Disasters */}
      {activeDisasters.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground">Active Disasters</h4>
          {activeDisasters.slice(-3).map((disaster, i) => {
            const Icon = getDisasterIcon(disaster.type);
            return (
              <Alert key={i} className={cn("border-2", getSeverityColor(disaster.severity))}>
                <Icon className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-medium capitalize">
                        {disaster.type.replace('_', ' ')} - {disaster.severity}
                      </span>
                      <div className="text-xs text-muted-foreground">
                        {disaster.location} • {disaster.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                    <Badge variant="outline" className={getSeverityColor(disaster.severity)}>
                      {(disaster.confidence * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="text-xs space-y-1">
                    {disaster.guidance.slice(0, 2).map((guide, j) => (
                      <div key={j}>• {guide}</div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            );
          })}
        </div>
      )}

      {isMonitoring && lastUpdate && (
        <div className="mt-4 text-xs text-muted-foreground text-center">
          Last update: {lastUpdate.toLocaleTimeString()}
          <div className="flex items-center justify-center gap-1 mt-1">
            <div className="w-2 h-2 bg-cyber-green rounded-full animate-pulse"></div>
            Connected to Kuwait Civil Defense Network
          </div>
        </div>
      )}
    </Card>
  );
};