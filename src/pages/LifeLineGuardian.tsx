import { useState, useEffect, useCallback } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { GuardianStatus } from "@/components/GuardianStatus";
import { TriageChat } from "@/components/TriageChat";
import { AegisWatch3D } from "@/components/AegisWatch3D";
import { MedicalVitalScanner } from "@/components/MedicalVitalScanner";
import { VitalCard } from "@/components/VitalCard";
import { EmergencyButton } from "@/components/EmergencyButton";
import { EmergencyModal } from "@/components/EmergencyModal";
import { UserProfileSetup, UserProfile } from "@/components/UserProfileSetup";
import { IncidentPack, IncidentData } from "@/components/IncidentPack";
import { EnhancedQRGenerator } from "@/components/EnhancedQRGenerator";
import { QRBraceletDesigner } from "@/components/QRBraceletDesigner";
import { KuwaitMap } from "@/components/KuwaitMap";
import { VoiceCommands } from "@/components/VoiceCommands";
import { AdvancedNeuralAI } from "@/components/AdvancedNeuralAI";
import { DisasterAI } from "@/components/DisasterAI";
import { AdaptiveSOS } from "@/components/AdaptiveSOS";
import { SurvivalMode } from "@/components/SurvivalMode";
import { CommunityPulse } from "@/components/CommunityPulse";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useRiskScoreEngine } from "@/components/RiskScoreEngine";
import { DiagnosticsPanel } from "@/components/DiagnosticsPanel";
import { SmartWatchHub } from "@/components/SmartWatchHub";
import { RealisticSmartWatch } from "@/components/RealisticSmartWatch";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Shield, 
  Heart, 
  Activity, 
  Thermometer,
  MapPin,
  Users,
  Mic,
  Camera,
  Watch,
  Zap,
  Phone,
  Settings,
  FileText,
  Navigation,
  QrCode,
  Brain,
  Battery,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HealthReading {
  heartRate: number;
  spO2: number;
  temperature: number;
  confidence: number;
  timestamp: Date;
}

export const LifeLineGuardian = () => {
  const { toast } = useToast();
  const { riskState, updateRisk, addEnvironmentalRisk, getDiagnostics, engine } = useRiskScoreEngine();
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  
  // Core system states  
  const [guardianStatus, setGuardianStatus] = useState<"safe" | "elevated" | "emergency">("safe");
  const [lastSystemCheck, setLastSystemCheck] = useState(new Date());
  const [activeAlerts, setActiveAlerts] = useState(0);
  
  // Health monitoring
  const [healthReadings, setHealthReadings] = useState<HealthReading>({
    heartRate: 72,
    spO2: 98,
    temperature: 36.8,
    confidence: 85,
    timestamp: new Date()
  });
  
  // User profile
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: "Guardian User",
    age: "30",
    bloodType: "O+",
    medicalNotes: "",
    emergencyContacts: [],
    preferredHospitals: []
  });
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  
  // Emergency system
  const [emergencyModal, setEmergencyModal] = useState({
    isOpen: false,
    type: ""
  });
  const [incidentData, setIncidentData] = useState<IncidentData | null>(null);
  const [showIncidentPack, setShowIncidentPack] = useState(false);
  const [showQRGenerator, setShowQRGenerator] = useState(false);
  const [showBraceletDesigner, setShowBraceletDesigner] = useState(false);
  
  // Location & sensors
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
    city: string;
    address: string;
  } | null>(null);
  
  const [sensorData, setSensorData] = useState({
    accelerometer: { x: 0, y: 0, z: 0 },
    motion: false,
    fallDetected: false
  });
  
  // Community & helpers
  const [communityHelpers, setCommunityHelpers] = useState(0);
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  // Next-level features state
  const [batteryLevel, setBatteryLevel] = useState(75);
  const [isOnline, setIsOnline] = useState(true);
  const [currentSituation, setCurrentSituation] = useState<"normal" | "medical" | "accident" | "crime" | "fire" | "disaster">("normal");

  // Initialize systems on app load
  useEffect(() => {
    const initializeGuardian = async () => {
      // Simulate system initialization
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Request permissions
      await requestSystemPermissions();
      
      // Setup sensors
      setupMotionSensors();
      
      // Setup location monitoring
      requestLocationAccess();
      
      // Initialize voice commands
      initializeVoiceCommands();
      
      setIsLoading(false);
      
      toast({
        title: "Guardian Activated",
        description: "All systems online. You are protected 24/7.",
        variant: "default"
      });
    };

    initializeGuardian();
  }, []);

  // System permissions
  const requestSystemPermissions = async () => {
    try {
      // Request camera access
      await navigator.mediaDevices.getUserMedia({ video: true });
      
      // Request microphone access
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Request location access
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(() => {}, () => {});
      }
      
      // Request notification permission
      if ('Notification' in window) {
        await Notification.requestPermission();
      }
      
      toast({
        title: "Permissions Granted",
        description: "Full Guardian functionality enabled",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Permissions Required",
        description: "Some features may be limited without full permissions",
        variant: "destructive"
      });
    }
  };

  // Location monitoring
  const requestLocationAccess = useCallback(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        // Kuwait city detection
        const kuwaitCities = [
          { name: "Kuwait City", lat: 29.3759, lng: 47.9774, range: 0.05 },
          { name: "Hawalli", lat: 29.3328, lng: 48.0263, range: 0.03 },
          { name: "Farwaniya", lat: 29.2977, lng: 47.9391, range: 0.04 },
          { name: "Salmiya", lat: 29.3394, lng: 48.0507, range: 0.02 },
          { name: "Ahmadi", lat: 29.0769, lng: 48.0837, range: 0.06 },
          { name: "Jahra", lat: 29.3375, lng: 47.6581, range: 0.08 }
        ];

        let detectedCity = "Kuwait";
        for (const city of kuwaitCities) {
          const distance = Math.sqrt(
            Math.pow(latitude - city.lat, 2) + Math.pow(longitude - city.lng, 2)
          );
          if (distance <= city.range) {
            detectedCity = city.name;
            break;
          }
        }

        setCurrentLocation({
          latitude,
          longitude,
          accuracy: accuracy || 0,
          city: detectedCity,
          address: `${detectedCity}, Kuwait`
        });
      },
      (error) => {
        console.error("Location access denied:", error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  // Motion sensor setup for fall detection
  const setupMotionSensors = useCallback(() => {
    if ('DeviceMotionEvent' in window) {
      const handleMotion = (event: DeviceMotionEvent) => {
        const acc = event.accelerationIncludingGravity;
        if (acc) {
          const magnitude = Math.sqrt((acc.x || 0) ** 2 + (acc.y || 0) ** 2 + (acc.z || 0) ** 2);
          const isFall = magnitude > 25; // Significant impact detection
          
          setSensorData(prev => ({
            ...prev,
            accelerometer: { x: acc.x || 0, y: acc.y || 0, z: acc.z || 0 },
            motion: magnitude > 12,
            fallDetected: isFall
          }));

          if (isFall && guardianStatus !== "emergency") {
            handleEmergencyTrigger("Fall Detection");
          }
        }
      };

      window.addEventListener('devicemotion', handleMotion);
      return () => window.removeEventListener('devicemotion', handleMotion);
    }
  }, [guardianStatus]);

  // Voice command initialization
  const initializeVoiceCommands = useCallback(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setIsVoiceActive(true);
    }
  }, []);

  // Risk scoring system with advanced engine
  useEffect(() => {
    const newRiskState = updateRisk({
      heartRate: healthReadings.heartRate,
      spO2: healthReadings.spO2,
      temperature: healthReadings.temperature,
      timestamp: new Date(),
      source: "sensor"
    });
    
    // Add environmental factors
    if (sensorData.fallDetected) {
      addEnvironmentalRisk({
        type: "sensor",
        severity: 8,
        confidence: 0.92,
        description: "Fall detected by accelerometer",
        evidence: { sensorType: "accelerometer" }
      });
    }
    
    // Update guardian status based on risk
    const score = newRiskState.current;
    if (score >= 7) setGuardianStatus("emergency");
    else if (score >= 4) setGuardianStatus("elevated");
    else setGuardianStatus("safe");
    
    setActiveAlerts(score > 3 ? Math.ceil(score / 2) : 0);
  }, [healthReadings, sensorData, updateRisk, addEnvironmentalRisk]);

  // Emergency trigger handler
  const handleEmergencyTrigger = useCallback((type: string) => {
    setEmergencyModal({ isOpen: true, type });
    setGuardianStatus("emergency");
    
    // Auto-escalate for sensor-detected emergencies
    if (type === "Fall Detection") {
      setTimeout(() => {
        handleEmergencyConfirmed();
      }, 15000);
    }
  }, []);

  // Emergency confirmation
  const handleEmergencyConfirmed = useCallback(() => {
    if (!currentLocation) {
      toast({
        title: "Location Required",
        description: "Enable GPS for emergency services",
        variant: "destructive"
      });
      return;
    }

    const incident: IncidentData = {
      id: `INC-${Date.now()}`,
      type: emergencyModal.type,
      timestamp: new Date(),
      location: {
        coordinates: [currentLocation.longitude, currentLocation.latitude],
        address: currentLocation.address,
        city: currentLocation.city
      },
      vitals: {
        heartRate: [healthReadings.heartRate],
        spO2: [healthReadings.spO2],
        temperature: [healthReadings.temperature],
        timestamps: [new Date().toLocaleTimeString()]
      },
      timeline: [
        { time: new Date().toLocaleTimeString(), event: "Emergency detected", severity: "critical" as const },
        { time: new Date().toLocaleTimeString(), event: "Guardian Autopilot activated", severity: "info" as const }
      ],
      mediaCapture: { hasAudio: true, hasVideo: true, duration: 15 },
      riskScore: riskState.current,
      status: "active" as const,
      notes: `Guardian auto-detected: ${emergencyModal.type}`
    };

    setIncidentData(incident);
    setShowIncidentPack(true);
    setEmergencyModal({ isOpen: false, type: "" });
    
    // Simulate emergency call
    toast({
      title: "Emergency Services Contacted",
      description: `Calling 112 - ${emergencyModal.type} at ${currentLocation.address}`,
      variant: "destructive"
    });

    // Update community helpers (simulate nearby response)
    setCommunityHelpers(prev => prev + Math.floor(Math.random() * 3) + 1);
  }, [currentLocation, emergencyModal.type, healthReadings, userProfile]);

  // Heart rate reading completion handler
  const handleHeartRateReading = useCallback((result: any) => {
    setHealthReadings(prev => ({
      ...prev,
      heartRate: result.heartRate,
      confidence: result.confidence,
      timestamp: result.timestamp
    }));
  }, []);

  // Real-time vitals update simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setHealthReadings(prev => ({
        ...prev,
        heartRate: Math.max(50, Math.min(120, prev.heartRate + Math.floor(Math.random() * 6 - 3))),
        spO2: Math.max(90, Math.min(100, prev.spO2 + Math.floor(Math.random() * 3 - 1))),
        temperature: Math.max(35, Math.min(40, prev.temperature + (Math.random() * 0.4 - 0.2))),
        timestamp: new Date()
      }));
      
      setLastSystemCheck(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return <LoadingScreen onComplete={() => setIsLoading(false)} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-poppins">
      <div className={cn(
        "container mx-auto p-4",
        isMobile ? "max-w-full px-2" : "max-w-4xl"
      )}>
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold bg-[var(--gradient-primary)] bg-clip-text text-transparent mb-2">
            LifeLine AI
          </h1>
          <p className="text-cyber-blue font-medium">
            Guardian Active • Every Second Counts
          </p>
        </div>

        {/* Enhanced Header with Diagnostics */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Badge variant={guardianStatus === "emergency" ? "destructive" : guardianStatus === "elevated" ? "secondary" : "default"}>
              Risk: {riskState.current.toFixed(1)}/10
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              {riskState.trend === "rising" && "📈"}
              {riskState.trend === "falling" && "📉"}
              {riskState.trend === "stable" && "➡️"}
              {riskState.trend}
            </Badge>
            <Badge variant="outline">
              {(riskState.confidence * 100).toFixed(0)}% Confidence
            </Badge>
          </div>
          
          <Button 
            onClick={() => setShowDiagnostics(true)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Diagnostics
          </Button>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={cn(
            "grid w-full bg-card/50",
            isMobile ? "grid-cols-3" : "grid-cols-6"
          )}>
            <TabsTrigger value="dashboard" className="font-poppins">
              <Shield className={cn("w-4 h-4", isMobile ? "" : "mr-2")} />
              {!isMobile && "Guardian"}
            </TabsTrigger>
            <TabsTrigger value="neural" className="font-poppins">
              <Brain className={cn("w-4 h-4", isMobile ? "" : "mr-2")} />
              {!isMobile && "Neural AI"}
            </TabsTrigger>
            <TabsTrigger value="health" className="font-poppins">
              <Heart className={cn("w-4 h-4", isMobile ? "" : "mr-2")} />
              {!isMobile && "Health"}
            </TabsTrigger>
            {!isMobile && (
              <>
                <TabsTrigger value="triage" className="font-poppins">
                  <Mic className="w-4 h-4 mr-2" />
                  AI Triage
                </TabsTrigger>
                <TabsTrigger value="watch" className="font-poppins">
                  <Watch className="w-4 h-4 mr-2" />
                  Watch Hub
                </TabsTrigger>
                <TabsTrigger value="community" className="font-poppins">
                  <Users className="w-4 h-4 mr-2" />
                  Community
                </TabsTrigger>
              </>
            )}
          </TabsList>
          
          {/* Mobile Bottom Navigation */}
          {isMobile && (
            <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border/50 px-4 pb-safe">
              <div className="grid grid-cols-3 gap-2 py-2">
                <Button
                  variant={activeTab === "triage" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("triage")}
                  className="flex flex-col items-center p-2 h-auto"
                >
                  <Mic className="w-5 h-5 mb-1" />
                  <span className="text-xs">Triage</span>
                </Button>
                <Button
                  variant={activeTab === "watch" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("watch")}
                  className="flex flex-col items-center p-2 h-auto"
                >
                  <Watch className="w-5 h-5 mb-1" />
                  <span className="text-xs">Watch</span>
                </Button>
                <Button
                  variant={activeTab === "community" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("community")}
                  className="flex flex-col items-center p-2 h-auto"
                >
                  <Users className="w-5 h-5 mb-1" />
                  <span className="text-xs">Community</span>
                </Button>
              </div>
            </div>
          )}

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <GuardianStatus
              status={guardianStatus}
              riskScore={riskState.current}
              lastCheck={lastSystemCheck}
              activeAlerts={activeAlerts}
            />

            {/* Vitals Grid */}
            <div className={cn(
              "grid gap-4",
              isMobile ? "grid-cols-2" : "grid-cols-3"
            )}>
              <VitalCard
                title="Heart Rate"
                value={healthReadings.heartRate.toString()}
                unit="BPM"
                icon={<Heart className="w-5 h-5" />}
                status={
                  healthReadings.heartRate > 100 || healthReadings.heartRate < 60 ? "warning" :
                  healthReadings.heartRate > 120 || healthReadings.heartRate < 50 ? "critical" : "normal"
                }
              />
              
              <VitalCard
                title="Blood Oxygen"
                value={healthReadings.spO2.toString()}
                unit="%"
                icon={<Activity className="w-5 h-5" />}
                status={
                  healthReadings.spO2 < 95 ? "warning" :
                  healthReadings.spO2 < 90 ? "critical" : "normal"
                }
              />
              
              <VitalCard
                title="Temperature"
                value={healthReadings.temperature.toFixed(1)}
                unit="°C"
                icon={<Thermometer className="w-5 h-5" />}
                status={
                  (healthReadings.temperature > 38 || healthReadings.temperature < 36) ? "warning" :
                  (healthReadings.temperature > 39 || healthReadings.temperature < 35) ? "critical" : "normal"
                }
              />
            </div>

            {/* Emergency Actions */}
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => handleEmergencyTrigger("Manual SOS")}
                className="h-20 bg-[var(--gradient-danger)] hover:opacity-90 text-white font-bold text-lg"
              >
                <Phone className="w-8 h-8 mr-3" />
                EMERGENCY SOS
              </Button>
              
              <Button
                onClick={() => setShowProfileSetup(true)}
                variant="outline"
                className="h-20 border-cyber-blue/30 font-poppins"
              >
                <Settings className="w-8 h-8 mr-3" />
                Profile Setup
              </Button>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-4">
              <EmergencyButton
                icon={<Zap className="w-6 h-6" />}
                title="Fall Sim"
                type="Fall Detection"
                onTrigger={handleEmergencyTrigger}
              />
              
              <EmergencyButton
                icon={<Heart className="w-6 h-6" />}
                title="Chest Pain"
                type="Chest Pain"
                onTrigger={handleEmergencyTrigger}
              />
              
              <EmergencyButton
                icon={<Activity className="w-6 h-6" />}
                title="Breathing"
                type="Breathing Emergency"
                onTrigger={handleEmergencyTrigger}
              />
            </div>
          </TabsContent>

          {/* Neural AI Tab */}
          <TabsContent value="neural" className="space-y-6">
            {isMobile ? (
              <div className="grid gap-6">
              <AdvancedNeuralAI
                onStressDetected={(level, confidence) => {
                  if (level === "critical") {
                    addEnvironmentalRisk({ 
                      type: "behavioral", 
                      severity: 8, 
                      confidence: confidence, 
                      description: "Critical stress detected", 
                      evidence: { level, confidence } 
                    });
                    setCurrentSituation("medical");
                    toast({
                      title: "Critical Stress Detected",
                      description: "High stress levels may indicate emergency situation",
                      variant: "destructive"
                    });
                  }
                }}
                onConditionDetected={(condition, confidence) => {
                  if (confidence > 0.8) {
                    toast({
                      title: "Medical Condition Alert",
                      description: `Possible ${condition} detected with ${(confidence * 100).toFixed(0)}% confidence`,
                      variant: "destructive"
                    });
                  }
                }}
                onEmergencyTrigger={() => {
                  setCurrentSituation("medical");
                  addEnvironmentalRisk({ 
                    type: "behavioral", 
                    severity: 10, 
                    confidence: 0.95, 
                    description: "Neural AI triggered emergency", 
                    evidence: { source: "neural_ai_emergency" } 
                  });
                  toast({
                    title: "EMERGENCY TRIGGERED",
                    description: "Neural AI detected critical condition requiring immediate attention",
                    variant: "destructive"
                  });
                }}
              />
              
              <DisasterAI
                currentLocation={{ lat: 29.3759, lng: 47.9774, city: "Kuwait City" }}
                onDisasterDetected={(event) => {
                  setCurrentSituation(event.type === "earthquake" ? "disaster" : "fire");
                  addEnvironmentalRisk({ type: "environmental", severity: 9, confidence: 0.95, description: `${event.type} detected`, evidence: event });
                  toast({
                    title: `${event.type.replace('_', ' ').toUpperCase()} Detected`,
                    description: `${event.severity} severity in ${event.location}`,
                    variant: "destructive"
                  });
                }}
              />
              
              <AdaptiveSOS
                vitals={healthReadings}
                location={{ lat: 29.3759, lng: 47.9774, city: "Kuwait City" }}
                situation={currentSituation}
                onRouteSelected={(route) => {
                  toast({
                    title: "SOS Route Selected",
                    description: `Contacting ${route.target} - ETA: ${route.eta} minutes`,
                  });
                }}
              />
              
              <SurvivalMode
                batteryLevel={batteryLevel}
                isOnline={isOnline}
                vitals={healthReadings}
                location={{ lat: 29.3759, lng: 47.9774, city: "Kuwait City" }}
                emergencyData={{ userProfile, emergencyContacts: [] }}
              />
              </div>
            ) : (
              <Card className="p-6 text-center bg-[var(--gradient-card)] border-cyber-blue/20">
                <Brain className="w-16 h-16 mx-auto mb-4 text-cyber-purple" />
                <h3 className="text-xl font-bold font-poppins text-foreground mb-2">
                  Mobile Device Required
                </h3>
                <p className="text-muted-foreground font-poppins">
                  Neural AI analysis requires mobile device with camera and microphone access.
                  Please access this feature from a mobile device for facial stress analysis, voice tone detection, and cognitive assessment.
                </p>
              </Card>
            )}
          </TabsContent>

          {/* Health Tab */}
          <TabsContent value="health" className="space-y-6">
            {isMobile ? (
              <MedicalVitalScanner 
                onVitalSigns={(vitals) => {
                  setHealthReadings(prev => ({
                    ...prev,
                    heartRate: typeof vitals.heartRate === 'object' ? vitals.heartRate.bpm : vitals.heartRate,
                    spO2: typeof vitals.spO2 === 'object' ? vitals.spO2.percentage : vitals.spO2,
                    temperature: typeof vitals.temperature === 'object' ? vitals.temperature.celsius : vitals.temperature,
                    confidence: 85,
                    timestamp: new Date()
                  }));
                }}
                onEmergencyAlert={(alertType, value) => {
                  addEnvironmentalRisk({
                    type: "vital",
                    severity: 9,
                    confidence: 0.9,
                    description: `${alertType}: ${value}`,
                    evidence: { alertType, value }
                  });
                  toast({
                    title: "Medical Emergency Alert",
                    description: `${alertType}: ${value}`,
                    variant: "destructive"
                  });
                }}
              />
            ) : (
              <Card className="p-6 text-center bg-[var(--gradient-card)] border-cyber-blue/20">
                <Heart className="w-16 h-16 mx-auto mb-4 text-cyber-red" />
                <h3 className="text-xl font-bold font-poppins text-foreground mb-2">
                  Mobile Device Required
                </h3>
                <p className="text-muted-foreground font-poppins">
                  Medical vital scanning requires mobile device with camera and flashlight capabilities.
                  Please access this feature from a mobile device for accurate heart rate, SpO₂, and temperature monitoring.
                </p>
              </Card>
            )}
          </TabsContent>

          {/* Triage Tab */}
          <TabsContent value="triage">
            <TriageChat onEmergencyTrigger={() => handleEmergencyTrigger("Triage Emergency")} />
          </TabsContent>

          {/* Watch Hub Tab */}
          <TabsContent value="watch">
            <RealisticSmartWatch
              onEmergencyTrigger={() => handleEmergencyTrigger("Watch SOS")}
              healthReadings={healthReadings}
              onQRGenerate={() => setShowQRGenerator(true)}
              onIncidentCreate={(data) => {
                setIncidentData(data);
                setShowIncidentPack(true);
              }}
            />
          </TabsContent>

          {/* Community Tab */}
          <TabsContent value="community" className="space-y-6">
            <CommunityPulse
              currentLocation={{ lat: 29.3759, lng: 47.9774, city: "Kuwait City" }}
              onEmergencySelected={(event) => {
                toast({
                  title: "Emergency Event Selected",
                  description: `${event.type} in ${event.location} - ${event.status}`,
                });
              }}
            />

            <Card className="p-6 bg-[var(--gradient-card)] border-cyber-purple/30 text-center">
              <h3 className="font-bold text-cyber-purple mb-4">Community Rescue Network</h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-background/30 rounded">
                  <div className="text-2xl font-bold text-cyber-green">{communityHelpers}</div>
                  <div className="text-sm text-muted-foreground">Nearby Helpers</div>
                </div>
                <div className="p-4 bg-background/30 rounded">
                  <div className="text-2xl font-bold text-cyber-blue">24/7</div>
                  <div className="text-sm text-muted-foreground">Guardian Active</div>
                </div>
              </div>
              
              <Button 
                className="w-full bg-[var(--gradient-primary)] text-white mb-4"
                onClick={() => {
                  setCommunityHelpers(prev => prev + 1);
                  toast({
                    title: "Joined Community Network",
                    description: "You're now part of the rescue network",
                    variant: "default"
                  });
                }}
              >
                <Users className="w-4 h-4 mr-2" />
                Join Rescue Network
              </Button>

              <div className="text-sm text-muted-foreground">
                Connect with nearby LifeLine users for mutual emergency assistance
              </div>
            </Card>

            {/* Enhanced QR Features */}
            <div className="grid grid-cols-2 gap-4">
              <Button 
                className="h-20 bg-[var(--gradient-primary)] text-white"
                onClick={() => setShowQRGenerator(true)}
              >
                <QrCode className="w-8 h-8 mr-3" />
                Enhanced QR Generator
              </Button>
              
              <Button 
                variant="outline"
                className="h-20 border-cyber-orange/30"
                onClick={() => setShowBraceletDesigner(true)}
              >
                <Watch className="w-8 h-8 mr-3" />
                QR Medical Bracelet
              </Button>
            </div>

            {/* Emergency Contacts */}
            <Card className="p-4 bg-[var(--gradient-card)] border-cyber-green/30">
              <h3 className="font-bold text-cyber-green mb-3 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Emergency Contacts
              </h3>
              {userProfile.emergencyContacts.length > 0 ? (
                <div className="space-y-2">
                  {userProfile.emergencyContacts.slice(0, 3).map((contact, index) => (
                    <div key={index} className="p-3 bg-background/30 rounded flex items-center justify-between">
                      <div>
                        <div className="font-medium">{contact.name}</div>
                        <div className="text-sm text-muted-foreground">{contact.relationship}</div>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => window.open(`tel:${contact.phone}`, "_self")}
                      >
                        Call
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Phone className="w-12 h-12 mx-auto mb-4 text-cyber-green" />
                  <p>No emergency contacts added</p>
                  <Button 
                    className="mt-4" 
                    onClick={() => setShowProfileSetup(true)}
                  >
                    Add Contacts
                  </Button>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modals */}
        {emergencyModal.isOpen && (
          <EmergencyModal
            isOpen={emergencyModal.isOpen}
            onClose={() => setEmergencyModal({ isOpen: false, type: "" })}
            onEmergencyConfirmed={handleEmergencyConfirmed}
            emergencyType={emergencyModal.type}
          />
        )}

        {showProfileSetup && (
          <UserProfileSetup
            isOpen={showProfileSetup}
            onClose={() => setShowProfileSetup(false)}
            onSave={(profile) => {
              setUserProfile(profile);
              setShowProfileSetup(false);
              toast({
                title: "Profile Updated",
                description: "Your medical profile has been saved",
                variant: "default"
              });
            }}
            initialProfile={userProfile}
          />
        )}

        {showIncidentPack && incidentData && (
          <IncidentPack
            isOpen={showIncidentPack}
            onClose={() => setShowIncidentPack(false)}
            incidentData={incidentData}
            userProfile={userProfile}
          />
        )}

        {/* Diagnostics Panel */}
        <DiagnosticsPanel
          isOpen={showDiagnostics}
          onClose={() => setShowDiagnostics(false)}
          riskEngine={engine}
          currentVitals={healthReadings}
          sensorData={sensorData}
        />

        {showQRGenerator && (
          <EnhancedQRGenerator
            isOpen={showQRGenerator}
            onClose={() => setShowQRGenerator(false)}
            userProfile={userProfile}
            currentLocation={currentLocation || undefined}
            healthReadings={healthReadings}
            incidentData={incidentData || undefined}
          />
        )}

        {showBraceletDesigner && (
          <QRBraceletDesigner
            isOpen={showBraceletDesigner}
            onClose={() => setShowBraceletDesigner(false)}
            userProfile={userProfile}
          />
        )}
      </div>
    </div>
  );
};
