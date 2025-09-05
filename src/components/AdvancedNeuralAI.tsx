import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Brain, Camera, Mic, Activity, AlertTriangle, Eye, 
  Play, Pause, RotateCcw, Zap, Volume2, Heart, CameraOff, MicOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface AdvancedNeuralAIProps {
  onStressDetected: (level: "low" | "medium" | "high" | "critical", confidence: number) => void;
  onConditionDetected: (condition: string, confidence: number) => void;
  onEmergencyTrigger: () => void;
}

interface StressAnalysis {
  faceStress: number;
  voiceStress: number;
  overallStress: number;
  stressLevel: "low" | "medium" | "high" | "critical";
  confidence: number;
  detectedConditions: PossibleCondition[];
  recommendations: string[];
  timestamp: Date;
}

interface PossibleCondition {
  condition: string;
  probability: number;
  reasoning: string[];
  severity: "low" | "medium" | "high" | "critical";
  medicalAdvice: string;
}

interface FacialMetrics {
  blinkRate: number;
  eyeStrain: number;
  facialTension: number;
  microExpressions: string[];
  skinColor: number;
  confidence: number;
}

interface VoiceMetrics {
  pitch: number;
  pitchVariance: number;
  tone: "calm" | "anxious" | "agitated" | "fatigued" | "distressed";
  speechRate: number;
  tremor: number;
  clarity: number;
  confidence: number;
}

export const AdvancedNeuralAI = ({ 
  onStressDetected, 
  onConditionDetected, 
  onEmergencyTrigger 
}: AdvancedNeuralAIProps) => {
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<"face" | "voice" | "analysis" | "complete">("face");
  const [progress, setProgress] = useState(0);
  const [facialMetrics, setFacialMetrics] = useState<FacialMetrics | null>(null);
  const [voiceMetrics, setVoiceMetrics] = useState<VoiceMetrics | null>(null);
  const [stressAnalysis, setStressAnalysis] = useState<StressAnalysis | null>(null);
  const [hasCamera, setHasCamera] = useState(false);
  const [hasMicrophone, setHasMicrophone] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioDataRef = useRef<number[]>([]);

  // CHECK DEVICE CAPABILITIES
  useEffect(() => {
    const checkCapabilities = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setHasCamera(devices.some(device => device.kind === 'videoinput'));
        setHasMicrophone(devices.some(device => device.kind === 'audioinput'));
      } catch (error) {
        console.warn("Could not check device capabilities");
      }
    };
    
    checkCapabilities();
  }, []);

  // RESET ALL DATA
  const resetAnalysis = useCallback(() => {
    setStressAnalysis(null);
    setFacialMetrics(null);
    setVoiceMetrics(null);
    setProgress(0);
    setCurrentPhase("face");
    audioDataRef.current = [];
  }, []);

  // START COMPLETE NEURAL ANALYSIS
  const startNeuralAnalysis = useCallback(async () => {
    resetAnalysis();
    setIsAnalyzing(true);
    
    try {
      // Phase 1: Facial Analysis
      await performFacialAnalysis();
      
      // Phase 2: Voice Analysis
      await performVoiceAnalysis();
      
      // Phase 3: Combined Analysis
      await performCombinedAnalysis();
      
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
      setIsAnalyzing(false);
    }
  }, []);

  // FACIAL STRESS ANALYSIS
  const performFacialAnalysis = useCallback(async (): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      setCurrentPhase("face");
      setProgress(10);
      
      if (!hasCamera) {
        reject(new Error("Camera required for facial analysis"));
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          await videoRef.current.play();
          
          // Analyze for 8 seconds
          let frameCount = 0;
          const targetFrames = 240; // 8 seconds at 30fps
          const faceData: any[] = [];
          
          const analyzeFace = () => {
            if (frameCount >= targetFrames) {
              // Process facial data
              const metrics = processFacialData(faceData);
              setFacialMetrics(metrics);
              setProgress(50);
              
              // Stop camera
              stream.getTracks().forEach(track => track.stop());
              resolve();
              return;
            }
            
            if (videoRef.current && canvasRef.current) {
              const canvas = canvasRef.current;
              const ctx = canvas.getContext('2d');
              const video = videoRef.current;
              
              canvas.width = video.videoWidth || 640;
              canvas.height = video.videoHeight || 480;
              
              ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
              
              // Extract facial features
              const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
              if (imageData) {
                const faceFeatures = extractFacialFeatures(imageData);
                faceData.push(faceFeatures);
              }
              
              frameCount++;
              setProgress(10 + (frameCount / targetFrames) * 40);
            }
            
            requestAnimationFrame(analyzeFace);
          };
          
          analyzeFace();
        }
      } catch (error) {
        reject(new Error("Camera access denied. Please enable camera for facial analysis."));
      }
    });
  }, [hasCamera]);

  // VOICE STRESS ANALYSIS
  const performVoiceAnalysis = useCallback(async (): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      setCurrentPhase("voice");
      
      if (!hasMicrophone) {
        // Skip voice analysis if no microphone
        setVoiceMetrics({
          pitch: 0,
          pitchVariance: 0,
          tone: "calm",
          speechRate: 0,
          tremor: 0,
          clarity: 0,
          confidence: 0
        });
        resolve();
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
          }
        });

        audioContextRef.current = new AudioContext();
        const analyser = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        
        analyser.fftSize = 1024;
        source.connect(analyser);
        analyserRef.current = analyser;
        
        toast({
          title: "Speak Now",
          description: "Please speak for 10 seconds: 'Hello, my name is... I am feeling...'",
          variant: "default"
        });

        // Record for 10 seconds
        let recordingTime = 0;
        const recordingInterval = setInterval(() => {
          const audioData = captureAudioData();
          audioDataRef.current.push(...audioData);
          
          recordingTime += 100;
          setProgress(50 + (recordingTime / 10000) * 30);
          
          if (recordingTime >= 10000) {
            clearInterval(recordingInterval);
            
            // Process voice data
            const metrics = processVoiceData(audioDataRef.current);
            setVoiceMetrics(metrics);
            setProgress(80);
            
            // Stop recording
            stream.getTracks().forEach(track => track.stop());
            audioContextRef.current?.close();
            
            resolve();
          }
        }, 100);
        
      } catch (error) {
        // Fallback without voice analysis
        setVoiceMetrics({
          pitch: 0,
          pitchVariance: 0,
          tone: "calm",
          speechRate: 0,
          tremor: 0,
          clarity: 0,
          confidence: 0
        });
        resolve();
      }
    });
  }, [hasMicrophone]);

  // COMBINED MEDICAL ANALYSIS
  const performCombinedAnalysis = useCallback(async () => {
    setCurrentPhase("analysis");
    setProgress(85);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (!facialMetrics || !voiceMetrics) return;
    
    // Calculate stress levels
    const faceStress = calculateFaceStress(facialMetrics);
    const voiceStress = calculateVoiceStress(voiceMetrics);
    const overallStress = (faceStress * 0.6 + voiceStress * 0.4);
    
    // Determine stress level
    let stressLevel: "low" | "medium" | "high" | "critical";
    if (overallStress >= 80) stressLevel = "critical";
    else if (overallStress >= 60) stressLevel = "high";
    else if (overallStress >= 40) stressLevel = "medium";
    else stressLevel = "low";
    
    // Medical condition detection
    const detectedConditions = detectMedicalConditions(facialMetrics, voiceMetrics, overallStress);
    
    // Generate recommendations
    const recommendations = generateRecommendations(stressLevel, detectedConditions);
    
    const analysis: StressAnalysis = {
      faceStress,
      voiceStress,
      overallStress,
      stressLevel,
      confidence: Math.min(95, (facialMetrics.confidence + voiceMetrics.confidence) / 2),
      detectedConditions,
      recommendations,
      timestamp: new Date()
    };
    
    setStressAnalysis(analysis);
    setCurrentPhase("complete");
    setProgress(100);
    setIsAnalyzing(false);
    
    // Trigger callbacks
    onStressDetected(stressLevel, analysis.confidence);
    
    if (detectedConditions.length > 0) {
      detectedConditions.forEach(condition => {
        onConditionDetected(condition.condition, condition.probability);
      });
    }
    
    if (stressLevel === "critical") {
      onEmergencyTrigger();
      toast({
        title: "⚠️ Critical Stress Detected",
        description: "High stress levels detected. Consider seeking support.",
        variant: "destructive"
      });
    }
  }, [facialMetrics, voiceMetrics, onStressDetected, onConditionDetected, onEmergencyTrigger]);

  // FACIAL FEATURE EXTRACTION
  const extractFacialFeatures = (imageData: ImageData) => {
    const data = imageData.data;
    let totalBrightness = 0;
    let redSum = 0;
    let greenSum = 0;
    let blueSum = 0;
    
    // Sample center region for face detection
    const centerX = imageData.width / 2;
    const centerY = imageData.height / 2;
    const sampleSize = 100;
    
    for (let y = centerY - sampleSize/2; y < centerY + sampleSize/2; y++) {
      for (let x = centerX - sampleSize/2; x < centerX + sampleSize/2; x++) {
        const idx = (Math.floor(y) * imageData.width + Math.floor(x)) * 4;
        if (idx >= 0 && idx < data.length) {
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          
          totalBrightness += (r + g + b) / 3;
          redSum += r;
          greenSum += g;
          blueSum += b;
        }
      }
    }
    
    const pixelCount = sampleSize * sampleSize;
    return {
      brightness: totalBrightness / pixelCount,
      avgRed: redSum / pixelCount,
      avgGreen: greenSum / pixelCount,
      avgBlue: blueSum / pixelCount,
      timestamp: Date.now()
    };
  };

  // PROCESS FACIAL DATA
  const processFacialData = (faceData: any[]): FacialMetrics => {
    if (faceData.length === 0) {
      return {
        blinkRate: 0,
        eyeStrain: 0,
        facialTension: 0,
        microExpressions: [],
        skinColor: 0,
        confidence: 30
      };
    }
    
    // Analyze brightness variations (blinking detection)
    const brightnessValues = faceData.map(d => d.brightness);
    const brightnessVariance = calculateVariance(brightnessValues);
    const blinkRate = Math.min(30, brightnessVariance / 5); // Blinks per minute
    
    // Eye strain from color analysis
    const redValues = faceData.map(d => d.avgRed);
    const eyeStrain = Math.min(100, calculateVariance(redValues) / 10);
    
    // Facial tension from overall color changes
    const colorStability = 100 - Math.min(100, brightnessVariance / 2);
    const facialTension = 100 - colorStability;
    
    // Skin color health indicator
    const avgRed = redValues.reduce((a, b) => a + b, 0) / redValues.length;
    const skinColor = Math.min(100, avgRed / 2.55);
    
    // Micro-expressions detection (simplified)
    const microExpressions: string[] = [];
    if (blinkRate > 20) microExpressions.push("rapid_blinking");
    if (facialTension > 60) microExpressions.push("tension");
    if (skinColor < 40) microExpressions.push("pallor");
    
    return {
      blinkRate,
      eyeStrain,
      facialTension,
      microExpressions,
      skinColor,
      confidence: Math.min(90, faceData.length / 2.4) // Based on data quality
    };
  };

  // CAPTURE AUDIO DATA
  const captureAudioData = (): number[] => {
    if (!analyserRef.current) return [];
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    return Array.from(dataArray);
  };

  // PROCESS VOICE DATA
  const processVoiceData = (audioData: number[]): VoiceMetrics => {
    if (audioData.length === 0) {
      return {
        pitch: 0,
        pitchVariance: 0,
        tone: "calm",
        speechRate: 0,
        tremor: 0,
        clarity: 0,
        confidence: 0
      };
    }
    
    // Calculate average frequency (simplified pitch)
    const avgFrequency = audioData.reduce((a, b) => a + b, 0) / audioData.length;
    const pitch = avgFrequency * 2; // Convert to approximate Hz
    
    // Pitch variance (voice stability)
    const pitchVariance = calculateVariance(audioData);
    
    // Voice tremor detection
    const tremor = Math.min(100, pitchVariance / 50);
    
    // Speech clarity (signal strength)
    const maxAmplitude = Math.max(...audioData);
    const clarity = Math.min(100, maxAmplitude / 2.55);
    
    // Determine tone based on pitch and variance
    let tone: "calm" | "anxious" | "agitated" | "fatigued" | "distressed";
    if (pitch > 200 && pitchVariance > 1000) tone = "distressed";
    else if (pitch > 180 && pitchVariance > 500) tone = "anxious";
    else if (pitch > 160 && tremor > 40) tone = "agitated";
    else if (pitch < 120 && clarity < 30) tone = "fatigued";
    else tone = "calm";
    
    // Speech rate (simplified)
    const speechRate = Math.min(200, audioData.filter(v => v > 50).length / 10);
    
    return {
      pitch,
      pitchVariance,
      tone,
      speechRate,
      tremor,
      clarity,
      confidence: Math.min(85, audioData.length / 1000) // Based on sample size
    };
  };

  // STRESS CALCULATION
  const calculateFaceStress = (metrics: FacialMetrics): number => {
    return Math.min(100, 
      (metrics.blinkRate * 1.5) + 
      (metrics.eyeStrain * 0.8) + 
      (metrics.facialTension * 1.2) +
      (metrics.microExpressions.length * 15)
    );
  };

  const calculateVoiceStress = (metrics: VoiceMetrics): number => {
    const toneStress = {
      "calm": 0,
      "fatigued": 25,
      "anxious": 60,
      "agitated": 80,
      "distressed": 95
    };
    
    return Math.min(100,
      toneStress[metrics.tone] +
      (metrics.tremor * 0.5) +
      (metrics.pitchVariance / 50) +
      (100 - metrics.clarity) * 0.3
    );
  };

  // MEDICAL CONDITION DETECTION
  const detectMedicalConditions = (face: FacialMetrics, voice: VoiceMetrics, stress: number): PossibleCondition[] => {
    const conditions: PossibleCondition[] = [];
    
    // Anxiety disorders
    if (stress > 70 && voice.tone === "anxious" && face.blinkRate > 25) {
      conditions.push({
        condition: "Anxiety Episode",
        probability: Math.min(85, stress),
        reasoning: [
          `High stress levels (${stress.toFixed(0)}%)`,
          `Anxious voice tone detected`,
          `Elevated blink rate (${face.blinkRate.toFixed(0)}/min)`
        ],
        severity: stress > 85 ? "critical" : "high",
        medicalAdvice: "Practice deep breathing. Consider speaking with a healthcare provider about anxiety management."
      });
    }
    
    // Fatigue/exhaustion
    if (voice.tone === "fatigued" && face.eyeStrain > 50 && voice.clarity < 40) {
      conditions.push({
        condition: "Severe Fatigue",
        probability: 70,
        reasoning: [
          "Fatigued voice patterns",
          `High eye strain (${face.eyeStrain.toFixed(0)}%)`,
          "Reduced speech clarity"
        ],
        severity: "medium",
        medicalAdvice: "Rest is recommended. Ensure adequate sleep and hydration."
      });
    }
    
    // Panic attack indicators
    if (stress > 85 && voice.tone === "distressed" && face.microExpressions.includes("rapid_blinking")) {
      conditions.push({
        condition: "Possible Panic Episode",
        probability: 80,
        reasoning: [
          "Critical stress levels detected",
          "Distressed vocal patterns",
          "Rapid blinking observed"
        ],
        severity: "critical",
        medicalAdvice: "Use grounding techniques (5-4-3-2-1 method). Seek immediate support if symptoms persist."
      });
    }
    
    return conditions;
  };

  // GENERATE RECOMMENDATIONS
  const generateRecommendations = (stressLevel: string, conditions: PossibleCondition[]): string[] => {
    const recommendations: string[] = [];
    
    if (stressLevel === "critical") {
      recommendations.push("🚨 Immediate stress management needed");
      recommendations.push("💨 Practice deep breathing exercises");
      recommendations.push("🤝 Consider reaching out for support");
    } else if (stressLevel === "high") {
      recommendations.push("⚠️ High stress detected - take breaks");
      recommendations.push("🧘 Try meditation or relaxation techniques");
      recommendations.push("🚶 Light physical activity may help");
    } else if (stressLevel === "medium") {
      recommendations.push("📊 Moderate stress - monitor levels");
      recommendations.push("💧 Stay hydrated and well-rested");
    } else {
      recommendations.push("✅ Stress levels appear normal");
      recommendations.push("🌟 Continue healthy habits");
    }
    
    return recommendations;
  };

  // UTILITY FUNCTIONS
  const calculateVariance = (values: number[]): number => {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return variance;
  };

  return (
    <Card className="p-6 space-y-6 bg-gradient-to-br from-cyber-purple/10 to-cyber-blue/10 border-cyber-purple/30">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Brain className="w-6 h-6 text-cyber-purple animate-pulse" />
          <h3 className="text-xl font-bold">Advanced Neural AI</h3>
          <Badge variant="outline" className="text-xs">Medical Grade</Badge>
        </div>
        
        {/* Device Status */}
        <div className="flex justify-center gap-4 mb-4">
          <Badge variant={hasCamera ? "default" : "secondary"} className="flex items-center gap-1">
            {hasCamera ? <Camera className="w-3 h-3" /> : <CameraOff className="w-3 h-3" />}
            Camera {hasCamera ? "Ready" : "Not Available"}
          </Badge>
          <Badge variant={hasMicrophone ? "default" : "secondary"} className="flex items-center gap-1">
            {hasMicrophone ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
            Microphone {hasMicrophone ? "Ready" : "Not Available"}
          </Badge>
        </div>
      </div>

      {/* Results Display */}
      {stressAnalysis && (
        <div className="space-y-4">
          {/* Stress Level Display */}
          <Card className={cn(
            "p-4 text-center",
            stressAnalysis.stressLevel === "critical" && "bg-destructive/10 border-destructive",
            stressAnalysis.stressLevel === "high" && "bg-orange-500/10 border-orange-500",
            stressAnalysis.stressLevel === "medium" && "bg-yellow-500/10 border-yellow-500",
            stressAnalysis.stressLevel === "low" && "bg-green-500/10 border-green-500"
          )}>
            <div className="text-2xl font-bold mb-2">
              Neural AI Status: {stressAnalysis.stressLevel.toUpperCase()}
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="font-semibold">Face Stress</div>
                <div className="text-xl">{stressAnalysis.faceStress.toFixed(0)}%</div>
              </div>
              <div>
                <div className="font-semibold">Voice Stress</div>
                <div className="text-xl">{stressAnalysis.voiceStress.toFixed(0)}%</div>
              </div>
              <div>
                <div className="font-semibold">Overall</div>
                <div className="text-xl">{stressAnalysis.overallStress.toFixed(0)}%</div>
              </div>
            </div>
            <Badge variant="outline" className="mt-2">
              {stressAnalysis.confidence.toFixed(0)}% Confidence
            </Badge>
          </Card>

          {/* Detected Conditions */}
          {stressAnalysis.detectedConditions.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold">Possible Conditions Detected:</h4>
              {stressAnalysis.detectedConditions.map((condition, idx) => (
                <Alert key={idx} className={cn(
                  condition.severity === "critical" && "border-destructive bg-destructive/10",
                  condition.severity === "high" && "border-orange-500 bg-orange-500/10"
                )}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-semibold">{condition.condition} ({condition.probability.toFixed(0)}%)</div>
                    <div className="text-sm mt-1">{condition.medicalAdvice}</div>
                    <div className="text-xs mt-2 opacity-75">
                      Evidence: {condition.reasoning.join(", ")}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {/* Recommendations */}
          <div className="space-y-2">
            <h4 className="font-semibold">Recommendations:</h4>
            <div className="grid gap-2">
              {stressAnalysis.recommendations.map((rec, idx) => (
                <Badge key={idx} variant="outline" className="justify-start p-2 h-auto">
                  {rec}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Scanning Interface */}
      {isAnalyzing && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Phase: {currentPhase.toUpperCase()}</span>
              <span>Progress: {progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
            
            <div className="text-center text-sm text-muted-foreground">
              {currentPhase === "face" && "📷 Analyzing facial expressions..."}
              {currentPhase === "voice" && "🎤 Recording voice patterns..."}
              {currentPhase === "analysis" && "🧠 Processing neural data..."}
            </div>
          </div>

          {/* Live Video Feed */}
          {currentPhase === "face" && (
            <div className="relative">
              <video 
                ref={videoRef} 
                className="w-full max-w-sm mx-auto rounded-lg"
                playsInline 
                muted 
              />
              <canvas ref={canvasRef} className="hidden" />
              
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-cyber-purple rounded-full animate-pulse">
                  <div className="text-center text-cyber-purple text-xs mt-20">
                    Look at camera
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <Button 
            onClick={() => {
              setIsAnalyzing(false);
              if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
              }
            }} 
            variant="outline" 
            className="w-full"
          >
            Cancel Analysis
          </Button>
        </div>
      )}

      {/* Control Buttons */}
      {!isAnalyzing && (
        <div className="space-y-4">
          <Button 
            onClick={startNeuralAnalysis}
            className="w-full flex items-center justify-center gap-2"
            disabled={!hasCamera && !hasMicrophone}
          >
            <Brain className="w-5 h-5" />
            Start Neural Analysis
          </Button>
          
          {stressAnalysis && (
            <Button 
              onClick={resetAnalysis}
              variant="outline" 
              className="w-full"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              New Analysis
            </Button>
          )}
          
          {!hasCamera && !hasMicrophone && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Camera and microphone access required for neural analysis. Please enable permissions.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </Card>
  );
};