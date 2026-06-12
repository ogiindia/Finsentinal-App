import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer, ReferenceLine } from 'recharts';

const DynamicWaterfallChart = ({ analysisData, title }) => {
  // Extract SHAP data from various possible structures
  const extractShapData = (data) => {
    if (!data) return [];
    
    const shapData = [];
    
    // Try multiple possible paths
    const possiblePaths = [
      data.all_feature_impacts,
      data.feature_impacts,
      data.allFeatureImpacts,
      data.shap_values,
      data.shapValues,
      data.feature_importance,
      data.top_risk_factors,
      data.top_features
    ];
    
    for (const path of possiblePaths) {
      if (path) {
        if (Array.isArray(path)) {
          return path.map(item => ({
            name: item.feature || item.name || item.field || item.key || 'Unknown',
            shap_value: parseFloat(
              item.shap_value || item.shap_score || item.shap || item.impact || 
              item.importance || item.value || 0
            ),
            feature_value: item.feature_value || item.value || item.actual_value || '',
            importance: parseFloat(item.importance || item.weight || item.score || 0),
            percentage: parseFloat(
              item.contribution_percentage || item.impact_percentage || 
              item.percentage || item.contribution_pct || 0
            )
          }));
        } else if (typeof path === 'object') {
          return Object.entries(path).map(([key, value]) => {
            if (typeof value === 'object') {
              return {
                name: key,
                shap_value: parseFloat(value.shap_value || value.shap || value.impact || 0),
                feature_value: value.value || value.feature_value || '',
                importance: parseFloat(value.importance || value.score || 0),
                percentage: parseFloat(value.impact_percentage || value.percentage || 0)
              };
            } else {
              return {
                name: key,
                shap_value: parseFloat(value) || 0,
                feature_value: '',
                importance: Math.abs(parseFloat(value) || 0),
                percentage: 0
              };
            }
          });
        }
      }
    }
    
    return shapData;
  };

  // Process data for waterfall visualization
  const waterfallData = useMemo(() => {
    const rawData = extractShapData(analysisData);
    if (rawData.length === 0) return [];

    // Sort and filter
    const sortedData = [...rawData]
      .filter(d => d.shap_value !== 0 || d.importance !== 0)
      .sort((a, b) => {
        const aVal = Math.abs(a.shap_value) || a.importance;
        const bVal = Math.abs(b.shap_value) || b.importance;
        return bVal - aVal;
      })
      .slice(0, 15);

    // Calculate cumulative values
    let cumulative = 0;
    return sortedData.map((item, index) => {
      const prev = cumulative;
      cumulative += item.shap_value;
      
      return {
        ...item,
        name: item.name.replace(/_/g, ' '),
        start: prev,
        end: cumulative,
        isPositive: item.shap_value > 0,
        barValue: Math.abs(item.shap_value),
        barStart: item.shap_value > 0 ? prev : cumulative,
        index
      };
    });
  }, [analysisData]);

  // Calculate chart bounds
  const bounds = useMemo(() => {
    if (waterfallData.length === 0) return { min: -0.1, max: 0.1 };
    
    const allValues = waterfallData.flatMap(d => [d.start, d.end, 0]);
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const range = max - min;
    const padding = range * 0.15 || 0.05;
    
    return {
      min: min - padding,
      max: max + padding
    };
  }, [waterfallData]);

  // Extract metrics
  const getMetrics = () => {
    const defaultMetrics = { score: 0, percentile: 0, status: 'Unknown' };
    if (!analysisData) return defaultMetrics;
    
    const score = 
      analysisData.transaction_analysis?.prediction_score ||
      analysisData.fraud_score ||
      analysisData.anomaly_score ||
      analysisData.risk_score ||
      analysisData.score ||
      (waterfallData.length > 0 ? waterfallData[waterfallData.length - 1].end : 0);
    
    const fraudProb = 
      analysisData.transaction_analysis?.fraud_probability_score ||
      analysisData.fraud_probability ||
      analysisData.probability ||
      0;
    
    const percentile = fraudProb ? (fraudProb * 100).toFixed(1) : 
                       score ? ((1 / (1 + Math.exp(-score))) * 100).toFixed(1) : 0;
    
    const status = 
      analysisData.transaction_analysis?.status ||
      analysisData.prediction_label ||
      analysisData.status ||
      (parseFloat(percentile) > 50 ? 'SUSPICIOUS' : 'NORMAL');
    
    return {
      score: typeof score === 'number' ? score.toFixed(4) : '0.0000',
      percentile,
      status
    };
  };

  const metrics = getMetrics();

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
          <p className="font-semibold text-sm">{data.name}</p>
          {data.feature_value && (
            <p className="text-xs text-gray-600">Value: {data.feature_value}</p>
          )}
          
          {data.percentage > 0 && (
            <p className="text-xs text-gray-500">Contribution: {data.percentage.toFixed(1)}%</p>
          )}
          <p className="text-xs text-gray-500">
               Impact: {data.isPositive ? 'Decreases Risk' : 'Increases Risk'}
            </p>
        </div>
      );
    }
    return null;
  };

  // Custom bar shape
  const WaterfallBar = (props) => {
    const { x, y, width, height, payload } = props;
    const isPositive = payload.isPositive;
    
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={isPositive ? '#10b981' : '#ef4444'}
          opacity={0.8}
        />
        {payload.index > 0 && (
          <line
            x1={x}
            y1={y + (isPositive ? height : 0)}
            x2={x - 5}
            y2={y + (isPositive ? height : 0)}
            stroke="#666"
            strokeWidth={1}
            strokeDasharray="2 2"
          />
        )}
      </g>
    );
  };

  if (!analysisData || waterfallData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">{title || 'SHAP Waterfall Chart'}</h3>
        <div className="text-gray-500 text-center py-8">
          {!analysisData ? 'Loading analysis data...' : 'No feature impact data available'}
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const s = String(status).toUpperCase();
    if (s.includes('FRAUD') || s.includes('HIGH')) return 'text-red-600';
    if (s.includes('SUSPICIOUS') || s.includes('MEDIUM')) return 'text-orange-600';
    if (s.includes('NORMAL') || s.includes('LOW')) return 'text-green-600';
    return 'text-gray-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header with Metrics */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold">{title || 'SHAP Waterfall Chart'}</h3>
        <div className="mt-2 text-sm space-x-4">
          <span>
            <span className="font-medium">Score: </span>
            <span className="text-blue-600">{metrics.score}</span>
          </span>
          <span>
            <span className="font-medium">Percentile: </span>
            <span className="text-blue-600">{metrics.percentile}%</span>
          </span>
          <span>
            <span className="font-medium">Status: </span>
            <span className={getStatusColor(metrics.status)}>
              {metrics.status}
            </span>
          </span>
        </div>
      </div>

      {/* Waterfall Chart */}
      <ResponsiveContainer width="100%" height={Math.max(400, waterfallData.length * 30)}>
        <BarChart
          data={waterfallData}
          margin={{ top: 20, right: 30, left: 100, bottom: 80 }}
          barGap={0}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis 
            dataKey="name" 
            angle={-45}
            textAnchor="end"
            height={100}
            interval={0}
            tick={{ fontSize: 10 }}
          />
          <YAxis 
            domain={[bounds.min, bounds.max]}
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => value.toFixed(3)}
            label={{ value: 'SHAP Value', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#666" strokeWidth={1.5} />
          
          {/* Invisible positioning bars */}
          <Bar dataKey="barStart" stackId="stack" fill="transparent" />
          
          {/* Waterfall bars */}
          <Bar 
            dataKey="barValue" 
            stackId="stack"
            shape={<WaterfallBar />}
          >
            {waterfallData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.isPositive ? '#10b981' : '#ef4444'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-4 flex justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 opacity-80 rounded"></div>
          <span>Increases Risk</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 opacity-80 rounded"></div>
          <span>Decreases Risk</span>
        </div>
      </div>

      {/* Feature Summary */}
      {waterfallData.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-600 font-medium mb-2">
            Top {Math.min(6, waterfallData.length)} Feature Values:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            {waterfallData.slice(0, 6).map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span className="text-gray-600 truncate mr-2">{item.name}:</span>
                <span className="font-mono">
                  {item.feature_value || item.shap_value.toFixed(4)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DynamicWaterfallChart;