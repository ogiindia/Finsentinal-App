import React, { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import {
  BarChart,
  PieChart,
  LineChart,
  HorizontalBarChart,
  GroupedBarChart,
  StackedBarChart,
  ScatterPlot
} from '../components/ChartComponents';
import { API_BASE_URL } from '../service/service';
import { useLocation } from 'react-router-dom';

const CustomerProfilingPage = ({ themeColor = '#012834' }) => {
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [graphData, setGraphData] = useState({});

  // Tabs
  const [activeTab, setActiveTab] = useState('overview');

  // Customer-specific states
  const [customerList, setCustomerList] = useState([]);
  const [customerListLoading, setCustomerListLoading] = useState(false);
  const [customerListError, setCustomerListError] = useState(null);

  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customerDetails, setCustomerDetails] = useState(null);
  const [customerTrans, setCustomerTrans] = useState(null);
  const [fraudStats, setFraudStats] = useState(null);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerError, setCustomerError] = useState(null);

  // ================= Risk Factors =================
  const [riskData, setRiskData] = useState([]);
  const [riskLoading, setRiskLoading] = useState(false);
  const [riskError, setRiskError] = useState(null);
  const [riskOffset, setRiskOffset] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [riskSearch, setRiskSearch] = useState('');
  const [riskSuggestions, setRiskSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const riskLimit = 100;
  const [riskTotal, setRiskTotal] = useState(0);
  const searchRef = useRef(null);

  const location = useLocation();
  const { customerId, tab } = location.state || {};

  useEffect(() => {
    if (tab === 'customer') {
      setActiveTab('customer');
    }
  }, [tab]);


  useEffect(() => {
    if (customerId) {
      setSelectedCustomer(customerId);
      fetchCustomerProfile(customerId);
    }
  }, [customerId]);

  useEffect(() => {
    if (tab === 'riskfactor') {
      setActiveTab('riskfactor');
      if (customerId) {
        setRiskSearch(customerId);
        fetchRiskStats(0, customerId);
      }
    }
  }, [tab, customerId]);

  useEffect(() => {
    fetchAllData();
    fetchCustomerList();
  }, []);

  const fetchAllData = () => {
    fetchAgeDistribution();
    fetchGenderDistribution();
    fetchIncomeDistribution();
    fetchOccupationDistribution();
    fetchLocationDistribution();
    fetchAccountTypeDistribution();
    fetchTransactionPatterns();
    fetchCustomerSegments();
    fetchAgeGenderDistribution();
    fetchIncomeByOccupation();
    fetchTransactionVolume();
    fetchFraudByLocation();
    fetchTransactionAmountDistribution();
    fetchCustomerAgeIncome();
  };

  const fetchData = async (key, endpoint) => {
    setLoading(prev => ({ ...prev, [key]: true }));
    setErrors(prev => ({ ...prev, [key]: null }));

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      setGraphData(prev => ({ ...prev, [key]: data }));
    } catch (err) {
      console.error(`Error fetching ${key}:`, err);
      setErrors(prev => ({ ...prev, [key]: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const fetchAgeDistribution = () => fetchData('age', '/customer/profiling/age-distribution');
  const fetchGenderDistribution = () => fetchData('gender', '/customer/profiling/gender-distribution');
  const fetchIncomeDistribution = () => fetchData('income', '/customer/profiling/income-distribution');
  const fetchOccupationDistribution = () => fetchData('occupation', '/customer/profiling/occupation-distribution');
  const fetchLocationDistribution = () => fetchData('location', '/customer/profiling/location-distribution');
  const fetchAccountTypeDistribution = () => fetchData('accountType', '/customer/profiling/account-type-distribution');
  const fetchTransactionPatterns = () => fetchData('transactions', '/customer/profiling/transaction-patterns');
  const fetchCustomerSegments = () => fetchData('segments', '/customer/profiling/customer-segments');
  const fetchAgeGenderDistribution = () => fetchData('ageGender', '/customer/profiling/age-gender-distribution');
  const fetchIncomeByOccupation = () => fetchData('incomeOccupation', '/customer/profiling/income-by-occupation');
  const fetchTransactionVolume = () => fetchData('transVolume', '/customer/profiling/transaction-volume');
  const fetchFraudByLocation = () => fetchData('fraudLocation', '/customer/profiling/fraud-by-location');
  const fetchTransactionAmountDistribution = () => fetchData('transAmount', '/customer/profiling/transaction-amount-distribution');
  const fetchCustomerAgeIncome = () => fetchData('ageIncome', '/customer/profiling/customer-age-income');

  // ===================== Customer-specific fetches =====================

  const fetchCustomerList = async () => {
    setCustomerListLoading(true);
    setCustomerListError(null);
    try {
      const resp = await fetch(`${API_BASE_URL}/customer/customer_list`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
      const data = await resp.json();
      setCustomerList(data.customers || []);
    } catch (e) {
      console.error('Error fetching customer list:', e);
      setCustomerListError(e.message);
    } finally {
      setCustomerListLoading(false);
    }
  };

  const fetchCustomerProfile = async (custId) => {
    if (!custId) return;
    setCustomerLoading(true);
    setCustomerError(null);
    setCustomerDetails(null);
    setCustomerTrans(null);
    setFraudStats(null);

    try {
      const [custResp, transResp, fraudResp] = await Promise.all([
        fetch(`${API_BASE_URL}/customer/customer_data?cust_id=${encodeURIComponent(custId)}`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch(`${API_BASE_URL}/customer/trans_data?cust_id=${encodeURIComponent(custId)}`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch(`${API_BASE_URL}/customer/fraud_statistics?cust_id=${encodeURIComponent(custId)}`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        })
      ]);

      if (!custResp.ok) throw new Error(`Customer data error: ${custResp.status}`);
      if (!transResp.ok) throw new Error(`Transaction data error: ${transResp.status}`);
      if (!fraudResp.ok) throw new Error(`Fraud statistics error: ${fraudResp.status}`);

      const custDataJson = await custResp.json();
      const transDataJson = await transResp.json();
      const fraudDataJson = await fraudResp.json();

      setCustomerDetails(custDataJson.customer_data || null);
      setCustomerTrans(transDataJson || null);
      setFraudStats(fraudDataJson || null);

    } catch (e) {
      console.error('Error fetching customer profile:', e);
      setCustomerError(e.message);
    } finally {
      setCustomerLoading(false);
    }
  };

  const handleCustomerChange = (e) => {
    const value = e.target.value;
    setSelectedCustomer(value);
    if (value) {
      fetchCustomerProfile(value);
    }
  };

  // Build transaction timeline for selected customer
  const buildCustomerTimeline = (transData) => {
    if (!transData || !transData.data) return null;
    const countsMap = {};

    transData.data.forEach(tx => {
      if (!tx.timestamp) return;
      const dateStr = String(tx.timestamp).slice(0, 10); // YYYY-MM-DD
      countsMap[dateStr] = (countsMap[dateStr] || 0) + 1;
    });

    const dates = Object.keys(countsMap).sort();
    const counts = dates.map(d => countsMap[d]);

    return { dates, counts };
  };

  const fetchRiskStats = async (offset = 0, search = riskSearch) => {
    setRiskLoading(true);
    setRiskError(null);

    try {
      const resp = await fetch(
        `${API_BASE_URL}/customer/risk_stats?limit=${riskLimit}&offset=${offset}&customer_id=${encodeURIComponent(search)}`,
        {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const data = await resp.json();

      setRiskData(data.data || []);
      setRiskOffset(offset);
      setRiskTotal(data.total || 0);
      setHasNextPage(offset + riskLimit < (data.total || 0));
    } catch (e) {
      setRiskError(e.message);
    } finally {
      setRiskLoading(false);
    }
  };

  const riskColor = (value, type) => {
    if (value == null) return '#6b7280'; // gray for missing

    // ---------------- Volatility ----------------
    if (type === 'volatility') {
      if (value > 0.15) return '#b91c1c';   // RED
      if (value >= 0.1) return '#f59e0b';  // AMBER
      return '#059669';                    // GREEN
    }

    // ---------------- Deviation ----------------
    if (type === 'deviation') {
      if (value > 0.7) return '#b91c1c';   // RED
      if (value >= 0.3) return '#f59e0b';  // AMBER
      return '#059669';                    // GREEN
    }

    // ---------------- Score ----------------
    if (type === 'score') {
      if (value >= 2) return '#991b1b';
      if (value >= 1.5) return '#dc2626';
      if (value > 1) return '#f59e0b';
      if (value > 0.5) return '#10b981'
      return '#047857';
    }

    // ---------------- Probability ----------------
    if (type === 'probability') {
      if (value >= 0.9) return '#991b1b';
      if (value >= 0.75) return '#dc2626';
      if (value > 0.65) return '#f59e0b';
      if (value > 0.3) return '#10b981'
      return '#047857';
    }

    return '#374151';
  };

  const riskColorMap = {
    'VERY HIGH': '#991b1b', // deep red
    'HIGH':      '#dc2626', // red
    'MEDIUM':    '#f59e0b', // amber
    'LOW':       '#10b981', // emerald
    'VERY LOW':  '#047857', // deep green
  };

  const fetchRiskCustomerSuggestions = async (query) => {
    if (!query) {
      setRiskSuggestions([]);
      return;
    }

    try {
      const resp = await fetch(
        `${API_BASE_URL}/customer/risk_customer_ids?q=${encodeURIComponent(query)}`,
        {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (!resp.ok) throw new Error('Suggestion fetch failed');

      const data = await resp.json();
      setRiskSuggestions(data.customers || []);
    } catch (e) {
      console.error(e);
    }
  };

  const customerTimeline = buildCustomerTimeline(customerTrans);

  // Fraud chart data with epsilon fix for 0-slice issue
  let fraudChartData = null;
  if (fraudStats && fraudStats.overall_statistics) {
    const fraudCount = fraudStats.overall_statistics.fraud_count || 0;
    const nonFraudCount = fraudStats.overall_statistics.non_fraud_count || 0;

    const rawValues = [fraudCount, nonFraudCount];
    const total = rawValues.reduce((a, b) => a + b, 0);

    if (total > 0) {
      const epsilon = total * 0.00001;
      const safeValues = rawValues.map(v => (v === 0 ? epsilon : v));
      fraudChartData = {
        labels: ['Fraud', 'Non Fraud'],
        values: safeValues
      };
    }
  }

  // ===================== ChartCard (scroll-safe) =====================

  const cardBaseStyle = {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '0.5rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    minHeight: '400px',
    gridColumn: 'span 1',
    minWidth: 0 // important so grid children don't force overflow
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const ChartCard = ({ title, children, isLoading, error, onRetry, span = 1 }) => {
    const styleWithSpan = { ...cardBaseStyle, gridColumn: `span ${span}` };

    if (isLoading) {
      return (
        <div style={styleWithSpan}>
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem'
            }}
          >
            <Loader2 size={32} color={themeColor} style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Loading...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div style={styleWithSpan}>
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '1rem'
            }}
          >
            <AlertCircle size={32} color="#ef4444" style={{ marginBottom: '0.5rem' }} />
            <p style={{ color: '#991b1b', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: themeColor,
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                <RefreshCw size={14} />
                Retry
              </button>
            )}
          </div>
        </div>
      );
    }

    // Normal content – simple scrollable inner wrapper
    return (
      <div style={styleWithSpan}>
        <div
          style={{
            width: '100%',
            height: '100%',
            overflowX: 'auto',
            overflowY: 'hidden'
          }}
        >
          {children}
        </div>
      </div>
    );
  };

  const allLoading = Object.values(loading).every(val => val === true);
  const currentPage = Math.floor(riskOffset / riskLimit) + 1;
  const totalPages =
    riskTotal > 0 ? Math.ceil(riskTotal / riskLimit) : 0;


    useEffect(() => {
  console.log('riskTotal:', riskTotal);
}, [riskTotal]);
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        overflowX: 'hidden' // prevent page-level horizontal scroll snap
      }}
    >
      <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '2rem' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            marginBottom: '2rem',
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem'
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: '2rem',
                  fontWeight: '700',
                  color: themeColor,
                  marginBottom: '0.25rem'
                }}
              >
                U-Print: Customer Profiling Fingerprints
              </h1>
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                Comprehensive insights into customer demographics and behavior
              </p>
            </div>
            {/* <button
              onClick={fetchAllData}
              disabled={allLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: themeColor,
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.375rem',
                border: 'none',
                cursor: allLoading ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                opacity: allLoading ? 0.6 : 1,
                transition: 'opacity 0.2s'
              }}
            >
              <RefreshCw size={16} />
              Refresh All
            </button> */}
          </div>

          {/* Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              borderBottom: '1px solid #e5e7eb',
              marginTop: '0.5rem'
            }}
          >
            <button
              onClick={() => setActiveTab('overview')}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderBottom:
                  activeTab === 'overview' ? `2px solid ${themeColor}` : '2px solid transparent',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: activeTab === 'overview' ? '600' : '500',
                color: activeTab === 'overview' ? themeColor : '#6b7280'
              }}
            >
              Overall Profiling
            </button>
            <button
              onClick={() => setActiveTab('customer')}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderBottom:
                  activeTab === 'customer' ? `2px solid ${themeColor}` : '2px solid transparent',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: activeTab === 'customer' ? '600' : '500',
                color: activeTab === 'customer' ? themeColor : '#6b7280'
              }}
            >
              Customer Drill-down
            </button>
            <button
              onClick={() => {
                setActiveTab('riskfactor');
                fetchRiskStats(0);
              }}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                borderBottom:
                  activeTab === 'riskfactor'
                    ? `2px solid ${themeColor}`
                    : '2px solid transparent',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: activeTab === 'riskfactor' ? '600' : '500',
                color: activeTab === 'riskfactor' ? themeColor : '#6b7280'
              }}
            >
              Risk Factors
            </button>
          </div>
        </div>

        {/* ================= TAB: OVERVIEW ================= */}
        {activeTab === 'overview' && (
          <>
            {/* Demographics Overview Section */}
            <div style={{ marginBottom: '2rem' }}>
              <h2
                style={{
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '1rem',
                  paddingLeft: '0.5rem',
                  borderLeft: `4px solid ${themeColor}`
                }}
              >
                Demographics Overview
              </h2>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: '1.5rem'
                }}
              >
                <ChartCard
                  title="Age Distribution"
                  isLoading={loading.age}
                  error={errors.age}
                  onRetry={fetchAgeDistribution}
                >
                  {graphData.age && (
                    <BarChart data={graphData.age} title="Age Distribution" color="#6366f1" />
                  )}
                </ChartCard>

                <ChartCard
                  title="Gender Distribution"
                  isLoading={loading.gender}
                  error={errors.gender}
                  onRetry={fetchGenderDistribution}
                >
                  {graphData.gender && (
                    <PieChart
                      data={graphData.gender}
                      title="Gender Distribution"
                      colors={['#3b82f6', '#ec4899', '#8b5cf6']}
                    />
                  )}
                </ChartCard>

                <ChartCard
                  title="Customer Segments"
                  isLoading={loading.segments}
                  error={errors.segments}
                  onRetry={fetchCustomerSegments}
                >
                  {graphData.segments && (
                    <PieChart
                      data={graphData.segments}
                      title="Customer Segments"
                      colors={['#10b981', '#f59e0b', '#ef4444']}
                    />
                  )}
                </ChartCard>
              </div>
            </div>

            {/* Income & Occupation Section */}
            <div style={{ marginBottom: '2rem' }}>
              <h2
                style={{
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '1rem',
                  paddingLeft: '0.5rem',
                  borderLeft: `4px solid ${themeColor}`
                }}
              >
                Income & Occupation Analysis
              </h2>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '1.5rem'
                }}
              >
                <ChartCard
                  title="Income Distribution"
                  isLoading={loading.income}
                  error={errors.income}
                  onRetry={fetchIncomeDistribution}
                >
                  {graphData.income && (
                    <BarChart data={graphData.income} title="Income Distribution" color="#10b981" />
                  )}
                </ChartCard>

                <ChartCard
                  title="Average Income by Occupation"
                  isLoading={loading.incomeOccupation}
                  error={errors.incomeOccupation}
                  onRetry={fetchIncomeByOccupation}
                >
                  {graphData.incomeOccupation && (
                    <HorizontalBarChart
                      data={graphData.incomeOccupation}
                      title="Average Income by Occupation"
                      color="#f59e0b"
                    />
                  )}
                </ChartCard>

                <ChartCard
                  title="Top Occupations"
                  isLoading={loading.occupation}
                  error={errors.occupation}
                  onRetry={fetchOccupationDistribution}
                >
                  {graphData.occupation && (
                    <HorizontalBarChart
                      data={graphData.occupation}
                      title="Top Occupations"
                      color="#8b5cf6"
                    />
                  )}
                </ChartCard>

                <ChartCard
                  title="Age vs Income Correlation"
                  isLoading={loading.ageIncome}
                  error={errors.ageIncome}
                  onRetry={fetchCustomerAgeIncome}
                >
                  {graphData.ageIncome && (
                    <ScatterPlot
                      data={graphData.ageIncome}
                      title="Age vs Income"
                      color="#ec4899"
                    />
                  )}
                </ChartCard>
              </div>
            </div>

            {/* Geographic & Account Section */}
            <div style={{ marginBottom: '2rem' }}>
              <h2
                style={{
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '1rem',
                  paddingLeft: '0.5rem',
                  borderLeft: `4px solid ${themeColor}`
                }}
              >
                Geographic & Account Details
              </h2>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '1.5rem'
                }}
              >
                <ChartCard
                  title="Top Locations"
                  isLoading={loading.location}
                  error={errors.location}
                  onRetry={fetchLocationDistribution}
                >
                  {graphData.location && (
                    <HorizontalBarChart
                      data={graphData.location}
                      title="Top Locations"
                      color="#14b8a6"
                    />
                  )}
                </ChartCard>

                <ChartCard
                  title="Account Types"
                  isLoading={loading.accountType}
                  error={errors.accountType}
                  onRetry={fetchAccountTypeDistribution}
                >
                  {graphData.accountType && (
                    <PieChart
                      data={graphData.accountType}
                      title="Account Type Distribution"
                      colors={['#6366f1', '#8b5cf6', '#ec4899']}
                    />
                  )}
                </ChartCard>
              </div>
            </div>

            {/* Advanced Analytics Section */}
            <div style={{ marginBottom: '2rem' }}>
              <h2
                style={{
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '1rem',
                  paddingLeft: '0.5rem',
                  borderLeft: `4px solid ${themeColor}`
                }}
              >
                Advanced Analytics
              </h2>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '1.5rem'
                }}
              >
                <ChartCard
                  title="Age & Gender Distribution"
                  isLoading={loading.ageGender}
                  error={errors.ageGender}
                  onRetry={fetchAgeGenderDistribution}
                  span={2}
                >
                  {graphData.ageGender && (
                    <GroupedBarChart
                      data={graphData.ageGender}
                      title="Age & Gender Distribution"
                      colors={['#3b82f6', '#ec4899']}
                    />
                  )}
                </ChartCard>

                <ChartCard
                  title="Fraud Detection by Location"
                  isLoading={loading.fraudLocation}
                  error={errors.fraudLocation}
                  onRetry={fetchFraudByLocation}
                  span={2}
                >
                  {graphData.fraudLocation && (
                    <StackedBarChart
                      data={graphData.fraudLocation}
                      title="Fraud vs Normal Transactions by Location"
                      colors={['#10b981', '#ef4444']}
                    />
                  )}
                </ChartCard>
              </div>
            </div>

            {/* Transaction Analytics Section */}
            <div style={{ marginBottom: '2rem' }}>
              <h2
                style={{
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '1rem',
                  paddingLeft: '0.5rem',
                  borderLeft: `4px solid ${themeColor}`
                }}
              >
                Transaction Analytics
              </h2>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '1.5rem'
                }}
              >
                <ChartCard
                  title="Daily Transaction Patterns"
                  isLoading={loading.transactions}
                  error={errors.transactions}
                  onRetry={fetchTransactionPatterns}
                >
                  {graphData.transactions && (
                    <LineChart
                      data={graphData.transactions}
                      title="Daily Transactions (Last 30 Days)"
                      color="#6366f1"
                    />
                  )}
                </ChartCard>

                <ChartCard
                  title="Hourly Transaction Volume"
                  isLoading={loading.transVolume}
                  error={errors.transVolume}
                  onRetry={fetchTransactionVolume}
                >
                  {graphData.transVolume && (
                    <LineChart
                      data={{
                        dates: graphData.transVolume.hours,
                        counts: graphData.transVolume.counts
                      }}
                      title="Transaction Volume by Hour"
                      color="#f59e0b"
                    />
                  )}
                </ChartCard>

                <ChartCard
                  title="Transaction Amount Distribution"
                  isLoading={loading.transAmount}
                  error={errors.transAmount}
                  onRetry={fetchTransactionAmountDistribution}
                  span={2}
                >
                  {graphData.transAmount && (
                    <BarChart
                      data={graphData.transAmount}
                      title="Transaction Amount Ranges"
                      color="#14b8a6"
                    />
                  )}
                </ChartCard>
              </div>
            </div>
          </>
        )}

        {/* ================= TAB: CUSTOMER DRILL-DOWN ================= */}
        {activeTab === 'customer' && (
          <div style={{ marginBottom: '2rem' }}>
            <h2
              style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '1rem',
                paddingLeft: '0.5rem',
                borderLeft: `4px solid ${themeColor}`
              }}
            >
              Customer Specific Insights
            </h2>

            {/* Customer Selector */}
            <div
              style={{
                backgroundColor: 'white',
                padding: '1rem 1.5rem',
                borderRadius: '0.5rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap'
              }}
            >
              <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                Select Customer:
              </label>
              <select
                value={selectedCustomer}
                onChange={handleCustomerChange}
                disabled={customerListLoading}
                style={{
                  minWidth: '250px',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #d1d5db',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              >
                <option value="">-- Choose Customer --</option>
                {customerList.map((cust) => (
                  <option key={cust} value={cust}>
                    {cust}
                  </option>
                ))}
              </select>
              {customerListLoading && (
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Loading customers...</span>
              )}
              {customerListError && (
                <span style={{ fontSize: '0.75rem', color: '#b91c1c' }}>{customerListError}</span>
              )}
            </div>

            {/* Customer Loading / Error */}
            {customerLoading && (
              <div
                style={{
                  backgroundColor: 'white',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
              >
                <Loader2 size={20} color={themeColor} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>
                  Fetching customer data...
                </span>
              </div>
            )}

            {customerError && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
              >
                <AlertCircle size={20} color="#b91c1c" />
                <span style={{ fontSize: '0.875rem', color: '#b91c1c' }}>{customerError}</span>
              </div>
            )}

            {(customerDetails || customerTrans || fraudStats) && (
              <>
                {/* Top summary: Customer info + Fraud percentage + Timeline chart */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1.5fr',
                    gap: '1.5rem',
                    marginBottom: '2rem'
                  }}
                >
                  {/* Customer Details Table */}
                  <div
                    style={{
                      backgroundColor: 'white',
                      padding: '1.25rem',
                      borderRadius: '0.5rem',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      overflow: 'hidden'
                    }}
                  >
                    <h3
                      style={{
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: '#111827',
                        marginBottom: '0.75rem'
                      }}
                    >
                      Customer Details
                    </h3>
                    {customerDetails ? (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <tbody>
                          {[
                            ['Customer ID', customerDetails.customer_id],
                            ['Name', customerDetails.full_name],
                            ['Gender', customerDetails.gender],
                            ['Age', customerDetails.age],
                            ['Email', customerDetails.email],
                            ['Phone', customerDetails.phone],
                            ['State', customerDetails.state],
                            ['Address', customerDetails.address],
                            ['Income', customerDetails.income],
                            ['Current Balance', customerDetails.current_balance],
                            ['Account Holding', customerDetails.account_holding],
                            ['Balance Status', customerDetails.balance_status],
                            ['Has Loan', customerDetails.has_loan ? 'Yes' : 'No'],
                            ['Orders', customerDetails.orders],
                            ['Spent', customerDetails.spent],
                            ['Vulnerability', customerDetails.vulnerability],
                            ['Risk (Vulnerable)', customerDetails.is_vulnerable ? 'Yes' : 'No']
                          ].map(([label, value]) => (
                            <tr key={label}>
                              <td
                                style={{
                                  padding: '0.35rem 0.5rem',
                                  fontWeight: '500',
                                  color: '#4b5563',
                                  width: '45%'
                                }}
                              >
                                {label}
                              </td>
                              <td style={{ padding: '0.35rem 0.5rem', color: '#111827' }}>
                                {value !== null && value !== undefined ? String(value) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        No customer details available.
                      </p>
                    )}
                  </div>

                  {/* Fraud percentage chart */}
                  <div
                    style={{
                      backgroundColor: 'white',
                      padding: '1.25rem',
                      borderRadius: '0.5rem',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '260px'
                    }}
                  >
                    <h3
                      style={{
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: '#111827',
                        marginBottom: '0.75rem'
                      }}
                    >
                      Fraud Percentage
                    </h3>
                    {fraudStats && fraudChartData ? (
                      <>
                        <PieChart
                          data={fraudChartData}
                          title="Fraud vs Non-Fraud"
                          colors={['#ef4444', '#10b981']}
                        />
                        <div
                          style={{
                            marginTop: '0.75rem',
                            fontSize: '0.875rem',
                            color: '#4b5563',
                            textAlign: 'center'
                          }}
                        >
                          <div>
                            Overall Fraud:{' '}
                            <strong>{fraudStats.overall_statistics.fraud_percentage}%</strong>
                          </div>
                          <div>
                            Risk Level: <strong>{fraudStats.risk_level}</strong>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        No fraud statistics available.
                      </p>
                    )}
                  </div>

                  {/* Customer Transaction Timeline */}
                  <div
                    style={{
                      backgroundColor: 'white',
                      padding: '1.25rem',
                      borderRadius: '0.5rem',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      minHeight: '260px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    <h3
                      style={{
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: '#111827',
                        marginBottom: '0.75rem'
                      }}
                    >
                      Transaction Timeline
                    </h3>
                    {customerTimeline ? (
                      <LineChart
                        data={customerTimeline}
                        title="Transactions over Time"
                        color="#6366f1"
                      />
                    ) : (
                      <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        No transaction timeline data available.
                      </p>
                    )}
                  </div>
                </div>

                {/* Transactions Table */}
                <div
                  style={{
                    backgroundColor: 'white',
                    padding: '1.25rem',
                    borderRadius: '0.5rem',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                >
                  <h3
                    style={{
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#111827',
                      marginBottom: '0.75rem'
                    }}
                  >
                    Transactions (Latest 10)
                  </h3>
                  {customerTrans && customerTrans.data && customerTrans.data.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table
                        style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}
                      >
                        <thead>
                          <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Txn ID</th>
                            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Timestamp</th>
                            <th style={{ textAlign: 'right', padding: '0.5rem' }}>Amount</th>
                            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Type</th>
                            <th style={{ textAlign: 'left', padding: '0.5rem' }}>To Customer</th>
                            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Location</th>
                            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Fraud</th>
                            <th style={{ textAlign: 'right', padding: '0.5rem' }}>Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customerTrans.data
                            .slice()
                            .sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1))
                            .slice(0, 10)
                            .map(tx => (
                              <tr
                                key={tx.transaction_id}
                                style={{ borderBottom: '1px solid #f3f4f6' }}
                              >
                                <td style={{ padding: '0.4rem 0.5rem', color: '#111827' }}>
                                  {tx.transaction_id}
                                </td>
                                <td style={{ padding: '0.4rem 0.5rem', color: '#4b5563' }}>
                                  {String(tx.timestamp)}
                                </td>
                                <td
                                  style={{
                                    padding: '0.4rem 0.5rem',
                                    textAlign: 'right',
                                    color: '#111827'
                                  }}
                                >
                                  {tx.amount}
                                </td>
                                <td style={{ padding: '0.4rem 0.5rem', color: '#4b5563' }}>
                                  {tx.transaction_type}
                                </td>
                                <td style={{ padding: '0.4rem 0.5rem', color: '#4b5563' }}>
                                  {tx.to_customer_id}
                                </td>
                                <td style={{ padding: '0.4rem 0.5rem', color: '#4b5563' }}>
                                  {tx.location}
                                </td>
                                <td
                                  style={{
                                    padding: '0.4rem 0.5rem',
                                    color:
                                      tx.model_result && tx.model_result.fraud === -1
                                        ? '#b91c1c'
                                        : '#059669'
                                  }}
                                >
                                  {tx.model_result
                                    ? tx.model_result.fraud === -1
                                      ? 'Fraud'
                                      : 'Normal'
                                    : '-'}
                                </td>
                                <td
                                  style={{
                                    padding: '0.4rem 0.5rem',
                                    textAlign: 'right',
                                    color: '#111827'
                                  }}
                                >
                                  {tx.model_result && tx.model_result.score != null
                                    ? Number(tx.model_result.score).toFixed(3)
                                    : '-'}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      No transactions available for this customer.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* =============TAB: RISK FACTOR ============*/}
        {activeTab === 'riskfactor' && (
        <div>
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '1rem',
              paddingLeft: '0.5rem',
              borderLeft: `4px solid ${themeColor}`
            }}
          >
            Customer Risk Factors
          </h2>
          <div
            ref={searchRef}
            style={{ marginBottom: '1rem', position: 'relative', maxWidth: '300px' }}
          >
            <input
              type="text"
              placeholder="Search Customer ID"
              value={riskSearch}
              onChange={(e) => {
                const val = e.target.value;
                setRiskSearch(val);
                fetchRiskCustomerSuggestions(val);
                fetchRiskStats(0, val);
                setShowSuggestions(true);
              }}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid #d1d5db',
                fontSize: '0.875rem'
              }}
            />

            {showSuggestions && riskSuggestions.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.375rem',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  zIndex: 10
                }}
              >
                {riskSuggestions.map(cust => (
                  <div
                    key={cust}
                    onClick={() => {
                      setRiskSearch(cust);
                      setShowSuggestions(false);
                      fetchRiskStats(0, cust);
                    }}
                    style={{
                      padding: '0.5rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {cust}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              backgroundColor: 'white',
              padding: '1.25rem',
              borderRadius: '0.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}
          >
            {riskLoading && <p>Loading risk data...</p>}
            {riskError && <p style={{ color: '#b91c1c' }}>{riskError}</p>}

            {!riskLoading && riskData.length > 0 && (
              <div style={{ overflowX: 'auto',  textAlign: 'center' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.8rem'
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      {[
                        'Customer ID',
                        'Weekly Avg',
                        'Monthly Avg',
                        'Weekday',
                        'Hour',
                        'Weekly Low',
                        'Weekly High',
                        'Foreign Txn',
                        'Volatility',
                        'Deviation',
                        'Is Mule',
                        'Foreign Risk',
                        'Risk Score',
                        'Risk Probability',
                        'Risk Level'
                      ].map(h => (
                        <th
                          key={h}
                          style={{
                            padding: '0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#374151',
                            whiteSpace: 'nowrap',
                            textAlign: 'right'
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>




                  <tbody>
                    {riskData.map(row => (
                      <tr
                        key={row.customer_id}
                        style={{ borderBottom: '1px solid #f3f4f6' }}
                      >
                        <td style={{ padding: '0.4rem', fontWeight: 500 }}>
                          {row.customer_id}
                        </td>

                        <td style={{ padding: '0.4rem', textAlign: 'right' }}>
                          {row.weekly_avg_debit_amount?.toFixed(2)}
                        </td>

                        <td style={{ padding: '0.4rem', textAlign: 'right' }}>
                          {row.monthly_avg_debit_amount?.toFixed(2)}
                        </td>

                        <td style={{ padding: '0.4rem', textAlign: 'right' }}>
                          {row.most_active_weekday}
                        </td>

                        <td style={{ padding: '0.4rem', textAlign: 'right' }}>
                          {row.most_active_hour}
                        </td>

                        <td style={{ padding: '0.4rem', textAlign: 'right' }}>
                          {row.weekly_low_avg_amount?.toFixed(2)}
                        </td>

                        <td style={{ padding: '0.4rem', textAlign: 'right' }}>
                          {row.weekly_high_avg_amount?.toFixed(2)}
                        </td>

                        <td
                          style={{
                            padding: '0.4rem',
                            textAlign: 'center',
                            color: row.foreign_transaction_flag === 1 ? '#b91c1c' : '#059669'
                          }}
                        >
                          {row.foreign_transaction_flag}
                        </td>

                        <td
                          style={{
                            padding: '0.4rem',
                            color: riskColor(row.volatility_risk, 'volatility'),
                            fontWeight: 600
                          }}
                        >
                          {row.volatility_risk?.toFixed(3)}
                        </td>

                        <td
                          style={{
                            padding: '0.4rem',
                            color: riskColor(row.deviation_risk, 'deviation'),
                            fontWeight: 600
                          }}
                        >
                          {row.deviation_risk?.toFixed(3)}
                        </td>

                        <td style={{ padding: '0.4rem', color: row.time_risk === 1 ? '#b91c1c' : '#059669' }}>
                          {row.time_risk}
                        </td>

                        <td style={{ padding: '0.4rem', color: riskColor(row.foreign_risk) }}>
                          {row.foreign_risk}
                        </td>

                        <td
                          style={{
                            padding: '0.4rem',
                            fontWeight: 600,
                            color: riskColor(row.risk_score, 'score')
                          }}
                        >
                          {row.risk_score?.toFixed(3)}
                        </td>

                        <td
                          style={{
                            padding: '0.4rem',
                            fontWeight: 600,
                            color: riskColor(row.risk_probability, 'probability')
                          }}
                        >
                          {row.risk_probability?.toFixed(3)}
                        </td>
                        <td
                          style={{
                            padding: '0.4rem',
                            fontWeight: 700,
                            color: riskColorMap[row.risk_level] ?? '#374151', // fallback: gray-700
                          }}
                        >
                          {row.risk_level}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Pagination */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '1rem'
                  }}
                >
                  <button
                    disabled={riskOffset + riskLimit >= riskTotal}
                    onClick={() => fetchRiskStats(Math.max(0, riskOffset - riskLimit))}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '0.375rem',
                      border: '1px solid #d1d5db',
                      backgroundColor: riskOffset === 0 ? '#f3f4f6' : 'white',
                      cursor: riskOffset === 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Previous
                  </button>

                  {/* <span
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: '#374151'
                    }}
                  >
                    Page {currentPage} of {totalPages}
                  </span> */}
                  <span
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: '#374151'
                    }}
                  >
                    {riskTotal === 0
                      ? 'No records'
                      : totalPages === 1
                      ? `Showing all ${riskTotal} records`
                      : `Page ${currentPage} of ${totalPages}`}
                  </span>

                  <button
                    disabled={riskOffset + riskLimit >= riskTotal}
                    onClick={() => fetchRiskStats(riskOffset + riskLimit)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '0.375rem',
                      border: '1px solid #d1d5db',
                      backgroundColor: !hasNextPage ? '#f3f4f6' : 'white',
                      cursor: !hasNextPage ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default CustomerProfilingPage;
