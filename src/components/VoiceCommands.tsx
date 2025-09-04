import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Mic, 
  MicOff, 
  Volume2, 
  Heart, 
  Phone, 
  MapPin,
  PlayCircle,
  PauseCircle,
  RotateCcw
} from "lucide-react";

interface VoiceCommandsProps {
  onEmergencyTrigger: (type: string) => void;
  onLocationShare: () => void;
  onCommand?: (command: any) => void;
  userProfile: any;
}

interface CPRStep {
  step: number;
  instruction: string;
  duration: number;
  compressionRate?: number;
}

const cprSteps: CPRStep[] = [
  { step: 1, instruction: "Check for responsiveness - tap shoulders and shout", duration: 10 },
  { step: 2, instruction: "Call emergency services immediately", duration: 5 },
  { step: 3, instruction: "Position hands center of chest, between nipples", duration: 15 },
  { step: 4, instruction: "Begin chest compressions - push hard and fast", duration: 0, compressionRate: 100 },
  { step: 5, instruction: "Allow complete chest recoil between compressions", duration: 0 },
  { step: 6, instruction: "Continue until help arrives or person responds", duration: 0 }
];

export const VoiceCommands = ({ onEmergencyTrigger, onLocationShare, userProfile }: VoiceCommandsProps) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [showCPRGuide, setShowCPRGuide] = useState(false);
  const [currentCPRStep, setCurrentCPRStep] = useState(0);
  const [cprTimer, setCprTimer] = useState(0);
  const [compressionCount, setCompressionCount] = useState(0);
  const [isMetronomeActive, setIsMetronomeActive] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const metronomeRef = useRef<any>(null);
  const stepTimerRef = useRef<any>(null);

  useEffect(() => {
    // Check if Web Speech API is supported
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setVoiceSupported(true);
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setTranscript(finalTranscript);
          processVoiceCommand(finalTranscript.toLowerCase());
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (metronomeRef.current) {
        clearInterval(metronomeRef.current);
      }
      if (stepTimerRef.current) {
        clearInterval(stepTimerRef.current);
      }
    };
  }, []);

  const processVoiceCommand = (command: string) => {
    console.log("Processing command:", command);
    
    if (command.includes('lifeline') || command.includes('life line')) {
      if (command.includes("i'm hurt") || command.includes("im hurt") || command.includes("help me")) {
        speak("Emergency detected. Starting Guardian Autopilot sequence.");
        onEmergencyTrigger("Voice Emergency");
      } else if (command.includes("send my location") || command.includes("share location")) {
        speak("Sharing your location with emergency contacts.");
        onLocationShare();
      } else if (command.includes("cpr") || command.includes("show me cpr")) {
        speak("Starting CPR instruction guide.");
        setShowCPRGuide(true);
        setCurrentCPRStep(0);
      } else if (command.includes("stop") || command.includes("cancel")) {
        speak("Voice commands stopped.");
        setShowCPRGuide(false);
        setIsMetronomeActive(false);
        if (metronomeRef.current) clearInterval(metronomeRef.current);
      }
    }
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  const startListening = () => {
    if (recognitionRef.current && voiceSupported) {
      setTranscript("");
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const startCPRGuide = () => {
    setShowCPRGuide(true);
    setCurrentCPRStep(0);
    setCprTimer(0);
    speak(cprSteps[0].instruction);
    
    if (cprSteps[0].duration > 0) {
      stepTimerRef.current = setInterval(() => {
        setCprTimer(prev => {
          if (prev >= cprSteps[0].duration) {
            nextCPRStep();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
  };

  const nextCPRStep = () => {
    const nextStep = currentCPRStep + 1;
    if (nextStep < cprSteps.length) {
      setCurrentCPRStep(nextStep);
      setCprTimer(0);
      speak(cprSteps[nextStep].instruction);
      
      if (cprSteps[nextStep].compressionRate) {
        startMetronome(cprSteps[nextStep].compressionRate!);
      }
      
      if (cprSteps[nextStep].duration > 0) {
        if (stepTimerRef.current) clearInterval(stepTimerRef.current);
        stepTimerRef.current = setInterval(() => {
          setCprTimer(prev => {
            if (prev >= cprSteps[nextStep].duration) {
              nextCPRStep();
              return 0;
            }
            return prev + 1;
          });
        }, 1000);
      }
    }
  };

  const startMetronome = (bpm: number) => {
    setIsMetronomeActive(true);
    const interval = 60000 / bpm; // Convert BPM to milliseconds
    
    metronomeRef.current = setInterval(() => {
      // Play metronome sound (beep)
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
      
      setCompressionCount(prev => prev + 1);
    }, interval);
  };

  const stopCPRGuide = () => {
    setShowCPRGuide(false);
    setIsMetronomeActive(false);
    setCompressionCount(0);
    if (metronomeRef.current) clearInterval(metronomeRef.current);
    if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    speak("CPR guide stopped.");
  };

  return (
    <div className="space-y-4 font-poppins">
      {/* Voice Recognition Status */}
      <Card className={`p-4 bg-[var(--gradient-card)] ${isListening ? 'border-cyber-blue/50 shadow-[var(--glow-primary)]' : 'border-border'}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-cyber-blue flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            Voice Commands
          </h3>
          {voiceSupported ? (
            <Button
              onClick={isListening ? stopListening : startListening}
              className={`${isListening ? 'bg-cyber-red' : 'bg-cyber-green'} text-white`}
              size="sm"
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          ) : (
            <div className="text-xs text-cyber-orange">Voice not supported</div>
          )}
        </div>
        
        {isListening && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-cyber-blue rounded-full animate-pulse"></div>
              <span className="text-sm text-cyber-blue">Listening...</span>
            </div>
            {transcript && (
              <div className="p-2 bg-background/30 rounded text-sm">
                "{transcript}"
              </div>
            )}
          </div>
        )}
        
        <div className="mt-3 text-xs text-muted-foreground">
          <strong>Try saying:</strong><br/>
          • "LifeLine, I'm hurt" - Start emergency<br/>
          • "Send my location" - Share with contacts<br/>
          • "Show me CPR" - CPR instructions
        </div>
      </Card>

      {/* Quick Voice Actions */}
      <Card className="p-4 bg-[var(--gradient-card)] border-cyber-green/30">
        <h3 className="font-medium text-cyber-green mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => processVoiceCommand("lifeline im hurt")}
            className="bg-cyber-red text-white text-xs p-2 h-auto"
          >
            <Heart className="h-3 w-3 mr-1" />
            Emergency Help
          </Button>
          <Button
            onClick={() => processVoiceCommand("send my location")}
            className="bg-cyber-blue text-white text-xs p-2 h-auto"
          >
            <MapPin className="h-3 w-3 mr-1" />
            Share Location
          </Button>
          <Button
            onClick={startCPRGuide}
            className="bg-cyber-orange text-white text-xs p-2 h-auto"
          >
            <Heart className="h-3 w-3 mr-1" />
            CPR Guide
          </Button>
          <Button
            onClick={() => speak(`Hello ${userProfile?.name || 'user'}, LifeLine Guardian is ready to assist you.`)}
            className="bg-cyber-purple text-white text-xs p-2 h-auto"
          >
            <Volume2 className="h-3 w-3 mr-1" />
            Voice Test
          </Button>
        </div>
      </Card>

      {/* CPR Guide Modal */}
      {showCPRGuide && (
        <Card className="p-6 bg-[var(--gradient-card)] border-cyber-red/50 shadow-[var(--glow-danger)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-cyber-red flex items-center gap-2">
              <Heart className="h-5 w-5" />
              CPR Instructions
            </h3>
            <Button onClick={stopCPRGuide} size="sm" variant="outline">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-4">
            {/* Current Step */}
            <div className="p-4 bg-cyber-red/10 border border-cyber-red/30 rounded">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-cyber-red text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {cprSteps[currentCPRStep].step}
                </div>
                <span className="font-medium text-cyber-red">
                  Step {cprSteps[currentCPRStep].step} of {cprSteps.length}
                </span>
              </div>
              <p className="text-sm">{cprSteps[currentCPRStep].instruction}</p>
            </div>

            {/* Timer for timed steps */}
            {cprSteps[currentCPRStep].duration > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Step Timer:</span>
                  <span className="font-mono">{cprTimer}s / {cprSteps[currentCPRStep].duration}s</span>
                </div>
                <Progress 
                  value={(cprTimer / cprSteps[currentCPRStep].duration) * 100} 
                  className="h-2"
                />
              </div>
            )}

            {/* Metronome for compressions */}
            {cprSteps[currentCPRStep].compressionRate && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Compression Rate:</span>
                  <Button
                    onClick={() => {
                      if (isMetronomeActive) {
                        setIsMetronomeActive(false);
                        if (metronomeRef.current) clearInterval(metronomeRef.current);
                      } else {
                        startMetronome(cprSteps[currentCPRStep].compressionRate!);
                      }
                    }}
                    size="sm"
                    className={isMetronomeActive ? "bg-cyber-red" : "bg-cyber-green"}
                  >
                    {isMetronomeActive ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="text-center p-3 bg-background/30 rounded">
                  <div className="text-lg font-bold text-cyber-blue">
                    {cprSteps[currentCPRStep].compressionRate} BPM
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Compressions: {compressionCount}
                  </div>
                  {isMetronomeActive && (
                    <div className="mt-2">
                      <div className="w-4 h-4 bg-cyber-blue rounded-full mx-auto animate-pulse"></div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Manual navigation */}
            <div className="flex gap-2">
              <Button
                onClick={() => currentCPRStep > 0 && setCurrentCPRStep(prev => prev - 1)}
                disabled={currentCPRStep === 0}
                size="sm"
                variant="outline"
                className="flex-1"
              >
                Previous
              </Button>
              <Button
                onClick={nextCPRStep}
                disabled={currentCPRStep === cprSteps.length - 1}
                size="sm"
                className="flex-1 bg-cyber-blue"
              >
                Next Step
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};