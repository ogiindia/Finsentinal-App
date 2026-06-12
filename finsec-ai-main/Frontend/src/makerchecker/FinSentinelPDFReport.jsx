import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  PDFDownloadLink,
  Font,
} from '@react-pdf/renderer';

// Register fonts (optional - using default fonts)
// Font.register({ family: 'Roboto', src: '/fonts/Roboto-Regular.ttf' });

// Styles
const styles = StyleSheet.create({
  page: {
    position: 'relative',
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.1,
  },
  header: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#1a365d',
    borderBottomStyle: 'solid',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a365d',
    textAlign: 'center',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#4a5568',
    textAlign: 'center',
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    borderBottomStyle: 'solid',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4a5568',
    marginBottom: 8,
    backgroundColor: '#edf2f7',
    padding: 6,
    borderRadius: 3,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
    paddingVertical: 3,
  },
  label: {
    width: '40%',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#4a5568',
  },
  value: {
    width: '60%',
    fontSize: 10,
    color: '#2d3748',
  },
  aiResultBox: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#f7fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'solid',
    borderRadius: 5,
  },
  aiResultTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2b6cb0',
    marginBottom: 10,
  },
  riskLevelHigh: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#e53e3e',
    marginBottom: 8,
  },
  riskLevelMedium: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#dd6b20',
    marginBottom: 8,
  },
  riskLevelLow: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#38a169',
    marginBottom: 8,
  },
  reasonText: {
    fontSize: 10,
    color: '#4a5568',
    marginBottom: 8,
    lineHeight: 1.5,
  },
  actionText: {
    fontSize: 10,
    color: '#2d3748',
    fontStyle: 'italic',
    backgroundColor: '#ebf8ff',
    padding: 8,
    borderRadius: 3,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    borderBottomStyle: 'dashed',
    marginVertical: 10,
  },
  table: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'solid',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#edf2f7',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    borderBottomStyle: 'solid',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f7fafc',
    borderBottomStyle: 'solid',
  },
  tableCell: {
    padding: 6,
    fontSize: 8,
    flex: 1,
  },
  tableCellHeader: {
    padding: 6,
    fontSize: 8,
    fontWeight: 'bold',
    flex: 1,
    color: '#4a5568',
  },
  featureList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  featureItem: {
    fontSize: 8,
    backgroundColor: '#e2e8f0',
    padding: 4,
    margin: 2,
    borderRadius: 2,
    color: '#4a5568',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#a0aec0',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    borderTopStyle: 'solid',
    paddingTop: 10,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 15,
    right: 40,
    fontSize: 8,
    color: '#a0aec0',
  },
});

// Helper function to parse AI result JSON
const parseAIResult = (resultString) => {
  if (!resultString) return null;
  try {
    // Clean up the string and parse JSON
    const cleanedString = resultString
      .replace(/\\n/g, '')
      .replace(/\\/g, '');
    return JSON.parse(cleanedString);
  } catch (e) {
    // If parsing fails, try to extract data manually
    const riskMatch = resultString.match(/"risk_level":\s*"([^"]+)"/);
    const reasonMatch = resultString.match(/"reason":\s*"([^"]+)"/);
    const actionMatch = resultString.match(/"action":\s*"([^"]+)"/);
    
    return {
      risk_level: riskMatch ? riskMatch[1] : 'UNKNOWN',
      reason: reasonMatch ? reasonMatch[1] : 'Unable to parse reason',
      action: actionMatch ? actionMatch[1] : 'Unable to parse action',
    };
  }
};

// Get risk level style
const getRiskLevelStyle = (riskLevel) => {
  switch (riskLevel?.toUpperCase()) {
    case 'HIGH':
      return styles.riskLevelHigh;
    case 'MEDIUM':
      return styles.riskLevelMedium;
    case 'LOW':
      return styles.riskLevelLow;
    default:
      return styles.riskLevelMedium;
  }
};

// Page Header Component
const PageHeader = () => (
  <View style={styles.header}>
    <Text style={styles.headerTitle}>FIN SENTINEL AI - MAKER CHECKER - EFRM REPORTS</Text>
    <Text style={styles.headerSubtitle}>Enterprise Fraud Risk Management System</Text>
  </View>
);

// Page Footer Component
const PageFooter = ({ pageNumber }) => (
  <>
    <Text style={styles.footer}>
      Generated by FinSentinel AI • Confidential Document
    </Text>
    <Text style={styles.pageNumber}>Page {pageNumber}</Text>
  </>
);

// AI Result Display Component
const AIResultSection = ({ aiResult }) => {
  const parsedResult = parseAIResult(aiResult);
  
  if (!parsedResult) return null;
  
  return (
    <View style={styles.aiResultBox}>
      <Text style={styles.aiResultTitle}>AI Analysis Result</Text>
      <Text style={getRiskLevelStyle(parsedResult.risk_level)}>
        Risk Level: {parsedResult.risk_level}
      </Text>
      <Text style={styles.reasonText}>
        <Text style={{ fontWeight: 'bold' }}>Reason: </Text>
        {parsedResult.reason}
      </Text>
      <Text style={styles.actionText}>
        <Text style={{ fontWeight: 'bold' }}>Recommended Action: </Text>
        {parsedResult.action}
      </Text>
    </View>
  );
};

// Transaction Analysis Page
const TransactionAnalysisPage = ({ data, backgroundImage, pageNumber }) => {
  const transactionData = data.first;
  
  return (
    <Page size="A4" style={styles.page}>
      {backgroundImage && (
        <Image src={backgroundImage} style={styles.backgroundImage} />
      )}
      <PageHeader />
      <Text style={styles.pageTitle}>Transaction Analysis Report</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Transaction Details</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Customer ID:</Text>
          <Text style={styles.value}>{transactionData?.Customer_Id}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Timestamp:</Text>
          <Text style={styles.value}>{transactionData?.Timestamp}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Amount:</Text>
          <Text style={styles.value}>{transactionData?.Amount}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Location:</Text>
          <Text style={styles.value}>{transactionData?.Location || 'N/A'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>To Customer ID:</Text>
          <Text style={styles.value}>{transactionData?.To_Customer_Id || 'N/A'}</Text>
        </View>
        
        <View style={styles.divider} />
        
        <Text style={styles.sectionTitle}>Security Indicators</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Foreign Transaction:</Text>
          <Text style={styles.value}>{transactionData?.Tran_Foreign === 0 ? 'No' : 'Yes'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Device Change:</Text>
          <Text style={styles.value}>{transactionData?.Device_Change === 0 ? 'No' : 'Yes'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>IP Change:</Text>
          <Text style={styles.value}>{transactionData?.IP_Change === 0 ? 'No' : 'Yes'}</Text>
        </View>
      </View>
      
      <AIResultSection aiResult={data.second} />
      <PageFooter pageNumber={pageNumber} />
    </Page>
  );
};

// Alert Analysis Page
const AlertAnalysisPage = ({ data, backgroundImage, pageNumber }) => {
  const alertData = data.first?.transaction_data;
  
  return (
    <Page size="A4" style={styles.page}>
      {backgroundImage && (
        <Image src={backgroundImage} style={styles.backgroundImage} />
      )}
      <PageHeader />
      <Text style={styles.pageTitle}>Alert Analysis Report</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Alert Information</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Alert ID:</Text>
          <Text style={styles.value}>{alertData?.ID}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Priority:</Text>
          <Text style={[styles.value, { color: alertData?.PRIORITY === 'HIGH' ? '#e53e3e' : '#2d3748', fontWeight: 'bold' }]}>
            {alertData?.PRIORITY}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Status:</Text>
          <Text style={styles.value}>{alertData?.STATUS}</Text>
        </View>
        
        <View style={styles.divider} />
        
        <Text style={styles.sectionTitle}>Customer Details</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Full Name:</Text>
          <Text style={styles.value}>{alertData?.MATCH_FULL_NAME_NORM}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Customer ID:</Text>
          <Text style={styles.value}>{alertData?.MATCH_CUST_ID}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Device ID:</Text>
          <Text style={styles.value}>{alertData?.MATCH_DEVICE_ID}</Text>
        </View>
        
        <View style={styles.divider} />
        
        <Text style={styles.sectionTitle}>Transaction Summary</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Debit Account:</Text>
          <Text style={styles.value}>{alertData?.MATCH_DEBITACCOUNTNUMBER}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Beneficiary Account:</Text>
          <Text style={styles.value}>{alertData?.MATCH_BENEFICIARYACCOUNTNUMBER}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Transaction Amount (1D):</Text>
          <Text style={styles.value}>{alertData?.MATCH_TRAN_AMOUNT_1D}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Transaction Amount (30D):</Text>
          <Text style={styles.value}>{alertData?.MATCH_TRAN_AMOUNT_30D}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Credit Amount (1D):</Text>
          <Text style={styles.value}>{alertData?.MATCH_CREDIT_AMOUNT_1D}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Debit Amount (1D):</Text>
          <Text style={styles.value}>{alertData?.MATCH_DEBIT_AMOUNT_1D}</Text>
        </View>
      </View>
      
      <AIResultSection aiResult={data.second} />
      <PageFooter pageNumber={pageNumber} />
    </Page>
  );
};

// ML Analysis Page
const MLAnalysisPage = ({ data, backgroundImage, pageNumber }) => {
  const mlData = data.first;
  const transactionAnalysis = mlData?.transaction_analysis;
  const topRiskFactors = mlData?.top_risk_factors || [];
  const inputNames = mlData?.input_names || [];
  
  return (
    <Page size="A4" style={styles.page}>
      {backgroundImage && (
        <Image src={backgroundImage} style={styles.backgroundImage} />
      )}
      <PageHeader />
      <Text style={styles.pageTitle}>Machine Learning Analysis Report</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Model Prediction Summary</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Status:</Text>
          <Text style={styles.value}>{transactionAnalysis?.status}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Prediction Class:</Text>
          <Text style={styles.value}>{transactionAnalysis?.prediction_class === 0 ? 'Normal' : 'Fraud'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Confidence:</Text>
          <Text style={styles.value}>{(transactionAnalysis?.confidence * 100).toFixed(1)}%</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Fraud Probability:</Text>
          <Text style={styles.value}>{(transactionAnalysis?.fraud_probability_score * 100).toFixed(1)}%</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Normal Probability:</Text>
          <Text style={styles.value}>{(transactionAnalysis?.normal_probability_score * 100).toFixed(1)}%</Text>
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Features Analyzed</Text>
        <View style={styles.featureList}>
          {inputNames.map((feature, index) => (
            <Text key={index} style={styles.featureItem}>{feature}</Text>
          ))}
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Risk Factors</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableCellHeader}>Rank</Text>
            <Text style={styles.tableCellHeader}>Feature</Text>
            <Text style={styles.tableCellHeader}>Value</Text>
            <Text style={styles.tableCellHeader}>SHAP Score</Text>
            <Text style={styles.tableCellHeader}>Contribution %</Text>
          </View>
          {topRiskFactors.map((factor, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tableCell}>{factor.rank}</Text>
              <Text style={styles.tableCell}>{factor.feature}</Text>
              <Text style={styles.tableCell}>{factor.value}</Text>
              <Text style={styles.tableCell}>{factor.shap_score.toFixed(2)}</Text>
              <Text style={styles.tableCell}>{factor.contribution_percentage}%</Text>
            </View>
          ))}
        </View>
      </View>
      
      <AIResultSection aiResult={data.second} />
      <PageFooter pageNumber={pageNumber} />
    </Page>
  );
};

// Customer Analysis Page
const CustomerAnalysisPage = ({ data, backgroundImage, pageNumber }) => {
  const transactions = data.first?.transactions || [];
  const customerId = transactions[0]?.Customer_Id;
  
  return (
    <Page size="A4" style={styles.page}>
      {backgroundImage && (
        <Image src={backgroundImage} style={styles.backgroundImage} />
      )}
      <PageHeader />
      <Text style={styles.pageTitle}>Customer Analysis Report</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer Information</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Customer ID:</Text>
          <Text style={styles.value}>{customerId}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Analysis Period:</Text>
          <Text style={styles.value}>September 2025 (One Month Analysis)</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Total Transactions:</Text>
          <Text style={styles.value}>{transactions.length}</Text>
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Transaction History</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCellHeader, { flex: 2 }]}>Timestamp</Text>
            <Text style={styles.tableCellHeader}>Channel</Text>
            <Text style={styles.tableCellHeader}>Type</Text>
            <Text style={styles.tableCellHeader}>Amount</Text>
            <Text style={styles.tableCellHeader}>Terminal</Text>
          </View>
          {transactions.slice(0, 10).map((transaction, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>
                {new Date(transaction.Timestamp).toLocaleString()}
              </Text>
              <Text style={styles.tableCell}>{transaction.Channel}</Text>
              <Text style={styles.tableCell}>{transaction.Transaction_Type}</Text>
              <Text style={styles.tableCell}>{transaction.Amount}</Text>
              <Text style={styles.tableCell}>{transaction.Terminal_ID}</Text>
            </View>
          ))}
        </View>
      </View>
      
      <AIResultSection aiResult={data.second} />
      <PageFooter pageNumber={pageNumber} />
    </Page>
  );
};

// Main PDF Document Component
const FinSentinelPDFReport = ({ payload, backgroundImage }) => {
  // Calculate page numbers dynamically based on which sections have data
  let currentPageNumber = 0;
  
  const hasTransactionAnalysis = payload?.['Transaction Analysis']?.second;
  const hasAlertAnalysis = payload?.['Alert Analysis']?.second;
  const hasMLAnalysis = payload?.['ML Analysis']?.second;
  const hasCustomerAnalysis = payload?.['Customer Analysis']?.second;
  
  return (
    <Document
      title="FinSentinel AI - EFRM Report"
      author="FinSentinel AI System"
      subject="Enterprise Fraud Risk Management Report"
      keywords="fraud, risk, analysis, EFRM"
    >
      {hasTransactionAnalysis && (
        <TransactionAnalysisPage
          data={payload['Transaction Analysis']}
          backgroundImage={backgroundImage}
          pageNumber={++currentPageNumber}
        />
      )}
      
      {hasAlertAnalysis && (
        <AlertAnalysisPage
          data={payload['Alert Analysis']}
          backgroundImage={backgroundImage}
          pageNumber={++currentPageNumber}
        />
      )}
      
      {hasMLAnalysis && (
        <MLAnalysisPage
          data={payload['ML Analysis']}
          backgroundImage={backgroundImage}
          pageNumber={++currentPageNumber}
        />
      )}
      
      {hasCustomerAnalysis && (
        <CustomerAnalysisPage
          data={payload['Customer Analysis']}
          backgroundImage={backgroundImage}
          pageNumber={++currentPageNumber}
        />
      )}
    </Document>
  );
};

// Export the PDF download button component for easy integration
// export const FinSentinelPDFDownloadButton = ({ payload, backgroundImage, fileName = 'FinSentinel_EFRM_Report.pdf' }) => {
//               const hasSecond = Object.values(payload).some(
//   s => s?.second != null
// );
// if (hasSecond) {
//   console.log("At least one .second has a value");
// } else {
//   console.log("All .second values are null");
// }
//   return (
//     <PDFDownloadLink
//       document={<FinSentinelPDFReport payload={payload} backgroundImage={backgroundImage} />}
//       fileName={fileName}
//       style={{
//         textDecoration: 'none',
//         padding: '12px 24px',
//         backgroundColor: '#1a365d',
//         color: '#ffffff',
//         borderRadius: '6px',
//         fontWeight: 'bold',
//         display: 'inline-block',
//         cursor: 'pointer',
//       }}
//     >
//       {({ blob, url, loading, error }) =>
//         loading ? 'Generating PDF...' : 'Download EFRM Report'
//       }
//     </PDFDownloadLink>
//   );
// };



export const FinSentinelPDFDownloadButton = ({ payload, backgroundImage, fileName = 'FinSentinel_EFRM_Report.pdf' }) => {

  const hasSecond = Object.values(payload).some(
    s => s?.second != null
  );

  if (!hasSecond) {
    return (
      <div
        style={{
          padding: "12px 24px",
          backgroundColor: "#5a5a5a",
          color: "#ccc",
          borderRadius: "6px",
          fontWeight: "bold",
          display: "inline-block",
          cursor: "not-allowed",
          opacity: 0.6,
        }}
      >
        No Generated data
      </div>
    );
  }else{

  return (
    <PDFDownloadLink
      document={<FinSentinelPDFReport payload={payload} backgroundImage={backgroundImage} />}
      fileName={fileName}
      style={{
        textDecoration: 'none',
        padding: '12px 24px',
        backgroundColor: '#1a365d',
        color: '#ffffff',
        borderRadius: '6px',
        fontWeight: 'bold',
        display: 'inline-block',
        cursor: 'pointer',
      }}
    >
      {({ blob, url, loading, error }) =>
        loading ? 'Generating PDF...' : 'Download EFRM Report'
      }
    </PDFDownloadLink>
  );
}
};

export default FinSentinelPDFReport;
