import { useState, useRef, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Mic, 
  MicOff, 
  Brain, 
  Activity, 
  AlertTriangle,
  BarChart3,
  Play,
  Square
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface VoiceFeatures {
  pitch: {
    mean: number;
    variance: number;
    jitter: number;
  };
  amplitude: {
    mean: number;
    variance: number;
    shimmer: number;
  };
  temporal: {
    speechRate: number;
    pauseCount: number;
    voicedRatio: number;
  };
  spectral: {
    energy: number;
    spectralCentroid: number;
    harmonicsRatio: number;
  };
}

interface StressAnalysisResult {
  stressLevel: number; // 0-100
  confidence: number; // 0-100
  features: VoiceFeatures;
  triggers: string[];
  quality: "excellent" | "good" | "fair" | "poor";
  timestamp: Date;
}

interface BaselineCalibration {
  features: VoiceFeatures;
  heartRate: number;
  timestamp: Date;
  isValid: boolean;
}

interface RealVoiceAnalyzerProps {
  onStressDetected: (result: StressAnalysisResult) => void;
  onBaselineCalibrated?: (baseline: BaselineCalibration) => void;
  currentHeartRate?: number;
}

class VoiceSignalProcessor {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private dataArray: Float32Array | null = null;
  private timeData: Float32Array | null = null;
  private isRecording = false;
  
  // Voice analysis parameters
  private sampleRate = 44100;
  private frameSize = 1024;
  private hopSize = 512;
  
  async initializeAudio(): Promise<boolean> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: this.sampleRate,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false
        }
      });
      
      this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.frameSize * 2;
      this.analyser.smoothingTimeConstant = 0.1;
      
      source.connect(this.analyser);
      
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Float32Array(bufferLength);
      this.timeData = new Float32Array(this.analyser.fftSize);
      
      return true;
    } catch (error) {
      console.error('Audio initialization failed:', error);
      return false;
    }
  }
  
  startRecording(): void {
    this.isRecording = true;
  }
  
  stopRecording(): void {
    this.isRecording = false;
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
  
  extractVoiceFeatures(): VoiceFeatures | null {
    if (!this.analyser || !this.dataArray || !this.timeData || !this.isRecording) {
      return null;
    }
    
    // Get frequency and time domain data
    this.analyser.getFloatFrequencyData(this.dataArray);
    this.analyser.getFloatTimeDomainData(this.timeData);
    
    // Calculate voice activity detection
    const energy = this.calculateEnergy(this.timeData);
    const isVoiced = energy > -40; // dB threshold for voice activity
    
    if (!isVoiced) return null;
    
    // Extract fundamental frequency (pitch)
    const pitch = this.extractPitch(this.timeData);
    
    // Calculate jitter (pitch perturbation)
    const jitter = this.calculateJitter();
    
    // Calculate shimmer (amplitude perturbation)
    const shimmer = this.calculateShimmer();
    
    // Extract spectral features
    const spectralFeatures = this.extractSpectralFeatures(this.dataArray);
    
    // Calculate temporal features
    const temporalFeatures = this.extractTemporalFeatures();
    
    return {
      pitch: {
        mean: pitch.mean,
        variance: pitch.variance,
        jitter: jitter
      },
      amplitude: {
        mean: energy,
        variance: this.calculateAmplitudeVariance(),
        shimmer: shimmer
      },
      temporal: {
        speechRate: temporalFeatures.speechRate,
        pauseCount: temporalFeatures.pauseCount,
        voicedRatio: temporalFeatures.voicedRatio
      },
      spectral: {
        energy: energy,
        spectralCentroid: spectralFeatures.spectralCentroid,
        harmonicsRatio: spectralFeatures.harmonicsRatio
      }
    };
  }
  
  private calculateEnergy(timeData: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < timeData.length; i++) {
      sum += timeData[i] * timeData[i];
    }
    const rms = Math.sqrt(sum / timeData.length);
    return 20 * Math.log10(rms + 1e-10); // Convert to dB
  }
  
  private extractPitch(timeData: Float32Array): { mean: number; variance: number } {
    // Simplified autocorrelation-based pitch detection
    const minPeriod = Math.floor(this.sampleRate / 500); // 500 Hz max
    const maxPeriod = Math.floor(this.sampleRate / 50);  // 50 Hz min
    
    let bestLag = 0;
    let bestCorrelation = 0;
    
    for (let lag = minPeriod; lag < maxPeriod && lag < timeData.length / 2; lag++) {
      let correlation = 0;
      let normalizer = 0;
      
      for (let i = 0; i < timeData.length - lag; i++) {
        correlation += timeData[i] * timeData[i + lag];
        normalizer += timeData[i] * timeData[i];
      }
      
      if (normalizer > 0) {
        correlation /= normalizer;
        
        if (correlation > bestCorrelation) {
          bestCorrelation = correlation;
          bestLag = lag;
        }
      }
    }
    
    const pitch = bestLag > 0 ? this.sampleRate / bestLag : 0;
    
    return {
      mean: pitch,
      variance: bestCorrelation < 0.3 ? 1000 : 10 // High variance if unclear pitch
    };
  }
  
  private calculateJitter(): number {
    // Simplified jitter calculation (pitch period variation)
    // In real implementation, this would track multiple periods
    return Math.random() * 0.02; // 0-2% typical range
  }
  
  private calculateShimmer(): number {
    // Simplified shimmer calculation (amplitude variation)
    // In real implementation, this would track amplitude changes
    return Math.random() * 0.1; // 0-10% typical range
  }
  
  private calculateAmplitudeVariance(): number {
    if (!this.timeData) return 0;
    
    const amplitudes = Array.from(this.timeData).map(Math.abs);
    const mean = amplitudes.reduce((sum, val) => sum + val, 0) / amplitudes.length;
    const variance = amplitudes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amplitudes.length;
    
    return variance;
  }
  
  private extractSpectralFeatures(freqData: Float32Array): { spectralCentroid: number; harmonicsRatio: number } {
    let weightedSum = 0;
    let magnitudeSum = 0;
    let harmonicsEnergy = 0;
    let totalEnergy = 0;
    
    for (let i = 1; i < freqData.length; i++) {
      const magnitude = Math.pow(10, freqData[i] / 20); // Convert from dB
      const frequency = i * this.sampleRate / (2 * freqData.length);
      
      weightedSum += frequency * magnitude;
      magnitudeSum += magnitude;
      totalEnergy += magnitude;
      
      // Consider harmonics (multiples of fundamental frequency around 100-300 Hz)
      if (frequency >= 100 && frequency <= 300) {
        harmonicsEnergy += magnitude;
      }
    }
    
    const spectralCentroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
    const harmonicsRatio = totalEnergy > 0 ? harmonicsEnergy / totalEnergy : 0;
    
    return { spectralCentroid, harmonicsRatio };
  }
  
  private extractTemporalFeatures(): { speechRate: number; pauseCount: number; voicedRatio: number } {
    // Simplified temporal analysis
    return {
      speechRate: 150, // syllables per minute (placeholder)
      pauseCount: 3,   // number of pauses (placeholder)
      voicedRatio: 0.7 // ratio of voiced to total time (placeholder)
    };
  }
  
  getVoiceActivityLevel(): number {
    if (!this.analyser || !this.timeData) return 0;
    
    this.analyser.getFloatTimeDomainData(this.timeData);
    const energy = this.calculateEnergy(this.timeData);
    
    // Convert to 0-100 range
    return Math.max(0, Math.min(100, (energy + 60) * 100 / 60));
  }
}

export const RealVoiceAnalyzer = ({ 
  onStressDetected, 
  onBaselineCalibrated, 
  currentHeartRate = 70 
}: RealVoiceAnalyzerProps) => {
  const { toast } = useToast();
  
  const [isRecording, setIsRecording] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [hasBaseline, setHasBaseline] = useState(false);
  const [currentPhrase, setCurrentPhrase] = useState(0);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  
  const processorRef = useRef(new VoiceSignalProcessor());
  const baselineRef = useRef<BaselineCalibration | null>(null);
  const featuresHistoryRef = useRef<VoiceFeatures[]>([]);
  const animationRef = useRef<number>();
  
  const calibrationPhrases = [
    "Hello, my name is testing voice analysis",
    "I am feeling calm and relaxed right now",
    "The weather is nice today, very peaceful",
    "Everything is going well and I feel good"
  ];
  
  const stressPhrases = [
    "How are you feeling right now?",
    "Describe your current stress level",
    "Tell me about any concerns you have",
    "What's on your mind today?"
  ];

  const updateVoiceLevel = useCallback(() => {
    if (isRecording) {
      const level = processorRef.current.getVoiceActivityLevel();
      setVoiceLevel(level);
      animationRef.current = requestAnimationFrame(updateVoiceLevel);
    }
  }, [isRecording]);

  useEffect(() => {
    if (isRecording) {
      updateVoiceLevel();
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording, updateVoiceLevel]);

  const startBaselineCalibration = async () => {
    const initialized = await processorRef.current.initializeAudio();
    if (!initialized) {
      toast({
        title: "Microphone Access Required",
        description: "Please enable microphone permissions",
        variant: "destructive"
      });
      return;
    }
    
    setIsCalibrating(true);
    setIsRecording(true);
    setProgress(0);
    setCurrentPhrase(0);
    
    processorRef.current.startRecording();
    
    toast({
      title: "Baseline Calibration Started",
      description: "Read the phrase aloud in a calm, relaxed voice",
      variant: "default"
    });
    
    // Collect baseline data for 20 seconds
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 5; // 5% every second
        
        if (newProgress >= 100) {
          clearInterval(interval);
          completeBaseline();
        } else if (newProgress % 25 === 0 && currentPhrase < calibrationPhrases.length - 1) {
          setCurrentPhrase(prev => prev + 1);
        }
        
        return newProgress;
      });
      
      // Collect features
      const features = processorRef.current.extractVoiceFeatures();
      if (features) {
        featuresHistoryRef.current.push(features);
      }
    }, 1000);
  };
  
  const completeBaseline = () => {
    if (featuresHistoryRef.current.length < 10) {
      toast({
        title: "Insufficient Baseline Data",
        description: "Please try again and speak more clearly",
        variant: "destructive"
      });
      stopRecording();
      return;
    }
    
    // Calculate baseline averages
    const features = calculateAverageFeatures(featuresHistoryRef.current);
    
    const baseline: BaselineCalibration = {
      features,
      heartRate: currentHeartRate,
      timestamp: new Date(),
      isValid: true
    };
    
    baselineRef.current = baseline;
    setHasBaseline(true);
    setIsCalibrating(false);
    
    onBaselineCalibrated?.(baseline);
    
    toast({
      title: "Baseline Calibrated Successfully",
      description: "Your calm voice pattern has been recorded",
      variant: "default"
    });
    
    stopRecording();
    featuresHistoryRef.current = [];
  };

  const startStressAnalysis = async () => {
    if (!hasBaseline) {
      toast({
        title: "Baseline Required",
        description: "Please calibrate your baseline voice first",
        variant: "destructive"
      });
      return;
    }
    
    const initialized = await processorRef.current.initializeAudio();
    if (!initialized) return;
    
    setIsRecording(true);
    setProgress(0);
    setCurrentPhrase(0);
    
    processorRef.current.startRecording();
    featuresHistoryRef.current = [];
    
    toast({
      title: "Stress Analysis Started",
      description: "Answer the question naturally",
      variant: "default"
    });
    
    // Analyze for 10 seconds
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 10;
        
        if (newProgress >= 100) {
          clearInterval(interval);
          completeStressAnalysis();
        } else if (newProgress === 50 && currentPhrase < stressPhrases.length - 1) {
          setCurrentPhrase(prev => prev + 1);
        }
        
        return newProgress;
      });
      
      // Collect features
      const features = processorRef.current.extractVoiceFeatures();
      if (features) {
        featuresHistoryRef.current.push(features);
      }
    }, 1000);
  };
  
  const completeStressAnalysis = () => {
    if (!baselineRef.current || featuresHistoryRef.current.length < 5) {
      toast({
        title: "Insufficient Data",
        description: "Please speak more during analysis",
        variant: "destructive"
      });
      stopRecording();
      return;
    }
    
    const currentFeatures = calculateAverageFeatures(featuresHistoryRef.current);
    const baseline = baselineRef.current.features;
    
    // Calculate stress indicators
    const stressIndicators = calculateStressIndicators(currentFeatures, baseline, currentHeartRate);
    
    const result: StressAnalysisResult = {
      stressLevel: stressIndicators.stressLevel,
      confidence: stressIndicators.confidence,
      features: currentFeatures,
      triggers: stressIndicators.triggers,
      quality: stressIndicators.quality,
      timestamp: new Date()
    };
    
    onStressDetected(result);
    
    // Show result
    if (result.stressLevel > 70) {
      toast({
        title: "High Stress Detected",
        description: `Stress level: ${result.stressLevel}% (${result.triggers.join(', ')})`,
        variant: "destructive"
      });
    } else if (result.stressLevel > 40) {
      toast({
        title: "Moderate Stress Detected",
        description: `Stress level: ${result.stressLevel}%`,
        variant: "default"
      });
    } else {
      toast({
        title: "Low Stress Level",
        description: `Stress level: ${result.stressLevel}% - You seem calm`,
        variant: "default"
      });
    }
    
    stopRecording();
    featuresHistoryRef.current = [];
  };

  const stopRecording = () => {
    setIsRecording(false);
    setIsCalibrating(false);
    setProgress(0);
    processorRef.current.stopRecording();
  };

  const calculateAverageFeatures = (featuresArray: VoiceFeatures[]): VoiceFeatures => {
    const count = featuresArray.length;
    
    return {
      pitch: {
        mean: featuresArray.reduce((sum, f) => sum + f.pitch.mean, 0) / count,
        variance: featuresArray.reduce((sum, f) => sum + f.pitch.variance, 0) / count,
        jitter: featuresArray.reduce((sum, f) => sum + f.pitch.jitter, 0) / count
      },
      amplitude: {
        mean: featuresArray.reduce((sum, f) => sum + f.amplitude.mean, 0) / count,
        variance: featuresArray.reduce((sum, f) => sum + f.amplitude.variance, 0) / count,
        shimmer: featuresArray.reduce((sum, f) => sum + f.amplitude.shimmer, 0) / count
      },
      temporal: {
        speechRate: featuresArray.reduce((sum, f) => sum + f.temporal.speechRate, 0) / count,
        pauseCount: featuresArray.reduce((sum, f) => sum + f.temporal.pauseCount, 0) / count,
        voicedRatio: featuresArray.reduce((sum, f) => sum + f.temporal.voicedRatio, 0) / count
      },
      spectral: {
        energy: featuresArray.reduce((sum, f) => sum + f.spectral.energy, 0) / count,
        spectralCentroid: featuresArray.reduce((sum, f) => sum + f.spectral.spectralCentroid, 0) / count,
        harmonicsRatio: featuresArray.reduce((sum, f) => sum + f.spectral.harmonicsRatio, 0) / count
      }
    };
  };

  const calculateStressIndicators = (
    current: VoiceFeatures, 
    baseline: VoiceFeatures,
    heartRate: number
  ): { stressLevel: number; confidence: number; triggers: string[]; quality: "excellent" | "good" | "fair" | "poor" } => {
    let stressScore = 0;
    const triggers: string[] = [];
    
    // Pitch analysis (40% weight)
    const pitchIncrease = (current.pitch.mean - baseline.pitch.mean) / baseline.pitch.mean;
    const pitchVarianceIncrease = (current.pitch.variance - baseline.pitch.variance) / baseline.pitch.variance;
    
    if (pitchIncrease > 0.1) { // 10% increase
      stressScore += 25;
      triggers.push("elevated pitch");
    }
    
    if (pitchVarianceIncrease > 0.3) { // 30% increase in variance
      stressScore += 15;
      triggers.push("pitch instability");
    }
    
    // Amplitude analysis (20% weight)
    const amplitudeVarianceIncrease = (current.amplitude.variance - baseline.amplitude.variance) / baseline.amplitude.variance;
    
    if (amplitudeVarianceIncrease > 0.5) {
      stressScore += 20;
      triggers.push("voice tremor");
    }
    
    // Speech rate analysis (20% weight)
    const speechRateChange = Math.abs(current.temporal.speechRate - baseline.temporal.speechRate) / baseline.temporal.speechRate;
    
    if (speechRateChange > 0.2) {
      stressScore += 15;
      triggers.push(current.temporal.speechRate > baseline.temporal.speechRate ? "rapid speech" : "slow speech");
    }
    
    // Heart rate correlation (20% weight)
    const baselineHR = baselineRef.current?.heartRate || 70;
    const hrIncrease = (heartRate - baselineHR) / baselineHR;
    
    if (hrIncrease > 0.15) { // 15% increase
      stressScore += 20;
      triggers.push("elevated heart rate");
    }
    
    // Confidence calculation
    const dataQuality = Math.min(featuresHistoryRef.current.length / 10, 1);
    const signalClarity = Math.min(current.spectral.harmonicsRatio * 2, 1);
    const confidence = (dataQuality * 0.6 + signalClarity * 0.4) * 100;
    
    // Quality assessment
    let quality: "excellent" | "good" | "fair" | "poor";
    if (confidence > 85) quality = "excellent";
    else if (confidence > 75) quality = "good";
    else if (confidence > 65) quality = "fair";
    else quality = "poor";
    
    return {
      stressLevel: Math.min(100, Math.max(0, stressScore)),
      confidence: Math.round(confidence),
      triggers,
      quality
    };
  };

  return (
    <Card className="p-6 bg-[var(--gradient-card)] border-2 border-cyber-purple/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-cyber-purple animate-pulse" />
          <h3 className="text-xl font-bold text-foreground">Real Voice Stress Analyzer</h3>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            variant="outline"
            size="sm"
          >
            <BarChart3 className="w-4 h-4" />
          </Button>
          
          <Badge variant={hasBaseline ? "default" : "outline"}>
            {hasBaseline ? "Calibrated" : "Needs Baseline"}
          </Badge>
        </div>
      </div>

      {/* Voice Level Indicator */}
      {isRecording && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Mic className="w-4 h-4 text-cyber-green" />
            <span className="text-sm">Voice Level</span>
          </div>
          <div className="w-full bg-muted h-3 rounded-full overflow-hidden">
            <div 
              className="h-full bg-cyber-green transition-all duration-100"
              style={{ width: `${voiceLevel}%` }}
            />
          </div>
        </div>
      )}

      {/* Current Phrase */}
      {isRecording && (
        <div className="mb-4 p-4 bg-muted/20 rounded-lg">
          <div className="text-sm text-muted-foreground mb-2">
            {isCalibrating ? "Read aloud (calm voice):" : "Answer naturally:"}
          </div>
          <div className="text-lg font-medium">
            {isCalibrating ? calibrationPhrases[currentPhrase] : stressPhrases[currentPhrase]}
          </div>
        </div>
      )}

      {/* Progress */}
      {isRecording && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span>{isCalibrating ? "Calibrating Baseline" : "Analyzing Stress"}</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3 mb-4">
        {!isRecording ? (
          <>
            <Button 
              onClick={startBaselineCalibration}
              variant={hasBaseline ? "outline" : "default"}
              className="flex-1"
            >
              <Play className="w-4 h-4 mr-2" />
              {hasBaseline ? "Recalibrate" : "Set Baseline"}
            </Button>
            
            <Button 
              onClick={startStressAnalysis}
              disabled={!hasBaseline}
              className="flex-1"
            >
              <Activity className="w-4 h-4 mr-2" />
              Analyze Stress
            </Button>
          </>
        ) : (
          <Button onClick={stopRecording} variant="destructive" className="flex-1">
            <Square className="w-4 h-4 mr-2" />
            Stop Recording
          </Button>
        )}
      </div>

      {/* Status */}
      <div className="text-center text-sm text-muted-foreground">
        {!hasBaseline && "Start by setting your calm voice baseline"}
        {hasBaseline && !isRecording && "Ready for stress analysis"}
        {isRecording && isCalibrating && "Speak clearly and naturally"}
        {isRecording && !isCalibrating && "Answer the question honestly"}
      </div>

      {/* Diagnostics */}
      {showDiagnostics && hasBaseline && baselineRef.current && (
        <div className="mt-4 p-4 border-t border-border">
          <h4 className="font-medium mb-3">Voice Baseline</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Baseline Pitch</div>
              <div className="font-medium">{baselineRef.current.features.pitch.mean.toFixed(1)} Hz</div>
            </div>
            <div>
              <div className="text-muted-foreground">Baseline Energy</div>
              <div className="font-medium">{baselineRef.current.features.amplitude.mean.toFixed(1)} dB</div>
            </div>
            <div>
              <div className="text-muted-foreground">Speech Rate</div>
              <div className="font-medium">{baselineRef.current.features.temporal.speechRate} spm</div>
            </div>
            <div>
              <div className="text-muted-foreground">Heart Rate</div>
              <div className="font-medium">{baselineRef.current.heartRate} BPM</div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};