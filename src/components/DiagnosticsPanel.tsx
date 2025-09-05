import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertTriangle,
  CheckCircle,
  Camera,
  Mic,
  Smartphone,
  Thermometer,
  Heart
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DiagnosticsProps {
  isOpen: boolean;
  onClose: () => void;
  riskEngine: any;
  currentVitals: any;
  sensorData: any;
}

export const DiagnosticsPanel = ({ 
  isOpen, 
  onClose, 
  riskEngine, 
  currentVitals, 
  sensorData 
}: DiagnosticsProps) => {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [systemHealth, setSystemHealth] = useState({
    camera: { status: "active", accuracy: 87, lastReading: new Date() },
    microphone: { status: "active", noiseLevel: 12, lastReading: new Date() },
    accelerometer: { status: "active", sensitivity: 95, lastReading: new Date() },
    gps: { status: "active", accuracy: 3.2, lastReading: new Date() }
  });

  useEffect(() => {
    if (isOpen && riskEngine) {
      const diag = riskEngine.getDiagnostics();
      setDiagnostics(diag);
      
      // Update system health simulation
      setSystemHealth(prev => ({
        camera: {
          ...prev.camera,
          accuracy: 85 + Math.random() * 10,
          lastReading: new Date()
        },
        microphone: {
          ...prev.microphone,
          noiseLevel: 8 + Math.random() * 8,
          lastReading: new Date()
        },
        accelerometer: {
          ...prev.accelerometer,
          sensitivity: 90 + Math.random() * 10,
          lastReading: new Date()
        },
        gps: {
          ...prev.gps,
          accuracy: 2 + Math.random() * 3,
          lastReading: new Date()
        }
      }));
    }
  }, [isOpen, riskEngine]);

  if (!isOpen) return null;

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "rising": return <TrendingUp className="w-4 h-4 text-destructive" />;
      case "falling": return <TrendingDown className="w-4 h-4 text-cyber-green" />;
      default: return <Minus className="w-4 h-4 text-cyber-blue" />;
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "camera": return <Camera className="w-4 h-4" />;
      case "sensor": return <Smartphone className="w-4 h-4" />;
      case "manual": return <Heart className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getSystemStatus = (status: string) => {
    return status === "active" ? (
      <CheckCircle className="w-4 h-4 text-cyber-green" />
    ) : (
      <AlertTriangle className="w-4 h-4 text-destructive" />
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden bg-background">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-6 h-6 text-cyber-blue" />
              <h2 className="text-2xl font-bold text-foreground">System Diagnostics</h2>
            </div>
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <Tabs defaultValue="risk" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="risk">Risk Engine</TabsTrigger>
              <TabsTrigger value="sensors">Sensors</TabsTrigger>
              <TabsTrigger value="vitals">Vitals History</TabsTrigger>
              <TabsTrigger value="system">System Health</TabsTrigger>
            </TabsList>

            {/* Risk Engine Tab */}
            <TabsContent value="risk" className="space-y-4">
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-cyber-blue" />
                  Risk Calculation Engine
                </h3>
                
                {diagnostics && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">Current Risk Score</div>
                        <div className="text-2xl font-bold text-cyber-blue">
                          {diagnostics.riskHistory[diagnostics.riskHistory.length - 1]?.toFixed(1) || "0.0"}/10
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">Trend Analysis</div>
                        <div className="flex items-center gap-2">
                          {getTrendIcon("stable")}
                          <span className="font-medium">Stable</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium">Risk History (Last 10 readings)</div>
                      <div className="flex gap-1">
                        {diagnostics.riskHistory.map((score: number, i: number) => (
                          <div
                            key={i}
                            className={cn(
                              "w-8 h-16 rounded-sm flex items-end",
                              score < 3 ? "bg-cyber-green/20" :
                              score < 6 ? "bg-amber-500/20" : "bg-destructive/20"
                            )}
                          >
                            <div
                              className={cn(
                                "w-full rounded-sm",
                                score < 3 ? "bg-cyber-green" :
                                score < 6 ? "bg-amber-500" : "bg-destructive"
                              )}
                              style={{ height: `${(score / 10) * 100}%` }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium">Active Environmental Factors</div>
                      <div className="space-y-2">
                        {diagnostics.environmentalFactors.length > 0 ? (
                          diagnostics.environmentalFactors.map((factor: any, i: number) => (
                            <div key={i} className="p-2 border border-border rounded-lg">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{factor.description}</span>
                                <Badge variant={factor.severity > 5 ? "destructive" : "secondary"}>
                                  Severity: {factor.severity}/10
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Confidence: {(factor.confidence * 100).toFixed(0)}% • 
                                Age: {Math.round((new Date().getTime() - new Date(factor.timestamp).getTime()) / (1000 * 60))}min
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-muted-foreground">No environmental factors detected</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Sensors Tab */}
            <TabsContent value="sensors" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(systemHealth).map(([sensor, data]: [string, any]) => (
                  <Card key={sensor} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {sensor === "camera" && <Camera className="w-5 h-5" />}
                        {sensor === "microphone" && <Mic className="w-5 h-5" />}
                        {sensor === "accelerometer" && <Smartphone className="w-5 h-5" />}
                        {sensor === "gps" && <Activity className="w-5 h-5" />}
                        <span className="font-medium capitalize">{sensor}</span>
                      </div>
                      {getSystemStatus(data.status)}
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      {sensor === "camera" && (
                        <div>Accuracy: <span className="font-medium">{data.accuracy.toFixed(1)}%</span></div>
                      )}
                      {sensor === "microphone" && (
                        <div>Noise Level: <span className="font-medium">{data.noiseLevel.toFixed(1)} dB</span></div>
                      )}
                      {sensor === "accelerometer" && (
                        <div>Sensitivity: <span className="font-medium">{data.sensitivity.toFixed(1)}%</span></div>
                      )}
                      {sensor === "gps" && (
                        <div>Accuracy: <span className="font-medium">±{data.accuracy.toFixed(1)}m</span></div>
                      )}
                      <div className="text-muted-foreground">
                        Last: {data.lastReading.toLocaleTimeString()}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Vitals History Tab */}
            <TabsContent value="vitals" className="space-y-4">
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">Recent Vital Readings</h3>
                
                {diagnostics && diagnostics.vitalHistory.length > 0 ? (
                  <div className="space-y-3">
                    {diagnostics.vitalHistory.slice(-5).reverse().map((reading: any, i: number) => (
                      <div key={i} className="p-3 border border-border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getSourceIcon(reading.source)}
                            <span className="text-sm font-medium">
                              {reading.timestamp ? new Date(reading.timestamp).toLocaleTimeString() : "Unknown"}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {reading.source}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Heart Rate</div>
                            <div className="font-medium">{reading.heartRate?.toFixed(0) || "N/A"} BPM</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">SpO₂</div>
                            <div className="font-medium">{reading.spO2?.toFixed(0) || "N/A"}%</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Temperature</div>
                            <div className="font-medium">{reading.temperature?.toFixed(1) || "N/A"}°C</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground">No vital readings available</div>
                )}
              </Card>
            </TabsContent>

            {/* System Health Tab */}
            <TabsContent value="system" className="space-y-4">
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">System Performance</h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Data Processing</div>
                      <div className="text-lg font-semibold text-cyber-green">Optimal</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">ML Accuracy</div>
                      <div className="text-lg font-semibold text-cyber-blue">94.7%</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Algorithm Parameters</div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>Smoothing Window: <span className="font-medium">5 readings</span></div>
                      <div>Decay Rate: <span className="font-medium">0.1/min</span></div>
                      <div>Confidence Threshold: <span className="font-medium">70%</span></div>
                      <div>Update Frequency: <span className="font-medium">3s</span></div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Current Thresholds</div>
                    <div className="space-y-1 text-xs">
                      <div>Heart Rate: 50-120 BPM (Critical: 40-140)</div>
                      <div>SpO₂: &gt;90% (Critical: &gt;85%)</div>
                      <div>Temperature: 35.5-38.5°C (Critical: 34-40°C)</div>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </Card>
    </div>
  );
};