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
    const maxFrames = 150; // 5 seconds at 30fps
    const startTime = Date.now();

    const analyzeFrame = () => {
      if (!isScanning || frameCount >= maxFrames) {
        if (frameCount >= maxFrames) {
          processHeartRateData(redValues, 'camera');
        }
        return;
      }
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      let redSum = 0;
      let pixelCount = 0;
      
      // Sample center region for better finger detection
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = 100;
      
      for (let x = centerX - radius; x < centerX + radius; x++) {
        for (let y = centerY - radius; y < centerY + radius; y++) {
          if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
            const index = (y * canvas.width + x) * 4;
            redSum += data[index]; // Red channel
            pixelCount++;
          }
        }
      }
      
      const avgRed = redSum / pixelCount;
      redValues.push(avgRed);
      
      // Calculate signal quality based on red intensity
      const quality = Math.min(100, Math.max(0, (avgRed - 120) * 2));
      setSignalQuality(quality);
      
      frameCount++;
      const currentProgress = (frameCount / maxFrames) * 100;
      setProgress(currentProgress);
      
      // Update instruction based on quality
      if (quality < 30) {
        setInstruction("Cover camera lens completely with fingertip");
      } else if (quality < 60) {
        setInstruction("Press gently, hold steady...");
      } else {
        setInstruction("Perfect! Reading heart rate...");
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

  const processHeartRateData = (samples: number[], method: 'camera' | 'audio') => {
    if (samples.length < 50) {
      toast({
        title: "Insufficient Data",
        description: "Please try again with better signal quality",
        variant: "destructive"
      });
      stopScanning();
      return;
    }

    // Apply smoothing filter
    const smoothed = samples.map((value, index) => {
      const start = Math.max(0, index - 2);
      const end = Math.min(samples.length, index + 3);
      const slice = samples.slice(start, end);
      return slice.reduce((sum, v) => sum + v, 0) / slice.length;
    });

    // Find peaks
    const peaks: number[] = [];
    const threshold = smoothed.reduce((sum, v) => sum + v, 0) / smoothed.length;
    
    for (let i = 2; i < smoothed.length - 2; i++) {
      if (smoothed[i] > smoothed[i-1] && 
          smoothed[i] > smoothed[i+1] && 
          smoothed[i] > threshold * 1.1) {
        peaks.push(i);
      }
    }

    if (peaks.length < 3) {
      toast({
        title: "No Heartbeat Detected",
        description: "Please ensure proper contact and try again",
        variant: "destructive"
      });
      stopScanning();
      return;
    }

    // Calculate intervals between peaks
    const intervals = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push(peaks[i] - peaks[i-1]);
    }

    // Calculate BPM
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const sampleRate = method === 'camera' ? 30 : 30; // fps or samples per second
    const bpm = Math.round((60 * sampleRate) / avgInterval);

    // Validate BPM range
    if (bpm < 40 || bpm > 200) {
      toast({
        title: "Invalid Reading",
        description: "Heart rate outside normal range. Please try again.",
        variant: "destructive"
      });
      stopScanning();
      return;
    }

    // Calculate confidence based on signal quality and consistency
    const intervalVariation = Math.sqrt(
      intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length
    );
    const consistency = Math.max(0, 100 - (intervalVariation / avgInterval) * 100);
    const confidence = Math.round((signalQuality + consistency) / 2);

    // Determine quality
    let quality: 'poor' | 'fair' | 'good' | 'excellent';
    if (confidence >= 90) quality = 'excellent';
    else if (confidence >= 75) quality = 'good';
    else if (confidence >= 60) quality = 'fair';
    else quality = 'poor';

    const result: HeartRateResult = {
      heartRate: bpm,
      confidence,
      quality,
      timestamp: new Date(),
      method
    };

    setCurrentBPM(bpm);
    setBpmReadings(prev => [...prev, bpm]);
    
    toast({
      title: "Heart Rate Reading Complete",
      description: `${bpm} BPM (${confidence}% confidence, ${quality} quality)`,
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

        {/* Hidden video and canvas for camera method */}
        <video
          ref={videoRef}
          autoPlay
          muted
          className="hidden"
        />
        <canvas
          ref={canvasRef}
          width={320}
          height={240}
          className="hidden"
        />
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