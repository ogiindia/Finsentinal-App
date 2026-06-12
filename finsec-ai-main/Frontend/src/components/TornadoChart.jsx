import React from 'react';
import { TrendingUp } from 'lucide-react';

const TornadoChart = ({ data, title = "SHAP Values Tornado Chart" }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          {title}
        </h2>
        <div className="text-gray-500 text-center py-8">No data available</div>
      </div>
    );
  }

  // Find max magnitude for bar width scaling (visual only)
  const maxValue = Math.max(...data.map(item => Math.abs(item.value)));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#012834' }}>
        <TrendingUp className="w-5 h-5" />
        {title} ({data.length} Features)
      </h2>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {data.map((item, index) => {
          const widthPct = maxValue > 0 ? Math.min(50, (Math.abs(item.value) / maxValue) * 50) : 0;
          // Positive SHAP on the right, negative on the left
          const leftPct = item.isPositive ? 50 : 50 - widthPct;
          const isZero = Math.abs(item.value) < 0.0000005;

          return (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div className="w-32 font-medium text-gray-700 truncate" title={item.name}>
                {item.name.replace(/_/g, ' ')}
              </div>

              <div className="flex-1 relative h-6">
                {/* background + center line */}
                <div className="absolute top-0 h-full bg-gray-100 rounded w-full" />
                <div className="absolute top-0 h-full border-l border-gray-400" style={{ left: '50%' }} />

                {/* bar */}
                {!isZero ? (
                  <div
                    className={`absolute top-0 h-full rounded flex items-center justify-center transition-all duration-500 ${
                      // NEW: negatives red (↑ risk), positives green (↓ risk)
                      item.isPositive ? 'bg-green-500' : 'bg-red-500'
                    }`}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%`, animation: 'slideIn 0.5s ease-out' }}
                  >
                    {/* NEW: always show RAW SHAP value (no displayValue) */}
                    <span className="text-white font-semibold px-1 text-xs">
                      {item.value >= 0 ? '+' : ''}{item.value.toFixed(6)}
                    </span>
                  </div>
                ) : (
                  <div className="absolute top-0 h-full flex items-center justify-center" style={{ left: '48%', width: '4%' }}>
                    <span className="text-gray-500 text-xs">0</span>
                  </div>
                )}
              </div>

              {/* NEW: legend text matches new polarity */}
              <div className={`text-sm font-semibold w-20 text-right ${
                isZero ? 'text-gray-400' : item.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {isZero ? 'No Impact' : item.isPositive ? '↓ Risk' : '↑ Risk'}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 text-xs text-gray-500 text-center">
        Red bars increase fraud risk | Green bars decrease fraud risk | Gray indicates no impact
      </div>
    </div>
  );
};

export default TornadoChart;
