import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { 
  Watch, 
  Battery, 
  Heart, 
  Activity, 
  Zap, 
  Shield,
  Settings,
  Bluetooth,
  TrendingUp,
  Footprints,
  Flame,
  Droplets,
  Clock,
  Wifi,
  Volume2,
  Vibrate,
  MapPin,
  Phone
} from "lucide-react";

interface WatchData {
  battery: number;
  heartRate: number;
  steps: number;
  calories: number;
  distance: number;
  isConnected: boolean;
  lastSync: Date;
  activeMode: string;
  currentTime: string;
}

interface HealthMetrics {
  heartRate: number;
  spO2: number;
  temperature: number;
  confidence?: number;
}

interface SmartWatchHubProps {
  onEmergencyTrigger: () => void;
  healthReadings: HealthMetrics;
}

export const EnhancedSmartWatchHub = ({ onEmergencyTrigger, healthReadings }: SmartWatchHubProps) => {
  const [watchData, setWatchData] = useState<WatchData>({
    battery: 85,
    heartRate: healthReadings.heartRate,
    steps: 8432,
    calories: 312,
    distance: 6.2,
    isConnected: true,
    lastSync: new Date(),
    activeMode: "Guardian Mode",
    currentTime: new Date().toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  });

  const [settings, setSettings] = useState({
    heartRateMonitoring: true,
    fallDetection: true,
    emergencyContacts: true,
    voiceCommands: true,
    hapticFeedback: true,
    autoSync: true,
    flashlightSOS: true,
    gpsTracking: true
  });

  const [selectedWatchFace, setSelectedWatchFace] = useState('guardian');
  const [isSOSActive, setIsSOSActive] = useState(false);

  const watchFaces = [
    { id: 'guardian', name: 'Guardian Pulse', color: 'cyber-blue', emoji: '🛡️' },
    { id: 'medical', name: 'Medical Pro', color: 'cyber-green', emoji: '🩺' },
    { id: 'rescue', name: 'Rescue Mode', color: 'cyber-red', emoji: '🚨' },
    { id: 'space', name: 'Space Guardian', color: 'cyber-purple', emoji: '🚀' }
  ];

  // Real-time watch updates
  useEffect(() => {
    const interval = setInterval(() => {
      setWatchData(prev => ({
        ...prev,
        heartRate: Math.max(50, Math.min(150, healthReadings.heartRate + Math.floor(Math.random() * 6 - 3))),
        steps: prev.steps + Math.floor(Math.random() * 8),
        calories: prev.calories + Math.floor(Math.random() * 2),
        currentTime: new Date().toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        lastSync: new Date(),
        battery: Math.max(15, prev.battery - (Math.random() < 0.05 ? 1 : 0))
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, [healthReadings.heartRate]);

  const getBatteryColor = (battery: number) => {
    if (battery > 50) return 'text-cyber-green';
    if (battery > 20) return 'text-cyber-orange';
    return 'text-cyber-red';
  };

  const getHeartRateZone = (hr: number) => {
    if (hr < 60) return { zone: 'Rest', color: 'text-cyber-blue', bgColor: 'bg-cyber-blue/20' };
    if (hr < 100) return { zone: 'Normal', color: 'text-cyber-green', bgColor: 'bg-cyber-green/20' };
    if (hr < 150) return { zone: 'Active', color: 'text-cyber-orange', bgColor: 'bg-cyber-orange/20' };
    return { zone: 'High', color: 'text-cyber-red', bgColor: 'bg-cyber-red/20' };
  };

  const handleEmergencySOS = () => {
    setIsSOSActive(true);
    onEmergencyTrigger();
    
    // Auto-disable SOS after 30 seconds
    setTimeout(() => {
      setIsSOSActive(false);
    }, 30000);
  };

  const renderRealisticWatch = () => {
    const hrZone = getHeartRateZone(watchData.heartRate);
    const currentFace = watchFaces.find(f => f.id === selectedWatchFace) || watchFaces[0];
    
    return (
      <div className="relative w-80 h-80 mx-auto">
        {/* Watch Frame - More realistic Apple Watch design */}
        <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-br from-gray-700 via-gray-800 to-black border-4 border-gray-600 shadow-2xl">
          {/* Screen Bezel */}
          <div className="absolute inset-3 rounded-[2.5rem] bg-gradient-to-br from-gray-900 to-black border border-gray-700 overflow-hidden">
            {/* OLED Screen */}
            <div className="absolute inset-2 rounded-[2rem] bg-black overflow-hidden">
              {/* Always-On Display Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-gray-900/30 to-black/60" />
              
              {/* Main Watch Face Content */}
              <div className="relative h-full flex flex-col items-center justify-center p-4 text-white">
                {/* Time Display */}
                <div className="absolute top-4 left-0 right-0 text-center">
                  <div className="text-2xl font-bold font-mono text-white/90">
                    {watchData.currentTime}
                  </div>
                  <div className="text-xs text-white/60 font-poppins">
                    {new Date().toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                </div>

                {/* Central Health Ring */}
                <div className="relative mt-8">
                  {/* Outer Ring - Activity */}
                  <div className="w-32 h-32 rounded-full border-4 border-gray-700 relative">
                    {/* Heart Rate Ring */}
                    <div className="absolute inset-3 rounded-full border-3 border-cyber-blue/30 flex items-center justify-center">
                      <div className="text-center">
                        <Heart className={cn("w-6 h-6 mx-auto mb-1", hrZone.color)} />
                        <div className="text-xl font-bold font-mono">{watchData.heartRate}</div>
                        <div className="text-xs text-white/60">{hrZone.zone}</div>
                      </div>
                    </div>
                    
                    {/* Animated Pulse */}
                    {watchData.isConnected && (
                      <div className={cn(
                        "absolute inset-3 rounded-full border-2 animate-ping",
                        `border-${currentFace.color}`
                      )} />
                    )}
                  </div>
                </div>

                {/* Bottom Status Row */}
                <div className="absolute bottom-4 left-0 right-0 flex justify-between items-center px-4">
                  {/* Battery */}
                  <div className="flex items-center space-x-1">
                    <Battery className={cn("w-4 h-4", getBatteryColor(watchData.battery))} />
                    <span className={cn("text-xs font-mono", getBatteryColor(watchData.battery))}>
                      {watchData.battery}%
                    </span>
                  </div>
                  
                  {/* Mode Indicator */}
                  <div className={cn("text-xs px-2 py-1 rounded-full", hrZone.bgColor)}>
                    {currentFace.emoji}
                  </div>
                  
                  {/* Connection Status */}
                  <div className="flex items-center space-x-1">
                    <Bluetooth className={cn(
                      "w-4 h-4",
                      watchData.isConnected ? "text-cyber-blue" : "text-gray-500"
                    )} />
                    {isSOSActive && (
                      <div className="w-2 h-2 bg-cyber-red rounded-full animate-pulse" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Digital Crown */}
        <div className="absolute right-0 top-1/3 w-6 h-12 bg-gradient-to-r from-gray-600 to-gray-500 rounded-r-lg shadow-lg" />
        
        {/* Side Button */}
        <div className="absolute right-0 top-1/2 transform translate-y-2 w-4 h-8 bg-gradient-to-r from-gray-700 to-gray-600 rounded-r shadow-md" />
        
        {/* Watch Band Attachment Points */}
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-6 h-3 bg-gray-700 rounded-b" />
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-3 bg-gray-700 rounded-t" />
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Connection Status Card */}
      <Card className="p-6 bg-[var(--gradient-card)] border-cyber-blue/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className={cn(
              "p-3 rounded-full",
              watchData.isConnected ? "bg-cyber-green/20" : "bg-cyber-red/20"
            )}>
              <Watch className={cn(
                "w-6 h-6",
                watchData.isConnected ? "text-cyber-green" : "text-cyber-red"
              )} />
            </div>
            <div>
              <h3 className="text-lg font-bold font-poppins text-foreground">LifeLine Watch Pro</h3>
              <p className="text-sm text-muted-foreground font-poppins">
                Model: Guardian Series 5 • 45mm
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-end space-y-2">
            <Badge 
              className={cn(
                "font-poppins",
                watchData.isConnected 
                  ? "bg-cyber-green text-black" 
                  : "bg-cyber-red text-white"
              )}
            >
              {watchData.isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Wifi className="w-4 h-4" />
              <span>Last sync: {watchData.lastSync.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
        
        {/* Battery Status */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-poppins text-foreground">Battery Level</span>
            <span className={cn("text-sm font-bold", getBatteryColor(watchData.battery))}>
              {watchData.battery}%
            </span>
          </div>
          <Progress 
            value={watchData.battery} 
            className="h-2"
            style={{
              background: 'hsl(var(--muted))',
            }}
          />
          {watchData.battery < 20 && (
            <p className="text-xs text-cyber-orange mt-1 font-poppins">
              Low battery - Enable power saving mode
            </p>
          )}
        </div>
      </Card>

      {/* Realistic Watch Display */}
      <Card className="p-8 bg-[var(--gradient-card)] border-cyber-blue/20">
        <h3 className="text-xl font-bold font-poppins text-foreground mb-6 text-center">
          Live Watch Display
        </h3>
        {renderRealisticWatch()}
      </Card>

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 bg-[var(--gradient-card)] border-cyber-blue/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-full bg-cyber-blue/20">
                <Footprints className="w-6 h-6 text-cyber-blue" />
              </div>
              <div>
                <div className="text-2xl font-bold font-poppins text-foreground">
                  {watchData.steps.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground font-poppins">
                  Steps Today
                </div>
              </div>
            </div>
            <TrendingUp className="w-5 h-5 text-cyber-green" />
          </div>
        </Card>

        <Card className="p-4 bg-[var(--gradient-card)] border-cyber-blue/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-full bg-cyber-orange/20">
                <Flame className="w-6 h-6 text-cyber-orange" />
              </div>
              <div>
                <div className="text-2xl font-bold font-poppins text-foreground">
                  {watchData.calories}
                </div>
                <div className="text-xs text-muted-foreground font-poppins">
                  Calories
                </div>
              </div>
            </div>
            <Activity className="w-5 h-5 text-cyber-orange" />
          </div>
        </Card>

        <Card className="p-4 bg-[var(--gradient-card)] border-cyber-blue/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-full bg-cyber-green/20">
                <MapPin className="w-6 h-6 text-cyber-green" />
              </div>
              <div>
                <div className="text-2xl font-bold font-poppins text-foreground">
                  {watchData.distance} km
                </div>
                <div className="text-xs text-muted-foreground font-poppins">
                  Distance
                </div>
              </div>
            </div>
            <TrendingUp className="w-5 h-5 text-cyber-green" />
          </div>
        </Card>

        <Card className="p-4 bg-[var(--gradient-card)] border-cyber-blue/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={cn("p-2 rounded-full", getHeartRateZone(watchData.heartRate).bgColor)}>
                <Heart className={cn("w-6 h-6", getHeartRateZone(watchData.heartRate).color)} />
              </div>
              <div>
                <div className="text-2xl font-bold font-poppins text-foreground">
                  {watchData.heartRate}
                </div>
                <div className="text-xs text-muted-foreground font-poppins">
                  {getHeartRateZone(watchData.heartRate).zone} Zone
                </div>
              </div>
            </div>
            <Activity className={cn("w-5 h-5", getHeartRateZone(watchData.heartRate).color)} />
          </div>
        </Card>
      </div>

      {/* Watch Faces Selection */}
      <Card className="p-6 bg-[var(--gradient-card)] border-cyber-blue/20">
        <h3 className="text-lg font-bold font-poppins text-foreground mb-4">
          Watch Faces
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {watchFaces.map((face) => (
            <Button
              key={face.id}
              variant={selectedWatchFace === face.id ? "default" : "outline"}
              className={cn(
                "h-20 flex flex-col items-center justify-center font-poppins transition-all",
                selectedWatchFace === face.id && "bg-[var(--gradient-primary)] text-white shadow-lg"
              )}
              onClick={() => setSelectedWatchFace(face.id)}
            >
              <span className="text-3xl mb-1">{face.emoji}</span>
              <span className="text-xs">{face.name}</span>
            </Button>
          ))}
        </div>
      </Card>

      {/* Advanced Settings */}
      <Card className="p-6 bg-[var(--gradient-card)] border-cyber-blue/20">
        <h3 className="text-lg font-bold font-poppins text-foreground mb-4">
          Guardian Settings
        </h3>
        <div className="space-y-4">
          {Object.entries(settings).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
              <div className="flex items-center space-x-3">
                {key === 'heartRateMonitoring' && <Heart className="w-5 h-5 text-cyber-red" />}
                {key === 'fallDetection' && <Zap className="w-5 h-5 text-cyber-orange" />}
                {key === 'emergencyContacts' && <Phone className="w-5 h-5 text-cyber-blue" />}
                {key === 'voiceCommands' && <Volume2 className="w-5 h-5 text-cyber-green" />}
                {key === 'hapticFeedback' && <Vibrate className="w-5 h-5 text-cyber-purple" />}
                {key === 'autoSync' && <Bluetooth className="w-5 h-5 text-cyber-blue" />}
                {key === 'flashlightSOS' && <Zap className="w-5 h-5 text-cyber-orange" />}
                {key === 'gpsTracking' && <MapPin className="w-5 h-5 text-cyber-green" />}
                
                <span className="font-poppins text-sm capitalize font-medium">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
              </div>
              <Switch
                checked={value}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, [key]: checked }))
                }
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Emergency Controls */}
      <div className="grid grid-cols-1 gap-4">
        <Button
          variant="destructive"
          size="lg"
          className={cn(
            "h-16 font-bold text-lg font-poppins transition-all",
            isSOSActive && "animate-pulse bg-cyber-red"
          )}
          onClick={handleEmergencySOS}
          disabled={isSOSActive}
        >
          <Shield className="w-8 h-8 mr-3" />
          {isSOSActive ? "SOS ACTIVE..." : "EMERGENCY SOS"}
        </Button>
        
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="h-12 font-poppins border-cyber-blue/30"
          >
            <Settings className="w-5 h-5 mr-2" />
            Sync Watch
          </Button>
          
          <Button
            variant="outline"
            className="h-12 font-poppins border-cyber-green/30"
          >
            <Activity className="w-5 h-5 mr-2" />
            Health Export
          </Button>
        </div>
      </div>
    </div>
  );
};