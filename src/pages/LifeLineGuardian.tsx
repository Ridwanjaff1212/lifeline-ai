import { useState, useEffect, useCallback } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { GuardianStatus } from "@/components/GuardianStatus";
import { TriageChat } from "@/components/TriageChat";
import { AegisWatch3D } from "@/components/AegisWatch3D";
import { HeartRateScanner } from "@/components/HeartRateScanner";
import { VitalCard } from "@/components/VitalCard";
import { EmergencyButton } from "@/components/EmergencyButton";
import { EmergencyModal } from "@/components/EmergencyModal";
import { UserProfileSetup, UserProfile } from "@/components/UserProfileSetup";
import { IncidentPack, IncidentData } from "@/components/IncidentPack";
import { KuwaitMap } from "@/components/KuwaitMap";
import { VoiceCommands } from "@/components/VoiceCommands";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
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
  Navigation
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
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Core system states
  const [guardianStatus, setGuardianStatus] = useState<"safe" | "elevated" | "emergency">("safe");
  const [riskScore, setRiskScore] = useState(0);
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

  // Risk scoring system
  useEffect(() => {
    let score = 0;
    
    // Heart rate risk factors
    if (healthReadings.heartRate > 100 || healthReadings.heartRate < 60) score += 2;
    if (healthReadings.heartRate > 120 || healthReadings.heartRate < 50) score += 3;
    
    // SpO2 risk factors
    if (healthReadings.spO2 < 95) score += 3;
    if (healthReadings.spO2 < 90) score += 5;
    
    // Temperature risk factors
    if (healthReadings.temperature > 38 || healthReadings.temperature < 36) score += 2;
    if (healthReadings.temperature > 39 || healthReadings.temperature < 35) score += 4;
    
    // Motion/fall detection
    if (sensorData.fallDetected) score += 8;
    if (!sensorData.motion) score += 1; // No movement for extended period
    
    setRiskScore(Math.min(10, score));
    
    // Update guardian status based on risk
    if (score >= 7) setGuardianStatus("emergency");
    else if (score >= 4) setGuardianStatus("elevated");
    else setGuardianStatus("safe");
    
    setActiveAlerts(score > 3 ? Math.ceil(score / 2) : 0);
  }, [healthReadings, sensorData]);

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
      riskScore: riskScore,
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
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold bg-[var(--gradient-primary)] bg-clip-text text-transparent mb-2">
            LifeLine AI
          </h1>
          <p className="text-cyber-blue font-medium">
            Guardian Active • Every Second Counts
          </p>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-card/50">
            <TabsTrigger value="dashboard" className="font-poppins">
              <Shield className="w-4 h-4 mr-2" />
              Guardian
            </TabsTrigger>
            <TabsTrigger value="health" className="font-poppins">
              <Heart className="w-4 h-4 mr-2" />
              Health
            </TabsTrigger>
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
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <GuardianStatus
              status={guardianStatus}
              riskScore={riskScore}
              lastCheck={lastSystemCheck}
              activeAlerts={activeAlerts}
            />

            {/* Vitals Grid */}
            <div className="grid grid-cols-3 gap-4">
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

          {/* Health Tab */}
          <TabsContent value="health" className="space-y-6">
            <HeartRateScanner onReadingComplete={handleHeartRateReading} />
          </TabsContent>

          {/* Triage Tab */}
          <TabsContent value="triage">
            <TriageChat onEmergencyTrigger={() => handleEmergencyTrigger("Triage Emergency")} />
          </TabsContent>

          {/* Watch Hub Tab */}
          <TabsContent value="watch">
            <AegisWatch3D
              onEmergencyTrigger={() => handleEmergencyTrigger("Aegis Watch SOS")}
              healthReadings={healthReadings}
            />
          </TabsContent>

          {/* Community Tab */}
          <TabsContent value="community" className="space-y-6">
            <Card className="p-6 bg-[var(--gradient-card)] border-cyber-blue/20">
              <h3 className="font-bold font-poppins text-foreground mb-4">
                Emergency Network
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold font-poppins text-cyber-green">
                    {communityHelpers}
                  </div>
                  <div className="text-sm text-muted-foreground font-poppins">
                    Nearby Helpers
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold font-poppins text-cyber-blue">
                    24/7
                  </div>
                  <div className="text-sm text-muted-foreground font-poppins">
                    Response Ready
                  </div>
                </div>
              </div>
              
              <KuwaitMap
                currentLocation={currentLocation ? [currentLocation.longitude, currentLocation.latitude] : undefined}
                emergencyMode={guardianStatus === "emergency"}
                onLocationUpdate={(coords) => {
                  setCurrentLocation(prev => prev ? {
                    ...prev,
                    longitude: coords[0],
                    latitude: coords[1]
                  } : null);
                }}
              />
            </Card>

            <VoiceCommands
              onEmergencyTrigger={(type: string) => handleEmergencyTrigger(type)}
              onLocationShare={() => {
                if (currentLocation) {
                  const coordsText = `${currentLocation.latitude.toFixed(6)}°N, ${currentLocation.longitude.toFixed(6)}°E`;
                  toast({
                    title: "Location Shared",
                    description: `Coordinates: ${coordsText}`,
                    variant: "default"
                  });
                }
              }}
              userProfile={userProfile}
            />
          </TabsContent>
        </Tabs>

        {/* Modals */}
        <EmergencyModal
          isOpen={emergencyModal.isOpen}
          onClose={() => setEmergencyModal({ isOpen: false, type: "" })}
          emergencyType={emergencyModal.type}
          onEmergencyConfirmed={handleEmergencyConfirmed}
        />

        <UserProfileSetup
          isOpen={showProfileSetup}
          onClose={() => setShowProfileSetup(false)}
          onSave={setUserProfile}
          initialProfile={userProfile}
        />

        {incidentData && (
          <IncidentPack
            isOpen={showIncidentPack}
            onClose={() => setShowIncidentPack(false)}
            incidentData={incidentData}
            userProfile={userProfile}
          />
        )}
      </div>
    </div>
  );
};