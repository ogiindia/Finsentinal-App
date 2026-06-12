// ModelStatsPage.jsx
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, BarChart3, AlertTriangle, Trash2, Loader2, Target, TrendingUp, CheckCircle, RefreshCw, ChevronDown, ChevronRight, Database, AlertCircle, Check, X, Eye, Search } from 'lucide-react';
import { ResponsiveContainer, ScatterChart, CartesianGrid, XAxis, YAxis, Tooltip, Scatter, ReferenceLine, Cell } from 'recharts';
import { API_BASE_URL } from '../service/service';
import VersionSidebar from '../components/VersionSidebar';
import ModelRetrainingWizard from "../pages/ModelRetrainingWizard";

const themeColor = '#012834';

/* ----------------------------- Stats Cards ----------------------------- */
const StatsCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white rounded-xl shadow p-6">
    <div className="flex items-center gap-4">
      <div className="p-3 rounded-lg" style={{ backgroundColor: color + '15' }}>
        <Icon className="w-6 h-6" style={{ color }} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  </div>
);

/* ----------------------------- Confusion Matrix ----------------------------- */
const ConfusionMatrix = ({ matrix, labels }) => {
  if (!matrix) return null;

  const total = matrix.flat().reduce((a, b) => a + b, 0) || 1;

  const getCellStyle = (rowIdx, colIdx, value) => {
    const isCorrect = rowIdx === colIdx;
    const percentage = (value / total) * 100;

    if (isCorrect) {
      if (percentage > 80) return { bg: '#10b98130', color: '#047857', fontWeight: 'bold' };
      if (percentage > 50) return { bg: '#10b98120', color: '#059669', fontWeight: 'bold' };
      return { bg: '#10b98110', color: '#10b981', fontWeight: 'bold' };
    } else {
      if (percentage > 10) return { bg: '#ef444430', color: '#dc2626', fontWeight: 'normal' };
      if (percentage > 1) return { bg: '#ef444420', color: '#ef4444', fontWeight: 'normal' };
      return { bg: '#ef444410', color: '#f87171', fontWeight: 'normal' };
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border-2" style={{ borderColor: themeColor + '30' }}>
      <table className="w-full">
        <thead>
          <tr style={{ backgroundColor: themeColor + '10' }}>
            <th className="p-3 text-sm font-semibold text-gray-700 border-b border-r" style={{ borderColor: themeColor + '20' }}>
              Predicted <br />→<br />Actual ↓
            </th>
            {labels?.map((label, idx) => (
              <th key={idx} className="p-3 text-sm font-semibold text-gray-700 border-b" style={{ borderColor: themeColor + '20' }}>
                Class {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, rowIdx) => (
            <tr key={rowIdx}>
              <td className="p-3 text-sm font-semibold text-gray-700 border-r" style={{ backgroundColor: themeColor + '05', borderColor: themeColor + '20' }}>
                Class {labels?.[rowIdx]}
              </td>
              {row.map((value, colIdx) => {
                const cellStyle = getCellStyle(rowIdx, colIdx, value);
                const percentage = ((value / total) * 100).toFixed(1);
                return (
                  <td key={colIdx} className="p-3 text-center text-sm" style={{ backgroundColor: cellStyle.bg, color: cellStyle.color, fontWeight: cellStyle.fontWeight }}>
                    {value.toLocaleString()}
                    <br />
                    <span className="text-xs opacity-70">({percentage}%)</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const MetricsTable = ({ modelStats }) => {
  const formatPercent = (val) => (val !== undefined && val !== null ? (val * 100).toFixed(2) + '%' : 'N/A');
  const formatNumber = (val) => (val !== undefined && val !== null ? Number(val).toFixed(4) : 'N/A');

  return (
    <div className="overflow-hidden rounded-lg border" style={{ borderColor: themeColor + '30' }}>
      <table className="w-full">
        <thead>
          <tr style={{ backgroundColor: themeColor + '10' }}>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Metric</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Value</th>
          </tr>
        </thead>
        <tbody className="divide-y" style={{ divideColor: themeColor + '10' }}>
          <tr className="hover:bg-gray-50">
            <td className="px-4 py-3 text-sm text-gray-700">Accuracy</td>
            <td className="px-4 py-3 text-sm font-semibold" style={{ color: themeColor }}>{formatPercent(modelStats?.accuracy)}</td>
          </tr>
          <tr className="hover:bg-gray-50">
            <td className="px-4 py-3 text-sm text-gray-700">ROC AUC</td>
            <td className="px-4 py-3 text-sm font-semibold" style={{ color: themeColor }}>{formatNumber(modelStats?.roc_auc)}</td>
          </tr>
          <tr className="hover:bg-gray-50">
            <td className="px-4 py-3 text-sm text-gray-700">F1 Score (Macro)</td>
            <td className="px-4 py-3 text-sm font-semibold" style={{ color: themeColor }}>{formatNumber(modelStats?.f1_macro)}</td>
          </tr>
          <tr className="hover:bg-gray-50">
            <td className="px-4 py-3 text-sm text-gray-700">Precision (Macro)</td>
            <td className="px-4 py-3 text-sm font-semibold" style={{ color: themeColor }}>{formatNumber(modelStats?.precision_macro)}</td>
          </tr>
          <tr className="hover:bg-gray-50">
            <td className="px-4 py-3 text-sm text-gray-700">Recall (Macro)</td>
            <td className="px-4 py-3 text-sm font-semibold" style={{ color: themeColor }}>{formatNumber(modelStats?.recall_macro)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

const PerClassMetrics = ({ perClassMetrics }) => {
  const formatNumber = (val) => (val !== undefined && val !== null ? Number(val).toFixed(4) : 'N/A');

  if (!perClassMetrics) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full rounded-lg overflow-hidden border" style={{ borderColor: themeColor + '30' }}>
        <thead>
          <tr style={{ backgroundColor: themeColor + '10' }}>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Class</th>
            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Precision</th>
            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Recall</th>
            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">F1 Score</th>
          </tr>
        </thead>
        <tbody className="divide-y" style={{ divideColor: themeColor + '10' }}>
          {Object.entries(perClassMetrics).map(([className, metrics]) => (
            <tr key={className} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-700">Class {className}</td>
              <td className="px-4 py-3 text-sm text-center">{formatNumber(metrics.precision)}</td>
              <td className="px-4 py-3 text-sm text-center">{formatNumber(metrics.recall)}</td>
              <td className="px-4 py-3 text-sm text-center font-semibold" style={{ color: themeColor }}>{formatNumber(metrics.f1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const SupervisedStats = ({ stats }) => {
  const evalResult = stats?.evaluation_result || stats || {};
  const confusionMatrix = evalResult?.confusion_matrix;
  const totalSamples = confusionMatrix
    ? confusionMatrix.flat().reduce((a, b) => a + b, 0)
    : (evalResult?.n || 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={Activity} label="Total Samples" value={(totalSamples || 0).toLocaleString()} color={themeColor} />
        <StatsCard icon={CheckCircle} label="Accuracy" value={evalResult?.accuracy !== undefined ? `${(evalResult.accuracy * 100).toFixed(2)}%` : 'N/A'} color="#10b981" />
        <StatsCard icon={TrendingUp} label="ROC AUC Score" value={(evalResult?.roc_auc || 0).toFixed(4)} color="#3b82f6" />
        <StatsCard icon={BarChart3} label="F1 Score (Macro)" value={(evalResult?.f1_macro || 0).toFixed(4)} color="#8b5cf6" />
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: themeColor }}>
          <BarChart3 className="w-5 h-5" />
          Confusion Matrix
        </h3>
        <ConfusionMatrix matrix={confusionMatrix} labels={evalResult?.labels} />
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: themeColor }}>
          <Activity className="w-5 h-5" />
          Model Performance Metrics
        </h3>
        <MetricsTable modelStats={evalResult} />
      </div>

      {evalResult?.per_class && (
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: themeColor }}>
            <TrendingUp className="w-5 h-5" />
            Per-Class Metrics
          </h3>
          <PerClassMetrics perClassMetrics={evalResult.per_class} />
        </div>
      )}
    </div>
  );
};

/* ----------------------------- Unsupervised (unchanged) ----------------------------- */
const fmt = (val, decimals = 2) => {
  if (!Number.isFinite(val)) return 'N/A';
  return Number(val).toFixed(decimals);
};

const FeatureScatterCard = React.memo(({ feature, rows, allScores, threshold, rawScores }) => {
  const data = useMemo(() => {
    return rows.map((v, idx) => {
      const x = Number(v.val);
      const y = Number(v.shap);
      const anomalyScore = Number(allScores?.[idx] ?? 0.0);
      const rawScore = Number(rawScores?.[idx] ?? 0.0);
      const isFraud = anomalyScore >= threshold;
      return { x, y, fill: isFraud ? '#dc2626' : '#2563eb', isFraud, score: anomalyScore, raw_score: rawScore };
    });
  }, [rows, allScores, threshold, rawScores]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h4 className="font-semibold text-sm mb-3 truncate" style={{ color: themeColor }}>{feature.replace(/_/g, ' ')}</h4>
      <div style={{ width: '100%', height: 200 }}>
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis type="number" dataKey="x" tick={{ fontSize: 10 }} tickFormatter={(v) => Number.isFinite(v) ? Number(v).toFixed(1) : ''} />
            <YAxis type="number" dataKey="y" tick={{ fontSize: 10 }} tickFormatter={(v) => Number.isFinite(v) ? Number(v).toFixed(2) : ''} />
            <Tooltip content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const point = payload[0].payload;
                return (
                  <div className="bg-white p-2 border border-gray-300 rounded shadow text-xs">
                    <p className="font-semibold" style={{ color: point.fill }}>{point.isFraud ? 'Fraud' : 'Normal'}</p>
                    <p>Raw Score: {fmt(point.raw_score, 4)}</p>
                    <p>Normalized: {fmt(point.score, 4)}</p>
                    <p>Value: {fmt(point.x, 4)}</p>
                    <p>SHAP: {fmt(point.y, 4)}</p>
                  </div>
                );
              }
              return null;
            }} />
            <Scatter data={data} isAnimationActive={false}>
              {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
            </Scatter>
            <ReferenceLine y={0} stroke="#999" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="text-xs text-gray-500 mt-1 flex justify-between">
        <span><span style={{ color: '#dc2626', fontSize: '16px' }}>●</span> Fraud</span>
        <span><span style={{ color: '#2563eb', fontSize: '16px' }}>●</span> Normal</span>
      </div>
    </div>
  );
});

const UnsupervisedStats = ({ stats }) => {
  const [visibleFeatures, setVisibleFeatures] = useState(6);
  const allScores = useMemo(() => stats?.scores_sample || [], [stats]);
  const allRawScores = useMemo(() => stats?.raw_scores_sample || [], [stats]);
  const threshold = stats?.threshold || 0.5;

  const grid = useMemo(() => {
    if (!stats?.scatter) return [];
    return stats.scatter.map((f) => ({
      feature: f.feature,
      rows: f.values.map((v, i) => ({ val: Number(v), shap: Number(f.shap?.[i]) })),
      rawScores: allRawScores
    }));
  }, [stats, allRawScores]);

  const fraudCount = stats?.fraud_count || 0;
  const normalCount = (stats?.max_points || 0) - fraudCount;
  const fraudPercentage = stats?.max_points ? ((fraudCount / stats.max_points) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={Activity} label="Total Samples" value={stats?.n?.toLocaleString() || '0'} color={themeColor} />
        <StatsCard icon={AlertTriangle} label="Fraud Detected" value={`${fraudCount} (${fraudPercentage}%)`} color="#dc2626" />
        <StatsCard icon={CheckCircle} label="Normal Cases" value={normalCount.toLocaleString()} color="#10b981" />
      </div>

      {stats?.confusion_matrix && (
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: themeColor }}>
            <BarChart3 className="w-5 h-5" />Confusion Matrix (Threshold-based)
          </h3>
          <ConfusionMatrix matrix={stats.confusion_matrix} labels={stats.labels} />
        </div>
      )}

      {stats?.fraud_shap_analysis && stats.fraud_shap_analysis.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: themeColor }}>
            <Target className="w-5 h-5" />SHAP Impact Analysis for Fraud Cases ({fraudCount} cases)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full rounded-lg overflow-hidden border" style={{ borderColor: themeColor + '30' }}>
              <thead>
                <tr style={{ backgroundColor: themeColor + '10' }}>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Feature</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Min Value</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Max Value</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ divideColor: themeColor + '10' }}>
                {stats.fraud_shap_analysis.slice(0, 10).map((stat) => (
                  <tr key={stat.feature} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-700">{stat.feature.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-sm text-center text-gray-600">{Number(stat.feature_min).toFixed(4)}</td>
                    <td className="px-4 py-3 text-sm text-center text-gray-600">{Number(stat.feature_max).toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-xs text-gray-500 space-y-1">
            <p>• <span className="font-semibold">Min/Max Value:</span> Feature value range in fraud cases</p>
            <p>• <span className="font-semibold" style={{ color: '#dc2626' }}>Negative SHAP (red)</span> increases fraud probability</p>
            <p>• <span className="font-semibold" style={{ color: '#16a34a' }}>Positive SHAP (green)</span> decreases fraud probability</p>
            <p>• Features sorted by average absolute impact (most influential first)</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: themeColor }}>
          <Activity className="w-5 h-5" />SHAP Feature Analysis
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {grid.slice(0, visibleFeatures).map(({ feature, rows, rawScores }) => (
            <FeatureScatterCard key={feature} feature={feature} rows={rows} allScores={allScores} rawScores={rawScores} threshold={threshold} />
          ))}
        </div>
        {visibleFeatures < grid.length && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setVisibleFeatures((prev) => Math.min(prev + 6, grid.length))}
              className="px-6 py-2 rounded-lg font-medium text-white transition-colors"
              style={{ backgroundColor: themeColor }}
              onMouseEnter={(e) => e.target.style.opacity = '0.9'}
              onMouseLeave={(e) => e.target.style.opacity = '1'}
            >
              Show More Features ({visibleFeatures} / {grid.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ----------------------------- Main Component ----------------------------- */
export default function ModelStatsPage({userData}) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [supervisedStats, setSupervisedStats] = useState(null);
  const [unsupervisedStats, setUnsupervisedStats] = useState(null);

  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // console.log(userData);

  // console.log(userData?.user_type);

  // Tab state
  const [activeTabs, setActiveTabs] = useState('Retrain');

  // Retrain Tab States
  const [externalExpanded, setExternalExpanded] = useState(false);
  const [alertExpanded, setAlertExpanded] = useState(false);

  // Input states
  const [externalInputs, setExternalInputs] = useState(['', '']);
  const [alertInputs, setAlertInputs] = useState(['', '']);

  // API validation states
  const [externalValidation, setExternalValidation] = useState([null, null]);
  const [alertValidation, setAlertValidation] = useState([null, null]);

  // Column data from API responses
  const [externalcol, setExternalcol] = useState(null);
  const [alertcol, setAlertcol] = useState(null);
  const [Availablevalue, setAvailablevalue] = useState([]);
  const [Availablecol, setAvailablecol] = useState([]);

  // Dropdown selections
  const [externalDropdowns, setExternalDropdowns] = useState({});
  const [alertDropdowns, setAlertDropdowns] = useState({});

  // Flags
  const [externalflag, setExternalflag] = useState(false);
  const [alertflag, setAlertflag] = useState(false);

  const [targetColumn, setTargetColumn] = useState('');

  // Alert Table States
  // const [tableData, setTableData] = useState([]);
  // const [filteredData, setFilteredData] = useState([]);
  // const [selectedRows, setSelectedRows] = useState(new Set());
  // const [currentPage, setCurrentPage] = useState(1);
  // const [rowsPerPage, setRowsPerPage] = useState(10);
  // const [searchQuery, setSearchQuery] = useState('');
  // const [columnFilters, setColumnFilters] = useState({});
  // const [selectAll, setSelectAll] = useState(false);

  const [retrainKey, setRetrainKey] = useState(0);

  const [searchTerms, setSearchTerms] = useState({});
  const [openDropdowns, setOpenDropdowns] = useState({});
  const dropdownRefs = useRef({});

  const [paths, setPaths] = useState(["", ""]);
  // const [status, setStatus] = useState([
  //   "idle", // "idle" | "loading" | "success" | "error"
  //   "idle",
  // ]);

  const [status, setStatus] = useState({
    input1: "idle",
    input2: "idle",
  });


  const [modelStatuses, setModelStatuses] = useState({});
  const [closedAlertData, setClosedAlertData] = useState([]);



// const [showWizard, setShowWizard] = useState(false);
const [showWizard, setShowWizard] = useState(false);
const [isRetraining, setIsRetraining] = useState(false);

  // At the top of your component
  const conditionOptions = ['Inner Join', 'Right Join', 'Left Join'];

  const [mappingSearchTerms, setMappingSearchTerms] = useState({
    Persistance: '',
    Transaction: '',
    Condition: '',
  });

  const [mappingOpenDropdowns, setMappingOpenDropdowns] = useState({
    Persistance: false,
    Transaction: false,
    Condition: false,
  });

  const [mappingValues, setMappingValues] = useState({
    Persistance: '',
    Transaction: '',
    Condition: '',
  });

  const mappingDropdownRefs = useRef({});
  // Mock API call for input validation
  // const validateInput = async (value, type, index) => {

  //   console.log(value, type, index)





  //   try {
  //     // Simulating API call
  //     const response = await fetch(`${API_BASE_URL}/api/retrain/column_names`, {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({
  //         file_path: model.id,
  //         file_type: model.model_name
  //       })
  //     });

  //     // Mock response for demo
  //     const isValid = value.trim().length > 0;
  //     const status = isValid ? 200 : 400;

  //     if (status === 200) {
  //       // const mockData = { columns: ['Column1', 'Column2', 'Column3'] };

  //       if (type === 'external') {
  //         setExternalValidation(prev => {
  //           const newValidation = [...prev];
  //           newValidation[index] = true;
  //           return newValidation;
  //         });
  //         if (!externalcol) setExternalcol(mockData.columns);
  //       } else {
  //         setAlertValidation(prev => {
  //           const newValidation = [...prev];
  //           newValidation[index] = true;
  //           return newValidation;
  //         });
  //         if (!alertcol) setAlertcol(mockData.columns);
  //       }
  //     } else {
  //       if (type === 'external') {
  //         setExternalValidation(prev => {
  //           const newValidation = [...prev];
  //           newValidation[index] = false;
  //           return newValidation;
  //         });
  //       } else {
  //         setAlertValidation(prev => {
  //           const newValidation = [...prev];
  //           newValidation[index] = false;
  //           return newValidation;
  //         });
  //       }
  //     }
  //   } catch (error) {
  //     console.error('Validation error:', error);
  //     if (type === 'external') {
  //       setExternalValidation(prev => {
  //         const newValidation = [...prev];
  //         newValidation[index] = false;
  //         return newValidation;
  //       });
  //     } else {
  //       setAlertValidation(prev => {
  //         const newValidation = [...prev];
  //         newValidation[index] = false;
  //         return newValidation;
  //       });
  //     }
  //   }




  // };


  const [tableData, setTableData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [columnFilters, setColumnFilters] = useState({});
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // Derive columns from data (dynamic)
  const columns = useMemo(() => {
    if (!tableData || tableData.length === 0) return [];
    return Object.keys(tableData[0]); // or customize order if you want
  }, [tableData]);

  // Filtering (global search + per-column filters)
  const filteredData = useMemo(() => {
    if (!tableData) return [];

    return tableData.filter(row => {
      const values = Object.values(row);

      // Global search
      const matchesSearch = searchQuery
        ? values.some(v =>
          String(v ?? '').toLowerCase().includes(searchQuery.toLowerCase())
        )
        : true;

      // Column-wise filters
      const matchesColumns = Object.entries(columnFilters).every(
        ([col, filterValue]) => {
          if (!filterValue) return true;
          const cellValue = row[col];
          return String(cellValue ?? '')
            .toLowerCase()
            .includes(filterValue.toLowerCase());
        }
      );

      return matchesSearch && matchesColumns;
    });
  }, [tableData, searchQuery, columnFilters]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredData.length / rowsPerPage || 1)
  );

  const getCurrentPageData = () => {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredData.slice(start, end);
  };

  // Select all (current page)
  const handleSelectAll = () => {
    const currentPageRows = getCurrentPageData();
    if (selectAll) {
      // unselect all
      // setSelectedRows(new Set());
      setSelectedRows([]);

      setSelectAll(false);
    } else {
      // const newSet = new Set(currentPageRows.map(row => row.ID)); // using ID from data
      // setSelectedRows(newSet);
      setSelectedRows(currentPageRows);  // save full row objects

      setSelectAll(true);
    }
  };




  // Validate input on blur or enter
  const validateInputOnBlur = (value, type, index) => {
    if (!value.trim()) return;

    // Check for valid extensions
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const hasValidExtension = validExtensions.some(ext =>
      value.toLowerCase().endsWith(ext)
    );

    if (hasValidExtension) {
      // Update the main state
      if (type === 'external') {
        const newInputs = [...externalInputs];
        newInputs[index] = value;
        setExternalInputs(newInputs);
      } else {
        const newInputs = [...alertInputs];
        newInputs[index] = value;
        setAlertInputs(newInputs);
      }

      // Call validation API
      validateInput(value, type, index);
    } else {
      // Update the main state first
      if (type === 'external') {
        const newInputs = [...externalInputs];
        newInputs[index] = value;
        setExternalInputs(newInputs);
      } else {
        const newInputs = [...alertInputs];
        newInputs[index] = value;
        setAlertInputs(newInputs);
      }

      // Set validation to false if extension is invalid
      if (type === 'external') {
        setExternalValidation(prev => {
          const newValidation = [...prev];
          newValidation[index] = false;
          return newValidation;
        });
      } else {
        setAlertValidation(prev => {
          const newValidation = [...prev];
          newValidation[index] = false;
          return newValidation;
        });
      }
    }
  };

  const externalPlaceholders = [
    "External file path",
    "Backup external path"
  ];

  const alertPlaceholders = [
    "Alert source path",
    "Fallback alert path"
  ];


  // Call /getvalue API when both columns are available
  useEffect(() => {
    const fetchAvailableValues = async () => {


      if (externalcol && alertcol) {

        // console.log(selectedModel)
        try {
          const response = await fetch(`${API_BASE_URL}/api/retrain/model_inputs/${selectedModel.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // body: JSON.stringify({ externalcol, alertcol })
          });
          const data = await response.json();
          // console.log(data.input_features)
          // Mock response
          // const mockValues = data.input_features;
          // const combinedCols = [...externalcol, ...alertcol];
          const mockValues = [...externalcol, ...alertcol];
          const combinedCols = data.input_features;


          setAvailablecol(mockValues);

          // Initialize dropdowns
          const externalDropdownInit = {};
          // const alertDropdownInit = {};

          combinedCols.forEach(col => {
            externalDropdownInit[col] = '';
          });
          // alertcol.forEach(col => {
          //   alertDropdownInit[col] = '';
          // });
          setAvailablevalue(externalDropdownInit);
          // console.log(externalDropdownInit)
          // setExternalDropdowns(externalDropdownInit);
          // setAlertDropdowns(alertDropdownInit);
        } catch (error) {
          console.error('Error fetching values:', error);
        }
      }
    };

    fetchAvailableValues();
  }, [externalcol, alertcol]);

  // Check if all dropdowns are selected
  // useEffect(() => {
  //   if (Object.keys(Availablevalue).length > 0) {
  //     const allSelected = Object.values(Availablevalue).every(val => val !== '');
  //     const isMappingComplete =
  //       mappingValues.Persistance &&
  //       mappingValues.Transaction &&
  //       mappingValues.Condition;

  //     if (allSelected && isMappingComplete) {
  //       setExternalflag(true);
  //     } else {
  //       setExternalflag(false);
  //     }
  //   }
  // }, [Availablevalue]);



  useEffect(() => {
    if (Object.keys(Availablevalue).length > 0) {
      const allSelected = Object.values(Availablevalue).every(
        (val) => val !== '' && val != null
      );

      const isMappingComplete =
        !!mappingValues?.Persistance &&
        !!mappingValues?.Transaction &&
        !!mappingValues?.Condition;

      const hasTargetColumn = typeof targetColumn === 'string' && targetColumn.trim() !== '';

      setExternalflag(allSelected && isMappingComplete && hasTargetColumn);
    } else {
      setExternalflag(false);
    }
  }, [Availablevalue, mappingValues, targetColumn]);



  useEffect(() => {

    // console.log(externalflag, alertflag)
    // if ((selectedRows).length > 0) {S
    // const allSelected = Object.values(selectedRows).every(val => val !== '');
    if (selectedRows.length > 0) {
      // console.log(selectedRows)
      setAlertflag(true);
      // }
    } else {
      setAlertflag(false);
    }
    // console.log(externalflag, alertflag)
  }, [selectedRows]);




  // useEffect(() => {
  //   const handleClickOutside = (event) => {
  //     const refs = dropdownRefs.current;

  //     const clickedInsideSomeDropdown = Object.values(refs).some(node =>
  //       node && node.contains(event.target)
  //     );

  //     if (!clickedInsideSomeDropdown) {
  //       // close all dropdowns
  //       setOpenDropdowns({});
  //     }
  //   };

  //   document.addEventListener('mousedown', handleClickOutside);
  //   return () => {
  //     document.removeEventListener('mousedown', handleClickOutside);
  //   };
  // }, []);








  // Get available values for dropdown (prevent duplicates)
  const getAvailableValues = (currentKey, isExternal) => {
    const selectedValues = isExternal
      ? Object.entries(externalDropdowns)
        .filter(([key, val]) => key !== currentKey && val !== '')
        .map(([, val]) => val)
      : Object.entries(alertDropdowns)
        .filter(([key, val]) => key !== currentKey && val !== '')
        .map(([, val]) => val);

    // console.log(Availablevalue)
    return Availablevalue.filter(val => !selectedValues.includes(val));
  };

  // Fetch alert table data
  useEffect(() => {
    const fetchTableData = async () => {
      // if (activeTabs === 'Stats') {
      try {
        // Mock API call
        const mockData = [
          { id: 1, alert: 'High Risk Transaction', amount: 5000, date: '2024-01-15', status: 'Pending' },
          { id: 2, alert: 'Suspicious Pattern', amount: 3200, date: '2024-01-16', status: 'Reviewed' },
          { id: 3, alert: 'Multiple Transfers', amount: 8900, date: '2024-01-17', status: 'Pending' },
          { id: 4, alert: 'Large Withdrawal', amount: 12000, date: '2024-01-18', status: 'Flagged' },
          { id: 5, alert: 'Unusual Activity', amount: 4500, date: '2024-01-19', status: 'Reviewed' },
          { id: 6, alert: 'Cross-border Transfer', amount: 7800, date: '2024-01-20', status: 'Pending' },
          { id: 7, alert: 'Rapid Transactions', amount: 2300, date: '2024-01-21', status: 'Cleared' },
          { id: 8, alert: 'High Risk Merchant', amount: 6700, date: '2024-01-22', status: 'Flagged' },
        ];
        setTableData(closedAlertData)
        // setTableData(mockData);
        // setFilteredData(mockData);
      } catch (error) {
        console.error('Error fetching table data:', error);
      }
      // }
    };

    fetchTableData();
  }, [activeTabs]);

  // Apply filters and search
  useEffect(() => {
    let filtered = [...tableData];

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(row =>
        Object.values(row).some(val =>
          String(val).toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    // Apply column filters
    Object.entries(columnFilters).forEach(([column, filterValue]) => {
      if (filterValue) {
        filtered = filtered.filter(row =>
          String(row[column]).toLowerCase().includes(filterValue.toLowerCase())
        );
      }
    });

    // setFilteredData(filtered);
    setCurrentPage(1);
  }, [searchQuery, columnFilters, tableData]);

  // // Handle select all
  // const handleSelectAll = () => {
  //   if (selectAll) {
  //     setSelectedRows(new Set());
  //     setSelectAll(false);
  //   } else {
  //     const visibleRows = getCurrentPageData().map(row => row.id);
  //     setSelectedRows(new Set(visibleRows));
  //     setSelectAll(true);
  //   }
  // };

  // // Get current page data
  // const getCurrentPageData = () => {
  //   const startIndex = (currentPage - 1) * rowsPerPage;
  //   const endIndex = startIndex + rowsPerPage;
  //   return filteredData.slice(startIndex, endIndex);
  // };

  // const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  // Expandable Card Component
  const ExpandableCard = ({ title, icon: Icon, expanded, setExpanded, children }) => (
    <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden transition-all duration-300 hover:shadow-md">
      <div
        className="flex items-center justify-between p-4 bg-white cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Icon className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-800">{title}</h3>
        </div>
        <div className="transform transition-transform duration-300" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <ChevronDown className="w-5 h-5 text-gray-500" />
        </div>
      </div>

      {/* <div
        className="overflow-hidden transition-all duration-300"
        style={{
          maxHeight: expanded ? '1000px' : '0px',
          opacity: expanded ? 1 : 0
        }}
      >
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          {children}
        </div>
      </div> */}
    </div>
  );


  // Input Field Component with local state
  const InputField = ({ initialValue, type, index, validation, placeholder }) => {
    const [localValue, setLocalValue] = useState(initialValue);

    useEffect(() => {
      setLocalValue(initialValue);
    }, [initialValue]);

    const handleBlur = () => {
      validateInputOnBlur(localValue, type, index);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        validateInputOnBlur(localValue, type, index);
      }
    };

    return (
      <div className="relative">
        <input
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 transition-all ${validation === true
            ? 'border-green-500 focus:ring-green-200 bg-green-50'
            : validation === false
              ? 'border-red-500 focus:ring-red-200 bg-red-50'
              : 'border-gray-300 focus:ring-blue-200'
            }`}
        />
        {validation !== null && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {validation ? (
              <Check className="w-5 h-5 text-green-500" />
            ) : (
              <X className="w-5 h-5 text-red-500" />
            )}
          </div>
        )}
      </div>
    );
  };


  // helper: fetch active version number for a model id
  const fetchActiveVersionNumber = async (modelId) => {
    const res = await fetch(`${API_BASE_URL}/api/version/get_use/${modelId}`);
    if (!res.ok) throw new Error(`Failed to fetch active version (HTTP ${res.status})`);
    const data = await res.json();
    if (data?.status === 'Success' && data?.model_version != null) {
      return Number(data.model_version);
    }
    return null;
  };

  const transformData = (rawData) => {
    if (!rawData || !Array.isArray(rawData)) return [];

    return rawData.map(row => {
      let details = row.details;

      if (typeof details === 'string') {
        try {
          details = JSON.parse(details);
        } catch (e) {
          console.error('Error parsing details:', e);
          return {};
        }
      }

      if (Array.isArray(details)) {
        const transformedRow = {};
        details.forEach(item => {
          if (item.displayName && item.value !== undefined) {
            transformedRow[item.displayName] = item.value;
          }
        });
        return transformedRow;
      }

      return {};
    });
  };



  const handleRetrain = async () => {

    // console.log(selectedModel?.alert_category)
    // console.log(selectedCategory)
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);


    const response = await fetch(`${API_BASE_URL}/alert/query_v2?alert_category=${encodeURIComponent(selectedModel.alert_category)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });

    const data = await response.json();
    if (response.ok && data.data && Array.isArray(data.data)) {
      const transformedData = transformData(data.data);
      const allColumns = new Set();
      transformedData.forEach(row => {
        Object.keys(row).forEach(key => allColumns.add(key));
      });
      const columnsArray = Array.from(allColumns).sort();

      const CloasedAlertData = []


      if (modelStatuses.Updated_at) {
        for (const model of transformedData) {

          // console.log(yesterday)
          const closeDate = model.CLOSEDATE ? new Date(model.CLOSEDATE) : null;

          // if (closeDate !== '' && closeDate !== null && closeDate > modelStatuses.Updated_at && closeDate <= yesterday) {


            if ( closeDate !== '' && closeDate !== null) {
            CloasedAlertData.push(model)
          }
        }
      } else {
        for (const model of transformedData) {
          // if (model.CLOSEDATE <= yesterday) {
          const closeDate = model.CLOSEDATE ? new Date(model.CLOSEDATE) : null;

          // if (closeDate !== '' && closeDate !== null && closeDate <= yesterday) {
          if (closeDate !== '' && closeDate !== null) {
            CloasedAlertData.push(model)
          }
        }

      }
      console.log(closedAlertData);
      setClosedAlertData(CloasedAlertData);
      // console.log(CloasedAlertData)
      setTableData(CloasedAlertData)

    }

  };

  const fetchStatuses = async (modelsData) => {
    // console.log(modelsData)
    if (modelsData?.model_type === 'supervised') {

      // setModelStatuses(prev => ({ ...prev, [model.id]: statuses[model.id] }));
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/retrain/status/${modelsData.id}`,
          {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          }
        );
        if (response.ok) {
          const data = await response.json();
          console.log(data)
          setModelStatuses(data);
          handleRetrain()
        }
      } catch (err) {
        console.error(`Error fetching retrain status for model ${modelsData.id}:`, err);
      }

      // setModelStatuses(prev => ({ ...prev, [model.id]: statuses[model.id] }));
    } else {
      setTableData([])
    }

  };
  const fetchModels = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/model_config/list`);
      if (!response.ok) throw new Error('Failed to fetch models');
      const modelsData = await response.json();
      setModels(modelsData);
      if (modelsData.length > 0) {
        setSelectedModel(modelsData[0]);
        setActiveTab(modelsData[0].model_type);
        fetchStatuses(modelsData[0]);
        // console.log(modelsData[0])

      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all models
  useEffect(() => {

    fetchModels();
  }, []);

  // Fetch stats when selected model changes
  useEffect(() => {
    const run = async () => {
      // console.log(selectedModel)
      fetchStatuses(selectedModel);
      if (!selectedModel) return;
      setLoadingStats(true);
      setError(null);
      setSupervisedStats(null);
      setUnsupervisedStats(null);

      try {
        // NEW: if supervised, prefer active version’s metrics on initial load
        if (selectedModel.model_type === 'supervised') {
          try {
            const activeVnum = await fetchActiveVersionNumber(selectedModel.id);
            if (activeVnum != null) {
              const res = await fetch(
                `${API_BASE_URL}/api/version/calculation/${selectedModel.id}?target_version_number=${encodeURIComponent(activeVnum)}`,
                { method: 'POST' }
              );
              if (res.ok) {
                const data = await res.json();
                const metrics = data?.metrics || null;
                if (metrics) {
                  setSupervisedStats(metrics);
                  setActiveTab('supervised');
                  return; // ✅ done — we showed currently active version’s stats
                }
              }
            }
          } catch (e) {
            // fall through to the generic stats endpoint if active-version path fails
            console.warn('Active version stats fetch failed; falling back:', e);
          }
        }

        // Fallback / default path (also used for unsupervised)
        const statsRes = await fetch(`${API_BASE_URL}/model_config/stats/${selectedModel.alert_category}/${selectedModel.model_type}`);
        const payload = await statsRes.json();
        if (payload?.status === 'success' && payload?.data) {
          if (selectedModel.model_type === 'supervised') {
            setSupervisedStats(payload.data);
            setActiveTab('supervised');
          } else {
            setUnsupervisedStats(payload.data);
            setActiveTab('unsupervised');
          }
        } else {
          setActiveTab(selectedModel.model_type);
        }
      } catch (e) {
        setError(String(e));
      } finally {
        setLoadingStats(false);
      }
    };
    run();
  }, [selectedModel]);

  const handleRefresh = () => {
    if (!selectedModel) return;
    const temp = selectedModel;
    setSelectedModel(null);
    setTimeout(() => setSelectedModel(temp), 50);
  };

  /* ----------------------------- Sidebar handlers ----------------------------- */

  // View stats → POST /api/version/calculation/{model_id}?target_version_number=...
  const handleViewStatsForVersion = async (versionNumber) => {
    if (!selectedModel?.id) return;
    try {
      setLoadingStats(true);
      const res = await fetch(
        `${API_BASE_URL}/api/version/calculation/${selectedModel.id}?target_version_number=${encodeURIComponent(versionNumber)}`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error(`Calculation failed (HTTP ${res.status})`);
      const data = await res.json();
      const metrics = data?.metrics || null;
      if (metrics) {
        setSupervisedStats(metrics);
        setActiveTab('supervised');
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoadingStats(false);
    }
  };

  // Use → POST /api/version/use/{model_id}/{version_number}
  const handleUseVersion = async (versionNumber, opts = {}) => {
    if (!selectedModel?.id) return;
    try {
      setLoadingStats(true);
      const res = await fetch(`${API_BASE_URL}/api/version/use/${selectedModel.id}/${versionNumber}`, { method: "POST" });
      const payload = await res.json();
      if (!res.ok || payload?.status !== "success") {
        throw new Error(payload?.detail || payload?.message || `Failed to activate v${versionNumber}`);
      }

      const listRes = await fetch(`${API_BASE_URL}/model_config/list`);
      const all = await listRes.json();
      const updated = all.find(m => m.id === selectedModel.id);
      if (updated) {
        setSelectedModel(updated);
        if (opts?.onAfterSuccess) opts.onAfterSuccess(updated.model_path);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoadingStats(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f9fafb' }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin" style={{ color: themeColor }} />
          <p className="text-lg font-medium text-gray-700">Loading Models...</p>
        </div>
      </div>
    );
  }

  if (error && models.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f9fafb' }}>
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <h2 className="text-xl font-bold text-gray-800">Error Loading Models</h2>
          </div>
          <p className="text-gray-600 mb-6">{error}</p>
          <button onClick={() => navigate('/')} className="w-full px-4 py-2 rounded-lg text-white font-medium" style={{ backgroundColor: themeColor }}>
            Go Back
          </button>
        </div>
      </div>
    );
  }





  // Fake API call – replace this with your real API logic
  const callValidateApi = async (index, value, ext) => {
    // Example: validate against your backend
    // const res = await fetch("/api/validate-path", { ... });
    // return res.status;

    // For demo: treat any path containing "ok" as success
    const isValid = value.trim().length > 0;
    let status = '';
    // console.log(index, value, ext)
    try {
      const response = await fetch(`${API_BASE_URL}/api/retrain/column_names?file_path=${encodeURIComponent(value)}&file_type=${encodeURIComponent(ext)} `, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // body: JSON.stringify({
        //   file_path: value,
        //   file_type: ext
        // })
      });

      // Mock response for demo



      const data = await response.json();
      // console.log(data.column_names);

      status = response.status

      if (response.status === 200) {
        // console.log(response.status)
        const mockData = data;
        // console.log(mockData.column_names)
        // const mockData = { columns: ['Column1', 'Column2', 'Column3'] };
        if (index === 'input1') {
          setExternalValidation(prev => {
            const newValidation = [...prev];
            newValidation[index] = true;
            return newValidation;
          });

          // console.log(externalcol)
          // if (!externalcol) 
          setExternalcol(mockData.column_names);

        } else {
          setAlertValidation(prev => {
            const newValidation = [...prev];
            newValidation[index] = true;
            return newValidation;
          });

          // if (!alertcol) 
          setAlertcol(mockData.column_names);
        }
      } else {
        if (index === 'input1') {
          setExternalValidation(prev => {
            const newValidation = [...prev];
            newValidation[index] = false;
            return newValidation;
          });
        } else {
          setAlertValidation(prev => {
            const newValidation = [...prev];
            newValidation[index] = false;
            return newValidation;
          });
        }
      }
    } catch (error) {
      console.error('Validation error:', error);
      if (type === 'external') {
        setExternalValidation(prev => {
          const newValidation = [...prev];
          newValidation[index] = false;
          return newValidation;
        });
      } else {
        setAlertValidation(prev => {
          const newValidation = [...prev];
          newValidation[index] = false;
          return newValidation;
        });
      }
    }
    // console.log(externalValidation)
    // console.log(externalcol)
    // console.log(alertValidation)
    // console.log(alertcol)







    // await new Promise((r) => setTimeout(r, 300));
    return status;
  };

  const hasValidExtension = (value) => {
    if (!value || typeof value !== "string") return false;
    return /\.(csv|xlsx|xls)$/i.test(value.trim());
  };

  const getFileExtension = (value) => {
    if (!value || typeof value !== "string") return "";

    const parts = value.trim().split(".");
    return parts.length > 1 ? parts.pop().toLowerCase() : "";
  };


  // const handleChange = (index, value) => {
  //   console.log(index)
  //   setPaths((prev) => {
  //     const next = [...prev];
  //     next[index] = value;
  //     return next;
  //   });

  //   // Reset status to idle while editing
  //   setStatus((prev) => {
  //     const next = [...prev];
  //     next[index] = "idle";
  //     return next;
  //   });
  // };



  const handleChange = (index, value) => {
    setPaths((prev) => ({
      ...prev,
      [index]: value,
    }));

    // ✅ If you want to reset only the edited field to "idle" when typing:
    setStatus((prev) => ({
      ...prev,
      [index]: "idle",
    }));
  };


  // const validateField = async (index) => {

  //   const value = typeof paths[index] === "string" ? paths[index].trim() : "";
  //   // const value = paths[index].trim();

  //   if (!value) return;

  //   // Check extension first
  //   if (!hasValidExtension(value)) {
  //     console.log(value)
  //     setStatus((prev) => {
  //       const next = [...prev];
  //       next[index] = "error";
  //       return next;
  //     });
  //     return;
  //   }

  //   setStatus((prev) => {
  //     const next = [...prev];
  //     next[index] = "loading";
  //     return next;
  //   });

  //   try {
  //     const statusCode = await callValidateApi(index, value, getFileExtension(value));

  //     setStatus((prev) => {
  //       const next = [...prev];
  //       next[index] = statusCode === 200 ? "success" : "error";
  //       return next;
  //     });
  //   } catch (err) {
  //     setStatus((prev) => {
  //       const next = [...prev];
  //       next[index] = "error";
  //       return next;
  //     });
  //   }
  // };




  const validateField = async (index) => {
    const value = typeof paths[index] === "string" ? paths[index].trim() : "";

    if (!value) return;

    // Check extension first
    if (!hasValidExtension(value)) {
      setStatus((prev) => ({
        ...prev,
        [index]: "error",
      }));
      return;
    }

    // Set loading state
    setStatus((prev) => ({
      ...prev,
      [index]: "loading",
    }));

    try {
      // ✅ Make sure callValidateApi returns a status code (e.g., response.status)
      const statusCode = await callValidateApi(index, value, getFileExtension(value));

      setStatus((prev) => ({
        ...prev,
        [index]: statusCode === 200 ? "success" : "error",
      }));
    } catch (err) {
      setStatus((prev) => ({
        ...prev,
        [index]: "error",
      }));
    }


  };




  const getInputClasses = (state) => {
    const base =
      "w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 transition-all";

    if (state === "success") {
      return `${base} border-green-500 focus:ring-green-200 bg-green-50`;
    }

    if (state === "error") {
      return `${base} border-red-500 focus:ring-red-200 bg-red-50`;
    }

    if (state === "loading") {
      return `${base} border-blue-400 focus:ring-blue-200 bg-blue-50`;
    }

    return `${base} border-gray-300 focus:ring-blue-200`;
  };

  const renderIcon = (state) => {
    if (state === "success") {
      return <Check className="w-5 h-5 text-green-500" />;
    }
    if (state === "error") {
      return <X className="w-5 h-5 text-red-500" />;
    }
    return null;
  };






  // const getFilteredFields = (col) => {
  //   const search = (searchTerms[col] || '').toLowerCase();
  //   return Availablecol.filter(option =>
  //     option.toLowerCase().includes(search)
  //   );
  // };



  // const handleMappingChange = (col, field) => {
  //   setAvailablevalue(prev => ({
  //     ...prev,
  //     [col]: field,
  //   }));
  //   setSearchTerms(prev => ({ ...prev, [col]: field }));
  //   setOpenDropdowns(prev => ({ ...prev, [col]: false }));
  // };






  const handleMappingChange = (col, field) => {
    // console.log(col,field )
    setAvailablevalue(prev => ({
      ...prev,
      [col]: field,
    }));

    setSearchTerms(prev => ({
      ...prev,
      [col]: field,
    }));

    setOpenDropdowns(prev => ({
      ...prev,
      [col]: false,
    }));
  };


  const handleSearchChange = (modelFeature, value) => {
    // console.log(modelFeature, value)
    if (modelFeature === 'target_column') {
      setSearchTerms(prev => ({ ...prev, [modelFeature]: value }));
    } else {
      setSearchTerms(prev => ({ ...prev, [modelFeature]: value }));
      setAvailablevalue(prev => ({ ...prev, [modelFeature]: value }));
    }

  };


  const handleClearMapping = () => {
    const initialMappings = {};
    const initialSearchTerms = {};

    Object.keys(Availablevalue).forEach(col => {
      initialMappings[col] = '';
      initialSearchTerms[col] = '';
    });

    setAvailablevalue(initialMappings);
    setSearchTerms(initialSearchTerms);

    // setMessages({ success: 'Mappings cleared', error: null });
  };


  // Availablecol = array of all possible options
  // Availablevalue = { [colName]: selectedValue }

  // const getFilteredFields = (col) => {
  //   const search = (searchTerms[col] || '').toLowerCase();

  //   // Collect all selected values except the current column
  //   const usedValues = Object.entries(Availablevalue || {})
  //     .filter(([key]) => key !== col)   // exclude current dropdown
  //     .map(([, value]) => value)
  //     .filter(Boolean);

  //   return Availablecol
  //     // hide values already used in other dropdowns
  //     .filter(option => !usedValues.includes(option))
  //     // filter by search text
  //     .filter(option => option.toLowerCase().includes(search));
  // };

  const getFilteredFields = (col) => {
    const search = (searchTerms[col] || '').toLowerCase();

    // 1) values already used in feature mappings (except this dropdown itself)
    const usedInFeatureMappings = Object.entries(Availablevalue || {})
      .filter(([key]) => key !== col)
      .map(([, value]) => value)
      .filter(Boolean);

    // 2) values used in Mapping the data
    const usedInMapping = [
      mappingValues?.Persistance,
      mappingValues?.Transaction,
    ].filter(Boolean);

    // 3) value used as Target Column
    const usedTarget = targetColumn ? [targetColumn] : [];

    const usedValues = [...usedInFeatureMappings, ...usedInMapping, ...usedTarget];

    return Availablecol
      .filter(option => !usedValues.includes(option)) // remove all used values
      .filter(option => option.toLowerCase().includes(search));
  };


  const getTargetOptions = () => {
    const search = (searchTerms['target_column'] || '').toLowerCase();

    const usedInFeatureMappings = Object.values(Availablevalue || {}).filter(Boolean);
    const usedInMappingData = [
      mappingValues?.Persistance,
      mappingValues?.Transaction,
    ].filter(Boolean);

    const usedValues = [...usedInFeatureMappings, ...usedInMappingData];

    return Availablecol
      .filter(option => !usedValues.includes(option))
      .filter(option => option.toLowerCase().includes(search));
  };



  const toggleDropdown = (modelFeature) => {
    setOpenDropdowns(prev => ({ ...prev, [modelFeature]: !prev[modelFeature] }));
  };

  const currentStats = activeTab === 'supervised' ? supervisedStats : unsupervisedStats;

  const buildRequestBody = () => {

    let updatedValue = mappingValues.Condition.toLowerCase();

    if (updatedValue) {
      updatedValue = updatedValue.replace(' join', '');
      // console.log(updatedValue)
    }


    // updatedValue = value.replace(' Join', '');
    // console.log(updatedValue)
    const selectedArray = [...selectedRows];
    // console.log(selectedArray)
    let body = {
      model_id: selectedModel.id,
    };

    // ---------- CASE 1: BOTH TRUE ----------
    if (externalflag && alertflag) {
      body = {
        ...body,

        persistance_path: paths.input1,
        transaction_path: paths.input2,

        persistance_file_type: getFileExtension(paths.input1),
        transaction_file_type: getFileExtension(paths.input2),

        join_left_columns: [mappingValues.Persistance],
        join_right_columns: [mappingValues.Transaction],

        feature_mappings: Availablevalue,
        join_type: updatedValue,
        target_column: targetColumn,

        alert_rows: selectedArray,  // Use dynamic values here

        run_async: true,
      };

      return body;
    }

    // ---------- CASE 2: ONLY ALERT FLAG TRUE ----------
    if (!externalflag && alertflag) {
      body = {
        ...body,
        persistance_path: "None",
        transaction_path: "None",
        alert_rows: selectedArray, // Dynamic alert rows

        // feature_mappings: Availablevalue,

        // target_column: targetColumn,

        run_async: true,
      };

      return body;
    }

    // ---------- CASE 3: ONLY EXTERNAL FLAG TRUE ----------
    if (externalflag && !alertflag) {
      body = {
        ...body,

        persistance_path: paths.input1,
        transaction_path: paths.input2,

        persistance_file_type: getFileExtension(paths.input1),
        transaction_file_type: getFileExtension(paths.input2),

        join_left_columns: [mappingValues.Persistance],
        join_right_columns: [mappingValues.Transaction],

        join_type: updatedValue, // "inner" | "right" | "left"

        feature_mappings: Availablevalue,

        target_column: targetColumn,

        run_async: true,
      };

      return body;
    }

    // ---------- DEFAULT (no flags on) ----------
    return body;
  };




  const handleBackToConfig = () => {
    setShowWizard(false);
    onClose()
    // Navigate back to config page
  };

  // const handleSubmit = async () => {
  //   // console.log(!externalflag, !alertflag)

  //   // console.log(selectedModel)
  //   const requestBody = buildRequestBody();
  //   // console.log("Final API Body:", requestBody);

  //   try {
  //     const response = await fetch(`${API_BASE_URL}/api/retrain/v2`, {
  //       method: 'POST',
  //       headers: {

  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify(requestBody),
  //     });

  //     if (!response.ok) {
  //       throw new Error('API call failed');
  //     }
  //     const result = await response.json();
  //     console.log(result)
  //  setShowWizard(true)


  //   } catch (error) {
  //     console.error('Error:', error);
  //   }

  // }


  // Filter options for each dropdown separately
  
  
  const handleSubmit = async () => {
  const requestBody = buildRequestBody();
// console.log(requestBody.persistance_path)
  try {
    setIsRetraining(true);    

    // const response = await fetch(`${API_BASE_URL}/api/retrain/v2`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify(requestBody),
    // });

    
const response = await fetch(
  `${API_BASE_URL}/api/retrain/v2?persistance_path=${encodeURIComponent(requestBody.persistance_path)}&transaction_path=${encodeURIComponent(requestBody.transaction_path)}`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });


    if (!response.ok) {
      throw new Error('API call failed');
    }

    const result = await response.json();
    console.log(result);

    setRetrainKey(prev => prev + 1);
    // show wizard below button after 200
    setShowWizard(true);
  } catch (error) {
    console.error('Error:', error);
    setIsRetraining(false);  // re-enable so they can retry
  }
};
  
  
  
  const getMappingOptions = (key) => {
    if (key === 'Persistance') return externalcol || [];
    if (key === 'Transaction') return alertcol || [];
    if (key === 'Condition') return conditionOptions;
    return [];
  };

  // const getFilteredMappingOptions = (key) => {
  //   const search = (mappingSearchTerms[key] || '').toLowerCase();
  //   return getMappingOptions(key).filter(opt =>
  //     opt.toLowerCase().includes(search)
  //   );
  // };
  const getFilteredMappingOptions = (key) => {
    const search = (mappingSearchTerms[key] || '').toLowerCase();

    const baseOptions =
      key === 'Persistance'
        ? externalcol || []
        : key === 'Transaction'
          ? alertcol || []
          : conditionOptions;

    const usedInFeatureMappings = Object.values(Availablevalue || {}).filter(Boolean);
    const usedTarget = targetColumn ? [targetColumn] : [];

    const usedValues = [...usedInFeatureMappings, ...usedTarget];

    return baseOptions
      .filter(opt => !usedValues.includes(opt))
      .filter(opt => opt.toLowerCase().includes(search));
  };


  const handleMappingSearchChange = (key, value) => {
    setMappingSearchTerms(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleMappingSelect = (key, value) => {
    setMappingValues(prev => ({
      ...prev,
      [key]: value,
    }));

    setMappingSearchTerms(prev => ({
      ...prev,
      [key]: value,
    }));

    setMappingOpenDropdowns(prev => ({
      ...prev,
      [key]: false,
    }));
  };

  const toggleMappingDropdown = (key) => {
    // console.log(key)
    setMappingOpenDropdowns(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleClearMappingData = () => {
    setMappingValues({
      Persistance: '',
      Transaction: '',
      Condition: '',
    });
    setMappingSearchTerms({
      Persistance: '',
      Transaction: '',
      Condition: '',
    });
  };

  // Click outside: close all three mapping dropdowns
  // useEffect(() => {
  //   const handleClickOutside = (event) => {
  //     const refs = mappingDropdownRefs.current;

  //     const clickedInsideSomeDropdown = Object.values(refs).some(node =>
  //       node && node.contains(event.target)
  //     );

  //     if (!clickedInsideSomeDropdown) {
  //       setMappingOpenDropdowns({
  //         Persistance: false,
  //         Transaction: false,
  //         Condition: false,
  //       });
  //     }
  //   };

  //   document.addEventListener('mousedown', handleClickOutside);
  //   return () => {
  //     document.removeEventListener('mousedown', handleClickOutside);
  //   };
  // }, []);




  // New state to store target column value


  // New handler for selecting target column
  // const handleTargetColumnChange = (field) => {
  //   setTargetColumn(field);
  //   setSearchTerms(prev => ({ ...prev, target_column: field })); // reuse same searchTerms map
  //   setOpenDropdowns(prev => ({ ...prev, target_column: false }));
  // };



  const handleTargetColumnChange = (field) => {
    setTargetColumn(field); // <-- separate state only

    setSearchTerms(prev => ({
      ...prev,
      target_column: field,
    }));

    setOpenDropdowns(prev => ({
      ...prev,
      target_column: false,
    }));
  };

const handleOpenReport = () => {
  if (!selectedModel?.id) return;

  const form = document.createElement("form");
  form.method = "POST";
  form.action = `${API_BASE_URL}/report/model-performance/${selectedModel.id}`;
  form.target = "_blank";

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9fafb' }}>
      <div className="max-w-7xl mx-auto px-4 pt-6">
        {/* Header & Model selector */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div>
        <h1
          style={{
                  fontSize: '2rem',
                  fontWeight: '700',
                  color: themeColor,
                  marginBottom: '0.25rem'
                }}
        >
                ML Studio
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                Know about your model
        </p>
      </div>
          <div className="flex items-center gap-4 flex-wrap">
            <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Select Model:</label>
            <select
              value={selectedModel?.id || ''}
              onChange={(e) => {
                const model = models.find(m => m.id === parseInt(e.target.value));
                if (model) {
                  setSelectedModel(model);
                  setActiveTab(model.model_type);
                }
              }}
              className="flex-1 max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{ focusRingColor: themeColor }}
            >
              <option value="">-- Select Model --</option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.model_name} - {model.model_type}
                </option>
              ))}
            </select>

            <button
              onClick={handleRefresh}
              disabled={!selectedModel || loadingStats}
              className="p-2 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{ backgroundColor: themeColor }}
              title="Refresh Stats"
            >
              <RefreshCw className={`w-5 h-5 ${loadingStats ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleOpenReport}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium shadow transition-all"
              style={{ backgroundColor: themeColor }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              <Eye className="w-4 h-4" />
              Report
            </button>
          </div>

          {selectedModel && (
            <div className="mt-2 text-xs text-gray-500">
              <p>Model: <span className="font-semibold">{selectedModel.model_name}</span></p>
              <p className="mt-1">Category: {selectedModel.alert_category}</p>
              <p className="mt-1">Type: {selectedModel.model_type}</p>
              <p className="mt-1">Active ONNX: {selectedModel.model_path || '-'}</p>
            </div>
          )}
        </div>



        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            {/* <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Model Retraining Dashboard</h1>
                    <p className="text-gray-600">Configure and manage your model retraining process</p>
                </div> */}

            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow-sm mb-6">
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTabs('Stats')}
                  className={`flex-1 px-6 py-4 font-semibold transition-all ${activeTabs === 'Stats'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                >
                  Stats
                </button>
                <button
                  onClick={() => setActiveTabs('Retrain')}
                  className={`flex-1 px-6 py-4 font-semibold transition-all ${activeTabs === 'Retrain'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                >
                  Retrain
                </button>
              </div>
            </div>



            {/* Tab Content */}
            {activeTabs === 'Retrain' ? (
              <div className="space-y-6">
                {/* External Data Card */}
                <ExpandableCard
                  title="External Data"
                  icon={Database}
                  expanded={externalExpanded}
                  setExpanded={setExternalExpanded}
                >


                </ExpandableCard>









                {/* 
                    <div className="space-y-4">
                      {[0, 1].map((index) => (
                        <div key={index}>
                          <div className="relative">
                            <input
                              type="text"
                              value={paths[index]}
                              onChange={(e) => handleChange(index, e.target.value)}
                              onBlur={() => validateField(index)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  validateField(index);
                                }
                              }}
                              onPaste={() => {
                                // Let the paste finish, then validate
                                setTimeout(() => validateField(index), 0);
                              }}
                              placeholder={`Data path ${index + 1}`}
                              className={getInputClasses(status[index])}
                            />
                            {status[index] !== "idle" && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                {renderIcon(status[index])}
                              </div>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            Enter the path of the data (.csv, .xls, .xlsx)
                          </p>
                        </div>
                      ))}
                    </div> */}





                {externalExpanded && (
                  <div >
                    <p className=" font-bold text-gray-600 mb-4">
                      Enter the path of the Persistance data
                    </p>



                    <div className="bg-gray-50 border-t border-gray-200 space-y-4">
                      {/* -------------------------------- */}
                      {/* 🚀 First Input Field */}
                      {/* -------------------------------- */}
                      <div>
                        <div className="relative">
                          <input
                            type="text"
                            value={paths.input1}
                            onChange={(e) => handleChange("input1", e.target.value)}
                            onBlur={() => validateField("input1")}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                validateField("input1");
                              }
                            }}
                            onPaste={() => setTimeout(() => validateField("input1"), 0)}
                            placeholder="Persistance Data"
                            className={getInputClasses(status.input1)}
                          />
                          {status.input1 !== "idle" && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              {renderIcon(status.input1)}
                            </div>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Enter the path of the data (.csv, .xls, .xlsx)
                        </p>
                      </div>
                      {/* <p className="text-sm text-gray-600 mb-4">
                       */}
                      <p className=" font-bold text-gray-600 mb-4">
                        Enter the path of the Transaction data
                      </p>
                      {/* -------------------------------- */}
                      {/* 🚀 Second Input Field */}
                      {/* -------------------------------- */}
                      <div>
                        <div className="relative">
                          <input
                            type="text"
                            value={paths.input2}
                            onChange={(e) => handleChange("input2", e.target.value)}
                            onBlur={() => validateField("input2")}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                validateField("input2");
                              }
                            }}
                            onPaste={() => setTimeout(() => validateField("input2"), 0)}
                            placeholder="Transaction Data"
                            className={getInputClasses(status.input2)}
                          />
                          {status.input2 !== "idle" && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              {renderIcon(status.input2)}
                            </div>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Enter the path of the data (.csv, .xls, .xlsx)
                        </p>
                      </div>
                    </div>






                    {externalcol?.length > 0 && alertcol?.length > 0 && (
                      <div style={{ marginBottom: '24px', marginTop: '20px' }}>
                        {/* Title */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '12px',
                          }}
                        >
                          <h3
                            style={{
                              fontSize: '18px',
                              fontWeight: 600,
                              color: '#374151',
                            }}
                          >
                            Mapping the data
                          </h3>

                          <button
                            onClick={handleClearMappingData}
                            style={{
                              padding: '6px 12px',
                              background: '#ef4444',
                              color: 'white',
                              borderRadius: '8px',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '13px',
                            }}
                          >
                            <Trash2 size={14} />
                            Clear Mapping
                          </button>
                        </div>

                        {/* Row with 3 dropdowns */}
                        <div
                          style={{
                            display: 'flex',
                            gap: '16px',
                            alignItems: 'flex-start',
                          }}
                        >
                          {['Persistance', 'Transaction', 'Condition'].map((key) => (
                            <div
                              key={key}
                              style={{
                                width:
                                  key === 'Condition'
                                    ? '25%'
                                    : '35%',
                              }}
                            >
                              <label
                                style={{
                                  display: 'block',
                                  fontSize: '13px',
                                  fontWeight: 500,
                                  color: '#6b7280',
                                  marginBottom: '4px',
                                }}
                              >
                                {key}
                              </label>

                              <div
                                style={{ position: 'relative' }}
                                ref={el => (mappingDropdownRefs.current[key] = el)}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                  }}
                                >
                                  <input
                                    type="text"
                                    value={mappingSearchTerms[key] || ''}
                                    onChange={(e) =>
                                      handleMappingSearchChange(key, e.target.value)
                                    }
                                    onFocus={() =>
                                      setMappingOpenDropdowns(prev => ({
                                        ...prev,
                                        [key]: true,
                                      }))
                                    }
                                    placeholder="Type to search or select"
                                    style={{
                                      flex: 1,
                                      padding: '10px 12px',
                                      border: '1px solid #d1d5db',
                                      borderRadius: '8px',
                                      fontSize: '14px',
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => toggleMappingDropdown(key)}
                                    style={{
                                      padding: '10px',
                                      background: '#f3f4f6',
                                      border: '1px solid #d1d5db',
                                      borderRadius: '8px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <ChevronDown size={16} color="#6b7280" />
                                  </button>
                                </div>

                                {mappingOpenDropdowns[key] && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      top: '100%',
                                      left: 0,
                                      right: 0,
                                      marginTop: '4px',
                                      background: 'white',
                                      border: '1px solid #d1d5db',
                                      borderRadius: '8px',
                                      maxHeight: '200px',
                                      overflowY: 'auto',
                                      zIndex: 1000,
                                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                    }}
                                  >
                                    {getFilteredMappingOptions(key).length > 0 ? (
                                      getFilteredMappingOptions(key).map((option) => (
                                        <div
                                          key={option}
                                          onClick={() => handleMappingSelect(key, option)}
                                          style={{
                                            padding: '10px 12px',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            color: '#374151',
                                            background:
                                              mappingValues[key] === option
                                                ? '#e0f2fe'
                                                : 'transparent',
                                            borderBottom: '1px solid #f3f4f6',
                                          }}
                                          onMouseEnter={(e) => {
                                            e.target.style.background = '#f3f4f6';
                                          }}
                                          onMouseLeave={(e) => {
                                            e.target.style.background =
                                              mappingValues[key] === option
                                                ? '#e0f2fe'
                                                : 'transparent';
                                          }}
                                        >
                                          {option}
                                        </div>
                                      ))
                                    ) : (
                                      <div
                                        style={{
                                          padding: '10px 12px',
                                          fontSize: '14px',
                                          color: '#9ca3af',
                                        }}
                                      >
                                        No matching values
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}


                    {Object.keys(Availablevalue || {}).length > 0 && (
                      <div style={{ marginBottom: '24px', width: '98%' }}>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '13px',
                            fontWeight: '500',
                            color: '#6b7280',
                            marginBottom: '4px',
                          }}
                        >
                          Target Column
                        </label>

                        <div
                          style={{ position: 'relative' }}
                          ref={el => (dropdownRefs.current['target_column'] = el)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="text"
                              value={searchTerms['target_column'] || ''}
                              onChange={(e) => handleSearchChange('target_column', e.target.value)}
                              onFocus={() =>
                                setOpenDropdowns(prev => ({ ...prev, target_column: true }))
                              }
                              placeholder="Type to search or select"
                              style={{
                                flex: 1,
                                padding: '10px 12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                fontSize: '14px',
                              }}
                            />
                            <button
                              onClick={() => toggleDropdown('target_column')}
                              style={{
                                padding: '10px',
                                background: '#f3f4f6',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                cursor: 'pointer',
                              }}
                            >
                              <ChevronDown size={16} color="#6b7280" />
                            </button>
                          </div>

                          {openDropdowns['target_column'] && (
                            <div
                              style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                marginTop: '4px',
                                background: 'white',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                maxHeight: '200px',
                                overflowY: 'auto',
                                zIndex: 1000,
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                              }}
                            >
                              {getTargetOptions('target_column').length > 0 ? (
                                getTargetOptions('target_column').map((field) => (
                                  <div
                                    key={field}
                                    onClick={() => handleTargetColumnChange(field)}
                                    style={{
                                      padding: '10px 12px',
                                      cursor: 'pointer',
                                      fontSize: '14px',
                                      color: '#374151',
                                      background:
                                        targetColumn === field ? '#e0f2fe' : 'transparent',
                                      borderBottom: '1px solid #f3f4f6',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.target.style.background = '#f3f4f6';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.target.style.background =
                                        targetColumn === field ? '#e0f2fe' : 'transparent';
                                    }}
                                  >
                                    {field}
                                  </div>
                                ))
                              ) : (
                                <div
                                  style={{
                                    padding: '10px 12px',
                                    fontSize: '14px',
                                    color: '#9ca3af',
                                  }}
                                >
                                  No matching fields
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {Object.keys(Availablevalue || {}).length > 0 && (
                      <div style={{ marginBottom: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#374151' }}>
                            Feature Mapping (
                            {Object.values(Availablevalue).filter(v => v).length}/
                            {Object.keys(Availablevalue).length}
                            )
                          </h3>
                          <button
                            onClick={handleClearMapping}
                            style={{
                              padding: '8px 16px',
                              background: '#ef4444',
                              color: 'white',
                              borderRadius: '8px',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                          >
                            <Trash2 size={16} />
                            Clear All
                          </button>
                        </div>

                        <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
                          {Object.keys(Availablevalue).map((col) => (
                            <div key={col} style={{ marginBottom: '16px' }}>
                              <label
                                style={{
                                  display: 'block',
                                  fontSize: '13px',
                                  fontWeight: '500',
                                  color: '#6b7280',
                                  marginBottom: '4px',
                                }}
                              >
                                {col}
                              </label>

                              <div
                                style={{ position: 'relative' }}
                                ref={el => (dropdownRefs.current[col] = el)}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <input
                                    type="text"
                                    value={searchTerms[col] || ''}
                                    onChange={(e) => handleSearchChange(col, e.target.value)}
                                    onFocus={() =>
                                      setOpenDropdowns(prev => ({ ...prev, [col]: true }))
                                    }
                                    placeholder="Type to search or select"
                                    style={{
                                      flex: 1,
                                      padding: '10px 12px',
                                      border: '1px solid #d1d5db',
                                      borderRadius: '8px',
                                      fontSize: '14px',
                                    }}
                                  />
                                  <button
                                    onClick={() => toggleDropdown(col)}
                                    style={{
                                      padding: '10px',
                                      background: '#f3f4f6',
                                      border: '1px solid #d1d5db',
                                      borderRadius: '8px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <ChevronDown size={16} color="#6b7280" />
                                  </button>
                                </div>

                                {openDropdowns[col] && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      top: '100%',
                                      left: 0,
                                      right: 0,
                                      marginTop: '4px',
                                      background: 'white',
                                      border: '1px solid #d1d5db',
                                      borderRadius: '8px',
                                      maxHeight: '200px',
                                      overflowY: 'auto',
                                      zIndex: 1000,
                                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                                    }}
                                  >
                                    {getFilteredFields(col).length > 0 ? (
                                      getFilteredFields(col).map((field) => (
                                        <div
                                          key={field}
                                          onClick={() => handleMappingChange(col, field)}
                                          style={{
                                            padding: '10px 12px',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            color: '#374151',
                                            background:
                                              Availablevalue[col] === field
                                                ? '#e0f2fe'
                                                : 'transparent',
                                            borderBottom: '1px solid #f3f4f6',
                                          }}
                                          onMouseEnter={(e) => {
                                            e.target.style.background = '#f3f4f6';
                                          }}
                                          onMouseLeave={(e) => {
                                            e.target.style.background =
                                              Availablevalue[col] === field
                                                ? '#e0f2fe'
                                                : 'transparent';
                                          }}
                                        >
                                          {field}
                                        </div>
                                      ))
                                    ) : (
                                      <div
                                        style={{
                                          padding: '10px 12px',
                                          fontSize: '14px',
                                          color: '#9ca3af',
                                        }}
                                      >
                                        No matching fields
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

























                    {/* Show only if we have dropdown names */}
                    {/* {Object.keys(Availablevalue || {}).length > 0 && (
  <div style={{ marginBottom: '32px' }}>
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
      }}
    >
      <h3
        style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#374151',
        }}
      >
        Feature Mapping (
        {Object.values(Availablevalue).filter(v => v).length}/
        {Object.keys(Availablevalue).length})
      </h3>
      <button
        onClick={handleClearMapping}
        style={{
          padding: '8px 16px',
          background: '#ef4444',
          color: 'white',
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Trash2 size={16} />
        Clear All
      </button>
    </div>

    <div
      style={{
        maxHeight: '400px',
        overflowY: 'auto',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '16px',
      }}
    >
      {Object.keys(Availablevalue).map((col) => (
        <div key={col} style={{ marginBottom: '16px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '500',
              color: '#6b7280',
              marginBottom: '4px',
            }}
          >
            {col}
          </label>

          <div
            style={{ position: 'relative' }}
            ref={el => (dropdownRefs.current[col] = el)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="text"
                value={searchTerms[col] || ''}
                onChange={(e) => handleSearchChange(col, e.target.value)}
                onFocus={() =>
                  setOpenDropdowns(prev => ({ ...prev, [col]: true }))
                }
                placeholder="Type to search or select"
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              />
              <button
                onClick={() => toggleDropdown(col)}
                style={{
                  padding: '10px',
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                <ChevronDown size={16} color="#6b7280" />
              </button>
            </div>

            {openDropdowns[col] && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  background: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  zIndex: 1000,
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                }}
              >
                {getFilteredFields(col).length > 0 ? (
                  getFilteredFields(col).map((field) => (
                    <div
                      key={field}
                      onClick={() => handleMappingChange(col, field)}
                      style={{
                        padding: '10px 12px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#374151',
                        background:
                          Availablevalue[col] === field
                            ? '#e0f2fe'
                            : 'transparent',
                        borderBottom: '1px solid #f3f4f6',
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#f3f4f6';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background =
                          Availablevalue[col] === field
                            ? '#e0f2fe'
                            : 'transparent';
                      }}
                    >
                      {field}
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      padding: '10px 12px',
                      fontSize: '14px',
                      color: '#9ca3af',
                    }}
                  >
                    No matching fields
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
)} */}







                    {/* <div className="space-y-3 mb-4">
                {externalInputs.map((input, index) => (
                  <InputField
                    key={index}
                    initialValue={input}
                    type="external"
                    index={index}
                    validation={externalValidation[index]}
                    placeholder={`External data path ${index + 1}`}
                  />
                ))}
              </div> */}


                    {/* {externalDropdowns.length > 0 && (
                      <div style={{ marginBottom: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#374151' }}>
                            Feature Mapping ({Object.values(featureMappings).filter(v => v).length}/{externalDropdowns.length})
                          </h3>
                          <button
                            onClick={handleClearMapping}
                            style={{ padding: '8px 16px', background: '#ef4444', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                          >
                            <Trash2 size={16} />
                            Clear All
                          </button>
                        </div>
                        <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
                          {modelColumns.map((col) => (
                            <div key={col} style={{ marginBottom: '16px' }}>
                              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>
                                {col}
                              </label>
                              <div style={{ position: 'relative' }} ref={el => dropdownRefs.current[col] = el}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <input
                                    type="text"
                                    value={searchTerms[col] || ''}
                                    onChange={(e) => handleSearchChange(col, e.target.value)}
                                    onFocus={() => setOpenDropdowns(prev => ({ ...prev, [col]: true }))}
                                    placeholder="Type to search or select"
                                    style={{ flex: 1, padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
                                  />
                                  <button
                                    onClick={() => toggleDropdown(col)}
                                    style={{ padding: '10px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer' }}
                                  >
                                    <ChevronDown size={16} color="#6b7280" />
                                  </button>
                                </div>
                                {openDropdowns[col] && (
                                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: 'white', border: '1px solid #d1d5db', borderRadius: '8px', maxHeight: '200px', overflowY: 'auto', zIndex: 1000, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                                    {getFilteredFields(col).length > 0 ? (
                                      getFilteredFields(col).map((field) => (
                                        <div
                                          key={field}
                                          onClick={() => handleMappingChange(col, field)}
                                          style={{ padding: '10px 12px', cursor: 'pointer', fontSize: '14px', color: '#374151', background: featureMappings[col] === field ? '#e0f2fe' : 'transparent', borderBottom: '1px solid #f3f4f6' }}
                                          onMouseEnter={(e) => e.target.style.background = '#f3f4f6'}
                                          onMouseLeave={(e) => e.target.style.background = featureMappings[col] === field ? '#e0f2fe' : 'transparent'}
                                        >
                                          {field}
                                        </div>
                                      ))
                                    ) : (
                                      <div style={{ padding: '10px 12px', fontSize: '14px', color: '#9ca3af' }}>
                                        No matching fields
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )} */}

                    {/* Dropdowns */}
                    {/* {Object.keys(externalDropdowns).length > 0 && (
                      <div className="space-y-3 mt-4">
                        <h4 className="font-semibold text-gray-700 mb-2">Map Columns</h4>
                        {Object.keys(externalDropdowns).map((col) => (
                          <div key={col} className="flex items-center gap-3">
                            <label className="w-32 text-sm font-medium text-gray-700">{col}:</label>
                            <select
                              value={externalDropdowns[col]}
                              onChange={(e) => setExternalDropdowns(prev => ({ ...prev, [col]: e.target.value }))}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                            >
                              <option value="">Select value</option>
                              {getAvailableValues(col, true).map(val => (
                                <option key={val} value={val}>{val}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                        {externalflag && (
                          <div className="flex items-center gap-2 text-green-600 mt-2">
                            <Check className="w-5 h-5" />
                            <span className="text-sm font-medium">All columns mapped successfully</span>
                          </div>
                        )}
                      </div>
                    )} */}







                  </div>

                )}


























                {/* Alert Data Card */}
                <ExpandableCard
                  title="Alert Data"
                  icon={AlertCircle}
                  expanded={alertExpanded}
                  setExpanded={setAlertExpanded}
                >





                </ExpandableCard>



                {alertExpanded && (
                  <div>


                    {/* <div className="bg-white rounded-lg shadow-sm p-6">
                      
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-800">Alert Statistics</h2>
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Search..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                            />
                          </div>
                          <select
                            value={rowsPerPage}
                            onChange={(e) => {
                              setRowsPerPage(Number(e.target.value));
                              setCurrentPage(1);
                            }}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                          >
                            <option value={10}>10 rows</option>
                            <option value={20}>20 rows</option>
                            <option value={30}>30 rows</option>
                            <option value={50}>50 rows</option>
                          </select>
                        </div>
                      </div>

                      
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3 text-left">
                                <input
                                  type="checkbox"
                                  checked={selectAll}
                                  onChange={handleSelectAll}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                <div className="flex flex-col gap-1">
                                  <span>ID</span>
                                  <input
                                    type="text"
                                    placeholder="Filter..."
                                    onChange={(e) => setColumnFilters(prev => ({ ...prev, id: e.target.value }))}
                                    className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-200"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                <div className="flex flex-col gap-1">
                                  <span>Alert</span>
                                  <input
                                    type="text"
                                    placeholder="Filter..."
                                    onChange={(e) => setColumnFilters(prev => ({ ...prev, alert: e.target.value }))}
                                    className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-200"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                <div className="flex flex-col gap-1">
                                  <span>Amount</span>
                                  <input
                                    type="text"
                                    placeholder="Filter..."
                                    onChange={(e) => setColumnFilters(prev => ({ ...prev, amount: e.target.value }))}
                                    className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-200"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                <div className="flex flex-col gap-1">
                                  <span>Date</span>
                                  <input
                                    type="text"
                                    placeholder="Filter..."
                                    onChange={(e) => setColumnFilters(prev => ({ ...prev, date: e.target.value }))}
                                    className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-200"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                <div className="flex flex-col gap-1">
                                  <span>Status</span>
                                  <input
                                    type="text"
                                    placeholder="Filter..."
                                    onChange={(e) => setColumnFilters(prev => ({ ...prev, status: e.target.value }))}
                                    className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-200"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {getCurrentPageData().map((row) => (
                              <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3">
                                  <input
                                    type="checkbox"
                                    checked={selectedRows.has(row.id)}
                                    onChange={() => {
                                      const newSelected = new Set(selectedRows);
                                      if (newSelected.has(row.id)) {
                                        newSelected.delete(row.id);
                                      } else {
                                        newSelected.add(row.id);
                                      }
                                      setSelectedRows(newSelected);
                                      setSelectAll(false);
                                    }}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-700">{row.id}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">{row.alert}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">${row.amount}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">{row.date}</td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${row.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                    row.status === 'Reviewed' ? 'bg-blue-100 text-blue-800' :
                                      row.status === 'Flagged' ? 'bg-red-100 text-red-800' :
                                        'bg-green-100 text-green-800'
                                    }`}>
                                    {row.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                                    <Eye className="w-4 h-4 text-gray-600" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      
                      <div className="flex justify-between items-center mt-4">
                        <div className="text-sm text-gray-600">
                          Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, filteredData.length)} of {filteredData.length} entries
                          {selectedRows.size > 0 && ` • ${selectedRows.size} selected`}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                          >
                            Previous
                          </button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`px-3 py-2 rounded-lg transition-colors ${currentPage === page
                                  ? 'bg-blue-600 text-white'
                                  : 'border border-gray-300 hover:bg-gray-50'
                                  }`}
                              >
                                {page}
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div> */}

                    <div className="bg-white rounded-lg shadow-sm p-6">
                      {/* Search and Rows Per Page */}
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-800">Alert Statistics</h2>
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Search..."
                              value={searchQuery}
                              onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                              }}
                              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                            />
                          </div>
                          <select
                            value={rowsPerPage}
                            onChange={(e) => {
                              setRowsPerPage(Number(e.target.value));
                              setCurrentPage(1);
                            }}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                          >
                            <option value={10}>10 rows</option>
                            <option value={20}>20 rows</option>
                            <option value={30}>30 rows</option>
                            <option value={50}>50 rows</option>
                          </select>
                        </div>
                      </div>

                      {/* Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              {/* Select all checkbox */}
                              <th className="px-4 py-3 text-left">
                                <input
                                  type="checkbox"
                                  checked={selectAll}
                                  onChange={handleSelectAll}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                              </th>

                              {/* Dynamic headers + column filters */}
                              {columns.map((col) => (
                                <th
                                  key={col}
                                  className="px-4 py-3 text-left text-sm font-semibold text-gray-700"
                                >
                                  <div className="flex flex-col gap-1">
                                    <span>{col}</span>
                                    <input
                                      type="text"
                                      placeholder="Filter..."
                                      value={columnFilters[col] || ''}
                                      onChange={(e) =>
                                        setColumnFilters((prev) => ({
                                          ...prev,
                                          [col]: e.target.value,
                                        }))
                                      }
                                      className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-200"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                </th>
                              ))}

                              {/* Action column */}
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                Action
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-gray-200">
                            {getCurrentPageData().map((row) => (
                              <tr key={row.ID} className="hover:bg-gray-50 transition-colors">
                                {/* Row checkbox */}
                                <td className="px-4 py-3">
                                  <input
                                    type="checkbox"
                                    checked={selectedRows.some(r => r.ID === r.ID)}
                                    onChange={() => {


                                      setSelectedRows(prev => {
                                        const exists = prev.find(r => r.ID === row.ID);

                                        if (exists) {
                                          return prev.filter(r => r.ID !== row.ID);
                                        } else {
                                          return [...prev, row];   // push full row object
                                        }
                                      });

                                      setSelectAll(false);


                                    }}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                </td>

                                {/* Dynamic cells */}
                                {columns.map((col) => (
                                  <td key={col} className="px-4 py-3 text-sm text-gray-700">
                                    {col === 'STATUS' ? (
                                      <span
                                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${row[col] === 'Pending'
                                          ? 'bg-yellow-100 text-yellow-800'
                                          : row[col] === 'Reviewed'
                                            ? 'bg-blue-100 text-blue-800'
                                            : row[col] === 'Flagged'
                                              ? 'bg-red-100 text-red-800'
                                              : 'bg-green-100 text-green-800'
                                          }`}
                                      >
                                        {row[col]}
                                      </span>
                                    ) : (
                                      String(row[col] ?? '')
                                    )}
                                  </td>
                                ))}

                                {/* Action button */}
                                <td className="px-4 py-3">
                                  <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                                    <Eye className="w-4 h-4 text-gray-600" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      <div className="flex justify-between items-center mt-4">
                        <div className="text-sm text-gray-600">
                          {filteredData.length === 0 ? (
                            'No entries found'
                          ) : (
                            <>
                              Showing {(currentPage - 1) * rowsPerPage + 1} to{' '}
                              {Math.min(currentPage * rowsPerPage, filteredData.length)} of{' '}
                              {filteredData.length} entries
                              {selectedRows.size > 0 && ` • ${selectedRows.size} selected`}
                            </>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                          >
                            Previous
                          </button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`px-3 py-2 rounded-lg transition-colors ${currentPage === page
                                  ? 'bg-blue-600 text-white'
                                  : 'border border-gray-300 hover:bg-gray-50'
                                  }`}
                              >
                                {page}
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() =>
                              setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                            }
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>


                    {/* <p className="text-sm text-gray-600 mb-4">
                      Enter the path of the alert data (.csv, .xls, .xlsx)
                    </p> */}



                    {/* Dropdowns */}
                    {Object.keys(alertDropdowns).length > 0 && (
                      <div className="space-y-3 mt-4">
                        <h4 className="font-semibold text-gray-700 mb-2">Map Columns</h4>
                        {Object.keys(alertDropdowns).map((col) => (
                          <div key={col} className="flex items-center gap-3">
                            <label className="w-32 text-sm font-medium text-gray-700">{col}:</label>
                            <select
                              value={alertDropdowns[col]}
                              onChange={(e) => setAlertDropdowns(prev => ({ ...prev, [col]: e.target.value }))}
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                            >
                              <option value="">Select value</option>
                              {getAvailableValues(col, false).map(val => (
                                <option key={val} value={val}>{val}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                        {alertflag && (
                          <div className="flex items-center gap-2 text-green-600 mt-2">
                            <Check className="w-5 h-5" />
                            <span className="text-sm font-medium">All columns mapped successfully</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}









                {/* Retrain Button */}
                {/* <div className="flex justify-end">
                  <button
                    disabled={!externalflag && !alertflag}
                    onClick={handleSubmit}
                    className={`px-8 py-3 rounded-lg font-semibold transition-all ${externalflag || alertflag
                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                  >
                    Retrain Model
                  </button>
                </div> */}





{/* {showWizard && (
  <div>
    <ModelRetrainingWizard
    showWizard={showWizard}
    apiEndpoint="/api/model-status"
    onBackToConfig={handleBackToConfig}
    model={selectedModel}
  />
  </div>
)} */}

<div className="flex justify-end">
  <button
    disabled={(!externalflag && !alertflag) || isRetraining}
    onClick={handleSubmit}
    className={`px-8 py-3 rounded-lg font-semibold transition-all ${
      (!externalflag && !alertflag) || isRetraining
        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
    }`}
  >
    {isRetraining ? 'Retraining…' : 'Retrain Model'}
  </button>
</div>



{/* {showWizard && (
  <div className="mt-4">
    <ModelRetrainingWizard
      showWizard={showWizard}
      apiEndpoint="/api/retrain/status"
      onBackToConfig={handleBackToConfig}
      onFinished={() => setIsRetraining(false)}   // re-enable button when done
      model={selectedModel}
    />
  </div>
)} */}


{showWizard && (
  <div className="mt-4">
    <ModelRetrainingWizard
      key={retrainKey}   // <<---- THIS REMOUNTS THE WIZARD
      showWizard={showWizard}
      apiEndpoint="/api/retrain/status"
      onBackToConfig={handleBackToConfig}
      onFinished={() => setIsRetraining(false)}
      model={selectedModel}
    />
  </div>
)}

              </div>
            ) : (

              <div >
                {/* Layout: Sidebar + Content */}
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Versions Sidebar */}
                  {selectedModel && (
                    <VersionSidebar
                      modelId={selectedModel.id}
                      onViewStats={handleViewStatsForVersion}
                      onUseVersion={handleUseVersion}
                      userType={userData?.user_type}
                    />
                  )}

                  {/* Main content */}
                  <main className="flex-1">
                    {/* Tabs header */}
                    <div className="bg-white rounded-lg shadow-sm p-2 mb-3 flex gap-2">
                      {selectedModel?.model_type === 'supervised' && (
                        <button
                          className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'supervised' ? 'text-white' : 'text-gray-700'}`}
                          style={{ backgroundColor: activeTab === 'supervised' ? themeColor : '#eef2f7' }}
                          onClick={() => setActiveTab('supervised')}
                        >
                          Supervised
                        </button>
                      )}
                      {selectedModel?.model_type === 'unsupervised' && (
                        <button
                          className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'unsupervised' ? 'text-white' : 'text-gray-700'}`}
                          style={{ backgroundColor: activeTab === 'unsupervised' ? themeColor : '#eef2f7' }}
                          onClick={() => setActiveTab('unsupervised')}
                        >
                          Unsupervised
                        </button>
                      )}
                    </div>

                    {/* Body */}
                    <div className="bg-white rounded-xl shadow p-6">
                      {loadingStats ? (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Loading…
                        </div>
                      ) : currentStats ? (
                        activeTab === 'supervised'
                          ? <SupervisedStats stats={supervisedStats} />
                          : <UnsupervisedStats stats={unsupervisedStats} />
                      ) : (
                        <div className="text-sm text-gray-600">No statistics available. Try “View stats” for a version, or run a calculation.</div>
                      )}
                    </div>
                  </main>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}