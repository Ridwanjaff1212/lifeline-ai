import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  Watch, 
  Battery, 
  Heart, 
  Shield,
  Zap,
  Settings,
  Bluetooth,
  TrendingUp,
  Flame
} from "lucide-react";

interface AegisWatch3DProps {
  onEmergencyTrigger: () => void;
  healthReadings: {
    heartRate: number;
    spO2: number;
    temperature: number;
  };
}

interface WatchData {
  battery: number;
  heartRate: number;
  steps: number;
  calories: number;
  isConnected: boolean;
  lastSync: Date;
  activeMode: string;
  model: string;
}

export const AegisWatch3D = ({ onEmergencyTrigger, healthReadings }: AegisWatch3DProps) => {
  const [watchData, setWatchData] = useState<WatchData>({
    battery: 87,
    heartRate: healthReadings.heartRate,
    steps: 12847,
    calories: 543,
    isConnected: true,
    lastSync: new Date(),
    activeMode: "Guardian Mode",
    model: "Aegis Guardian Pro"
  });

  const [selectedFace, setSelectedFace] = useState('guardian');
  const [isCharging, setIsCharging] = useState(false);

  const watchFaces = [
    { id: 'guardian', name: 'Guardian Pulse', preview: '🛡️', theme: 'cyber-blue' },
    { id: 'medical', name: 'Medical Pro', preview: '🩺', theme: 'cyber-green' },
    { id: 'rescue', name: 'Rescue Mode', preview: '🚨', theme: 'cyber-red' },
    { id: 'space', name: 'Space Guardian', preview: '🚀', theme: 'cyber-purple' }
  ];

  // Simulate real-time watch data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setWatchData(prev => ({
        ...prev,
        heartRate: healthReadings.heartRate + Math.floor(Math.random() * 6 - 3),
        steps: prev.steps + Math.floor(Math.random() * 15),
        calories: prev.calories + Math.floor(Math.random() * 5),
        lastSync: new Date(),
        battery: isCharging 
          ? Math.min(100, prev.battery + 1)
          : Math.max(15, prev.battery - (Math.random() < 0.05 ? 1 : 0))
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, [healthReadings.heartRate, isCharging]);

  const getBatteryColor = (battery: number) => {
    if (battery > 50) return 'text-cyber-green';
    if (battery > 20) return 'text-cyber-orange';
    return 'text-cyber-red';
  };

  const getSelectedFaceTheme = () => {
    const face = watchFaces.find(f => f.id === selectedFace);
    return face?.theme || 'cyber-blue';
  };

  const render3DWatch = () => {
    const themeColor = getSelectedFaceTheme();
    
    return (
      <div className="relative mx-auto" style={{ perspective: '800px' }}>
        {/* 3D Watch Container */}
        <div 
          className="relative w-48 h-48 mx-auto transition-transform duration-700 hover:scale-105"
          style={{ 
            transformStyle: 'preserve-3d',
            transform: 'rotateX(-10deg) rotateY(5deg)'
          }}
        >
          {/* Watch Band */}
          <div className="absolute inset-x-8 -inset-y-8 bg-gradient-to-b from-gray-700 via-gray-800 to-gray-900 rounded-full shadow-2xl opacity-80" />
          
          {/* Watch Body */}
          <div className="absolute inset-4 rounded-full bg-gradient-to-br from-gray-800 via-gray-900 to-black shadow-2xl border-4 border-gray-600">
            {/* Charging Ring */}
            {isCharging && (
              <div className="absolute -inset-2 rounded-full border-2 border-cyber-blue animate-pulse shadow-[0_0_20px_hsl(var(--cyber-blue)/0.6)]" />
            )}
            
            {/* Screen Bezel */}
            <div className="absolute inset-3 rounded-full bg-black border-2 border-gray-700 shadow-inner">
              {/* Screen */}
              <div className={cn(
                "absolute inset-2 rounded-full bg-gradient-to-br from-gray-900 to-black flex flex-col items-center justify-center text-white overflow-hidden",
                `shadow-[0_0_15px_hsl(var(--${themeColor})/0.4)]`
              )}>
                {/* Watch Face Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {/* Time */}
                  <div className={cn("text-sm font-bold font-poppins", `text-${themeColor}`)}>
                    {new Date().toLocaleTimeString('en-US', { 
                      hour12: false, 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                  
                  {/* Heart Rate Center */}
                  <div className="relative mt-1">
                    <div className="w-12 h-12 rounded-full border border-gray-600 flex items-center justify-center">
                      <div className="text-center">
                        <Heart className={cn("w-3 h-3 mx-auto mb-1", `text-${themeColor}`)} />
                        <span className="text-xs font-bold font-poppins">{watchData.heartRate}</span>
                      </div>
                    </div>
                    {/* Pulse Ring */}
                    <div className={cn(
                      "absolute inset-0 rounded-full border animate-ping",
                      `border-${themeColor}`
                    )} />
                  </div>
                  
                  {/* Mode & Battery */}
                  <div className="mt-1 text-center">
                    <div className={cn("text-xs font-poppins", `text-${themeColor}`)}>
                      {watchData.activeMode}
                    </div>
                    <div className="flex items-center justify-center mt-1">
                      <Battery className={cn("w-2 h-2 mr-1", getBatteryColor(watchData.battery))} />
                      <span className={cn("text-xs font-poppins", getBatteryColor(watchData.battery))}>
                        {watchData.battery}%
                      </span>
                      {isCharging && <Zap className="w-2 h-2 ml-1 text-cyber-blue animate-pulse" />}
                    </div>
                  </div>
                </div>
                
                {/* Face Preview */}
                <div className="absolute top-1 right-1 text-xs">
                  {watchFaces.find(f => f.id === selectedFace)?.preview}
                </div>
              </div>
            </div>
            
            {/* Crown/Digital Crown */}
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-2 h-6 bg-gray-500 rounded-r shadow-md" />
            
            {/* Side Button */}
            <div className="absolute right-0 top-1/3 w-2 h-4 bg-gray-600 rounded-r shadow-sm" />
          </div>
          
          {/* 3D Shadow */}
          <div 
            className="absolute inset-4 rounded-full bg-black opacity-20 blur-md"
            style={{ transform: 'translateZ(-20px) scale(1.1)' }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Watch Brand Header */}
      <Card className="p-4 bg-[var(--gradient-card)] border-cyber-blue/20">
        <div className="text-center">
          <h2 className="text-xl font-bold font-poppins text-cyber-blue mb-1">
            ⚡ AEGIS SmartWatch
          </h2>
          <p className="text-sm text-muted-foreground">
            {watchData.model} • {watchData.isConnected ? 'Connected' : 'Disconnected'}
          </p>
          <Badge className={cn(
            "mt-2 font-poppins",
            watchData.isConnected ? "bg-cyber-green text-black" : "bg-cyber-red text-white"
          )}>
            <Bluetooth className="w-3 h-3 mr-1" />
            {watchData.isConnected ? 'Synced' : 'Offline'}
          </Badge>
        </div>
      </Card>

      {/* 3D Watch Display */}
      <Card className="p-6 bg-[var(--gradient-card)] border-cyber-blue/20">
        <div className="text-center mb-4">
          <h3 className="font-bold font-poppins text-foreground">
            Live Watch Display
          </h3>
          <p className="text-xs text-muted-foreground">3D Interactive Model</p>
        </div>
        {render3DWatch()}
        
        {/* Watch Controls */}
        <div className="mt-6 flex justify-center gap-3">
          <Button
            size="sm"
            onClick={() => setIsCharging(!isCharging)}
            className={cn(
              "font-poppins",
              isCharging ? "bg-cyber-blue text-white" : "bg-gray-600 text-white"
            )}
          >
            <Zap className="w-4 h-4 mr-1" />
            {isCharging ? "Charging..." : "Charge"}
          </Button>
          <Button
            size="sm"
            onClick={onEmergencyTrigger}
            className="bg-cyber-red text-white font-poppins"
          >
            <Shield className="w-4 h-4 mr-1" />
            Watch SOS
          </Button>
        </div>
      </Card>

      {/* Watch Faces */}
      <Card className="p-4 bg-[var(--gradient-card)] border-cyber-blue/20">
        <h3 className="font-bold font-poppins text-foreground mb-3">
          Guardian Watch Faces
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {watchFaces.map((face) => (
            <Button
              key={face.id}
              variant={selectedFace === face.id ? "default" : "outline"}
              className={cn(
                "h-16 flex flex-col items-center justify-center font-poppins transition-all duration-300",
                selectedFace === face.id && `bg-[var(--gradient-primary)] text-white shadow-[0_0_15px_hsl(var(--${face.theme})/0.4)]`
              )}
              onClick={() => setSelectedFace(face.id)}
            >
              <span className="text-xl mb-1">{face.preview}</span>
              <span className="text-xs">{face.name}</span>
            </Button>
          ))}
        </div>
      </Card>

      {/* Watch Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 bg-[var(--gradient-card)] border-cyber-green/20">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-6 h-6 text-cyber-green" />
            <div>
              <div className="text-lg font-bold font-poppins text-foreground">
                {watchData.steps.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground font-poppins">
                Steps Today
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-[var(--gradient-card)] border-cyber-orange/20">
          <div className="flex items-center space-x-3">
            <Flame className="w-6 h-6 text-cyber-orange" />
            <div>
              <div className="text-lg font-bold font-poppins text-foreground">
                {watchData.calories}
              </div>
              <div className="text-xs text-muted-foreground font-poppins">
                Calories Burned
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Advanced Features */}
      <Card className="p-4 bg-[var(--gradient-card)] border-cyber-purple/20">
        <h3 className="font-bold font-poppins text-cyber-purple mb-3">
          Aegis Guardian Features
        </h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-background/30 rounded flex items-center gap-2">
            <div className="w-2 h-2 bg-cyber-green rounded-full"></div>
            <span>Fall Detection</span>
          </div>
          <div className="p-2 bg-background/30 rounded flex items-center gap-2">
            <div className="w-2 h-2 bg-cyber-blue rounded-full"></div>
            <span>Heart Monitoring</span>
          </div>
          <div className="p-2 bg-background/30 rounded flex items-center gap-2">
            <div className="w-2 h-2 bg-cyber-orange rounded-full"></div>
            <span>SpO₂ Tracking</span>
          </div>
          <div className="p-2 bg-background/30 rounded flex items-center gap-2">
            <div className="w-2 h-2 bg-cyber-red rounded-full"></div>
            <span>Emergency SOS</span>
          </div>
        </div>
        
        <div className="mt-3 p-2 bg-cyber-purple/10 border border-cyber-purple/30 rounded">
          <div className="text-xs text-cyber-purple font-medium">
            Last Sync: {watchData.lastSync.toLocaleTimeString()}
          </div>
        </div>
      </Card>
    </div>
  );
};