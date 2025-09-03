import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmergencyButtonProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  variant: "fall" | "crash" | "scream" | "gas" | "heat";
  className?: string;
}

export const EmergencyButton = ({ icon, title, subtitle, onClick, variant, className }: EmergencyButtonProps) => {
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
      onClick={onClick}
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
          <div className="text-xs opacity-80">{subtitle}</div>
        </div>
      </div>
    </Button>
  );
};