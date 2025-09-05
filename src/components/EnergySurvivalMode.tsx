import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Battery, 
  MapPin, 
  Heart, 
  Clock,
  Zap,
  ZapOff,
  Smartphone,
  Signal,
  QrCode,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface BatteryInfo {
  level: number;
  charging: boolean;
  chargingTime?: number;
  dischargingTime?: number;
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
}

interface SurvivalModeProps {
  onModeChange: (enabled: boolean) => void;
  emergencyContacts: Array<{ name: string; phone: string }>;
  currentVitals?: {
    heartRate?: number;
    spO2?: number;
    temperature?: number;
  };
}

export const EnergySurvivalMode = ({ onModeChange, emergencyContacts, currentVitals }: SurvivalModeProps) => {
  const { toast } = useToast();
  
  const [isEnabled, setIsEnabled] = useState(false);
  const [batteryInfo, setBatteryInfo] = useState<BatteryInfo>({ level: 100, charging: false });
  const [location, setLocation] = useState<LocationData | null>(null);
  const [lastHeartbeat, setLastHeartbeat] = useState<Date>(new Date());
  const [survivalStartTime, setSurvivalStartTime] = useState<Date | null>(null);
  const [lowPowerFeatures, setLowPowerFeatures] = useState({
    gpsPolling: false,
    cameraDisabled: true,
    mlDisabled: true,
    backgroundSync: false,
    reducedDisplay: true
  });

  // Monitor battery status
  useEffect(() => {
    const getBatteryInfo = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          
          const updateBatteryInfo = () => {
            setBatteryInfo({
              level: Math.round(battery.level * 100),
              charging: battery.charging,
              chargingTime: battery.chargingTime,
              dischargingTime: battery.dischargingTime
            });
          };
          
          updateBatteryInfo();
          
          battery.addEventListener('levelchange', updateBatteryInfo);
          battery.addEventListener('chargingchange', updateBatteryInfo);
          
          return () => {
            battery.removeEventListener('levelchange', updateBatteryInfo);
            battery.removeEventListener('chargingchange', updateBatteryInfo);
          };
        } catch (error) {
          console.log('Battery API not available');
        }
      } else {
        // Simulate battery level for demo
        const simulatedLevel = 15 + Math.random() * 10;
        setBatteryInfo({ level: Math.round(simulatedLevel), charging: false });
      }
    };
    
    getBatteryInfo();
  }, []);

  // Auto-enable survival mode at low battery
  useEffect(() => {
    if (batteryInfo.level <= 12 && !batteryInfo.charging && !isEnabled) {
      enableSurvivalMode(true);
      
      toast({
        title: "Energy Survival Mode Activated",
        description: "Battery critical - switching to low power mode",
        variant: "destructive"
      });
    }
  }, [batteryInfo, isEnabled]);

  // Get location with reduced frequency in survival mode
  useEffect(() => {
    let locationWatch: number;
    
    const getLocation = () => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: new Date()
            });
          },
          (error) => {
            console.error('Location error:', error);
          },
          {
            enableHighAccuracy: !isEnabled, // Reduce accuracy in survival mode
            timeout: isEnabled ? 15000 : 10000,
            maximumAge: isEnabled ? 60000 : 30000
          }
        );
      }
    };
    
    // Initial location
    getLocation();
    
    // Set up polling based on survival mode
    const interval = setInterval(getLocation, isEnabled ? 30000 : 10000); // 30s vs 10s
    
    return () => {
      clearInterval(interval);
      if (locationWatch) {
        navigator.geolocation.clearWatch(locationWatch);
      }
    };
  }, [isEnabled]);

  // Update heartbeat indicator
  useEffect(() => {
    if (currentVitals?.heartRate) {
      setLastHeartbeat(new Date());
    }
  }, [currentVitals?.heartRate]);

  const enableSurvivalMode = (auto = false) => {
    setIsEnabled(true);
    setSurvivalStartTime(new Date());
    onModeChange(true);
    
    // Enable low power features
    setLowPowerFeatures({
      gpsPolling: true,
      cameraDisabled: true,
      mlDisabled: true,
      backgroundSync: false,
      reducedDisplay: true
    });
    
    if (!auto) {
      toast({
        title: "Survival Mode Enabled",
        description: "Device optimized for maximum battery life",
      });
    }
  };

  const disableSurvivalMode = () => {
    setIsEnabled(false);
    setSurvivalStartTime(null);
    onModeChange(false);
    
    // Restore normal features
    setLowPowerFeatures({
      gpsPolling: false,
      cameraDisabled: false,
      mlDisabled: false,
      backgroundSync: true,
      reducedDisplay: false
    });
    
    toast({
      title: "Survival Mode Disabled",
      description: "All features restored",
    });
  };

  const generateQRData = () => {
    const emergencyInfo = {
      name: "LifeLine AI User",
      emergency_contacts: emergencyContacts.slice(0, 2),
      medical_info: {
        last_heartrate: currentVitals?.heartRate,
        last_spo2: currentVitals?.spO2,
        last_temp: currentVitals?.temperature,
        timestamp: lastHeartbeat.toISOString()
      },
      location: location ? {
        lat: location.latitude,
        lng: location.longitude,
        accuracy: location.accuracy,
        timestamp: location.timestamp.toISOString()
      } : null,
      device_info: {
        battery: batteryInfo.level,
        survival_mode: isEnabled,
        app: "LifeLine AI Guardian"
      }
    };
    
    return JSON.stringify(emergencyInfo);
  };

  const getSurvivalDuration = () => {
    if (!survivalStartTime) return "00:00:00";
    
    const now = new Date();
    const diff = now.getTime() - survivalStartTime.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getBatteryColor = () => {
    if (batteryInfo.level <= 10) return "text-cyber-red";
    if (batteryInfo.level <= 20) return "text-cyber-orange";
    if (batteryInfo.level <= 50) return "text-cyber-blue";
    return "text-cyber-green";
  };

  const getLocationString = () => {
    if (!location) return "Location unavailable";
    return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
  };

  return (
    <div className="space-y-4">
      {/* Survival Mode Status */}
      <Card className={cn(
        "p-4 border-2 transition-all duration-300",
        isEnabled ? "border-cyber-orange bg-destructive/10" : "border-cyber-blue/30 bg-[var(--gradient-card)]"
      )}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Battery className={cn(
              "w-6 h-6",
              isEnabled ? "text-cyber-orange" : "text-cyber-blue"
            )} />
            <h3 className="text-xl font-bold">Energy Survival Mode</h3>
          </div>
          
          <Badge variant={isEnabled ? "destructive" : "outline"}>
            {isEnabled ? "ACTIVE" : "STANDBY"}
          </Badge>
        </div>

        {/* Battery Status */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">Battery Level</span>
            <span className={cn("font-bold", getBatteryColor())}>
              {batteryInfo.level}%
              {batteryInfo.charging && (
                <Zap className="w-4 h-4 inline ml-1 text-cyber-green" />
              )}
            </span>
          </div>
          
          <div className="w-full bg-background/30 rounded-full h-3">
            <div 
              className={cn(
                "h-3 rounded-full transition-all duration-300",
                batteryInfo.level <= 10 ? "bg-cyber-red" :
                batteryInfo.level <= 20 ? "bg-cyber-orange" :
                batteryInfo.level <= 50 ? "bg-cyber-blue" : "bg-cyber-green"
              )}
              style={{ width: `${batteryInfo.level}%` }}
            />
          </div>
          
          {batteryInfo.dischargingTime && batteryInfo.dischargingTime !== Infinity && (
            <div className="text-xs text-muted-foreground mt-1">
              {Math.round(batteryInfo.dischargingTime / 3600)} hours remaining
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          {!isEnabled ? (
            <Button 
              onClick={() => enableSurvivalMode()}
              variant="outline"
              className="flex-1"
            >
              <ZapOff className="w-4 h-4 mr-2" />
              Enable Survival Mode
            </Button>
          ) : (
            <Button 
              onClick={disableSurvivalMode}
              variant="outline"
              className="flex-1"
            >
              <Zap className="w-4 h-4 mr-2" />
              Disable Survival Mode
            </Button>
          )}
        </div>

        {/* Survival Mode Duration */}
        {isEnabled && (
          <div className="mt-3 p-3 bg-background/30 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm">Survival Duration</span>
              <span className="font-mono font-bold text-cyber-orange">
                {getSurvivalDuration()}
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Critical Information Display (Survival Mode) */}
      {isEnabled && (
        <Card className="p-4 bg-black/80 border-2 border-cyber-orange">
          <div className="text-center space-y-4">
            {/* Location */}
            <div>
              <MapPin className="w-8 h-8 mx-auto mb-2 text-cyber-orange" />
              <div className="text-sm text-muted-foreground">Current Location</div>
              <div className="font-mono text-sm">{getLocationString()}</div>
              {location && (
                <div className="text-xs text-muted-foreground">
                  Accuracy: ±{Math.round(location.accuracy)}m
                </div>
              )}
            </div>

            {/* Vital Signs Strip */}
            <div className="grid grid-cols-3 gap-4 py-3 border-y border-cyber-orange/30">
              <div className="text-center">
                <Heart className="w-6 h-6 mx-auto mb-1 text-cyber-red animate-pulse" />
                <div className="text-lg font-bold">
                  {currentVitals?.heartRate || "--"}
                </div>
                <div className="text-xs text-muted-foreground">BPM</div>
              </div>
              
              <div className="text-center">
                <Signal className="w-6 h-6 mx-auto mb-1 text-cyber-blue" />
                <div className="text-lg font-bold">
                  {currentVitals?.spO2 || "--"}%
                </div>
                <div className="text-xs text-muted-foreground">SpO₂</div>
              </div>
              
              <div className="text-center">
                <Battery className="w-6 h-6 mx-auto mb-1 text-cyber-orange" />
                <div className="text-lg font-bold">{batteryInfo.level}%</div>
                <div className="text-xs text-muted-foreground">Battery</div>
              </div>
            </div>

            {/* Emergency QR Code */}
            <div>
              <QrCode className="w-8 h-8 mx-auto mb-2 text-cyber-green" />
              <div className="text-sm text-muted-foreground mb-2">Emergency QR Code</div>
              <div className="p-3 bg-white rounded-lg max-w-48 mx-auto">
                <div className="w-full aspect-square bg-gray-900 rounded flex items-center justify-center">
                  <span className="text-white text-xs">QR Code</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Scan for emergency info & contacts
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Power Management Features */}
      {isEnabled && (
        <Card className="p-4 bg-[var(--gradient-card)] border border-border">
          <h4 className="font-bold mb-3 flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            Power Conservation
          </h4>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span>GPS Polling</span>
              <Badge variant={lowPowerFeatures.gpsPolling ? "destructive" : "default"}>
                {lowPowerFeatures.gpsPolling ? "Reduced" : "Normal"}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Camera/ML</span>
              <Badge variant={lowPowerFeatures.mlDisabled ? "destructive" : "default"}>
                {lowPowerFeatures.mlDisabled ? "Disabled" : "Active"}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Background Sync</span>
              <Badge variant={lowPowerFeatures.backgroundSync ? "default" : "destructive"}>
                {lowPowerFeatures.backgroundSync ? "Active" : "Disabled"}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Display</span>
              <Badge variant={lowPowerFeatures.reducedDisplay ? "destructive" : "default"}>
                {lowPowerFeatures.reducedDisplay ? "Minimal" : "Full"}
              </Badge>
            </div>
          </div>
        </Card>
      )}

      {/* Emergency Contacts (Survival Mode) */}
      {isEnabled && emergencyContacts.length > 0 && (
        <Card className="p-4 bg-[var(--gradient-card)] border border-border">
          <h4 className="font-bold mb-3">Emergency Contacts</h4>
          
          <div className="space-y-2">
            {emergencyContacts.slice(0, 3).map((contact, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-background/30 rounded">
                <span className="font-medium">{contact.name}</span>
                <span className="text-sm text-muted-foreground font-mono">
                  {contact.phone}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Low Battery Warning */}
      {batteryInfo.level <= 20 && !isEnabled && (
        <Alert className="border-cyber-orange">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Low Battery Warning:</strong> Consider enabling Energy Survival Mode 
            to extend device life during emergencies.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};