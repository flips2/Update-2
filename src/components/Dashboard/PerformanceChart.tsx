import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Trade } from '../../types';
import { formatCurrency } from '../../utils/calculations';

interface PerformanceChartProps {
  trades: Trade[];
  initialCapital: number;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ trades, initialCapital }) => {
  const chartData = trades.reduce((acc, trade, index) => {
    const runningCapital = acc.length > 0 
      ? acc[acc.length - 1].capital + trade.profit_loss
      : initialCapital + trade.profit_loss;
    
    acc.push({
      trade: index + 1,
      capital: runningCapital,
      profit_loss: trade.profit_loss,
      date: new Date(trade.created_at).toLocaleDateString(),
    });
    
    return acc;
  }, [] as any[]);

  // Calculate profit/loss distribution for pie chart
  const profitTrades = trades.filter(trade => trade.profit_loss > 0);
  const lossTrades = trades.filter(trade => trade.profit_loss < 0);
  
  const totalProfit = profitTrades.reduce((sum, trade) => sum + trade.profit_loss, 0);
  const totalLoss = Math.abs(lossTrades.reduce((sum, trade) => sum + trade.profit_loss, 0));
  
  const pieData = [
    { name: 'Profits', value: totalProfit, count: profitTrades.length },
    { name: 'Losses', value: totalLoss, count: lossTrades.length },
  ].filter(item => item.value > 0);

  const COLORS = {
    Profits: '#3B82F6', // Blue
    Losses: '#8B5CF6',  // Purple
  };

  if (trades.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 text-center">
        <p className="text-slate-400">No trades data to display charts</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
          <p className="text-slate-300 text-sm">
            <span className="font-medium">{payload[0].payload.name}:</span>
          </p>
          <p className="text-white font-semibold">
            {formatCurrency(payload[0].value)}
          </p>
          <p className="text-slate-400 text-xs">
            {payload[0].payload.count} trades
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLineTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
          <p className="text-slate-300 text-sm">Trade {label}</p>
          <p className="text-white font-semibold">
            Capital: {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Capital Growth Chart */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Capital Growth</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="trade" 
                stroke="#9CA3AF"
                fontSize={12}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => `$${value.toLocaleString()}`}
              />
              <Tooltip content={<CustomLineTooltip />} />
              <Line
                type="monotone"
                dataKey="capital"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#3B82F6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* P/L Distribution Pie Chart */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Profit/Loss Distribution</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[entry.name as keyof typeof COLORS]} 
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="flex justify-center space-x-6 mt-4">
          {pieData.map((entry) => (
            <div key={entry.name} className="flex items-center">
              <div 
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: COLORS[entry.name as keyof typeof COLORS] }}
              />
              <span className="text-slate-300 text-sm">
                {entry.name}: {formatCurrency(entry.value)} ({entry.count} trades)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PerformanceChart;