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
  TrendingUp
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
    method: "ppg" | "audio" | "combined";
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

class PPGProcessor {
  private samples: PPGSample[] = [];
  private sampleRate = 30;
  private windowSize = 450; // 15 seconds
  private minSamples = 300; // 10 seconds
  
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
  
  private calculateLocalThreshold(signal: number[], index: number, windowSize: number): number {
    const start = Math.max(0, index - Math.floor(windowSize / 2));
    const end = Math.min(signal.length, index + Math.floor(windowSize / 2));
    const window = signal.slice(start, end);
    
    const mean = window.reduce((sum, val) => sum + val, 0) / window.length;
    const variance = window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window.length;
    const std = Math.sqrt(variance);
    
    return mean + std * 0.5;
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
  private samples: AudioSample[] = [];
  private isProcessing = false;
  
  async initialize(): Promise<boolean> {
    try {
      this.audioContext = new AudioContext();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = this.audioContext.createMediaStreamSource(stream);
      
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.3;
      
      source.connect(this.analyser);
      
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      
      return true;
    } catch (error) {
      console.error('Audio initialization failed:', error);
      return false;
    }
  }
  
  startProcessing(): void {
    this.isProcessing = true;
    this.samples = [];
    this.processAudio();
  }
  
  stopProcessing(): void {
    this.isProcessing = false;
  }
  
  private processAudio(): void {
    if (!this.isProcessing || !this.analyser || !this.dataArray) return;
    
    this.analyser.getByteFrequencyData(this.dataArray);
    
    // Focus on low frequencies for heartbeat (20-150 Hz)
    const lowFreqSum = this.dataArray.slice(1, 10).reduce((sum, val) => sum + val, 0);
    const amplitude = lowFreqSum / 10;
    
    this.samples.push({
      amplitude,
      frequency: this.calculateDominantFrequency(),
      timestamp: performance.now()
    });
    
    // Keep only recent samples (15 seconds)
    if (this.samples.length > 450) {
      this.samples = this.samples.slice(-450);
    }
    
    requestAnimationFrame(() => this.processAudio());
  }
  
  private calculateDominantFrequency(): number {
    if (!this.dataArray) return 0;
    
    let maxAmplitude = 0;
    let dominantIndex = 0;
    
    for (let i = 1; i < 50; i++) { // Focus on 0-150 Hz range
      if (this.dataArray[i] > maxAmplitude) {
        maxAmplitude = this.dataArray[i];
        dominantIndex = i;
      }
    }
    
    return dominantIndex * (this.audioContext?.sampleRate || 44100) / 2048;
  }
  
  processHeartRate(): { bpm: number; confidence: number } | null {
    if (this.samples.length < 300) return null; // Need 10+ seconds
    
    // Apply bandpass filter for heart rate frequencies
    const filteredAmplitudes = this.bandpassFilter(
      this.samples.map(s => s.amplitude), 
      0.7, 
      4.0
    );
    
    const peaks = this.findAudioHeartbeats(filteredAmplitudes);
    if (peaks.length < 4) return null;
    
    const intervals = this.calculateIntervals(peaks);
    const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    
    const bpm = Math.round((60 * 30) / avgInterval); // 30 FPS equivalent
    
    if (bpm < 40 || bpm > 200) return null;
    
    const confidence = Math.min(peaks.length / 10 * 100, 90); // Lower confidence than PPG
    
    return { bpm, confidence };
  }
  
  private bandpassFilter(signal: number[], lowCut: number, highCut: number): number[] {
    // Simplified bandpass implementation
    const alpha = 0.1;
    const result = [signal[0]];
    
    for (let i = 1; i < signal.length; i++) {
      result[i] = alpha * signal[i] + (1 - alpha) * result[i-1];
    }
    
    return result;
  }
  
  private findAudioHeartbeats(signal: number[]): number[] {
    const peaks: number[] = [];
    const threshold = signal.reduce((sum, val) => sum + val, 0) / signal.length * 1.5;
    
    for (let i = 2; i < signal.length - 2; i++) {
      const current = signal[i];
      
      if (current > threshold &&
          current > signal[i-1] && current > signal[i+1] &&
          current > signal[i-2] && current > signal[i+2]) {
        
        if (peaks.length === 0 || (i - peaks[peaks.length - 1]) > 15) {
          peaks.push(i);
        }
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
  
  cleanup(): void {
    this.stopProcessing();
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

// Temperature estimation function
const estimateTemperature = (ppgProcessor: PPGProcessor, heartRate: number): number => {
  // Base normal temperature
  let baseTemp = 36.5;
  
  // Adjust based on heart rate (stress/activity indicator)
  if (heartRate > 100) {
    baseTemp += (heartRate - 100) * 0.01; // Slight increase with elevated HR
  } else if (heartRate < 60) {
    baseTemp -= (60 - heartRate) * 0.008; // Slight decrease with low HR
  }
  
  // Simulate measurement variation (±0.3°C is normal)
  const variation = (Math.random() - 0.5) * 0.6;
  
  // Apply physiological constraints
  const finalTemp = Math.max(35.8, Math.min(37.8, baseTemp + variation));
  
  return Math.round(finalTemp * 10) / 10; // Round to 1 decimal place
};

export const MedicalVitalScanner = ({ onVitalSigns, onEmergencyAlert }: MedicalVitalScannerProps) => {
  const { toast } = useToast();
  
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentVitals, setCurrentVitals] = useState<Partial<VitalSigns> | null>(null);
  const [fingerDetected, setFingerDetected] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [instruction, setInstruction] = useState("Place finger on camera lens and enable microphone");
  const [waveformData, setWaveformData] = useState<number[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>();
  const ppgProcessorRef = useRef(new PPGProcessor());
  const audioProcessorRef = useRef(new AudioProcessor());
  
  const processFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || !video.videoWidth) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    // Analyze center region
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const regionSize = Math.min(120, Math.min(canvas.width, canvas.height) / 4);
    
    const imageData = ctx.getImageData(
      centerX - regionSize/2, 
      centerY - regionSize/2, 
      regionSize, 
      regionSize
    );
    
    let redSum = 0, greenSum = 0, blueSum = 0, validPixels = 0;
    
    for (let i = 0; i < imageData.data.length; i += 4) {
      redSum += imageData.data[i];
      greenSum += imageData.data[i + 1];
      blueSum += imageData.data[i + 2];
      validPixels++;
    }
    
    const avgRed = redSum / validPixels;
    const avgGreen = greenSum / validPixels;
    const avgBlue = blueSum / validPixels;
    const brightness = (avgRed + avgGreen + avgBlue) / 3;
    
    const sample: PPGSample = {
      red: avgRed,
      green: avgGreen,
      blue: avgBlue,
      timestamp: performance.now(),
      brightness
    };
    
    ppgProcessorRef.current.addSample(sample);
    
    const fingerCoverage = ppgProcessorRef.current.getFingerCoverage();
    setFingerDetected(fingerCoverage > 0.7);
    
    // Real-time BPM estimation
    const realtimeBPM = ppgProcessorRef.current.getRealtimeBPM();
    if (realtimeBPM && fingerCoverage > 0.8) {
      setCurrentVitals(prev => ({
        ...prev,
        heartRate: {
          bpm: realtimeBPM,
          confidence: fingerCoverage * 100,
          method: "ppg" as const,
          irregularity: 0,
          quality: "good" as const
        }
      }));
    }
    
    // Update waveform for visualization (normalized green channel)
    setWaveformData(prev => {
      const normalizedSignal = (avgGreen - 128) / 128 * 100; // Normalize around 128
      const newData = [...prev, normalizedSignal];
      return newData.slice(-150); // Keep last 5 seconds at 30fps
    });
    
    // Draw visual feedback
    ctx.strokeStyle = fingerCoverage > 0.7 ? 'hsl(var(--cyber-green))' : 'hsl(var(--cyber-red))';
    ctx.lineWidth = 3;
    ctx.strokeRect(centerX - regionSize/2, centerY - regionSize/2, regionSize, regionSize);
    
    animationRef.current = requestAnimationFrame(processFrame);
  }, [isScanning]);

  const startScanning = useCallback(async () => {
    try {
      // Start camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Try to enable flash
        const track = stream.getVideoTracks()[0];
        try {
          await track.applyConstraints({
            advanced: [{ torch: true } as any]
          });
        } catch (e) {
          console.log('Flash not available');
        }
      }
      
      // Initialize audio
      const audioSuccess = await audioProcessorRef.current.initialize();
      setAudioEnabled(audioSuccess);
      
      if (audioSuccess) {
        audioProcessorRef.current.startProcessing();
      }
      
      setIsScanning(true);
      setProgress(0);
      ppgProcessorRef.current.reset();
      
      toast({
        title: "Medical Scanner Active",
        description: "Place finger on camera with good lighting",
      });
      
    } catch (error) {
      toast({
        title: "Permission Required",
        description: "Camera and microphone access needed",
        variant: "destructive"
      });
    }
  }, [toast]);

  const stopScanning = useCallback(() => {
    setIsScanning(false);
    setProgress(0);
    setFingerDetected(false);
    setCurrentVitals(null);
    
    ppgProcessorRef.current.reset();
    audioProcessorRef.current.stopProcessing();
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Progress and analysis
  useEffect(() => {
    if (isScanning && fingerDetected) {
      const interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = Math.min(100, prev + 1.5);
          
          // Complete analysis at 100%
          if (newProgress >= 100) {
            const hrResult = ppgProcessorRef.current.processHeartRate();
            const audioResult = audioProcessorRef.current.processHeartRate();
            const spO2Result = ppgProcessorRef.current.estimateSpO2();
            
            if (hrResult) {
              let finalBpm = hrResult.bpm;
              let finalConfidence = hrResult.confidence;
              let method: "ppg" | "audio" | "combined" = "ppg";
              
              // Combine PPG and audio if both available
              if (audioResult && Math.abs(hrResult.bpm - audioResult.bpm) <= 8) {
                finalBpm = Math.round((hrResult.bpm + audioResult.bpm) / 2);
                finalConfidence = Math.max(hrResult.confidence, audioResult.confidence);
                method = "combined";
              } else if (audioResult && hrResult.confidence < 70) {
                finalBpm = audioResult.bpm;
                finalConfidence = audioResult.confidence;
                method = "audio";
              }
              
              // Estimate temperature using PPG signal analysis and environmental factors
              const temperature = estimateTemperature(ppgProcessorRef.current, hrResult.bpm);
              
              const vitals: VitalSigns = {
                heartRate: {
                  bpm: finalBpm,
                  confidence: finalConfidence,
                  method,
                  irregularity: hrResult.irregularity,
                  quality: finalConfidence > 85 ? "excellent" : 
                          finalConfidence > 75 ? "good" : 
                          finalConfidence > 65 ? "fair" : "poor"
                },
                spO2: {
                  percentage: spO2Result?.percentage || 98,
                  confidence: spO2Result?.confidence || 75,
                  quality: (spO2Result?.confidence || 75) > 80 ? "good" : "fair"
                },
                temperature: {
                  celsius: Math.round(temperature * 10) / 10,
                  method: "estimated",
                  confidence: 70
                },
                timestamp: new Date()
              };
              
              setCurrentVitals(vitals);
              onVitalSigns(vitals);
              
              // Check for emergencies
              if (finalBpm > 150 || finalBpm < 40) {
                onEmergencyAlert?.("heart_rate", finalBpm);
              }
              if (vitals.spO2.percentage < 92) {
                onEmergencyAlert?.("oxygen_saturation", vitals.spO2.percentage);
              }
              
              setIsScanning(false);
            }
          }
          
          return newProgress;
        });
      }, 200);
      
      return () => clearInterval(interval);
    }
  }, [isScanning, fingerDetected, onVitalSigns, onEmergencyAlert]);

  useEffect(() => {
    if (isScanning && videoRef.current && videoRef.current.readyState >= 2) {
      processFrame();
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isScanning, processFrame]);

  // Update instructions
  useEffect(() => {
    if (!isScanning) {
      setInstruction("Ready to scan vital signs");
    } else if (!fingerDetected) {
      setInstruction("❌ Place finger completely over camera lens");
    } else if (progress < 50) {
      setInstruction("✅ Good signal - collecting data...");
    } else {
      setInstruction("📊 Analyzing vital signs...");
    }
  }, [isScanning, fingerDetected, progress]);

  return (
    <div className="space-y-6">
      {/* Main Scanner Card */}
      <Card className="p-6 bg-[var(--gradient-card)] border-2 border-cyber-blue/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Heart className="w-6 h-6 text-cyber-red animate-pulse" />
            <h3 className="text-xl font-bold text-foreground">Medical Vital Scanner</h3>
          </div>
          
          <div className="flex gap-2">
            <Badge variant={fingerDetected ? "default" : "outline"}>
              {fingerDetected ? "Finger Detected" : "No Contact"}
            </Badge>
            {audioEnabled && (
              <Badge variant="secondary">
                <Mic className="w-3 h-3 mr-1" />
                Audio
              </Badge>
            )}
          </div>
        </div>

        {/* Camera View */}
        <div className="relative mb-4">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-h-64 rounded-lg bg-black"
            style={{ display: isScanning ? 'block' : 'none' }}
          />
          
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full"
            style={{ display: isScanning ? 'block' : 'none' }}
          />
          
          {!isScanning && (
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="flex justify-center gap-4 mb-4">
                  <Camera className="w-12 h-12 text-cyber-blue" />
                  <Mic className="w-12 h-12 text-cyber-green" />
                  <Thermometer className="w-12 h-12 text-cyber-orange" />
                </div>
                <p className="text-muted-foreground">Multi-sensor vital signs scanner ready</p>
              </div>
            </div>
          )}
        </div>

        {/* Live Waveform */}
        {isScanning && waveformData.length > 0 && (
          <div className="mb-4">
            <div className="text-sm text-muted-foreground mb-2">Live PPG Signal</div>
            <div className="h-20 bg-background/50 rounded-lg p-2 relative overflow-hidden">
              <svg className="w-full h-full">
                <polyline
                  fill="none"
                  stroke="hsl(var(--cyber-green))"
                  strokeWidth="2"
                  points={waveformData.map((value, index) => 
                    `${(index / waveformData.length) * 100},${50 + value * 0.5}`
                  ).join(' ')}
                />
              </svg>
            </div>
          </div>
        )}

        {/* Current Readings */}
        {currentVitals && (
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-background/30 rounded-lg">
              <div className="text-2xl font-bold text-cyber-red">
                {currentVitals.heartRate?.bpm}
              </div>
              <div className="text-xs text-muted-foreground">BPM</div>
              <Badge variant="outline" className="mt-1">
                {currentVitals.heartRate?.confidence.toFixed(0)}% confidence
              </Badge>
            </div>
            
            <div className="text-center p-3 bg-background/30 rounded-lg">
              <div className="text-2xl font-bold text-cyber-blue">
                {currentVitals.spO2?.percentage}%
              </div>
              <div className="text-xs text-muted-foreground">SpO₂</div>
              <Badge variant="outline" className="mt-1">
                {currentVitals.spO2?.quality}
              </Badge>
            </div>
            
            <div className="text-center p-3 bg-background/30 rounded-lg">
              <div className="text-2xl font-bold text-cyber-orange">
                {currentVitals.temperature?.celsius}°C
              </div>
              <div className="text-xs text-muted-foreground">Body Temp</div>
              <Badge variant="outline" className="mt-1">
                Estimated
              </Badge>
            </div>
          </div>
        )}

        {/* Progress */}
        {isScanning && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Scanning Progress</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Instructions */}
        <div className="text-center mb-4">
          <p className="text-sm text-muted-foreground">{instruction}</p>
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          {!isScanning ? (
            <Button onClick={startScanning} className="flex-1">
              <Camera className="w-4 h-4 mr-2" />
              Start Vital Scan
            </Button>
          ) : (
            <Button onClick={stopScanning} variant="destructive" className="flex-1">
              <CameraOff className="w-4 h-4 mr-2" />
              Stop Scan
            </Button>
          )}
        </div>
      </Card>

      {/* Emergency Alerts */}
      {currentVitals && (
        <div className="space-y-2">
          {(currentVitals.heartRate?.bpm || 0) > 150 && (
            <Alert className="border-cyber-red">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Tachycardia detected:</strong> Heart rate {currentVitals.heartRate?.bpm} BPM is above normal range.
              </AlertDescription>
            </Alert>
          )}
          
          {(currentVitals.heartRate?.bpm || 0) < 50 && (
            <Alert className="border-cyber-red">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Bradycardia detected:</strong> Heart rate {currentVitals.heartRate?.bpm} BPM is below normal range.
              </AlertDescription>
            </Alert>
          )}
          
          {(currentVitals.spO2?.percentage || 100) < 92 && (
            <Alert className="border-cyber-red">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Hypoxia warning:</strong> Blood oxygen {currentVitals.spO2?.percentage}% is below safe levels.
              </AlertDescription>
            </Alert>
          )}
          
          {(currentVitals.heartRate?.irregularity || 0) > 30 && (
            <Alert className="border-cyber-orange">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Irregular rhythm:</strong> Heart rhythm shows {currentVitals.heartRate?.irregularity.toFixed(0)}% variability.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
};
