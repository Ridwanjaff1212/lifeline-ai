import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Phone, 
  Hospital, 
  Shield, 
  Clock, 
  Route,
  Users,
  MapPin,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  priority: number;
  availability: "available" | "busy" | "unavailable";
  responseTime: number; // minutes
  distance: number; // km
}

interface SOSRoute {
  type: "family" | "hospital" | "police" | "fire" | "ambulance";
  target: string;
  phone: string;
  eta: number;
  priority: number;
  reasoning: string;
}

interface AdaptiveSOSProps {
  vitals: { heartRate: number; spO2: number; temperature: number };
  location: { lat: number; lng: number; city: string };
  situation: "normal" | "medical" | "accident" | "crime" | "fire" | "disaster";
  onRouteSelected: (route: SOSRoute) => void;
}

export const AdaptiveSOS = ({ vitals, location, situation, onRouteSelected }: AdaptiveSOSProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendedRoutes, setRecommendedRoutes] = useState<SOSRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<SOSRoute | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  // Emergency contacts database
  const emergencyContacts: EmergencyContact[] = [
    {
      id: "mom",
      name: "Mom",
      relationship: "Mother",
      phone: "+965-9999-1234",
      priority: 1,
      availability: "available",
      responseTime: 15,
      distance: 5.2
    },
    {
      id: "dad", 
      name: "Dad",
      relationship: "Father",
      phone: "+965-9999-5678",
      priority: 2,
      availability: "available",
      responseTime: 20,
      distance: 8.1
    },
    {
      id: "brother",
      name: "Ahmed",
      relationship: "Brother",
      phone: "+965-9999-9876",
      priority: 3,
      availability: "busy",
      responseTime: 30,
      distance: 12.5
    }
  ];

  // Kuwait emergency services
  const kuwaitServices = {
    ambulance: { phone: "777", eta: 8 },
    police: { phone: "112", eta: 12 },
    fire: { phone: "777", eta: 10 },
    hospitals: [
      { name: "Kuwait Hospital", phone: "+965-2531-8000", distance: 3.2, eta: 15 },
      { name: "Al-Sabah Hospital", phone: "+965-2481-8000", distance: 5.8, eta: 22 },
      { name: "Mubarak Al-Kabeer", phone: "+965-2531-2000", distance: 7.1, eta: 28 }
    ]
  };

  const analyzeOptimalRoute = useCallback(async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    // Simulate AI analysis with progress
    const progressSteps = [
      "Analyzing vital signs...",
      "Evaluating situation context...", 
      "Checking contact availability...",
      "Calculating response times...",
      "Optimizing rescue logistics..."
    ];

    for (let i = 0; i < progressSteps.length; i++) {
      setAnalysisProgress((i + 1) * 20);
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    const routes: SOSRoute[] = [];

    // Analyze vitals to determine urgency
    const isCritical = vitals.heartRate > 120 || vitals.heartRate < 50 || 
                      vitals.spO2 < 90 || vitals.temperature > 39;
    
    const isAbnormal = vitals.heartRate > 100 || vitals.heartRate < 60 || 
                      vitals.spO2 < 95 || vitals.temperature > 37.5;

    // Route 1: Medical Priority
    if (isCritical || situation === "medical") {
      routes.push({
        type: "ambulance",
        target: "Kuwait Emergency Services",
        phone: kuwaitServices.ambulance.phone,
        eta: kuwaitServices.ambulance.eta,
        priority: 1,
        reasoning: isCritical ? 
          "Critical vitals detected - immediate medical intervention required" :
          "Medical emergency - professional care needed"
      });

      // Add nearest hospital
      const nearestHospital = kuwaitServices.hospitals[0];
      routes.push({
        type: "hospital",
        target: nearestHospital.name,
        phone: nearestHospital.phone,
        eta: nearestHospital.eta,
        priority: 2,
        reasoning: `Nearest medical facility - ${nearestHospital.distance}km away`
      });
    }

    // Route 2: Situation-based routing
    if (situation === "accident") {
      routes.push({
        type: "police",
        target: "Kuwait Police",
        phone: kuwaitServices.police.phone,
        eta: kuwaitServices.police.eta,
        priority: 1,
        reasoning: "Accident reported - police and medical response needed"
      });
    } else if (situation === "fire") {
      routes.push({
        type: "fire",
        target: "Kuwait Fire Service",
        phone: kuwaitServices.fire.phone,
        eta: kuwaitServices.fire.eta,
        priority: 1,
        reasoning: "Fire emergency - immediate fire service response"
      });
    }

    // Route 3: Family contacts (if not critical)
    if (!isCritical || routes.length === 0) {
      const availableContacts = emergencyContacts
        .filter(contact => contact.availability === "available")
        .sort((a, b) => a.responseTime - b.responseTime);

      if (availableContacts.length > 0) {
        const bestContact = availableContacts[0];
        routes.push({
          type: "family",
          target: bestContact.name,
          phone: bestContact.phone,
          eta: bestContact.responseTime,
          priority: routes.length === 0 ? 1 : 3,
          reasoning: `Closest available family member - ${bestContact.distance}km away`
        });
      }
    }

    // Route 4: Backup contacts
    if (routes.length < 3) {
      const backupContact = emergencyContacts.find(c => c.availability === "busy");
      if (backupContact) {
        routes.push({
          type: "family",
          target: `${backupContact.name} (Backup)`,
          phone: backupContact.phone,
          eta: backupContact.responseTime + 10,
          priority: 4,
          reasoning: "Backup contact - may not be immediately available"
        });
      }
    }

    // Sort by priority and select top 3
    const sortedRoutes = routes
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 3);

    setRecommendedRoutes(sortedRoutes);
    setSelectedRoute(sortedRoutes[0] || null);
    setAnalysisProgress(100);
    setIsAnalyzing(false);
  }, [vitals, situation]);

  const executeRoute = useCallback((route: SOSRoute) => {
    setSelectedRoute(route);
    onRouteSelected(route);
  }, [onRouteSelected]);

  const getRouteIcon = (type: string) => {
    switch (type) {
      case "family": return Users;
      case "hospital": return Hospital;
      case "police": return Shield;
      case "fire": return Zap;
      case "ambulance": return Phone;
      default: return Phone;
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return "text-destructive border-destructive";
      case 2: return "text-cyber-orange border-cyber-orange";
      case 3: return "text-cyber-blue border-cyber-blue";
      default: return "text-muted-foreground border-muted";
    }
  };

  return (
    <Card className="p-6 bg-[var(--gradient-card)] border-2 border-cyber-blue/30">
      <div className="flex items-center gap-3 mb-4">
        <Route className="h-6 w-6 text-cyber-blue animate-pulse" />
        <h3 className="text-xl font-bold text-foreground">Adaptive SOS Routing</h3>
        <Badge variant="outline" className="text-cyber-blue border-cyber-blue/50">
          Smart Logistics
        </Badge>
      </div>

      {/* Analysis Controls */}
      <div className="flex gap-3 mb-6">
        <Button
          onClick={analyzeOptimalRoute}
          disabled={isAnalyzing}
          className="flex-1"
        >
          <Zap className="h-4 w-4 mr-2" />
          {isAnalyzing ? "Analyzing..." : "Analyze Optimal Route"}
        </Button>
      </div>

      {/* Analysis Progress */}
      {isAnalyzing && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">AI Route Analysis</span>
            <span className="text-sm text-cyber-blue">{analysisProgress}%</span>
          </div>
          <Progress value={analysisProgress} className="h-2" />
        </div>
      )}

      {/* Current Situation Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-3 bg-muted/20">
          <div className="text-xs text-muted-foreground">Situation</div>
          <div className="text-sm font-bold text-foreground capitalize">{situation}</div>
        </Card>
        
        <Card className="p-3 bg-muted/20">
          <div className="text-xs text-muted-foreground">Heart Rate</div>
          <div className={cn("text-sm font-bold", 
            vitals.heartRate > 120 || vitals.heartRate < 50 ? "text-destructive" :
            vitals.heartRate > 100 || vitals.heartRate < 60 ? "text-cyber-orange" :
            "text-cyber-green"
          )}>
            {vitals.heartRate} BPM
          </div>
        </Card>
        
        <Card className="p-3 bg-muted/20">
          <div className="text-xs text-muted-foreground">SpO₂</div>
          <div className={cn("text-sm font-bold",
            vitals.spO2 < 90 ? "text-destructive" :
            vitals.spO2 < 95 ? "text-cyber-orange" :
            "text-cyber-green"
          )}>
            {vitals.spO2}%
          </div>
        </Card>
        
        <Card className="p-3 bg-muted/20">
          <div className="text-xs text-muted-foreground">Location</div>
          <div className="text-sm font-bold text-cyber-blue">{location.city}</div>
        </Card>
      </div>

      {/* Recommended Routes */}
      {recommendedRoutes.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground">Recommended Response Routes</h4>
          {recommendedRoutes.map((route, i) => {
            const Icon = getRouteIcon(route.type);
            const isSelected = selectedRoute?.target === route.target;
            
            return (
              <Card 
                key={i} 
                className={cn(
                  "p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02]",
                  isSelected ? "border-2 border-cyber-blue bg-cyber-blue/10" : "bg-muted/20",
                  getPriorityColor(route.priority)
                )}
                onClick={() => executeRoute(route)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Icon className="h-5 w-5 mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{route.target}</span>
                        <Badge variant="outline" className="text-xs">
                          Priority {route.priority}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {route.reasoning}
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {route.phone}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          ETA: {route.eta} min
                        </div>
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <Badge className="bg-cyber-blue text-cyber-blue-foreground">
                      Selected
                    </Badge>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Execute Button */}
      {selectedRoute && (
        <div className="mt-6">
          <Button 
            onClick={() => executeRoute(selectedRoute)}
            className="w-full bg-[var(--gradient-danger)] hover:opacity-90"
            size="lg"
          >
            <Phone className="h-4 w-4 mr-2" />
            Execute SOS Route: {selectedRoute.target}
          </Button>
        </div>
      )}
    </Card>
  );
};