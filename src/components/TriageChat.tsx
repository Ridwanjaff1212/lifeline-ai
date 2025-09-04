import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  Mic, 
  MicOff, 
  Send, 
  Bot, 
  User, 
  Phone, 
  AlertTriangle,
  Clock,
  Heart,
  Thermometer,
  Activity
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TriageMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  actions?: string[];
}

interface TriageChatProps {
  onEmergencyTrigger: () => void;
  onEmergencyDetected?: (condition: string, urgency: string) => void;
}

export const TriageChat = ({ onEmergencyTrigger, onEmergencyDetected }: TriageChatProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<TriageMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: "Hello! I'm your AI medical triage assistant. Describe your symptoms or emergency situation, and I'll provide immediate guidance.",
      timestamp: new Date(),
      severity: 'low'
    }
  ]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const medicalDatabase = {
    "chest pain": {
      urgency: "critical",
      accuracy: 0.94,
      steps: [
        "Call emergency services immediately (112 in Kuwait)",
        "Sit down and stay calm - avoid physical exertion",
        "Take 300mg aspirin if available and not allergic (chew slowly)",
        "Loosen tight clothing around chest and neck",
        "Monitor breathing and consciousness continuously",
        "Prepare for CPR if person becomes unresponsive"
      ],
      warning: "CRITICAL: Possible heart attack - immediate medical intervention required",
      vitals: { hr: ">100 or <60", spO2: "may drop", bp: "elevated or dropping" }
    },
    "difficulty breathing": {
      urgency: "high",
      accuracy: 0.91,
      steps: [
        "Assess airway - check for obstruction",
        "Position upright or in tripod position",
        "Administer rescue inhaler if asthma history",
        "Encourage slow, deep breathing techniques",
        "Monitor oxygen saturation if available",
        "Call emergency services if severe or worsening"
      ],
      warning: "HIGH PRIORITY: Respiratory distress can escalate rapidly",
      vitals: { hr: "elevated", spO2: "<95%", rr: ">20" }
    },
    "bleeding": {
      urgency: "medium-high",
      accuracy: 0.89,
      steps: [
        "Apply direct pressure with sterile gauze or clean cloth",
        "Elevate injured area above heart level if possible",
        "Do NOT remove embedded objects",
        "Apply pressure bandage over initial dressing",
        "Monitor for signs of shock (pale, rapid pulse)",
        "Seek immediate care for arterial bleeding"
      ],
      warning: "CAUTION: Monitor for hemorrhagic shock symptoms",
      vitals: { hr: "increasing", bp: "may drop", cap_refill: ">2 seconds" }
    },
    "burn": {
      urgency: "medium",
      accuracy: 0.87,
      steps: [
        "Remove from heat source immediately",
        "Cool with running water for 20+ minutes",
        "Remove jewelry before swelling occurs",
        "Cover with sterile, non-adherent dressing",
        "Do NOT use ice, butter, or home remedies",
        "Assess percentage of body surface area affected"
      ],
      warning: "CRITICAL for >10% body surface or airway burns",
      vitals: { temp: "may elevate", hr: "elevated from pain", bp: "monitor" }
    },
    "unconscious": {
      urgency: "critical",
      accuracy: 0.96,
      steps: [
        "Check responsiveness: 'Are you okay?' + shoulder tap",
        "Assess breathing: look, listen, feel for 10 seconds",
        "Call 112 immediately - request ambulance",
        "Open airway: head tilt, chin lift",
        "Recovery position if breathing, CPR if not",
        "Check pulse every 2 minutes until help arrives"
      ],
      warning: "CRITICAL EMERGENCY: Begin life support measures",
      vitals: { hr: "check pulse", breathing: "assess", response: "none" }
    },
    "seizure": {
      urgency: "high",
      accuracy: 0.92,
      steps: [
        "Ensure scene safety - move dangerous objects away",
        "Do NOT restrain or put anything in mouth",
        "Time the seizure duration",
        "Place in recovery position after seizure ends",
        "Monitor breathing and consciousness",
        "Call emergency services if >5 minutes or first seizure"
      ],
      warning: "EMERGENCY if seizure >5 minutes or multiple seizures",
      vitals: { hr: "elevated during", breathing: "may be impaired", recovery: "gradual" }
    },
    "stroke": {
      urgency: "critical",
      accuracy: 0.93,
      steps: [
        "FAST assessment: Face droop, Arm weakness, Speech difficulty, Time",
        "Call emergency services immediately",
        "Do NOT give food, water, or medications",
        "Position with head elevated 30 degrees",
        "Monitor vital signs and consciousness",
        "Note exact time of symptom onset"
      ],
      warning: "TIME-CRITICAL: Every minute matters for brain tissue",
      vitals: { bp: "often elevated", hr: "variable", neuro: "assess FAST" }
    },
    "allergic reaction": {
      urgency: "high",
      accuracy: 0.88,
      steps: [
        "Remove or avoid allergen source",
        "Administer epinephrine auto-injector if available",
        "Call emergency services for severe reactions",
        "Position for comfort - sitting if breathing difficulty",
        "Monitor airway, breathing, circulation",
        "Prepare for second epinephrine dose if needed"
      ],
      warning: "CRITICAL: Anaphylaxis can be fatal within minutes",
      vitals: { hr: "rapid", bp: "may drop", spO2: "may decrease", skin: "hives/swelling" }
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'bg-cyber-red text-white';
      case 'high': return 'bg-cyber-orange text-white';
      case 'medium': return 'bg-cyber-blue text-white';
      case 'low': return 'bg-cyber-green text-black';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const analyzeSymptoms = useCallback((input: string) => {
    const lowerInput = input.toLowerCase();
    let bestMatch = null;
    let highestScore = 0;
    
    // Advanced symptom matching with weighted scoring
    for (const [condition, data] of Object.entries(medicalDatabase)) {
      let score = 0;
      
      // Direct condition matches
      if (lowerInput.includes(condition.replace("_", " "))) score += 10;
      
      // Symptom keyword analysis
      const keywords = {
        "chest pain": ["chest", "heart", "cardiac", "crushing", "pressure", "angina"],
        "difficulty breathing": ["breath", "air", "wheeze", "asthma", "dyspnea", "shortness"],
        "bleeding": ["cut", "blood", "hemorrhage", "wound", "laceration", "gash"],
        "burn": ["burn", "fire", "heat", "scald", "chemical", "electrical"],
        "unconscious": ["passed out", "faint", "collapse", "unresponsive", "coma"],
        "seizure": ["seizure", "convulsion", "fit", "epilepsy", "spasm", "jerking"],
        "stroke": ["stroke", "paralysis", "slurred", "droop", "weakness", "confusion"],
        "allergic reaction": ["allergy", "hives", "swelling", "itching", "anaphylaxis", "rash"]
      };
      
      if (keywords[condition]) {
        keywords[condition].forEach(keyword => {
          if (lowerInput.includes(keyword)) score += 3;
        });
      }
      
      // Context analysis
      const urgencyWords = ["severe", "bad", "terrible", "emergency", "help", "critical"];
      const mildWords = ["mild", "slight", "little", "minor"];
      
      urgencyWords.forEach(word => {
        if (lowerInput.includes(word)) score += 2;
      });
      
      mildWords.forEach(word => {
        if (lowerInput.includes(word)) score -= 1;
      });
      
      if (score > highestScore) {
        highestScore = score;
        bestMatch = { condition, data, score };
      }
    }
    
    if (bestMatch && bestMatch.score >= 3) {
      const confidence = Math.min(0.95, bestMatch.data.accuracy + (bestMatch.score * 0.01));
      
      const response = {
        condition: bestMatch.condition.charAt(0).toUpperCase() + bestMatch.condition.slice(1).replace("_", " "),
        urgency: bestMatch.data.urgency,
        steps: bestMatch.data.steps,
        warning: bestMatch.data.warning,
        vitals: bestMatch.data.vitals,
        confidence: confidence,
        accuracy: bestMatch.data.accuracy
      };
      
      onEmergencyDetected?.(bestMatch.condition, response.urgency);
      return response;
    }
    
    // Enhanced default response with triage questions
    const defaultResponse = {
      condition: "Initial Assessment",
      urgency: "medium",
      steps: [
        "Describe your primary concern or pain location",
        "Rate pain/discomfort on scale 1-10",
        "Note any recent changes in symptoms", 
        "Check if person is alert and responsive",
        "Monitor breathing rate and quality",
        "Call emergency services if symptoms worsen"
      ],
      warning: "For severe symptoms, call 112 (Kuwait Emergency) immediately",
      vitals: { hr: "monitor", breathing: "assess", consciousness: "check" },
      confidence: 0.75,
      accuracy: 0.80
    };
    
    return defaultResponse;
  }, [onEmergencyDetected]);

  const handleTriageInput = async (userInput: string) => {
    const userMessage: TriageMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: userInput,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    
    // Simulate advanced AI processing
    await new Promise(resolve => setTimeout(resolve, 1800));
    
    const analysis = analyzeSymptoms(userInput);
    
    const aiMessage: TriageMessage = {
      id: (Date.now() + 1).toString(),
      type: 'ai',
      content: `**${analysis.condition}** (${(analysis.confidence * 100).toFixed(0)}% confidence)\n\n${analysis.warning}\n\n**IMMEDIATE STEPS:**\n${analysis.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n**VITAL SIGNS TO MONITOR:**\n${Object.entries(analysis.vitals || {}).map(([key, value]) => `• ${key.toUpperCase()}: ${value}`).join('\n')}`,
      timestamp: new Date(),
      severity: analysis.urgency as any,
      actions: ["Call 112", "Monitor Vitals", "Follow Steps"]
    };
    
    setMessages(prev => [...prev, aiMessage]);
    setIsTyping(false);
    
    // Trigger emergency for critical conditions
    if (analysis.urgency === 'critical') {
      toast({
        title: "Critical Emergency Detected",
        description: `${analysis.condition} - Triggering emergency protocols`,
        variant: "destructive"
      });
      setTimeout(() => {
        onEmergencyTrigger();
      }, 3000);
    }
    
    // Enhanced text-to-speech
    if ('speechSynthesis' in window) {
      const cleanText = aiMessage.content.replace(/[🚨⚠️🔥💊🤢🦴🏃*]/g, '').replace(/\n/g, '. ');
      const utterance = new SpeechSynthesisUtterance(cleanText.substring(0, 200));
      utterance.rate = 0.8;
      utterance.volume = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  const startVoiceRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
      };

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast({
          title: "Voice Recognition Error",
          description: "Please try again or type your message",
          variant: "destructive"
        });
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.start();
    }
  };

  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      handleTriageInput(input.trim());
      setInput("");
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <Card className="h-[600px] flex flex-col bg-[var(--gradient-card)] border-cyber-blue/20">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-full bg-[var(--gradient-primary)]">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold font-poppins text-foreground">AI Medical Triage</h3>
              <p className="text-xs text-muted-foreground font-poppins">Real-time medical guidance</p>
            </div>
          </div>
          <Badge className="bg-cyber-green text-black font-poppins">
            Online
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.type === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-lg p-3",
                message.type === 'user' 
                  ? 'bg-cyber-blue text-white' 
                  : 'bg-card border border-border'
              )}
            >
              <div className="flex items-start space-x-2">
                {message.type === 'ai' && (
                  <Bot className="w-4 h-4 mt-1 text-cyber-blue" />
                )}
                {message.type === 'user' && (
                  <User className="w-4 h-4 mt-1" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-poppins whitespace-pre-line">
                    {message.content}
                  </p>
                  
                  {message.severity && message.type === 'ai' && (
                    <Badge 
                      className={cn("mt-2 text-xs", getSeverityColor(message.severity))}
                    >
                      {message.severity.toUpperCase()} PRIORITY
                    </Badge>
                  )}
                  
                  {message.actions && message.actions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {message.actions.map((action, idx) => (
                        <Badge 
                          key={idx}
                          variant="outline" 
                          className="text-xs font-poppins"
                        >
                          {action}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground mt-1 font-poppins">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <Bot className="w-4 h-4 text-cyber-blue" />
                <div className="flex space-x-1">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full bg-cyber-blue animate-pulse"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground font-poppins">
                  AI analyzing...
                </span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-border">
        <div className="flex space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your emergency or symptoms..."
            className="flex-1 font-poppins"
            disabled={isListening}
          />
          
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={isListening ? stopVoiceRecognition : startVoiceRecognition}
            className={cn(
              "transition-colors",
              isListening && "bg-cyber-red text-white animate-pulse"
            )}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          
          <Button type="submit" size="icon" disabled={!input.trim() || isListening}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex justify-center mt-2">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onEmergencyTrigger}
            className="font-poppins text-xs"
          >
            <Phone className="w-3 h-3 mr-1" />
            Emergency Call (112)
          </Button>
        </div>
      </form>
    </Card>
  );
};