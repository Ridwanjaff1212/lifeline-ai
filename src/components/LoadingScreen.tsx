import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface LoadingScreenProps {
  onComplete: () => void;
}

export const LoadingScreen = ({ onComplete }: LoadingScreenProps) => {
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState("Initializing Guardian Systems...");

  const messages = [
    "Initializing Guardian Systems...",
    "Connecting to Emergency Networks...",
    "Calibrating Health Sensors...",
    "Activating AI Triage...",
    "Guardian Activated. Every Second Counts."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 20;
        
        if (newProgress <= 80) {
          setCurrentMessage(messages[Math.floor(newProgress / 20)]);
        } else if (newProgress >= 100) {
          setCurrentMessage(messages[4]);
          setTimeout(onComplete, 1000);
          return 100;
        }
        
        return newProgress;
      });
    }, 800);

    return () => clearInterval(interval);
  }, [onComplete]);

  useEffect(() => {
    // Play heartbeat sound
    if ('speechSynthesis' in window && progress === 100) {
      const utterance = new SpeechSynthesisUtterance("Guardian Activated");
      utterance.rate = 0.8;
      utterance.pitch = 0.9;
      speechSynthesis.speak(utterance);
    }
  }, [progress]);

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <div className="text-center space-y-8">
        {/* Logo and Title */}
        <div className="space-y-4">
          <div className="relative">
            <div className={cn(
              "w-32 h-32 mx-auto rounded-full bg-[var(--gradient-primary)] flex items-center justify-center",
              "animate-pulse shadow-[var(--glow-primary)]"
            )}>
              <div className="w-24 h-24 rounded-full bg-background flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-cyber-blue animate-pulse" />
              </div>
            </div>
            
            {/* Pulse rings */}
            <div className="absolute inset-0 w-32 h-32 mx-auto">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "absolute inset-0 rounded-full border-2 border-cyber-blue/30",
                    "animate-ping"
                  )}
                  style={{
                    animationDelay: `${i * 0.5}s`,
                    animationDuration: '2s'
                  }}
                />
              ))}
            </div>
          </div>
          
          <h1 className="text-6xl font-bold font-poppins bg-[var(--gradient-primary)] bg-clip-text text-transparent">
            LifeLine AI
          </h1>
          <p className="text-cyber-blue text-xl font-poppins font-medium">
            Every Second Counts
          </p>
        </div>

        {/* Heartbeat Waveform */}
        <div className="w-80 h-16 mx-auto relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyber-blue/20 to-transparent">
            <svg className="w-full h-full" viewBox="0 0 320 64">
              <path
                d="M0,32 L50,32 L60,20 L70,44 L80,8 L90,56 L100,32 L320,32"
                fill="none"
                stroke="hsl(var(--cyber-blue))"
                strokeWidth="2"
                className="animate-pulse"
              />
            </svg>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-4">
          <div className="w-80 h-2 mx-auto bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-[var(--gradient-primary)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <p className="text-muted-foreground font-poppins text-sm">
            {currentMessage}
          </p>
          
          <p className="text-xs text-muted-foreground/60 font-poppins">
            {progress}% Complete
          </p>
        </div>
      </div>
    </div>
  );
};