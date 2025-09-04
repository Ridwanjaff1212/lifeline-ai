import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import QRCode from "react-qr-code";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import { 
  MapPin, 
  Clock, 
  User, 
  Heart, 
  Thermometer, 
  Activity, 
  Phone,
  Download,
  Share,
  Camera,
  Mic
} from "lucide-react";
import { UserProfile } from "./UserProfileSetup";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export interface IncidentData {
  id: string;
  type: string;
  timestamp: Date;
  location: {
    coordinates: [number, number];
    address: string;
    city: string;
  };
  vitals: {
    heartRate: number[];
    spO2: number[];
    temperature: number[];
    timestamps: string[];
  };
  timeline: Array<{
    time: string;
    event: string;
    severity: "info" | "warning" | "critical";
  }>;
  mediaCapture: {
    hasAudio: boolean;
    hasVideo: boolean;
    duration: number;
  };
  riskScore: number;
  status: "active" | "resolved" | "escalated";
  notes?: string;
}

interface IncidentPackProps {
  isOpen: boolean;
  onClose: () => void;
  incidentData: IncidentData;
  userProfile: UserProfile;
}

export const IncidentPack = ({ isOpen, onClose, incidentData, userProfile }: IncidentPackProps) => {
  const [qrData, setQrData] = useState("");

  useEffect(() => {
    if (isOpen && incidentData) {
      // Generate QR code data with incident pack URL
      const packData = {
        incidentId: incidentData.id,
        type: incidentData.type,
        timestamp: incidentData.timestamp.toISOString(),
        location: incidentData.location,
        userProfile: {
          name: userProfile.name,
          age: userProfile.age,
          bloodType: userProfile.bloodType,
          medicalNotes: userProfile.medicalNotes
        },
        emergencyContacts: userProfile.emergencyContacts,
        vitals: incidentData.vitals,
        riskScore: incidentData.riskScore
      };
      
      // In production, this would be a URL to your web service
      const packUrl = `https://lifeline-guardian.app/incident/${incidentData.id}?data=${encodeURIComponent(JSON.stringify(packData))}`;
      setQrData(packUrl);
    }
  }, [isOpen, incidentData, userProfile]);

  const vitalsChartData = {
    labels: incidentData.vitals.timestamps,
    datasets: [
      {
        label: "Heart Rate",
        data: incidentData.vitals.heartRate,
        borderColor: "#00BFFF",
        backgroundColor: "rgba(0, 191, 255, 0.1)",
        tension: 0.4,
        yAxisID: "y"
      },
      {
        label: "SpO₂",
        data: incidentData.vitals.spO2,
        borderColor: "#00FF7F",
        backgroundColor: "rgba(0, 255, 127, 0.1)",
        tension: 0.4,
        yAxisID: "y1"
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    interaction: {
      mode: "index" as const,
      intersect: false
    },
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "#ffffff"
        }
      }
    },
    scales: {
      x: {
        ticks: { color: "#ffffff" },
        grid: { color: "rgba(255, 255, 255, 0.1)" }
      },
      y: {
        type: "linear" as const,
        display: true,
        position: "left" as const,
        ticks: { color: "#00BFFF" },
        grid: { color: "rgba(0, 191, 255, 0.1)" }
      },
      y1: {
        type: "linear" as const,
        display: true,
        position: "right" as const,
        ticks: { color: "#00FF7F" },
        grid: { drawOnChartArea: false }
      }
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "text-cyber-red";
      case "warning": return "text-cyber-orange";
      default: return "text-cyber-blue";
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 8) return "text-cyber-red";
    if (score >= 5) return "text-cyber-orange";
    return "text-cyber-green";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm p-4 overflow-y-auto font-poppins">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-cyber-blue">🚨 Emergency Incident Pack</h1>
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Incident Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <Card className="p-6 bg-[var(--gradient-card)] border-cyber-red/30 shadow-[var(--glow-danger)]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-cyber-red">{incidentData.type} Emergency</h2>
                  <p className="text-muted-foreground">Incident ID: {incidentData.id}</p>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getRiskScoreColor(incidentData.riskScore)}`}>
                    Risk: {incidentData.riskScore}/10
                  </div>
                  <Badge 
                    variant={incidentData.status === "active" ? "destructive" : "default"}
                    className="mt-1"
                  >
                    {incidentData.status.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-cyber-blue" />
                  <span className="text-sm">
                    {incidentData.timestamp.toLocaleString("en-US", {
                      timeZone: "Asia/Kuwait",
                      dateStyle: "short",
                      timeStyle: "medium"
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-cyber-green" />
                  <span className="text-sm">{incidentData.location.city}, Kuwait</span>
                </div>
              </div>
            </Card>

            {/* User Profile */}
            <Card className="p-4 bg-[var(--gradient-card)] border-cyber-blue/30">
              <h3 className="font-semibold text-cyber-blue mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Patient Information
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span>
                  <div className="font-medium">{userProfile.name}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Age:</span>
                  <div className="font-medium">{userProfile.age} years</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Blood Type:</span>
                  <div className="font-medium text-cyber-red">{userProfile.bloodType}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Emergency Contact:</span>
                  <div className="font-medium">
                    {userProfile.emergencyContacts[0]?.name} - {userProfile.emergencyContacts[0]?.phone}
                  </div>
                </div>
              </div>
              {userProfile.medicalNotes && (
                <div className="mt-3 p-2 bg-cyber-red/10 border border-cyber-red/30 rounded">
                  <span className="text-xs text-cyber-red font-medium">MEDICAL NOTES:</span>
                  <div className="text-sm mt-1">{userProfile.medicalNotes}</div>
                </div>
              )}
            </Card>

            {/* Vitals Trend */}
            <Card className="p-4 bg-[var(--gradient-card)] border-cyber-green/30">
              <h3 className="font-semibold text-cyber-green mb-3 flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Vitals Trend (Pre/Post Event)
              </h3>
              <div className="h-64">
                <Line data={vitalsChartData} options={chartOptions} />
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4 text-center">
                <div className="p-2 bg-background/30 rounded">
                  <div className="text-cyber-blue font-medium">Current HR</div>
                  <div className="text-lg">{incidentData.vitals.heartRate[incidentData.vitals.heartRate.length - 1]} BPM</div>
                </div>
                <div className="p-2 bg-background/30 rounded">
                  <div className="text-cyber-green font-medium">Current SpO₂</div>
                  <div className="text-lg">{incidentData.vitals.spO2[incidentData.vitals.spO2.length - 1]}%</div>
                </div>
                <div className="p-2 bg-background/30 rounded">
                  <div className="text-cyber-orange font-medium">Temperature</div>
                  <div className="text-lg">{incidentData.vitals.temperature[incidentData.vitals.temperature.length - 1]}°C</div>
                </div>
              </div>
            </Card>

            {/* Timeline */}
            <Card className="p-4 bg-[var(--gradient-card)] border-cyber-purple/30">
              <h3 className="font-semibold text-cyber-purple mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Event Timeline
              </h3>
              <div className="space-y-2">
                {incidentData.timeline.map((event, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 bg-background/30 rounded">
                    <div className="text-xs text-muted-foreground w-16">{event.time}</div>
                    <div className={`w-2 h-2 rounded-full ${
                      event.severity === "critical" ? "bg-cyber-red" :
                      event.severity === "warning" ? "bg-cyber-orange" : "bg-cyber-blue"
                    }`}></div>
                    <div className={`text-sm ${getSeverityColor(event.severity)}`}>
                      {event.event}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Media Capture */}
            <Card className="p-4 bg-[var(--gradient-card)] border-cyber-orange/30">
              <h3 className="font-semibold text-cyber-orange mb-3">Evidence Capture</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 p-3 bg-background/30 rounded">
                  <Camera className="h-5 w-5 text-cyber-blue" />
                  <div>
                    <div className="font-medium">Video Snapshot</div>
                    <div className="text-sm text-muted-foreground">
                      {incidentData.mediaCapture.hasVideo ? "Captured" : "Not available"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-background/30 rounded">
                  <Mic className="h-5 w-5 text-cyber-green" />
                  <div>
                    <div className="font-medium">Audio Recording</div>
                    <div className="text-sm text-muted-foreground">
                      {incidentData.mediaCapture.hasAudio ? `${incidentData.mediaCapture.duration}s` : "Not available"}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* QR Code & Actions */}
          <div className="space-y-6">
            {/* QR Code */}
            <Card className="p-6 bg-[var(--gradient-card)] border-cyber-blue/30 text-center">
              <h3 className="font-semibold text-cyber-blue mb-4">Emergency QR Code</h3>
              <div className="bg-white p-4 rounded-lg inline-block">
                <QRCode
                  size={180}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  value={qrData}
                  viewBox="0 0 256 256"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Scan to access full incident pack
              </p>
            </Card>

            {/* Location */}
            <Card className="p-4 bg-[var(--gradient-card)] border-cyber-green/30">
              <h3 className="font-semibold text-cyber-green mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Precise Location
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Address:</span>
                  <div className="font-medium">{incidentData.location.address}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Coordinates:</span>
                  <div className="font-mono text-xs">
                    {incidentData.location.coordinates[1].toFixed(6)}°N, {incidentData.location.coordinates[0].toFixed(6)}°E
                  </div>
                </div>
                <div className="mt-3">
                  <Button 
                    size="sm" 
                    className="w-full bg-cyber-green text-background"
                    onClick={() => {
                      const [lng, lat] = incidentData.location.coordinates;
                      window.open(`https://maps.google.com/?q=${lat},${lng}`, "_blank");
                    }}
                  >
                    Open in Maps
                  </Button>
                </div>
              </div>
            </Card>

            {/* Emergency Contacts */}
            <Card className="p-4 bg-[var(--gradient-card)] border-cyber-red/30">
              <h3 className="font-semibold text-cyber-red mb-3 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Emergency Contacts
              </h3>
              <div className="space-y-2">
                {userProfile.emergencyContacts.slice(0, 3).map((contact, index) => (
                  <div key={index} className="p-2 bg-background/30 rounded">
                    <div className="font-medium text-sm">{contact.name}</div>
                    <div className="text-xs text-muted-foreground">{contact.relationship}</div>
                    <Button 
                      size="sm" 
                      className="w-full mt-2 bg-cyber-red text-white"
                      onClick={() => window.open(`tel:${contact.phone}`, "_self")}
                    >
                      Call {contact.phone}
                    </Button>
                  </div>
                ))}
              </div>
            </Card>

            {/* Actions */}
            <Card className="p-4 bg-[var(--gradient-card)] border-cyber-purple/30">
              <h3 className="font-semibold text-cyber-purple mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Button 
                  size="sm" 
                  className="w-full bg-[var(--gradient-primary)] text-white"
                  onClick={() => {
                    // Share incident pack
                    if (navigator.share) {
                      navigator.share({
                        title: "Emergency Incident Pack",
                        text: `Emergency detected: ${incidentData.type}`,
                        url: qrData
                      });
                    }
                  }}
                >
                  <Share className="h-4 w-4 mr-2" />
                  Share Pack
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    // Download incident report
                    const reportData = {
                      incident: incidentData,
                      userProfile: userProfile,
                      generatedAt: new Date().toISOString()
                    };
                    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `incident-${incidentData.id}.json`;
                    a.click();
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};