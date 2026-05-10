import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  current: number;
  total: number;
  className?: string;
  color?: string;
}

export function ProgressBar({ current, total, className, color = 'var(--primary-500)' }: ProgressBarProps) {
  const [width, setWidth] = useState(0);
  const percentage = Math.min(Math.max((current / total) * 100, 0), 100);

  useEffect(() => {
    const timer = setTimeout(() => {
      setWidth(percentage);
    }, 100);
    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <div className={cn("h-1.5 w-full bg-[var(--bg-page)] border border-[var(--border-default)] rounded-full overflow-hidden shadow-inner", className)}>
      <div 
        className="h-full rounded-full transition-all duration-1000 ease-out shadow-sm"
        style={{ 
          width: `${width}%`, 
          backgroundColor: color 
        }} 
      />
    </div>
  );
}
