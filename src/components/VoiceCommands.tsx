import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Volume2, Brain, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceCommandsProps {
  onEmergencyTriggered: () => void;
  onVitalRequest: () => void;
  onLocationShare: () => void;
}

interface VoiceCommand {
  command: string;
  action: () => void;
  category: "emergency" | "health" | "info";
}

export const VoiceCommands = ({ onEmergencyTriggered, onVitalRequest, onLocationShare }: VoiceCommandsProps) => {
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>("");
  const [confidence, setConfidence] = useState(0);
  const [recognition, setRecognition] = useState<any>(null);
  const [voiceAnalysis, setVoiceAnalysis] = useState<{tone: string, stress: number, clarity: number} | null>(null);

  const commands: VoiceCommand[] = [
    {
      command: "lifeline emergency",
      action: () => {
        speak("Emergency protocol activated. Stay calm.");
        onEmergencyTriggered();
      },
      category: "emergency"
    },
    {
      command: "lifeline help",
      action: () => {
        speak("Initiating emergency response. Are you injured?");
        onEmergencyTriggered();
      },
      category: "emergency"
    },
    {
      command: "check vitals",
      action: () => {
        speak("Checking your vital signs now.");
        onVitalRequest();
      },
      category: "health"
    },
    {
      command: "send location",
      action: () => {
        speak("Sharing your location with emergency contacts.");
        onLocationShare();
      },
      category: "info"
    },
    {
      command: "i need help",
      action: () => {
        speak("Help is on the way. Activating emergency protocols.");
        onEmergencyTriggered();
      },
      category: "emergency"
    },
    {
      command: "i feel faint",
      action: () => {
        speak("Detecting possible syncope. Sit down immediately. Activating medical alert.");
        onEmergencyTriggered();
      },
      category: "emergency"
    },
    {
      command: "chest pain",
      action: () => {
        speak("Cardiac event detected. Calling emergency services. Do not move.");
        onEmergencyTriggered();
      },
      category: "emergency"
    },
    {
      command: "breathing problems",
      action: () => {
        speak("Respiratory distress detected. Try to stay calm. Help is coming.");
        onEmergencyTriggered();
      },
      category: "emergency"
    }
  ];

  const initializeSpeechRecognition = useCallback(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        const results = Array.from(event.results);
        const latestResult = results[results.length - 1];
        
        if ((latestResult as any).isFinal) {
          const transcript = latestResult[0].transcript.toLowerCase().trim();
          const confidence = latestResult[0].confidence;
          
          setLastCommand(transcript);
          setConfidence(confidence);
          
          // Analyze voice characteristics
          analyzeVoiceCharacteristics(transcript, confidence);
          
          // Process command
          processVoiceCommand(transcript, confidence);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        if (isListening) {
          // Restart recognition if it ends but we're still supposed to be listening
          setTimeout(() => {
            try {
              recognition.start();
            } catch (error) {
              console.error('Failed to restart recognition:', error);
              setIsListening(false);
            }
          }, 100);
        }
      };

      setRecognition(recognition);
    }
  }, [isListening]);

  const analyzeVoiceCharacteristics = (transcript: string, confidence: number) => {
    // Analyze speech patterns for stress/emergency detection
    const words = transcript.split(' ');
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    
    // Detect stress indicators in speech
    const stressWords = ['help', 'emergency', 'pain', 'hurt', 'dizzy', 'faint', 'sick', 'emergency'];
    const stressScore = words.filter(word => stressWords.includes(word)).length / words.length;
    
    // Determine tone based on content and confidence
    let tone = "normal";
    let stress = 0.2;
    let clarity = confidence;
    
    if (stressScore > 0.3) {
      tone = "distressed";
      stress = 0.8;
    } else if (confidence < 0.6) {
      tone = "unclear/slurred";
      stress = 0.6;
      clarity = 0.4;
    } else if (avgWordLength < 3) {
      tone = "rapid/panicked";
      stress = 0.7;
    }
    
    setVoiceAnalysis({ tone, stress, clarity });
    
    // Auto-trigger emergency if high stress detected
    if (stress > 0.7) {
      speak("High stress detected in voice. Activating emergency protocols.");
      onEmergencyTriggered();
    }
  };

  const processVoiceCommand = (transcript: string, confidence: number) => {
    // Find matching command
    for (const cmd of commands) {
      if (transcript.includes(cmd.command)) {
        if (confidence > 0.7) {
          cmd.action();
          return;
        } else {
          speak("Command unclear. Please repeat.");
          return;
        }
      }
    }
    
    // Fuzzy matching for emergency keywords
    const emergencyKeywords = ['help', 'emergency', 'pain', 'hurt', 'sick', 'faint', 'dizzy', 'bleeding'];
    const hasEmergencyKeyword = emergencyKeywords.some(keyword => transcript.includes(keyword));
    
    if (hasEmergencyKeyword && confidence > 0.5) {
      speak("Emergency detected. Activating response protocol.");
      onEmergencyTriggered();
    }
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      // Use more natural voice if available
      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Female') || voice.name.includes('Samantha') || voice.name.includes('Google')
      );
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      speechSynthesis.speak(utterance);
    }
  };

  const toggleListening = () => {
    if (!recognition) {
      initializeSpeechRecognition();
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      try {
        recognition.start();
        setIsListening(true);
        speak("Voice commands activated. Say Lifeline Emergency for help.");
      } catch (error) {
        console.error('Failed to start recognition:', error);
      }
    }
  };

  useEffect(() => {
    initializeSpeechRecognition();
    
    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, [initializeSpeechRecognition]);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "emergency": return "text-destructive";
      case "health": return "text-cyber-blue";
      case "info": return "text-cyber-green";
      default: return "text-muted-foreground";
    }
  };

  return (
    <Card className="p-6 bg-[var(--gradient-card)] border-2 border-cyber-purple/30">
      <div className="flex items-center gap-3 mb-4">
        <Brain className="h-6 w-6 text-cyber-purple animate-pulse" />
        <h3 className="text-xl font-bold text-foreground">Voice AI Assistant</h3>
        <Badge variant="outline" className="text-cyber-purple border-cyber-purple/50">
          Always Listening
        </Badge>
      </div>

      {/* Voice Control */}
      <div className="flex gap-3 mb-6">
        <Button
          onClick={toggleListening}
          variant={isListening ? "destructive" : "default"}
          className="flex-1"
        >
          {isListening ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
          {isListening ? "Stop Listening" : "Start Voice Commands"}
        </Button>
        
        <Button
          onClick={() => speak("LifeLine voice assistant ready. Say Lifeline Emergency if you need help.")}
          variant="outline"
          size="icon"
        >
          <Volume2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Voice Analysis */}
      {isListening && voiceAnalysis && (
        <Card className="p-4 bg-muted/20 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-cyber-blue" />
            <span className="text-sm font-medium">Voice Analysis</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <div className="text-muted-foreground">Tone</div>
              <div className={cn("font-medium", 
                voiceAnalysis.tone.includes('distressed') ? "text-destructive" :
                voiceAnalysis.tone.includes('unclear') ? "text-orange-400" :
                "text-cyber-green"
              )}>
                {voiceAnalysis.tone}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Stress Level</div>
              <div className={cn("font-medium",
                voiceAnalysis.stress > 0.7 ? "text-destructive" :
                voiceAnalysis.stress > 0.4 ? "text-orange-400" :
                "text-cyber-green"
              )}>
                {(voiceAnalysis.stress * 100).toFixed(0)}%
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Clarity</div>
              <div className={cn("font-medium",
                voiceAnalysis.clarity < 0.5 ? "text-destructive" :
                voiceAnalysis.clarity < 0.7 ? "text-orange-400" :
                "text-cyber-green"
              )}>
                {(voiceAnalysis.clarity * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Last Command */}
      {lastCommand && (
        <Card className="p-3 bg-cyber-blue/10 border-cyber-blue/30 mb-4">
          <div className="text-sm text-cyber-blue mb-1">Last Command:</div>
          <div className="text-foreground font-medium">"{lastCommand}"</div>
          <div className="text-xs text-muted-foreground mt-1">
            Confidence: {(confidence * 100).toFixed(0)}%
          </div>
        </Card>
      )}

      {/* Available Commands */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-foreground">Available Voice Commands:</h4>
        <div className="grid grid-cols-1 gap-2">
          {commands.slice(0, 6).map((cmd, i) => (
            <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-muted/10">
              <span className="text-sm text-foreground">"{cmd.command}"</span>
              <Badge variant="outline" className={cn("text-xs", getCategoryColor(cmd.category))}>
                {cmd.category}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Status Indicator */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", 
            isListening ? "bg-cyber-green animate-pulse" : "bg-muted"
          )} />
          <span className="text-xs text-muted-foreground">
            {isListening ? "Listening for voice commands..." : "Voice commands inactive"}
          </span>
        </div>
      </div>
    </Card>
  );
};