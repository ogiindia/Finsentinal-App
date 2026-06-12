import React from 'react';
import { PDFViewer } from '@react-pdf/renderer';
import FinSentinelPDFReport, { FinSentinelPDFDownloadButton } from './FinSentinelPDFReport';


const payload = {
  "Transaction Analysis": {
    "first": {
      "Customer_Id": 108737,
      "Timestamp": "2025-03-06T19:56:00",
      "Amount": 400,
      "Location": "Gudaibiya",
      "To_Customer_Id": 659925,
      "Tran_Foreign": 0,
      "Device_Change": 0,
      "IP_Change": 0,
      "Beneficiary": null
    },
    "second": "{\n  \"risk_level\": \"LOW\",\n  \"reason\": \"No suspicious activities detected: Device and IP unchanged, no foreign transaction, and valid beneficiary.\",\n  \"action\": \"Continue monitoring transactions for potential patterns or anomalies.\""
  },
  "Alert Analysis": {
    "first": {
      "model_id": 12,
      "transaction_data": {
        "ID": "411",
        "MATCH_FULL_NAME_NORM": "Faisal Al-Hassan",
        "MATCH_FIRST_NAME": "Faisal",
        "MATCH_LAST_NAME": "Al-Hassan",
        "MATCH_DEBITACCOUNTNUMBER": "929669",
        "MATCH_TRAN_AMOUNT_1D": "150",
        "MATCH_TRAN_AMOUNT_30D": "150",
        "MATCH_CUST_ID": "929669",
        "MATCH_DEVICE_ID": "cf4291145d0d95b0",
        "MATCH_CREDIT_AMOUNT_1D": "860",
        "PRIORITY": "HIGH",
        "MATCH_BENEFICIARYACCOUNTNUMBER": "933576",
        "STATUS": "CLOSED",
        "MATCH_DEBIT_AMOUNT_1D": "150",
        "MATCH_TRAN_AMOUNT_180D": "150"
      }
    },
    "second": "{\n  \"risk_level\": \"HIGH\",\n  \"reason\": \"Multiple transactions of the same amount in 1 day and within 30 days for different beneficiaries by the same customer and device.\",\n  \"action\": \"Investigate further for potential account takeover or money laundering activities.\""
  },
  "ML Analysis": {
    "first": {
      "transaction_analysis": {
        "status": "Normal",
        "prediction_score": 0,
        "fraud_probability_score": 0,
        "normal_probability_score": 1,
        "confidence": 1,
        "prediction_class": 0,
        "raw_probabilities": [1, 0]
      },
      "top_risk_factors": [
        {
          "rank": 1,
          "feature": "tran_amount_10min",
          "value": 1400,
          "shap_score": 862.3835,
          "impact": "increases fraud risk",
          "contribution_percentage": 48.9
        },
        {
          "rank": 2,
          "feature": "tran_amount_1D",
          "value": 1400,
          "shap_score": 816.0754,
          "impact": "increases fraud risk",
          "contribution_percentage": 46.3
        }
      ],
      "all_feature_impacts": {
        "tran_above50k": { "shap_value": 0.896, "importance": 0.896, "impact_percentage": 0.05 },
        "tran_count_10min": { "shap_value": -25.8754, "importance": 25.8754, "impact_percentage": 1.47 },
        "tran_count_1D": { "shap_value": -26.2871, "importance": 26.2871, "impact_percentage": 1.49 },
        "tran_amount_10min": { "shap_value": 862.3835, "importance": 862.3835, "impact_percentage": 48.91 },
        "tran_amount_1D": { "shap_value": 816.0754, "importance": 816.0754, "impact_percentage": 46.28 },
        "isoddhr": { "shap_value": -0.2746, "importance": 0.2746, "impact_percentage": 0.02 },
        "Weekday": { "shap_value": 0.6346, "importance": 0.6346, "impact_percentage": 0.04 },
        "Location_Change": { "shap_value": 0.7317, "importance": 0.7317, "impact_percentage": 0.04 },
        "C_MODE_ATM": { "shap_value": 0.5492, "importance": 0.5492, "impact_percentage": 0.03 },
        "C_MODE_POS": { "shap_value": -0.4169, "importance": 0.4169, "impact_percentage": 0.02 },
        "C_MODE_ECOM": { "shap_value": -0.3763, "importance": 0.3763, "impact_percentage": 0.02 }
      },
      "probabilities": { "normal": 1, "fraud": 0 },
      "input_names": [
        "tran_above50k", "tran_count_10min", "tran_count_1D",
        "tran_amount_10min", "tran_amount_1D", "isoddhr",
        "Weekday", "Location_Change", "C_MODE_ATM", "C_MODE_POS", "C_MODE_ECOM"
      ],
      "total_feature_importance": 1763.2419
    },
    "second": "{\n  \"risk_level\": \"HIGH\",\n  \"reason\": \"High transaction amount and frequency increase fraud risk\",\n  \"action\": \"Investigate transactions with amounts over 1400 and frequent within the last day\"\n}"
  },
  "Customer Analysis": {
    "first": {
      "transactions": [
        { "Customer_Id": "CUST001", "Timestamp": "2025-09-29T16:45:36", "Channel": "POS", "Transaction_Type": "Withdrawal", "Amount": 3904, "Terminal_ID": "TERM002" },
        { "Customer_Id": "CUST001", "Timestamp": "2025-09-30T19:09:36", "Channel": "ATM", "Transaction_Type": "Withdrawal", "Amount": 634, "Terminal_ID": "TERM001" },
        { "Customer_Id": "CUST001", "Timestamp": "2025-09-17T08:04:36", "Channel": "ATM", "Transaction_Type": "Withdrawal", "Amount": 164, "Terminal_ID": "TERM004" },
        { "Customer_Id": "CUST001", "Timestamp": "2025-09-14T22:40:36", "Channel": "ATM", "Transaction_Type": "Withdrawal", "Amount": 2702, "Terminal_ID": "TERM004" },
        { "Customer_Id": "CUST001", "Timestamp": "2025-09-10T14:53:36", "Channel": "ECOM", "Transaction_Type": "Withdrawal", "Amount": 2288, "Terminal_ID": "TERM004" },
        { "Customer_Id": "CUST001", "Timestamp": "2025-09-21T13:23:36", "Channel": "POS", "Transaction_Type": "Purchase", "Amount": 1642, "Terminal_ID": "TERM005" },
        { "Customer_Id": "CUST001", "Timestamp": "2025-09-23T19:29:36", "Channel": "POS", "Transaction_Type": "Withdrawal", "Amount": 1226, "Terminal_ID": "TERM001" },
        { "Customer_Id": "CUST001", "Timestamp": "2025-09-17T23:08:36", "Channel": "ECOM", "Transaction_Type": "Withdrawal", "Amount": 2519, "Terminal_ID": "TERM002" },
        { "Customer_Id": "CUST001", "Timestamp": "2025-09-06T05:05:36", "Channel": "POS", "Transaction_Type": "Purchase", "Amount": 617, "Terminal_ID": "TERM001" },
        { "Customer_Id": "CUST001", "Timestamp": "2025-09-04T13:46:36", "Channel": "POS", "Transaction_Type": "Purchase", "Amount": 1166, "Terminal_ID": "TERM003" }
      ]
    },
    "second": "{\n  \"risk_level\": \"MEDIUM\",\n  \"reason\": \"Multiple large withdrawals from different terminals in a short time period for one customer\",\n  \"action\": \"Monitor account closely, request additional verification if suspicious activity continues\"\n}"
  }
};

// Example with some null sections (to demonstrate conditional rendering)
const partialPayload = {
  "Transaction Analysis": {
    "first": { /* ... data ... */ },
    "second": null // This page will be skipped
  },
  "Alert Analysis": {
    "first": { /* ... data ... */ },
    "second": "{\n  \"risk_level\": \"HIGH\",\n  \"reason\": \"Test\",\n  \"action\": \"Test action\"\n}"
  },
  "ML Analysis": {
    "first": { /* ... data ... */ },
    "second": null // This page will be skipped
  },
  "Customer Analysis": {
    "first": { /* ... data ... */ },
    "second": "{\n  \"risk_level\": \"LOW\",\n  \"reason\": \"Test\",\n  \"action\": \"Test action\"\n}"
  }};
// Sample payload data
const samplePayload = payload;



// Usage Example Component
const FinSentinelPDFExample = () => {
  // Optional: You can pass a background image URL
  // const backgroundImage = '/path/to/your/background-image.png';
  const backgroundImage = null; // Set to null if no background image

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#1a365d', marginBottom: '20px' }}>
        FinSentinel AI - EFRM Report Generator
      </h1>
      
      {/* Download Button */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#4a5568', marginBottom: '10px' }}>Download Report</h2>
        <FinSentinelPDFDownloadButton 
          payload={samplePayload} 
          backgroundImage={backgroundImage}
          fileName="FinSentinel_EFRM_Report.pdf"
        />
      </div>
      
      {/* PDF Preview (only works in browser environment) */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#4a5568', marginBottom: '10px' }}>PDF Preview</h2>
        <PDFViewer width="100%" height={800} style={{ border: '1px solid #e2e8f0' }}>
          <FinSentinelPDFReport payload={samplePayload} backgroundImage={backgroundImage} />
        </PDFViewer>
      </div>
    </div>
  );
};

export default FinSentinelPDFExample;

/*
INSTALLATION:
npm install @react-pdf/renderer

USAGE:
1. Import the component:
   import FinSentinelPDFReport, { FinSentinelPDFDownloadButton } from './FinSentinelPDFReport';

2. Pass your payload data:
   <FinSentinelPDFDownloadButton payload={yourPayload} />

3. Or use with PDFViewer for preview:
   <PDFViewer>
     <FinSentinelPDFReport payload={yourPayload} />
   </PDFViewer>

BACKGROUND IMAGE:
- Pass a URL or base64 encoded image as the backgroundImage prop
- The image will appear with 10% opacity behind the content

CONDITIONAL PAGE RENDERING:
- Pages are automatically excluded if their .second value is null or undefined
- Only pages with valid AI analysis results will be included in the PDF
*/
