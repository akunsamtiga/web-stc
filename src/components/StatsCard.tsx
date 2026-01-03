import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  icon: LucideIcon;
  value: number;
  label: string;
  color: string;
  onClick?: () => void;
}

const colorMap: Record<string, { bg: string; text: string; iconBg: string }> = {
  blue: {
    bg: 'bg-white hover:bg-blue-50',
    text: 'text-blue-600',
    iconBg: 'bg-blue-100'
  },
  green: {
    bg: 'bg-white hover:bg-green-50',
    text: 'text-green-600',
    iconBg: 'bg-green-100'
  },
  red: {
    bg: 'bg-white hover:bg-red-50',
    text: 'text-red-600',
    iconBg: 'bg-red-100'
  },
  yellow: {
    bg: 'bg-white hover:bg-yellow-50',
    text: 'text-yellow-600',
    iconBg: 'bg-yellow-100'
  },
};

export const StatsCard: React.FC<StatsCardProps> = ({ 
  icon: Icon, 
  value, 
  label, 
  color,
  onClick
}) => {
  const colors = colorMap[color] || colorMap.blue;
  
  return (
    <div 
      onClick={onClick}
      className={`
        ${colors.bg} rounded-2xl p-3 sm:p-5 border border-slate-200 
        transition-all duration-300 cursor-pointer active:scale-[0.98]
        shadow-sm hover:shadow-md
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${colors.iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={colors.text} size={20} strokeWidth={2.5} />
        </div>
      </div>
      
      <p className="text-xl sm:text-3xl font-bold text-slate-900 mb-1">
        {value.toLocaleString()}
      </p>
      <p className="text-xs sm:text-sm font-medium text-slate-600">{label}</p>
    </div>
  );
};