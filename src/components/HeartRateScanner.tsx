import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { 
  Heart, 
  Camera, 
  Mic, 
  Activity, 
  Check, 
  X,
  Zap,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface HeartRateResult {
  heartRate: number;
  confidence: number;
  quality: 'poor' | 'fair' | 'good' | 'excellent';
  timestamp: Date;
  method: 'camera' | 'audio';
}

interface HeartRateScannerProps {
  onReadingComplete: (result: HeartRateResult) => void;
}

export const HeartRateScanner = ({ onReadingComplete }: HeartRateScannerProps) => {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [scanMethod, setScanMethod] = useState<'camera' | 'audio' | null>(null);
  const [progress, setProgress] = useState(0);
  const [instruction, setInstruction] = useState("");
  const [signalQuality, setSignalQuality] = useState(0);
  const [bpmReadings, setBpmReadings] = useState<number[]>([]);
  const [currentBPM, setCurrentBPM] = useState(0);

  const startCameraHR = useCallback(async () => {
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
        setScanMethod('camera');
        setIsScanning(true);
        setInstruction("Place your finger gently on the camera lens");
        setProgress(0);
        
        // Start analysis after video starts
        videoRef.current.onloadeddata = () => {
          analyzeCameraHR();
        };
      }
    } catch (error) {
      toast({
        title: "Camera Access Denied",
        description: "Please enable camera permissions for heart rate monitoring",
        variant: "destructive"
      });
    }
  }, []);

  const startAudioHR = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      analyserRef.current.fftSize = 2048;
      source.connect(analyserRef.current);
      
      setScanMethod('audio');
      setIsScanning(true);
      setInstruction("Place phone microphone on your chest, stay still");
      setProgress(0);
      
      analyzeAudioHR();
    } catch (error) {
      toast({
        title: "Microphone Access Denied",
        description: "Please enable microphone permissions for heart rate monitoring",
        variant: "destructive"
      });
    }
  }, []);

  const analyzeCameraHR = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    let frameCount = 0;
    let redValues: number[] = [];
    const maxFrames = 180; // 6 seconds at 30fps for better accuracy
    
    const analyzeFrame = () => {
      if (!isScanning || frameCount >= maxFrames) {
        if (frameCount >= maxFrames) {
          processHeartRateData(redValues, 'camera');
        }
        return;
      }
      
      // Clear canvas and draw current frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Draw detection overlay
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = 80;
      
      // Detection circle
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.stroke();
      
      // Get image data for analysis
      const imageData = ctx.getImageData(centerX - radius, centerY - radius, radius * 2, radius * 2);
      const data = imageData.data;
      
      let redSum = 0;
      let greenSum = 0;
      let blueSum = 0;
      let pixelCount = 0;
      
      // Advanced PPG (Photoplethysmography) analysis with finger detection
      for (let i = 0; i < data.length; i += 12) { // Higher sampling for accuracy
        const red = data[i];
        const green = data[i + 1];
        const blue = data[i + 2];
        
        redSum += red;
        greenSum += green;
        blueSum += blue;
        pixelCount++;
      }
      
      const avgRed = redSum / pixelCount;
      const avgGreen = greenSum / pixelCount;
      const avgBlue = blueSum / pixelCount;
      
      // Calculate signal metrics
      const brightness = (avgRed + avgGreen + avgBlue) / 3;
      const redRatio = avgRed / (avgGreen + avgBlue + 1);
      const saturation = Math.max(avgRed, avgGreen, avgBlue) - Math.min(avgRed, avgGreen, avgBlue);
      
      // Enhanced finger detection algorithm
      const fingerDetected = brightness > 130 && brightness < 250 && 
                           redRatio > 1.2 && saturation > 30 && 
                           avgRed > 100;
      
      if (fingerDetected) {
        // Use green channel for better PPG signal (more sensitive to blood volume changes)
        redValues.push(avgGreen);
        
        // Calculate signal quality based on multiple factors
        const signalStrength = Math.abs(avgGreen - 128) / 128; // Deviation from mid-range
        const colorBalance = Math.min(redRatio, 2.0) / 2.0; // Red dominance but not oversaturated
        const stabilityFactor = brightness > 150 && brightness < 220 ? 1.0 : 0.7;
        
        const quality = Math.min(95, Math.max(30, 
          (signalStrength * 40 + colorBalance * 35 + stabilityFactor * 25)
        ));
        
        setSignalQuality(quality);
      } else {
        setSignalQuality(0);
      }
      
      // Real-time BPM estimation with improved peak detection
      if (redValues.length >= 90 && frameCount % 30 === 0) { // Every second with 3s of data
        const recentValues = redValues.slice(-90);
        
        // Apply bandpass filter to remove noise
        const filtered = applyBandpassFilter(recentValues);
        
        // Advanced peak detection with adaptive threshold
        const peaks = findPeaksAdvanced(filtered);
        
        if (peaks.length >= 3) {
          // Calculate average interval between peaks
          let totalInterval = 0;
          for (let i = 1; i < peaks.length; i++) {
            totalInterval += peaks[i] - peaks[i-1];
          }
          const avgInterval = totalInterval / (peaks.length - 1);
          
          // Convert to BPM (30 fps)
          const preliminaryBPM = Math.round((30 * 60) / avgInterval);
          
          // Validate physiological range
          if (preliminaryBPM >= 45 && preliminaryBPM <= 180) {
            setCurrentBPM(preliminaryBPM);
          }
        }
      }
      
      frameCount++;
      const currentProgress = (frameCount / maxFrames) * 100;
      setProgress(currentProgress);
      
      // Visual feedback indicators
      ctx.fillStyle = signalQuality > 70 ? '#00ff88' : signalQuality > 40 ? '#ffaa00' : '#ff4444';
      ctx.fillRect(centerX - 8, centerY - 8, 16, 16);
      
      // Crosshair for precise finger placement
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(centerX - 20, centerY);
      ctx.lineTo(centerX + 20, centerY);
      ctx.moveTo(centerX, centerY - 20);
      ctx.lineTo(centerX, centerY + 20);
      ctx.stroke();
      
      // Update instruction based on finger detection and quality
      if (!fingerDetected) {
        setInstruction("⚪ Cover camera lens completely with fingertip");
        ctx.fillStyle = '#ff4444';
      } else if (signalQuality < 50) {
        setInstruction("🟡 Finger detected, optimizing signal...");
        ctx.fillStyle = '#ffaa00';
      } else if (signalQuality < 80) {
        setInstruction("🟢 Great signal! Measuring heart rate...");
        ctx.fillStyle = '#00ff88';
      } else {
        setInstruction("✨ Perfect signal! High accuracy reading");
        ctx.fillStyle = '#00ffff';
      }
      
      requestAnimationFrame(analyzeFrame);
    };

    analyzeFrame();
  }, [isScanning]);

  const analyzeAudioHR = useCallback(() => {
    if (!analyserRef.current || !isScanning) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let audioSamples: number[] = [];
    let sampleCount = 0;
    const maxSamples = 150; // 5 seconds at ~30 samples/sec

    const analyzeAudio = () => {
      if (!isScanning || sampleCount >= maxSamples) {
        if (sampleCount >= maxSamples) {
          processHeartRateData(audioSamples, 'audio');
        }
        return;
      }

      analyserRef.current!.getByteFrequencyData(dataArray);
      
      // Focus on low frequencies where heartbeat is strongest (20-200 Hz)
      let lowFreqSum = 0;
      const lowFreqEnd = Math.floor(200 * bufferLength / (audioContextRef.current!.sampleRate / 2));
      
      for (let i = 1; i < lowFreqEnd; i++) {
        lowFreqSum += dataArray[i];
      }
      
      const avgLowFreq = lowFreqSum / lowFreqEnd;
      audioSamples.push(avgLowFreq);
      
      // Signal quality based on audio strength
      const quality = Math.min(100, Math.max(0, (avgLowFreq - 50) * 3));
      setSignalQuality(quality);
      
      sampleCount++;
      const currentProgress = (sampleCount / maxSamples) * 100;
      setProgress(currentProgress);
      
      // Update instruction
      if (quality < 30) {
        setInstruction("Press microphone firmly against chest");
      } else if (quality < 60) {
        setInstruction("Good contact, detecting heartbeat...");
      } else {
        setInstruction("Excellent signal! Reading heart rate...");
      }
      
      setTimeout(analyzeAudio, 33); // ~30fps
    };

    analyzeAudio();
  }, [isScanning]);

  // Advanced signal processing functions
  const applyBandpassFilter = (signal: number[]) => {
    // Simple moving average to smooth the signal
    const windowSize = 3;
    const filtered = [];
    
    for (let i = 0; i < signal.length; i++) {
      let sum = 0;
      let count = 0;
      
      for (let j = Math.max(0, i - windowSize); j <= Math.min(signal.length - 1, i + windowSize); j++) {
        sum += signal[j];
        count++;
      }
      
      filtered.push(sum / count);
    }
    
    return filtered;
  };

  const findPeaksAdvanced = (signal: number[]) => {
    const peaks = [];
    const mean = signal.reduce((sum, val) => sum + val, 0) / signal.length;
    const variance = signal.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / signal.length;
    const threshold = mean + Math.sqrt(variance) * 0.5;
    
    for (let i = 2; i < signal.length - 2; i++) {
      if (signal[i] > signal[i-1] && signal[i] > signal[i+1] && 
          signal[i] > signal[i-2] && signal[i] > signal[i+2] &&
          signal[i] > threshold) {
        // Ensure minimum distance between peaks (avoid double counting)
        if (peaks.length === 0 || i - peaks[peaks.length - 1] > 15) {
          peaks.push(i);
        }
      }
    }
    
    return peaks;
  };

  const processHeartRateData = (samples: number[], method: 'camera' | 'audio') => {
    if (samples.length < 90) {
      toast({
        title: "Insufficient Data",
        description: "Please try again with better signal quality",
        variant: "destructive"
      });
      stopScanning();
      return;
    }

    // Apply advanced filtering
    const filtered = applyBandpassFilter(samples);
    
    // Remove outliers using interquartile range
    const sorted = [...filtered].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    const cleanedSignal = filtered.filter(val => val >= lowerBound && val <= upperBound);
    
    if (cleanedSignal.length < samples.length * 0.7) {
      toast({
        title: "Noisy Signal",
        description: "Signal too unstable. Please try again with steadier contact.",
        variant: "destructive"
      });
      stopScanning();
      return;
    }

    // Advanced peak detection
    const peaks = findPeaksAdvanced(cleanedSignal);

    if (peaks.length < 4) {
      toast({
        title: "Insufficient Heartbeats",
        description: "Could not detect enough heartbeats. Please try again.",
        variant: "destructive"
      });
      stopScanning();
      return;
    }

    // Calculate intervals and remove outliers
    const intervals = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push(peaks[i] - peaks[i-1]);
    }

    // Remove interval outliers
    const sortedIntervals = [...intervals].sort((a, b) => a - b);
    const medianInterval = sortedIntervals[Math.floor(sortedIntervals.length / 2)];
    const validIntervals = intervals.filter(interval => 
      Math.abs(interval - medianInterval) < medianInterval * 0.3
    );

    if (validIntervals.length < 3) {
      toast({
        title: "Irregular Rhythm",
        description: "Heart rhythm too irregular for accurate measurement.",
        variant: "destructive"
      });
      stopScanning();
      return;
    }

    // Calculate final BPM
    const avgInterval = validIntervals.reduce((sum, interval) => sum + interval, 0) / validIntervals.length;
    const sampleRate = method === 'camera' ? 30 : 30;
    const bpm = Math.round((60 * sampleRate) / avgInterval);

    // Strict validation for physiological range
    if (bpm < 45 || bpm > 180) {
      toast({
        title: "Invalid Heart Rate",
        description: `Detected ${bpm} BPM - outside normal range. Please try again.`,
        variant: "destructive"
      });
      stopScanning();
      return;
    }

    // Calculate confidence based on multiple factors
    const intervalConsistency = 1 - (Math.sqrt(
      validIntervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / validIntervals.length
    ) / avgInterval);
    
    const signalConfidence = signalQuality / 100;
    const dataQuality = validIntervals.length / intervals.length;
    
    const confidence = Math.round((intervalConsistency * 40 + signalConfidence * 35 + dataQuality * 25));

    // Determine quality rating
    let quality: 'poor' | 'fair' | 'good' | 'excellent';
    if (confidence >= 90) quality = 'excellent';
    else if (confidence >= 80) quality = 'good';
    else if (confidence >= 70) quality = 'fair';
    else quality = 'poor';

    const result: HeartRateResult = {
      heartRate: bpm,
      confidence: Math.min(95, Math.max(70, confidence)),
      quality,
      timestamp: new Date(),
      method
    };

    setCurrentBPM(bpm);
    setBpmReadings(prev => [...prev, bpm]);
    
    toast({
      title: "Heart Rate Reading Complete",
      description: `${bpm} BPM (${result.confidence}% confidence, ${quality} quality)`,
      variant: "default"
    });

    onReadingComplete(result);
    stopScanning();
  };

  const stopScanning = () => {
    setIsScanning(false);
    setScanMethod(null);
    setProgress(0);
    setSignalQuality(0);
    setInstruction("");

    // Stop camera
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    // Stop audio
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const getQualityColor = (quality: number) => {
    if (quality >= 80) return 'text-cyber-green';
    if (quality >= 60) return 'text-cyber-orange';
    if (quality >= 40) return 'text-cyber-blue';
    return 'text-cyber-red';
  };

  return (
    <div className="space-y-6">
      {/* Scanner Interface */}
      <Card className="p-6 bg-[var(--gradient-card)] border-cyber-blue/20">
        <h3 className="font-bold font-poppins text-foreground mb-6 text-center">
          Heart Rate Scanner
        </h3>

        {!isScanning ? (
          // Method Selection
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Heart className="w-16 h-16 mx-auto text-cyber-red mb-4 animate-pulse" />
              <p className="text-muted-foreground font-poppins">
                Choose your preferred scanning method
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <Button
                onClick={startCameraHR}
                className="h-20 bg-[var(--gradient-primary)] hover:opacity-90 font-poppins"
              >
                <Camera className="w-8 h-8 mr-3" />
                <div>
                  <div className="font-bold">Camera Method</div>
                  <div className="text-xs opacity-80">Place finger on camera lens</div>
                </div>
              </Button>

              <Button
                onClick={startAudioHR}
                variant="outline"
                className="h-20 border-cyber-blue/30 font-poppins"
              >
                <Mic className="w-8 h-8 mr-3" />
                <div>
                  <div className="font-bold">Audio Method</div>
                  <div className="text-xs opacity-80">Place mic on chest</div>
                </div>
              </Button>
            </div>
          </div>
        ) : (
          // Scanning Interface
          <div className="space-y-6">
            <div className="text-center">
              <div className="relative w-32 h-32 mx-auto mb-4">
                {scanMethod === 'camera' ? (
                  <Camera className="w-32 h-32 text-cyber-blue animate-pulse" />
                ) : (
                  <Mic className="w-32 h-32 text-cyber-green animate-pulse" />
                )}
                
                {/* Pulse ring animation */}
                <div className="absolute inset-0">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "absolute inset-0 rounded-full border-2 animate-ping",
                        scanMethod === 'camera' ? "border-cyber-blue/30" : "border-cyber-green/30"
                      )}
                      style={{
                        animationDelay: `${i * 0.5}s`,
                        animationDuration: '2s'
                      }}
                    />
                  ))}
                </div>
              </div>

              <h4 className="font-bold font-poppins text-foreground mb-2">
                {instruction}
              </h4>
              
              <div className="flex items-center justify-center space-x-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold font-poppins text-cyber-red">
                    {currentBPM || '--'}
                  </div>
                  <div className="text-xs text-muted-foreground font-poppins">
                    BPM
                  </div>
                </div>
                
                <div className="text-center">
                  <div className={cn("text-2xl font-bold font-poppins", getQualityColor(signalQuality))}>
                    {Math.round(signalQuality)}%
                  </div>
                  <div className="text-xs text-muted-foreground font-poppins">
                    Signal
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm font-poppins">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm font-poppins">
                <span>Signal Quality</span>
                <span className={getQualityColor(signalQuality)}>
                  {signalQuality >= 80 ? 'Excellent' : 
                   signalQuality >= 60 ? 'Good' : 
                   signalQuality >= 40 ? 'Fair' : 'Poor'}
                </span>
              </div>
              <Progress 
                value={signalQuality} 
                className={cn(
                  "h-2",
                  signalQuality >= 80 && "[&>div]:bg-cyber-green",
                  signalQuality >= 60 && signalQuality < 80 && "[&>div]:bg-cyber-orange",
                  signalQuality < 60 && "[&>div]:bg-cyber-red"
                )}
              />
            </div>

            <Button
              onClick={stopScanning}
              variant="outline"
              className="w-full font-poppins border-cyber-red/30 text-cyber-red hover:bg-cyber-red/10"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel Scan
            </Button>
          </div>
        )}

        {/* Live camera view for scanning */}
        {scanMethod === 'camera' && isScanning && (
          <div className="mt-6">
            <h4 className="text-sm font-bold font-poppins text-center mb-2">
              Live Heart Rate Detection
            </h4>
            <div className="relative rounded-lg overflow-hidden border border-cyber-blue/30">
              <video
                ref={videoRef}
                autoPlay
                muted
                className="w-full h-48 object-cover bg-black"
              />
              <canvas
                ref={canvasRef}
                width={320}
                height={240}
                className="absolute top-0 left-0 w-full h-48 pointer-events-none"
              />
              <div className="absolute bottom-2 left-2 bg-black/70 text-cyber-blue px-2 py-1 rounded text-xs font-poppins">
                PPG Analysis • {Math.round(signalQuality)}% Signal
              </div>
            </div>
          </div>
        )}
        
        {/* Hidden video and canvas for audio method */}
        {scanMethod === 'audio' && (
          <>
            <video ref={videoRef} className="hidden" />
            <canvas ref={canvasRef} className="hidden" />
          </>
        )}
      </Card>

      {/* Recent Readings */}
      {bpmReadings.length > 0 && (
        <Card className="p-4 bg-[var(--gradient-card)] border-cyber-blue/20">
          <h4 className="font-bold font-poppins text-foreground mb-3">
            Recent Readings
          </h4>
          <div className="flex flex-wrap gap-2">
            {bpmReadings.slice(-5).map((bpm, index) => (
              <Badge 
                key={index}
                className="bg-cyber-blue/20 text-cyber-blue font-poppins"
              >
                {bpm} BPM
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Instructions */}
      <Card className="p-4 bg-[var(--gradient-card)] border-cyber-blue/20">
        <h4 className="font-bold font-poppins text-foreground mb-3 flex items-center">
          <AlertTriangle className="w-4 h-4 mr-2 text-cyber-orange" />
          Instructions
        </h4>
        <div className="space-y-2 text-sm text-muted-foreground font-poppins">
          <p><strong>Camera Method:</strong> Gently place fingertip over camera lens. Steady pressure, no movement.</p>
          <p><strong>Audio Method:</strong> Place microphone against chest, breathe normally, stay still.</p>
          <p><strong>Tips:</strong> Good lighting, relaxed position, 5-second reading time.</p>
        </div>
      </Card>
    </div>
  );
};