import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Droplets
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
}

interface SmartWatchHubProps {
  onEmergencyTrigger: () => void;
  healthReadings: {
    heartRate: number;
    spO2: number;
    temperature: number;
  };
}

export const SmartWatchHub = ({ onEmergencyTrigger, healthReadings }: SmartWatchHubProps) => {
  const [watchData, setWatchData] = useState<WatchData>({
    battery: 85,
    heartRate: healthReadings.heartRate,
    steps: 8432,
    calories: 312,
    distance: 6.2,
    isConnected: true,
    lastSync: new Date(),
    activeMode: "Guardian Mode"
  });

  const [settings, setSettings] = useState({
    heartRateMonitoring: true,
    fallDetection: true,
    emergencyContacts: true,
    voiceCommands: true,
    hapticFeedback: true
  });

  const watchFaces = [
    { id: 'guardian', name: 'Guardian Pulse', preview: '🛡️' },
    { id: 'medical', name: 'Medical Pro', preview: '🩺' },
    { id: 'rescue', name: 'Rescue Mode', preview: '🚨' },
    { id: 'astronaut', name: 'Space Guardian', preview: '🚀' }
  ];

  const [selectedFace, setSelectedFace] = useState('guardian');

  // Simulate real-time watch data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setWatchData(prev => ({
        ...prev,
        heartRate: healthReadings.heartRate + Math.floor(Math.random() * 6 - 3),
        steps: prev.steps + Math.floor(Math.random() * 10),
        calories: prev.calories + Math.floor(Math.random() * 3),
        lastSync: new Date(),
        battery: Math.max(20, prev.battery - (Math.random() < 0.1 ? 1 : 0))
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, [healthReadings.heartRate]);

  const getBatteryColor = (battery: number) => {
    if (battery > 50) return 'text-cyber-green';
    if (battery > 20) return 'text-cyber-orange';
    return 'text-cyber-red';
  };

  const getHeartRateZone = (hr: number) => {
    if (hr < 60) return { zone: 'Rest', color: 'cyber-blue' };
    if (hr < 100) return { zone: 'Normal', color: 'cyber-green' };
    if (hr < 150) return { zone: 'Active', color: 'cyber-orange' };
    return { zone: 'High', color: 'cyber-red' };
  };

  const renderWatchFace = () => {
    const hrZone = getHeartRateZone(watchData.heartRate);
    
    return (
      <div className="relative w-64 h-64 mx-auto">
        {/* Watch Frame */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-800 to-black border-4 border-gray-600 shadow-2xl">
          {/* Screen */}
          <div className="absolute inset-4 rounded-full bg-black border border-gray-700">
            {/* Watch Face Content */}
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-gray-900 to-black flex flex-col items-center justify-center text-white">
              {/* Time */}
              <div className="text-lg font-bold font-poppins text-cyber-blue">
                {new Date().toLocaleTimeString('en-US', { 
                  hour12: false, 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
              
              {/* Heart Rate Ring */}
              <div className="relative mt-2">
                <div className="w-16 h-16 rounded-full border-2 border-gray-700 flex items-center justify-center">
                  <div className="text-center">
                    <Heart className={cn("w-4 h-4 mx-auto mb-1", `text-${hrZone.color}`)} />
                    <span className="text-xs font-bold font-poppins">{watchData.heartRate}</span>
                  </div>
                </div>
                {/* Pulse Animation */}
                <div className={cn(
                  "absolute inset-0 rounded-full border-2 animate-ping",
                  `border-${hrZone.color}`
                )} />
              </div>
              
              {/* Mode & Battery */}
              <div className="mt-2 text-center">
                <div className="text-xs text-cyan-400 font-poppins">
                  {watchData.activeMode}
                </div>
                <div className="flex items-center justify-center mt-1">
                  <Battery className={cn("w-3 h-3 mr-1", getBatteryColor(watchData.battery))} />
                  <span className={cn("text-xs font-poppins", getBatteryColor(watchData.battery))}>
                    {watchData.battery}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Crown/Button */}
        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-4 h-8 bg-gray-600 rounded-r-lg" />
        
        {/* Side Button */}
        <div className="absolute right-0 top-1/3 w-3 h-6 bg-gray-700 rounded-r" />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card className="p-4 bg-[var(--gradient-card)] border-cyber-blue/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={cn(
              "p-2 rounded-full",
              watchData.isConnected ? "bg-cyber-green/20" : "bg-cyber-red/20"
            )}>
              <Watch className={cn(
                "w-5 h-5",
                watchData.isConnected ? "text-cyber-green" : "text-cyber-red"
              )} />
            </div>
            <div>
              <h3 className="font-bold font-poppins text-foreground">LifeLine Watch</h3>
              <p className="text-xs text-muted-foreground font-poppins">
                Model: Guardian Pro
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Bluetooth className={cn(
              "w-4 h-4",
              watchData.isConnected ? "text-cyber-blue" : "text-gray-500"
            )} />
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
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground font-poppins">
          Last sync: {watchData.lastSync.toLocaleTimeString()}
        </div>
      </Card>

      {/* Watch Display */}
      <Card className="p-6 bg-[var(--gradient-card)] border-cyber-blue/20">
        <h3 className="font-bold font-poppins text-foreground mb-4 text-center">
          Live Watch Display
        </h3>
        {renderWatchFace()}
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 bg-[var(--gradient-card)] border-cyber-blue/20">
          <div className="flex items-center space-x-3">
            <Footprints className="w-8 h-8 text-cyber-blue" />
            <div>
              <div className="text-2xl font-bold font-poppins text-foreground">
                {watchData.steps.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground font-poppins">
                Steps Today
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-[var(--gradient-card)] border-cyber-blue/20">
          <div className="flex items-center space-x-3">
            <Flame className="w-8 h-8 text-cyber-orange" />
            <div>
              <div className="text-2xl font-bold font-poppins text-foreground">
                {watchData.calories}
              </div>
              <div className="text-xs text-muted-foreground font-poppins">
                Calories Burned
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-[var(--gradient-card)] border-cyber-blue/20">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-8 h-8 text-cyber-green" />
            <div>
              <div className="text-2xl font-bold font-poppins text-foreground">
                {watchData.distance} km
              </div>
              <div className="text-xs text-muted-foreground font-poppins">
                Distance
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-[var(--gradient-card)] border-cyber-blue/20">
          <div className="flex items-center space-x-3">
            <Heart className={cn("w-8 h-8", `text-${getHeartRateZone(watchData.heartRate).color}`)} />
            <div>
              <div className="text-2xl font-bold font-poppins text-foreground">
                {watchData.heartRate}
              </div>
              <div className="text-xs text-muted-foreground font-poppins">
                BPM - {getHeartRateZone(watchData.heartRate).zone}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Watch Faces */}
      <Card className="p-4 bg-[var(--gradient-card)] border-cyber-blue/20">
        <h3 className="font-bold font-poppins text-foreground mb-4">
          Watch Faces
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {watchFaces.map((face) => (
            <Button
              key={face.id}
              variant={selectedFace === face.id ? "default" : "outline"}
              className={cn(
                "h-20 flex flex-col items-center justify-center font-poppins",
                selectedFace === face.id && "bg-[var(--gradient-primary)] text-white"
              )}
              onClick={() => setSelectedFace(face.id)}
            >
              <span className="text-2xl mb-1">{face.preview}</span>
              <span className="text-xs">{face.name}</span>
            </Button>
          ))}
        </div>
      </Card>

      {/* Settings */}
      <Card className="p-4 bg-[var(--gradient-card)] border-cyber-blue/20">
        <h3 className="font-bold font-poppins text-foreground mb-4">
          Guardian Settings
        </h3>
        <div className="space-y-4">
          {Object.entries(settings).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="font-poppins text-sm capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </span>
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

      {/* Emergency Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Button
          variant="destructive"
          className="h-16 font-poppins"
          onClick={onEmergencyTrigger}
        >
          <Shield className="w-6 h-6 mr-2" />
          Watch SOS
        </Button>
        
        <Button
          variant="outline"
          className="h-16 font-poppins border-cyber-blue/30"
        >
          <Settings className="w-6 h-6 mr-2" />
          Sync Watch
        </Button>
      </div>
    </div>
  );
};