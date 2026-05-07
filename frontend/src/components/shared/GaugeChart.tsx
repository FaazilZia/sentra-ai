import { cn } from '@/lib/utils';

interface GaugeChartProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function GaugeChart({ value, max = 100, size = 240, strokeWidth = 14, className }: GaugeChartProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius; // Semi-circle circumference
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden", className)} style={{ width: size, height: size / 2 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute top-0 rotate-[180deg]">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--bg-page)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeLinecap="round"
        />
        {/* Progress Fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--primary-500)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute bottom-0 text-center">
        <span className="font-mono text-5xl font-black text-[var(--text-primary)] tracking-tighter">
          {value}%
        </span>
        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mt-1">
          Overall Health
        </p>
      </div>
    </div>
  );
}
