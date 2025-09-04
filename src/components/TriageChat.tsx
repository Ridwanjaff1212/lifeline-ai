import { useState, useRef, useEffect } from "react";
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
}

export const TriageChat = ({ onEmergencyTrigger }: TriageChatProps) => {
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

  const triageDatabase = {
    // Critical conditions - immediate emergency
    "chest pain": {
      response: "🚨 CRITICAL: Chest pain can indicate heart attack. Call emergency services immediately (112).\n\n1. Sit up, stay calm\n2. Loosen tight clothing\n3. Chew aspirin if not allergic\n4. Monitor breathing\n5. Do NOT wait - call 112 now",
      severity: "critical" as const,
      actions: ["Call 112", "Give Aspirin", "Monitor"]
    },
    "heart attack": {
      response: "🚨 CRITICAL: Heart attack in progress. Call 112 immediately.\n\n1. Call emergency services NOW\n2. Chew aspirin (if not allergic)\n3. Sit upright, stay calm\n4. Loosen clothing\n5. Prepare for CPR if unconscious",
      severity: "critical" as const,
      actions: ["Call 112", "CPR Ready", "Aspirin"]
    },
    "stroke": {
      response: "🚨 CRITICAL: Stroke emergency. Call 112 immediately.\n\nF.A.S.T. Check:\n- Face drooping\n- Arm weakness\n- Speech difficulty\n- Time to call 112\n\nDo NOT give food, water, or medication.",
      severity: "critical" as const,
      actions: ["Call 112", "FAST Check", "Position"]
    },
    "unconscious": {
      response: "🚨 CRITICAL: Unconscious person requires immediate help.\n\n1. Check responsiveness\n2. Call 112 immediately\n3. Check breathing and pulse\n4. Recovery position if breathing\n5. CPR if no pulse/breathing",
      severity: "critical" as const,
      actions: ["Call 112", "Check Pulse", "CPR"]
    },
    
    // High priority
    "choking": {
      response: "⚠️ HIGH PRIORITY: Choking emergency.\n\n1. Encourage coughing first\n2. Give 5 back blows between shoulder blades\n3. Give 5 abdominal thrusts (Heimlich)\n4. Repeat until object dislodged\n5. Call 112 if unsuccessful",
      severity: "high" as const,
      actions: ["Back Blows", "Abdominal Thrusts", "Call 112"]
    },
    "severe bleeding": {
      response: "⚠️ HIGH PRIORITY: Severe bleeding control.\n\n1. Apply direct pressure with clean cloth\n2. Elevate injured area above heart\n3. Do NOT remove embedded objects\n4. Apply pressure points if needed\n5. Call 112 for severe blood loss",
      severity: "high" as const,
      actions: ["Direct Pressure", "Elevate", "Call 112"]
    },
    "allergic reaction": {
      response: "⚠️ HIGH PRIORITY: Allergic reaction protocol.\n\n1. Remove/avoid allergen immediately\n2. Use epinephrine auto-injector if available\n3. Call 112 if breathing difficulties\n4. Monitor airways closely\n5. Prepare for CPR if needed",
      severity: "high" as const,
      actions: ["EpiPen", "Call 112", "Monitor"]
    },
    
    // Medium priority
    "burn": {
      response: "🔥 BURN TREATMENT:\n\n1. Cool with water for 10-20 minutes\n2. Remove jewelry/tight items\n3. Do NOT use ice or butter\n4. Cover with sterile gauze\n5. Seek medical attention for large/deep burns",
      severity: "medium" as const,
      actions: ["Cool Water", "Remove Items", "Cover"]
    },
    "fracture": {
      response: "🦴 FRACTURE CARE:\n\n1. Do NOT move the injured area\n2. Support/immobilize with splint\n3. Apply ice wrapped in cloth\n4. Check circulation below injury\n5. Seek medical attention",
      severity: "medium" as const,
      actions: ["Immobilize", "Ice", "Medical Care"]
    },
    "sprain": {
      response: "🏃 SPRAIN TREATMENT (R.I.C.E.):\n\n1. Rest - avoid using injured area\n2. Ice - 15-20 minutes every 2-3 hours\n3. Compression - elastic bandage\n4. Elevation - raise above heart level\n5. Monitor for worsening",
      severity: "medium" as const,
      actions: ["Rest", "Ice", "Compress", "Elevate"]
    },

    // Low priority
    "headache": {
      response: "💊 HEADACHE RELIEF:\n\n1. Rest in quiet, dark room\n2. Apply cold compress to forehead\n3. Stay hydrated\n4. Consider over-the-counter pain relief\n5. Seek help if severe or sudden onset",
      severity: "low" as const,
      actions: ["Rest", "Hydrate", "Cold Compress"]
    },
    "nausea": {
      response: "🤢 NAUSEA MANAGEMENT:\n\n1. Sip clear fluids slowly\n2. Eat bland foods (crackers, toast)\n3. Rest in upright position\n4. Fresh air or ginger may help\n5. Monitor for dehydration",
      severity: "low" as const,
      actions: ["Clear Fluids", "Bland Food", "Rest"]
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

  const handleTriageInput = async (userInput: string) => {
    const userMessage: TriageMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: userInput,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    let response = "I understand you're experiencing symptoms. ";
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let actions: string[] = [];
    
    const lowerInput = userInput.toLowerCase();
    
    // Check for emergency keywords
    for (const [condition, data] of Object.entries(triageDatabase)) {
      if (lowerInput.includes(condition) || 
          (condition === "severe bleeding" && (lowerInput.includes("bleeding") && lowerInput.includes("severe"))) ||
          (condition === "allergic reaction" && (lowerInput.includes("allergic") || lowerInput.includes("allergy")))) {
        response = data.response;
        severity = data.severity;
        actions = data.actions;
        break;
      }
    }
    
    if (response === "I understand you're experiencing symptoms. ") {
      // Generic medical advice
      if (lowerInput.includes("pain")) {
        response = "For general pain management:\n\n1. Rest the affected area\n2. Apply ice for 15-20 minutes\n3. Consider over-the-counter pain relief\n4. Monitor symptoms\n5. Seek medical attention if severe or persistent";
        severity = 'medium';
        actions = ["Rest", "Ice", "Monitor"];
      } else if (lowerInput.includes("fever")) {
        response = "For fever management:\n\n1. Rest and stay hydrated\n2. Cool compress on forehead\n3. Light clothing\n4. Monitor temperature\n5. Seek help if >39°C or severe symptoms";
        severity = 'medium';
        actions = ["Rest", "Hydrate", "Monitor"];
      } else {
        response = "Please describe your symptoms more specifically. I can help with:\n\n• Chest pain or heart problems\n• Breathing difficulties\n• Severe bleeding or injuries\n• Burns, fractures, or sprains\n• Allergic reactions\n• Choking or unconsciousness\n\nFor immediate emergencies, call 112.";
        actions = ["Be Specific", "Call 112"];
      }
    }
    
    const aiMessage: TriageMessage = {
      id: (Date.now() + 1).toString(),
      type: 'ai',
      content: response,
      timestamp: new Date(),
      severity,
      actions
    };
    
    setMessages(prev => [...prev, aiMessage]);
    setIsTyping(false);
    
    // Trigger emergency for critical conditions
    if (severity === 'critical') {
      toast({
        title: "Critical Emergency Detected",
        description: "Triggering emergency protocols",
        variant: "destructive"
      });
      setTimeout(() => {
        onEmergencyTrigger();
      }, 2000);
    }
    
    // Text-to-speech for response
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(response.replace(/[🚨⚠️🔥💊🤢🦴🏃]/g, ''));
      utterance.rate = 0.9;
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