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

    // Simulate facial analysis for stress detection
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Analyze pixel variations (simulated stress indicators)
    const brightness = Array.from(imageData.data)
      .filter((_, i) => i % 4 === 0)
      .reduce((sum, val) => sum + val, 0) / (imageData.data.length / 4);

    const stressFactors = [];
    let level: "low" | "medium" | "high" | "critical" = "low";
    let confidence = 0.7;

    // Simulate stress analysis based on visual cues
    if (brightness < 100) {
      stressFactors.push("Poor lighting detected");
      level = "medium";
      confidence = 0.6;
    } else if (brightness > 200) {
      stressFactors.push("Excessive brightness/sweating");
      level = "high";
      confidence = 0.8;
    }

    // Add simulated micro-expressions analysis
    const randomStress = Math.random();
    if (randomStress > 0.8) {
      stressFactors.push("Rapid eye movement");
      level = "high";
      confidence = 0.85;
    } else if (randomStress > 0.6) {
      stressFactors.push("Muscle tension detected");
      level = "medium";
      confidence = 0.75;
    }

    const reading: StressReading = {
      level,
      confidence,
      factors: stressFactors.length > 0 ? stressFactors : ["Normal stress levels"],
      timestamp: new Date()
    };

    setStressLevel(reading);
    onStressDetected(level);
  }, [onStressDetected]);

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

      {/* Hidden video for camera analysis */}
      <video
        ref={videoRef}
        className="hidden"
        width="320"
        height="240"
        autoPlay
        muted
      />
      <canvas
        ref={canvasRef}
        className="hidden"
        width="320"
        height="240"
      />
    </Card>
  );
};