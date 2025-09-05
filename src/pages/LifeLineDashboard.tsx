import { useState, useEffect } from "react";
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
import { 
  Heart, 
  Thermometer, 
  Activity, 
  MapPin, 
  Shield, 
  TrendingUp,
  Zap,
  Flame,
  Car,
  Volume2,
  Wind,
  User,
  Settings,
  Mic,
  Map,
  FileText,
  Camera
} from "lucide-react";

export const LifeLineDashboard = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [vitals, setVitals] = useState({
    heartRate: 72,
    spO2: 98,
    temperature: 36.8,
    motionStatus: "Active"
  });

  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: "Guardian User",
    age: "30",
    bloodType: "O+",
    medicalNotes: "",
    emergencyContacts: [],
    preferredHospitals: []
  });

  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<[number, number]>([47.9774, 29.3759]);
  const [riskScore, setRiskScore] = useState(2);
  const [vitalsHistory, setVitalsHistory] = useState({
    heartRate: [70, 72, 71, 73, 72, 74, 72],
    spO2: [98, 97, 98, 98, 97, 98, 98],
    temperature: [36.7, 36.8, 36.8, 36.9, 36.8, 36.8, 36.8],
    timestamps: ["10:00", "10:05", "10:10", "10:15", "10:20", "10:25", "10:30"]
  });

  const [emergencyModal, setEmergencyModal] = useState({
    isOpen: false,
    type: ""
  });

  const [incidentData, setIncidentData] = useState<IncidentData | null>(null);
  const [showIncidentPack, setShowIncidentPack] = useState(false);

  // Simulate real-time vitals updates
  useEffect(() => {
    const interval = setInterval(() => {
      setVitals(prev => {
        const newVitals = {
          heartRate: Math.max(60, Math.min(100, prev.heartRate + (Math.random() - 0.5) * 4)),
          spO2: Math.max(95, Math.min(100, prev.spO2 + (Math.random() - 0.5) * 2)),
          temperature: Math.max(36, Math.min(38, prev.temperature + (Math.random() - 0.5) * 0.2)),
          motionStatus: Math.random() > 0.7 ? "Moving" : "Stationary"
        };
        
        // Update vitals history
        setVitalsHistory(prevHistory => ({
          heartRate: [...prevHistory.heartRate.slice(-6), newVitals.heartRate],
          spO2: [...prevHistory.spO2.slice(-6), newVitals.spO2],
          temperature: [...prevHistory.temperature.slice(-6), newVitals.temperature],
          timestamps: [...prevHistory.timestamps.slice(-6), new Date().toLocaleTimeString("en-US", { 
            hour12: false, 
            hour: "2-digit", 
            minute: "2-digit" 
          })]
        }));

        // Calculate risk score based on vitals
        let newRiskScore = 0;
        if (newVitals.heartRate > 100 || newVitals.heartRate < 60) newRiskScore += 2;
        if (newVitals.spO2 < 95) newRiskScore += 3;
        if (newVitals.temperature > 37.5 || newVitals.temperature < 36) newRiskScore += 1;
        setRiskScore(newRiskScore);

        return newVitals;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleEmergencyTrigger = (type: string) => {
    setEmergencyModal({ isOpen: true, type });
  };

  const handleEmergencyConfirmed = () => {
    // Create comprehensive incident pack
    const incident: IncidentData = {
      id: `INC-${Date.now()}`,
      type: emergencyModal.type,
      timestamp: new Date(),
      location: {
        coordinates: currentLocation,
        address: "Kuwait City, Kuwait",
        city: "Kuwait City"
      },
      vitals: vitalsHistory,
      timeline: [
        {
          time: new Date().toLocaleTimeString(),
          event: `${emergencyModal.type} detected by Guardian system`,
          severity: "critical"
        },
        {
          time: new Date(Date.now() + 5000).toLocaleTimeString(),
          event: "Voice check initiated",
          severity: "warning"
        },
        {
          time: new Date(Date.now() + 15000).toLocaleTimeString(),
          event: "Emergency services contacted",
          severity: "critical"
        },
        {
          time: new Date(Date.now() + 20000).toLocaleTimeString(),
          event: "Incident pack generated",
          severity: "info"
        }
      ],
      mediaCapture: {
        hasAudio: true,
        hasVideo: Math.random() > 0.5,
        duration: Math.floor(Math.random() * 30) + 10
      },
      riskScore: Math.max(riskScore, 5),
      status: "active"
    };
    
    setIncidentData(incident);
    console.log(`Emergency ${emergencyModal.type} confirmed and emergency services contacted`);
  };

  const handleLocationShare = () => {
    if (incidentData) {
      setShowIncidentPack(true);
    } else {
      // Create a simple location share incident
      handleEmergencyTrigger("Location Share");
    }
  };

  const handleProfileSave = (profile: UserProfile) => {
    setUserProfile(profile);
    localStorage.setItem("lifelineProfile", JSON.stringify(profile));
  };

  // Load saved profile on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem("lifelineProfile");
    if (savedProfile) {
      setUserProfile(JSON.parse(savedProfile));
    }
  }, []);

  const getCurrentTime = () => {
    return new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kuwait",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getRiskColor = () => {
    if (riskScore >= 6) return "text-cyber-red";
    if (riskScore >= 3) return "text-cyber-orange";
    return "text-cyber-green";
  };

  return (
    <div className="min-h-screen bg-background font-poppins">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[var(--gradient-primary)] rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">LifeLine Guardian++</h1>
                <p className="text-xs text-muted-foreground">Next-Gen Safety AI</p>
              </div>
            </div>
            <Button
              onClick={() => setShowProfileSetup(true)}
              size="sm"
              variant="outline"
              className="p-2"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{getCurrentTime()}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Risk:</span>
              <span className={`text-sm font-bold ${getRiskColor()}`}>{riskScore}/10</span>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-card">
            <TabsTrigger value="dashboard" className="text-xs">
              <TrendingUp className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="voice" className="text-xs">
              <Mic className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="map" className="text-xs">
              <Map className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="camera" className="text-xs">
              <Camera className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="p-4 space-y-4">
            {/* Status Indicator */}
            <Card className="p-4 bg-[var(--gradient-card)] border-cyber-green/30 shadow-[var(--glow-success)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-cyber-green rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-cyber-green">Guardian AI Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={riskScore >= 6 ? "destructive" : riskScore >= 3 ? "secondary" : "default"}>
                    {riskScore >= 6 ? "HIGH RISK" : riskScore >= 3 ? "MODERATE" : "SAFE"}
                  </Badge>
                </div>
              </div>
            </Card>

            {/* Vitals Grid */}
            <div className="grid grid-cols-2 gap-4">
              <VitalCard
                title="Heart Rate"
                value={Math.round(vitals.heartRate).toString()}
                unit="BPM"
                icon={<Heart className="h-5 w-5" />}
                status={vitals.heartRate > 100 || vitals.heartRate < 60 ? "warning" : "normal"}
              />
              <VitalCard
                title="SpO₂"
                value={Math.round(vitals.spO2).toString()}
                unit="%"
                icon={<Activity className="h-5 w-5" />}
                status={vitals.spO2 < 95 ? "critical" : "normal"}
              />
              <VitalCard
                title="Temperature"
                value={vitals.temperature.toFixed(1)}
                unit="°C"
                icon={<Thermometer className="h-5 w-5" />}
                status={vitals.temperature > 37.5 ? "warning" : "normal"}
              />
              <VitalCard
                title="Motion"
                value={vitals.motionStatus}
                unit=""
                icon={<Zap className="h-5 w-5" />}
                status="normal"
              />
            </div>

            {/* Main SOS Button */}
            <Button 
              onClick={() => handleEmergencyTrigger("Manual SOS")}
              className="w-full h-16 bg-[var(--gradient-danger)] text-white text-lg font-bold border-2 border-cyber-red/30 hover:shadow-[var(--glow-danger)] transition-all duration-300 hover:scale-105 active:scale-95"
            >
              🆘 EMERGENCY SOS
            </Button>

            {/* Emergency Simulation Buttons */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Simulate Emergency Events</h3>
              
              <EmergencyButton
                icon={<TrendingUp className="h-5 w-5" />}
                title="Fall Detection"
                subtitle="Sudden impact detected"
                onClick={() => handleEmergencyTrigger("Fall")}
                variant="fall"
              />
              
              <EmergencyButton
                icon={<Car className="h-5 w-5" />}
                title="Crash Detection"
                subtitle="Vehicle collision"
                onClick={() => handleEmergencyTrigger("Crash")}
                variant="crash"
              />
              
              <EmergencyButton
                icon={<Volume2 className="h-5 w-5" />}
                title="Scream Detection"
                subtitle="Distress audio pattern"
                onClick={() => handleEmergencyTrigger("Scream")}
                variant="scream"
              />
              
              <EmergencyButton
                icon={<Wind className="h-5 w-5" />}
                title="Gas Leak"
                subtitle="Toxic gas detected"
                onClick={() => handleEmergencyTrigger("Gas Leak")}
                variant="gas"
              />
              
              <EmergencyButton
                icon={<Flame className="h-5 w-5" />}
                title="Heat Stress"
                subtitle="Extreme temperature"
                onClick={() => handleEmergencyTrigger("Heat Stress")}
                variant="heat"
              />
            </div>
          </TabsContent>

          {/* Voice Commands Tab */}
          <TabsContent value="voice" className="p-4">
            <VoiceCommands 
              onEmergencyTriggered={() => handleEmergencyTrigger("Voice Emergency")}
              onVitalRequest={() => console.log("Vitals requested")}
              onLocationShare={handleLocationShare}
            />
          </TabsContent>

          {/* Map Tab */}
          <TabsContent value="map" className="p-4">
            <KuwaitMap 
              currentLocation={currentLocation}
              emergencyMode={emergencyModal.isOpen}
              onLocationUpdate={setCurrentLocation}
            />
          </TabsContent>

          {/* Camera Tab */}
          <TabsContent value="camera" className="p-4">
            <Card className="p-6 bg-[var(--gradient-card)] border-cyber-purple/30 text-center">
              <Camera className="h-16 w-16 mx-auto mb-4 text-cyber-purple" />
              <h3 className="text-lg font-bold text-cyber-purple mb-2">Real-Time Detection</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Camera integration for fall, crash, and distress detection coming soon
              </p>
              <Button className="bg-cyber-purple text-white" disabled>
                Enable Camera Monitoring
              </Button>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Emergency Modal */}
      <EmergencyModal
        isOpen={emergencyModal.isOpen}
        onClose={() => setEmergencyModal({ isOpen: false, type: "" })}
        emergencyType={emergencyModal.type}
        onEmergencyConfirmed={handleEmergencyConfirmed}
      />

      {/* User Profile Setup */}
      <UserProfileSetup
        isOpen={showProfileSetup}
        onClose={() => setShowProfileSetup(false)}
        onSave={handleProfileSave}
        initialProfile={userProfile}
      />

      {/* Incident Pack */}
      {incidentData && (
        <IncidentPack
          isOpen={showIncidentPack}
          onClose={() => setShowIncidentPack(false)}
          incidentData={incidentData}
          userProfile={userProfile}
        />
      )}

      {/* Floating Incident Pack Button */}
      {incidentData && !showIncidentPack && (
        <div className="fixed bottom-4 right-4 z-40">
          <Button
            onClick={() => setShowIncidentPack(true)}
            className="bg-cyber-red text-white shadow-lg animate-pulse"
            size="lg"
          >
            <FileText className="h-5 w-5 mr-2" />
            View Incident Pack
          </Button>
        </div>
      )}
    </div>
  );
};