import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  icon: LucideIcon;
  value: number;
  label: string;
  color: string;
  onClick?: () => void;
  trend?: number; // percentage change (optional)
}

const colorMap: Record<string, { bg: string; text: string; glow: string; gradient: string }> = {
  blue: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-500',
    glow: 'shadow-blue-500/25',
    gradient: 'from-blue-500/10 to-blue-600/10'
  },
  green: {
    bg: 'bg-green-500/20',
    text: 'text-green-500',
    glow: 'shadow-green-500/25',
    gradient: 'from-green-500/10 to-green-600/10'
  },
  red: {
    bg: 'bg-red-500/20',
    text: 'text-red-500',
    glow: 'shadow-red-500/25',
    gradient: 'from-red-500/10 to-red-600/10'
  },
  yellow: {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-500',
    glow: 'shadow-yellow-500/25',
    gradient: 'from-yellow-500/10 to-yellow-600/10'
  },
  purple: {
    bg: 'bg-purple-500/20',
    text: 'text-purple-500',
    glow: 'shadow-purple-500/25',
    gradient: 'from-purple-500/10 to-purple-600/10'
  },
};

export const StatsCard: React.FC<StatsCardProps> = ({ 
  icon: Icon, 
  value, 
  label, 
  color,
  onClick,
  trend 
}) => {
  const colors = colorMap[color] || colorMap.blue;
  
  return (
    <div 
      onClick={onClick}
      className={`
        card relative overflow-hidden backdrop-blur-sm bg-dark-card/50 border-slate-800/50
        hover:border-${color}-500/30 transition-all duration-300 cursor-pointer group
        hover:shadow-xl hover:${colors.glow} hover:scale-[1.02] active:scale-[0.98]
      `}
    >
      {/* Background Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
      
      {/* Content */}
      <div className="relative flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-bold text-white tracking-tight">
              {value.toLocaleString()}
            </p>
            {trend !== undefined && (
              <span className={`text-sm font-semibold ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {trend >= 0 ? '+' : ''}{trend}%
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-slate-400 tracking-wide">{label}</p>
        </div>
        
        {/* Icon */}
        <div className="relative">
          <div className={`absolute inset-0 ${colors.bg} rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity`}></div>
          <div className={`relative w-16 h-16 rounded-2xl ${colors.bg} flex items-center justify-center 
            group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}
          >
            <Icon className={colors.text} size={28} strokeWidth={2.5} />
          </div>
        </div>
      </div>
      
      {/* Bottom accent line */}
      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-${color}-500/50 to-transparent 
        opacity-0 group-hover:opacity-100 transition-opacity`}
      ></div>
    </div>
  );
};