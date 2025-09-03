import { useState, useEffect } from "react";
import { VitalCard } from "@/components/VitalCard";
import { EmergencyButton } from "@/components/EmergencyButton";
import { EmergencyModal } from "@/components/EmergencyModal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Wind
} from "lucide-react";

export const LifeLineDashboard = () => {
  const [vitals, setVitals] = useState({
    heartRate: 72,
    spO2: 98,
    temperature: 36.8,
    motionStatus: "Active"
  });

  const [emergencyModal, setEmergencyModal] = useState({
    isOpen: false,
    type: ""
  });

  // Simulate real-time vitals updates
  useEffect(() => {
    const interval = setInterval(() => {
      setVitals(prev => ({
        heartRate: prev.heartRate + (Math.random() - 0.5) * 4,
        spO2: Math.max(95, Math.min(100, prev.spO2 + (Math.random() - 0.5) * 2)),
        temperature: Math.max(36, Math.min(38, prev.temperature + (Math.random() - 0.5) * 0.2)),
        motionStatus: Math.random() > 0.7 ? "Moving" : "Stationary"
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleEmergencyTrigger = (type: string) => {
    setEmergencyModal({ isOpen: true, type });
  };

  const handleEmergencyConfirmed = () => {
    // Emergency sequence completed
    console.log(`Emergency ${emergencyModal.type} confirmed and emergency services contacted`);
  };

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

  return (
    <div className="min-h-screen bg-background font-poppins p-4 max-w-md mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-[var(--gradient-primary)] rounded-lg">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">LifeLine 2.0</h1>
            <p className="text-xs text-muted-foreground">Guardian in Your Pocket</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{getCurrentTime()}</p>
      </div>

      {/* Status Indicator */}
      <Card className="mb-6 p-4 bg-[var(--gradient-card)] border-cyber-green/30 shadow-[var(--glow-success)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-cyber-green rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-cyber-green">All Systems Operational</span>
          </div>
          <TrendingUp className="h-4 w-4 text-cyber-green" />
        </div>
      </Card>

      {/* Vitals Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <VitalCard
          title="Heart Rate"
          value={Math.round(vitals.heartRate).toString()}
          unit="BPM"
          icon={<Heart className="h-5 w-5" />}
          status={vitals.heartRate > 100 ? "warning" : "normal"}
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

      {/* Location Card */}
      <Card className="mb-6 p-4 bg-[var(--gradient-card)] border-cyber-blue/30">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="h-4 w-4 text-cyber-blue" />
          <span className="text-sm font-medium text-cyber-blue">Current Location</span>
        </div>
        <p className="text-sm text-foreground">Kuwait City, Kuwait</p>
        <p className="text-xs text-muted-foreground">29.3759°N, 47.9774°E</p>
      </Card>

      {/* Main SOS Button */}
      <Button 
        onClick={() => handleEmergencyTrigger("Manual SOS")}
        className="w-full h-16 mb-6 bg-[var(--gradient-danger)] text-white text-lg font-bold border-2 border-cyber-red/30 hover:shadow-[var(--glow-danger)] transition-all duration-300 hover:scale-105 active:scale-95"
      >
        🆘 EMERGENCY SOS
      </Button>

      {/* Emergency Simulation Buttons */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Simulate Emergency Events</h3>
        
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

      {/* Emergency Modal */}
      <EmergencyModal
        isOpen={emergencyModal.isOpen}
        onClose={() => setEmergencyModal({ isOpen: false, type: "" })}
        emergencyType={emergencyModal.type}
        onEmergencyConfirmed={handleEmergencyConfirmed}
      />
    </div>
  );
};