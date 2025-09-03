import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface VitalCardProps {
  title: string;
  value: string;
  unit: string;
  icon: React.ReactNode;
  status: "normal" | "warning" | "critical";
  className?: string;
}

export const VitalCard = ({ title, value, unit, icon, status, className }: VitalCardProps) => {
  const getStatusStyles = () => {
    switch (status) {
      case "normal":
        return "border-cyber-green/30 shadow-[var(--glow-success)]";
      case "warning":
        return "border-cyber-orange/30 shadow-[0_0_20px_hsl(var(--cyber-orange)/0.3)]";
      case "critical":
        return "border-cyber-red/30 shadow-[var(--glow-danger)]";
      default:
        return "border-border";
    }
  };

  return (
    <Card className={cn(
      "p-4 bg-[var(--gradient-card)] border-2 transition-all duration-300 hover:scale-105",
      getStatusStyles(),
      className
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-muted-foreground text-sm font-poppins">{title}</span>
        <div className="text-primary">{icon}</div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold font-poppins text-foreground">{value}</span>
        <span className="text-sm text-muted-foreground font-poppins">{unit}</span>
      </div>
    </Card>
  );
};