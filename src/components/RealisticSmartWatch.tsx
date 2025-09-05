import { useState, useEffect, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { 
  Watch, Battery, Heart, Activity, Zap, Shield, Settings, Bluetooth, 
  TrendingUp, Footprints, Flame, Droplets, Clock, Wifi, Volume2, 
  Vibrate, MapPin, Phone, Mic, Eye, Timer, Sun, Moon, 
  PlayCircle, StopCircle, SkipForward, MessageCircle, Users,
  ChevronUp, ChevronDown, Power, RotateCcw, Smartphone, AlertTriangle
} from "lucide-react";

interface WatchData {
  battery: number;
  heartRate: number;
  spO2: number;
  temperature: number;
  steps: number;
  calories: number;
  distance: number;
  isConnected: boolean;
  isUnlocked: boolean;
  lastSync: Date;
  activeMode: string;
  currentTime: string;
  brightness: number;
  notifications: Notification[];
  isCharging: boolean;
}

interface Notification {
  id: string;
  type: 'call' | 'whatsapp' | 'sms' | 'health' | 'emergency';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
}

interface HealthMetrics {
  heartRate: number;
  spO2: number;
  temperature: number;
  confidence?: number;
  stressIndex?: number;
}

interface RealisticSmartWatchProps {
  onEmergencyTrigger: () => void;
  healthReadings: HealthMetrics;
  onQRGenerate?: () => void;
  onIncidentCreate?: (data: any) => void;
}

export const RealisticSmartWatch = ({ 
  onEmergencyTrigger, 
  healthReadings, 
  onQRGenerate, 
  onIncidentCreate 
}: RealisticSmartWatchProps) => {
  const [watchData, setWatchData] = useState<WatchData>({
    battery: 87,
    heartRate: healthReadings.heartRate || 72,
    spO2: healthReadings.spO2 || 98,
    temperature: healthReadings.temperature || 36.7,
    steps: 8432,
    calories: 312,
    distance: 6.2,
    isConnected: true,
    isUnlocked: false,
    lastSync: new Date(),
    activeMode: "Guardian Mode",
    currentTime: new Date().toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    }),
    brightness: 80,
    notifications: [],
    isCharging: false
  });

  const [selectedWatchFace, setSelectedWatchFace] = useState('guardian');
  const [isSOSActive, setIsSOSActive] = useState(false);
  const [fallDetected, setFallDetected] = useState(false);
  const [fallCountdown, setFallCountdown] = useState(0);
  const [currentScreen, setCurrentScreen] = useState<'home' | 'health' | 'settings' | 'notifications' | 'sos'>('home');
  const [voiceListening, setVoiceListening] = useState(false);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const lastInteraction = useRef(Date.now());

  const watchFaces = [
    { id: 'guardian', name: 'Guardian Digital', color: 'cyber-blue', style: 'digital' },
    { id: 'medical', name: 'Medical Analog', color: 'cyber-green', style: 'analog' },
    { id: 'neon', name: 'Neon Radar', color: 'cyber-purple', style: 'radar' },
    { id: 'rescue', name: 'Emergency Mode', color: 'cyber-red', style: 'emergency' }
  ];

  // Real-time clock updates
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setWatchData(prev => ({
        ...prev,
        currentTime: new Date().toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit'
        })
      }));
    }, 1000);

    return () => clearInterval(clockInterval);
  }, []);

  // Auto-lock after 30s inactivity
  useEffect(() => {
    const lockTimer = setInterval(() => {
      if (Date.now() - lastInteraction.current > 30000 && watchData.isUnlocked) {
        setWatchData(prev => ({ ...prev, isUnlocked: false }));
        setCurrentScreen('home');
      }
    }, 1000);

    return () => clearInterval(lockTimer);
  }, [watchData.isUnlocked]);

  // Health data updates
  useEffect(() => {
    const healthInterval = setInterval(() => {
      setWatchData(prev => ({
        ...prev,
        heartRate: healthReadings.heartRate || prev.heartRate,
        spO2: healthReadings.spO2 || prev.spO2,
        temperature: healthReadings.temperature || prev.temperature,
        steps: prev.steps + Math.floor(Math.random() * 8),
        calories: prev.calories + Math.floor(Math.random() * 2),
        distance: parseFloat((prev.distance + Math.random() * 0.01).toFixed(2)),
        lastSync: new Date(),
        battery: prev.isCharging 
          ? Math.min(100, prev.battery + 0.5)
          : Math.max(5, prev.battery - (Math.random() < 0.02 ? 0.5 : 0))
      }));
    }, 3000);

    return () => clearInterval(healthInterval);
  }, [healthReadings]);

  // Simulate notifications
  useEffect(() => {
    const notificationTypes = [
      { type: 'call', title: 'Incoming Call', message: 'Mom is calling...' },
      { type: 'whatsapp', title: 'WhatsApp', message: 'New message from Family Group' },
      { type: 'sms', title: 'SMS', message: 'Your appointment reminder' },
      { type: 'health', title: 'Health Alert', message: 'Time for your medication' }
    ];

    const notificationInterval = setInterval(() => {
      if (Math.random() < 0.1 && watchData.notifications.length < 3) {
        const notif = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
        const newNotification: Notification = {
          id: Date.now().toString(),
          type: notif.type as any,
          title: notif.title,
          message: notif.message,
          timestamp: new Date(),
          isRead: false
        };
        
        setWatchData(prev => ({
          ...prev,
          notifications: [newNotification, ...prev.notifications.slice(0, 2)]
        }));
        
        // Haptic feedback
        if (hapticEnabled && navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
      }
    }, 15000);

    return () => clearInterval(notificationInterval);
  }, [watchData.notifications.length, hapticEnabled]);

  // Fall detection simulation
  useEffect(() => {
    const handleDeviceMotion = (event: DeviceMotionEvent) => {
      if (event.accelerationIncludingGravity) {
        const { x = 0, y = 0, z = 0 } = event.accelerationIncludingGravity;
        const totalAcceleration = Math.sqrt(x * x + y * y + z * z);
        
        // Simulate fall detection (sudden acceleration change)
        if (totalAcceleration > 25 && !fallDetected) {
          triggerFallDetection();
        }
      }
    };

    // Request permission for motion sensors
    if (typeof DeviceMotionEvent !== 'undefined' && 'requestPermission' in DeviceMotionEvent) {
      (DeviceMotionEvent as any).requestPermission().then((response: string) => {
        if (response === 'granted') {
          window.addEventListener('devicemotion', handleDeviceMotion);
        }
      });
    } else {
      window.addEventListener('devicemotion', handleDeviceMotion);
    }

    return () => {
      window.removeEventListener('devicemotion', handleDeviceMotion);
    };
  }, [fallDetected]);

  // Fall detection countdown
  useEffect(() => {
    let countdownInterval: NodeJS.Timeout;
    
    if (fallDetected && fallCountdown > 0) {
      countdownInterval = setInterval(() => {
        setFallCountdown(prev => {
          if (prev <= 1) {
            // Auto-trigger SOS
            handleEmergencySOS();
            setFallDetected(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [fallDetected, fallCountdown]);

  const triggerFallDetection = () => {
    setFallDetected(true);
    setFallCountdown(10);
    
    // Strong haptic feedback
    if (hapticEnabled && navigator.vibrate) {
      navigator.vibrate([500, 200, 500, 200, 500]);
    }
  };

  const cancelFallDetection = () => {
    setFallDetected(false);
    setFallCountdown(0);
  };

  const updateInteraction = () => {
    lastInteraction.current = Date.now();
  };

  const handleUnlock = () => {
    updateInteraction();
    setWatchData(prev => ({ ...prev, isUnlocked: true }));
    
    if (hapticEnabled && navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  const handleEmergencySOS = () => {
    setIsSOSActive(true);
    setCurrentScreen('sos');
    updateInteraction();
    
    // Strong vibration for SOS
    if (hapticEnabled && navigator.vibrate) {
      navigator.vibrate([1000, 200, 1000, 200, 1000]);
    }

    // Create incident data
    const incidentData = {
      id: `INCIDENT_${Date.now()}`,
      type: 'emergency_sos',
      timestamp: new Date(),
      location: 'Kuwait City, Kuwait', // Would use real location
      vitals: {
        heartRate: watchData.heartRate,
        spO2: watchData.spO2,
        temperature: watchData.temperature,
        confidence: healthReadings.confidence || 85
      },
      triggerSource: fallDetected ? 'fall_detection' : 'manual_sos',
      deviceInfo: {
        battery: watchData.battery,
        connectivity: watchData.isConnected
      }
    };

    onEmergencyTrigger();
    onIncidentCreate?.(incidentData);
    
    // Auto-disable SOS after 60 seconds
    setTimeout(() => {
      setIsSOSActive(false);
      setCurrentScreen('home');
    }, 60000);
  };

  const handleVoiceCommand = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.log('Speech recognition not supported');
      return;
    }

    setVoiceListening(true);
    updateInteraction();
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const command = event.results[0][0].transcript.toLowerCase();
      
      if (command.includes('heart rate')) {
        // Show heart rate info
        setCurrentScreen('health');
      } else if (command.includes('sos') || command.includes('emergency')) {
        handleEmergencySOS();
      } else if (command.includes('battery')) {
        // Show battery info
      }
      
      setVoiceListening(false);
    };

    recognition.onerror = () => {
      setVoiceListening(false);
    };

    recognition.start();
  };

  const renderWatchFace = () => {
    const currentFace = watchFaces.find(f => f.id === selectedWatchFace) || watchFaces[0];
    const { heartRate, spO2, temperature } = watchData;
    
    // Always-on display mode when locked
    const isAlwaysOn = !watchData.isUnlocked;
    
    if (currentScreen === 'sos') {
      return (
        <div className="absolute inset-2 rounded-[2rem] bg-cyber-red/20 flex flex-col items-center justify-center text-white">
          <Shield className="w-12 h-12 text-cyber-red animate-pulse mb-2" />
          <div className="text-xl font-bold text-cyber-red">SOS ACTIVE</div>
          <div className="text-sm text-white/80">Emergency services contacted</div>
          {onQRGenerate && (
            <Button
              size="sm"
              className="mt-3 bg-white/20 text-white border-white/30"
              onClick={onQRGenerate}
            >
              Show Emergency QR
            </Button>
          )}
        </div>
      );
    }

    if (fallDetected) {
      return (
        <div className="absolute inset-2 rounded-[2rem] bg-cyber-orange/20 flex flex-col items-center justify-center text-white">
          <AlertTriangle className="w-10 h-10 text-cyber-orange animate-pulse mb-2" />
          <div className="text-lg font-bold text-cyber-orange">FALL DETECTED</div>
          <div className="text-xl font-bold text-white">{fallCountdown}s</div>
          <div className="text-xs text-white/80 text-center">
            Cancel within {fallCountdown}s or SOS will trigger
          </div>
          <Button
            size="sm"
            className="mt-2 bg-white/20 text-white"
            onClick={cancelFallDetection}
          >
            Cancel
          </Button>
        </div>
      );
    }

    if (currentScreen === 'health') {
      return (
        <div className="absolute inset-2 rounded-[2rem] bg-black flex flex-col items-center justify-center text-white p-2">
          <div className="text-xs text-cyber-green mb-2">HEALTH VITALS</div>
          <div className="grid grid-cols-1 gap-1 text-center">
            <div className="flex items-center justify-center gap-1">
              <Heart className="w-3 h-3 text-cyber-red" />
              <span className="text-sm font-bold">{heartRate}</span>
              <span className="text-xs">BPM</span>
            </div>
            <div className="flex items-center justify-center gap-1">
              <Droplets className="w-3 h-3 text-cyber-blue" />
              <span className="text-sm font-bold">{spO2}%</span>
              <span className="text-xs">SpO₂</span>
            </div>
            <div className="flex items-center justify-center gap-1">
              <Activity className="w-3 h-3 text-cyber-orange" />
              <span className="text-sm font-bold">{temperature}°C</span>
            </div>
          </div>
          <Button
            size="sm"
            className="mt-2 bg-white/20 text-white text-xs"
            onClick={() => setCurrentScreen('home')}
          >
            Back
          </Button>
        </div>
      );
    }

    if (currentScreen === 'notifications') {
      return (
        <div className="absolute inset-2 rounded-[2rem] bg-black flex flex-col items-center justify-center text-white p-2">
          <div className="text-xs text-cyber-blue mb-2">NOTIFICATIONS</div>
          <div className="space-y-1 w-full">
            {watchData.notifications.slice(0, 2).map(notif => (
              <div key={notif.id} className="bg-white/10 rounded p-1 text-xs">
                <div className="font-bold text-cyber-blue">{notif.title}</div>
                <div className="text-white/80 truncate">{notif.message}</div>
              </div>
            ))}
            {watchData.notifications.length === 0 && (
              <div className="text-xs text-white/60">No notifications</div>
            )}
          </div>
          <Button
            size="sm"
            className="mt-2 bg-white/20 text-white text-xs"
            onClick={() => setCurrentScreen('home')}
          >
            Back
          </Button>
        </div>
      );
    }

    // Default home screen with selected watch face
    const dimmed = isAlwaysOn ? 'opacity-60' : 'opacity-100';
    
    switch (currentFace.style) {
      case 'analog':
        return (
          <div className={cn("absolute inset-2 rounded-[2rem] bg-black flex flex-col items-center justify-center text-white", dimmed)}>
            {/* Analog Watch Face */}
            <div className="relative w-20 h-20 rounded-full border border-gray-600">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className={cn("text-lg font-bold", `text-${currentFace.color}`)}>
                    {new Date().getHours()}:{String(new Date().getMinutes()).padStart(2, '0')}
                  </div>
                  <Heart className={cn("w-4 h-4 mx-auto", `text-${currentFace.color}`)} />
                  <div className="text-xs">{heartRate}</div>
                </div>
              </div>
            </div>
            {!isAlwaysOn && (
              <div className="text-xs text-white/60 mt-1">Medical Mode</div>
            )}
          </div>
        );
        
      case 'radar':
        return (
          <div className={cn("absolute inset-2 rounded-[2rem] bg-black flex flex-col items-center justify-center text-white", dimmed)}>
            {/* Neon Radar Face */}
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-cyber-purple animate-pulse flex items-center justify-center">
                <div className="text-center">
                  <div className="text-sm font-bold text-cyber-purple font-mono">
                    {watchData.currentTime.slice(0, 5)}
                  </div>
                  <div className="text-xs text-cyber-purple">{heartRate} BPM</div>
                </div>
              </div>
              {!isAlwaysOn && (
                <div className="absolute -inset-2 rounded-full border border-cyber-purple/30 animate-ping" />
              )}
            </div>
          </div>
        );
        
      case 'emergency':
        return (
          <div className={cn("absolute inset-2 rounded-[2rem] bg-black flex flex-col items-center justify-center text-white", dimmed)}>
            {/* Emergency Mode Face */}
            <div className="text-center">
              <Shield className="w-8 h-8 mx-auto text-cyber-red mb-1" />
              <div className="text-sm font-bold text-cyber-red font-mono">
                {watchData.currentTime}
              </div>
              <div className="text-xs text-white/80">RESCUE MODE</div>
              {!isAlwaysOn && (
                <div className="mt-1">
                  <div className="text-xs text-cyber-red">{heartRate} BPM</div>
                  <div className="text-xs text-cyber-blue">{spO2}% O₂</div>
                </div>
              )}
            </div>
          </div>
        );
        
      default: // Digital Guardian
        return (
          <div className={cn("absolute inset-2 rounded-[2rem] bg-black flex flex-col items-center justify-center text-white", dimmed)}>
            {/* Time Display */}
            <div className="text-center mb-2">
              <div className="text-lg font-bold font-mono text-cyber-blue">
                {watchData.currentTime}
              </div>
              <div className="text-xs text-white/60">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </div>
            </div>

            {/* Health Ring - Only show when unlocked or always-on with basic info */}
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-gray-700 flex items-center justify-center">
                <div className="text-center">
                  <Heart className="w-4 h-4 mx-auto mb-1 text-cyber-red" />
                  <div className="text-sm font-bold">{heartRate}</div>
                  {!isAlwaysOn && <div className="text-xs text-white/60">BPM</div>}
                </div>
              </div>
              
              {/* Pulse animation */}
              {watchData.isConnected && (
                <div className="absolute inset-0 rounded-full border-2 border-cyber-blue animate-ping opacity-30" />
              )}
            </div>

            {/* Bottom status - only when unlocked */}
            {!isAlwaysOn && (
              <div className="absolute bottom-2 left-0 right-0 flex justify-between items-center px-3">
                <div className="flex items-center space-x-1">
                  <Battery className={cn("w-3 h-3", getBatteryColor(watchData.battery))} />
                  <span className={cn("text-xs", getBatteryColor(watchData.battery))}>
                    {watchData.battery}%
                  </span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <Bluetooth className={cn("w-3 h-3", watchData.isConnected ? "text-cyber-blue" : "text-gray-500")} />
                  {watchData.notifications.length > 0 && (
                    <div className="w-2 h-2 bg-cyber-orange rounded-full" />
                  )}
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  const getBatteryColor = (battery: number) => {
    if (battery > 50) return 'text-cyber-green';
    if (battery > 20) return 'text-cyber-orange';
    return 'text-cyber-red';
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Connection Status */}
      <Card className="p-4 bg-[var(--gradient-card)] border-cyber-blue/20">
        <div className="flex items-center justify-between">
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
              <h3 className="font-bold font-poppins text-foreground">LifeLine Watch Pro</h3>
              <p className="text-xs text-muted-foreground">
                Guardian Series 5 • {watchData.isCharging ? 'Charging' : `${watchData.battery}%`}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-end space-y-1">
            <Badge className={cn(
              "font-poppins text-xs",
              watchData.isConnected ? "bg-cyber-green text-black" : "bg-cyber-red text-white"
            )}>
              {watchData.isUnlocked ? 'Unlocked' : 'Locked'}
            </Badge>
            <div className="text-xs text-muted-foreground">
              {watchData.lastSync.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </Card>

      {/* Realistic Watch Display */}
      <Card className="p-6 bg-[var(--gradient-card)] border-cyber-blue/20">
        <div className="text-center mb-4">
          <h3 className="font-bold font-poppins text-foreground">Live Watch Display</h3>
          <p className="text-xs text-muted-foreground">
            {watchData.isUnlocked ? 'Interactive Mode' : 'Always-On Display'}
          </p>
        </div>
        
        {/* Watch Container */}
        <div className="relative w-80 h-80 mx-auto">
          {/* Watch Frame */}
          <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-br from-gray-700 via-gray-800 to-black border-4 border-gray-600 shadow-2xl">
            {/* Charging indicator */}
            {watchData.isCharging && (
              <div className="absolute -inset-1 rounded-[3.2rem] border-2 border-cyber-blue animate-pulse" />
            )}
            
            {/* Screen Bezel */}
            <div className="absolute inset-3 rounded-[2.5rem] bg-gradient-to-br from-gray-900 to-black border border-gray-700 overflow-hidden">
              {/* OLED Screen */}
              <div 
                className="absolute inset-2 rounded-[2rem] bg-black overflow-hidden cursor-pointer"
                style={{ filter: `brightness(${watchData.brightness}%)` }}
                onClick={watchData.isUnlocked ? updateInteraction : handleUnlock}
              >
                {renderWatchFace()}
                
                {/* Unlock indicator */}
                {!watchData.isUnlocked && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <ChevronUp className="w-6 h-6 text-white/40 animate-bounce" />
                    <div className="text-xs text-white/40 mt-1">Swipe up</div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Digital Crown */}
          <div 
            className="absolute right-0 top-1/3 w-6 h-12 bg-gradient-to-r from-gray-600 to-gray-500 rounded-r-lg shadow-lg cursor-pointer hover:bg-gray-500 transition-colors"
            onClick={handleVoiceCommand}
          >
            {voiceListening && (
              <div className="absolute inset-0 bg-cyber-blue/50 rounded-r-lg animate-pulse" />
            )}
          </div>
          
          {/* Side Button */}
          <div 
            className="absolute right-0 top-1/2 transform translate-y-2 w-4 h-8 bg-gradient-to-r from-gray-700 to-gray-600 rounded-r shadow-md cursor-pointer"
            onClick={() => {
              if (watchData.isUnlocked) {
                setCurrentScreen(currentScreen === 'home' ? 'health' : 'home');
                updateInteraction();
              }
            }}
          />
        </div>

        {/* Watch Controls */}
        <div className="mt-6 grid grid-cols-4 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setCurrentScreen('health');
              updateInteraction();
            }}
            disabled={!watchData.isUnlocked}
            className="text-xs"
          >
            <Heart className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setCurrentScreen('notifications');
              updateInteraction();
            }}
            disabled={!watchData.isUnlocked}
            className="text-xs"
          >
            <MessageCircle className="w-4 h-4" />
            {watchData.notifications.length > 0 && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyber-orange rounded-full text-xs flex items-center justify-center text-white">
                {watchData.notifications.length}
              </div>
            )}
          </Button>
          <Button
            size="sm"
            onClick={() => setWatchData(prev => ({ ...prev, isCharging: !prev.isCharging }))}
            className={cn(
              "text-xs",
              watchData.isCharging ? "bg-cyber-blue text-white" : "bg-gray-600 text-white"
            )}
          >
            <Zap className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            onClick={handleEmergencySOS}
            className="bg-cyber-red text-white text-xs"
          >
            <Shield className="w-4 h-4" />
          </Button>
        </div>

        {/* Brightness Control */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Screen Brightness</span>
            <span className="text-foreground">{watchData.brightness}%</span>
          </div>
          <Slider
            value={[watchData.brightness]}
            onValueChange={([value]) => {
              setWatchData(prev => ({ ...prev, brightness: value }));
              updateInteraction();
            }}
            max={100}
            min={20}
            step={10}
            className="w-full"
          />
        </div>
      </Card>

      {/* Watch Faces Selection */}
      <Card className="p-4 bg-[var(--gradient-card)] border-cyber-blue/20">
        <h3 className="font-bold font-poppins text-foreground mb-3">
          Advanced Watch Faces
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
              onClick={() => {
                setSelectedWatchFace(face.id);
                updateInteraction();
              }}
            >
              <div className={cn("text-lg mb-1", `text-${face.color}`)}>
                {face.style === 'digital' && '⌚'}
                {face.style === 'analog' && '🩺'}
                {face.style === 'radar' && '📡'}
                {face.style === 'emergency' && '🚨'}
              </div>
              <span className="text-xs">{face.name}</span>
            </Button>
          ))}
        </div>
      </Card>

      {/* Health Stats Grid */}
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
                <div className="text-xs text-muted-foreground">Steps Today</div>
              </div>
            </div>
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
                <div className="text-xs text-muted-foreground">Calories</div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-[var(--gradient-card)] border-cyber-blue/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-full bg-cyber-red/20">
                <Heart className="w-6 h-6 text-cyber-red" />
              </div>
              <div>
                <div className="text-2xl font-bold font-poppins text-foreground">
                  {watchData.heartRate}
                </div>
                <div className="text-xs text-muted-foreground">Heart Rate</div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-[var(--gradient-card)] border-cyber-blue/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-full bg-cyber-green/20">
                <Droplets className="w-6 h-6 text-cyber-green" />
              </div>
              <div>
                <div className="text-2xl font-bold font-poppins text-foreground">
                  {watchData.spO2}%
                </div>
                <div className="text-xs text-muted-foreground">Blood Oxygen</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Emergency & Medical Features */}
      <Card className="p-4 bg-[var(--gradient-card)] border-cyber-red/20">
        <h3 className="font-bold font-poppins text-foreground mb-3 flex items-center">
          <Shield className="w-5 h-5 mr-2 text-cyber-red" />
          Emergency Features
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-cyber-red/10 border border-cyber-red/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-cyber-red rounded-full animate-pulse" />
              <span className="text-sm font-medium">Fall Detection</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Auto-triggers SOS in 10s
            </div>
          </div>
          
          <div className="p-3 bg-cyber-blue/10 border border-cyber-blue/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-cyber-blue rounded-full" />
              <span className="text-sm font-medium">Heart Monitor</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              24/7 real-time tracking
            </div>
          </div>
          
          <div className="p-3 bg-cyber-green/10 border border-cyber-green/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-cyber-green rounded-full" />
              <span className="text-sm font-medium">Voice Commands</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Long-press crown to activate
            </div>
          </div>
          
          <div className="p-3 bg-cyber-purple/10 border border-cyber-purple/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-cyber-purple rounded-full" />
              <span className="text-sm font-medium">Emergency QR</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Instant medical info sharing
            </div>
          </div>
        </div>
      </Card>

      {/* Advanced Controls */}
      <div className="grid grid-cols-2 gap-4">
        <Button
          size="lg"
          onClick={() => {
            if (onQRGenerate) onQRGenerate();
            updateInteraction();
          }}
          className="h-16 bg-[var(--gradient-primary)] text-white font-poppins"
        >
          <Smartphone className="w-6 h-6 mr-2" />
          Generate QR
        </Button>
        
        <Button
          size="lg"
          onClick={() => {
            setWatchData(prev => ({ 
              ...prev, 
              lastSync: new Date(),
              notifications: []
            }));
            updateInteraction();
          }}
          className="h-16 bg-cyber-blue text-white font-poppins"
        >
          <RotateCcw className="w-6 h-6 mr-2" />
          Sync Data
        </Button>
      </div>
    </div>
  );
};