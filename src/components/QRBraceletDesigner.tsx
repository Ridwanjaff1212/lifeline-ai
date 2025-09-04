import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import QRCode from "react-qr-code";
import { useToast } from "@/hooks/use-toast";
import { 
  Watch, 
  Download, 
  Share, 
  Heart,
  Shield,
  Phone,
  User,
  Palette,
  Ruler,
  Printer,
  Eye,
  Star,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserProfile } from "./UserProfileSetup";

interface QRBraceletDesignerProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
}

interface BraceletDesign {
  style: "sport" | "medical" | "elegant" | "tactical";
  color: string;
  size: "small" | "medium" | "large";
  material: "silicone" | "nylon" | "leather" | "metal";
  qrPosition: "center" | "side" | "back";
  emergencyText: string;
}

export const QRBraceletDesigner = ({ isOpen, onClose, userProfile }: QRBraceletDesignerProps) => {
  const { toast } = useToast();
  
  const [design, setDesign] = useState<BraceletDesign>({
    style: "medical",
    color: "#ff0000",
    size: "medium",
    material: "silicone",
    qrPosition: "center",
    emergencyText: "MEDICAL EMERGENCY - SCAN QR"
  });

  const braceletStyles = [
    {
      id: "sport" as const,
      name: "Sport Band",
      description: "Comfortable for active users",
      preview: "🏃‍♂️",
      colors: ["#00bfff", "#00ff7f", "#ff4500", "#9400d3"]
    },
    {
      id: "medical" as const,
      name: "Medical Alert",
      description: "Professional medical identification",
      preview: "🏥",
      colors: ["#dc143c", "#ffffff", "#000000", "#4169e1"]
    },
    {
      id: "elegant" as const,
      name: "Elegant",
      description: "Stylish everyday wear",
      preview: "✨",
      colors: ["#000000", "#c0c0c0", "#ffd700", "#800080"]
    },
    {
      id: "tactical" as const,
      name: "Tactical",
      description: "Rugged outdoor design",
      preview: "🪖",
      colors: ["#556b2f", "#2f4f4f", "#000000", "#cd853f"]
    }
  ];

  const materials = [
    { id: "silicone", name: "Silicone", price: "$15", durability: "High" },
    { id: "nylon", name: "Nylon", price: "$12", durability: "Medium" },
    { id: "leather", name: "Leather", price: "$25", durability: "Medium" },
    { id: "metal", name: "Metal", price: "$45", durability: "Very High" }
  ];

  // Generate medical QR data for bracelet
  const generateBraceletQR = () => {
    const braceletData = {
      type: "medical-bracelet",
      patient: {
        name: userProfile.name,
        age: userProfile.age,
        bloodType: userProfile.bloodType,
        medicalNotes: userProfile.medicalNotes,
        emergencyContacts: userProfile.emergencyContacts.slice(0, 2)
      },
      bracelet: {
        id: `BR-${Date.now()}`,
        activated: new Date().toISOString(),
        design: design
      },
      emergency: {
        instructions: design.emergencyText,
        priority: "CRITICAL",
        scan_action: "immediate_medical_attention"
      }
    };

    return `https://lifeline-ai.app/bracelet/${btoa(JSON.stringify(braceletData))}`;
  };

  const renderBraceletPreview = () => {
    const selectedStyle = braceletStyles.find(s => s.id === design.style);
    
    return (
      <div className="relative">
        {/* Bracelet Band */}
        <div 
          className={cn(
            "relative w-64 h-32 rounded-full border-8 mx-auto",
            design.size === "small" && "w-56 h-28",
            design.size === "large" && "w-72 h-36"
          )}
          style={{ 
            borderColor: design.color,
            background: `linear-gradient(135deg, ${design.color}22, ${design.color}44)`
          }}
        >
          {/* QR Code Position */}
          <div 
            className={cn(
              "absolute bg-white p-2 rounded shadow-lg",
              design.qrPosition === "center" && "top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
              design.qrPosition === "side" && "top-1/2 right-2 transform -translate-y-1/2",
              design.qrPosition === "back" && "top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-50"
            )}
          >
            <QRCode
              size={design.qrPosition === "center" ? 64 : 48}
              value={generateBraceletQR()}
              viewBox="0 0 256 256"
            />
          </div>

          {/* Emergency Text */}
          <div 
            className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs font-bold text-center px-2"
            style={{ color: design.color }}
          >
            {design.emergencyText.substring(0, 20)}
          </div>

          {/* Material Indicator */}
          <div className="absolute top-2 left-2">
            <Badge 
              variant="outline" 
              className="text-xs"
              style={{ borderColor: design.color, color: design.color }}
            >
              {design.material.toUpperCase()}
            </Badge>
          </div>

          {/* Style Preview */}
          <div className="absolute top-2 right-2 text-xl">
            {selectedStyle?.preview}
          </div>
        </div>

        {/* Bracelet Info */}
        <div className="mt-4 text-center">
          <h4 className="font-bold text-lg">{selectedStyle?.name} - {design.size}</h4>
          <p className="text-sm text-muted-foreground">{selectedStyle?.description}</p>
          <div className="flex justify-center gap-2 mt-2">
            <Badge variant="outline">{design.material}</Badge>
            <Badge variant="outline">{materials.find(m => m.id === design.material)?.price}</Badge>
          </div>
        </div>
      </div>
    );
  };

  const orderBracelet = () => {
    const orderData = {
      design: design,
      patient: userProfile,
      qrData: generateBraceletQR(),
      timestamp: new Date().toISOString()
    };

    // Simulate order process
    const blob = new Blob([JSON.stringify(orderData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lifeline-bracelet-order-${Date.now()}.json`;
    a.click();

    toast({
      title: "Bracelet Order Created",
      description: "Your custom medical bracelet design has been saved for ordering",
      variant: "default"
    });
  };

  const printDesign = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>LifeLine AI Medical Bracelet Design</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                text-align: center; 
                padding: 20px;
                background: white;
                color: black;
              }
              .header { font-size: 24px; font-weight: bold; margin-bottom: 20px; }
              .design-specs { 
                border: 2px solid #000; 
                padding: 20px; 
                margin: 20px auto;
                max-width: 500px;
                text-align: left;
              }
              .qr-section { text-align: center; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="header">LifeLine AI Medical Bracelet Design</div>
            <div class="design-specs">
              <h3>Design Specifications</h3>
              <p><strong>Patient:</strong> ${userProfile.name}</p>
              <p><strong>Style:</strong> ${design.style}</p>
              <p><strong>Size:</strong> ${design.size}</p>
              <p><strong>Material:</strong> ${design.material}</p>
              <p><strong>Color:</strong> ${design.color}</p>
              <p><strong>QR Position:</strong> ${design.qrPosition}</p>
              <p><strong>Emergency Text:</strong> ${design.emergencyText}</p>
              <h3>Medical Information</h3>
              <p><strong>Blood Type:</strong> ${userProfile.bloodType}</p>
              <p><strong>Medical Notes:</strong> ${userProfile.medicalNotes}</p>
              <p><strong>Emergency Contact:</strong> ${userProfile.emergencyContacts[0]?.name} - ${userProfile.emergencyContacts[0]?.phone}</p>
            </div>
            <div class="qr-section">
              <h3>QR Code Preview</h3>
              <p>Scan this code for emergency medical information</p>
            </div>
            <p><em>Generated: ${new Date().toLocaleString()}</em></p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm p-4 overflow-y-auto font-poppins">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold bg-[var(--gradient-primary)] bg-clip-text text-transparent">
            ⌚ QR Medical Bracelet Designer
          </h1>
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Design Controls */}
          <div className="space-y-6">
            {/* Style Selection */}
            <Card className="p-6 bg-[var(--gradient-card)] border-cyber-blue/30">
              <h3 className="font-bold text-cyber-blue mb-4 flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Bracelet Style
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {braceletStyles.map((style) => (
                  <Button
                    key={style.id}
                    variant={design.style === style.id ? "default" : "outline"}
                    className={cn(
                      "h-20 flex flex-col items-center justify-center font-poppins transition-all duration-300",
                      design.style === style.id && "bg-[var(--gradient-primary)] text-white"
                    )}
                    onClick={() => setDesign(prev => ({ ...prev, style: style.id }))}
                  >
                    <span className="text-xl mb-1">{style.preview}</span>
                    <span className="text-xs text-center">{style.name}</span>
                  </Button>
                ))}
              </div>
            </Card>

            {/* Color Selection */}
            <Card className="p-6 bg-[var(--gradient-card)] border-cyber-green/30">
              <h3 className="font-bold text-cyber-green mb-4">Color & Customization</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="color-picker">Bracelet Color</Label>
                  <div className="flex gap-2 mt-2">
                    {braceletStyles.find(s => s.id === design.style)?.colors.map((color) => (
                      <button
                        key={color}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 transition-all",
                          design.color === color ? "border-white scale-110" : "border-gray-600"
                        )}
                        style={{ backgroundColor: color }}
                        onClick={() => setDesign(prev => ({ ...prev, color }))}
                      />
                    ))}
                    <Input
                      type="color"
                      value={design.color}
                      onChange={(e) => setDesign(prev => ({ ...prev, color: e.target.value }))}
                      className="w-8 h-8 rounded-full border-0 p-0"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="emergency-text">Emergency Text</Label>
                  <Textarea
                    id="emergency-text"
                    value={design.emergencyText}
                    onChange={(e) => setDesign(prev => ({ ...prev, emergencyText: e.target.value }))}
                    placeholder="Text to display on bracelet"
                    className="mt-1"
                    rows={2}
                  />
                </div>
              </div>
            </Card>

            {/* Size & Material */}
            <Card className="p-6 bg-[var(--gradient-card)] border-cyber-purple/30">
              <h3 className="font-bold text-cyber-purple mb-4 flex items-center gap-2">
                <Ruler className="w-5 h-5" />
                Size & Material
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Size</Label>
                  <div className="grid grid-cols-3 gap-1 mt-2">
                    {["small", "medium", "large"].map((size) => (
                      <Button
                        key={size}
                        size="sm"
                        variant={design.size === size ? "default" : "outline"}
                        onClick={() => setDesign(prev => ({ ...prev, size: size as any }))}
                      >
                        {size.charAt(0).toUpperCase() + size.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>QR Position</Label>
                  <div className="grid grid-cols-3 gap-1 mt-2">
                    {["center", "side", "back"].map((position) => (
                      <Button
                        key={position}
                        size="sm"
                        variant={design.qrPosition === position ? "default" : "outline"}
                        onClick={() => setDesign(prev => ({ ...prev, qrPosition: position as any }))}
                      >
                        {position.charAt(0).toUpperCase() + position.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <Label>Material</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {materials.map((material) => (
                    <Button
                      key={material.id}
                      variant={design.material === material.id ? "default" : "outline"}
                      className="h-12 flex flex-col items-center justify-center"
                      onClick={() => setDesign(prev => ({ ...prev, material: material.id as any }))}
                    >
                      <span className="text-sm font-medium">{material.name}</span>
                      <span className="text-xs text-muted-foreground">{material.price}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Preview & Actions */}
          <div className="space-y-6">
            {/* Bracelet Preview */}
            <Card className="p-6 bg-[var(--gradient-card)] border-cyber-orange/30 text-center">
              <h3 className="font-bold text-cyber-orange mb-4 flex items-center justify-center gap-2">
                <Watch className="w-5 h-5" />
                Bracelet Preview
              </h3>
              {renderBraceletPreview()}
            </Card>

            {/* Medical Information */}
            <Card className="p-4 bg-[var(--gradient-card)] border-cyber-red/30">
              <h3 className="font-bold text-cyber-red mb-3 flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Medical Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Patient:</span>
                  <span className="font-medium">{userProfile.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Blood Type:</span>
                  <span className="font-medium text-cyber-red">{userProfile.bloodType}</span>
                </div>
                <div className="flex justify-between">
                  <span>Age:</span>
                  <span className="font-medium">{userProfile.age}</span>
                </div>
                {userProfile.medicalNotes && (
                  <div className="mt-2 p-2 bg-cyber-red/10 border border-cyber-red/30 rounded">
                    <span className="text-xs text-cyber-red font-medium">CONDITIONS:</span>
                    <div className="text-xs mt-1">{userProfile.medicalNotes}</div>
                  </div>
                )}
              </div>
            </Card>

            {/* Actions */}
            <Card className="p-4 bg-[var(--gradient-card)] border-cyber-blue/30">
              <h3 className="font-bold text-cyber-blue mb-3">Actions</h3>
              <div className="space-y-2">
                <Button 
                  className="w-full bg-[var(--gradient-primary)] text-white"
                  onClick={orderBracelet}
                >
                  <Star className="w-4 h-4 mr-2" />
                  Save Design for Order
                </Button>
                
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={printDesign}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Design Specs
                </Button>
                
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    navigator.clipboard.writeText(generateBraceletQR());
                    toast({
                      title: "QR Link Copied",
                      description: "Bracelet QR code link copied to clipboard",
                      variant: "default"
                    });
                  }}
                >
                  <Share className="w-4 h-4 mr-2" />
                  Share QR Code
                </Button>
              </div>
            </Card>

            {/* Ordering Info */}
            <Card className="p-4 bg-[var(--gradient-card)] border-cyber-green/30">
              <h3 className="font-bold text-cyber-green mb-3">Ordering Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Estimated Price:</span>
                  <span className="font-medium">{materials.find(m => m.id === design.material)?.price}</span>
                </div>
                <div className="flex justify-between">
                  <span>Production Time:</span>
                  <span>3-5 business days</span>
                </div>
                <div className="flex justify-between">
                  <span>Durability:</span>
                  <span>{materials.find(m => m.id === design.material)?.durability}</span>
                </div>
                <div className="flex justify-between">
                  <span>Waterproof:</span>
                  <Badge variant="outline" className="text-xs">Yes</Badge>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};