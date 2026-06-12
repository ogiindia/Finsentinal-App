import React, { useEffect, useState } from 'react';
import './dashboard.css';
// import { Scatter } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import {
  Chart as ChartJS,
  ArcElement,

  PointElement,
  LinearScale,
  TimeScale,
} from 'chart.js';
import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import './dashboard.css'
import { PieChart, Pie, BarChart, Bar, LineChart, Line, XAxis, YAxis, Legend, Scatter, Tooltip, CartesianGrid, ResponsiveContainer, ScatterChart, Cell } from 'recharts';
import Timelinechart from './Timelinechart';
import {API_BASE_URL, currency_symbol} from '../service/service';
import {
  fetchCustomerData,
  fetchFraudStats,
  fetchTransactionData,
} from "../service/customerService";
// ChartJS.register(ArcElement, PointElement, LinearScale, TimeScale);


const CustomerProfile = ({ analysisData, score , model_type}) => {
  // console.log(analysisData)
  const themeColor = '#012834';
  const [animatedValue, setAnimatedValue] = useState(0);
  const [tableData, setTableData] = useState([]);
  const [speedValue, setSpeedValue] = useState(0);
  const [timelineData, setTimelineData] = useState([]);
  const [loadingTable, setLoadingTable] = useState(true);
  const [loadingSpeed, setLoadingSpeed] = useState(true);
  const [loadingTimeline, setLoadingTimeline] = useState(true);


  // Process data for charts
  // const customer = customerData.customer_data;
  // const stats = fraudStats.overall_statistics;
  // const transactions = transactionData.data || [];

  // // Calculate statistics
  // const avgAmount = transactions.length > 0 
  //   ? transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length 
  //   : 0;

  // const avgFraudScore = transactions.length > 0 
  //   ? transactions.reduce((sum, t) => sum + (t.model_result?.score || 0), 0) / transactions.length 
  //   : 0;

  // // Pie Chart Data - Sent vs Received
  // const sentReceivedData = [
  //   { name: 'Sent', value: fraudStats.sent_transactions.total_analyzed, fill: '#8884d8' },
  //   { name: 'Received', value: fraudStats.received_transactions.total_analyzed, fill: '#82ca9d' }
  // ];

  // // Bar Chart Data - Fraud vs Non-Fraud
  // const fraudData = [
  //   { name: 'Fraud', count: stats.fraud_count, fill: '#ff6b6b' },
  //   { name: 'Non-Fraud', count: stats.non_fraud_count, fill: '#4ecdc4' }
  // ];

  // // Line Chart Data - Transaction Amounts Over Time
  // const timelineData = transactions.map(t => ({
  //   date: new Date(t.timestamp).toLocaleDateString(),
  //   amount: t.amount,
  //   timestamp: t.timestamp
  // })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  // // Histogram Data - Fraud Scores Distribution
  // const fraudScores = transactions.map(t => t.model_result?.score || 0);
  // const scoreRanges = [
  //   { range: '0.0-0.2', count: fraudScores.filter(s => s >= 0 && s < 0.2).length },
  //   { range: '0.2-0.4', count: fraudScores.filter(s => s >= 0.2 && s < 0.4).length },
  //   { range: '0.4-0.6', count: fraudScores.filter(s => s >= 0.4 && s < 0.6).length },
  //   { range: '0.6-0.8', count: fraudScores.filter(s => s >= 0.6 && s < 0.8).length },
  //   { range: '0.8-1.0', count: fraudScores.filter(s => s >= 0.8 && s <= 1.0).length }
  // ];

  // // Scatter Plot Data - Amount vs Fraud Score
  // const scatterData = transactions.map(t => ({
  //   x: t.amount,
  //   y: t.model_result?.score || 0,
  //   type: t.transaction_type
  // }));

  // // Location data for mapping
  // const locationCounts = {};
  // transactions.forEach(t => {
  //   const loc = t.location;
  //   locationCounts[loc] = (locationCounts[loc] || 0) + 1;
  // });
  // const locationData = Object.entries(locationCounts).map(([location, count]) => ({
  //   location,
  //   count
  // }));

  // // Time Series - Transactions per Day
  // const dailyCounts = {};
  // transactions.forEach(t => {
  //   const date = new Date(t.timestamp).toDateString();
  //   dailyCounts[date] = (dailyCounts[date] || 0) + 1;
  // });
  // const dailyData = Object.entries(dailyCounts).map(([date, count]) => ({
  //   date,
  //   count
  // })).sort((a, b) => new Date(a.date) - new Date(b.date));


  const getColor = (value) => {
    if (value <= 10) return '#4caf50'; // Green
    if (value <= 30) return '#ffeb3b'; // Yellow
    if (value <= 60) return '#ff9800'; // Orange
    return '#f44336'; // Red
  };

  const [customerData, setCustomerData] = useState(null);
  const [fraudStats, setFraudStats] = useState(null);
  const [transactionData, setTransactionData] = useState(null);

  useEffect(() => {
  const accountNumber = analysisData?.MATCH_DEBITACCOUNTNUMBER || analysisData?.MATCH_B102_FROM_ACCOUNT_ID;
  if (!accountNumber) return;

  const loadAll = async () => {
    try {
      const [cust, fraud, txn] = await Promise.all([
        fetchCustomerData(accountNumber),
        fetchFraudStats(accountNumber),
        fetchTransactionData(accountNumber),
      ]);

      setCustomerData(cust);
      setFraudStats(fraud);
      setTransactionData(txn);

      if (cust?.customer_data) {
        setTableData(
          Object.entries(cust.customer_data).map(([k, v]) => ({
            name: k,
            value: v,
          }))
        );
      }

      if (Array.isArray(txn?.data)) {
        setTimelineData(txn.data);
      }

      const pct = fraud?.overall_statistics?.fraud_percentage;
      setSpeedValue(pct?.percentage ?? 0);

    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTable(false);
      setLoadingSpeed(false);
      setLoadingTimeline(false);
    }
  };

  loadAll();
}, [analysisData]);
  // useEffect(() => {
  //   const fetchTableData = async () => {

  //     if (analysisData.MATCH_DEBITACCOUNTNUMBER) {
  //       try {
  //         const accountNumber = analysisData?.MATCH_DEBITACCOUNTNUMBER;
  //         const response = await fetch(`${API_BASE_URL}/customer/customer_data?cust_id=${encodeURIComponent(accountNumber)}`, {
  //           method: 'GET',
  //           headers: {
  //             'Content-Type': 'application/json',
  //           },
  //           credentials: 'include',
  //         });

  //         const data = await response.json();
  //         // console.log(data)
  //         setCustomerData(data)
  //         if (data?.customer_data && typeof data.customer_data === 'object') {
  //           // Convert object to array of { name, value }
  //           const formattedData = Object.entries(data.customer_data).map(([key, value]) => ({
  //             name: key,
  //             value: value,
  //           }));
  //           // console.log(formattedData);
  //           setTableData(formattedData);
  //         } else {
  //           console.warn('Unexpected customer_data format:', data);
  //           setTableData([]);
  //         }


  //       } catch (err) {
  //         console.error('Table API error:', err);
  //       } finally {
  //         setLoadingTable(false);
  //       }

  //     } else {
  //       // console.log(analysisData.MATCH_DEBITACCOUNTNUMBER)
  //     }
  //   };
  //   const fetchSpeedData = async () => {
  //     try {
  //       const accountNumber = analysisData?.MATCH_DEBITACCOUNTNUMBER;
  //       const response = await fetch(`${API_BASE_URL}/customer/fraud_statistics?cust_id=${encodeURIComponent(String(accountNumber))}`, {
  //         method: 'GET',
  //         headers: {
  //           'Content-Type': 'application/json',
  //         },
  //         credentials: 'include',
  //       });
  //       const data = await response.json();
  //       // console.log(data);
  //       setFraudStats(data)
  //       const fraudPercentage = data?.overall_statistics?.fraud_percentage;
  //       // console.log(fraudPercentage)

  //       if (typeof fraudPercentage === 'number') {
  //         // setSpeedValue(60);
  //         setSpeedValue(fraudPercentage.percentage);
  //       } else {
  //         console.warn('Invalid fraud_percentage value:', fraudPercentage);
  //         setSpeedValue(0); // fallback
  //       }

  //       // setSpeedValue(data.percentage);
  //     } catch (err) {
  //       console.error('Speed API error:', err);
  //     } finally {
  //       setLoadingSpeed(false);
  //     }
  //   };

  //   // Fetch timeline data
  //   const fetchTimelineData = async () => {
  //     try {
  //       const accountNumber = analysisData?.MATCH_DEBITACCOUNTNUMBER;
  //       const response = await fetch(`${API_BASE_URL}/customer/trans_data?cust_id=${encodeURIComponent(String(accountNumber))}`, {
  //         method: 'GET',
  //         headers: {
  //           'Content-Type': 'application/json',
  //         },
  //         credentials: 'include',
  //       });

  //       const data = await response.json();
  //       // console.log(data);
  //       setTransactionData(data)

  //       if (Array.isArray(data.data)) {
  //         setTimelineData(data.data);
  //       } else {
  //         console.warn('Timeline API "data" field is not an array:', data.data);
  //         setTimelineData([]);
  //       }
  //     } catch (err) {
  //       console.error('Timeline API error:', err);
  //       setTimelineData([]);
  //     } finally {
  //       setLoadingTimeline(false);
  //     }
  //   };
  //   fetchTableData();
  //   fetchSpeedData();
  //   fetchTimelineData();
  // }, [analysisData]);

  // Process data for charts
  const customer = customerData?.customer_data || {};
  const stats = fraudStats?.overall_statistics || {};
  const transactions = transactionData?.data || [];

  // useEffect(() => {
  //   let start = 0;
  //   const end = stats.fraud_percentage;
  //   const duration = 1000;
  //   const stepTime = 20;
  //   const increment = (end - start) / (duration / stepTime);

  //   const interval = setInterval(() => {
  //     start += increment;
  //     if ((increment > 0 && start >= end) || (increment < 0 && start <= end)) {
  //       start = end;
  //       clearInterval(interval);
  //     }
  //     setAnimatedValue(Math.round(start * 10) / 10);
  //   }, stepTime);

  //   return () => clearInterval(interval);
  // }, [stats.fraud_percentage]);


  // useEffect(() => {
  //    const fetchCustomerData = async () => {
  //      if (analysisData?.MATCH_DEBITACCOUNTNUMBER) {
  //        try {
  //          const accountNumber = analysisData.MATCH_DEBITACCOUNTNUMBER;
  //          const response = await fetch(`${API_BASE_URL}/customer/customer_data?cust_id=${encodeURIComponent(accountNumber)}`, {
  //            method: 'GET',
  //            headers: {
  //              'Content-Type': 'application/json',
  //            },
  //            credentials: 'include',
  //          });
  //          const data = await response.json();
  //          setCustomerData(data);
  //        } catch (err) {
  //          console.error('Customer API error:', err);
  //          setCustomerData(null);
  //        } finally {
  //          setLoadingCustomer(false);
  //        }
  //      } else {
  //        setLoadingCustomer(false);
  //      }
  //    };
  //    const fetchFraudStats = async () => {
  //      if (analysisData?.MATCH_DEBITACCOUNTNUMBER) {
  //        try {
  //          const accountNumber = analysisData.MATCH_DEBITACCOUNTNUMBER;
  //          const response = await fetch(`${API_BASE_URL}/customer/fraud_statistics?cust_id=${encodeURIComponent(accountNumber)}`, {
  //            method: 'GET',
  //            headers: {
  //              'Content-Type': 'application/json',
  //            },
  //            credentials: 'include',
  //          });
  //          const data = await response.json();
  //          setFraudStats(data);
  //        } catch (err) {
  //          console.error('Fraud stats API error:', err);
  //          setFraudStats(null);
  //        } finally {
  //          setLoadingFraud(false);
  //        }
  //      } else {
  //        setLoadingFraud(false);
  //      }
  //    };
  //    const fetchTransactionData = async () => {
  //      if (analysisData?.MATCH_DEBITACCOUNTNUMBER) {
  //        try {
  //          const accountNumber = analysisData.MATCH_DEBITACCOUNTNUMBER;
  //          const response = await fetch(`${API_BASE_URL}/customer/trans_data?cust_id=${encodeURIComponent(accountNumber)}`, {
  //            method: 'GET',
  //            headers: {
  //              'Content-Type': 'application/json',
  //            },
  //            credentials: 'include',
  //          });
  //          const data = await response.json();
  //          setTransactionData(data);
  //        } catch (err) {
  //          console.error('Transaction data API error:', err);
  //          setTransactionData(null);
  //        } finally {
  //          setLoadingTransactions(false);
  //        }
  //      } else {
  //        setLoadingTransactions(false);
  //      }
  //    };
  //    fetchCustomerData();
  //    fetchFraudStats();
  //    fetchTransactionData();
  //  }, [analysisData]);
  // Animate fraud percentage when fraudStats is loaded



  // useEffect(() => {
  //   if (fraudStats?.overall_statistics?.fraud_percentage !== undefined) {
  //     let start = 0;
  //     const end = fraudStats.overall_statistics.fraud_percentage;
  //     const duration = 1000;
  //     const stepTime = 20;
  //     const increment = (end - start) / (duration / stepTime);
  //     const interval = setInterval(() => {
  //       start += increment;
  //       if ((increment > 0 && start >= end) || (increment < 0 && start <= end)) {
  //         start = end;
  //         clearInterval(interval);
  //       }
  //       setAnimatedValue(Math.round(start * 10) / 10);
  //     }, stepTime);
  //     return () => clearInterval(interval);
  //   }
  // }, [fraudStats]);
  // Show loading state while any API is still loading
  //  const isLoading = loadingCustomer || loadingFraud || loadingTransactions;

  const isLoading = loadingTable || loadingSpeed || loadingTimeline;
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '400px',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '5px solid #f3f3f3',
          borderTop: '5px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ marginTop: '20px', fontSize: '16px', color: '#666' }}>Loading dashboard data...</p>
        <style>{`
         @keyframes spin {
           0% { transform: rotate(0deg); }
           100% { transform: rotate(360deg); }
         }
       `}</style>
      </div>
    );
  }





  if (!customerData || !fraudStats || !transactionData) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: '10px'
      }}>
        <h2 style={{ color: '#666' }}>No data available</h2>
        <p>Unable to load customer dashboard data. Please check your connection and try again.</p>
      </div>
    );
  }

  // Calculate statistics
  const avgAmount = transactions.length > 0
    ? transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length
    : 0;
  const avgFraudScore = transactions.length > 0
    ? transactions.reduce((sum, t) => sum + (t.model_result?.score || 0), 0) / transactions.length
    : 0;
  // Pie Chart Data - Sent vs Received
  const sentReceivedData = [
    { name: 'Sent', value: fraudStats.sent_transactions?.total_analyzed || 0, fill: '#8884d8' },
    { name: 'Received', value: fraudStats.received_transactions?.total_analyzed || 0, fill: '#82ca9d' }
  ];
  // Bar Chart Data - Fraud vs Non-Fraud
  const fraudData = [
    { name: 'Fraud', count: stats.fraud_count || 0, fill: '#ff6b6b' },
    { name: 'Non-Fraud', count: stats.non_fraud_count || 0, fill: '#4ecdc4' }
  ];
  // Line Chart Data - Transaction Amounts Over Time
  const timelineData1 = transactions.map(t => ({
    date: new Date(t.timestamp).toLocaleDateString(),
    amount: t.amount,
    timestamp: t.timestamp
  })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  // Histogram Data - Fraud Scores Distribution
  const fraudScores = transactions.map(t => t.model_result?.score || 0);
  const scoreRanges = [
    { range: '0.0-0.2', count: fraudScores.filter(s => s >= 0 && s < 0.2).length },
    { range: '0.2-0.4', count: fraudScores.filter(s => s >= 0.2 && s < 0.4).length },
    { range: '0.4-0.6', count: fraudScores.filter(s => s >= 0.4 && s < 0.6).length },
    { range: '0.6-0.8', count: fraudScores.filter(s => s >= 0.6 && s < 0.8).length },
    { range: '0.8-1.0', count: fraudScores.filter(s => s >= 0.8 && s <= 1.0).length }
  ];
  // Scatter Plot Data - Amount vs Fraud Score
  const scatterData = transactions.map(t => ({
    x: t.amount,
    y: t.model_result?.score || 0,
    type: t.transaction_type
  }));
  // Location data for mapping
  const locationCounts = {};
  transactions.forEach(t => {
    const loc = t.location;
    locationCounts[loc] = (locationCounts[loc] || 0) + 1;
  });
  const locationData = Object.entries(locationCounts).map(([location, count]) => ({
    location,
    count
  }));
  // Time Series - Transactions per Day
  const dailyCounts = {};
  transactions.forEach(t => {
    const date = new Date(t.timestamp).toDateString();
    dailyCounts[date] = (dailyCounts[date] || 0) + 1;
  });
  const dailyData = Object.entries(dailyCounts).map(([date, count]) => ({
    date,
    count
  })).sort((a, b) => new Date(a.date) - new Date(b.date));




















  // useEffect(() => {
  //   let start = 0;
  //   const end = speedValue ?? 0;
  //   const duration = 1000;
  //   const stepTime = 20;
  //   const increment = (end - start) / (duration / stepTime);

  //   const interval = setInterval(() => {
  //     start += increment;
  //     if ((increment > 0 && start >= end) || (increment < 0 && start <= end)) {
  //       start = end;
  //       clearInterval(interval);
  //     }
  //     setAnimatedValue(Math.round(start));
  //   }, stepTime);

  //   return () => clearInterval(interval);
  // }, [speedValue]);

  const data = [
    { name: 'Risk', value: animatedValue, fill: getColor(animatedValue) },
  ];






  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading data...</p>
      </div>
    );
  }
  return (
    <div >


      <div className="dashboard-container">

        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '10px',
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>

          <h1 style={{ color: themeColor, marginBottom: '10px' }}>
            Customer Profile Dashboard
          </h1>
          <h2 style={{ color: '#666', marginBottom: '20px' }}>
            {customer.First_Name} {customer.Last_Name}
          </h2>
          {/* Key Statistics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginTop: '20px'
          }}>
            <div style={{ backgroundColor: '#e3f2fd', padding: '15px', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 5px 0', color: themeColor }}>Total Transactions</h3>
              <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#1976d2' }}>
                {stats.total_transactions}
              </p>
            </div>
            <div style={{ backgroundColor: '#e8f5e8', padding: '15px', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 5px 0', color: themeColor }}>Sent Transactions</h3>
              <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#388e3c' }}>
                {fraudStats.sent_transactions?.total_analyzed || 0}
              </p>
            </div>
            <div style={{ backgroundColor: '#fff3e0', padding: '15px', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 5px 0', color: themeColor }}>Received Transactions</h3>
              <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#f57c00' }}>
                {fraudStats.received_transactions?.total_analyzed || 0}
              </p>
            </div>
            <div style={{ backgroundColor: '#ffebee', padding: '15px', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 5px 0', color: themeColor }}>Fraud Percentage</h3>
              <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: getColor(animatedValue) }}>
                {animatedValue.toFixed(1)}%
              </p>
            </div>
            <div style={{ backgroundColor: '#f3e5f5', padding: '15px', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 5px 0', color: themeColor }}>Risk Level</h3>
              <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#7b1fa2' }}>
                {fraudStats.risk_level}
              </p>
            </div>
            <div style={{ backgroundColor: '#e0f2f1', padding: '15px', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 5px 0', color: themeColor }}>Avg Amount</h3>
              <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#00695c' }}>
                {currency_symbol} {avgAmount.toFixed(2)}
              </p>
            </div>
            <div style={{ backgroundColor: '#fce4ec', padding: '15px', borderRadius: '8px' }}>
              <h3 style={{ margin: '0 0 5px 0', color: themeColor }}>Avg Fraud Score</h3>
              <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#c2185b' }}>
                {avgFraudScore.toFixed(3)}
              </p>
            </div>
          </div>
        </div>
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '10px',
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>

          <Timelinechart timelineData={timelineData}
            analysisData={analysisData} score={score} model_type={model_type}/>
        </div>
        {/* <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', backgroundColor: '#f5f5f5' }}> */}
        {/* Header Section */}
















        {/* Charts Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '20px'
        }}>
          {/* Pie Chart - Sent vs Received */}
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '10px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ color: themeColor, marginBottom: '15px' }}>Transaction Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sentReceivedData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sentReceivedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Bar Chart - Fraud vs Non-Fraud */}
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '10px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ color: themeColor, marginBottom: '15px' }}>Fraud vs Non-Fraud</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={fraudData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count">
                  {fraudData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Line Chart - Transaction Amounts Over Time */}
          {/* <div style={{
         backgroundColor: 'white',
         padding: '20px',
         borderRadius: '10px',
         boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
       }}>
<h3 style={{ color: themeColor, marginBottom: '15px' }}>Transaction Amounts Over Time</h3>
<ResponsiveContainer width="100%" height={300}>
<LineChart data={timelineData}>
<CartesianGrid strokeDasharray="3 3" />
<XAxis dataKey="date" />
<YAxis />
<Tooltip />
<Legend />
<Line
               type="monotone"
               dataKey="amount"
               stroke="#8884d8"
               strokeWidth={2}
               dot={{ r: 4 }}
             />
</LineChart>
</ResponsiveContainer>
</div> */}
          {/* Histogram - Fraud Scores Distribution */}
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '10px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ color: themeColor, marginBottom: '15px' }}>Fraud Score Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={scoreRanges}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Scatter Plot - Amount vs Fraud Score */}
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '10px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ color: themeColor, marginBottom: '15px' }}>Amount vs Fraud Score</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart data={scatterData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="x" name="Amount" />
                <YAxis dataKey="y" name="Fraud Score" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter fill="#8884d8" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          {/* Location Distribution */}
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '10px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ color: themeColor, marginBottom: '15px' }}>Transaction Locations</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={locationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="location" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Time Series - Transactions per Day */}
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '10px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ color: themeColor, marginBottom: '15px' }}>Transactions per Day</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#ff7300"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>



















        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4" style={{ color: themeColor }}>
              Customer Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              {tableData.map((item, index) => {
                const display =
                  typeof item.value === 'object'
                    ? JSON.stringify(item.value, null, 0)
                    : String(item.value ?? 'N/A');

                return (
                  <div key={index} className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-600">
                      {item.name.replace(/_/g, ' ')}
                    </span>
                    <span
                      className="text-sm text-gray-900 text-right truncate ml-4"
                      title={display}
                    >
                      {display || 'N/A'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="row">


          {/* <div style={{
          padding: '1rem',
          width: '340px',
          backgroundColor: 'transparent',
          textAlign: 'center',
          position: 'relative',
          border: '2px solid #ccc',
          borderRadius: '12px',
        }}>

          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#003366', marginBottom: '0.5rem' }}>
            Risk
          </div>

          <RadialBarChart
            width={390}
            height={180}
            cx={160}
            cy={170}
            innerRadius={70}
            outerRadius={110}
            startAngle={180}
            endAngle={0}
            data={data}
            style={{ backgroundColor: 'transparent' }}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              tick={{ fill: '#003366', fontSize: 12 }}
              ticks={[0, 25, 50, 75, 100]}
              angleAxisId={0}
            />
            <RadialBar
              minAngle={15}
              background
              clockWise
              dataKey="value"
            />
          </RadialBarChart>

          <div style={{
            fontSize: '1.9rem',
            fontWeight: 'bold',
            color: '#003366',
            marginTop: '-3.2rem',
            marginRight: '-2rem',
            backgroundColor: 'transparent',
          }}>
            {`${animatedValue}%`}
          </div>
        </div> */}
        </div>

        {/* <div className="row timeline-row">
        <h3>Transaction Timeline (Last 6 Months)</h3>
        {timelineData.length > 0 ? (
          <Scatter data={timelineChartData} options={timelineChartOptions} />
        ) : (
          <p></p>
        )}
      </div> */}
      </div>
    </div>
  );
};

export default CustomerProfile;
