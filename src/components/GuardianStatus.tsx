import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, CheckCircle, Activity } from "lucide-react";

interface GuardianStatusProps {
  status: "safe" | "elevated" | "emergency";
  riskScore: number;
  lastCheck: Date;
  activeAlerts: number;
}

export const GuardianStatus = ({ status, riskScore, lastCheck, activeAlerts }: GuardianStatusProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case "safe":
        return {
          icon: CheckCircle,
          label: "All Systems Normal",
          color: "cyber-green",
          gradient: "var(--gradient-success)",
          glow: "var(--glow-success)"
        };
      case "elevated":
        return {
          icon: AlertTriangle,
          label: "Elevated Risk Detected",
          color: "cyber-orange",
          gradient: "linear-gradient(135deg, hsl(var(--cyber-orange)) 0%, hsl(var(--cyber-red)) 100%)",
          glow: "0 0 20px hsl(var(--cyber-orange) / 0.4)"
        };
      case "emergency":
        return {
          icon: Shield,
          label: "Emergency Active",
          color: "cyber-red",
          gradient: "var(--gradient-danger)",
          glow: "var(--glow-danger)"
        };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  return (
    <Card className={cn(
      "p-6 border-2 transition-all duration-500",
      status === "safe" && "border-cyber-green/30 shadow-[var(--glow-success)]",
      status === "elevated" && "border-cyber-orange/30",
      status === "emergency" && "border-cyber-red/30 shadow-[var(--glow-danger)] animate-pulse"
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div 
            className="p-3 rounded-full"
            style={{ background: config.gradient, boxShadow: config.glow }}
          >
            <StatusIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold font-poppins text-foreground">
              Guardian Status
            </h3>
            <p className={cn("text-sm font-medium font-poppins", `text-${config.color}`)}>
              {config.label}
            </p>
          </div>
        </div>
        
        <Badge 
          variant={status === "safe" ? "default" : "destructive"}
          className="px-3 py-1 font-poppins"
        >
          Risk: {riskScore}/10
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className={cn("text-2xl font-bold font-poppins", `text-${config.color}`)}>
            {activeAlerts}
          </div>
          <div className="text-xs text-muted-foreground font-poppins">
            Active Alerts
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold font-poppins text-foreground">
            24/7
          </div>
          <div className="text-xs text-muted-foreground font-poppins">
            Monitoring
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground font-poppins">
        <span>Last Check: {lastCheck.toLocaleTimeString()}</span>
        <div className="flex items-center space-x-1">
          <Activity className="w-3 h-3" />
          <span>Live</span>
        </div>
      </div>

      {/* Guardian Pulse Indicator */}
      <div className="mt-4 relative">
        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all duration-1000 rounded-full",
              status === "safe" && "bg-cyber-green",
              status === "elevated" && "bg-cyber-orange",
              status === "emergency" && "bg-cyber-red animate-pulse"
            )}
            style={{ width: `${100 - (riskScore * 10)}%` }}
          />
        </div>
        <p className="text-xs text-center text-muted-foreground mt-1 font-poppins">
          Guardian Confidence Level
        </p>
      </div>
    </Card>
  );
};