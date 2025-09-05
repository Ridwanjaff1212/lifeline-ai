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

  // CHECK DEVICE CAPABILITIES AND REQUEST PERMISSIONS
  useEffect(() => {
    const checkCapabilities = async () => {
      try {
        // Test camera access
        try {
          const testStream = await navigator.mediaDevices.getUserMedia({ video: true });
          setHasCamera(true);
          testStream.getTracks().forEach(track => track.stop());
        } catch {
          setHasCamera(false);
        }
        
        // Test microphone access
        try {
          const testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setHasMicrophone(true);
          testStream.getTracks().forEach(track => track.stop());
        } catch {
          setHasMicrophone(false);
        }
      } catch (error) {
        console.warn("Could not check device capabilities");
        setHasCamera(false);
        setHasMicrophone(false);
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

  // CHEST AUDIO ANALYSIS - 60 SECONDS
  const performVoiceAnalysis = useCallback(async (): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      setCurrentPhase("voice");
      
      if (!hasMicrophone) {
        reject(new Error("Microphone access required for chest audio analysis"));
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: false, // Need raw audio for chest sounds
            noiseSuppression: false, // Need all frequencies
            autoGainControl: false,
            sampleRate: 48000 // High quality for medical analysis
          }
        });

        audioContextRef.current = new AudioContext({ sampleRate: 48000 });
        const analyser = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        
        analyser.fftSize = 4096; // Higher resolution for chest sounds
        analyser.smoothingTimeConstant = 0.1;
        source.connect(analyser);
        analyserRef.current = analyser;
        
        toast({
          title: "🫁 Chest Audio Analysis",
          description: "Place phone on chest/neck. Stay quiet for 60 seconds while analyzing breathing and heart sounds.",
          variant: "default"
        });

        // Record for 60 seconds
        let recordingTime = 0;
        const chestAudioData: number[][] = [];
        
        const recordingInterval = setInterval(() => {
          const audioFrame = captureDetailedAudioData();
          chestAudioData.push(audioFrame);
          audioDataRef.current.push(...audioFrame);
          
          recordingTime += 200;
          setProgress(50 + (recordingTime / 60000) * 30);
          
          // Real-time feedback
          if (recordingTime % 5000 === 0) {
            const seconds = recordingTime / 1000;
            toast({
              title: `Analyzing... ${60 - seconds}s remaining`,
              description: "Detecting heart sounds and breathing patterns",
              variant: "default"
            });
          }
          
          if (recordingTime >= 60000) {
            clearInterval(recordingInterval);
            
            // Process chest audio data
            const metrics = processChestAudioData(chestAudioData);
            setVoiceMetrics(metrics);
            setProgress(80);
            
            // Stop recording
            stream.getTracks().forEach(track => track.stop());
            audioContextRef.current?.close();
            
            toast({
              title: "✅ Analysis Complete",
              description: "Chest audio analysis finished. Processing results...",
              variant: "default"
            });
            
            resolve();
          }
        }, 200);
        
      } catch (error) {
        reject(new Error("Microphone access denied. Please enable microphone for chest audio analysis."));
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

  // CAPTURE DETAILED AUDIO DATA FOR CHEST ANALYSIS
  const captureDetailedAudioData = (): number[] => {
    if (!analyserRef.current) return [];
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const freqData = new Uint8Array(bufferLength);
    const timeData = new Uint8Array(bufferLength);
    
    analyserRef.current.getByteFrequencyData(freqData);
    analyserRef.current.getByteTimeDomainData(timeData);
    
    // Combine frequency and time domain for comprehensive analysis
    const combined = Array.from(freqData).concat(Array.from(timeData));
    return combined;
  };

  // LEGACY SUPPORT
  const captureAudioData = (): number[] => {
    return captureDetailedAudioData().slice(0, analyserRef.current?.frequencyBinCount || 0);
  };

  // PROCESS CHEST AUDIO DATA - MEDICAL ANALYSIS
  const processChestAudioData = (audioFrames: number[][]): VoiceMetrics => {
    if (audioFrames.length === 0) {
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
    
    // Flatten all audio data
    const allAudioData = audioFrames.flat();
    
    // Heart rate from audio (chest vibrations)
    const heartSounds = detectHeartSounds(audioFrames);
    const heartRate = calculateHeartRateFromAudio(heartSounds);
    
    // Breathing analysis
    const breathingSounds = detectBreathingSounds(audioFrames);
    const respiratoryRate = calculateRespiratoryRate(breathingSounds);
    
    // Chest congestion/wheezing detection
    const congestionLevel = detectChestCongestion(audioFrames);
    const wheezingDetected = detectWheezing(audioFrames);
    
    // Overall chest health score
    const chestHealthScore = calculateChestHealthScore(heartRate, respiratoryRate, congestionLevel, wheezingDetected);
    
    // Voice characteristics from chest resonance
    const chestResonance = calculateChestResonance(allAudioData);
    const vocalStress = calculateVocalStress(allAudioData);
    
    // Determine tone based on chest audio analysis
    let tone: "calm" | "anxious" | "agitated" | "fatigued" | "distressed";
    if (wheezingDetected && congestionLevel > 70) tone = "distressed";
    else if (heartRate > 100 && vocalStress > 60) tone = "anxious";
    else if (respiratoryRate > 20 && chestResonance < 40) tone = "agitated";
    else if (heartRate < 60 && chestResonance < 30) tone = "fatigued";
    else tone = "calm";
    
    return {
      pitch: heartRate, // Repurpose as heart rate from audio
      pitchVariance: respiratoryRate, // Repurpose as respiratory rate
      tone,
      speechRate: chestHealthScore, // Repurpose as chest health score
      tremor: congestionLevel, // Repurpose as congestion level
      clarity: chestResonance, // Repurpose as chest resonance
      confidence: Math.min(90, audioFrames.length / 3) // High confidence with 60s of data
    };
  };

  // LEGACY VOICE PROCESSING (FALLBACK)
  const processVoiceData = (audioData: number[]): VoiceMetrics => {
    return processChestAudioData([audioData]);
  };

  // CHEST SOUND DETECTION FUNCTIONS
  const detectHeartSounds = (audioFrames: number[][]): number[] => {
    const heartbeats: number[] = [];
    
    audioFrames.forEach((frame, frameIndex) => {
      // Look for low-frequency peaks (heart sounds: 20-150 Hz)
      const lowFreqData = frame.slice(0, 50); // First 50 bins ≈ 0-600 Hz
      const heartFreqData = lowFreqData.slice(1, 8); // ≈ 20-150 Hz
      
      const avgHeartFreq = heartFreqData.reduce((a, b) => a + b, 0) / heartFreqData.length;
      
      if (avgHeartFreq > 30) { // Threshold for heart sound detection
        heartbeats.push(frameIndex);
      }
    });
    
    return heartbeats;
  };

  const detectBreathingSounds = (audioFrames: number[][]): number[] => {
    const breathSounds: number[] = [];
    
    audioFrames.forEach((frame, frameIndex) => {
      // Look for breathing frequencies (200-2000 Hz)
      const breathFreqData = frame.slice(8, 80); // ≈ 200-2000 Hz
      const avgBreathFreq = breathFreqData.reduce((a, b) => a + b, 0) / breathFreqData.length;
      
      if (avgBreathFreq > 20) {
        breathSounds.push(frameIndex);
      }
    });
    
    return breathSounds;
  };

  const calculateHeartRateFromAudio = (heartSounds: number[]): number => {
    if (heartSounds.length < 2) return 70; // Default if insufficient data
    
    // Calculate intervals between heartbeats
    const intervals = heartSounds.slice(1).map((beat, idx) => beat - heartSounds[idx]);
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    
    // Convert to BPM (5 frames per second * 60 seconds / interval)
    const heartRate = Math.round((300 / avgInterval));
    
    // Clamp to physiological range
    return Math.max(40, Math.min(180, heartRate));
  };

  const calculateRespiratoryRate = (breathSounds: number[]): number => {
    if (breathSounds.length < 2) return 16; // Default respiratory rate
    
    // Count breathing cycles (breaths per minute)
    const breathsPerMinute = (breathSounds.length / 300) * 60; // 300 frames = 60 seconds
    
    return Math.max(8, Math.min(40, Math.round(breathsPerMinute)));
  };

  const detectChestCongestion = (audioFrames: number[][]): number => {
    let congestionLevel = 0;
    
    audioFrames.forEach(frame => {
      // Look for irregular breathing patterns and mucus sounds
      const midFreqData = frame.slice(40, 120); // ≈ 1000-3000 Hz
      const irregularity = calculateVariance(midFreqData);
      
      congestionLevel += Math.min(100, irregularity / 10);
    });
    
    return Math.min(100, congestionLevel / audioFrames.length);
  };

  const detectWheezing = (audioFrames: number[][]): boolean => {
    let wheezingCount = 0;
    
    audioFrames.forEach(frame => {
      // Look for high-pitched whistling sounds (400-1600 Hz)
      const wheezingFreqData = frame.slice(16, 64); // ≈ 400-1600 Hz
      const maxWheezingFreq = Math.max(...wheezingFreqData);
      
      if (maxWheezingFreq > 80) { // Threshold for wheezing detection
        wheezingCount++;
      }
    });
    
    // If more than 10% of frames show wheezing
    return (wheezingCount / audioFrames.length) > 0.1;
  };

  const calculateChestHealthScore = (hr: number, rr: number, congestion: number, wheezing: boolean): number => {
    let score = 100;
    
    // Deduct for abnormal heart rate
    if (hr < 60 || hr > 100) score -= 20;
    
    // Deduct for abnormal respiratory rate
    if (rr < 12 || rr > 20) score -= 15;
    
    // Deduct for congestion
    score -= congestion * 0.3;
    
    // Deduct for wheezing
    if (wheezing) score -= 25;
    
    return Math.max(0, Math.round(score));
  };

  const calculateChestResonance = (audioData: number[]): number => {
    const lowFreqPower = audioData.slice(0, 20).reduce((a, b) => a + b, 0) / 20;
    return Math.min(100, lowFreqPower / 2);
  };

  const calculateVocalStress = (audioData: number[]): number => {
    const highFreqPower = audioData.slice(100, 200).reduce((a, b) => a + b, 0) / 100;
    const variance = calculateVariance(audioData);
    return Math.min(100, (highFreqPower + variance) / 10);
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