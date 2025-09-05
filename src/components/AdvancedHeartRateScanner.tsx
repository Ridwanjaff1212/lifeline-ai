import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Heart, 
  Camera, 
  CameraOff, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  Zap,
  BarChart3,
  Target
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

interface HeartRateResult {
  heartRate: number;
  confidence: number;
  snr: number;
  quality: "excellent" | "good" | "fair" | "poor";
  timestamp: Date;
  method: "ppg";
  irregularity: number;
  samples: number;
}

interface AdvancedHeartRateScannerProps {
  onReadingComplete: (result: HeartRateResult) => void;
  onRealTimeUpdate?: (bpm: number, confidence: number) => void;
}

class PPGSignalProcessor {
  private samples: PPGSample[] = [];
  private sampleRate = 30; // 30 FPS target
  private windowSize = 450; // 15 seconds of data
  private minSamples = 300; // 10 seconds minimum
  
  addSample(sample: PPGSample): void {
    this.samples.push(sample);
    
    // Keep only recent samples
    if (this.samples.length > this.windowSize) {
      this.samples = this.samples.slice(-this.windowSize);
    }
  }
  
  canAnalyze(): boolean {
    return this.samples.length >= this.minSamples;
  }
  
  getFingerCoverage(): number {
    if (this.samples.length < 30) return 0;
    
    const recent = this.samples.slice(-30);
    let goodSamples = 0;
    
    for (const sample of recent) {
      // Check for proper finger placement:
      // 1. Brightness in optimal range
      // 2. Red channel dominance (skin tone)
      // 3. Sufficient signal strength
      const brightnessGood = sample.brightness > 120 && sample.brightness < 220;
      const redDominance = sample.red > sample.green && sample.red > sample.blue;
      const signalStrength = sample.red > 100;
      
      if (brightnessGood && redDominance && signalStrength) {
        goodSamples++;
      }
    }
    
    return goodSamples / recent.length;
  }
  
  processHeartRate(): HeartRateResult | null {
    if (!this.canAnalyze()) return null;
    
    const fingerCoverage = this.getFingerCoverage();
    if (fingerCoverage < 0.7) return null;
    
    // Use green channel for PPG (more sensitive to blood volume changes)
    const greenChannel = this.samples.map(s => s.green);
    
    // Step 1: Detrend the signal (remove DC component)
    const mean = greenChannel.reduce((sum, val) => sum + val, 0) / greenChannel.length;
    const detrended = greenChannel.map(val => val - mean);
    
    // Step 2: Apply bandpass filter (0.7-4 Hz for 42-240 BPM)
    const filtered = this.butterworthBandpass(detrended, 0.7, 4.0, this.sampleRate);
    
    // Step 3: Find peaks with adaptive threshold
    const peaks = this.findAdaptivePeaks(filtered);
    
    if (peaks.length < 4) return null;
    
    // Step 4: Calculate intervals and validate
    const intervals = this.calculateIntervals(peaks);
    const { cleanIntervals, irregularity } = this.validateIntervals(intervals);
    
    if (cleanIntervals.length < 3) return null;
    
    // Step 5: Calculate heart rate
    const avgInterval = cleanIntervals.reduce((sum, val) => sum + val, 0) / cleanIntervals.length;
    const heartRate = Math.round((60 * this.sampleRate) / avgInterval);
    
    // Step 6: Validate physiological range
    if (heartRate < 40 || heartRate > 200) return null;
    
    // Step 7: Calculate confidence metrics
    const snr = this.calculateSNR(filtered);
    const intervalStability = this.calculateStability(cleanIntervals);
    const signalQuality = Math.min(fingerCoverage, 1.0);
    
    const confidence = (snr * 0.4 + intervalStability * 0.4 + signalQuality * 0.2);
    
    let quality: "excellent" | "good" | "fair" | "poor";
    if (confidence > 0.85) quality = "excellent";
    else if (confidence > 0.75) quality = "good";
    else if (confidence > 0.65) quality = "fair";
    else quality = "poor";
    
    return {
      heartRate,
      confidence: Math.round(confidence * 100),
      snr: Math.round(snr * 100) / 100,
      quality,
      timestamp: new Date(),
      method: "ppg",
      irregularity: Math.round(irregularity * 100),
      samples: this.samples.length
    };
  }
  
  private butterworthBandpass(signal: number[], lowCut: number, highCut: number, sampleRate: number): number[] {
    // Simplified Butterworth bandpass filter
    const nyquist = sampleRate / 2;
    const low = lowCut / nyquist;
    const high = highCut / nyquist;
    
    // High-pass component
    let filtered = this.highPassFilter(signal, low);
    
    // Low-pass component
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
    
    // Calculate moving average and standard deviation
    const movingStats = this.calculateMovingStats(signal, windowSize);
    
    for (let i = 2; i < signal.length - 2; i++) {
      const current = signal[i];
      const threshold = movingStats[i].mean + movingStats[i].std * 0.5;
      
      // Peak conditions:
      // 1. Local maximum
      // 2. Above adaptive threshold
      // 3. Minimum distance from previous peak
      const isLocalMax = current > signal[i-1] && current > signal[i+1] &&
                        current > signal[i-2] && current > signal[i+2];
      const aboveThreshold = current > threshold;
      const minDistance = peaks.length === 0 || (i - peaks[peaks.length - 1]) > 15; // ~0.5s
      
      if (isLocalMax && aboveThreshold && minDistance) {
        peaks.push(i);
      }
    }
    
    return peaks;
  }
  
  private calculateMovingStats(signal: number[], windowSize: number): Array<{mean: number, std: number}> {
    const stats = [];
    
    for (let i = 0; i < signal.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(signal.length, i + Math.floor(windowSize / 2));
      const window = signal.slice(start, end);
      
      const mean = window.reduce((sum, val) => sum + val, 0) / window.length;
      const variance = window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window.length;
      const std = Math.sqrt(variance);
      
      stats.push({ mean, std });
    }
    
    return stats;
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
    
    // Calculate median for outlier detection
    const sorted = [...intervals].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    
    // Remove outliers (intervals too far from median)
    const cleanIntervals = intervals.filter(interval => 
      Math.abs(interval - median) < median * 0.3
    );
    
    // Calculate irregularity (coefficient of variation)
    if (cleanIntervals.length < 2) return { cleanIntervals: [], irregularity: 1 };
    
    const mean = cleanIntervals.reduce((sum, val) => sum + val, 0) / cleanIntervals.length;
    const variance = cleanIntervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / cleanIntervals.length;
    const std = Math.sqrt(variance);
    const irregularity = std / mean; // Coefficient of variation
    
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
    
    return Math.max(0, 1 - cv); // Lower coefficient of variation = higher stability
  }
  
  reset(): void {
    this.samples = [];
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
}

export const AdvancedHeartRateScanner = ({ onReadingComplete, onRealTimeUpdate }: AdvancedHeartRateScannerProps) => {
  const { toast } = useToast();
  
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fingerDetected, setFingerDetected] = useState(false);
  const [currentBPM, setCurrentBPM] = useState<number | null>(null);
  const [signalQuality, setSignalQuality] = useState(0);
  const [instruction, setInstruction] = useState("Place your finger on the camera lens");
  const [hasPermission, setHasPermission] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>();
  const processorRef = useRef(new PPGSignalProcessor());
  
  const [diagnostics, setDiagnostics] = useState({
    fingerCoverage: 0,
    snr: 0,
    sampleCount: 0,
    lastPeaks: [] as number[]
  });

  const processFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || !video.videoWidth) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current frame
    ctx.drawImage(video, 0, 0);
    
    // Analyze center region for finger detection
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const regionSize = Math.min(120, Math.min(canvas.width, canvas.height) / 4);
    
    const imageData = ctx.getImageData(
      centerX - regionSize/2, 
      centerY - regionSize/2, 
      regionSize, 
      regionSize
    );
    
    // Calculate average RGB values
    let redSum = 0, greenSum = 0, blueSum = 0;
    let validPixels = 0;
    
    for (let i = 0; i < imageData.data.length; i += 4) {
      const red = imageData.data[i];
      const green = imageData.data[i + 1];
      const blue = imageData.data[i + 2];
      
      redSum += red;
      greenSum += green;
      blueSum += blue;
      validPixels++;
    }
    
    const avgRed = redSum / validPixels;
    const avgGreen = greenSum / validPixels;
    const avgBlue = blueSum / validPixels;
    const brightness = (avgRed + avgGreen + avgBlue) / 3;
    
    // Create PPG sample
    const sample: PPGSample = {
      red: avgRed,
      green: avgGreen,
      blue: avgBlue,
      timestamp: performance.now(),
      brightness
    };
    
    processorRef.current.addSample(sample);
    
    // Update finger detection and diagnostics
    const fingerCoverage = processorRef.current.getFingerCoverage();
    setFingerDetected(fingerCoverage > 0.7);
    
    setDiagnostics({
      fingerCoverage,
      snr: 0, // Will be updated during analysis
      sampleCount: processorRef.current.canAnalyze() ? processorRef.current['samples'].length : 0,
      lastPeaks: []
    });
    
    // Real-time BPM estimation
    const realtimeBPM = processorRef.current.getRealtimeBPM();
    if (realtimeBPM) {
      setCurrentBPM(realtimeBPM);
      onRealTimeUpdate?.(realtimeBPM, fingerCoverage);
    }
    
    // Update signal quality
    setSignalQuality(fingerCoverage * 100);
    
    // Update instructions
    if (fingerCoverage < 0.3) {
      setInstruction("❌ Place finger completely over camera lens");
    } else if (fingerCoverage < 0.7) {
      setInstruction("⚠️ Cover camera completely - detecting pulse...");
    } else if (!processorRef.current.canAnalyze()) {
      setInstruction("✅ Good signal - collecting data...");
    } else {
      setInstruction("📊 Analyzing heart rate pattern...");
    }
    
    // Draw visual feedback
    ctx.strokeStyle = fingerCoverage > 0.7 ? '#00ff88' : fingerCoverage > 0.3 ? '#ffaa00' : '#ff4444';
    ctx.lineWidth = 3;
    ctx.strokeRect(centerX - regionSize/2, centerY - regionSize/2, regionSize, regionSize);
    
    // Draw center crosshair
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX - 20, centerY);
    ctx.lineTo(centerX + 20, centerY);
    ctx.moveTo(centerX, centerY - 20);
    ctx.lineTo(centerX, centerY + 20);
    ctx.stroke();
    
    animationRef.current = requestAnimationFrame(processFrame);
  }, [isScanning, onRealTimeUpdate]);

  // Progress tracking
  useEffect(() => {
    if (isScanning && fingerDetected) {
      const interval = setInterval(() => {
        setProgress(prev => {
          const canAnalyze = processorRef.current.canAnalyze();
          const increment = fingerDetected && signalQuality > 70 ? 2 : 
                           fingerDetected ? 1 : 0;
          
          const newProgress = Math.min(100, prev + increment);
          
          // Complete reading when sufficient data collected
          if (newProgress >= 100 && canAnalyze) {
            const result = processorRef.current.processHeartRate();
            if (result && result.confidence > 70) {
              setIsScanning(false);
              
              // Validate result
              if (result.heartRate < 50) {
                toast({
                  title: "Bradycardia Detected",
                  description: `Low heart rate: ${result.heartRate} BPM`,
                  variant: "destructive"
                });
              } else if (result.heartRate > 120) {
                toast({
                  title: "Tachycardia Detected", 
                  description: `High heart rate: ${result.heartRate} BPM`,
                  variant: "destructive"
                });
              }
              
              if (result.irregularity > 30) {
                toast({
                  title: "Irregular Rhythm Detected",
                  description: "Heart rhythm appears irregular",
                  variant: "destructive"
                });
              }
              
              onReadingComplete(result);
            } else {
              toast({
                title: "Low Quality Reading",
                description: "Please try again with better finger placement",
                variant: "destructive"
              });
              setProgress(80); // Retry
            }
          }
          
          return newProgress;
        });
      }, 300);
      
      return () => clearInterval(interval);
    }
  }, [isScanning, fingerDetected, signalQuality, onReadingComplete, toast]);

  const startScanning = useCallback(async () => {
    try {
      // Request rear camera with flash
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
        
        // Try to enable torch/flash
        const track = stream.getVideoTracks()[0];
        try {
          await track.applyConstraints({
            advanced: [{ torch: true } as any]
          });
        } catch (e) {
          console.log('Torch not available on this device');
        }
        
        setIsScanning(true);
        setProgress(0);
        setHasPermission(true);
        processorRef.current.reset();
        
        toast({
          title: "Heart Rate Scanner Active",
          description: "Place finger over camera lens with flash on",
          variant: "default"
        });
      }
    } catch (error) {
      toast({
        title: "Camera Access Required",
        description: "Please enable camera permissions",
        variant: "destructive"
      });
      setHasPermission(false);
    }
  }, [toast]);

  const stopScanning = useCallback(() => {
    setIsScanning(false);
    setProgress(0);
    setFingerDetected(false);
    setCurrentBPM(null);
    setSignalQuality(0);
    processorRef.current.reset();
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

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

  return (
    <Card className="p-6 bg-[var(--gradient-card)] border-2 border-cyber-red/30">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Heart className="w-6 h-6 text-cyber-red animate-pulse" />
          <h3 className="text-xl font-bold text-foreground">Scientific PPG Scanner</h3>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            variant="outline"
            size="sm"
          >
            <BarChart3 className="w-4 h-4" />
          </Button>
          
          <Badge variant={fingerDetected ? "default" : "outline"}>
            {fingerDetected ? "Finger Detected" : "No Finger"}
          </Badge>
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
              <Camera className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Camera ready for heart rate scanning</p>
            </div>
          </div>
        )}
      </div>

      {/* Current Reading */}
      <div className="text-center mb-4">
        <div className={cn(
          "text-4xl font-bold transition-colors",
          currentBPM ? "text-cyber-red" : "text-muted-foreground"
        )}>
          {currentBPM || "---"}
        </div>
        <div className="text-sm text-muted-foreground">BPM</div>
        
        {signalQuality > 0 && (
          <div className="mt-2">
            <Badge variant={signalQuality > 80 ? "default" : signalQuality > 60 ? "secondary" : "outline"}>
              Signal: {signalQuality.toFixed(0)}%
            </Badge>
          </div>
        )}
      </div>

      {/* Progress */}
      {isScanning && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span>Analysis Progress</span>
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
            Start PPG Scan
          </Button>
        ) : (
          <Button onClick={stopScanning} variant="destructive" className="flex-1">
            <CameraOff className="w-4 h-4 mr-2" />
            Stop Scan
          </Button>
        )}
      </div>

      {/* Diagnostics Panel */}
      {showDiagnostics && (
        <div className="mt-4 p-4 border-t border-border">
          <h4 className="font-medium mb-3">Signal Diagnostics</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Finger Coverage</div>
              <div className="font-medium">{(diagnostics.fingerCoverage * 100).toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-muted-foreground">Sample Count</div>
              <div className="font-medium">{diagnostics.sampleCount}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Signal Quality</div>
              <div className="font-medium">{signalQuality.toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-muted-foreground">Real-time BPM</div>
              <div className="font-medium">{currentBPM || "Analyzing..."}</div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
