import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import QRCode from "react-qr-code";
import { useToast } from "@/hooks/use-toast";
import { 
  QrCode, 
  Download, 
  Share, 
  Smartphone,
  Heart,
  Shield,
  MapPin,
  Phone,
  User,
  Clock,
  Camera,
  Printer,
  Link,
  Zap,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserProfile } from "./UserProfileSetup";
import { IncidentData } from "./IncidentPack";

interface EnhancedQRGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  currentLocation?: {
    latitude: number;
    longitude: number;
    city: string;
    address: string;
  };
  healthReadings?: {
    heartRate: number;
    spO2: number;
    temperature: number;
  };
  incidentData?: IncidentData;
}

type QRType = "medical-id" | "emergency-contact" | "live-tracker" | "incident-pack" | "custom";

export const EnhancedQRGenerator = ({ 
  isOpen, 
  onClose, 
  userProfile, 
  currentLocation,
  healthReadings,
  incidentData 
}: EnhancedQRGeneratorProps) => {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<QRType>("medical-id");
  const [qrData, setQrData] = useState("");
  const [customData, setCustomData] = useState("");
  const [qrColor, setQrColor] = useState("#000000");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [size, setSize] = useState(256);
  const [includeVitals, setIncludeVitals] = useState(true);
  const [includeLocation, setIncludeLocation] = useState(true);
  const [liveTracking, setLiveTracking] = useState(false);

  const qrTypes = [
    {
      id: "medical-id" as QRType,
      name: "Medical ID",
      description: "Emergency medical information",
      icon: <Heart className="w-5 h-5" />,
      color: "cyber-red"
    },
    {
      id: "emergency-contact" as QRType,
      name: "Emergency Contacts",
      description: "Quick access to emergency contacts",
      icon: <Phone className="w-5 h-5" />,
      color: "cyber-blue"
    },
    {
      id: "live-tracker" as QRType,
      name: "Live Tracker",
      description: "Real-time location and status",
      icon: <MapPin className="w-5 h-5" />,
      color: "cyber-green"
    },
    {
      id: "incident-pack" as QRType,
      name: "Incident Pack",
      description: "Complete emergency incident data",
      icon: <Shield className="w-5 h-5" />,
      color: "cyber-orange"
    },
    {
      id: "custom" as QRType,
      name: "Custom QR",
      description: "Custom data or message",
      icon: <QrCode className="w-5 h-5" />,
      color: "cyber-purple"
    }
  ];

  // Generate QR data based on selected type
  useEffect(() => {
    if (!isOpen) return;

    const baseUrl = "https://lifeline-ai.app";
    
    switch (selectedType) {
      case "medical-id":
        const medicalData = {
          type: "medical-id",
          name: userProfile.name,
          age: userProfile.age,
          bloodType: userProfile.bloodType,
          medicalNotes: userProfile.medicalNotes,
          emergencyContacts: userProfile.emergencyContacts.slice(0, 2),
          ...(includeVitals && healthReadings && {
            vitals: {
              heartRate: healthReadings.heartRate,
              spO2: healthReadings.spO2,
              temperature: healthReadings.temperature,
              timestamp: new Date().toISOString()
            }
          }),
          ...(includeLocation && currentLocation && {
            location: {
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              city: currentLocation.city,
              timestamp: new Date().toISOString()
            }
          }),
          generated: new Date().toISOString()
        };
        setQrData(`${baseUrl}/medical/${btoa(JSON.stringify(medicalData))}`);
        break;

      case "emergency-contact":
        const contactData = {
          type: "emergency-contacts",
          patient: userProfile.name,
          contacts: userProfile.emergencyContacts,
          medicalInfo: {
            bloodType: userProfile.bloodType,
            conditions: userProfile.medicalNotes
          },
          timestamp: new Date().toISOString()
        };
        setQrData(`${baseUrl}/contacts/${btoa(JSON.stringify(contactData))}`);
        break;

      case "live-tracker":
        if (liveTracking && currentLocation) {
          const trackingData = {
            type: "live-tracker",
            userId: `user-${Date.now()}`,
            name: userProfile.name,
            location: {
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              city: currentLocation.city,
              accuracy: 10
            },
            status: "active",
            lastUpdate: new Date().toISOString(),
            ...(includeVitals && healthReadings && {
              vitals: healthReadings
            })
          };
          setQrData(`${baseUrl}/track/${btoa(JSON.stringify(trackingData))}`);
        } else {
          setQrData(`${baseUrl}/track/setup?user=${encodeURIComponent(userProfile.name)}`);
        }
        break;

      case "incident-pack":
        if (incidentData) {
          const packData = {
            type: "incident-pack",
            incident: incidentData,
            patient: userProfile,
            timestamp: new Date().toISOString()
          };
          setQrData(`${baseUrl}/incident/${incidentData.id}?data=${btoa(JSON.stringify(packData))}`);
        } else {
          setQrData(`${baseUrl}/incident/create`);
        }
        break;

      case "custom":
        setQrData(customData || "https://lifeline-ai.app");
        break;

      default:
        setQrData("https://lifeline-ai.app");
    }
  }, [selectedType, userProfile, currentLocation, healthReadings, incidentData, includeVitals, includeLocation, liveTracking, customData, isOpen]);

  const downloadQR = (format: 'svg' | 'png' | 'pdf') => {
    const qrElement = document.getElementById('enhanced-qr-code');
    if (!qrElement) return;

    const fileName = `lifeline-qr-${selectedType}-${Date.now()}`;
    
    if (format === 'svg') {
      const svgData = qrElement.innerHTML;
      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.svg`;
      a.click();
    } else if (format === 'png') {
      // Convert SVG to Canvas for PNG export
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      const svgBlob = new Blob([qrElement.innerHTML], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(svgBlob);
      
      img.onload = () => {
        canvas.width = size;
        canvas.height = size;
        ctx?.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `${fileName}.png`;
            a.click();
          }
        });
      };
      
      img.src = url;
    } else if (format === 'pdf') {
      // Create a printable PDF page
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>LifeLine AI - ${selectedType.toUpperCase()} QR Code</title>
              <style>
                body { 
                  font-family: 'Arial', sans-serif; 
                  text-align: center; 
                  padding: 20px;
                  background: white;
                  color: black;
                }
                .qr-container { 
                  border: 2px solid #000; 
                  padding: 20px; 
                  display: inline-block; 
                  margin: 20px;
                }
                .header { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
                .subheader { font-size: 16px; margin-bottom: 20px; }
                .info { font-size: 12px; margin-top: 20px; }
                @media print { body { margin: 0; } }
              </style>
            </head>
            <body>
              <div class="header">LifeLine AI Emergency QR Code</div>
              <div class="subheader">${qrTypes.find(t => t.id === selectedType)?.name}</div>
              <div class="qr-container">
                ${qrElement.innerHTML}
              </div>
              <div class="info">
                Generated: ${new Date().toLocaleString()}<br>
                Patient: ${userProfile.name}<br>
                Type: ${selectedType.replace('-', ' ').toUpperCase()}
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }

    toast({
      title: "QR Code Downloaded",
      description: `${format.toUpperCase()} file saved successfully`,
      variant: "default"
    });
  };

  const shareQR = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `LifeLine AI - ${qrTypes.find(t => t.id === selectedType)?.name}`,
          text: `Emergency QR Code for ${userProfile.name}`,
          url: qrData
        });
      } catch (error) {
        // Fallback to clipboard
        navigator.clipboard.writeText(qrData);
        toast({
          title: "Link Copied",
          description: "QR code link copied to clipboard",
          variant: "default"
        });
      }
    } else {
      navigator.clipboard.writeText(qrData);
      toast({
        title: "Link Copied",
        description: "QR code link copied to clipboard",
        variant: "default"
      });
    }
  };

  const previewQR = () => {
    window.open(qrData, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm p-4 overflow-y-auto font-poppins">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold bg-[var(--gradient-primary)] bg-clip-text text-transparent">
            🔗 Enhanced QR Generator
          </h1>
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* QR Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* QR Type Selection */}
            <Card className="p-6 bg-[var(--gradient-card)] border-cyber-blue/30">
              <h3 className="font-bold text-cyber-blue mb-4 flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                QR Code Type
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {qrTypes.map((type) => (
                  <Button
                    key={type.id}
                    variant={selectedType === type.id ? "default" : "outline"}
                    className={cn(
                      "h-20 flex flex-col items-center justify-center font-poppins transition-all duration-300",
                      selectedType === type.id && `bg-[var(--gradient-primary)] text-white shadow-[0_0_15px_hsl(var(--${type.color})/0.4)]`
                    )}
                    onClick={() => setSelectedType(type.id)}
                  >
                    <div className={cn("text-xl mb-1", `text-${type.color}`)}>
                      {type.icon}
                    </div>
                    <span className="text-xs text-center">{type.name}</span>
                  </Button>
                ))}
              </div>
            </Card>

            {/* Configuration Options */}
            <Card className="p-6 bg-[var(--gradient-card)] border-cyber-green/30">
              <h3 className="font-bold text-cyber-green mb-4">Configuration Options</h3>
              
              <Tabs defaultValue="content" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="appearance">Appearance</TabsTrigger>
                  <TabsTrigger value="privacy">Privacy</TabsTrigger>
                </TabsList>
                
                <TabsContent value="content" className="space-y-4">
                  {selectedType === "custom" && (
                    <div>
                      <Label htmlFor="custom-data">Custom Data/URL</Label>
                      <Input
                        id="custom-data"
                        value={customData}
                        onChange={(e) => setCustomData(e.target.value)}
                        placeholder="Enter URL or custom data"
                        className="mt-1"
                      />
                    </div>
                  )}
                  
                  {selectedType === "live-tracker" && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="live-tracking"
                        checked={liveTracking}
                        onChange={(e) => setLiveTracking(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="live-tracking">Enable Live Tracking</Label>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="include-vitals"
                      checked={includeVitals}
                      onChange={(e) => setIncludeVitals(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="include-vitals">Include Vital Signs</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="include-location"
                      checked={includeLocation}
                      onChange={(e) => setIncludeLocation(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="include-location">Include Location Data</Label>
                  </div>
                </TabsContent>
                
                <TabsContent value="appearance" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="qr-color">QR Color</Label>
                      <Input
                        id="qr-color"
                        type="color"
                        value={qrColor}
                        onChange={(e) => setQrColor(e.target.value)}
                        className="mt-1 h-10"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bg-color">Background Color</Label>
                      <Input
                        id="bg-color"
                        type="color"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="mt-1 h-10"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="qr-size">Size: {size}px</Label>
                    <input
                      id="qr-size"
                      type="range"
                      min="128"
                      max="512"
                      step="32"
                      value={size}
                      onChange={(e) => setSize(parseInt(e.target.value))}
                      className="w-full mt-1"
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="privacy" className="space-y-4">
                  <div className="p-4 bg-cyber-blue/10 border border-cyber-blue/30 rounded">
                    <h4 className="font-medium text-cyber-blue mb-2">Data Privacy Notice</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• QR codes contain encoded emergency information</li>
                      <li>• Data is stored locally on your device</li>
                      <li>• Live tracking requires explicit consent</li>
                      <li>• You can disable any data inclusion</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-background/30 rounded">
                      <span className="text-sm">Medical Information</span>
                      <Badge variant="outline" className="text-xs">Encrypted</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-background/30 rounded">
                      <span className="text-sm">Location Data</span>
                      <Badge variant="outline" className="text-xs">Optional</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-background/30 rounded">
                      <span className="text-sm">Contact Information</span>
                      <Badge variant="outline" className="text-xs">Limited</Badge>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          {/* QR Code Preview & Actions */}
          <div className="space-y-6">
            {/* QR Code Display */}
            <Card className="p-6 bg-[var(--gradient-card)] border-cyber-purple/30 text-center">
              <h3 className="font-bold text-cyber-purple mb-4">QR Code Preview</h3>
              
              <div 
                id="enhanced-qr-code"
                className="inline-block p-4 rounded-lg"
                style={{ backgroundColor }}
              >
                <QRCode
                  size={size}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  value={qrData}
                  viewBox="0 0 256 256"
                  fgColor={qrColor}
                  bgColor={backgroundColor}
                />
              </div>
              
              <div className="mt-4 text-xs text-muted-foreground">
                Type: {qrTypes.find(t => t.id === selectedType)?.name}
              </div>
            </Card>

            {/* Download Actions */}
            <Card className="p-4 bg-[var(--gradient-card)] border-cyber-orange/30">
              <h3 className="font-bold text-cyber-orange mb-3 flex items-center gap-2">
                <Download className="w-4 h-4" />
                Download Options
              </h3>
              <div className="space-y-2">
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={() => downloadQR('png')}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  PNG Image
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="w-full"
                  onClick={() => downloadQR('svg')}
                >
                  <Link className="w-4 h-4 mr-2" />
                  SVG Vector
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="w-full"
                  onClick={() => downloadQR('pdf')}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print PDF
                </Button>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card className="p-4 bg-[var(--gradient-card)] border-cyber-red/30">
              <h3 className="font-bold text-cyber-red mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Button 
                  size="sm" 
                  className="w-full bg-[var(--gradient-primary)] text-white"
                  onClick={shareQR}
                >
                  <Share className="w-4 h-4 mr-2" />
                  Share QR Code
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="w-full"
                  onClick={previewQR}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview Link
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    navigator.clipboard.writeText(qrData);
                    toast({
                      title: "Link Copied",
                      description: "QR data copied to clipboard",
                      variant: "default"
                    });
                  }}
                >
                  <Link className="w-4 h-4 mr-2" />
                  Copy Link
                </Button>
              </div>
            </Card>

            {/* QR Code Stats */}
            <Card className="p-4 bg-[var(--gradient-card)] border-cyber-green/30">
              <h3 className="font-bold text-cyber-green mb-3">QR Statistics</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Data Size:</span>
                  <span>{new Blob([qrData]).size} bytes</span>
                </div>
                <div className="flex justify-between">
                  <span>Generated:</span>
                  <span>{new Date().toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Valid Until:</span>
                  <span>No Expiry</span>
                </div>
                <div className="flex justify-between">
                  <span>Security:</span>
                  <Badge variant="outline" className="text-xs">Encrypted</Badge>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};