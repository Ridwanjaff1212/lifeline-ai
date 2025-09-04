import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmergencyButtonProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  onTrigger?: (type: string) => void;
  variant?: "fall" | "crash" | "scream" | "gas" | "heat";
  type?: string;
  className?: string;
}

export const EmergencyButton = ({ icon, title, subtitle, onClick, onTrigger, variant = "fall", type, className }: EmergencyButtonProps) => {
  const handleClick = () => {
    if (onClick) onClick();
    if (onTrigger && type) onTrigger(type);
  };
  const getVariantStyles = () => {
    switch (variant) {
      case "fall":
        return "bg-[var(--gradient-danger)] hover:shadow-[var(--glow-danger)] border-cyber-red/30";
      case "crash":
        return "bg-[var(--gradient-danger)] hover:shadow-[var(--glow-danger)] border-cyber-red/30";
      case "scream":
        return "bg-[var(--gradient-danger)] hover:shadow-[var(--glow-danger)] border-cyber-red/30";
      case "gas":
        return "bg-gradient-to-r from-cyber-orange to-cyber-red hover:shadow-[0_0_20px_hsl(var(--cyber-orange)/0.5)] border-cyber-orange/30";
      case "heat":
        return "bg-gradient-to-r from-cyber-orange to-cyber-red hover:shadow-[0_0_20px_hsl(var(--cyber-orange)/0.5)] border-cyber-orange/30";
      default:
        return "bg-[var(--gradient-danger)] hover:shadow-[var(--glow-danger)] border-cyber-red/30";
    }
  };

  return (
    <Button
      onClick={handleClick}
      className={cn(
        "h-20 w-full border-2 text-white font-poppins transition-all duration-300 hover:scale-105 active:scale-95",
        getVariantStyles(),
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl">{icon}</div>
        <div className="text-left">
          <div className="font-semibold text-sm">{title}</div>
          {subtitle && <div className="text-xs opacity-80">{subtitle}</div>}
        </div>
      </div>
    </Button>
  );
};