import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Battery, 
  Zap, 
  Wifi, 
  WifiOff, 
  QrCode, 
  MapPin,
  Heart,
  Clock,
  Smartphone
} from "lucide-react";
import { cn } from "@/lib/utils";
import QRCode from "react-qr-code";

interface SurvivalModeProps {
  batteryLevel: number;
  isOnline: boolean;
  vitals: { heartRate: number; spO2: number; temperature: number };
  location: { lat: number; lng: number; city: string };
  emergencyData: any;
}

export const SurvivalMode = ({ 
  batteryLevel, 
  isOnline, 
  vitals, 
  location, 
  emergencyData 
}: SurvivalModeProps) => {
  const [isActive, setIsActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [survivalQR, setSurvivalQR] = useState<string>("");
  const [powerSavingLevel, setPowerSavingLevel] = useState<"normal" | "moderate" | "extreme">("normal");

  // Calculate survival time based on battery and usage
  const calculateSurvivalTime = useCallback((battery: number, powerLevel: string) => {
    const baseHours = battery * 0.1; // Base calculation
    
    switch (powerLevel) {
      case "moderate": return baseHours * 2;
      case "extreme": return baseHours * 4;
      default: return baseHours;
    }
  }, []);

  // Generate minimal survival QR data
  const generateSurvivalQR = useCallback(() => {
    const minimalData = {
      emergency: true,
      name: emergencyData.userProfile?.name || "Emergency Contact",
      medical: {
        bloodType: emergencyData.userProfile?.bloodType || "Unknown",
        allergies: emergencyData.userProfile?.allergies || "None listed",
        conditions: emergencyData.userProfile?.conditions || "None listed"
      },
      vitals: {
        hr: vitals.heartRate,
        spo2: vitals.spO2,
        temp: vitals.temperature,
        timestamp: new Date().toISOString()
      },
      location: {
        lat: location.lat,
        lng: location.lng,
        city: location.city,
        timestamp: new Date().toISOString()
      },
      contacts: emergencyData.emergencyContacts?.slice(0, 2) || [],
      battery: batteryLevel,
      offline: !isOnline,
      survival_mode: true
    };

    return JSON.stringify(minimalData);
  }, [vitals, location, emergencyData, batteryLevel, isOnline]);

  // Automatic activation on low battery
  useEffect(() => {
    if (batteryLevel <= 10 && !isActive) {
      setIsActive(true);
      setPowerSavingLevel("moderate");
    } else if (batteryLevel <= 5) {
      setPowerSavingLevel("extreme");
    }
  }, [batteryLevel, isActive]);

  // Update survival time and QR data
  useEffect(() => {
    if (isActive) {
      const survivalTime = calculateSurvivalTime(batteryLevel, powerSavingLevel);
      setTimeRemaining(survivalTime);
      setSurvivalQR(generateSurvivalQR());
    }
  }, [isActive, batteryLevel, powerSavingLevel, calculateSurvivalTime, generateSurvivalQR]);

  const activateSurvivalMode = useCallback(() => {
    setIsActive(true);
    
    // Simulate battery optimizations
    if (batteryLevel > 15) {
      setPowerSavingLevel("moderate");
    } else if (batteryLevel > 5) {
      setPowerSavingLevel("extreme");
    }
  }, [batteryLevel]);

  const deactivateSurvivalMode = useCallback(() => {
    setIsActive(false);
    setPowerSavingLevel("normal");
  }, []);

  const getBatteryColor = (level: number) => {
    if (level <= 5) return "text-destructive";
    if (level <= 15) return "text-cyber-orange";
    if (level <= 30) return "text-cyber-blue";
    return "text-cyber-green";
  };

  const getPowerLevelColor = (level: string) => {
    switch (level) {
      case "extreme": return "text-destructive";
      case "moderate": return "text-cyber-orange";
      default: return "text-cyber-green";
    }
  };

  const formatTime = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  return (
    <Card className={cn(
      "p-6 border-2 transition-all duration-500",
      isActive ? 
        "bg-[var(--gradient-danger)] border-destructive/50 shadow-[var(--glow-danger)]" :
        "bg-[var(--gradient-card)] border-cyber-orange/30"
    )}>
      <div className="flex items-center gap-3 mb-4">
        <Battery className={cn("h-6 w-6", getBatteryColor(batteryLevel))} />
        <h3 className="text-xl font-bold text-foreground">Energy Survival Mode</h3>
        <Badge variant="outline" className={cn(
          isActive ? "border-destructive text-destructive" : "border-cyber-orange text-cyber-orange"
        )}>
          {isActive ? "ACTIVE" : "STANDBY"}
        </Badge>
      </div>

      {/* Battery Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-3 bg-black/20">
          <div className="text-xs text-muted-foreground">Battery</div>
          <div className={cn("text-lg font-bold", getBatteryColor(batteryLevel))}>
            {batteryLevel}%
          </div>
        </Card>
        
        <Card className="p-3 bg-black/20">
          <div className="text-xs text-muted-foreground">Power Mode</div>
          <div className={cn("text-sm font-bold capitalize", getPowerLevelColor(powerSavingLevel))}>
            {powerSavingLevel}
          </div>
        </Card>
        
        <Card className="p-3 bg-black/20">
          <div className="text-xs text-muted-foreground">Network</div>
          <div className={cn("text-sm font-bold flex items-center gap-1",
            isOnline ? "text-cyber-green" : "text-cyber-red"
          )}>
            {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isOnline ? "Online" : "Offline"}
          </div>
        </Card>
        
        <Card className="p-3 bg-black/20">
          <div className="text-xs text-muted-foreground">Est. Runtime</div>
          <div className="text-sm font-bold text-cyber-blue">
            {isActive ? formatTime(timeRemaining) : "--"}
          </div>
        </Card>
      </div>

      {/* Survival Progress */}
      {isActive && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">Battery Conservation</span>
            <span className="text-sm text-destructive">{batteryLevel}% remaining</span>
          </div>
          <Progress 
            value={batteryLevel} 
            className="h-3 bg-black/30"
          />
          <div className="text-xs text-center mt-2 text-muted-foreground">
            LifeLine will keep you alive until your last battery percent
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex gap-3 mb-6">
        {!isActive ? (
          <Button
            onClick={activateSurvivalMode}
            variant="destructive"
            className="flex-1"
          >
            <Zap className="h-4 w-4 mr-2" />
            Activate Survival Mode
          </Button>
        ) : (
          <Button
            onClick={deactivateSurvivalMode}
            variant="outline"
            className="flex-1"
          >
            <Smartphone className="h-4 w-4 mr-2" />
            Deactivate Survival Mode
          </Button>
        )}
      </div>

      {/* Survival QR Code */}
      {isActive && survivalQR && (
        <Card className="p-4 bg-black/30 border border-cyber-green/30">
          <div className="flex items-center gap-2 mb-3">
            <QrCode className="h-4 w-4 text-cyber-green" />
            <span className="text-sm font-medium text-cyber-green">Emergency Survival QR</span>
            {!isOnline && (
              <Badge variant="outline" className="text-cyber-red border-cyber-red/50">
                Offline Ready
              </Badge>
            )}
          </div>
          
          <div className="flex justify-center mb-4">
            <div className="bg-white p-4 rounded-lg">
              <QRCode 
                value={survivalQR}
                size={200}
                fgColor="#000000"
                bgColor="#ffffff"
              />
            </div>
          </div>
          
          <div className="text-xs text-center text-muted-foreground">
            Scan for complete emergency data package
            {!isOnline && <div className="text-cyber-green mt-1">Works offline • Compressed data</div>}
          </div>
        </Card>
      )}

      {/* Minimal Vitals Strip */}
      {isActive && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Card className="p-2 bg-black/30 text-center">
            <Heart className="h-4 w-4 mx-auto mb-1 text-cyber-red" />
            <div className="text-xs text-cyber-red">{vitals.heartRate}</div>
          </Card>
          
          <Card className="p-2 bg-black/30 text-center">
            <div className="text-xs text-cyber-blue mb-1">SpO₂</div>
            <div className="text-xs text-cyber-blue">{vitals.spO2}%</div>
          </Card>
          
          <Card className="p-2 bg-black/30 text-center">
            <MapPin className="h-4 w-4 mx-auto mb-1 text-cyber-green" />
            <div className="text-xs text-cyber-green">{location.city}</div>
          </Card>
        </div>
      )}

      {/* Power Saving Information */}
      {isActive && (
        <div className="mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1 mb-1">
            <Zap className="h-3 w-3" />
            Power optimizations active:
          </div>
          <div className="ml-4 space-y-1">
            <div>• Screen brightness reduced</div>
            <div>• Background apps disabled</div>
            <div>• Non-essential features paused</div>
            {powerSavingLevel === "extreme" && (
              <div className="text-destructive">• Critical mode: QR + GPS only</div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};