import type { IconType } from 'react-icons';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: IconType;
  color: 'indigo' | 'green' | 'yellow' | 'red' | 'purple' | 'blue';
  subtitle?: string;
}

const colorMap = {
  indigo: { bg: 'bg-indigo-50', icon: 'bg-indigo-600', text: 'text-indigo-600' },
  green:  { bg: 'bg-green-50',  icon: 'bg-green-500',  text: 'text-green-600'  },
  yellow: { bg: 'bg-yellow-50', icon: 'bg-yellow-500', text: 'text-yellow-600' },
  red:    { bg: 'bg-red-50',    icon: 'bg-red-500',    text: 'text-red-600'    },
  purple: { bg: 'bg-purple-50', icon: 'bg-purple-600', text: 'text-purple-600' },
  blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-500',   text: 'text-blue-600'   },
};

export default function StatCard({ title, value, icon: Icon, color, subtitle }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div className={`${c.bg} rounded-xl p-5 flex items-center gap-4`}>
      <div className={`${c.icon} w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0`}>
        <Icon className="text-white text-2xl" />
      </div>
      <div>
        <p className="text-gray-500 text-sm">{title}</p>
        <p className={`text-2xl font-bold ${c.text}`}>{value}</p>
        {subtitle && <p className="text-gray-400 text-xs mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
