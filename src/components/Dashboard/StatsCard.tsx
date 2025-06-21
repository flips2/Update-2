import React from 'react';
import { motion } from 'framer-motion';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  change?: string;
  changeColor?: string;
  icon: LucideIcon;
  iconColor: string;
  bgColor: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  change,
  changeColor = 'text-slate-400',
  icon: Icon,
  iconColor,
  bgColor,
}) => {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-all"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-white mt-2">{value}</p>
          {change && (
            <p className={`text-sm mt-1 ${changeColor}`}>{change}</p>
          )}
        </div>
        <div className={`${bgColor} p-3 rounded-lg`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
    </motion.div>
  );
};

export default StatsCard;