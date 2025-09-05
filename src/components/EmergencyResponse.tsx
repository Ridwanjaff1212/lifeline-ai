import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  Phone, 
  MessageSquare, 
  MapPin, 
  Clock,
  CheckCircle,
  XCircle,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  role: "primary" | "backup" | "medical";
  channel: "sms" | "call" | "whatsapp";
  priority: number;
}

interface EmergencyEvent {
  id: string;
  type: "heart_rate" | "oxygen_saturation" | "fall" | "manual" | "gas_leak";
  severity: "low" | "medium" | "high" | "critical";
  value?: number;
  timestamp: Date;
  location?: { lat: number; lng: number };
  resolved: boolean;
}

interface ContactAttempt {
  contactId: string;
  method: "sms" | "call" | "whatsapp";
  status: "pending" | "delivered" | "failed" | "acknowledged";
  timestamp: Date;
  retryCount: number;
}

interface EmergencyResponseProps {
  riskScore: number;
  emergencyEvents: EmergencyEvent[];
  onSOSTriggered: (event: EmergencyEvent) => void;
}

const defaultContacts: EmergencyContact[] = [
  {
    id: "1",
    name: "Emergency Services",
    phone: "112",
    role: "medical",
    channel: "call",
    priority: 1
  },
  {
    id: "2", 
    name: "Primary Contact",
    phone: "+1234567890",
    role: "primary",
    channel: "call",
    priority: 2
  },
  {
    id: "3",
    name: "Backup Contact",
    phone: "+1234567891", 
    role: "backup",
    channel: "sms",
    priority: 3
  }
];

export const EmergencyResponse = ({ riskScore, emergencyEvents, onSOSTriggered }: EmergencyResponseProps) => {
  const { toast } = useToast();
  
  const [contacts] = useState<EmergencyContact[]>(defaultContacts);
  const [contactAttempts, setContactAttempts] = useState<ContactAttempt[]>([]);
  const [isResponseActive, setIsResponseActive] = useState(false);
  const [escalationLevel, setEscalationLevel] = useState(0);
  const [responseTimeline, setResponseTimeline] = useState<string[]>([]);

  // Automatic escalation based on risk score
  useEffect(() => {
    if (riskScore >= 80 && !isResponseActive) {
      // Critical - immediate emergency services
      triggerEmergencyResponse("critical");
    } else if (riskScore >= 60 && !isResponseActive) {
      // High - notify all contacts
      triggerEmergencyResponse("high");
    } else if (riskScore >= 40 && !isResponseActive) {
      // Medium - notify primary contacts
      triggerEmergencyResponse("medium");
    }
  }, [riskScore, isResponseActive]);

  // Handle new emergency events
  useEffect(() => {
    const unresolved = emergencyEvents.filter(event => !event.resolved);
    if (unresolved.length > 0 && !isResponseActive) {
      const highestSeverity = unresolved.reduce((max, event) => {
        const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
        return severityLevels[event.severity] > severityLevels[max.severity] ? event : max;
      });
      
      triggerEmergencyResponse(highestSeverity.severity);
    }
  }, [emergencyEvents, isResponseActive]);

  const triggerEmergencyResponse = (severity: "low" | "medium" | "high" | "critical") => {
    setIsResponseActive(true);
    setEscalationLevel(0);
    
    const timestamp = new Date().toLocaleTimeString();
    setResponseTimeline(prev => [...prev, `${timestamp}: Emergency response activated (${severity})`]);
    
    // Determine contact strategy based on severity
    let contactsToNotify: EmergencyContact[] = [];
    
    switch (severity) {
      case "critical":
        contactsToNotify = contacts.filter(c => c.role === "medical");
        setTimeout(() => {
          // Escalate to all contacts after 30 seconds if critical
          if (isResponseActive) {
            contactsToNotify = contacts;
            notifyContacts(contactsToNotify, "Emergency escalation - immediate assistance required");
          }
        }, 30000);
        break;
        
      case "high":
        contactsToNotify = contacts.filter(c => c.role !== "backup");
        setTimeout(() => {
          // Add backup contacts after 60 seconds
          if (isResponseActive) {
            const backupContacts = contacts.filter(c => c.role === "backup");
            notifyContacts(backupContacts, "Emergency backup notification");
          }
        }, 60000);
        break;
        
      case "medium":
        contactsToNotify = contacts.filter(c => c.role === "primary");
        break;
        
      default:
        contactsToNotify = [contacts.find(c => c.role === "primary")].filter(Boolean) as EmergencyContact[];
    }
    
    const message = generateEmergencyMessage(severity);
    notifyContacts(contactsToNotify, message);
    
    toast({
      title: "Emergency Response Activated",
      description: `${severity.charAt(0).toUpperCase() + severity.slice(1)} priority notification sent`,
      variant: severity === "critical" ? "destructive" : "default"
    });
  };

  const generateEmergencyMessage = (severity: string): string => {
    const location = "Current location"; // Would use actual GPS
    const timestamp = new Date().toLocaleString();
    
    const severityMessages = {
      critical: "🚨 CRITICAL EMERGENCY - Immediate medical assistance needed",
      high: "⚠️ HIGH PRIORITY ALERT - Emergency assistance required", 
      medium: "⚠️ ALERT - Medical attention may be needed",
      low: "ℹ️ Health monitoring alert"
    };
    
    return `${severityMessages[severity as keyof typeof severityMessages]}
    
Time: ${timestamp}
Location: ${location}
Risk Score: ${riskScore}%

LifeLine AI Guardian Alert`;
  };

  const notifyContacts = (contactList: EmergencyContact[], message: string) => {
    contactList.forEach((contact, index) => {
      setTimeout(() => {
        attemptContact(contact, message);
      }, index * 2000); // Stagger notifications by 2 seconds
    });
  };

  const attemptContact = (contact: EmergencyContact, message: string) => {
    const attempt: ContactAttempt = {
      contactId: contact.id,
      method: contact.channel,
      status: "pending",
      timestamp: new Date(),
      retryCount: 0
    };
    
    setContactAttempts(prev => [...prev, attempt]);
    
    const timestamp = new Date().toLocaleTimeString();
    setResponseTimeline(prev => [...prev, `${timestamp}: Contacting ${contact.name} via ${contact.channel}`]);
    
    // Simulate contact attempt
    setTimeout(() => {
      const success = Math.random() > 0.2; // 80% success rate
      
      setContactAttempts(prev => 
        prev.map(a => 
          a.contactId === contact.id && a.timestamp === attempt.timestamp
            ? { ...a, status: success ? "delivered" : "failed" }
            : a
        )
      );
      
      const resultTimestamp = new Date().toLocaleTimeString();
      setResponseTimeline(prev => [...prev, 
        `${resultTimestamp}: ${contact.name} ${success ? "notified successfully" : "contact failed"}`
      ]);
      
      if (!success && attempt.retryCount < 2) {
        // Retry failed contacts
        setTimeout(() => {
          attemptContact(contact, message);
        }, 30000);
      }
      
    }, 3000 + Math.random() * 2000); // 3-5 second delay
  };

  const manualSOS = () => {
    const manualEvent: EmergencyEvent = {
      id: `manual_${Date.now()}`,
      type: "manual",
      severity: "high",
      timestamp: new Date(),
      resolved: false
    };
    
    onSOSTriggered(manualEvent);
    triggerEmergencyResponse("high");
  };

  const resolveEmergency = () => {
    setIsResponseActive(false);
    setEscalationLevel(0);
    
    const timestamp = new Date().toLocaleTimeString();
    setResponseTimeline(prev => [...prev, `${timestamp}: Emergency resolved`]);
    
    toast({
      title: "Emergency Resolved",
      description: "All emergency protocols have been deactivated",
      variant: "default"
    });
  };

  const getLatestAttempts = () => {
    const latest = new Map<string, ContactAttempt>();
    
    contactAttempts.forEach(attempt => {
      const existing = latest.get(attempt.contactId);
      if (!existing || attempt.timestamp > existing.timestamp) {
        latest.set(attempt.contactId, attempt);
      }
    });
    
    return Array.from(latest.values());
  };

  return (
    <div className="space-y-4">
      {/* Emergency Status */}
      <Card className={cn(
        "p-4 border-2 transition-all duration-300",
        isResponseActive ? "border-cyber-red bg-destructive/10" : "border-cyber-blue/30 bg-[var(--gradient-card)]"
      )}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className={cn(
              "w-6 h-6",
              isResponseActive ? "text-cyber-red animate-pulse" : "text-cyber-blue"
            )} />
            <h3 className="text-xl font-bold">Emergency Response</h3>
          </div>
          
          <Badge variant={isResponseActive ? "destructive" : "outline"}>
            {isResponseActive ? "ACTIVE" : "STANDBY"}
          </Badge>
        </div>

        {/* Risk Level Indicator */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span>Current Risk Level</span>
            <span className="font-bold">{riskScore}%</span>
          </div>
          <div className="w-full bg-background/30 rounded-full h-3">
            <div 
              className={cn(
                "h-3 rounded-full transition-all duration-300",
                riskScore >= 80 ? "bg-cyber-red" :
                riskScore >= 60 ? "bg-cyber-orange" :
                riskScore >= 40 ? "bg-cyber-blue" : "bg-cyber-green"
              )}
              style={{ width: `${Math.min(riskScore, 100)}%` }}
            />
          </div>
        </div>

        {/* Manual SOS Button */}
        <Button 
          onClick={manualSOS}
          disabled={isResponseActive}
          className={cn(
            "w-full mb-4 h-12 text-lg font-bold",
            isResponseActive 
              ? "bg-muted text-muted-foreground" 
              : "bg-cyber-red hover:bg-cyber-red/80 text-white"
          )}
        >
          <Zap className="w-5 h-5 mr-2" />
          {isResponseActive ? "SOS ACTIVE" : "MANUAL SOS"}
        </Button>

        {/* Active Emergency Controls */}
        {isResponseActive && (
          <div className="space-y-3">
            <Alert className="border-cyber-red">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Emergency response is active. Contacts are being notified.
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={resolveEmergency}
              variant="outline"
              className="w-full"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark as Resolved
            </Button>
          </div>
        )}
      </Card>

      {/* Contact Status */}
      {isResponseActive && (
        <Card className="p-4 bg-[var(--gradient-card)] border border-border">
          <h4 className="font-bold mb-3 flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Contact Status
          </h4>
          
          <div className="space-y-3">
            {contacts.map(contact => {
              const latestAttempt = getLatestAttempts().find(a => a.contactId === contact.id);
              
              return (
                <div key={contact.id} className="flex items-center justify-between p-3 bg-background/30 rounded-lg">
                  <div>
                    <div className="font-medium">{contact.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {contact.role} • {contact.channel}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {latestAttempt ? (
                      <>
                        {latestAttempt.status === "pending" && (
                          <Badge variant="secondary">Contacting...</Badge>
                        )}
                        {latestAttempt.status === "delivered" && (
                          <Badge variant="default">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Notified
                          </Badge>
                        )}
                        {latestAttempt.status === "failed" && (
                          <Badge variant="destructive">
                            <XCircle className="w-3 h-3 mr-1" />
                            Failed
                          </Badge>
                        )}
                        {latestAttempt.status === "acknowledged" && (
                          <Badge variant="default">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Acknowledged
                          </Badge>
                        )}
                      </>
                    ) : (
                      <Badge variant="outline">Standby</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Response Timeline */}
      {responseTimeline.length > 0 && (
        <Card className="p-4 bg-[var(--gradient-card)] border border-border">
          <h4 className="font-bold mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Response Timeline
          </h4>
          
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {responseTimeline.slice(-10).reverse().map((entry, index) => (
              <div key={index} className="text-sm p-2 bg-background/30 rounded">
                {entry}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Emergency Events */}
      {emergencyEvents.length > 0 && (
        <Card className="p-4 bg-[var(--gradient-card)] border border-border">
          <h4 className="font-bold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Recent Events
          </h4>
          
          <div className="space-y-2">
            {emergencyEvents.slice(-5).reverse().map(event => (
              <div key={event.id} className="flex items-center justify-between p-2 bg-background/30 rounded">
                <div>
                  <div className="font-medium capitalize">
                    {event.type.replace('_', ' ')} {event.value && `(${event.value})`}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {event.timestamp.toLocaleString()}
                  </div>
                </div>
                
                <Badge 
                  variant={
                    event.severity === "critical" ? "destructive" :
                    event.severity === "high" ? "destructive" :
                    event.severity === "medium" ? "secondary" : "outline"
                  }
                >
                  {event.severity}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};