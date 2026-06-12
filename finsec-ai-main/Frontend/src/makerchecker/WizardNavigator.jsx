import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, ChevronLeft, ChevronRight, Loader2, Download } from 'lucide-react';
import './WizardNavigator.css';
// import FinSentinelPDFExample from './FinSentinelPDFExample';
import FinSentinelPDFReport, { FinSentinelPDFDownloadButton } from './FinSentinelPDFReport';

const API_BASE_URL = 'http://localhost:8002/maker_checker';



const STEPS = [
  'Transaction Analysis',
  'Alert Analysis',
  'ML Analysis',
  'Customer Analysis',
  'Final Report'
  // ,'Mule_Analysis'
];

const API_CALLS = {
  Transaction: ['/transaction', '/analyse_transaction'],
  Alert: ['/Alert', '/analyse_Alert'],
  ML: ['/ML', '/analyse_ML'],
  Professional: ['/Professional', '/analyse_Professional'],
  Customer_Search: ['/Customer_Search', '/analyse_Customer_Search'],
  Mule_Analysis: ['/Mule_Analysis', '/analyse_Mule_Analysis']
};

const WizardNavigator = () => {
  const [mode, setMode] = useState('Manual'); // 'Manual' or 'Auto'
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState({ step: null, type: null });
  const [animatingText, setAnimatingText] = useState({ step: null, text: '', fullText: '' });
  const autoIntervalRef = useRef(null);
  const textAnimationRef = useRef(null);

  const [called, setCalled] = useState(false);

  // Initialize responses object

  useEffect(() => {
    // console.log(currentStepName)
    const initialResponses = {};
    STEPS.forEach(step => {
      initialResponses[step] = { first: null, second: null };
    });
    setResponses(initialResponses);
  }, []);











const calledRef = useRef(false);

useEffect(() => {
  // console.log(mode, currentStep, responses, loading);

  if (mode === 'Auto' && currentStep < STEPS.length) {
    const stepName = STEPS[currentStep];

    if (!responses[stepName].first) {
      if (stepName !== 'Final Report') {
        handleStartProcess(stepName);
      }
    } else if (!responses[stepName].second && !loading.step && !calledRef.current) {
      const timer = setTimeout(async () => {
        await handleAnalyse(stepName);
        calledRef.current = true;
      }, 2000);

      return () => clearTimeout(timer);
    } else if (responses[stepName].second && currentStep < STEPS.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        calledRef.current = false; // Reset for next step
      }, 3000);

      return () => clearTimeout(timer);
    }
  }
}, [mode, currentStep, responses, loading]);
























  // Auto mode logic

  // useEffect(() => {
  //   console.log(mode, currentStep, responses, loading, called)
  //   // setCalled(false);

  //   if (mode === 'Auto' && currentStep < STEPS.length) {
  //     const stepName = STEPS[currentStep];
  //     if (!responses[stepName].first) {
  //       // Start first API call automatically
  //       // console.log(STEPS[currentStep])
  //       if (STEPS[currentStep] != 'Final Report') {
  //         // console.log(currentStep)
  //         handleStartProcess(stepName);
  //       }

  //     } else if (!responses[stepName].second && !loading.step && !called) {
  //       // Start second API call after 2 seconds
  //       const timer = setTimeout(async () => {
  //         // console.log(timer, stepName, called, responses[stepName].second)
  //        await handleAnalyse(stepName);
  //         setCalled(true);
  //       }, 2000);
  //       // console.log(STEPS[currentStep], called)
        
  //       return () => clearTimeout(timer);

  //     } else if (responses[stepName].second && currentStep < STEPS.length - 1) {
  //       // Move to next step after both responses received
  //       const timer = setTimeout(() => {
  //         setCurrentStep(prev => prev + 1);
  //       }, 3000);
  //       return () => clearTimeout(timer);
  //     }
  //     setCalled(false);
  //         console.log(loading)
  //   }
  // }, [mode, currentStep, responses, loading, called]);

  // Simulate API call

  const simulateAPICall = async (endpoint, stepName) => {
    // Simulating API response
    // await new Promise(resolve => setTimeout(resolve, 2000));
    // console.log(endpoint)


    // console.log(responses.${stepName})

    // console.log(responses[stepName].first)

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(responses[stepName].first)
    });

    const result = await response.json();


    // console.log(result.response)


    const sampleResponses = [
      'Transaction analysis completed successfully. Found 3 suspicious patterns in the last 24 hours. Total amount: $15,234.50. Recommended action: Flag for review.',
      'Alert system triggered 5 warnings based on unusual activity patterns. Severity levels: 2 High, 3 Medium. All alerts have been logged and notifications sent.',
      'Machine Learning model detected anomalies with 87% confidence score. Pattern recognition identified irregular transaction timing and amount variations.',
      'Professional verification completed. Credentials checked against regulatory database. Status: Active and compliant. Last update: 2 days ago.',
      'Customer search returned 12 matching profiles. Geographic distribution: 5 domestic, 7 international. Risk assessment: 3 profiles require enhanced due diligence.',
      'Mule analysis complete. Identified 2 potential mule accounts with suspicious fund transfer patterns. Network analysis reveals connections to 8 other accounts.'
    ];
    return result.response;

    // return result.response[Math.floor(Math.random() * result.response.length)] ;
    // + ' ' +
    //   'Additional details include comprehensive data points across multiple metrics and timeframes for thorough investigation.';
  };

  // Animate text word by word

  const animateText = (fullText, stepName, type) => {
    const words = fullText.split(' ');
    let currentIndex = 0;
    setAnimatingText({ step: stepName, text: '', fullText, type });
    textAnimationRef.current = setInterval(() => {
      if (currentIndex < words.length) {
        setAnimatingText(prev => ({
          ...prev,
          text: words.slice(0, currentIndex + 1).join(' ')
        }));
        currentIndex++;
      } else {
        clearInterval(textAnimationRef.current);
        setAnimatingText({ step: null, text: '', fullText: '' });
        // Update final response
        setResponses(prev => ({
          ...prev,
          [stepName]: {
            ...prev[stepName],
            [type]: fullText
          }
        }));
      }
    }, 100);
  };


  async function readJsonFile(filePath) {
    try {
      const response = await fetch(filePath);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error('Error reading JSON file:', err);
      return null;
    }
  }

  function getStepUrl(analysisType) {
    const fileMap = {
      "Transaction Analysis": `${API_BASE_URL}/analyze_transaction`,
      "Alert Analysis": `${API_BASE_URL}/analyze_alert`,
      "ML Analysis": `${API_BASE_URL}/analyze_ml`,
      "Customer Analysis": `${API_BASE_URL}/analyze_customer`,
      "Final Search": `${API_BASE_URL}/report`,
    };
    // /storage/AIML/Rag/llm_insights/frontend/maker-checker/src/jsonLoad/jsons/alert.json
    return fileMap[analysisType] || "default.json";
  }




  function getFileName(analysisType) {
    const fileMap = {
      "Transaction Analysis": "src/jsonLoad/jsons/payload.json",
      "Alert Analysis": "src/jsonLoad/jsons/alert.json",
      "ML Analysis": "src/jsonLoad/jsons/ml_analysis.json",
      "Customer Analysis": "src/jsonLoad/jsons/customer.json",
      "Final Search": "src/jsonLoad/jsons/alert.json"
    };
    // /storage/AIML/Rag/llm_insights/frontend/maker-checker/src/jsonLoad/jsons/alert.json
    return fileMap[analysisType] || "default.json";
  }

  // Example usage:
  // console.log(getFileName("Transaction Analysis")); // Output: transaction.json
  // console.log(getFileName("Customer Analysis"));    // Output: customer.json
  // console.log(getFileName("Unknown"));              // Output: default.json



  const handleStartProcess = async (stepName) => {
    // console.log(stepName)
    if (loading.step) return;
    setLoading({ step: stepName, type: 'first' });
    // try {
    //   const response = await simulateAPICall(API_CALLS[stepName][0]);
    //   setLoading({ step: null, type: null });
    //   if (mode === 'Auto') {
    //     animateText(response, stepName, 'first');
    //   } else {
    //     setResponses(prev => ({
    //       ...prev,
    //       [stepName]: { ...prev[stepName], first: response }
    //     }));
    //   }
    // } catch (error) {
    //   setLoading({ step: null, type: null });
    //   console.error('API Error:', error);
    // }

    const response = await readJsonFile(getFileName(stepName))
    // console.log(response)
    // console.log(getFileName(stepName))
    // readJsonFile(getFileName(stepName)).then(data => console.log(data));
    setLoading({ step: null, type: null });
    setResponses(prev => ({
      ...prev,
      [stepName]: { ...prev[stepName], first: response }
    }));

  };

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


  function cleanPayload(payload) {
    // Create a shallow copy so we don't mutate the original
    const result = { ...payload };

    Object.keys(result).forEach((section) => {
      const { second } = result[section];
      if (second === null || second === "" || second === undefined) {
        delete result[section];
      }
    });

    return result;
  }



  function buildPayload(response) {
    // Deep clone to avoid mutating BASE_PAYLOAD
    const payload = JSON.parse(JSON.stringify(response));

    // Apply updates
    Object.entries(updates).forEach(([section, values]) => {
      if (payload[section]) {
        payload[section] = { ...payload[section], ...values };
      }
    });

    // Remove sections where `second` is null or empty
    Object.keys(payload).forEach((section) => {
      const { second } = payload[section];
      if (second === null || second === "" || second === undefined) {
        delete payload[section];
      }
    });

    return payload;
  }


  const handleAnalyse = async (stepName) => {




    // console.log(getStepUrl(stepName))

    try {
      // const response = await simulateAPICall(API_CALLS[stepName][1]);
      // const response = await simulateAPICall(getStepUrl(stepName), stepName);
      // console.log(stepName)

      // console.log(cleanPayload(responses))





      if (stepName === 'Final Report') {

        // console.log(cleanPayload(responses))

        // const res = await simulateAPICall(getStepUrl(stepName), {
        //     method: "POST",
        //     headers: {
        //       "Content-Type": "application/json",
        //     },
        //     body: JSON.stringify(cleanPayload(responses)),
        //   });

        //   if (!res.ok) {
        //     const text = await res.text().catch(() => "");
        //     throw new Error(`Request failed (${res.status}): ${text || res.statusText}`);
        //   }

        //   const data = await res.json().catch(() => ({}));
        //   console.log(data)

        // const response = await fetch("http://localhost:8888/report", {
        //   method: "POST",
        //   headers: { "Content-Type": "application/json" },
        //   body: JSON.stringify(cleanPayload(responses)), // your JSON payload
        // });

        // const blob = await response.blob();
        // const url = URL.createObjectURL(blob);
        // const link = document.createElement("a");
        // link.href = url;
        // link.download = "fraud_report.pdf";
        // link.click();





      } else {


        if (loading.step) return;
        setLoading({ step: stepName, type: 'second' });
        const response = await simulateAPICall(getStepUrl(stepName), stepName);
        setLoading({ step: null, type: null });
        if (mode === 'Auto') {
          animateText(response, stepName, 'second');
        } else {
          setResponses(prev => ({
            ...prev,
            [stepName]: { ...prev[stepName], second: response }
          }));
        }
      }
    } catch (error) {
      setLoading({ step: null, type: null });
      console.error('API Error:', error);
    }
  };

  const handleRestart = (stepName) => {

    setResponses(prev => ({

      ...prev,

      [stepName]: { first: null, second: null }

    }));

    if (textAnimationRef.current) {

      clearInterval(textAnimationRef.current);

    }

    setAnimatingText({ step: null, text: '', fullText: '' });

  };

  const getStepStatus = (stepIndex) => {

    const stepName = STEPS[stepIndex];

    const stepResponse = responses[stepName];

    if (!stepResponse) return 'pending';

    if (stepResponse.second) return 'completed';

    if (stepResponse.first) return 'inProgress';

    return 'pending';

  };

  const getLineStatus = (stepIndex) => {

    const stepName = STEPS[stepIndex];

    const stepResponse = responses[stepName];

    if (!stepResponse || !stepResponse.second) return 'pending';

    return 'completed';

  };

  const handlePrevious = () => {

    if (currentStep > 0) {

      setCurrentStep(currentStep - 1);

    }

  };

  const handleNext = () => {

    if (currentStep < STEPS.length - 1) {

      setCurrentStep(currentStep + 1);

    }

  };

  const toggleMode = () => {

    const newMode = mode === 'Manual' ? 'Auto' : 'Manual';

    setMode(newMode);

    // Reset everything when switching modes

    const initialResponses = {};

    STEPS.forEach(step => {

      initialResponses[step] = { first: null, second: null };

    });

    setResponses(initialResponses);

    setCurrentStep(0);

    setLoading({ step: null, type: null });

    if (textAnimationRef.current) {

      clearInterval(textAnimationRef.current);

    }

    setAnimatingText({ step: null, text: '', fullText: '' });

  };

  const currentStepName = STEPS[currentStep];

  const currentResponse = responses[currentStepName] || { first: null, second: null };

  return (
    <div className="wizard-container">
      <div className="wizard-header">
        <h1>FinSentinel AI - Intel Gate</h1>

      </div>

      <div className="mode-toggle">
        <button
          className={`mode-btn ${mode === 'Manual' ? 'active' : ''}`}
          onClick={() => mode !== 'Manual' && toggleMode()}
        >
          Manual Mode
        </button>
        <button
          className={`mode-btn ${mode === 'Auto' ? 'active' : ''}`}
          onClick={() => mode !== 'Auto' && toggleMode()}
        >
          Auto Mode
        </button>
      </div>

      {/* <FinSentinelPDFExample /> */}


      {/* Wizard Progress Bar */}
      <div className="wizard-progress">
        {STEPS.map((step, index) => (
          <React.Fragment key={step}>
            <div className="step-wrapper">
              <div
                className={`step-circle ${getStepStatus(index)} ${currentStep === index ? 'current' : ''
                  }`}
                onClick={() => setCurrentStep(index)}
              >
                <span className="step-number">{index + 1}</span>
              </div>
              <div className="step-label">{step.replace(/_/g, ' ')}</div>
            </div>
            {index < STEPS.length - 1 && (
              <div className={`step-line ${getLineStatus(index)}`}>
                <div className="line-fill"></div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      <div className="step-content">
        <h2 className="step-title">
          Step {currentStep + 1}: {currentStepName.replace(/_/g, ' ')}
        </h2>
        <div className="step-actions">
          {mode === 'Manual' && (
            <>
              {!currentResponse.first && (
                <>
                  {currentStepName === "Final Report" ? (
                    <FinSentinelPDFDownloadButton payload={responses} />
                  ) : (
                    <button
                      className="action-btn primary"
                      onClick={() => handleStartProcess(currentStepName)}
                      disabled={loading.step === currentStepName}
                    >
                      {loading.step === currentStepName && loading.type === "first" ? (
                        <>
                          <Loader2 className="spinning" size={18} />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Play size={18} />
                          Start Process
                        </>
                      )}
                    </button>
                  )}
                </>
              )}



              {/* // <button
                //   className="action-btn primary"
                //   // onClick={() => handleStartProcess(currentStepName)}

                //   onClick={() =>
                //     currentStepName === 'Final Report'
                //       ? handleAnalyse(currentStepName)
                //       : handleStartProcess(currentStepName)
                //   }

                //   disabled={loading.step === currentStepName}
                // >
                //   {loading.step === currentStepName ? (
                //     <>
                //       <Loader2 className="spinning" size={18} />
                //       {currentStepName === 'Final Report' ? 'Generating Report...' : 'Processing...'}
                //     </>
                //   ) : (
                //     <>
                //       {currentStepName === 'Final Report' ? (
                //         <>
                //           <FinSentinelPDFDownloadButton payload={payload} />
                //         </>
                //       ) : (
                //         <>
                //           <Play size={18} />
                //           Start Process
                //         </>
                //       )}
                //     </>
                //   )}
                // </button> */}


            </>
          )}

          {(currentResponse.first || currentResponse.second) && (
            <button
              className="action-btn secondary"
              onClick={() => handleRestart(currentStepName)}
            >
              <RotateCcw size={18} />
              Restart
            </button>
          )}
        </div>

        {/* Response Field 1 */}


        {currentStepName != 'Final Report' && (
          <div className="response-section">
            <h3>Process Response</h3>
            <div className="response-field">
              {loading.step === currentStepName && loading.type === 'first' ? (
                <div className="loading-state">
                  <Loader2 className="spinning" size={24} />
                  <p>Processing request...</p>
                </div>
              ) : animatingText.step === currentStepName && animatingText.type === 'first' ? (
                <p className="animating-text">{animatingText.text}</p>
              ) : currentResponse.first ? (
                // <p>{currentResponse.first}</p>
                <p>{JSON.stringify(currentResponse.first, null, 2)}</p>
              ) : (
                <p className="placeholder">Response will appear here after starting the process...</p>
              )}
            </div>

          </div>
        )}

        {/* Analyse Button */}

        {currentResponse.first && mode === 'Manual' && !currentResponse.second && (
          <div className="step-actions">
            <button
              className="action-btn primary"
              onClick={() => handleAnalyse(currentStepName)}
              disabled={loading.step === currentStepName}
            >
              {loading.step === currentStepName && loading.type === 'second' ? (
                <>
                  <Loader2 className="spinning" size={18} />
                  Thinking...
                </>
              ) : (
                <>
                  <Play size={18} />
                  Analyse
                </>
              )}
            </button>
          </div>
        )}

        {/* Response Field 2 */}

        {(currentResponse.first || mode === 'Auto') && (
          <div className="response-section">


            {currentStepName === "Final Report" ? (
              <div className='response-sectionbutt'>
                <FinSentinelPDFDownloadButton payload={responses} />
              </div>
            ) : (
              <>
                <h3>Analysis Response</h3>
                <div className="response-field">

                  {loading.step === currentStepName && loading.type === 'second' ? (
                    <div className="loading-state">
                      <Loader2 className="spinning" size={24} />
                      <p>Thinking...</p>
                    </div>

                  ) : animatingText.step === currentStepName && animatingText.type === 'second' ? (
                    <p className="animating-text">{animatingText.text}</p>

                  ) : currentResponse.second ? (
                    <p>{currentResponse.second}</p>

                  ) : (
                    // <p className="placeholder">Analysis results will appear here...</p>
                    <p className="placeholder">Analysis results will appear here...</p>
                  )}
                </div>
              </>
            )}

          </div>

        )}
      </div>

      {/* Navigation Buttons */}
      <div className="wizard-navigation">
        <button

          className="nav-btn"

          onClick={handlePrevious}

          disabled={currentStep === 0}
        >
          <ChevronLeft size={20} />

          Previous
        </button>
        <div className="step-indicator">

          Step {currentStep + 1} of {STEPS.length}
        </div>
        <button

          className="nav-btn"

          onClick={handleNext}

          disabled={currentStep === STEPS.length - 1}
        >

          Next
          <ChevronRight size={20} />
        </button>
      </div>
    </div>

  );

};

export default WizardNavigator;




{/* <div className="response-field">
  {loading.step === currentStepName && loading.type === 'first' ? (
    <div className="loading-state">
      <Loader2 className="spinning" size={24} />
      <p>Processing request...</p>
    </div>
  ) : animatingText.step === currentStepName && animatingText.type === 'first' ? (
    <p className="animating-text">{animatingText.text}</p>
  ) : currentResponse.first ? (
    <div>
      {Object.entries(currentResponse.first).map(([key, value]) => (
        <p key={key}><strong>{key}:</strong> {String(value)}</p>
      ))}
    </div>
  ) : (
    <p className="placeholder">Response will appear here after starting the process...</p>
  )}
</div> */}