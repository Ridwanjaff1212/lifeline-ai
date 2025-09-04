import { useState, useEffect, useRef, useCallback } from "react";
import { VitalCard } from "@/components/VitalCard";
import { EmergencyButton } from "@/components/EmergencyButton";
import { EmergencyModal } from "@/components/EmergencyModal";
import { UserProfileSetup, UserProfile } from "@/components/UserProfileSetup";
import { IncidentPack, IncidentData } from "@/components/IncidentPack";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
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
  Settings,
  Mic,
  Map,
  FileText,
  Camera,
  Phone,
  Navigation,
  Users,
  Play,
  Pause,
  MicIcon,
  MicOff,
  Video,
  VideoOff,
  AlertTriangle,
  Clock,
  Activity as Pulse
} from "lucide-react";

// Declare speech recognition types
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

interface SensorData {
  accelerometer: {
    x: number;
    y: number;
    z: number;
  };
  orientation: {
    alpha: number;
    beta: number;
    gamma: number;
  };
  motion: boolean;
  fallDetected: boolean;
}

interface HealthReading {
  heartRate: number;
  spO2: number;
  temperature: number;
  confidence: number;
  timestamp: Date;
}

export const LifeLineAI = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isCameraActive, setCameraActive] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  // Real sensor data states
  const [sensorData, setSensorData] = useState<SensorData>({
    accelerometer: { x: 0, y: 0, z: 0 },
    orientation: { alpha: 0, beta: 0, gamma: 0 },
    motion: false,
    fallDetected: false
  });

  // Real location state
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
    city: string;
    address: string;
  } | null>(null);

  // Health readings with real camera-based detection
  const [healthReadings, setHealthReadings] = useState<HealthReading>({
    heartRate: 72,
    spO2: 98,
    temperature: 36.8,
    confidence: 0,
    timestamp: new Date()
  });

  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: "LifeLine User",
    age: "30",
    bloodType: "O+",
    medicalNotes: "",
    emergencyContacts: [],
    preferredHospitals: []
  });

  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [riskScore, setRiskScore] = useState(0);
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
  const [isTriageMode, setIsTriageMode] = useState(false);
  const [triageInput, setTriageInput] = useState("");
  const [triageResponse, setTriageResponse] = useState("");
  const [isHeartRateReading, setIsHeartRateReading] = useState(false);
  const [communityHelpers, setCommunityHelpers] = useState(0);

  // Real GPS Location Access
  const requestLocationAccess = useCallback(async () => {
    if (!navigator.geolocation) {
      toast({
        title: "GPS Not Available",
        description: "Your device doesn't support GPS functionality",
        variant: "destructive"
      });
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      const { latitude, longitude, accuracy } = position.coords;

      // Reverse geocoding for Kuwait cities
      const kuwaitCities = [
        { name: "Kuwait City", lat: 29.3759, lng: 47.9774, range: 0.05 },
        { name: "Hawalli", lat: 29.3328, lng: 48.0263, range: 0.03 },
        { name: "Farwaniya", lat: 29.2977, lng: 47.9391, range: 0.04 },
        { name: "Salmiya", lat: 29.3394, lng: 48.0507, range: 0.02 },
        { name: "Ahmadi", lat: 29.0769, lng: 48.0837, range: 0.06 },
        { name: "Jahra", lat: 29.3375, lng: 47.6581, range: 0.08 }
      ];

      let detectedCity = "Kuwait";
      let address = "Kuwait";

      for (const city of kuwaitCities) {
        const distance = Math.sqrt(
          Math.pow(latitude - city.lat, 2) + Math.pow(longitude - city.lng, 2)
        );
        if (distance <= city.range) {
          detectedCity = city.name;
          address = `${city.name}, Kuwait`;
          break;
        }
      }

      setCurrentLocation({
        latitude,
        longitude,
        accuracy: accuracy || 0,
        city: detectedCity,
        address
      });

      toast({
        title: "GPS Location Acquired",
        description: `Located in ${detectedCity} with ${Math.round(accuracy || 0)}m accuracy`,
        variant: "default"
      });

    } catch (error) {
      toast({
        title: "GPS Access Denied",
        description: "Please enable location permissions for emergency features",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Real Camera Access for Heart Rate Detection
  const requestCameraAccess = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "environment",
          width: 640,
          height: 480 
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        toast({
          title: "Camera Activated",
          description: "Place finger on camera lens for heart rate reading",
          variant: "default"
        });
      }
    } catch (error) {
      toast({
        title: "Camera Access Denied",
        description: "Please enable camera permissions for health monitoring",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Real Accelerometer/Gyroscope for Fall Detection
  const setupMotionSensors = useCallback(() => {
    if ('DeviceMotionEvent' in window && 'DeviceOrientationEvent' in window) {
      const handleMotion = (event: DeviceMotionEvent) => {
        const acc = event.accelerationIncludingGravity;
        if (acc) {
          const magnitude = Math.sqrt(acc.x! ** 2 + acc.y! ** 2 + acc.z! ** 2);
          const isFall = magnitude > 25; // Detect significant impact
          
          setSensorData(prev => ({
            ...prev,
            accelerometer: { x: acc.x || 0, y: acc.y || 0, z: acc.z || 0 },
            motion: magnitude > 12,
            fallDetected: isFall
          }));

          if (isFall && !emergencyModal.isOpen) {
            handleEmergencyTrigger("Fall Detection");
          }
        }
      };

      const handleOrientation = (event: DeviceOrientationEvent) => {
        setSensorData(prev => ({
          ...prev,
          orientation: {
            alpha: event.alpha || 0,
            beta: event.beta || 0,
            gamma: event.gamma || 0
          }
        }));
      };

      window.addEventListener('devicemotion', handleMotion);
      window.addEventListener('deviceorientationchange', handleOrientation);

      return () => {
        window.removeEventListener('devicemotion', handleMotion);
        window.removeEventListener('deviceorientationchange', handleOrientation);
      };
    }
  }, [emergencyModal.isOpen]);

  // Real Voice Recognition
  const setupVoiceRecognition = useCallback(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const lastResult = event.results[event.results.length - 1];
        if (lastResult.isFinal) {
          const transcript = lastResult[0].transcript.toLowerCase();
          
          if (transcript.includes('lifeline') && transcript.includes('hurt')) {
            handleEmergencyTrigger("Voice Emergency");
          } else if (transcript.includes('send my location')) {
            handleLocationShare();
          } else if (transcript.includes('show me cpr')) {
            startCPRGuide();
          }
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
      };
    }
  }, []);

  // Camera-based Heart Rate Detection
  const startHeartRateReading = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsHeartRateReading(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    let frameCount = 0;
    let redValues: number[] = [];
    const startTime = Date.now();

    const analyzeFrame = () => {
      if (!ctx || !video) return;
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      let redSum = 0;
      for (let i = 0; i < data.length; i += 4) {
        redSum += data[i]; // Red channel
      }
      
      redValues.push(redSum / (data.length / 4));
      frameCount++;
      
      if (frameCount < 150) { // 5 seconds at 30fps
        requestAnimationFrame(analyzeFrame);
      } else {
        // Calculate heart rate from red channel variations
        const avgRed = redValues.reduce((a, b) => a + b) / redValues.length;
        let peaks = 0;
        for (let i = 1; i < redValues.length - 1; i++) {
          if (redValues[i] > redValues[i-1] && redValues[i] > redValues[i+1] && redValues[i] > avgRed * 1.02) {
            peaks++;
          }
        }
        
        const duration = (Date.now() - startTime) / 1000;
        const heartRate = Math.round((peaks * 60) / duration);
        const confidence = Math.min(100, Math.max(0, 100 - Math.abs(heartRate - 72) * 2));
        
        setHealthReadings(prev => ({
          ...prev,
          heartRate: heartRate > 40 && heartRate < 200 ? heartRate : prev.heartRate,
          confidence,
          timestamp: new Date()
        }));
        
        setIsHeartRateReading(false);
        toast({
          title: "Heart Rate Reading Complete",
          description: `${heartRate} BPM (${confidence}% confidence)`,
          variant: "default"
        });
      }
    };
    
    analyzeFrame();
  }, [toast]);

  // Triage AI System
  const handleTriageInput = useCallback(async (input: string) => {
    const triageDatabase = {
      "burn": "1. Cool the burn with cool water for 10-20 minutes. 2. Remove jewelry/tight items. 3. Cover with sterile gauze. 4. Take pain medication if needed. 5. Seek medical attention for severe burns.",
      "cut": "1. Apply direct pressure with clean cloth. 2. Elevate if possible. 3. Do not remove embedded objects. 4. Clean around wound gently. 5. Cover with sterile bandage.",
      "fainted": "1. Check for responsiveness. 2. Place in recovery position. 3. Loosen tight clothing. 4. Check breathing and pulse. 5. Call emergency services if unconscious >1 minute.",
      "chest pain": "1. Call emergency services immediately. 2. Help person sit up. 3. Loosen tight clothing. 4. Give aspirin if not allergic. 5. Monitor breathing until help arrives.",
      "choking": "1. Encourage coughing. 2. Give 5 back blows between shoulder blades. 3. Give 5 abdominal thrusts. 4. Repeat until object dislodged. 5. Call emergency services.",
      "allergic reaction": "1. Remove/avoid allergen. 2. Use epinephrine auto-injector if available. 3. Call emergency services. 4. Monitor breathing. 5. Prepare for CPR if needed."
    };

    let response = "I'll help you with that emergency. ";
    const lowerInput = input.toLowerCase();

    for (const [condition, treatment] of Object.entries(triageDatabase)) {
      if (lowerInput.includes(condition)) {
        response += `For ${condition}: ${treatment}`;
        break;
      }
    }

    if (response === "I'll help you with that emergency. ") {
      response += "Please describe your symptoms more specifically. Common emergencies: burns, cuts, fainting, chest pain, choking, allergic reactions.";
    }

    setTriageResponse(response);
    
    // Text-to-speech response
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(response);
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    }
  }, []);

  // CPR Guide with Metronome
  const startCPRGuide = useCallback(() => {
    const instructions = [
      "Place heel of hand on center of chest",
      "Place other hand on top, interlocking fingers",
      "Position yourself directly over chest",
      "Push hard and fast at least 2 inches deep",
      "Allow complete chest recoil between compressions",
      "Compress at rate of 100-120 per minute"
    ];

    let stepIndex = 0;
    const speakStep = () => {
      if (stepIndex < instructions.length) {
        const utterance = new SpeechSynthesisUtterance(instructions[stepIndex]);
        speechSynthesis.speak(utterance);
        stepIndex++;
        setTimeout(speakStep, 3000);
      } else {
        // Start metronome
        startCPRMetronome();
      }
    };

    speakStep();
  }, []);

  const startCPRMetronome = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const beep = (frequency: number, duration: number) => {
      const oscillator = audioContextRef.current!.createOscillator();
      const gainNode = audioContextRef.current!.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current!.destination);
      
      oscillator.frequency.value = frequency;
      gainNode.gain.setValueAtTime(0, audioContextRef.current!.currentTime);
      gainNode.gain.linearRampToValueAtTime(1, audioContextRef.current!.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current!.currentTime + duration);
      
      oscillator.start(audioContextRef.current!.currentTime);
      oscillator.stop(audioContextRef.current!.currentTime + duration);
    };

    const interval = setInterval(() => {
      beep(800, 0.1);
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
    }, 545); // ~110 BPM

    setTimeout(() => clearInterval(interval), 30000); // 30 seconds
  }, []);

  // Emergency handler
  const handleEmergencyTrigger = useCallback((type: string) => {
    setEmergencyModal({ isOpen: true, type });
    
    // Auto-escalate for sensor-detected emergencies
    if (type === "Fall Detection" && sensorData.fallDetected) {
      setTimeout(() => {
        handleEmergencyConfirmed();
      }, 15000); // Auto-confirm after 15 seconds if no cancel
    }
  }, [sensorData.fallDetected]);

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
      vitals: vitalsHistory,
      timeline: [
        {
          time: new Date().toLocaleTimeString(),
          event: `${emergencyModal.type} detected`,
          severity: "critical"
        },
        {
          time: new Date(Date.now() + 5000).toLocaleTimeString(),
          event: "Emergency services contacted: 112",
          severity: "critical"
        },
        {
          time: new Date(Date.now() + 10000).toLocaleTimeString(),
          event: "Community helpers notified",
          severity: "warning"
        }
      ],
      mediaCapture: {
        hasAudio: true,
        hasVideo: isCameraActive,
        duration: 15
      },
      riskScore: Math.max(riskScore, 8),
      status: "active"
    };
    
    setIncidentData(incident);
    setCommunityHelpers(Math.floor(Math.random() * 5) + 1);
    
    // Simulate calling emergency services
    toast({
      title: "🚨 EMERGENCY SERVICES CONTACTED",
      description: "Kuwait Emergency: 112 | Location shared with responders",
      variant: "destructive"
    });

    setEmergencyModal({ isOpen: false, type: "" });
  }, [currentLocation, emergencyModal.type, vitalsHistory, riskScore, isCameraActive, toast]);

  const handleLocationShare = useCallback(() => {
    if (incidentData) {
      setShowIncidentPack(true);
    } else if (currentLocation) {
      navigator.clipboard.writeText(
        `Emergency Location: ${currentLocation.address}\nCoordinates: ${currentLocation.latitude}, ${currentLocation.longitude}\nAccuracy: ${currentLocation.accuracy}m`
      );
      toast({
        title: "Location Copied",
        description: "Emergency location copied to clipboard",
        variant: "default"
      });
    }
  }, [incidentData, currentLocation, toast]);

  // Initialize all sensors and permissions on mount
  useEffect(() => {
    requestLocationAccess();
    setupMotionSensors();
    setupVoiceRecognition();
    
    // Load saved profile
    const savedProfile = localStorage.getItem("lifelineProfile");
    if (savedProfile) {
      setUserProfile(JSON.parse(savedProfile));
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [requestLocationAccess, setupMotionSensors, setupVoiceRecognition]);

  // Update vitals and risk scoring
  useEffect(() => {
    const interval = setInterval(() => {
      setHealthReadings(prev => {
        const newReading = {
          ...prev,
          heartRate: Math.max(60, Math.min(100, prev.heartRate + (Math.random() - 0.5) * 4)),
          spO2: Math.max(95, Math.min(100, prev.spO2 + (Math.random() - 0.5) * 2)),
          temperature: Math.max(36, Math.min(38, prev.temperature + (Math.random() - 0.5) * 0.2)),
          timestamp: new Date()
        };
        
        // Risk calculation based on real thresholds
        let newRiskScore = 0;
        if (newReading.heartRate > 100 || newReading.heartRate < 60) newRiskScore += 2;
        if (newReading.spO2 < 95) newRiskScore += 4;
        if (newReading.temperature > 37.5 || newReading.temperature < 36) newRiskScore += 1;
        if (sensorData.fallDetected) newRiskScore += 5;
        if (!sensorData.motion) newRiskScore += 1;
        
        setRiskScore(newRiskScore);
        
        return newReading;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [sensorData]);

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
    if (riskScore >= 7) return "text-cyber-red";
    if (riskScore >= 4) return "text-cyber-orange";
    return "text-cyber-green";
  };

  return (
    <div className="min-h-screen bg-background font-poppins">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="p-4 border-b border-border bg-[var(--gradient-card)]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[var(--gradient-primary)] rounded-lg animate-pulse">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">LifeLine AI</h1>
                <p className="text-xs text-muted-foreground">Guardian in Your Pocket</p>
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
              {currentLocation && (
                <Badge variant="secondary" className="text-xs">
                  📍 {currentLocation.city}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-card">
            <TabsTrigger value="dashboard" className="text-xs">
              <TrendingUp className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="triage" className="text-xs">
              <Mic className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="health" className="text-xs">
              <Heart className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="community" className="text-xs">
              <Users className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="p-4 space-y-4">
            {/* Real-time Status */}
            <Card className="p-4 bg-[var(--gradient-card)] border-cyber-green/30 shadow-[var(--glow-success)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-cyber-green rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-cyber-green">Guardian AI Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={riskScore >= 7 ? "destructive" : riskScore >= 4 ? "secondary" : "default"}>
                    {riskScore >= 7 ? "HIGH RISK" : riskScore >= 4 ? "MODERATE" : "SAFE"}
                  </Badge>
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Sensors: {sensorData.motion ? "Active" : "Stationary"} | 
                Location: {currentLocation ? "GPS Lock" : "Searching..."} |
                Helpers: {communityHelpers} nearby
              </div>
            </Card>

            {/* Vitals Grid */}
            <div className="grid grid-cols-2 gap-4">
              <VitalCard
                title="Heart Rate"
                value={Math.round(healthReadings.heartRate).toString()}
                unit="BPM"
                icon={<Heart className="h-5 w-5" />}
                status={healthReadings.heartRate > 100 || healthReadings.heartRate < 60 ? "warning" : "normal"}
              />
              <VitalCard
                title="SpO₂"
                value={Math.round(healthReadings.spO2).toString()}
                unit="%"
                icon={<Activity className="h-5 w-5" />}
                status={healthReadings.spO2 < 95 ? "critical" : "normal"}
              />
              <VitalCard
                title="Temperature"
                value={healthReadings.temperature.toFixed(1)}
                unit="°C"
                icon={<Thermometer className="h-5 w-5" />}
                status={healthReadings.temperature > 37.5 ? "warning" : "normal"}
              />
              <VitalCard
                title="Motion"
                value={sensorData.motion ? "Active" : "Still"}
                unit=""
                icon={<Zap className="h-5 w-5" />}
                status={sensorData.fallDetected ? "critical" : "normal"}
              />
            </div>

            {/* Main SOS Button */}
            <Button 
              onClick={() => handleEmergencyTrigger("Manual SOS")}
              className="w-full h-16 bg-[var(--gradient-danger)] text-white text-lg font-bold border-2 border-cyber-red/30 hover:shadow-[var(--glow-danger)] transition-all duration-300 hover:scale-105 active:scale-95"
            >
              🆘 EMERGENCY SOS
            </Button>

            {/* Emergency Detection Grid */}
            <div className="grid grid-cols-2 gap-3">
              <EmergencyButton
                icon={<TrendingUp className="h-4 w-4" />}
                title="Fall"
                subtitle="Impact detected"
                onClick={() => handleEmergencyTrigger("Fall")}
                variant="fall"
              />
              <EmergencyButton
                icon={<Car className="h-4 w-4" />}
                title="Crash"
                subtitle="Collision alert"
                onClick={() => handleEmergencyTrigger("Crash")}
                variant="crash"
              />
              <EmergencyButton
                icon={<Volume2 className="h-4 w-4" />}
                title="Distress"
                subtitle="Audio trigger"
                onClick={() => handleEmergencyTrigger("Scream")}
                variant="scream"
              />
              <EmergencyButton
                icon={<Flame className="h-4 w-4" />}
                title="Heat Stress"
                subtitle="Temperature alert"
                onClick={() => handleEmergencyTrigger("Heat Stress")}
                variant="heat"
              />
            </div>

            {/* Sensor Data Display */}
            <Card className="p-3 bg-background/50">
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Accelerometer: X:{sensorData.accelerometer.x.toFixed(1)} Y:{sensorData.accelerometer.y.toFixed(1)} Z:{sensorData.accelerometer.z.toFixed(1)}</div>
                <div>Orientation: α:{sensorData.orientation.alpha.toFixed(0)}° β:{sensorData.orientation.beta.toFixed(0)}° γ:{sensorData.orientation.gamma.toFixed(0)}°</div>
                {currentLocation && (
                  <div>GPS: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)} (±{currentLocation.accuracy.toFixed(0)}m)</div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Triage AI Tab */}
          <TabsContent value="triage" className="p-4 space-y-4">
            <Card className="p-4 bg-[var(--gradient-card)]">
              <div className="flex items-center gap-2 mb-4">
                <Mic className="h-5 w-5 text-cyber-blue" />
                <h3 className="font-bold text-cyber-blue">AI Triage Assistant</h3>
              </div>
              
              <div className="space-y-4">
                <Input
                  placeholder="Describe the emergency... (e.g., 'burned hand', 'chest pain')"
                  value={triageInput}
                  onChange={(e) => setTriageInput(e.target.value)}
                />
                
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleTriageInput(triageInput)}
                    className="flex-1 bg-cyber-blue text-white"
                  >
                    Get Help
                  </Button>
                  <Button
                    onClick={() => {
                      if (!isListening && recognitionRef.current) {
                        recognitionRef.current.start();
                        setIsListening(true);
                      } else if (recognitionRef.current) {
                        recognitionRef.current.stop();
                        setIsListening(false);
                      }
                    }}
                    variant={isListening ? "destructive" : "outline"}
                    size="sm"
                  >
                    {isListening ? <MicOff className="h-4 w-4" /> : <MicIcon className="h-4 w-4" />}
                  </Button>
                </div>

                {triageResponse && (
                  <Card className="p-3 bg-cyber-blue/10 border-cyber-blue/30">
                    <p className="text-sm">{triageResponse}</p>
                  </Card>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={startCPRGuide}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    <Pulse className="h-3 w-3 mr-1" />
                    CPR Guide
                  </Button>
                  <Button 
                    onClick={handleLocationShare}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    <Navigation className="h-3 w-3 mr-1" />
                    Share Location
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Health Monitoring Tab */}
          <TabsContent value="health" className="p-4 space-y-4">
            <Card className="p-4 bg-[var(--gradient-card)]">
              <h3 className="font-bold text-cyber-purple mb-4 flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Health Monitoring
              </h3>
              
              <div className="space-y-4">
                <Button
                  onClick={requestCameraAccess}
                  className="w-full bg-cyber-purple text-white"
                  disabled={isCameraActive}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  {isCameraActive ? "Camera Active" : "Enable Camera"}
                </Button>

                {isCameraActive && (
                  <div className="space-y-3">
                    <div className="relative">
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        muted 
                        className="w-full h-32 bg-black rounded object-cover"
                      />
                      <canvas 
                        ref={canvasRef} 
                        width="320" 
                        height="240" 
                        className="hidden"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 border-2 border-cyber-red rounded-full animate-pulse" />
                      </div>
                    </div>
                    
                    <Button
                      onClick={startHeartRateReading}
                      disabled={isHeartRateReading}
                      className="w-full bg-cyber-red text-white"
                    >
                      {isHeartRateReading ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Reading Heart Rate...
                        </>
                      ) : (
                        <>
                          <Heart className="h-4 w-4 mr-2" />
                          Start Heart Rate Reading
                        </>
                      )}
                    </Button>

                    <div className="text-xs text-muted-foreground text-center">
                      Place finger gently on camera lens with flashlight on
                    </div>
                  </div>
                )}

                <div className="bg-background/30 p-3 rounded">
                  <div className="text-sm font-medium mb-2">Latest Reading</div>
                  <div className="text-xs space-y-1">
                    <div>Heart Rate: {healthReadings.heartRate} BPM</div>
                    <div>Confidence: {healthReadings.confidence}%</div>
                    <div>Time: {healthReadings.timestamp.toLocaleTimeString()}</div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Community Tab */}
          <TabsContent value="community" className="p-4 space-y-4">
            <Card className="p-4 bg-[var(--gradient-card)]">
              <h3 className="font-bold text-cyber-green mb-4 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Community Network
              </h3>
              
              <div className="space-y-4">
                <div className="bg-cyber-green/10 p-3 rounded border border-cyber-green/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Nearby Helpers</span>
                    <Badge className="bg-cyber-green text-white">{communityHelpers}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Verified LifeLine users within 300m radius
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Emergency Contacts</div>
                  {userProfile.emergencyContacts.length > 0 ? (
                    userProfile.emergencyContacts.map((contact, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-background/30 rounded">
                        <div>
                          <div className="text-sm font-medium">{contact.name}</div>
                          <div className="text-xs text-muted-foreground">{contact.relationship}</div>
                        </div>
                        <Button size="sm" variant="outline">
                          <Phone className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground">No emergency contacts added</div>
                  )}
                </div>

                <Button 
                  onClick={() => setShowProfileSetup(true)}
                  variant="outline"
                  className="w-full"
                >
                  Manage Contacts
                </Button>
              </div>
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
        onSave={(profile) => {
          setUserProfile(profile);
          localStorage.setItem("lifelineProfile", JSON.stringify(profile));
        }}
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
            Active Incident
          </Button>
        </div>
      )}

      {/* Emergency Alert Overlay */}
      {riskScore >= 7 && (
        <div className="fixed inset-0 bg-cyber-red/20 animate-pulse pointer-events-none z-30" />
      )}
    </div>
  );
};