import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  MapPin, 
  Clock, 
  Users, 
  TrendingUp,
  AlertTriangle,
  Shield,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EmergencyEvent {
  id: string;
  type: "medical" | "accident" | "fire" | "crime" | "disaster";
  location: string;
  district: string;
  timestamp: Date;
  severity: "low" | "medium" | "high" | "critical";
  status: "active" | "responded" | "resolved";
  responders: number;
}

interface CommunityStats {
  totalUsers: number;
  activeEmergencies: number;
  resolvedToday: number;
  averageResponseTime: number;
  safetyIndex: number;
}

interface CommunityPulseProps {
  currentLocation: { lat: number; lng: number; city: string };
  onEmergencySelected: (event: EmergencyEvent) => void;
}

export const CommunityPulse = ({ currentLocation, onEmergencySelected }: CommunityPulseProps) => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [recentEvents, setRecentEvents] = useState<EmergencyEvent[]>([]);
  const [communityStats, setCommunityStats] = useState<CommunityStats>({
    totalUsers: 0,
    activeEmergencies: 0,
    resolvedToday: 0,
    averageResponseTime: 0,
    safetyIndex: 0
  });
  const [selectedDistrict, setSelectedDistrict] = useState<string>("All Kuwait");

  // Kuwait districts for filtering
  const kuwaitDistricts = [
    "All Kuwait",
    "Kuwait City",
    "Hawalli", 
    "Farwaniya",
    "Ahmadi",
    "Jahra",
    "Mubarak Al-Kabeer"
  ];

  // Generate realistic emergency data for Kuwait
  const generateEmergencyEvents = useCallback(() => {
    const eventTypes: Array<EmergencyEvent["type"]> = ["medical", "accident", "fire", "crime", "disaster"];
    const locations = [
      "Salmiya", "Kuwait City", "Hawalli", "Farwaniya", "Ahmadi", 
      "Jahra", "Fahaheel", "Mahboula", "Mangaf", "Abu Halifa"
    ];
    const severities: Array<EmergencyEvent["severity"]> = ["low", "medium", "high", "critical"];
    const statuses: Array<EmergencyEvent["status"]> = ["active", "responded", "resolved"];

    const events: EmergencyEvent[] = [];
    const now = new Date();

    // Generate 15-20 events from last 24 hours
    for (let i = 0; i < 18; i++) {
      const timestamp = new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000);
      const location = locations[Math.floor(Math.random() * locations.length)];
      
      events.push({
        id: `KW-${Date.now()}-${i}`,
        type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
        location,
        district: getDistrict(location),
        timestamp,
        severity: severities[Math.floor(Math.random() * severities.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        responders: Math.floor(Math.random() * 15) + 1
      });
    }

    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, []);

  // Map locations to districts
  const getDistrict = (location: string): string => {
    const districtMap: Record<string, string> = {
      "Salmiya": "Hawalli",
      "Kuwait City": "Kuwait City", 
      "Hawalli": "Hawalli",
      "Farwaniya": "Farwaniya",
      "Ahmadi": "Ahmadi",
      "Jahra": "Jahra",
      "Fahaheel": "Ahmadi",
      "Mahboula": "Ahmadi",
      "Mangaf": "Ahmadi",
      "Abu Halifa": "Ahmadi"
    };
    return districtMap[location] || "Kuwait City";
  };

  // Calculate community statistics
  const calculateStats = useCallback((events: EmergencyEvent[]) => {
    const activeEvents = events.filter(e => e.status === "active");
    const resolvedToday = events.filter(e => 
      e.status === "resolved" && 
      e.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
    
    const avgResponseTime = events
      .filter(e => e.status !== "active")
      .reduce((acc, event) => {
        // Simulate response time based on severity
        const baseTime = event.severity === "critical" ? 8 : 
                         event.severity === "high" ? 15 :
                         event.severity === "medium" ? 25 : 35;
        return acc + baseTime + Math.random() * 10;
      }, 0) / Math.max(1, events.filter(e => e.status !== "active").length);

    // Safety index calculation (0-100)
    const totalEmergencies = events.length;
    const criticalEvents = events.filter(e => e.severity === "critical").length;
    const responseRate = resolvedToday.length / Math.max(1, activeEvents.length + resolvedToday.length);
    
    const safetyIndex = Math.max(0, 100 - (criticalEvents * 15) - (totalEmergencies * 2) + (responseRate * 30));

    return {
      totalUsers: 2847 + Math.floor(Math.random() * 200), // Simulated active users
      activeEmergencies: activeEvents.length,
      resolvedToday: resolvedToday.length,
      averageResponseTime: Math.round(avgResponseTime),
      safetyIndex: Math.round(safetyIndex)
    };
  }, []);

  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    
    // Initial data load
    const events = generateEmergencyEvents();
    setRecentEvents(events);
    setCommunityStats(calculateStats(events));

    // Simulate real-time updates every 30 seconds
    const interval = setInterval(() => {
      // Occasionally add new events or update existing ones
      if (Math.random() > 0.7) {
        const newEvents = generateEmergencyEvents();
        setRecentEvents(newEvents);
        setCommunityStats(calculateStats(newEvents));
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [generateEmergencyEvents, calculateStats]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    
    if (isMonitoring) {
      cleanup = startMonitoring();
    }
    
    return cleanup;
  }, [isMonitoring, startMonitoring]);

  const filteredEvents = recentEvents.filter(event => 
    selectedDistrict === "All Kuwait" || event.district === selectedDistrict
  );

  const getEventIcon = (type: string) => {
    switch (type) {
      case "medical": return Activity;
      case "accident": return AlertTriangle;
      case "fire": return Zap;
      case "crime": return Shield;
      case "disaster": return TrendingUp;
      default: return Activity;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low": return "text-cyber-green border-cyber-green";
      case "medium": return "text-cyber-blue border-cyber-blue";
      case "high": return "text-cyber-orange border-cyber-orange";
      case "critical": return "text-destructive border-destructive";
      default: return "text-muted-foreground border-muted";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "text-destructive";
      case "responded": return "text-cyber-orange";
      case "resolved": return "text-cyber-green";
      default: return "text-muted-foreground";
    }
  };

  const getSafetyIndexColor = (index: number) => {
    if (index >= 80) return "text-cyber-green";
    if (index >= 60) return "text-cyber-blue";
    if (index >= 40) return "text-cyber-orange";
    return "text-destructive";
  };

  return (
    <Card className="p-6 bg-[var(--gradient-card)] border-2 border-cyber-purple/30">
      <div className="flex items-center gap-3 mb-4">
        <Users className="h-6 w-6 text-cyber-purple animate-pulse" />
        <h3 className="text-xl font-bold text-foreground">Community Pulse</h3>
        <Badge variant="outline" className="text-cyber-purple border-cyber-purple/50">
          Kuwait Network
        </Badge>
      </div>

      {/* Control Panel */}
      <div className="flex gap-3 mb-6">
        <Button
          onClick={() => setIsMonitoring(!isMonitoring)}
          variant={isMonitoring ? "destructive" : "default"}
          className="flex-1"
        >
          <Activity className="h-4 w-4 mr-2" />
          {isMonitoring ? "Stop Monitoring" : "Start Community Monitoring"}
        </Button>
      </div>

      {/* Community Statistics */}
      {isMonitoring && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <Card className="p-3 bg-muted/20">
            <div className="text-xs text-muted-foreground">Active Users</div>
            <div className="text-lg font-bold text-cyber-blue">
              {communityStats.totalUsers.toLocaleString()}
            </div>
          </Card>
          
          <Card className="p-3 bg-muted/20">
            <div className="text-xs text-muted-foreground">Active SOS</div>
            <div className="text-lg font-bold text-destructive">
              {communityStats.activeEmergencies}
            </div>
          </Card>
          
          <Card className="p-3 bg-muted/20">
            <div className="text-xs text-muted-foreground">Resolved Today</div>
            <div className="text-lg font-bold text-cyber-green">
              {communityStats.resolvedToday}
            </div>
          </Card>
          
          <Card className="p-3 bg-muted/20">
            <div className="text-xs text-muted-foreground">Avg Response</div>
            <div className="text-lg font-bold text-cyber-orange">
              {communityStats.averageResponseTime}m
            </div>
          </Card>
          
          <Card className="p-3 bg-muted/20">
            <div className="text-xs text-muted-foreground">Safety Index</div>
            <div className={cn("text-lg font-bold", getSafetyIndexColor(communityStats.safetyIndex))}>
              {communityStats.safetyIndex}/100
            </div>
          </Card>
        </div>
      )}

      {/* District Filter */}
      {isMonitoring && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {kuwaitDistricts.map(district => (
              <Button
                key={district}
                variant={selectedDistrict === district ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDistrict(district)}
                className="text-xs"
              >
                {district}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Emergency Events */}
      {isMonitoring && filteredEvents.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-medium text-foreground">
              Recent Events - {selectedDistrict}
            </h4>
            <Badge variant="outline" className="text-xs">
              Last 24h
            </Badge>
          </div>
          
          <div className="max-h-64 overflow-y-auto space-y-2">
            {filteredEvents.slice(0, 8).map((event) => {
              const Icon = getEventIcon(event.type);
              
              return (
                <Card 
                  key={event.id}
                  className="p-3 cursor-pointer hover:bg-muted/30 transition-all duration-200"
                  onClick={() => onEmergencySelected(event)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Icon className="h-4 w-4 mt-1 text-cyber-purple" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium capitalize">
                            {event.type.replace('_', ' ')}
                          </span>
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", getSeverityColor(event.severity))}
                          >
                            {event.severity}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", getStatusColor(event.status))}
                          >
                            {event.status}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {event.timestamp.toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {event.responders} responders
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {isMonitoring && (
        <div className="mt-4 text-xs text-center text-muted-foreground">
          <div className="flex items-center justify-center gap-1">
            <div className="w-2 h-2 bg-cyber-purple rounded-full animate-pulse"></div>
            Live community data • Anonymous aggregated statistics
          </div>
        </div>
      )}
    </Card>
  );
};