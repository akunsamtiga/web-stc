import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  icon: LucideIcon;
  value: number;
  label: string;
  color: string;
  onClick?: () => void;
}

export const StatsCard: React.FC<StatsCardProps> = ({ 
  icon: Icon, 
  value, 
  label, 
  color,
  onClick 
}) => {
  return (
    <div 
      onClick={onClick}
      className={`card hover:border-${color}-500/50 transition-all cursor-pointer group`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-3xl font-bold text-white mb-1">{value}</p>
          <p className="text-sm text-slate-400">{label}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg bg-${color}-500/20 flex items-center justify-center group-hover:scale-110 transition-transform`}>
          <Icon className={`text-${color}-500`} size={24} />
        </div>
      </div>
    </div>
  );
};