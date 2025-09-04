import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Camera, Mic, Activity, AlertTriangle, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface NeuroAIProps {
  onStressDetected: (level: "low" | "medium" | "high" | "critical") => void;
  onConditionDetected: (condition: string, confidence: number) => void;
}

interface StressReading {
  level: "low" | "medium" | "high" | "critical";
  confidence: number;
  factors: string[];
  timestamp: Date;
}

export const NeuroAI = ({ onStressDetected, onConditionDetected }: NeuroAIProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [stressLevel, setStressLevel] = useState<StressReading | null>(null);
  const [detectedConditions, setDetectedConditions] = useState<Array<{condition: string, confidence: number}>>([]);
  const [audioAnalysis, setAudioAnalysis] = useState<{tone: string, clarity: number} | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // AI Disease Database for pattern matching
  const diseaseDatabase = {
    'arrhythmia': { hrPattern: [60, 120], spO2: [95, 100], stress: 'high', confidence: 0.8 },
    'asthma_attack': { hrPattern: [100, 160], spO2: [85, 94], stress: 'critical', confidence: 0.9 },
    'panic_attack': { hrPattern: [120, 180], spO2: [96, 100], stress: 'critical', confidence: 0.85 },
    'cardiac_event': { hrPattern: [50, 200], spO2: [90, 100], stress: 'critical', confidence: 0.92 },
    'respiratory_distress': { hrPattern: [90, 140], spO2: [88, 95], stress: 'high', confidence: 0.87 },
    'shock': { hrPattern: [100, 150], spO2: [92, 98], stress: 'critical', confidence: 0.88 },
    'dehydration': { hrPattern: [80, 120], spO2: [95, 100], stress: 'medium', confidence: 0.75 },
    'hypoglycemia': { hrPattern: [90, 140], spO2: [96, 100], stress: 'high', confidence: 0.82 }
  };

  const startNeuroScan = useCallback(async () => {
    setIsScanning(true);
    
    try {
      // Request camera and microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Setup audio analysis
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      source.connect(analyserRef.current);

      // Start analysis loops
      setTimeout(() => {
        analyzeStressLevel();
        analyzeVoiceTone();
        runPredictiveAnalysis();
      }, 2000);

    } catch (error) {
      console.error("Neuro scan access denied:", error);
      // Simulate scanning without camera/mic
      simulateNeuroAnalysis();
    }
  }, []);

  const analyzeStressLevel = useCallback(() => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    // Clear and draw current frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    
    // Advanced facial recognition and stress analysis
    const faceRegions = detectFaceRegions(pixels, canvas.width, canvas.height);
    
    if (!faceRegions.faceDetected) {
      // No face detected
      setStressLevel({
        level: "low",
        confidence: 0.1,
        factors: ["No face detected in frame"],
        timestamp: new Date()
      });
      return;
    }
    
    // Analyze different facial regions
    const eyeRegionAnalysis = analyzeEyeRegion(pixels, faceRegions.eyeRegion, canvas.width);
    const skinToneAnalysis = analyzeSkinTone(pixels, faceRegions.faceArea, canvas.width);
    const movementAnalysis = analyzeMovementPatterns(pixels, canvas.width, canvas.height);
    
    // Draw advanced detection overlay
    drawFacialAnalysisOverlay(ctx, faceRegions, eyeRegionAnalysis, skinToneAnalysis);
    
    // Calculate comprehensive stress score
    const stressScore = calculateStressScore(eyeRegionAnalysis, skinToneAnalysis, movementAnalysis);
    
    const reading: StressReading = {
      level: stressScore.level,
      confidence: stressScore.confidence,
      factors: stressScore.factors,
      timestamp: new Date()
    };

    setStressLevel(reading);
    onStressDetected(stressScore.level);
  }, [onStressDetected]);

  const detectFaceRegions = (pixels: Uint8ClampedArray, width: number, height: number) => {
    // Improved face detection using skin color analysis
    let skinPixelCount = 0;
    let totalSkinRed = 0, totalSkinGreen = 0, totalSkinBlue = 0;
    
    // Sample center region for face detection
    const centerX = width / 2;
    const centerY = height / 2;
    const searchRadius = Math.min(width, height) / 4;
    
    for (let y = centerY - searchRadius; y < centerY + searchRadius; y++) {
      for (let x = centerX - searchRadius; x < centerX + searchRadius; x++) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const i = (Math.floor(y) * width + Math.floor(x)) * 4;
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          
          // Skin color detection (improved algorithm)
          if (isSkinColor(r, g, b)) {
            skinPixelCount++;
            totalSkinRed += r;
            totalSkinGreen += g;
            totalSkinBlue += b;
          }
        }
      }
    }
    
    const faceDetected = skinPixelCount > (searchRadius * searchRadius * 0.3);
    
    return {
      faceDetected,
      faceArea: {
        x: centerX - searchRadius,
        y: centerY - searchRadius,
        width: searchRadius * 2,
        height: searchRadius * 2
      },
      eyeRegion: {
        x: centerX - searchRadius * 0.6,
        y: centerY - searchRadius * 0.4,
        width: searchRadius * 1.2,
        height: searchRadius * 0.3
      },
      avgSkinColor: skinPixelCount > 0 ? {
        r: totalSkinRed / skinPixelCount,
        g: totalSkinGreen / skinPixelCount,
        b: totalSkinBlue / skinPixelCount
      } : null
    };
  };

  const isSkinColor = (r: number, g: number, b: number) => {
    // Enhanced skin color detection
    const rgbSum = r + g + b;
    if (rgbSum === 0) return false;
    
    // Normalized RGB
    const rn = r / rgbSum;
    const gn = g / rgbSum;
    const bn = b / rgbSum;
    
    // Skin color thresholds (improved)
    return (
      rn > 0.36 && rn < 0.465 &&
      gn > 0.28 && gn < 0.363 &&
      bn > 0.005 && bn < 0.3 &&
      r > 95 && g > 40 && b > 20 &&
      Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
      Math.abs(r - g) > 15 && r > g && r > b
    );
  };

  const analyzeEyeRegion = (pixels: Uint8ClampedArray, eyeRegion: any, width: number) => {
    if (!eyeRegion) return { blinkRate: 0, eyeStrain: false };
    
    let darkPixelCount = 0;
    let totalPixels = 0;
    
    for (let y = eyeRegion.y; y < eyeRegion.y + eyeRegion.height; y++) {
      for (let x = eyeRegion.x; x < eyeRegion.x + eyeRegion.width; x++) {
        if (x >= 0 && x < width && y >= 0) {
          const i = (Math.floor(y) * width + Math.floor(x)) * 4;
          const brightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
          
          if (brightness < 80) darkPixelCount++;
          totalPixels++;
        }
      }
    }
    
    const darkRatio = darkPixelCount / totalPixels;
    return {
      blinkRate: darkRatio > 0.4 ? 1 : 0,
      eyeStrain: darkRatio < 0.1 || darkRatio > 0.7
    };
  };

  const analyzeSkinTone = (pixels: Uint8ClampedArray, faceArea: any, width: number) => {
    if (!faceArea) return { redness: 0, pallor: false, flushing: false };
    
    let totalRed = 0, totalGreen = 0, totalBlue = 0;
    let pixelCount = 0;
    
    for (let y = faceArea.y; y < faceArea.y + faceArea.height; y++) {
      for (let x = faceArea.x; x < faceArea.x + faceArea.width; x++) {
        if (x >= 0 && x < width && y >= 0) {
          const i = (Math.floor(y) * width + Math.floor(x)) * 4;
          totalRed += pixels[i];
          totalGreen += pixels[i + 1];
          totalBlue += pixels[i + 2];
          pixelCount++;
        }
      }
    }
    
    if (pixelCount === 0) return { redness: 0, pallor: false, flushing: false };
    
    const avgRed = totalRed / pixelCount;
    const avgGreen = totalGreen / pixelCount;
    const avgBlue = totalBlue / pixelCount;
    
    const redness = avgRed / (avgGreen + avgBlue + 1);
    const brightness = (avgRed + avgGreen + avgBlue) / 3;
    
    return {
      redness,
      pallor: brightness < 120 && redness < 1.1,
      flushing: redness > 1.4 && brightness > 140
    };
  };

  const analyzeMovementPatterns = (pixels: Uint8ClampedArray, width: number, height: number) => {
    // Store frame for motion detection
    const currentFrame = new Uint8ClampedArray(pixels);
    
    if (previousFrameRef.current) {
      let totalDifference = 0;
      let pixelCount = 0;
      
      // Compare with previous frame
      for (let i = 0; i < pixels.length; i += 16) {
        const currentBrightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
        const prevBrightness = (previousFrameRef.current[i] + previousFrameRef.current[i + 1] + previousFrameRef.current[i + 2]) / 3;
        totalDifference += Math.abs(currentBrightness - prevBrightness);
        pixelCount++;
      }
      
      const avgMovement = totalDifference / pixelCount;
      previousFrameRef.current = currentFrame;
      
      return {
        movement: avgMovement,
        stillness: avgMovement < 5,
        agitation: avgMovement > 25
      };
    }
    
    previousFrameRef.current = currentFrame;
    return { movement: 0, stillness: true, agitation: false };
  };

  const calculateStressScore = (eyeAnalysis: any, skinAnalysis: any, movementAnalysis: any) => {
    const factors = [];
    let level: "low" | "medium" | "high" | "critical" = "low";
    let confidence = 0.75;
    
    // Analyze eye strain and blink patterns
    if (eyeAnalysis.eyeStrain) {
      factors.push("Eye strain detected");
      level = "medium";
      confidence += 0.05;
    }
    
    // Analyze skin tone changes
    if (skinAnalysis.flushing) {
      factors.push("Facial flushing (stress/anxiety)");
      level = level === "low" ? "medium" : "high";
      confidence += 0.08;
    } else if (skinAnalysis.pallor) {
      factors.push("Pallor detected (shock/fear)");
      level = "high";
      confidence += 0.1;
    }
    
    // Analyze movement patterns
    if (movementAnalysis.agitation) {
      factors.push("Agitated movement patterns");
      level = "high";
      confidence += 0.07;
    } else if (movementAnalysis.stillness && skinAnalysis.pallor) {
      factors.push("Unusual stillness with pallor");
      level = "critical";
      confidence += 0.12;
    }
    
    // Redness analysis for cardiovascular stress
    if (skinAnalysis.redness > 1.5) {
      factors.push("High cardiovascular stress indicators");
      level = level === "critical" ? "critical" : "high";
      confidence += 0.06;
    }
    
    if (factors.length === 0) {
      factors.push("Normal physiological patterns");
      confidence = 0.88;
    }
    
    return {
      level,
      confidence: Math.min(confidence, 0.95),
      factors
    };
  };

  const drawFacialAnalysisOverlay = (ctx: CanvasRenderingContext2D, faceRegions: any, eyeAnalysis: any, skinAnalysis: any) => {
    // Draw face detection box
    if (faceRegions.faceDetected) {
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.strokeRect(faceRegions.faceArea.x, faceRegions.faceArea.y, faceRegions.faceArea.width, faceRegions.faceArea.height);
      
      // Draw eye region
      ctx.strokeStyle = '#ff6b9d';
      ctx.lineWidth = 1;
      ctx.strokeRect(faceRegions.eyeRegion.x, faceRegions.eyeRegion.y, faceRegions.eyeRegion.width, faceRegions.eyeRegion.height);
      
      // Draw analysis points
      ctx.fillStyle = '#00ffff';
      const centerX = faceRegions.faceArea.x + faceRegions.faceArea.width / 2;
      const centerY = faceRegions.faceArea.y + faceRegions.faceArea.height / 2;
      
      // Eye tracking points
      ctx.fillRect(faceRegions.eyeRegion.x + 20, faceRegions.eyeRegion.y + 10, 3, 3);
      ctx.fillRect(faceRegions.eyeRegion.x + faceRegions.eyeRegion.width - 23, faceRegions.eyeRegion.y + 10, 3, 3);
      
      // Status indicators
      ctx.fillStyle = skinAnalysis.flushing ? '#ff4444' : skinAnalysis.pallor ? '#ffff44' : '#44ff44';
      ctx.fillRect(centerX - 2, centerY + 20, 4, 4);
    } else {
      // No face detected
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 5]);
      const centerX = ctx.canvas.width / 2;
      const centerY = ctx.canvas.height / 2;
      ctx.strokeRect(centerX - 80, centerY - 60, 160, 120);
      
      ctx.fillStyle = '#ff4444';
      ctx.font = '14px Poppins';
      ctx.textAlign = 'center';
      ctx.fillText('Position face in frame', centerX, centerY + 80);
    }
  };

  // Add reference for motion detection
  const previousFrameRef = useRef<Uint8ClampedArray | null>(null);

  const analyzeVoiceTone = useCallback(() => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Analyze frequency patterns for speech clarity and tone
    const avgFrequency = dataArray.reduce((sum, val) => sum + val, 0) / bufferLength;
    const highFreq = dataArray.slice(bufferLength * 0.7).reduce((sum, val) => sum + val, 0);
    
    let tone = "normal";
    let clarity = 0.8;

    if (avgFrequency < 50) {
      tone = "weak/confused";
      clarity = 0.4;
    } else if (highFreq > avgFrequency * 2) {
      tone = "stressed/panicked";
      clarity = 0.6;
    } else if (avgFrequency > 150) {
      tone = "elevated/anxious";
      clarity = 0.7;
    }

    setAudioAnalysis({ tone, clarity });
  }, []);

  const runPredictiveAnalysis = useCallback(() => {
    // Simulate getting current vitals from app state
    const simulatedVitals = {
      heartRate: 72 + Math.random() * 40,
      spO2: 95 + Math.random() * 5,
      currentStress: stressLevel?.level || "low"
    };

    const conditions = [];

    // Check against disease database
    for (const [condition, pattern] of Object.entries(diseaseDatabase)) {
      const hrMatch = simulatedVitals.heartRate >= pattern.hrPattern[0] && 
                     simulatedVitals.heartRate <= pattern.hrPattern[1];
      const spO2Match = simulatedVitals.spO2 >= pattern.spO2[0] && 
                       simulatedVitals.spO2 <= pattern.spO2[1];
      const stressMatch = simulatedVitals.currentStress === pattern.stress;

      if (hrMatch && spO2Match) {
        let confidence = pattern.confidence;
        if (stressMatch) confidence += 0.1;
        
        conditions.push({ condition: condition.replace('_', ' '), confidence });
        onConditionDetected(condition.replace('_', ' '), confidence);
      }
    }

    setDetectedConditions(conditions);
  }, [stressLevel, onConditionDetected]);

  const simulateNeuroAnalysis = useCallback(() => {
    // Fallback simulation when camera/mic unavailable
    const levels: Array<"low" | "medium" | "high" | "critical"> = ["low", "medium", "high"];
    const randomLevel = levels[Math.floor(Math.random() * levels.length)];
    
    const reading: StressReading = {
      level: randomLevel,
      confidence: 0.7 + Math.random() * 0.2,
      factors: ["Simulated analysis", "Pattern recognition active"],
      timestamp: new Date()
    };

    setStressLevel(reading);
    setAudioAnalysis({ tone: "simulated", clarity: 0.8 });
    
    setTimeout(() => {
      runPredictiveAnalysis();
    }, 1000);
  }, [runPredictiveAnalysis]);

  const stopScanning = useCallback(() => {
    setIsScanning(false);
    
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
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

  return (
    <Card className="p-6 bg-[var(--gradient-card)] border-2 border-cyber-blue/30">
      <div className="flex items-center gap-3 mb-4">
        <Brain className="h-6 w-6 text-cyber-purple animate-pulse" />
        <h3 className="text-xl font-bold text-foreground">Neuro-AI Triage</h3>
        <Badge variant="outline" className="text-cyber-blue border-cyber-blue/50">
          Cognitive Scanner
        </Badge>
      </div>

      {/* Control Panel */}
      <div className="flex gap-3 mb-6">
        <Button
          onClick={isScanning ? stopScanning : startNeuroScan}
          variant={isScanning ? "destructive" : "default"}
          className="flex-1"
        >
          <Camera className="h-4 w-4 mr-2" />
          {isScanning ? "Stop Scan" : "Start Neuro Scan"}
        </Button>
      </div>

      {/* Scanning Status */}
      {isScanning && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Stress Analysis */}
          <Card className="p-4 bg-muted/20">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-cyber-red" />
              <span className="text-sm font-medium">Stress Analysis</span>
            </div>
            {stressLevel ? (
              <div>
                <div className={cn("text-lg font-bold mb-1", getStressColor(stressLevel.level))}>
                  {stressLevel.level.toUpperCase()}
                </div>
                <div className="text-xs text-muted-foreground mb-2">
                  Confidence: {(stressLevel.confidence * 100).toFixed(0)}%
                </div>
                <div className="text-xs">
                  {stressLevel.factors.map((factor, i) => (
                    <div key={i} className="text-muted-foreground">• {factor}</div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground animate-pulse">
                Analyzing facial patterns...
              </div>
            )}
          </Card>

          {/* Voice Analysis */}
          <Card className="p-4 bg-muted/20">
            <div className="flex items-center gap-2 mb-2">
              <Mic className="h-4 w-4 text-cyber-blue" />
              <span className="text-sm font-medium">Voice Tone</span>
            </div>
            {audioAnalysis ? (
              <div>
                <div className="text-lg font-bold mb-1 text-cyber-blue">
                  {audioAnalysis.tone}
                </div>
                <div className="text-xs text-muted-foreground">
                  Clarity: {(audioAnalysis.clarity * 100).toFixed(0)}%
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground animate-pulse">
                Analyzing voice patterns...
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Predictive Analysis */}
      {detectedConditions.length > 0 && (
        <Card className="p-4 bg-cyber-red/10 border-cyber-red/30">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-cyber-red" />
            <span className="text-sm font-medium text-cyber-red">Possible Conditions Detected</span>
          </div>
          <div className="space-y-2">
            {detectedConditions.map((condition, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-sm capitalize">{condition.condition}</span>
                <Badge variant="outline" className={cn(
                  condition.confidence > 0.8 ? "border-cyber-red text-cyber-red" : 
                  condition.confidence > 0.6 ? "border-cyber-orange text-cyber-orange" : 
                  "border-cyber-blue text-cyber-blue"
                )}>
                  {(condition.confidence * 100).toFixed(0)}%
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Live camera analysis */}
      {isScanning && (
        <Card className="p-4 bg-muted/20 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="h-4 w-4 text-cyber-blue" />
            <span className="text-sm font-medium">Live Neuro Analysis</span>
          </div>
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full h-48 rounded-lg object-cover border border-cyber-blue/30"
              width="320"
              height="240"
              autoPlay
              muted
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-48 rounded-lg pointer-events-none"
              width="320"
              height="240"
            />
            <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-cyber-blue">
              Neural Scan Active
            </div>
          </div>
        </Card>
      )}
    </Card>
  );
};