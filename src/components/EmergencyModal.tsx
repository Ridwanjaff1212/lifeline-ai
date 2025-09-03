import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { MapPin, Phone, Heart, Thermometer, User } from "lucide-react";

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  emergencyType: string;
  onEmergencyConfirmed: () => void;
}

export const EmergencyModal = ({ isOpen, onClose, emergencyType, onEmergencyConfirmed }: EmergencyModalProps) => {
  const [countdown, setCountdown] = useState(10);
  const [phase, setPhase] = useState<"voice-check" | "countdown" | "emergency">("voice-check");
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCountdown(10);
      setPhase("voice-check");
      setIsPlaying(false);
      
      // Simulate voice prompt
      setTimeout(() => {
        setIsPlaying(true);
        setTimeout(() => {
          setPhase("countdown");
        }, 3000);
      }, 1000);
    }
  }, [isOpen]);

  useEffect(() => {
    if (phase === "countdown" && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (phase === "countdown" && countdown === 0) {
      setPhase("emergency");
      onEmergencyConfirmed();
    }
  }, [countdown, phase, onEmergencyConfirmed]);

  const handleCancel = () => {
    setPhase("voice-check");
    setCountdown(10);
    onClose();
  };

  const getCurrentTime = () => {
    return new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kuwait",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  const getSimulatedVitals = () => ({
    heartRate: Math.floor(Math.random() * 40) + 80,
    spO2: Math.floor(Math.random() * 5) + 95,
    temperature: (Math.random() * 2 + 36).toFixed(1)
  });

  const vitals = getSimulatedVitals();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border font-poppins">
        <DialogHeader>
          <DialogTitle className="text-center text-foreground">
            🚨 {emergencyType} Detected
          </DialogTitle>
        </DialogHeader>

        {phase === "voice-check" && (
          <div className="space-y-4 text-center">
            <div className="p-6">
              <div className={`text-6xl animate-pulse ${isPlaying ? "text-cyber-blue" : "text-muted-foreground"}`}>
                🔊
              </div>
              <p className="mt-4 text-lg font-medium text-foreground">
                "Are you okay?"
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Voice check in progress...
              </p>
            </div>
            <Button 
              onClick={handleCancel}
              className="w-full bg-[var(--gradient-success)] text-white font-medium hover:shadow-[var(--glow-success)]"
            >
              I'm Okay - Cancel Alert
            </Button>
          </div>
        )}

        {phase === "countdown" && (
          <div className="space-y-4 text-center">
            <div className="p-6">
              <div className="text-6xl text-cyber-red animate-pulse">⏰</div>
              <p className="mt-4 text-xl font-bold text-foreground">
                Emergency Response in {countdown}s
              </p>
              <Progress 
                value={(10 - countdown) * 10} 
                className="mt-4 h-3"
              />
            </div>
            <Button 
              onClick={handleCancel}
              className="w-full bg-[var(--gradient-success)] text-white font-medium hover:shadow-[var(--glow-success)]"
            >
              Cancel Emergency Response
            </Button>
          </div>
        )}

        {phase === "emergency" && (
          <div className="space-y-4">
            <div className="text-center p-4 bg-[var(--gradient-danger)] rounded-lg">
              <div className="text-4xl text-white">🚨</div>
              <p className="text-white font-bold text-lg mt-2">EMERGENCY ACTIVATED</p>
            </div>

            <Card className="p-4 bg-[var(--gradient-card)] border-cyber-blue/30">
              <h3 className="font-semibold text-cyber-blue mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Incident Pack Created
              </h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-cyber-green" />
                  <span>Kuwait City, Kuwait (29.3759°N, 47.9774°E)</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-cyber-red" />
                  <span>Heart Rate: {vitals.heartRate} BPM</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-cyber-blue" />
                  <span>SpO₂: {vitals.spO2}% | Temp: {vitals.temperature}°C</span>
                </div>
                
                <div className="text-xs text-muted-foreground mt-2">
                  Time: {getCurrentTime()}
                </div>
              </div>
            </Card>

            <div className="text-center p-4 bg-cyber-red/10 border border-cyber-red/30 rounded-lg">
              <Phone className="h-8 w-8 text-cyber-red mx-auto mb-2" />
              <p className="text-cyber-red font-bold">
                Dialing Emergency Number
              </p>
              <p className="text-2xl font-mono text-cyber-red mt-1">
                66269068
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Kuwait Emergency Services
              </p>
            </div>

            <Button 
              onClick={onClose}
              className="w-full bg-[var(--gradient-primary)] text-white font-medium"
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};