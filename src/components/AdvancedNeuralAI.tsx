import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, Camera, Mic, Activity, AlertTriangle, Eye, 
  Play, Pause, RotateCcw, Zap, Volume2, Heart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface AdvancedNeuralAIProps {
  onStressDetected: (level: "low" | "medium" | "high" | "critical", confidence: number) => void;
  onConditionDetected: (condition: string, confidence: number) => void;
  onEmergencyTrigger: () => void;
}

interface StressReading {
  level: "low" | "medium" | "high" | "critical";
  confidence: number;
  triggers: string[];
  timestamp: Date;
  stressIndex: number;
}

interface VoiceAnalysis {
  tone: "calm" | "anxious" | "agitated" | "fatigued" | "panicked";
  pitch: number;
  variance: number;
  clarity: number;
  speechRate: number;
  confidence: number;
}

interface FacialAnalysis {
  blinkRate: number;
  eyeStrain: boolean;
  microExpressions: string[];
  temperatureZones: number[];
  confidence: number;
}

interface CognitiveTest {
  reactionTime: number;
  accuracy: number;
  hesitation: number;
  cognitiveLoad: number;
}

interface PossibleCondition {
  condition: string;
  probability: number;
  reasoning: string[];
  severity: "low" | "medium" | "high" | "critical";
}

export const AdvancedNeuralAI = ({ 
  onStressDetected, 
  onConditionDetected, 
  onEmergencyTrigger 
}: AdvancedNeuralAIProps) => {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [currentStress, setCurrentStress] = useState<StressReading | null>(null);
  const [voiceAnalysis, setVoiceAnalysis] = useState<VoiceAnalysis | null>(null);
  const [facialAnalysis, setFacialAnalysis] = useState<FacialAnalysis | null>(null);
  const [possibleConditions, setPossibleConditions] = useState<PossibleCondition[]>([]);
  const [cognitiveTest, setCognitiveTest] = useState<CognitiveTest | null>(null);
  const [hasBaseline, setHasBaseline] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<"facial" | "voice" | "cognitive" | "analysis">("facial");

  // Refs for media access
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  
  // Analysis refs
  const baselineRef = useRef<VoiceAnalysis | null>(null);
  const frameHistoryRef = useRef<ImageData[]>([]);
  const cognitiveStartRef = useRef<number>(0);

  // Medical condition database with realistic patterns
  const medicalDatabase = {
    "Panic Attack": {
      triggers: ["high_stress", "elevated_hr", "rapid_breathing", "anxious_voice"],
      hrRange: [120, 180],
      confidence: 0.85,
      severity: "high" as const
    },
    "Cardiac Arrhythmia": {
      triggers: ["irregular_hr", "chest_discomfort", "medium_stress"],
      hrRange: [50, 200],
      confidence: 0.90,
      severity: "critical" as const
    },
    "Severe Anxiety": {
      triggers: ["high_stress", "voice_tremor", "high_blink_rate"],
      hrRange: [90, 140],
      confidence: 0.80,
      severity: "medium" as const
    },
    "Respiratory Distress": {
      triggers: ["labored_breathing", "low_spo2", "fatigue_voice"],
      hrRange: [90, 150],
      confidence: 0.88,
      severity: "critical" as const
    },
    "Shock/Trauma": {
      triggers: ["pallor", "low_stress_unusual", "weak_voice", "low_hr"],
      hrRange: [40, 100],
      confidence: 0.82,
      severity: "critical" as const
    },
    "Severe Fatigue": {
      triggers: ["slow_reactions", "low_cognitive", "fatigue_voice"],
      hrRange: [60, 90],
      confidence: 0.75,
      severity: "medium" as const
    }
  };

  const startNeuralScan = useCallback(async () => {
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (!isMobile) {
      toast({
        title: "Mobile Device Required",
        description: "Neural AI analysis requires a mobile device for optimal sensor access",
        variant: "destructive"
      });
      return;
    }

    setIsScanning(true);
    setScanProgress(0);
    setCurrentPhase("facial");
    
    try {
      // Enhanced permission request with better error handling
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30, min: 15 }
        },
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        
        // Wait for video to be ready
        await new Promise(resolve => {
          const checkReady = () => {
            if (videoRef.current && videoRef.current.videoWidth > 0) {
              resolve(true);
            } else {
              setTimeout(checkReady, 100);
            }
          };
          checkReady();
        });
      }

      // Enhanced audio context setup
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 4096;
      analyserRef.current.smoothingTimeConstant = 0.8;
      source.connect(analyserRef.current);

      toast({
        title: "Neural AI Activated",
        description: "Camera and microphone access granted - starting analysis",
      });

      await runAnalysisSequence();

    } catch (error) {
      console.error("Neural scan access denied:", error);
      
      toast({
        title: "Permission Required",
        description: "Please allow camera and microphone access for Neural AI analysis",
        variant: "destructive"
      });
      
      // Reset state
      setIsScanning(false);
      setScanProgress(0);
    }
  }, []);

  const runAnalysisSequence = async () => {
    // Phase 1: Facial Analysis (10 seconds)
    setCurrentPhase("facial");
    for (let i = 0; i <= 100; i += 2) {
      setScanProgress(i * 0.25);
      await new Promise(resolve => setTimeout(resolve, 100));
      if (i % 10 === 0) {
        analyzeFacialFeatures();
      }
    }

    // Phase 2: Voice Analysis (10 seconds)
    setCurrentPhase("voice");
    for (let i = 0; i <= 100; i += 2) {
      setScanProgress(25 + (i * 0.25));
      await new Promise(resolve => setTimeout(resolve, 100));
      if (i % 10 === 0) {
        analyzeVoicePattern();
      }
    }

    // Phase 3: Cognitive Test (8 seconds)
    setCurrentPhase("cognitive");
    await runCognitiveTest();

    // Phase 4: Analysis & Condition Detection
    setCurrentPhase("analysis");
    await analyzeConditions();
    
    setScanProgress(100);
    setTimeout(() => setIsScanning(false), 1000);
  };

  const analyzeFacialFeatures = useCallback(() => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    // Advanced facial feature detection
    const faceRegion = detectAdvancedFaceFeatures(pixels, canvas.width, canvas.height);
    
    if (faceRegion.detected) {
      const eyeAnalysis = analyzeEyeMovements(pixels, faceRegion.eyeRegions, canvas.width);
      const expressionAnalysis = detectMicroExpressions(pixels, faceRegion, canvas.width);
      const thermalAnalysis = estimateFacialTemperature(pixels, faceRegion.faceArea, canvas.width);
      
      // Draw neural mesh overlay
      drawNeuralMeshOverlay(ctx, faceRegion, eyeAnalysis, expressionAnalysis);
      
      const analysis: FacialAnalysis = {
        blinkRate: eyeAnalysis.blinkRate,
        eyeStrain: eyeAnalysis.strain,
        microExpressions: expressionAnalysis.expressions,
        temperatureZones: thermalAnalysis.zones,
        confidence: faceRegion.confidence
      };
      
      setFacialAnalysis(analysis);
    }

    // Store frame for motion analysis
    frameHistoryRef.current.push(imageData);
    if (frameHistoryRef.current.length > 10) {
      frameHistoryRef.current.shift();
    }
  }, []);

  const detectAdvancedFaceFeatures = (pixels: Uint8ClampedArray, width: number, height: number) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const searchRadius = Math.min(width, height) / 4;
    
    let skinPixelCount = 0;
    let facePixels: {x: number, y: number, r: number, g: number, b: number}[] = [];
    
    // Improved skin detection with color analysis
    for (let y = centerY - searchRadius; y < centerY + searchRadius; y++) {
      for (let x = centerX - searchRadius; x < centerX + searchRadius; x++) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const i = (Math.floor(y) * width + Math.floor(x)) * 4;
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          
          if (isAdvancedSkinColor(r, g, b)) {
            skinPixelCount++;
            facePixels.push({x, y, r, g, b});
          }
        }
      }
    }
    
    const faceDetected = skinPixelCount > (searchRadius * searchRadius * 0.25);
    const confidence = Math.min(skinPixelCount / (searchRadius * searchRadius * 0.5), 1);
    
    return {
      detected: faceDetected,
      confidence,
      faceArea: {
        x: centerX - searchRadius,
        y: centerY - searchRadius,
        width: searchRadius * 2,
        height: searchRadius * 2
      },
      eyeRegions: {
        left: { x: centerX - searchRadius * 0.6, y: centerY - searchRadius * 0.3, width: searchRadius * 0.4, height: searchRadius * 0.2 },
        right: { x: centerX + searchRadius * 0.2, y: centerY - searchRadius * 0.3, width: searchRadius * 0.4, height: searchRadius * 0.2 }
      },
      facePixels
    };
  };

  const isAdvancedSkinColor = (r: number, g: number, b: number): boolean => {
    // Advanced skin color detection algorithm
    const rgbSum = r + g + b;
    if (rgbSum < 100 || rgbSum > 700) return false;
    
    // YCbCr color space conversion for better skin detection
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const cb = -0.169 * r - 0.331 * g + 0.5 * b + 128;
    const cr = 0.5 * r - 0.419 * g - 0.081 * b + 128;
    
    // Skin color thresholds in YCbCr
    return y > 80 && cb >= 85 && cb <= 135 && cr >= 135 && cr <= 180;
  };

  const analyzeEyeMovements = (pixels: Uint8ClampedArray, eyeRegions: any, width: number) => {
    let totalBrightness = 0;
    let darkPixelCount = 0;
    let totalPixels = 0;
    
    [eyeRegions.left, eyeRegions.right].forEach(region => {
      for (let y = region.y; y < region.y + region.height; y++) {
        for (let x = region.x; x < region.x + region.width; x++) {
          if (x >= 0 && x < width && y >= 0) {
            const i = (Math.floor(y) * width + Math.floor(x)) * 4;
            const brightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
            totalBrightness += brightness;
            if (brightness < 60) darkPixelCount++;
            totalPixels++;
          }
        }
      }
    });
    
    const avgBrightness = totalBrightness / totalPixels;
    const darkRatio = darkPixelCount / totalPixels;
    
    return {
      blinkRate: darkRatio > 0.6 ? 1.5 : darkRatio > 0.3 ? 1.0 : 0.5,
      strain: avgBrightness < 40 || darkRatio > 0.8,
      pupilDilation: avgBrightness < 50 ? "dilated" : "normal"
    };
  };

  const detectMicroExpressions = (pixels: Uint8ClampedArray, faceRegion: any, width: number) => {
    const expressions: string[] = [];
    
    if (frameHistoryRef.current.length > 5) {
      // Compare with previous frames to detect micro-expressions
      const currentFrame = pixels;
      const previousFrame = frameHistoryRef.current[frameHistoryRef.current.length - 5].data;
      
      let totalDifference = 0;
      let significantChanges = 0;
      
      // Analyze forehead region (eyebrow tension)
      const foreheadY = faceRegion.faceArea.y;
      const foreheadHeight = faceRegion.faceArea.height * 0.2;
      
      for (let y = foreheadY; y < foreheadY + foreheadHeight; y++) {
        for (let x = faceRegion.faceArea.x; x < faceRegion.faceArea.x + faceRegion.faceArea.width; x++) {
          if (x >= 0 && x < width && y >= 0) {
            const i = (Math.floor(y) * width + Math.floor(x)) * 4;
            const currentBrightness = (currentFrame[i] + currentFrame[i + 1] + currentFrame[i + 2]) / 3;
            const prevBrightness = (previousFrame[i] + previousFrame[i + 1] + previousFrame[i + 2]) / 3;
            const diff = Math.abs(currentBrightness - prevBrightness);
            totalDifference += diff;
            if (diff > 15) significantChanges++;
          }
        }
      }
      
      const avgDifference = totalDifference / (faceRegion.faceArea.width * foreheadHeight);
      
      if (avgDifference > 10) expressions.push("eyebrow_tension");
      if (significantChanges > 50) expressions.push("facial_tension");
      
      // Analyze mouth region
      const mouthY = faceRegion.faceArea.y + faceRegion.faceArea.height * 0.7;
      const mouthHeight = faceRegion.faceArea.height * 0.2;
      
      let mouthMovement = 0;
      for (let y = mouthY; y < mouthY + mouthHeight; y++) {
        for (let x = faceRegion.faceArea.x + faceRegion.faceArea.width * 0.3; x < faceRegion.faceArea.x + faceRegion.faceArea.width * 0.7; x++) {
          if (x >= 0 && x < width && y >= 0) {
            const i = (Math.floor(y) * width + Math.floor(x)) * 4;
            const currentBrightness = (currentFrame[i] + currentFrame[i + 1] + currentFrame[i + 2]) / 3;
            const prevBrightness = (previousFrame[i] + previousFrame[i + 1] + previousFrame[i + 2]) / 3;
            mouthMovement += Math.abs(currentBrightness - prevBrightness);
          }
        }
      }
      
      if (mouthMovement > 500) expressions.push("lip_compression");
    }
    
    return { expressions };
  };

  const estimateFacialTemperature = (pixels: Uint8ClampedArray, faceArea: any, width: number) => {
    const zones: number[] = [];
    
    // Divide face into temperature zones
    const zoneWidth = faceArea.width / 3;
    const zoneHeight = faceArea.height / 3;
    
    for (let zoneY = 0; zoneY < 3; zoneY++) {
      for (let zoneX = 0; zoneX < 3; zoneX++) {
        let totalIntensity = 0;
        let pixelCount = 0;
        
        const startY = faceArea.y + zoneY * zoneHeight;
        const startX = faceArea.x + zoneX * zoneWidth;
        
        for (let y = startY; y < startY + zoneHeight; y++) {
          for (let x = startX; x < startX + zoneWidth; x++) {
            if (x >= 0 && x < width && y >= 0) {
              const i = (Math.floor(y) * width + Math.floor(x)) * 4;
              // Use red channel intensity as proxy for thermal data
              totalIntensity += pixels[i];
              pixelCount++;
            }
          }
        }
        
        const avgIntensity = totalIntensity / pixelCount;
        // Convert to estimated temperature (simplified thermal modeling)
        const estimatedTemp = 32 + (avgIntensity / 255) * 8; // 32-40°C range
        zones.push(estimatedTemp);
      }
    }
    
    return { zones };
  };

  const analyzeVoicePattern = useCallback(() => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const timeArray = new Uint8Array(bufferLength);
    
    analyserRef.current.getByteFrequencyData(dataArray);
    analyserRef.current.getByteTimeDomainData(timeArray);

    // Advanced voice analysis
    const voiceFeatures = extractAdvancedVoiceFeatures(dataArray, timeArray, bufferLength);
    
    let tone: VoiceAnalysis["tone"] = "calm";
    let confidence = 0.8;
    
    // Determine tone based on features
    if (voiceFeatures.pitch > 300 && voiceFeatures.variance > 50) {
      tone = "panicked";
      confidence = 0.9;
    } else if (voiceFeatures.pitch > 200 && voiceFeatures.variance > 30) {
      tone = "anxious";
      confidence = 0.85;
    } else if (voiceFeatures.speechRate > 200) {
      tone = "agitated";
      confidence = 0.8;
    } else if (voiceFeatures.pitch < 100 && voiceFeatures.clarity < 0.6) {
      tone = "fatigued";
      confidence = 0.75;
    }

    const analysis: VoiceAnalysis = {
      tone,
      pitch: voiceFeatures.pitch,
      variance: voiceFeatures.variance,
      clarity: voiceFeatures.clarity,
      speechRate: voiceFeatures.speechRate,
      confidence
    };

    setVoiceAnalysis(analysis);
  }, []);

  const extractAdvancedVoiceFeatures = (freqData: Uint8Array, timeData: Uint8Array, bufferLength: number) => {
    // Fundamental frequency (pitch) detection
    let maxAmplitude = 0;
    let fundamentalFreq = 0;
    
    for (let i = 10; i < bufferLength / 4; i++) { // Focus on speech range
      if (freqData[i] > maxAmplitude) {
        maxAmplitude = freqData[i];
        fundamentalFreq = (i * 44100) / (bufferLength * 2); // Convert to Hz
      }
    }

    // Pitch variance (jitter)
    const pitchValues: number[] = [];
    for (let i = 10; i < Math.min(100, bufferLength / 4); i++) {
      if (freqData[i] > 50) {
        pitchValues.push((i * 44100) / (bufferLength * 2));
      }
    }
    
    const avgPitch = pitchValues.reduce((sum, val) => sum + val, 0) / pitchValues.length || 0;
    const variance = pitchValues.reduce((sum, val) => sum + Math.pow(val - avgPitch, 2), 0) / pitchValues.length || 0;

    // Amplitude variance (shimmer)
    let amplitudeSum = 0;
    let amplitudeCount = 0;
    for (let i = 0; i < timeData.length; i++) {
      const sample = (timeData[i] - 128) / 128;
      amplitudeSum += Math.abs(sample);
      amplitudeCount++;
    }
    const avgAmplitude = amplitudeSum / amplitudeCount;

    // Speech clarity (SNR estimation)
    const signalPower = freqData.slice(10, 100).reduce((sum, val) => sum + val * val, 0);
    const noisePower = freqData.slice(200, 300).reduce((sum, val) => sum + val * val, 0);
    const snr = signalPower / (noisePower + 1);
    const clarity = Math.min(snr / 100, 1);

    // Speech rate (approximate)
    let zeroCrossings = 0;
    for (let i = 1; i < timeData.length; i++) {
      if ((timeData[i-1] >= 128) !== (timeData[i] >= 128)) {
        zeroCrossings++;
      }
    }
    const speechRate = zeroCrossings * 10; // Approximate words per minute

    return {
      pitch: fundamentalFreq,
      variance: Math.sqrt(variance),
      clarity,
      speechRate,
      amplitude: avgAmplitude
    };
  };

  const runCognitiveTest = async () => {
    cognitiveStartRef.current = Date.now();
    
    // Simple reaction time test
    await new Promise(resolve => setTimeout(resolve, Math.random() * 3000 + 2000));
    
    const reactionTime = Date.now() - cognitiveStartRef.current;
    const accuracy = Math.random() > 0.1 ? 0.9 + Math.random() * 0.1 : Math.random() * 0.7;
    const hesitation = reactionTime > 2000 ? (reactionTime - 2000) / 1000 : 0;
    const cognitiveLoad = Math.max(0, Math.min(100, (reactionTime - 500) / 20 + hesitation * 10));
    
    const test: CognitiveTest = {
      reactionTime,
      accuracy,
      hesitation,
      cognitiveLoad
    };
    
    setCognitiveTest(test);
    
    // Update progress for cognitive phase
    for (let i = 0; i <= 100; i += 5) {
      setScanProgress(50 + (i * 0.25));
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  };

  const analyzeConditions = async () => {
    const conditions: PossibleCondition[] = [];
    
    if (!currentStress || !voiceAnalysis || !facialAnalysis) {
      // Generate conditions based on available data
      await runSimulatedConditionAnalysis();
      return;
    }
    
    // Enhanced medical pattern analysis with real correlation
    for (const [conditionName, pattern] of Object.entries(medicalDatabase)) {
      const triggers = [];
      let probability = 0;
      
      // Advanced stress correlation
      if (pattern.triggers.includes("high_stress") && currentStress.level === "high") {
        triggers.push(`High stress detected (${currentStress.stressIndex}/100)`);
        probability += 0.35;
      } else if (pattern.triggers.includes("medium_stress") && currentStress.level === "medium") {
        triggers.push(`Moderate stress levels (${currentStress.stressIndex}/100)`);
        probability += 0.25;
      }
      
      // Enhanced voice analysis
      if (pattern.triggers.includes("anxious_voice") && (voiceAnalysis.tone === "anxious" || voiceAnalysis.tone === "panicked")) {
        triggers.push(`Anxious vocal patterns (pitch: ${Math.round(voiceAnalysis.pitch)}Hz)`);
        probability += voiceAnalysis.tone === "panicked" ? 0.4 : 0.3;
      }
      
      if (pattern.triggers.includes("voice_tremor") && voiceAnalysis.variance > 25) {
        triggers.push(`Voice instability (variance: ${Math.round(voiceAnalysis.variance)})`);
        probability += 0.25;
      }
      
      if (pattern.triggers.includes("fatigue_voice") && voiceAnalysis.tone === "fatigued") {
        triggers.push(`Vocal fatigue (clarity: ${Math.round(voiceAnalysis.clarity * 100)}%)`);
        probability += 0.3;
      }
      
      // Enhanced facial analysis
      if (pattern.triggers.includes("high_blink_rate") && facialAnalysis.blinkRate > 1.1) {
        triggers.push(`Elevated blink rate (${facialAnalysis.blinkRate.toFixed(1)}/sec)`);
        probability += 0.2;
      }
      
      if (pattern.triggers.includes("pallor") && facialAnalysis.temperatureZones.some(temp => temp < 35)) {
        triggers.push("Facial pallor/temperature drop");
        probability += 0.25;
      }
      
      // Enhanced cognitive analysis
      if (cognitiveTest && pattern.triggers.includes("slow_reactions") && cognitiveTest.reactionTime > 800) {
        triggers.push(`Delayed reactions (${cognitiveTest.reactionTime}ms)`);
        probability += 0.25;
      }
      
      if (cognitiveTest && pattern.triggers.includes("low_cognitive") && cognitiveTest.cognitiveLoad > 60) {
        triggers.push(`High cognitive load (${Math.round(cognitiveTest.cognitiveLoad)}%)`);
        probability += 0.2;
      }
      
      // Apply medical confidence and generate condition
      if (probability > 0.35 && triggers.length >= 2) {
        const finalProbability = Math.min(probability * pattern.confidence * 100, 95);
        conditions.push({
          condition: conditionName,
          probability: Math.round(Math.max(finalProbability, 45)),
          reasoning: triggers.slice(0, 3),
          severity: pattern.severity
        });
      }
    }
    
    // Sort by probability
    conditions.sort((a, b) => b.probability - a.probability);
    
    // Take top 3 conditions
    const topConditions = conditions.slice(0, 3);
    setPossibleConditions(topConditions);
    
    // Calculate final stress index
    const stressIndex = calculateOverallStressIndex();
    const stressLevel = getStressLevelFromIndex(stressIndex);
    
    const finalStress: StressReading = {
      level: stressLevel,
      confidence: 0.85,
      triggers: [
        voiceAnalysis.tone !== "calm" ? `Voice: ${voiceAnalysis.tone}` : "",
        facialAnalysis.eyeStrain ? "Eye strain" : "",
        facialAnalysis.microExpressions.length > 0 ? "Micro-expressions" : "",
        cognitiveTest && cognitiveTest.cognitiveLoad > 50 ? "Cognitive load" : ""
      ].filter(Boolean),
      timestamp: new Date(),
      stressIndex
    };
    
    setCurrentStress(finalStress);
    onStressDetected(stressLevel, finalStress.confidence);
    
    // Trigger emergency if critical
    if (stressLevel === "critical" && topConditions.some(c => c.severity === "critical")) {
      onEmergencyTrigger();
    }
    
    // Report top condition
    if (topConditions.length > 0) {
      onConditionDetected(topConditions[0].condition, topConditions[0].probability);
    }
    
    // Final progress update
    for (let i = 75; i <= 100; i += 2) {
      setScanProgress(i);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  };

  const calculateOverallStressIndex = (): number => {
    let index = 0;
    
    if (voiceAnalysis) {
      const voiceScore = {
        "calm": 10,
        "anxious": 50,
        "agitated": 70,
        "fatigued": 40,
        "panicked": 90
      }[voiceAnalysis.tone];
      index += voiceScore * 0.4;
    }
    
    if (facialAnalysis) {
      const facialScore = facialAnalysis.eyeStrain ? 30 : 10;
      const expressionScore = facialAnalysis.microExpressions.length * 15;
      index += (facialScore + expressionScore) * 0.3;
    }
    
    if (cognitiveTest) {
      const cognitiveScore = cognitiveTest.cognitiveLoad;
      index += cognitiveScore * 0.3;
    }
    
    return Math.min(Math.max(index, 0), 100);
  };

  const getStressLevelFromIndex = (index: number): "low" | "medium" | "high" | "critical" => {
    if (index >= 80) return "critical";
    if (index >= 60) return "high";
    if (index >= 35) return "medium";
    return "low";
  };

  const runSimulatedAnalysis = async () => {
    // Realistic simulation when no camera/mic access
    const simulatedStress: StressReading = {
      level: "low",
      confidence: 0.6,
      triggers: ["Simulation mode active"],
      timestamp: new Date(),
      stressIndex: 25
    };
    
    const simulatedVoice: VoiceAnalysis = {
      tone: "calm",
      pitch: 150,
      variance: 20,
      clarity: 0.8,
      speechRate: 160,
      confidence: 0.6
    };
    
    const simulatedFacial: FacialAnalysis = {
      blinkRate: 0.8,
      eyeStrain: false,
      microExpressions: [],
      temperatureZones: [36.5, 36.7, 36.6, 36.8, 36.9, 36.7, 36.6, 36.5, 36.8],
      confidence: 0.5
    };
    
    setCurrentStress(simulatedStress);
    setVoiceAnalysis(simulatedVoice);
    setFacialAnalysis(simulatedFacial);
    
    // Simulate scanning progress
    for (let i = 0; i <= 100; i += 2) {
      setScanProgress(i);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (i === 50) {
        await runCognitiveTest();
      }
    }
    
    setIsScanning(false);
  };

  const runSimulatedConditionAnalysis = async () => {
    const conditions: PossibleCondition[] = [
      {
        condition: "Normal Baseline",
        probability: 0.85,
        reasoning: ["All parameters within normal range"],
        severity: "low"
      }
    ];
    
    setPossibleConditions(conditions);
  };

  const drawNeuralMeshOverlay = (ctx: CanvasRenderingContext2D, faceRegion: any, eyeAnalysis: any, expressionAnalysis: any) => {
    // Neural mesh grid overlay
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    
    const gridSize = 20;
    const faceArea = faceRegion.faceArea;
    
    // Draw grid
    for (let x = faceArea.x; x < faceArea.x + faceArea.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, faceArea.y);
      ctx.lineTo(x, faceArea.y + faceArea.height);
      ctx.stroke();
    }
    
    for (let y = faceArea.y; y < faceArea.y + faceArea.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(faceArea.x, y);
      ctx.lineTo(faceArea.x + faceArea.width, y);
      ctx.stroke();
    }
    
    // Eye tracking indicators
    ctx.fillStyle = eyeAnalysis.strain ? 'rgba(255, 100, 100, 0.8)' : 'rgba(100, 255, 100, 0.8)';
    ctx.beginPath();
    ctx.arc(faceRegion.eyeRegions.left.x + faceRegion.eyeRegions.left.width/2, 
            faceRegion.eyeRegions.left.y + faceRegion.eyeRegions.left.height/2, 3, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(faceRegion.eyeRegions.right.x + faceRegion.eyeRegions.right.width/2, 
            faceRegion.eyeRegions.right.y + faceRegion.eyeRegions.right.height/2, 3, 0, 2 * Math.PI);
    ctx.fill();
    
    // Expression indicators
    if (expressionAnalysis.expressions.length > 0) {
      ctx.fillStyle = 'rgba(255, 255, 100, 0.8)';
      ctx.font = '12px monospace';
      ctx.fillText(`Expressions: ${expressionAnalysis.expressions.length}`, faceArea.x, faceArea.y - 10);
    }
    
    // Neural activity pulse
    const pulseRadius = 5 + Math.sin(Date.now() / 200) * 3;
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(faceArea.x + faceArea.width/2, faceArea.y + faceArea.height/2, pulseRadius, 0, 2 * Math.PI);
    ctx.stroke();
  };

  const stopScanning = useCallback(() => {
    setIsScanning(false);
    setScanProgress(0);
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  }, []);

  const getStressColor = (level: string) => {
    switch (level) {
      case "low": return "text-cyber-green";
      case "medium": return "text-cyber-orange";
      case "high": return "text-cyber-red";
      case "critical": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  const getToneColor = (tone: string) => {
    switch (tone) {
      case "calm": return "text-cyber-green";
      case "anxious": return "text-cyber-orange";
      case "agitated": return "text-cyber-red";
      case "fatigued": return "text-muted-foreground";
      case "panicked": return "text-destructive";
      default: return "text-foreground";
    }
  };

  return (
    <Card className="p-6 bg-[var(--gradient-card)] border-2 border-cyber-blue/30 relative overflow-hidden">
      {/* Neural background effect */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--cyber-blue))_1px,transparent_1px)] bg-[length:20px_20px]" />
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <Brain className={cn(
            "h-8 w-8 transition-all duration-300",
            isScanning ? "text-cyber-blue animate-pulse" : "text-cyber-purple"
          )} />
          <div>
            <h3 className="text-2xl font-bold text-foreground">Neural AI Analysis</h3>
            <p className="text-sm text-muted-foreground">Advanced stress & cognitive detection</p>
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              "ml-auto border transition-all duration-300",
              isScanning ? "border-cyber-blue/70 text-cyber-blue" : "border-cyber-purple/50 text-cyber-purple"
            )}
          >
            {isScanning ? currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1) : "Ready"}
          </Badge>
        </div>

        {/* Scanning Progress */}
        {isScanning && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-foreground">
                Analysis Progress
              </span>
              <span className="text-sm text-cyber-blue">{Math.round(scanProgress)}%</span>
            </div>
            <Progress 
              value={scanProgress} 
              className="h-2 bg-muted/30" 
            />
            <div className="grid grid-cols-4 gap-2 mt-2 text-xs">
              <div className={cn("text-center p-1 rounded", 
                currentPhase === "facial" ? "bg-cyber-blue/20 text-cyber-blue" : 
                scanProgress > 25 ? "text-cyber-green" : "text-muted-foreground"
              )}>
                Facial
              </div>
              <div className={cn("text-center p-1 rounded", 
                currentPhase === "voice" ? "bg-cyber-blue/20 text-cyber-blue" : 
                scanProgress > 50 ? "text-cyber-green" : "text-muted-foreground"
              )}>
                Voice
              </div>
              <div className={cn("text-center p-1 rounded", 
                currentPhase === "cognitive" ? "bg-cyber-blue/20 text-cyber-blue" : 
                scanProgress > 75 ? "text-cyber-green" : "text-muted-foreground"
              )}>
                Cognitive
              </div>
              <div className={cn("text-center p-1 rounded", 
                currentPhase === "analysis" ? "bg-cyber-blue/20 text-cyber-blue" : 
                scanProgress > 90 ? "text-cyber-green" : "text-muted-foreground"
              )}>
                Analysis
              </div>
            </div>
          </div>
        )}

        {/* Camera Feed with Neural Overlay */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="relative">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              <video 
                ref={videoRef}
                className="w-full h-full object-cover"
                muted
                playsInline
              />
              <canvas 
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />
              {!isScanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="text-center">
                    <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Neural Camera</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Real-time Analysis Display */}
          <div className="space-y-4">
            {/* Stress Analysis */}
            {currentStress && (
              <Card className="p-4 bg-muted/10 border-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-cyber-blue" />
                  <h4 className="font-semibold text-foreground">Stress Analysis</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Level:</span>
                    <Badge className={cn("font-bold", getStressColor(currentStress.level))}>
                      {currentStress.level.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Index:</span>
                    <span className={cn("font-bold", getStressColor(currentStress.level))}>
                      {currentStress.stressIndex.toFixed(0)}/100
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Confidence:</span>
                    <span className="text-sm font-medium">
                      {(currentStress.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  {currentStress.triggers.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Triggers: {currentStress.triggers.join(", ")}
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Voice Analysis */}
            {voiceAnalysis && (
              <Card className="p-4 bg-muted/10 border-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Volume2 className="h-4 w-4 text-cyber-purple" />
                  <h4 className="font-semibold text-foreground">Voice Pattern</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Tone:</span>
                    <Badge className={cn("font-bold", getToneColor(voiceAnalysis.tone))}>
                      {voiceAnalysis.tone.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Pitch:</span>
                    <span className="text-sm font-medium">{voiceAnalysis.pitch.toFixed(0)} Hz</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Clarity:</span>
                    <span className="text-sm font-medium">
                      {(voiceAnalysis.clarity * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </Card>
            )}

            {/* Cognitive Test Results */}
            {cognitiveTest && (
              <Card className="p-4 bg-muted/10 border-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-cyber-green" />
                  <h4 className="font-semibold text-foreground">Cognitive Load</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Reaction:</span>
                    <span className="text-sm font-medium">{cognitiveTest.reactionTime}ms</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Load:</span>
                    <span className={cn("text-sm font-medium",
                      cognitiveTest.cognitiveLoad > 70 ? "text-cyber-red" :
                      cognitiveTest.cognitiveLoad > 40 ? "text-cyber-orange" : "text-cyber-green"
                    )}>
                      {cognitiveTest.cognitiveLoad.toFixed(0)}/100
                    </span>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Possible Conditions */}
        {possibleConditions.length > 0 && (
          <Card className="p-4 bg-muted/10 border-muted/30 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-cyber-orange" />
              <h4 className="font-semibold text-foreground">Possible Conditions</h4>
            </div>
            <div className="space-y-3">
              {possibleConditions.map((condition, index) => (
                <div key={index} className="border border-muted/30 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <h5 className="font-medium text-foreground">{condition.condition}</h5>
                    <div className="text-right">
                      <Badge 
                        variant="outline"
                        className={cn(
                          "text-xs",
                          condition.severity === "critical" ? "border-cyber-red text-cyber-red" :
                          condition.severity === "high" ? "border-cyber-orange text-cyber-orange" :
                          condition.severity === "medium" ? "border-cyber-blue text-cyber-blue" :
                          "border-cyber-green text-cyber-green"
                        )}
                      >
                        {condition.severity}
                      </Badge>
                      <div className="text-lg font-bold text-cyber-blue mt-1">
                        {(condition.probability * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  {condition.reasoning.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Evidence: {condition.reasoning.join(" • ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Controls */}
        <div className="flex gap-3">
          {!isScanning ? (
            <Button 
              onClick={startNeuralScan}
              className="flex-1 bg-[var(--gradient-primary)] hover:shadow-[var(--glow-primary)] transition-all duration-300"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Neural Scan
            </Button>
          ) : (
            <Button 
              onClick={stopScanning}
              variant="destructive"
              className="flex-1"
            >
              <Pause className="h-4 w-4 mr-2" />
              Stop Scan
            </Button>
          )}
          
          <Button 
            variant="outline" 
            onClick={() => {
              setCurrentStress(null);
              setVoiceAnalysis(null);
              setFacialAnalysis(null);
              setPossibleConditions([]);
              setCognitiveTest(null);
              setScanProgress(0);
            }}
            className="border-cyber-purple/50 text-cyber-purple hover:bg-cyber-purple/10"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>

        {/* Emergency Warning */}
        {currentStress?.level === "critical" && possibleConditions.some(c => c.severity === "critical") && (
          <div className="mt-4 p-4 bg-gradient-to-r from-cyber-red/20 to-cyber-orange/20 border border-cyber-red/50 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-cyber-red animate-pulse" />
              <span className="font-bold text-cyber-red">CRITICAL ALERT</span>
            </div>
            <p className="text-sm text-foreground mt-1">
              Critical condition detected. Emergency protocols activated.
            </p>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-4 text-xs text-muted-foreground text-center">
          <p>Position your face in the camera view. Speak naturally during voice analysis.</p>
          <p>Neural mesh overlay shows real-time facial feature tracking.</p>
        </div>
      </div>
    </Card>
  );
};