import { Activity,  AlertCircle,  AlertTriangle,  ArrowBigLeft,  ArrowDown,  ArrowUp, FileDown  , BarChart3,  Calendar,  PieChart,  Shield,  Sparkles,  TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState , useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_BASE_URL , chatbotFlag , getChatbotFlag, setChatbotFlag } from '../service/service';
import CustomerLinkAnalysis from './CustomerLinkAnalysis';
import CustomerProfile from './CustomerProfile';
import './dashboard.css';
import DynamicWaterfallChart from './DynamicWaterfallChart';
import TornadoChart from './TornadoChart';
import './AnimatedButton.css'
import ChatbotLauncher from '../chatbot/ChatbotLauncher';
// import html2canvas from "html2canvas";
import Timelinechart from './Timelinechart';
import {
  fetchCustomerData,
  fetchFraudStats,
  fetchTransactionData
} from "../service/customerService";

const FeatureImportanceChart = ({ data, title = "Feature Importance Summary" }) => {
  if (!data || data.length === 0) return null;
  // console.log(modelnames)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: '#012834' }}>
        <BarChart3 className="w-5 h-5" />
        {title} ({data.length} Features)
      </h2>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {data.map((feature, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="w-40 text-sm font-medium text-gray-700 truncate">
              {feature.name.replace(/_/g, ' ')}
            </div>
            <div className="flex-1 bg-gray-100 rounded-full h-6 relative">
              <div
                className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500"
                style={{ width: `${feature.scaledPercentage}%` }}
              />
            </div>
            <div className="text-sm font-medium text-gray-600 w-16 text-right">
              {(feature.percentage || 0).toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const DashboardAnalysis = () => {




  
const location = useLocation();
const { rowData, selectedModel } = location.state;
const [customerRowData , setCustomerRowData] = useState(null);
// console.log(selectedModel)
  // const location = useLocation();
  const navigate = useNavigate();
  const [chatbotData, setChatbotData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [isLoading, setIsLoading] = useState(false);

  // const rowData = location.state?.rowData;
  const themeColor = '#012834';

  const resolvedAnalysis = analysisData || location.state?.analysisData || null;
  // const resolvedAnalysis_row = rowData || location.state?.rowData || null;



useEffect(() => {
  if(location.state?.rowData){
    // console.log('-----------------------------')
    setCustomerRowData(location.state.rowData);
  }

},[location.state]);

    const resolvedAnalysis_row = customerRowData;
useEffect(() => {
  console.log('resolvedAnalysis_row changed:', resolvedAnalysis_row);
}, [resolvedAnalysis_row]);


  const customerId =
  rowData?.MATCH_DEBITACCOUNTNUMBER ||
  resolvedAnalysis_row?.MATCH_DEBITACCOUNTNUMBER ||
  analysisData?.customer_id ||
  rowData?.MATCH_B102_FROM_ACCOUNT_ID ||
  null;
 const [customerData, setCustomerData] = useState(null);
 const [dashboardAnalysisData, setDashboardAnalysisData] = useState(null);
const [fraudStatisticsData, setFraudStatisticsData] = useState(null);
const [transactionStats, setTransactionStats] = useState(null);
const [fraudStats, setFraudStats] = useState(null);


// useEffect(() => {
//   if (analysisData) {
//     setCustomerProfileData(analysisData.customer_profile);
//   }
// }, [analysisData]);

const [timelineData, setTimelineData] = useState([]);


const buildRiskFactorsNote = (topRiskFactors = []) => {
  if (!Array.isArray(topRiskFactors) || topRiskFactors.length === 0) {
    return "Top Risk Factors:\nNo significant risk factors identified.";
  }

  const rows = topRiskFactors.map((f, idx) => (
    `${idx + 1}. ${f.feature} | ` +
    `Value: ${f.value ?? "N/A"} | ` +
    `Impact: ${f.impact ?? "N/A"} | ` +
    `Contribution: ${Number(f.contribution_percentage || 0).toFixed(1)}%`
  ));

  return `Top Risk Factors:\n${rows.join("\n")}`;
};


const noteText = buildRiskFactorsNote(
  analysisData?.top_risk_factors
);

const [publishing, setPublishing] = useState(false);

const handlePublish = async () => {
  if (!analysisData || !rowData?.ID) {
    console.error("Missing analysis or alert ID");
    return;
  }

  setPublishing(true);

  try {
    const note = buildRiskFactorsNote(
      analysisData.top_risk_factors
    );

    const payload = {
      ID: rowData.ID,
      ASSIGNEDTO: rowData.ASSIGNEDTO,
      category: rowData.CATEGORYFULLTITLE,
      CLOSEDATE: rowData.CLOSEDATE,
      CLOSEREASON: rowData.CLOSEREASON,
      CREATIONDATE: rowData.CREATIONDATE,
      LEVEL: rowData.LEVEL,
      PRIORITY: rowData.PRIORITY,
      STATUS: rowData.STATUS,
      timestamp: rowData.TIMESTAMP,
      TITLE: rowData.TITLE,
      NOTE: note // ✅ KEY PART
    };

    const res = await fetch(`${API_BASE_URL}/alert/update_alert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`Publish failed: ${res.status}`);
    }

    console.log("✅ Alert updated successfully");

    // OPTIONAL: visual feedback hook
    // toast.success("Risk factors published to alert");

  } catch (err) {
    console.error("❌ Publish error:", err);

    // OPTIONAL
    // toast.error("Failed to publish risk factors");
  } finally {
    setPublishing(false);
  }
};


useEffect(() => {
  if (analysisData?.timeline_scores) {
    setTimelineData(
      analysisData.timeline_scores.map(t => ({
        timestamp: t.timestamp ?? null,
        score: t.score
      }))
    );
  }
}, [analysisData]);

  
// const chatbotRef = useRef();

//   const triggerChatbot = () => {
//     if (chatbotRef.current) {
//       chatbotRef.current.openChatbot();
//     }
//   };


  // const handleIconClick = () => {
  //   setIsLoading(true);
  //   console.log(analysisData)
  //   getsummary(analysisData);
  //   setLoading(false);
  // };

const [shouldFetchSummary, setShouldFetchSummary] = useState(false);

// useEffect(() => {
//   if (shouldFetchSummary && analysisData) {
//     console.log(analysisData);
//     // getsummary(analysisData);
    
//     setIsLoading(false);
//     setShouldFetchSummary(false); // reset flag
//   }
// }, [analysisData, shouldFetchSummary]);

const handleIconClick = () => {
  setIsLoading(true);
  setShouldFetchSummary(true);
};

const hasValue = (v) =>
  v !== null && v !== undefined && v !== "" &&
  !(Array.isArray(v) && v.length === 0);

const safeArray = (arr) => Array.isArray(arr) ? arr : [];



const hasFetched = useRef(false);

useEffect(() => {
  const preload = location.state?.analysisData;
  if (preload) {
    setAnalysisData(preload);
    setError(null);
    setLoading(false);
    return;
  }

  if (rowData && !hasFetched.current) {
    hasFetched.current = true;

    fetchAnalysisData();
  } else if (!rowData) {
    setError('No data provided for analysis');

  }
}, [rowData, location.state?.analysisData]);








useEffect(() => {
  const fetchSummary = async () => {
    if (shouldFetchSummary && analysisData) {
      const system_prompt =
        "Summarize the most important fraud risk factor from the data below in one clear, complete sentence. \n" +
        "Avoid technical terms like 'JSON' or 'feature name'. Use plain language suitable for a banking customer alert.\n" +
        "End your response with <END>\n\n" +
        JSON.stringify(analysisData);

      const start = performance.now();

      try {
        const response = await fetch("http://localhost:8888/analyze_transaction", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            prompt: system_prompt,
            max_tokens: 64,
            temperature: 0.7,
            stop: ["<END>"]
          })
        });

        const result = await response.json();
        console.log("Summary result:", result);
        setChatbotData(result.response);

        const elapsed = ((performance.now() - start) / 1000).toFixed(2);
        // console.log(`⏱️ Time taken: ${elapsed} seconds`);
        setIsLoading(false);
      } catch (error) {
        console.error("❌ Error calling API:", error);
      } finally {
        setIsLoading(false);
        setShouldFetchSummary(false);
      }
    }
  };

  fetchSummary();
}, [analysisData, shouldFetchSummary]);

// const handleIconClick = () => {
//   setIsLoading(true);
//   setShouldFetchSummary(true);
// };










// const captureFrontendImage = async () => {
//   const el = document.getElementById("pdf-capture");
//   if (!el) return null;

//   const canvas = await html2canvas(el, {
//     scale: 2,
//     backgroundColor: "#ffffff",
//     useCORS: true,
//   });

//   return canvas.toDataURL("image/png");
// };

useEffect(() => {
  if (!customerId) return;

  const fetchReportDependencies = async () => {
    try {
      const [custRes, txnRes, fraudRes] = await Promise.all([
        fetchCustomerData(customerId),
        fetchTransactionData(customerId),
        fetchFraudStats(customerId)
      ]);

      setCustomerData(custRes || null);
      setTransactionStats(txnRes || null);
      setFraudStats(fraudRes || null);

      setFraudStatisticsData({
        customer: custRes || {},
        transactions: txnRes || {},
        fraud: fraudRes || {}
      });
    } catch (err) {
      console.error("Failed to load report dependencies:", err);
    }
  };

  fetchReportDependencies();
}, [customerId]);

// const customerId =
//   rowData?.MATCH_DEBITACCOUNTNUMBER ||
//   resolvedAnalysis_row?.MATCH_DEBITACCOUNTNUMBER ||
//   analysisData?.customer_id ||
//   null;

const pdfTheme = "light"; // or wire to a toggle later


const downloadReport = async (theme = pdfTheme) => {
  if (!customerId) return;

  const payload = {
    customer_id: String(customerId),
    theme,
    alert_details: rowData || null,
    dashboard_analysis: dashboardAnalysisData || analysisData || null,
    fraud_statistics: fraudStatisticsData || null,
    timeline: Array.isArray(timelineData) ? timelineData : []
  };

  const response = await fetch(
    `${API_BASE_URL}/report/customer-dashboard`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }
  );

  if (!response.ok) {
    console.error("Failed to generate report");
    return;
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  // ✅ OPEN IN NEW TAB
  window.open(url, "_blank");

  // cleanup later
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};








//   useEffect(() => {
//     const preload = location.state?.analysisData;
//     if (preload) {
//       setAnalysisData(preload);
//       setError(null);
//       setLoading(false);
//       return;
//     }
//     if (rowData) {
//           setIsLoading(true);
//       fetchAnalysisData();
//     } else {
//       setError('No data provided for analysis');
//       setLoading(false);
//     }

// // if (analysisData) {
// //   console.log('insise')
// // console.log(analysisData)
// // // getsummary();
// //   // fetchAnalysisData();
// // }
//     setIsLoading(true);
//   }, [rowData, location.state?.analysisData]);

 
  const getsummary = async (data) => {



// system_prompt = (
//     "Summarize the most important fraud risk factor from the data below in one clear, complete sentence. "
//     "Avoid technical terms like 'JSON' or 'feature name'. Use plain language suitable for a banking customer alert. "
//     "End your response with <END>.\n\n"
//     f"{json.dumps(short_json)}"
// )
 



    // const system_prompt =
    //   "Based on the JSON below, write:\n" +
    //   "1. One complete sentence describing the most impactful fraud risk factor.\n" +
    //   "2. One complete sentence describing a factor that decreases fraud risk.\n" +
    //   "Use only the data provided. End with <END>\n\n" +
    //   JSON.stringify(short_json);



// console.log(data)
const system_prompt =
      "Summarize the most important fraud risk factor from the data below in one clear, complete sentence. \n" +
      "Avoid technical terms like 'JSON' or 'feature name'. Use plain language suitable for a banking customer alert.\n" +
      "End your response with <END>\n\n" +
      JSON.stringify(data);

    const start = performance.now();

    try {
      // const response = await fetch("http://localhost:8060/viswa", {
        const response = await fetch("http://localhost:8060/completion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: system_prompt,
          max_tokens: 64,
          temperature: 0.7,
          stop: ["<END>"]
        })
      });

      const result = await response.json();
     setIsLoading(false);
    //  console.log(result.completion)
     setChatbotData(result.completion);
      const elapsed = ((performance.now() - start) / 1000).toFixed(2);

      // setOutput(`⏱️ Time taken: ${elapsed} seconds\n🧠 Response:\n${result.completion || "No output"}`);
    } catch (error) {
      // setOutput(`❌ Error calling API:\n${error}`);
    } finally {
      // setIsLoading(false);
    }
  };


  const fetchAnalysisData = async () => {
    try {
      setLoading(true);
      setError(null);
  // console.log('use1')
  console.log(selectedModel)
  // console.log(rowData)
      const response = await fetch(`${API_BASE_URL}/dashboard/dash_data_by_model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
           valid: true, 
        model_id: selectedModel?.id,
        transaction_data: rowData
      })

        // model_id : selectedModel.id,
        // transaction_data: rowData
        // transaction_data: JSON.stringify(rowData)
      });

      if (!response.ok) throw new Error(`API call failed: ${response.status}`);

      const data = await response.json();
      // console.log(data)
      setAnalysisData(data);
      setDashboardAnalysisData(data);
      // getsummary(data);
    } catch (err) {
      setError(`Failed to fetch analysis data: ${err.message}`);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };






  // const fetchAnalysisData = async () => {
  //   try {
  //     setLoading(true);
  //     setError(null);
  // console.log('use1')
  // console.log(selectedModel)
  //     const response = await fetch(`${API_BASE_URL}/api/dash_data`, {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       credentials: 'include',
  //       body: JSON.stringify(rowData)
  //     });

  //     if (!response.ok) throw new Error(`API call failed: ${response.status}`);

  //     const data = await response.json();
  //     console.log(data)
  //     setAnalysisData(data);
  //     // getsummary(data);
  //   } catch (err) {
  //     setError(`Failed to fetch analysis data: ${err.message}`);
  //     console.error('Error:', err);
  //   } finally {
  //     setLoading(false);
  //   }
  // };



  const handleBack = () => navigate(-1);

  // Helpers
  const num = (v, d = 0) => {
    const n = typeof v === 'string' ? parseFloat(v) : Number(v);
    return Number.isFinite(n) ? n : d;
  };

  const pick = (obj, keys, fallback = undefined) => {
    for (const k of keys) {
      if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
    }
    return fallback;
  };

  const getStatusColor = (status) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('fraud') || s.includes('high')) return 'bg-red-100 text-red-800 border-red-300';
    if (s.includes('suspicious') || s.includes('medium')) return 'bg-orange-100 text-orange-800 border-orange-300';
    if (s.includes('normal') || s.includes('low')) return 'bg-green-100 text-green-800 border-green-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  // Process feature data
  const afiItems = useMemo(() => {
    const afi = resolvedAnalysis?.all_feature_impacts ||
      resolvedAnalysis?.feature_impacts ||
      resolvedAnalysis?.allFeatureImpacts ||
      null;

    if (!afi) return [];

    const entries = Array.isArray(afi)
      ? afi.map((d) => {
        const name = pick(d, ['name', 'feature', 'field', 'key', 'id'], '');
        return name ? [name, d] : null;
      }).filter(Boolean)
      : Object.entries(afi);

    return entries.map(([name, data]) => {
      const importance = num(pick(data, ['importance', 'score', 'weight', 'abs_shap', 'absImpact'], 0), 0);
      const shapVal = num(pick(data, ['shap_value', 'shap', 'delta', 'value'], 0), 0);
      const pct = pick(data, ['impact_percentage', 'percentage', 'percent', 'contribution_pct'], undefined);
      const pctNum = pct === undefined ? undefined : num(pct, 0);

      return {
        name,
        importance: Math.max(0, importance),
        percentage: pctNum !== undefined ? Math.max(0, pctNum) : undefined,
        shap_value: shapVal,
        value: pick(data, ['value', 'feature_value', 'val'], '')
      };
    });
  }, [resolvedAnalysis]);

  // Feature Importance data
  const importanceData = useMemo(() => {
    if (!afiItems.length) return [];
    const items = afiItems.map((f) => ({
      ...f,
      mag: f.importance || Math.abs(f.shap_value) || num(f.percentage, 0)
    }));
    const sorted = items.sort((a, b) => b.mag - a.mag);
    const maxImp = Math.max(...sorted.map((f) => f.importance || 0), 0.001);
    const maxPct = Math.max(...sorted.map((f) => num(f.percentage, 0)), 0.001);
    const base = maxImp > 0.001 ? 'importance' : 'percentage';

    return sorted.map((f) => {
      const val = base === 'importance' ? f.importance : num(f.percentage, 0);
      const max = base === 'importance' ? maxImp : maxPct;
      const width = val > 0 ? Math.max(2, Math.min(100, (val / max) * 100)) : 1;
      return { ...f, scaledPercentage: width, percentage: num(f.percentage, 0) };
    });
  }, [afiItems]);

  // Tornado data
  const tornadoData = useMemo(() => {
    if (!afiItems.length) return [];
    const allItems = afiItems.map((f) => ({
      name: f.name,
      value: num(f.shap_value, 0),
      isPositive: num(f.shap_value, 0) > 0,
      displayValue: (num(f.shap_value, 0) * 1000).toFixed(2)
    }));
    return allItems.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  }, [afiItems]);

  // Top contributors
  const topContributors = useMemo(() => {
    const provided = resolvedAnalysis?.top_risk_factors ||
      resolvedAnalysis?.top_contributors ||
      resolvedAnalysis?.contributors ||
      null;

    if (Array.isArray(provided) && provided.length) {
      return provided.slice(0, 5).map((it, idx) => {
        const shap = num(pick(it, ['shap_score', 'shap', 'delta'], 0), 0);
        return {
          rank: num(it.rank, idx + 1),
          feature: String(pick(it, ['feature', 'name', 'key'], `Feature ${idx + 1}`)),
          value: pick(it, ['value', 'feature_value'], '—'),
          impact: String(pick(it, ['impact', 'direction'], shap >= 0 ? 'increase' : 'decrease')),
          contribution_percentage: num(pick(it, ['contribution_percentage', 'percentage', 'contributionPercent'], 0), 0)
        };
      });
    }

    if (!afiItems.length) return [];
    const sorted = afiItems
      .slice()
      .sort((a, b) => Math.abs(a.shap_value) - Math.abs(b.shap_value))
      .reverse()
      .slice(0, 5);

    const sumAbs = sorted.reduce((s, f) => s + Math.abs(num(f.shap_value, 0)), 0) || 1;
    return sorted.map((f, i) => ({
      rank: i + 1,
      feature: f.name,
      value: f.value ?? '—',
      impact: num(f.shap_value, 0) >= 0 ? 'increase' : 'decrease',
      contribution_percentage:
        f.percentage !== undefined ? num(f.percentage, 0) : (Math.abs(num(f.shap_value, 0)) / sumAbs) * 100
    }));
  }, [resolvedAnalysis, afiItems]);



const UniqueLoader = () => {
  return (
    <div className="flex justify-center items-center h-20">
      <div className="space-x-2 flex">
        <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
        <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
      </div>
    </div>
  );
};








  const renderOverviewTab = () => {
  if (!resolvedAnalysis || !resolvedAnalysis.transaction_analysis) {
    return (
      <div className="flex justify-center items-center h-20">
        <div className="space-x-2 flex">
          <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce" />
          <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce delay-150" />
          <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce delay-300" />
        </div>
      </div>
    );
  }

  // ✅ SAFE AFTER THIS POINT
  const fraudProb =
    num(resolvedAnalysis.transaction_analysis.fraud_probability_score, 0) * 100;

  const normalProb =
    num(resolvedAnalysis.transaction_analysis.normal_probability_score, 0) * 100;

  const status =
    resolvedAnalysis.transaction_analysis.status || 'Unknown';

  const confidence =
    num(resolvedAnalysis.transaction_analysis.confidence, 0) * 100;

    return (
      <div className="space-y-6">
        {/* Risk Assessment Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2" style={{ color: themeColor }}>
              <Shield className="w-6 h-6" />
              Fraud Risk Assessment
            </h2>
            <span className={`px-4 py-2 rounded-full font-semibold border ${getStatusColor(status)}`}>
              {status}
            </span>
          </div>

          {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-2">Fraud Probability</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                  <div
                    className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${fraudProb}%`,
                      backgroundColor: fraudProb > 50 ? '#EF4444' : fraudProb > 20 ? '#F59E0B' : '#10B981'
                    }}
                  />
                </div>
                <span className="font-bold text-lg">
                  {fraudProb.toFixed(1)}%
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Normal Probability</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                  <div
                    className="absolute top-0 left-0 h-full rounded-full bg-green-500 transition-all duration-500"
                    style={{ width: `${normalProb}%` }}
                  />
                </div>
                <span className="font-bold text-lg text-green-600">
                  {normalProb.toFixed(1)}%
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Confidence Level</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                  <div
                    className="absolute top-0 left-0 h-full rounded-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${confidence}%` }}
                  />
                </div>
                <span className="font-bold text-lg text-blue-600">
                  {confidence.toFixed(1)}%
                </span>
              </div>
            </div>
          </div> */}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Customer ID</h3>
              <Activity className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold" style={{ color: themeColor }}>
              {rowData?.MATCH_DEBITACCOUNTNUMBER || rowData?.MATCH_B102_FROM_ACCOUNT_ID||'N/A'}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Fraud Score</h3>
              <PieChart className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-lg font-bold text-purple-600 truncate">
              {analysisData?.transaction_analysis?.raw_score }
              {/* {analysisData?.transaction_analysis?.raw_score || 'N/A'} */}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Account Risk</h3>
              <AlertCircle className="w-4 h-4 text-orange-500" />
            </div>
            <p className="text-2xl font-bold text-orange-600">
              {rowData?.MATCH_VULNERABILITY || 'NOSET'}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Amount</h3>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-xl font-bold text-green-600">
              {parseInt(rowData?.MATCH_DEBITAMOUNT || rowData?.MATCH_B4_AMOUNT|| 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Top 5 Risk Contributors */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="bg-white rounded-lg flex justify-between items-center p-4">
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: themeColor }}>
            <AlertTriangle className="w-5 h-5" />
            Top 5 Risk Contributors
          </h2>
          <button
            onClick={handlePublish}
            disabled={publishing}
            
className={`px-4 py-2 rounded-lg items-center gap-2 text-white
      ${publishing ? "opacity-70 cursor-not-allowed" : "hover:opacity-90"}`}

            // className={`px-4 py-2 rounded-lg right items-center gap-2 text-white
            //   ${publishing ? "opacity-70 cursor-not-allowed" : "hover:opacity-90"}`}
            style={{ backgroundColor: themeColor }}
          >
            {publishing ? "Publishing..." : "Publish"}
          </button>
              </div>
          {topContributors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {topContributors.map((factor, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500">#{factor.rank}</span>
                    {String(factor.impact || '').toLowerCase().includes('increase') ? (
                      <ArrowDown className="w-4 h-4 text-green-500" />
                    ) : (

                      <ArrowUp className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <h3 className="font-semibold text-sm mb-1 truncate" style={{ color: themeColor }}>
                    {String(factor.feature || '').replace(/_/g, ' ')}
                  </h3>
                  <p className="text-xs text-gray-600 mb-2">Value: {factor.value ?? '—'}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Impact</span>
                    <span className="text-sm font-bold text-blue-600">
                      {num(factor.contribution_percentage, 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">No top contributors data available</div>
          )}
        </div>

        {/* Feature Importance Summary */}
        {importanceData.length > 0 && (
          <FeatureImportanceChart
            data={importanceData}
            title="Feature Importance Summary"
          />
        )}

        {/* Waterfall Chart */}
        <DynamicWaterfallChart analysisData={resolvedAnalysis} />

        {/* Tornado Chart */}
        {/* {tornadoData.length > 0 && (
          <TornadoChart
            data={tornadoData}
            title="SHAP Values Tornado Chart"
          />
        )} */}
      </div>
    );
  };

  const renderDetailsTab = () => {
    if (!rowData) return null;
    // console.log(rowData);
    const entries = Object.entries(rowData || {});
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: themeColor }}>
            Alert Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            {entries.map(([key, value]) => {
              const display = typeof value === 'object' ? JSON.stringify(value, null, 0) : String(value ?? 'N/A');
              return (
                <div key={key} className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">{key.replace(/_/g, ' ')}</span>
                  <span className="text-sm text-gray-900 text-right truncate ml-4" title={display}>
                    {display || 'N/A'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const [graphState, setGraphState] = useState({
    nodes: [
      {
        id: rowData.MATCH_DEBITACCOUNTNUMBER || rowData?.MATCH_B102_FROM_ACCOUNT_ID,
        type: 'Customer',
        label: 'Debit',
        customerId: rowData.MATCH_DEBITACCOUNTNUMBER || rowData?.MATCH_B102_FROM_ACCOUNT_ID,
        score: rowData.MATCH_UNSUP_LABEL_ODDHR,
        xHint: 'left',
        data: {}
      },
      {
        id: rowData.MATCH_BENEFICIARYACCOUNTNUMBER || rowData.MATCH_B103_TO_ACCOUNT_ID || "N/A",
        type: 'Customer',
        label: 'Beneficiary',
        score: rowData.MATCH_UNSUP_LABEL_ODDHR,
        customerId: rowData.MATCH_BENEFICIARYACCOUNTNUMBER || rowData.MATCH_B103_TO_ACCOUNT_ID || "N/A",
        xHint: 'right',
        data: {}
      }
    ],
    links: [
      {
        id: 'link-debit-beneficiary',
        source: rowData.MATCH_DEBITACCOUNTNUMBER|| rowData?.MATCH_B102_FROM_ACCOUNT_ID,
        target: rowData.MATCH_BENEFICIARYACCOUNTNUMBER || rowData.MATCH_B103_TO_ACCOUNT_ID || "N/A",
        type: 'initial',
        styleKey: 'Customer->Customer (initial debit->beneficiary)'
      }
    ]
  });

  const handleGraphChange = (nodes, links) => {
    setGraphState({ nodes, links });
    // console.log(nodes)
    // console.log('Graph updated:', { nodes: nodes.length, links: links.length });
  };

  const handleNodeApiError = (nodeId, error) => {
    console.error(`API error for node ${nodeId}:`, error);
  };

// useEffect(() => {
// fetchAnalysisData();
// });


  useEffect(() => {
  if (activeTab === 'LinkAnalysis') {
    // console.log('LinkAnalysis tab rendered');
  }
}, [activeTab]);

const linkAnalysisContent = useMemo(() => {
  // console.log('Rendering LinkAnalysis tab');
  return (
    <div>
      {/* Replace this with actual Link Analysis content */}
      <CustomerLinkAnalysis
          initialNodes={graphState.nodes}
          initialLinks={graphState.links}
          onGraphChange={handleGraphChange}
          onNodeApiError={handleNodeApiError}
          configurableFields={['FirstName', 'LastName', 'Email', 'DeviceId', 'Phone']}
          linkValues={[
            { linkId: 'link-debit-beneficiary', amount: rowData.MATCH_DEBITAMOUNT ||rowData?.MATCH_B4_AMOUNT, currency: rowData.MATCH_DEBITCURRENCY, date: rowData.TIMESTAMP }
          ]}
        />
    </div>
  );
}, [graphState]);


// Add other dependencies if needed


  const renderLinkAnalysisTab = () => {

        // console.log('callback')
    return (
  
    <div>
      <div className="w-full h-screen">
        <CustomerLinkAnalysis
          initialNodes={graphState.nodes}
          initialLinks={graphState.links}
          onGraphChange={handleGraphChange}
          onNodeApiError={handleNodeApiError}
          configurableFields={['FirstName', 'LastName', 'Email', 'DeviceId', 'Phone']}
          linkValues={[
            { linkId: 'link-debit-beneficiary', amount: rowData.MATCH_DEBITAMOUNT || rowData?.MATCH_B4_AMOUNT,
               currency: rowData.MATCH_DEBITCURRENCY, date: rowData.TIMESTAMP }
          ]}
        />
      </div>
      {/* <CustomerLinkAnalysis initialPayload={resolvedAnalysis_row}/> */}
      {/* <LinkAnalysisGraph  initialPayload={resolvedAnalysis_row}/> */}
      {/* <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4" style={{ color: themeColor }}>
          Link Analysis
        </h2>
        
        <div className="text-gray-500 text-center py-8">
          
          <LinkAnalysisGraph  analysisData={resolvedAnalysis_row}/>
        </div>
      </div> */}
    </div>
    );
  };

  const renderCustomerProfileTab = () => (
    <div>
      {/* <CustomerProfileDashboard /> */}



      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4" style={{ color: themeColor }}>
          Customer Profile
        </h2>
        <div className="text-gray-500 text-center py-8">

          {/* <CustomerProfileCard customerData={sampleCustomer} /> */}

          <CustomerProfile analysisData={customerRowData} score={analysisData.transaction_analysis.raw_score } model_type={analysisData.model_info.model_type}/>
        </div>
      </div>
    </div>
  );

  const renderRawDataTab = () => {
    // console.log('hihb')
    return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4" style={{ color: themeColor }}>
          Original Alert Data
        </h2>
        <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-xs">
          {JSON.stringify(rowData, null, 2)}
        </pre>
      </div>

      {resolvedAnalysis && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: themeColor }}>
            ML Analysis Response
          </h2>
          <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-xs">
            {JSON.stringify(resolvedAnalysis, null, 2)}
          </pre>
        </div>
      )}
    </div>
    );
  };

  // if (loading) {
  //   return (
  //     <div className="min-h-screen bg-gray-50 flex items-center justify-center">
  //       <div className="text-center">
  //         <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: themeColor }} />
  //         <p className="text-gray-600">Analyzing transaction data...</p>
  //       </div>
  //     </div>
  //   );
  // }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <h2 className="text-lg font-semibold text-red-700">Error Loading Analysis</h2>
            </div>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={handleBack}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div >
      {/* Header */}
      {/* <header className="bg-white border-b border-gray-200 top-0 z-40"> */}
        {/* <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" style={{ color: themeColor }} />
              </button>
              <h1 className="text-xl font-semibold" style={{ color: themeColor }}>
                Fraud Detection Analysis
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchAnalysisData}
                className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
                style={{ backgroundColor: themeColor }}
              >
                <BarChart3 className="w-4 h-4" />
                Refresh Analysis
              </button>
            </div>
          </div>
        </div> */}
      {/* </header> */}

      {/* Content */}
      <div className=" mx-auto px-2 py-4">
        {/* Alert Info Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-6">


            <button
                onClick={handleBack}
                className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
                style={{ backgroundColor: themeColor }}
              >
                {/* <Sparkles className="w-4 h-4" /> */}
               Back
              </button>
            {/* <button
              onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowBigLeft className="w-6 h-6" />
              <h1 className="w-6 h-6">Go Back</h1>
            </button> */}

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Alert ID:</span>
              <span className="font-semibold" style={{ color: themeColor }}>
                {rowData?.idAlert || rowData?.ID || 'N/A'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Category:</span>
              <span className="font-semibold text-purple-600">
                {rowData?.CATEGORYFULLTITLE || 'N/A'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Priority:</span>
              <span className="font-semibold text-orange-600">
                {rowData?.PRIORITY || 'NOSET'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {rowData?.CREATIONDATE || rowData?.TIMESTAMP || new Date().toISOString()}
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              {/* <button
                // onClick={getsummary}
                // className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
                 className={`px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 ${chatbotFlag !== 'yes' ? 'glowing' : ''}`}
                  onClick={handleIconClick}
                style={{ backgroundColor: themeColor }}
              >
                <Sparkles className="w-4 h-4" />
                AI Insights
              </button> */}


{/* <button
  className={`relative px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 
    ${chatbotFlag !== 'yes' ? 'glowing' : ''} 
    ${isLoading ? 'loading-animation pulse-glow' : ''}`}
  onClick={handleIconClick}
  style={{ backgroundColor: themeColor }}
>
<Sparkles className="w-4 h-4 sparkle-icon" />
  AI Insights
</button> */}
{/* good */}
<button
  className={`px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 
    ${chatbotFlag !== 'yes' ? 'glowing' : ''} 
    ${isLoading ? 'striped-loading' : ''}`}
  onClick={handleIconClick}
  style={{ backgroundColor: themeColor }}
>
  <Sparkles className="w-4 h-4" />
  AI Insights
</button>
 <button
    className={`px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2`}
    onClick={() => downloadReport("light")}
    style={{ backgroundColor: themeColor }}
  >
    <FileDown   className="w-4 h-4" />
    Download Report
  </button>


{/* <button
  disabled={isLoading}
  className={`px-4 py-2 text-white rounded-lg transition-opacity flex items-center gap-2 
    ${chatbotFlag !== 'yes' ? 'glowing' : ''} 
    ${isLoading ? 'striped-loading opacity-70 cursor-not-allowed' : 'hover:opacity-90'}`}
  onClick={handleIconClick}
  style={{ backgroundColor: themeColor }}
>
  <Sparkles className={`w-4 h-4 ${!isLoading ? 'blinking-icon' : ''}`} />
   AI Insights
</button> */}

{/* <button
  disabled={isLoading}
  className={`px-4 py-2 text-white rounded-lg transition-opacity flex items-center gap-2 
    ${chatbotFlag !== 'yes' ? 'glowing' : ''} 
    ${isLoading ? 'striped-loading opacity-70 cursor-not-allowed' : 'hover:opacity-90'}`}
  onClick={handleIconClick}
  style={{ backgroundColor: themeColor }}
>
  <Sparkles className="w-4 h-4" />
  <span className={isLoading ? 'loading-text' : ''}>
    {isLoading ? 'AI Insights' : 'AI Insights'}
  </span>
</button> */}

            </div>
          </div>
        </div>
         {/* <ChatbotLauncher serviceFlag={isLoading} /> */}

               
{!isLoading && chatbotData && (
  <ChatbotLauncher serviceFlag={true} chatbotPayload={chatbotData} />
)}


        {/* Tabs */}
        {/* <div className="sticky top-5 bg-white z-30 border-b border-gray-200 mb-6"> */}
        <div className="sticky top-5 bg-white z-30 border-b border-gray-200 mb-6">
          <div className="border-b border-gray-200 sticky mb-6">
            <nav className="flex gap-6">
              <button
                onClick={() => setActiveTab('details')}
                className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'details'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                Alert Details
              </button>
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                Risk Analysis
              </button>
              {/* <button
                onClick={() => setActiveTab('raw')}
                className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'raw'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                Raw Data
              </button> */}
              <button
                onClick={() => setActiveTab('cusprofile')}
                className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'cusprofile'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                Customer Profiling
              </button>
              <button
                onClick={() => setActiveTab('LinkAnalysis')}
                className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'LinkAnalysis'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                Link Analysis
              </button>
            </nav>
          </div>
        </div>
       {/* <ChatbotLauncher serviceFlag={isLoading}/> */}


        {/* Tab Content */}
        <div>
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'details' && renderDetailsTab()}
          {activeTab === 'raw' && renderRawDataTab()}
          {activeTab === 'cusprofile' && renderCustomerProfileTab()}
          {activeTab === 'LinkAnalysis' && linkAnalysisContent}
        </div>
      </div>
      <div
  id="pdf-capture"
  style={{
    position: "absolute",
    top: "-9999px",
    width: "1200px",
    background: "#ffffff",
    padding: "24px",
  }}
>
  {/* <CustomerProfile analysisData={resolvedAnalysis_row} /> */}
  {/* <Timelinechart data={timelineData} /> */}
  {/* <FeatureImportanceChart data={importanceData} /> */}
</div>
    </div>
  );
};

export default DashboardAnalysis;