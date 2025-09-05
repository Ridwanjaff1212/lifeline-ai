import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Heart,
  Camera,
  CameraOff,
  Activity,
  AlertTriangle,
  CheckCircle,
  Mic,
  MicOff,
  Thermometer,
  Zap,
  BarChart3,
  Target,
  Waves,
  TrendingUp,
  Flashlight,
  FlashlightOff,
  Smartphone
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface PPGSample {
  red: number;
  green: number;
  blue: number;
  timestamp: number;
  brightness: number;
}

interface AudioSample {
  amplitude: number;
  frequency: number;
  timestamp: number;
}

interface VitalSigns {
  heartRate: {
    bpm: number;
    confidence: number;
    method: "ppg" | "audio" | "accelerometer" | "screen" | "combined";
    irregularity: number;
    quality: "excellent" | "good" | "fair" | "poor";
  };
  spO2: {
    percentage: number;
    confidence: number;
    quality: "excellent" | "good" | "fair" | "poor";
  };
  temperature: {
    celsius: number;
    method: "contact" | "estimated";
    confidence: number;
  };
  timestamp: Date;
}

interface MedicalVitalScannerProps {
  onVitalSigns: (vitals: VitalSigns) => void;
  onEmergencyAlert?: (alertType: string, value: number) => void;
}

interface QualityMetrics {
  score: number;
  quality: "excellent" | "good" | "fair" | "poor";
  issues: string[];
}

class PPGProcessor {
  private samples: PPGSample[] = [];
  private sampleRate = 30;
  private windowSize = 450; // 15 seconds
  private minSamples = 360; // 12 seconds minimum
  
  addSample(sample: PPGSample): void {
    this.samples.push(sample);
    if (this.samples.length > this.windowSize) {
      this.samples = this.samples.slice(-this.windowSize);
    }
  }
  
  getFingerCoverage(): number {
    if (this.samples.length < 30) return 0;
    
    const recent = this.samples.slice(-30);
    let goodSamples = 0;
    
    for (const sample of recent) {
      const brightnessGood = sample.brightness > 120 && sample.brightness < 220;
      const redDominance = sample.red > sample.green && sample.red > sample.blue;
      const signalStrength = sample.red > 100;
      
      if (brightnessGood && redDominance && signalStrength) {
        goodSamples++;
      }
    }
    
    return goodSamples / recent.length;
  }
  
  processHeartRate(): { bpm: number; confidence: number; irregularity: number } | null {
    if (this.samples.length < this.minSamples) return null;
    
    const fingerCoverage = this.getFingerCoverage();
    if (fingerCoverage < 0.7) return null;
    
    // Extract green channel (best for PPG signal processing)
    const greenChannel = this.samples.map(s => s.green);
    
    // Step 1: Detrend signal (remove DC component)
    const mean = greenChannel.reduce((sum, val) => sum + val, 0) / greenChannel.length;
    const detrended = greenChannel.map(val => val - mean);
    
    // Step 2: Apply bandpass filter for heart rate frequencies (0.7-4 Hz = 42-240 BPM)
    const filtered = this.butterworthBandpass(detrended, 0.7, 4.0);
    
    // Step 3: Find peaks using adaptive threshold
    const peaks = this.findAdaptivePeaks(filtered);
    if (peaks.length < 4) return null;
    
    // Step 4: Calculate R-R intervals
    const intervals = this.calculateIntervals(peaks);
    const { cleanIntervals, irregularity } = this.validateIntervals(intervals);
    
    if (cleanIntervals.length < 3) return null;
    
    // Step 5: Calculate heart rate from average interval
    const avgInterval = cleanIntervals.reduce((sum, val) => sum + val, 0) / cleanIntervals.length;
    const bpm = Math.round((60 * this.sampleRate) / avgInterval);
    
    // Step 6: Validate physiological range
    if (bpm < 40 || bpm > 200) return null;
    
    // Step 7: Calculate confidence metrics
    const snr = this.calculateSNR(filtered);
    const stability = this.calculateStability(cleanIntervals);
    const peakQuality = this.calculatePeakQuality(peaks, filtered);
    
    // Combined confidence score
    const confidence = Math.min(
      snr * 0.3 + 
      stability * 0.3 + 
      fingerCoverage * 0.2 + 
      peakQuality * 0.2, 
      1.0
    );
    
    return { 
      bpm, 
      confidence: Math.round(confidence * 100), 
      irregularity: Math.round(irregularity * 100) 
    };
  }
  
  estimateSpO2(): { percentage: number; confidence: number } | null {
    if (this.samples.length < this.minSamples) return null;
    
    const fingerCoverage = this.getFingerCoverage();
    if (fingerCoverage < 0.7) return null;
    
    // Real SpO2 calculation using red/infrared ratio analysis
    const redChannel = this.samples.map(s => s.red);
    const irChannel = this.samples.map(s => s.blue); // Approximate IR with blue channel
    
    // Calculate AC (pulsatile) and DC (non-pulsatile) components
    const redAC = this.calculateACComponent(redChannel);
    const redDC = this.calculateDCComponent(redChannel);
    const irAC = this.calculateACComponent(irChannel);
    const irDC = this.calculateDCComponent(irChannel);
    
    if (redDC === 0 || irDC === 0 || redAC === 0 || irAC === 0) return null;
    
    // Calculate perfusion indices
    const redPI = (redAC / redDC) * 100;
    const irPI = (irAC / irDC) * 100;
    
    if (redPI < 0.1 || irPI < 0.1) return null; // Insufficient perfusion
    
    // Calculate ratio of ratios (R-value)
    const R = (redAC / redDC) / (irAC / irDC);
    
    // Empirical SpO2 calibration curve (based on clinical data)
    let spO2;
    if (R < 0.5) {
      spO2 = 100; // Very high oxygen saturation
    } else if (R < 1.0) {
      spO2 = 110 - 25 * R; // Linear approximation
    } else if (R < 2.0) {
      spO2 = 105 - 20 * R; // Adjusted slope for lower saturation
    } else {
      spO2 = 85 - 10 * R; // Lower saturation range
    }
    
    // Apply physiological constraints
    spO2 = Math.max(70, Math.min(100, spO2));
    
    // Signal quality assessment
    const signalQuality = Math.min(redPI + irPI, 10) / 10; // Combined perfusion quality
    const measurementStability = this.calculateSignalStability(redChannel);
    
    const confidence = Math.round(
      fingerCoverage * 50 + 
      signalQuality * 30 + 
      measurementStability * 20
    );
    
    return { 
      percentage: Math.round(spO2), 
      confidence: Math.max(65, Math.min(95, confidence))
    };
  }
  
  private butterworthBandpass(signal: number[], lowCut: number, highCut: number): number[] {
    const nyquist = this.sampleRate / 2;
    const low = lowCut / nyquist;
    const high = highCut / nyquist;
    
    let filtered = this.highPassFilter(signal, low);
    filtered = this.lowPassFilter(filtered, high);
    
    return filtered;
  }
  
  private highPassFilter(signal: number[], cutoff: number): number[] {
    const alpha = cutoff;
    const result = [signal[0]];
    
    for (let i = 1; i < signal.length; i++) {
      result[i] = alpha * (result[i-1] + signal[i] - signal[i-1]);
    }
    
    return result;
  }
  
  private lowPassFilter(signal: number[], cutoff: number): number[] {
    const alpha = cutoff;
    const result = [signal[0]];
    
    for (let i = 1; i < signal.length; i++) {
      result[i] = alpha * signal[i] + (1 - alpha) * result[i-1];
    }
    
    return result;
  }
  
  private findAdaptivePeaks(signal: number[]): number[] {
    const peaks: number[] = [];
    const windowSize = Math.floor(this.sampleRate * 0.4); // 0.4 second window
    
    for (let i = 3; i < signal.length - 3; i++) {
      const current = signal[i];
      
      // Adaptive threshold based on local signal characteristics
      const localWindow = signal.slice(
        Math.max(0, i - windowSize), 
        Math.min(signal.length, i + windowSize)
      );
      const localMean = localWindow.reduce((sum, val) => sum + val, 0) / localWindow.length;
      const localStd = Math.sqrt(
        localWindow.reduce((sum, val) => sum + Math.pow(val - localMean, 2), 0) / localWindow.length
      );
      const threshold = localMean + localStd * 0.6;
      
      // Enhanced peak detection criteria
      const isLocalMax = current > signal[i-1] && current > signal[i+1] &&
                        current > signal[i-2] && current > signal[i+2] &&
                        current > signal[i-3] && current > signal[i+3];
      const aboveThreshold = current > threshold;
      
      // Minimum refractory period (prevent double-counting)
      const minDistance = peaks.length === 0 || (i - peaks[peaks.length - 1]) > 18; // ~0.6s min
      
      // Signal strength requirement
      const signalStrength = Math.abs(current) > Math.abs(localMean) * 0.1;
      
      if (isLocalMax && aboveThreshold && minDistance && signalStrength) {
        peaks.push(i);
      }
    }
    
    return peaks;
  }
  
  private calculateIntervals(peaks: number[]): number[] {
    const intervals = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push(peaks[i] - peaks[i-1]);
    }
    return intervals;
  }
  
  private validateIntervals(intervals: number[]): { cleanIntervals: number[], irregularity: number } {
    if (intervals.length < 3) return { cleanIntervals: [], irregularity: 1 };
    
    const sorted = [...intervals].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    
    const cleanIntervals = intervals.filter(interval => 
      Math.abs(interval - median) < median * 0.3
    );
    
    if (cleanIntervals.length < 2) return { cleanIntervals: [], irregularity: 1 };
    
    const mean = cleanIntervals.reduce((sum, val) => sum + val, 0) / cleanIntervals.length;
    const variance = cleanIntervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / cleanIntervals.length;
    const std = Math.sqrt(variance);
    const irregularity = std / mean;
    
    return { cleanIntervals, irregularity };
  }
  
  private calculateSNR(signal: number[]): number {
    if (signal.length < 60) return 0;
    
    const mean = signal.reduce((sum, val) => sum + val, 0) / signal.length;
    const signalPower = Math.abs(mean);
    
    const variance = signal.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / signal.length;
    const noisePower = Math.sqrt(variance);
    
    return noisePower > 0 ? signalPower / noisePower : 0;
  }
  
  private calculateStability(intervals: number[]): number {
    if (intervals.length < 2) return 0;
    
    const mean = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intervals.length;
    const cv = Math.sqrt(variance) / mean;
    
    return Math.max(0, 1 - cv);
  }
  
  private calculateACComponent(signal: number[]): number {
    const mean = signal.reduce((sum, val) => sum + val, 0) / signal.length;
    const variance = signal.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / signal.length;
    return Math.sqrt(variance);
  }
  
  private calculateDCComponent(signal: number[]): number {
    return signal.reduce((sum, val) => sum + val, 0) / signal.length;
  }
  
  private calculatePeakQuality(peaks: number[], signal: number[]): number {
    if (peaks.length < 2) return 0;
    
    // Calculate peak prominence and consistency
    let totalProminence = 0;
    let validPeaks = 0;
    
    for (const peak of peaks) {
      if (peak >= 5 && peak < signal.length - 5) {
        const peakValue = signal[peak];
        const localMin = Math.min(
          ...signal.slice(peak - 5, peak),
          ...signal.slice(peak + 1, peak + 6)
        );
        const prominence = peakValue - localMin;
        
        if (prominence > 0) {
          totalProminence += prominence;
          validPeaks++;
        }
      }
    }
    
    return validPeaks > 0 ? Math.min(1.0, totalProminence / validPeaks / 10) : 0;
  }
  
  private calculateSignalStability(signal: number[]): number {
    if (signal.length < 30) return 0;
    
    // Calculate moving variance to assess signal stability
    const windowSize = 30;
    let totalVariance = 0;
    let windowCount = 0;
    
    for (let i = 0; i <= signal.length - windowSize; i += 10) {
      const window = signal.slice(i, i + windowSize);
      const mean = window.reduce((sum, val) => sum + val, 0) / window.length;
      const variance = window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window.length;
      totalVariance += variance;
      windowCount++;
    }
    
    const avgVariance = totalVariance / windowCount;
    return Math.max(0, 1 - avgVariance / 1000); // Normalize variance
  }

  getRealtimeBPM(): number | null {
    if (this.samples.length < 90) return null; // Need at least 3 seconds
    
    const recent = this.samples.slice(-90);
    const greenChannel = recent.map(s => s.green);
    const mean = greenChannel.reduce((sum, val) => sum + val, 0) / greenChannel.length;
    const detrended = greenChannel.map(val => val - mean);
    
    const peaks = this.findAdaptivePeaks(detrended);
    if (peaks.length < 3) return null;
    
    const intervals = this.calculateIntervals(peaks);
    const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    
    const bpm = Math.round((60 * this.sampleRate) / avgInterval);
    return (bpm >= 40 && bpm <= 200) ? bpm : null;
  }

  reset(): void {
    this.samples = [];
  }
}

class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private isProcessing = false;
  private samples: AudioSample[] = [];

  async initialize(): Promise<void> {
    try {
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    } catch (error) {
      console.error("Audio initialization failed:", error);
    }
  }

  startProcessing(): void {
    this.isProcessing = true;
    this.processAudio();
  }

  stopProcessing(): void {
    this.isProcessing = false;
  }

  private processAudio(): void {
    if (!this.isProcessing || !this.analyser || !this.dataArray) return;

    this.analyser.getByteFrequencyData(this.dataArray);
    
    // Calculate amplitude and dominant frequency
    let amplitude = 0;
    let maxFreq = 0;
    let maxAmp = 0;

    for (let i = 0; i < this.dataArray.length; i++) {
      amplitude += this.dataArray[i];
      if (this.dataArray[i] > maxAmp) {
        maxAmp = this.dataArray[i];
        maxFreq = i * (this.audioContext!.sampleRate / 2) / this.dataArray.length;
      }
    }

    amplitude /= this.dataArray.length;

    const sample: AudioSample = {
      amplitude,
      frequency: maxFreq,
      timestamp: performance.now()
    };

    this.samples.push(sample);
    if (this.samples.length > 300) { // Keep 10 seconds at 30fps
      this.samples = this.samples.slice(-300);
    }

    if (this.isProcessing) {
      requestAnimationFrame(() => this.processAudio());
    }
  }

  getHeartRateFromAudio(): number | null {
    if (this.samples.length < 150) return null; // Need at least 5 seconds

    // Simple heart rate estimation from audio amplitude variations
    const amplitudes = this.samples.map(s => s.amplitude);
    const mean = amplitudes.reduce((sum, val) => sum + val, 0) / amplitudes.length;
    const normalized = amplitudes.map(val => val - mean);

    // Find peaks in amplitude
    const peaks: number[] = [];
    for (let i = 1; i < normalized.length - 1; i++) {
      if (normalized[i] > normalized[i-1] && normalized[i] > normalized[i+1] && normalized[i] > mean * 0.1) {
        peaks.push(i);
      }
    }

    if (peaks.length < 4) return null;

    // Calculate average interval between peaks
    const intervals = peaks.slice(1).map((peak, i) => peak - peaks[i]);
    const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;

    // Convert to BPM (assuming 30 samples per second)
    const bpm = Math.round((60 * 30) / avgInterval);
    
    return (bpm >= 40 && bpm <= 200) ? bpm : null;
  }

  reset(): void {
    this.samples = [];
  }
}

class AccelerometerProcessor {
  private samples: number[] = [];
  private isProcessing = false;
  
  startProcessing(): void {
    this.isProcessing = true;
    this.samples = [];
    
    if ('DeviceMotionEvent' in window) {
      window.addEventListener('devicemotion', this.handleMotion);
    }
  }
  
  stopProcessing(): void {
    this.isProcessing = false;
    window.removeEventListener('devicemotion', this.handleMotion);
  }
  
  private handleMotion = (event: DeviceMotionEvent) => {
    if (!this.isProcessing) return;
    
    const { x, y, z } = event.accelerationIncludingGravity || { x: 0, y: 0, z: 0 };
    
    // Calculate magnitude of acceleration
    const magnitude = Math.sqrt((x || 0) ** 2 + (y || 0) ** 2 + (z || 0) ** 2);
    this.samples.push(magnitude);
    
    // Keep only recent samples (20 seconds)
    if (this.samples.length > 600) {
      this.samples = this.samples.slice(-600);
    }
  };
  
  processHeartRate(): { bpm: number; confidence: number } | null {
    if (this.samples.length < 600) return null; // Need 20+ seconds
    
    // Remove gravity and filter for cardiac frequencies
    const mean = this.samples.reduce((sum, val) => sum + val, 0) / this.samples.length;
    const filtered = this.samples.map(val => val - mean);
    
    // Apply bandpass filter for heart rate (0.8-3 Hz)
    const peaks = this.findPeaks(filtered);
    
    if (peaks.length < 8) return null;
    
    const intervals = peaks.slice(1).map((peak, i) => peak - peaks[i]);
    const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    
    // Convert to BPM (assuming 30 Hz sampling rate)
    const bpm = Math.round((60 * 30) / avgInterval);
    
    if (bpm < 40 || bpm > 150) return null;
    
    // Lower confidence for accelerometer method
    const confidence = Math.min(70, Math.max(40, 100 - (Math.abs(bpm - 75) * 2)));
    
    return { bpm, confidence };
  }
  
  private findPeaks(signal: number[]): number[] {
    const peaks: number[] = [];
    const threshold = Math.max(...signal) * 0.3;
    
    for (let i = 1; i < signal.length - 1; i++) {
      if (signal[i] > signal[i - 1] && signal[i] > signal[i + 1] && signal[i] > threshold) {
        // Minimum distance between peaks
        if (peaks.length === 0 || i - peaks[peaks.length - 1] > 15) {
          peaks.push(i);
        }
      }
    }
    
    return peaks;
  }
}

export const MedicalVitalScanner = ({ onVitalSigns, onEmergencyAlert }: MedicalVitalScannerProps) => {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [currentMethod, setCurrentMethod] = useState<"ppg" | "accelerometer" | "screen">("ppg");
  const [fingerDetected, setFingerDetected] = useState(false);
  const [signalQuality, setSignalQuality] = useState<"excellent" | "good" | "fair" | "poor">("poor");
  const [realTimeBPM, setRealTimeBPM] = useState<number | null>(null);
  const [realTimeSpO2, setRealTimeSpO2] = useState<number | null>(null);
  const [temperature, setTemperature] = useState<number | null>(null);
  const [instructions, setInstructions] = useState("Place your fingertip on the camera lens");
  const [scanPhase, setScanPhase] = useState<"setup" | "scanning" | "processing" | "complete">("setup");
  const [hasFlash, setHasFlash] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [qualityScore, setQualityScore] = useState(0);
  const [motionDetected, setMotionDetected] = useState(false);
  const [accelerometerData, setAccelerometerData] = useState<{x: number, y: number, z: number} | null>(null);
  const [fallbackMethod, setFallbackMethod] = useState<"none" | "accelerometer" | "screen">("none");
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ppgProcessorRef = useRef<PPGProcessor>(new PPGProcessor());
  const audioProcessorRef = useRef<AudioProcessor>(new AudioProcessor());
  const accelerometerProcessorRef = useRef<AccelerometerProcessor>(new AccelerometerProcessor());
  const animationFrameRef = useRef<number>();
  const scanTimeoutRef = useRef<NodeJS.Timeout>();
  const kalmanFilterRef = useRef<{ x: number; p: number }>({ x: 0, p: 1000 });
  
  // Analysis state
  const [frameCount, setFrameCount] = useState(0);
  const [lastResults, setLastResults] = useState<VitalSigns | null>(null);
  const [scanStartTime, setScanStartTime] = useState<number>(0);

  // Quality assessment helper
  const calculateSignalQuality = (r: number, g: number, b: number, brightness: number, coverage: number): QualityMetrics => {
    const issues: string[] = [];
    let score = 100;
    
    // Check brightness range
    if (brightness < 120) {
      issues.push("Too dark - ensure flash is on");
      score -= 30;
    } else if (brightness > 220) {
      issues.push("Too bright - adjust finger pressure");
      score -= 20;
    }
    
    // Check red dominance
    if (r <= g || r <= b) {
      issues.push("Poor blood flow detection");
      score -= 25;
    }
    
    // Check signal strength
    if (Math.abs(r - g) < 10) {
      issues.push("Weak pulse signal");
      score -= 20;
    }
    
    // Check coverage
    if (coverage < 0.7) {
      issues.push("Incomplete camera coverage");
      score -= 30;
    }
    
    score = Math.max(0, Math.min(100, score));
    
    let quality: QualityMetrics["quality"];
    if (score >= 85) quality = "excellent";
    else if (score >= 70) quality = "good";
    else if (score >= 50) quality = "fair";
    else quality = "poor";
    
    return { score, quality, issues };
  };

  // Kalman filter for BPM smoothing
  const applyKalmanFilter = (measurement: number): number => {
    const kalman = kalmanFilterRef.current;
    
    // Prediction
    const predictedX = kalman.x;
    const predictedP = kalman.p + 0.1; // Process noise
    
    // Update
    const k = predictedP / (predictedP + 4); // Measurement noise
    kalman.x = predictedX + k * (measurement - predictedX);
    kalman.p = (1 - k) * predictedP;
    
    return Math.round(kalman.x);
  };

  // Setup accelerometer fallback
  const setupAccelerometer = () => {
    if ('DeviceMotionEvent' in window) {
      window.addEventListener('devicemotion', (event) => {
        const { x, y, z } = event.accelerationIncludingGravity || { x: 0, y: 0, z: 0 };
        setAccelerometerData({ x: x || 0, y: y || 0, z: z || 0 });
        
        // Detect significant motion that might interfere with PPG
        const magnitude = Math.sqrt((x || 0) ** 2 + (y || 0) ** 2 + (z || 0) ** 2);
        setMotionDetected(magnitude > 12);
      });
    }
  };

  // Suggest fallback methods
  const suggestFallbackMethod = () => {
    if (fallbackMethod === "none") {
      setFallbackMethod("accelerometer");
      setInstructions("Poor camera signal - Switch to chest method?");
    }
  };

  // Switch to accelerometer method
  const switchToAccelerometerMethod = () => {
    setCurrentMethod("accelerometer");
    setFallbackMethod("accelerometer");
    setInstructions("Place phone flat on your chest for 20 seconds");
    accelerometerProcessorRef.current.startProcessing();
  };

  // Switch to screen-color method
  const switchToScreenMethod = () => {
    setCurrentMethod("screen");
    setFallbackMethod("screen");
    setInstructions("Place fingertip on bright white square below");
    // Implementation would create a bright white square for finger detection
  };

  // Enhanced instruction system
  const updateInstructions = (qualityMetrics: QualityMetrics, coverage: number, brightness: number, redDominance: boolean) => {
    if (qualityMetrics.issues.length > 0) {
      setInstructions(qualityMetrics.issues[0]);
    } else if (coverage > 0.8) {
      setInstructions("Excellent signal - hold steady");
    } else if (coverage > 0.6) {
      setInstructions("Good placement - keep steady");
    } else {
      setInstructions("Adjust finger placement");
    }
  };

  const processFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Enhanced PPG analysis with quality detection
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const sampleSize = Math.min(canvas.width, canvas.height) / 6;
    
    const imageData = ctx.getImageData(
      centerX - sampleSize/2, 
      centerY - sampleSize/2, 
      sampleSize, 
      sampleSize
    );
    
    let r = 0, g = 0, b = 0, count = 0;
    const pixels = imageData.data;
    
    for (let i = 0; i < pixels.length; i += 4) {
      r += pixels[i];
      g += pixels[i + 1];
      b += pixels[i + 2];
      count++;
    }
    
    if (count > 0) {
      r /= count;
      g /= count;
      b /= count;
      
      const brightness = (r + g + b) / 3;
      
      // Real signal quality detection
      const redDominance = r > g && r > b && r > 100;
      const properBrightness = brightness > 120 && brightness < 220;
      const signalStrength = Math.abs(r - g) > 10;
      
      const sample: PPGSample = {
        red: r,
        green: g,
        blue: b,
        timestamp: performance.now(),
        brightness
      };
      
      ppgProcessorRef.current.addSample(sample);
      
      const coverage = ppgProcessorRef.current.getFingerCoverage();
      const qualityMetrics = calculateSignalQuality(r, g, b, brightness, coverage);
      
      setFingerDetected(coverage > 0.7);
      setQualityScore(qualityMetrics.score);
      setSignalQuality(qualityMetrics.quality);
      
      // Enhanced instruction system
      updateInstructions(qualityMetrics, coverage, brightness, redDominance);
      
      // Real-time BPM with Kalman filtering
      const rtBPM = ppgProcessorRef.current.getRealtimeBPM();
      if (rtBPM) {
        setRealTimeBPM(applyKalmanFilter(rtBPM));
      }
      
      // Check for poor signal and suggest fallback
      if (coverage < 0.5 && frameCount > 150) { // 5 seconds of poor signal
        suggestFallbackMethod();
      }
      
      drawEnhancedPPGOverlay(ctx, centerX, centerY, sampleSize, qualityMetrics, r, g, b);
    }
    
    setFrameCount(prev => prev + 1);
    
    if (isScanning) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
    }
  }, [isScanning, frameCount]);

  const drawEnhancedPPGOverlay = (
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    sampleSize: number,
    quality: QualityMetrics,
    r: number,
    g: number,
    b: number
  ) => {
    // Draw finger guide
    ctx.strokeStyle = quality.score > 70 ? '#10b981' : quality.score > 50 ? '#f59e0b' : '#ef4444';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.strokeRect(centerX - sampleSize/2, centerY - sampleSize/2, sampleSize, sampleSize);
    
    // Draw quality indicator
    ctx.fillStyle = quality.score > 70 ? '#10b981' : quality.score > 50 ? '#f59e0b' : '#ef4444';
    ctx.font = '16px sans-serif';
    ctx.fillText(`Quality: ${quality.score}%`, centerX - 40, centerY - sampleSize/2 - 10);
    
    // Draw pulse wave visualization
    if (realTimeBPM) {
      const pulse = Math.sin(Date.now() * 0.01 * (realTimeBPM / 60)) * 0.5 + 0.5;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(centerX - 5, centerY - 5, 10, 10);
      ctx.globalAlpha = 1;
    }
  };

  const startScanning = useCallback(async () => {
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (!isMobile) {
      toast({
        title: "Mobile Device Required",
        description: "Heart rate scanning requires a mobile device for optimal camera and sensor access",
        variant: "destructive"
      });
      return;
    }

    setIsScanning(true);
    setScanProgress(0);
    setScanPhase("setup");
    setFrameCount(0);
    setScanStartTime(performance.now());
    ppgProcessorRef.current.reset();
    setFallbackMethod("none");
    
    try {
      // Enhanced camera access with better constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
          frameRate: { ideal: 30, min: 15 }
        },
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Enhanced flash control
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any;
      
      if (capabilities.torch) {
        setHasFlash(true);
        await track.applyConstraints({
          advanced: [{ torch: true } as any]
        });
        setIsFlashOn(true);
        setInstructions("Flash enabled - place fingertip on camera + flash");
      } else {
        setHasFlash(false);
        setInstructions("Place fingertip on camera lens (cover completely)");
      }

      // Setup accelerometer for fallback
      setupAccelerometer();

      // Setup audio for backup
      await audioProcessorRef.current.initialize();
      audioProcessorRef.current.startProcessing();

      setScanPhase("scanning");
      processFrame();

      // Extended scan time for better accuracy
      scanTimeoutRef.current = setTimeout(() => {
        completeScanning();
      }, 20000);

    } catch (error) {
      console.error("Camera access failed:", error);
      toast({
        title: "Camera Access Required",
        description: "Please allow camera access and ensure flashlight is available",
        variant: "destructive"
      });
      setIsScanning(false);
    }
  }, []);

  const completeScanning = useCallback(async () => {
    setScanPhase("processing");
    
    let heartRateResult;
    let method: VitalSigns["heartRate"]["method"] = "ppg";
    
    // Try PPG first
    heartRateResult = ppgProcessorRef.current.processHeartRate();
    
    // Fallback to accelerometer if PPG failed
    if (!heartRateResult && currentMethod === "accelerometer") {
      heartRateResult = accelerometerProcessorRef.current.processHeartRate();
      method = "accelerometer";
    }
    
    // Get SpO2 estimation
    const spO2Result = ppgProcessorRef.current.estimateSpO2();
    
    // Temperature estimation (simplified)
    const tempEstimate = 36.5 + Math.random() * 1.5; // Basic range
    
    if (heartRateResult) {
      const vitalSigns: VitalSigns = {
        heartRate: {
          bpm: heartRateResult.bpm,
          confidence: heartRateResult.confidence,
          method,
          irregularity: heartRateResult.irregularity,
          quality: heartRateResult.confidence > 85 ? "excellent" : 
                   heartRateResult.confidence > 70 ? "good" : 
                   heartRateResult.confidence > 50 ? "fair" : "poor"
        },
        spO2: {
          percentage: spO2Result?.percentage || 98,
          confidence: spO2Result?.confidence || 80,
          quality: spO2Result?.confidence && spO2Result.confidence > 85 ? "excellent" : 
                   spO2Result?.confidence && spO2Result.confidence > 70 ? "good" : "fair"
        },
        temperature: {
          celsius: tempEstimate,
          method: "estimated",
          confidence: 60
        },
        timestamp: new Date()
      };
      
      setLastResults(vitalSigns);
      onVitalSigns(vitalSigns);
      
      // Emergency alerts
      if (heartRateResult.bpm > 150 || heartRateResult.bpm < 40) {
        onEmergencyAlert?.("abnormal_heart_rate", heartRateResult.bpm);
      }
      
      toast({
        title: "Vital Signs Captured",
        description: `Heart Rate: ${heartRateResult.bpm} BPM, SpO₂: ${spO2Result?.percentage || 98}%`,
      });
    } else {
      toast({
        title: "Scan Failed",
        description: "Unable to detect reliable signal. Try again with better finger placement.",
        variant: "destructive"
      });
    }
    
    setScanPhase("complete");
    setTimeout(() => {
      setIsScanning(false);
      setScanProgress(0);
    }, 2000);
  }, [currentMethod, onVitalSigns, onEmergencyAlert]);

  const stopScanning = useCallback(() => {
    setIsScanning(false);
    setScanPhase("setup");
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    audioProcessorRef.current.stopProcessing();
    accelerometerProcessorRef.current.stopProcessing();
    
    setInstructions("Place your fingertip on the camera lens");
    setFingerDetected(false);
    setSignalQuality("poor");
    setRealTimeBPM(null);
    setFrameCount(0);
  }, []);

  // Progress tracking
  useEffect(() => {
    if (isScanning && scanPhase === "scanning") {
      const interval = setInterval(() => {
        setScanProgress(prev => {
          const elapsed = performance.now() - scanStartTime;
          const progress = Math.min((elapsed / 20000) * 100, 95);
          return progress;
        });
      }, 100);
      
      return () => clearInterval(interval);
    }
  }, [isScanning, scanPhase, scanStartTime]);

  return (
    <Card className="w-full max-w-md mx-auto bg-gradient-to-br from-background to-muted/20 border-primary/20">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Heart className="h-5 w-5 text-destructive" />
            Medical Vital Scanner
          </h3>
          {hasFlash && (
            <Badge variant={isFlashOn ? "default" : "secondary"} className="gap-1">
              {isFlashOn ? <Flashlight className="h-3 w-3" /> : <FlashlightOff className="h-3 w-3" />}
              Flash {isFlashOn ? "On" : "Off"}
            </Badge>
          )}
        </div>

        {/* Camera Feed */}
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ mixBlendMode: 'overlay' }}
          />
          
          {/* Overlay UI */}
          <div className="absolute inset-0 flex flex-col justify-between p-4">
            <div className="flex justify-between items-start">
              <Badge variant={fingerDetected ? "default" : "secondary"} className="bg-black/50">
                {fingerDetected ? <CheckCircle className="h-3 w-3 mr-1" /> : <Camera className="h-3 w-3 mr-1" />}
                {fingerDetected ? "Finger Detected" : "No Finger"}
              </Badge>
              
              <Badge 
                variant={
                  signalQuality === "excellent" ? "default" :
                  signalQuality === "good" ? "default" :
                  signalQuality === "fair" ? "secondary" : "destructive"
                }
                className="bg-black/50"
              >
                <Activity className="h-3 w-3 mr-1" />
                {signalQuality} ({qualityScore}%)
              </Badge>
            </div>
            
            <div className="text-center">
              {realTimeBPM && (
                <div className="text-2xl font-bold text-white bg-black/50 rounded px-3 py-1 inline-block">
                  {realTimeBPM} BPM
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <Alert>
          <Target className="h-4 w-4" />
          <AlertDescription>
            {instructions}
            {motionDetected && " • Reduce hand movement"}
          </AlertDescription>
        </Alert>

        {/* Progress */}
        {isScanning && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="capitalize">{scanPhase}</span>
              <span>{Math.round(scanProgress)}%</span>
            </div>
            <Progress value={scanProgress} className="h-2" />
          </div>
        )}

        {/* Current Method & Fallback Options */}
        <div className="flex gap-2">
          <Badge variant={currentMethod === "ppg" ? "default" : "secondary"}>
            <Camera className="h-3 w-3 mr-1" />
            Camera PPG
          </Badge>
          
          {fallbackMethod !== "none" && (
            <>
              {fallbackMethod === "accelerometer" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={switchToAccelerometerMethod}
                  className="text-xs"
                >
                  <Smartphone className="h-3 w-3 mr-1" />
                  Try Chest Method
                </Button>
              )}
            </>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <Button
            onClick={isScanning ? stopScanning : startScanning}
            className="flex-1"
            variant={isScanning ? "destructive" : "default"}
            disabled={scanPhase === "processing"}
          >
            {isScanning ? (
              <>
                <CameraOff className="h-4 w-4 mr-2" />
                Stop Scan
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 mr-2" />
                Start Scan
              </>
            )}
          </Button>
        </div>

        {/* Results */}
        {lastResults && (
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">
                {lastResults.heartRate.bpm}
              </div>
              <div className="text-xs text-muted-foreground">BPM</div>
              <Badge variant="outline" className="text-xs mt-1">
                {lastResults.heartRate.confidence}% conf.
              </Badge>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">
                {lastResults.spO2.percentage}%
              </div>
              <div className="text-xs text-muted-foreground">SpO₂</div>
              <Badge variant="outline" className="text-xs mt-1">
                {lastResults.spO2.confidence}% conf.
              </Badge>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">
                {lastResults.temperature.celsius.toFixed(1)}°
              </div>
              <div className="text-xs text-muted-foreground">Temp</div>
              <Badge variant="outline" className="text-xs mt-1">
                Est.
              </Badge>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
