import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../service/service';
import './ModelRetrainingWizard.css';
import { BadgeCheck, ListPlus, Database, Clock3 } from 'lucide-react';

const ModelRetrainingWizard = ({
  showWizard = false,
  apiEndpoint = '/api/retrain/status',
  onBackToConfig,
  onFinished,        // parent callback when completed / failed
  model
}) => {
  const [currentStage, setCurrentStage] = useState('started');
  const [stageStatus, setStageStatus] = useState('in_progress'); // in_progress | completed | failed
  const [isPolling, setIsPolling] = useState(true);
  const [hasFailed, setHasFailed] = useState(false);

  const [progress, setProgress] = useState(0);
  const [totalStages, setTotalStages] = useState(8);

  const [stageDetails, setStageDetails] = useState(null);

  const [startedAt, setStartedAt] = useState(null);
  const [completedAt, setCompletedAt] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [summary, setSummary] = useState({
    version_number: null,
    new_rows_added: null,
    total_data_rows: null,
    updated_at: null
  });

  const wizardRef = useRef(null);

  const steps = [
    { key: 'started',          label: 'Process Started' },
    { key: 'data_loading',     label: 'Loading Data' },
    { key: 'feature_mapping',  label: 'Mapping Features' },
    { key: 'data_processing',  label: 'Processing Data' },
    { key: 'model_training',   label: 'Training Model' },
    { key: 'model_saving',     label: 'Saving Model' },
    { key: 'database_update',  label: 'Updating Database' },
    { key: 'model_evaluation', label: 'Evaluating Model' },
    { key: 'completed',        label: 'Completed' }
  ];

  // -------- Polling logic --------
  useEffect(() => {
    if (!showWizard || !isPolling || !model?.id) return;

    const statusUrl = `${API_BASE_URL}${apiEndpoint}/${model.id}`;

    const pollStatus = async () => {
      try {
        const response = await fetch(statusUrl, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          console.error('Status API failed');
          return;
        }

        const data = await response.json();
console.log(data)
        const stageKey = data.current_stage || 'started';
        const status = data.stage_status || 'in_progress';

        setCurrentStage(stageKey);
        setStageStatus(status);

        setProgress(data.progress_percentage ?? 0);
        setTotalStages(data.total_stages ?? steps.length);
        setStageDetails(data.stage_details ?? null);

        if (data.started_at) setStartedAt(data.started_at);
        if (data.completed_at) setCompletedAt(data.completed_at);

        setSummary({
          version_number: data.stage_details?.version_number ?? null,
          new_rows_added: data.new_rows_added ?? null,
          total_data_rows: data.total_data_rows ?? null,
          updated_at: data.updated_at ?? null
        });

        if (status === 'failed') {
          setHasFailed(true);
          setIsPolling(false);
          onFinished && onFinished('failed');
        } else if (status === 'completed' || stageKey === 'completed') {
          setIsPolling(false);
          onFinished && onFinished('completed');
        }
      } catch (error) {
        console.error('Error polling status:', error);
      }
    };

    pollStatus();
    const intervalId = setInterval(pollStatus, 2000);

    return () => clearInterval(intervalId);
  }, [showWizard, isPolling, apiEndpoint, model, onFinished]);

  // -------- Live elapsed time --------
  useEffect(() => {
    if (!startedAt) return;

    const startMs = new Date(startedAt).getTime();
    let endMs = completedAt ? new Date(completedAt).getTime() : null;

    const updateElapsed = () => {
      const now = endMs || Date.now();
      const diffSec = Math.max(0, Math.round((now - startMs) / 1000));
      setElapsedSeconds(diffSec);
    };

    updateElapsed();

    if (completedAt || stageStatus === 'completed' || hasFailed) {
      updateElapsed();
      return;
    }

    const intervalId = setInterval(updateElapsed, 1000);
    return () => clearInterval(intervalId);
  }, [startedAt, completedAt, stageStatus, hasFailed]);

  // -------- Auto scroll page to wizard --------
  useEffect(() => {
    if (showWizard && wizardRef.current) {
      wizardRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [showWizard, currentStage, stageStatus, progress]);

  const formatDuration = (totalSeconds) => {
    if (!totalSeconds || totalSeconds < 1) return 'Just started';
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const formatDateTime = (iso) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleString(); // you can customize here
  };

  const currentIndex = steps.findIndex(s => s.key === currentStage);
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;

  // -------- Step status logic (handles skipped stages + completed) --------
  const getStepStatus = (stepKey, index) => {
    // If pipeline is completed: mark EVERY step as completed
    if (stageStatus === 'completed' || currentStage === 'completed') {
      return 'completed';
    }

    const failedNow = hasFailed || stageStatus === 'failed';

    // If failed: all steps before currentIndex are completed, current is failed
    if (failedNow) {
      if (index < safeIndex) return 'completed';
      if (index === safeIndex) return 'failed';
      return 'pending';
    }

    // Normal in-progress behaviour:
    // - All steps BEFORE currentIndex are completed (even if backend skipped them)
    // - Current step is active
    // - All AFTER are pending
    if (index < safeIndex) return 'completed';
    if (index === safeIndex) return 'active';
    return 'pending';
  };

  const renderStepIcon = (status, isNext) => {
    if (status === 'completed') {
      return (
        <div className="icon-circle icon-completed">
          <svg className="checkmark" viewBox="0 0 52 52">
            <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
            <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
          </svg>
        </div>
      );
    }

    if (status === 'failed') {
      return (
        <div className="icon-circle icon-failed">
          <svg className="crossmark" viewBox="0 0 52 52">
            <circle className="crossmark-circle" cx="26" cy="26" r="25" fill="none" />
            <path className="crossmark-line-left" fill="none" d="M16,16 l20,20" />
            <path className="crossmark-line-right" fill="none" d="M36,16 l-20,20" />
          </svg>
        </div>
      );
    }

    if (status === 'active') {
      return (
        <div className="icon-circle icon-active">
          <div className="spinner">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="spinner-blade"></div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className={`icon-circle icon-pending ${isNext ? 'icon-next-glow' : ''}`}>
        <div className="pending-dot"></div>
      </div>
    );
  };

  const getStepLabelClass = (status, isActive, isNext) => {
    if (status === 'completed') return 'wizard-label-completed';
    if (status === 'failed') return 'wizard-label-failed';
    if (isActive) return 'wizard-label-active';
    if (isNext) return 'wizard-label-next';
    return 'wizard-label-pending';
  };

  const showSummary =
    stageStatus === 'completed' || currentStage === 'completed';

  if (!showWizard) return null;

  return (
    <div ref={wizardRef} className="wizard-container wizard-container-full">
      <div className="wizard-card wizard-card-contrast">
        {/* HEADER */}
        <div className="wizard-header">
          <div>
            <h2 className="wizard-title">Model Retraining Progress</h2>
            <p className="wizard-subtitle">
              Model:{' '}
              <span className="wizard-model-name">
                {model?.name || `ID ${model?.id}`}
              </span>
            </p>
          </div>
          <div className="wizard-header-right">
            <div className="wizard-step-counter">
              Step {Math.min(safeIndex , steps.length)} of {totalStages}
            </div>
            <div className="wizard-progress">
              <div className="wizard-progress-bar">
                <div
                  className="wizard-progress-fill"
                  style={{ width: `${progress || 0}%` }}
                />
              </div>
              <span className="wizard-progress-label">{progress || 0}%</span>
            </div>
          </div>
        </div>

        {/* META ROW */}
        <div className="wizard-meta-row">
          <div className="wizard-meta-item">
            <span className="wizard-meta-label">Elapsed</span>
            <span className="wizard-meta-value">
              {formatDuration(elapsedSeconds)}
            </span>
          </div>
          <div className="wizard-meta-item">
            <span className="wizard-meta-label">Current Stage</span>
            <span className="wizard-meta-value">
              {steps.find(s => s.key === currentStage)?.label || currentStage}
            </span>
          </div>
          {stageDetails?.target && (
            <div className="wizard-meta-item">
              <span className="wizard-meta-label">Target</span>
              <span className="wizard-meta-value">
                {stageDetails.target}
              </span>
            </div>
          )}
          {stageDetails?.num_features && (
            <div className="wizard-meta-item">
              <span className="wizard-meta-label">Features</span>
              <span className="wizard-meta-value">
                {stageDetails.num_features}
              </span>
            </div>
          )}
        </div>

        {/* STEPS */}
        <div className="wizard-steps-wrapper">
          {steps.map((step, index) => {
            const status = getStepStatus(step.key, index);
            const isActive = status === 'active';
            const isNext = index === safeIndex + 1 && status === 'pending';
            const isLast = index === steps.length - 1;

            const labelClass = getStepLabelClass(status, isActive, isNext);

            return (
              <div key={step.key} className="wizard-step">
                <div className="wizard-timeline">
                  <div
                    className={`wizard-icon-wrapper ${
                      isActive ? 'wizard-icon-wrapper-active' : ''
                    }`}
                  >
                    {renderStepIcon(status, isNext)}
                    {isActive && <div className="active-pulse-ring" />}
                  </div>

                  {!isLast && (
                    <div className="wizard-connector">
                      <div
                        className={`wizard-connector-inner connector-${status}`}
                      />
                    </div>
                  )}
                </div>

                <div className={`wizard-label ${labelClass}`}>
                  <p>{step.label}</p>
                  {isActive && stageStatus === 'in_progress' && (
                    <span className="wizard-label-caption">
                      Working on this step…
                    </span>
                  )}
                  {status === 'completed' && !showSummary && (
                    <span className="wizard-label-caption wizard-label-caption-complete">
                      Completed
                    </span>
                  )}
                  {status === 'failed' && (
                    <span className="wizard-label-caption wizard-label-caption-failed">
                      Failed at this step
                    </span>
                  )}
                  {isNext && !showSummary && (
                    <span className="wizard-label-caption wizard-label-caption-next">
                      Coming up next
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* SUMMARY CARDS WHEN COMPLETED */}
        {/* {showSummary && (
          <div className="wizard-summary-container">
            <div className="wizard-summary-grid">
              <div className="wizard-summary-card summary-appear-1">
                <div className="wizard-summary-label">Retrained Version</div>
                <div className="wizard-summary-value">
                  {summary.version_number ?? '-'}
                </div>
              </div>

              <div className="wizard-summary-card summary-appear-2">
                <div className="wizard-summary-label">Retrained Rows</div>
                <div className="wizard-summary-value">
                  {summary.new_rows_added ?? '-'}
                </div>
              </div>

              <div className="wizard-summary-card summary-appear-3">
                <div className="wizard-summary-label">Trained Rows</div>
                <div className="wizard-summary-value">
                  {summary.total_data_rows ?? '-'}
                </div>
              </div>

              <div className="wizard-summary-card summary-appear-4">
                <div className="wizard-summary-label">Last Retrained Time</div>
                <div className="wizard-summary-value">
                  {formatDateTime(summary.updated_at)}
                </div>
              </div>
            </div>
          </div>
        )} */}





{showSummary && (
  <div className="wizard-summary-container">
    <div className="wizard-summary-grid">

      <div className="wizard-summary-card summary-appear-1">
        <div className="summary-content">
          <div>
            <div className="wizard-summary-label">Retrained Version</div>
            <div className="wizard-summary-value">
              {summary.version_number ?? '-'}
            </div>
          </div>
          <BadgeCheck className="summary-icon" />
        </div>
      </div>

      <div className="wizard-summary-card summary-appear-2">
        <div className="summary-content">
          <div>
            <div className="wizard-summary-label">Retrained Rows</div>
            <div className="wizard-summary-value">
              {summary.new_rows_added ?? '-'}
            </div>
          </div>
          <ListPlus className="summary-icon" />
        </div>
      </div>

      <div className="wizard-summary-card summary-appear-3">
        <div className="summary-content">
          <div>
            <div className="wizard-summary-label">Trained Rows</div>
            <div className="wizard-summary-value">
              {summary.total_data_rows ?? '-'}
            </div>
          </div>
          <Database className="summary-icon" />
        </div>
      </div>

      <div className="wizard-summary-card summary-appear-4">
        <div className="summary-content">
          <div>
            <div className="wizard-summary-label">Last Retrained Time</div>
            <div className="wizard-summary-value">
              {formatDateTime(summary.updated_at)}
            </div>
          </div>
          <Clock3 className="summary-icon" />
        </div>
      </div>

    </div>
  </div>
)}


{/* 
{showSummary && (
  <div className="wizard-summary-container">
    <div className="wizard-summary-grid">

      <div className="wizard-summary-card summary-appear-1">
        <div className="summary-content">
          <div>
            <div className="wizard-summary-label">Retrained Version</div>
            <div className="wizard-summary-value">
              {summary.version_number ?? '-'}
            </div>
          </div>
          <BadgeCheck className="summary-icon" />
        </div>
      </div>

      <div className="wizard-summary-card summary-appear-2">
        <div className="summary-content">
          <div>
            <div className="wizard-summary-label">Retrained Rows</div>
            <div className="wizard-summary-value">
              {summary.new_rows_added ?? '-'}
            </div>
          </div>
          <TableRowsSplit className="summary-icon" />
        </div>
      </div>

      <div className="wizard-summary-card summary-appear-3">
        <div className="summary-content">
          <div>
            <div className="wizard-summary-label">Trained Rows</div>
            <div className="wizard-summary-value">
              {summary.total_data_rows ?? '-'}
            </div>
          </div>
          <Database className="summary-icon" />
        </div>
      </div>

      <div className="wizard-summary-card summary-appear-4">
        <div className="summary-content">
          <div>
            <div className="wizard-summary-label">Last Retrained Time</div>
            <div className="wizard-summary-value">
              {formatDateTime(summary.updated_at)}
            </div>
          </div>
          <Clock className="summary-icon" />
        </div>
      </div>

    </div>
  </div>
)} */}


        {/* Optional Back button */}
        {/* {showSummary && (
          <div className="wizard-button-container">
            <button onClick={onBackToConfig} className="wizard-back-button">
              Back to Model Config
            </button>
          </div>
        )} */}
      </div>
    </div>
  );
};

export default ModelRetrainingWizard;




























// import React, { useState, useEffect, useRef } from 'react';
// import { API_BASE_URL } from '../service/service';
// import './ModelRetrainingWizard.css';

// const ModelRetrainingWizard = ({ 
//   showWizard = false, 
//   apiEndpoint = '/api/retrain/status',
//   onBackToConfig,
//   onFinished,         // <-- callback to parent when completed / failed
//   model
// }) => {
//   const [currentStage, setCurrentStage] = useState('started');   // step key
//   const [stageStatus, setStageStatus] = useState('in_progress'); // in_progress | completed | failed
//   const [isPolling, setIsPolling] = useState(true);
//   const [hasFailed, setHasFailed] = useState(false);

//   const [progress, setProgress] = useState(0);
//   const [completedStages, setCompletedStages] = useState(0);
//   const [totalStages, setTotalStages] = useState(8);
//   const [stageDetails, setStageDetails] = useState(null);

//   const [startedAt, setStartedAt] = useState(null);
//   const [completedAt, setCompletedAt] = useState(null);
//   const [elapsedSeconds, setElapsedSeconds] = useState(0);

//   const wizardRef = useRef(null);

//   const steps = [
//     { key: 'started',          label: 'Process Started' },
//     { key: 'data_loading',     label: 'Loading Data' },
//     { key: 'feature_mapping',  label: 'Mapping Features' },
//     { key: 'data_processing',  label: 'Processing Data' },
//     { key: 'model_training',   label: 'Training Model' },
//     { key: 'model_saving',     label: 'Saving Model' },
//     { key: 'database_update',  label: 'Updating Database' },
//     { key: 'model_evaluation', label: 'Evaluating Model' },
//     { key: 'completed',        label: 'Completed' }
//   ];

//   // ---- Polling API for status ----
//   useEffect(() => {
//     if (!showWizard || !isPolling || !model?.id) return;

//     const statusUrl = `${API_BASE_URL}${apiEndpoint}/${model.id}`;

//     const pollStatus = async () => {
//       try {
//         const response = await fetch(statusUrl, {
//           method: 'GET',
//           credentials: 'include',
//           headers: { 'Content-Type': 'application/json' }
//         });

//         if (!response.ok) {
//           console.error('Status API failed');
//           return;
//         }

//         const data = await response.json();
//         console.log(data)
//         // Sample:
//         // {
//         //   "model_id": 1,
//         //   "current_stage": "feature_mapping",
//         //   "stage_status": "in_progress",
//         //   "total_stages": 8,
//         //   "completed_stages": 2,
//         //   "progress_percentage": 25,
//         //   "stage_details": { "target": "Label", "num_features": 15 },
//         //   "started_at": "...",
//         //   "updated_at": "...",
//         //   "completed_at": null,
//         //   ...
//         // }

//         const stageKey   = data.current_stage || 'started';
//         const status     = data.stage_status || 'in_progress';

//         setCurrentStage(stageKey);
//         setStageStatus(status);
//         setProgress(data.progress_percentage ?? 0);
//         setCompletedStages(data.completed_stages ?? 0);
//         setTotalStages(data.total_stages ?? steps.length);
//         setStageDetails(data.stage_details ?? null);

//         if (data.started_at)   setStartedAt(data.started_at);
//         if (data.completed_at) setCompletedAt(data.completed_at);

//         if (status === 'failed') {
//           setHasFailed(true);
//           setIsPolling(false);
//           onFinished && onFinished('failed');
//         } else if (status === 'completed' || stageKey === 'completed') {
//           setIsPolling(false);
//           onFinished && onFinished('completed');
//         }
//       } catch (error) {
//         console.error('Error polling status:', error);
//       }
//     };

//     // initial + interval
//     pollStatus();
//     const intervalId = setInterval(pollStatus, 2000);

//     return () => clearInterval(intervalId);
//   }, [showWizard, isPolling, apiEndpoint, model, onFinished]); // eslint-disable-line react-hooks/exhaustive-deps

//   // ---- Live elapsed time (animated) ----
//   useEffect(() => {
//     if (!startedAt) return;

//     const startMs = new Date(startedAt).getTime();
//     let endMs = completedAt ? new Date(completedAt).getTime() : null;

//     const updateElapsed = () => {
//       const now = endMs || Date.now();
//       const diffSec = Math.max(0, Math.round((now - startMs) / 1000));
//       setElapsedSeconds(diffSec);
//     };

//     updateElapsed(); // initial

//     if (completedAt || stageStatus === 'completed' || hasFailed) {
//       // freeze at final value
//       updateElapsed();
//       return;
//     }

//     const intervalId = setInterval(updateElapsed, 1000);
//     return () => clearInterval(intervalId);
//   }, [startedAt, completedAt, stageStatus, hasFailed]);

//   // ---- Auto scroll page to wizard as progress updates ----
//   useEffect(() => {
//     if (showWizard && wizardRef.current) {
//       wizardRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
//     }
//   }, [showWizard, currentStage, stageStatus, progress]);

//   const formatDuration = (totalSeconds) => {
//     if (!totalSeconds || totalSeconds < 1) return 'Just started';
//     const mins = Math.floor(totalSeconds / 60);
//     const secs = totalSeconds % 60;
//     if (mins === 0) return `${secs}s`;
//     return `${mins}m ${secs}s`;
//   };

//   const currentIndex = steps.findIndex(s => s.key === currentStage);
//   const safeIndex = currentIndex === -1 ? 0 : currentIndex;

//   // Decide visual status of each step
//   const getStepStatus = (stepKey, index) => {
//     if (hasFailed || stageStatus === 'failed') {
//       if (index < completedStages) return 'completed';
//       if (index === safeIndex) return 'failed';
//       return 'pending';
//     }

//     if (index < completedStages) return 'completed';

//     if (index === safeIndex) {
//       if (stageStatus === 'completed') return 'completed';
//       if (stageStatus === 'failed') return 'failed';
//       return 'active';
//     }

//     return 'pending';
//   };

//   const renderStepIcon = (status, isNext) => {
//     if (status === 'completed') {
//       return (
//         <div className="icon-circle icon-completed">
//           <svg className="checkmark" viewBox="0 0 52 52">
//             <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
//             <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
//           </svg>
//         </div>
//       );
//     }

//     if (status === 'failed') {
//       return (
//         <div className="icon-circle icon-failed">
//           <svg className="crossmark" viewBox="0 0 52 52">
//             <circle className="crossmark-circle" cx="26" cy="26" r="25" fill="none" />
//             <path className="crossmark-line-left" fill="none" d="M16,16 l20,20" />
//             <path className="crossmark-line-right" fill="none" d="M36,16 l-20,20" />
//           </svg>
//         </div>
//       );
//     }

//     if (status === 'active') {
//       return (
//         <div className="icon-circle icon-active">
//           <div className="spinner">
//             {Array.from({ length: 8 }, (_, i) => (
//               <div key={i} className="spinner-blade"></div>
//             ))}
//           </div>
//         </div>
//       );
//     }

//     // pending / next
//     return (
//       <div className={`icon-circle icon-pending ${isNext ? 'icon-next-glow' : ''}`}>
//         <div className="pending-dot"></div>
//       </div>
//     );
//   };

//   const getStepColorClass = (status, isActive, isNext) => {
//     if (status === 'completed') return 'wizard-label-completed';
//     if (status === 'failed') return 'wizard-label-failed';
//     if (isActive) return 'wizard-label-active';
//     if (isNext) return 'wizard-label-next';
//     return 'wizard-label-pending';
//   };

//   const getFinalMessage = () => {
//     if (stageStatus === 'completed' || currentStage === 'completed') {
//       return {
//         text: 'Model retrained successfully',
//         colorClass: 'message-success-text',
//         containerClass: 'message-success'
//       };
//     }
//     if (hasFailed || stageStatus === 'failed') {
//       return {
//         text: 'Model retraining failed',
//         colorClass: 'message-error-text',
//         containerClass: 'message-error'
//       };
//     }
//     return null;
//   };

//   if (!showWizard) return null;

//   const finalMessage = getFinalMessage();
//   const showFinalMessage = Boolean(finalMessage);

//   return (
//     <div ref={wizardRef} className="wizard-container">
//       <div className="wizard-card">
//         <div className="wizard-header">
//           <div>
//             <h2 className="wizard-title">Model Retraining Progress</h2>
//             <p className="wizard-subtitle">
//               Model: <span className="wizard-model-name">{model?.name || `ID ${model?.id}`}</span>
//             </p>
//           </div>
//           <div className="wizard-header-right">
//             <div className="wizard-step-counter">
//               Step {Math.min(safeIndex + 1, steps.length)} of {totalStages}
//             </div>
//             <div className="wizard-progress">
//               <div className="wizard-progress-bar">
//                 <div
//                   className="wizard-progress-fill"
//                   style={{ width: `${progress || 0}%` }}
//                 />
//               </div>
//               <span className="wizard-progress-label">{progress || 0}%</span>
//             </div>
//           </div>
//         </div>

//         {/* Meta row: elapsed time + stage details */}
//         <div className="wizard-meta-row">
//           <div className="wizard-meta-item">
//             <span className="wizard-meta-label">Elapsed</span>
//             <span className="wizard-meta-value">{formatDuration(elapsedSeconds)}</span>
//           </div>
//           <div className="wizard-meta-item">
//             <span className="wizard-meta-label">Current Stage</span>
//             <span className="wizard-meta-value">
//               {steps.find(s => s.key === currentStage)?.label || currentStage}
//             </span>
//           </div>
//           {stageDetails?.target && (
//             <div className="wizard-meta-item">
//               <span className="wizard-meta-label">Target</span>
//               <span className="wizard-meta-value">{stageDetails.target}</span>
//             </div>
//           )}
//           {stageDetails?.num_features && (
//             <div className="wizard-meta-item">
//               <span className="wizard-meta-label">Features</span>
//               <span className="wizard-meta-value">{stageDetails.num_features}</span>
//             </div>
//           )}
//         </div>

//         {/* Steps (no internal min-height, grows naturally) */}
//         <div className="wizard-steps-wrapper">
//           {steps.map((step, index) => {
//             const status = getStepStatus(step.key, index);
//             const isActive = status === 'active';
//             const isNext = index === safeIndex + 1 && status === 'pending';
//             const isLast = index === steps.length - 1;

//             const labelClass = getStepColorClass(status, isActive, isNext);

//             return (
//               <div key={step.key} className="wizard-step">
//                 <div className="wizard-timeline">
//                   {/* icon */}
//                   <div className={`wizard-icon-wrapper ${isActive ? 'wizard-icon-wrapper-active' : ''}`}>
//                     {renderStepIcon(status, isNext)}
//                     {isActive && <div className="active-pulse-ring" />}
//                   </div>

//                   {/* connector line */}
//                   {!isLast && (
//                     <div className="wizard-connector">
//                       <div
//                         className={`wizard-connector-inner status-${status}`}
//                       />
//                     </div>
//                   )}
//                 </div>

//                 <div className={`wizard-label ${labelClass}`}>
//                   <p>{step.label}</p>
//                   {isActive && stageStatus === 'in_progress' && (
//                     <span className="wizard-label-caption">Working on this step…</span>
//                   )}
//                   {status === 'completed' && (
//                     <span className="wizard-label-caption wizard-label-caption-complete">
//                       Completed
//                     </span>
//                   )}
//                   {status === 'failed' && (
//                     <span className="wizard-label-caption wizard-label-caption-failed">
//                       Failed at this step
//                     </span>
//                   )}
//                   {isNext && (
//                     <span className="wizard-label-caption wizard-label-caption-next">
//                       Coming up next
//                     </span>
//                   )}
//                 </div>
//               </div>
//             );
//           })}
//         </div>

//         {/* Final Message */}
//         {showFinalMessage && (
//           <div className="wizard-message-container">
//             <div className={`wizard-message ${finalMessage.containerClass}`}>
//               <p className={`wizard-message-text ${finalMessage.colorClass}`}>
//                 {finalMessage.text}
//               </p>
//             </div>
//           </div>
//         )}

//         {/* Optional back button */}
//         {/* {showFinalMessage && (
//           <div className="wizard-button-container">
//             <button onClick={onBackToConfig} className="wizard-back-button">
//               Back to Model Config
//             </button>
//           </div>
//         )} */}
//       </div>
//     </div>
//   );
// };

// export default ModelRetrainingWizard;














































// import React, { useState, useEffect, useRef } from 'react';
// import { API_BASE_URL } from '../service/service';
// import './ModelRetrainingWizard.css';

// const ModelRetrainingWizard = ({ 
//   showWizard = false, 
//   apiEndpoint = '/api/model-status',
//   onBackToConfig ,
//   model
// }) => {
//   const [currentStatus, setCurrentStatus] = useState('started');
//   const [isPolling, setIsPolling] = useState(true);
//   const [hasFailed, setHasFailed] = useState(false);
//   const [completedSteps, setCompletedSteps] = useState(new Set(['started']));
//   const [animatingSteps, setAnimatingSteps] = useState(new Set());
//   const scrollContainerRef = useRef(null);
//   const currentStepRef = useRef(null);
//   const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);

//   const steps = [
//     { key: 'started', label: 'Process Started' },
//     { key: 'data_loading', label: 'Loading Data' },
//     { key: 'feature_mapping', label: 'Mapping Features' },
//     { key: 'data_processing', label: 'Processing Data' },
//     { key: 'model_training', label: 'Training Model' },
//     { key: 'model_saving', label: 'Saving Model' },
//     { key: 'database_update', label: 'Updating Database' },
//     { key: 'model_evaluation', label: 'Evaluating Model' },
//     { key: 'completed', label: 'Completed' }
//   ];

//   useEffect(() => {
//     if (!showWizard || !isPolling) return;

//     const pollStatus = async () => {
//       try {
// const response = await fetch(`${API_BASE_URL}/api/retrain/status/${model.id}`,
//         {
//             method: 'GET',
//             credentials: 'include',
//             headers: { 'Content-Type': 'application/json' }
//         }
//     );
//         const data = await response.json();
//         console.log(data)
//         const status = data.stage_status;

//         setCurrentStatus(status);

//         // Mark all previous steps as completed
//         const currentIndex = steps.findIndex(s => s.key === status);
//         if (currentIndex !== -1) {
//           const newCompletedSteps = new Set();
//           const newAnimatingSteps = new Set();
          
//           for (let i = 0; i <= currentIndex; i++) {
//             newCompletedSteps.add(steps[i].key);
            
//             // Add to animating set if it's newly completed
//             if (!completedSteps.has(steps[i].key)) {
//               newAnimatingSteps.add(steps[i].key);
//             }
//           }
          
//           setCompletedSteps(newCompletedSteps);
//           setAnimatingSteps(newAnimatingSteps);
          
//           // Clear animating steps after animation completes
//           setTimeout(() => {
//             setAnimatingSteps(new Set());
//           }, 1000);
//         }

//         if (status === 'completed' || status === 'failed') {
//           setIsPolling(false);
//           if (status === 'failed') {
//             setHasFailed(true);
//           }
//         }
//       } catch (error) {
//         console.error('Error polling status:', error);
//       }
//     };

//     // Initial poll
//     pollStatus();

//     // Set up polling interval
//     const intervalId = setInterval(pollStatus, 2000);

//     return () => clearInterval(intervalId);
//   }, [showWizard, isPolling, apiEndpoint]);

//   // Auto-scroll to center the current step (only if auto-scroll is enabled)
//   useEffect(() => {
//     if (isAutoScrollEnabled && currentStepRef.current && scrollContainerRef.current) {
//       const container = scrollContainerRef.current;
//       const element = currentStepRef.current;
      
//       const containerHeight = container.clientHeight;
//       const elementTop = element.offsetTop;
//       const elementHeight = element.clientHeight;
      
//       // Calculate scroll position to center the element
//       const scrollTo = elementTop - (containerHeight / 2) + (elementHeight / 2);
      
//       container.scrollTo({
//         top: scrollTo,
//         behavior: 'smooth'
//       });
//     }
//   }, [currentStatus, isAutoScrollEnabled]);

//   // Detect manual scrolling to disable auto-scroll temporarily
//   const handleScroll = () => {
//     if (scrollContainerRef.current && currentStepRef.current) {
//       const container = scrollContainerRef.current;
//       const element = currentStepRef.current;
      
//       const containerHeight = container.clientHeight;
//       const elementTop = element.offsetTop;
//       const elementHeight = element.clientHeight;
//       const scrollTop = container.scrollTop;
      
//       const centeredScrollPosition = elementTop - (containerHeight / 2) + (elementHeight / 2);
      
//       // If user scrolls away from centered position, disable auto-scroll
//       if (Math.abs(scrollTop - centeredScrollPosition) > 20) {
//         setIsAutoScrollEnabled(false);
        
//         // Re-enable auto-scroll after 3 seconds of no scrolling
//         clearTimeout(window.scrollTimeout);
//         window.scrollTimeout = setTimeout(() => {
//           setIsAutoScrollEnabled(true);
//         }, 3000);
//       }
//     }
//   };

//   const getStepStatus = (stepKey, index) => {
//     const currentIndex = steps.findIndex(s => s.key === currentStatus);
    
//     if (hasFailed) {
//       // If failed, completed steps are green, remaining are red
//       if (completedSteps.has(stepKey)) {
//         return 'completed';
//       } else {
//         return 'failed';
//       }
//     }
    
//     if (completedSteps.has(stepKey)) {
//       // Check if this is the current active step
//       if (index === currentIndex && currentStatus !== 'completed') {
//         return 'active';
//       }
//       return 'completed';
//     }
    
//     return 'pending';
//   };

//   const shouldShowStep = (stepKey, index) => {
//     const currentIndex = steps.findIndex(s => s.key === currentStatus);
    
//     // Show all completed steps, current step, and next step
//     return index <= currentIndex + 1;
//   };

//   const renderStepIcon = (status, isAnimating) => {
//     switch (status) {
//       case 'completed':
//         return (
//           <div className={`icon-circle icon-completed ${isAnimating ? 'icon-completing' : ''}`}>
//             <svg className="checkmark" viewBox="0 0 52 52">
//               <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
//               <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
//             </svg>
//           </div>
//         );
//       case 'failed':
//         return (
//           <div className="icon-circle icon-failed">
//             <svg className="crossmark" viewBox="0 0 52 52">
//               <circle className="crossmark-circle" cx="26" cy="26" r="25" fill="none"/>
//               <path className="crossmark-line-left" fill="none" d="M16,16 l20,20"/>
//               <path className="crossmark-line-right" fill="none" d="M36,16 l-20,20"/>
//             </svg>
//           </div>
//         );
//       case 'active':
//         return (
//           <div className="icon-circle icon-active">
//             <div className="spinner">
//               <div className="spinner-blade"></div>
//               <div className="spinner-blade"></div>
//               <div className="spinner-blade"></div>
//               <div className="spinner-blade"></div>
//               <div className="spinner-blade"></div>
//               <div className="spinner-blade"></div>
//               <div className="spinner-blade"></div>
//               <div className="spinner-blade"></div>
//             </div>
//           </div>
//         );
//       default:
//         return (
//           <div className="icon-circle icon-pending">
//             <div className="pending-dot"></div>
//           </div>
//         );
//     }
//   };

//   const getStepColor = (status) => {
//     switch (status) {
//       case 'completed':
//         return 'text-green-700';
//       case 'failed':
//         return 'text-red-700';
//       case 'active':
//         return 'text-blue-700 font-semibold';
//       default:
//         return 'text-gray-400';
//     }
//   };

//   const getConnectorColor = (status, nextStatus) => {
//     if (status === 'completed' && nextStatus !== 'pending') {
//       return 'bg-green-500';
//     } else if (status === 'failed' || nextStatus === 'failed') {
//       return 'bg-red-500';
//     } else if (status === 'active') {
//       return 'bg-blue-500';
//     }
//     return 'bg-gray-300';
//   };

//   const getFinalMessage = () => {
//     if (currentStatus === 'completed') {
//       return {
//         text: 'Model retrained Successfully',
//         color: 'text-green-600',
//         bgColor: 'bg-green-50',
//         borderColor: 'border-green-200'
//       };
//     } else if (hasFailed) {
//       return {
//         text: 'Model retraining Failed',
//         color: 'text-red-600',
//         bgColor: 'bg-red-50',
//         borderColor: 'border-red-200'
//       };
//     }
//     return null;
//   };

//   if (!showWizard) return null;

//   const finalMessage = getFinalMessage();
//   const showFinalMessage = currentStatus === 'completed' || hasFailed;
//   const currentIndex = steps.findIndex(s => s.key === currentStatus);

//   return (
//     <div className="wizard-container">
//       <div className="wizard-card">
//         <div className="wizard-header">
//           <h2 className="wizard-title">
//             Model Retraining Progress
//           </h2>
//           <div className="wizard-step-counter">
//             Step {currentIndex + 1} of {steps.length}
//           </div>
//         </div>

//         {/* Fixed Height Scrollable Card */}
//         <div 
//           ref={scrollContainerRef}
//           onScroll={handleScroll}
//           className="wizard-scroll-container"
//         >
//           <div className="wizard-steps-wrapper">
//             {steps.map((step, index) => {
//               if (!shouldShowStep(step.key, index)) return null;

//               const status = getStepStatus(step.key, index);
//               const isActive = index === currentIndex && currentStatus !== 'completed';
//               const isLastVisibleStep = index === currentIndex + 1;
//               const showConnector = !isLastVisibleStep && shouldShowStep(steps[index + 1]?.key, index + 1);
//               // const nextStepStatus = showConnector ? getStepStatus(steps[index + 1].key, index + 1) : 'pending';
//                const nextStepStatus = showConnector && steps[index + 1]
//   ? getStepStatus(steps[index + 1].key, index + 1)
//   : 'pending';
//               const isAnimating = animatingSteps.has(step.key);
//               const isCompleted = status === 'completed';

//               return (
//                 <div 
//                   key={step.key} 
//                   ref={isActive ? currentStepRef : null}
//                   className={`wizard-step ${isActive ? 'wizard-step-active' : ''}`}
//                 >
//                   {/* Connector Line with Animation */}
//                   {showConnector && (
//                     <div className="wizard-connector-wrapper">
//                       <div 
//                         className={`wizard-connector ${getConnectorColor(status, nextStepStatus)} ${
//                           completedSteps.has(steps[index + 1]?.key) && animatingSteps.has(steps[index + 1]?.key)
//                             ? 'connector-animate'
//                             : ''
//                         }`}
//                         style={{
//                           height: completedSteps.has(steps[index + 1]?.key) ? '100%' : '0%',
//                         }}
//                       />
//                     </div>
//                   )}

//                   {/* Icon with Enhanced Animation */}
//                   <div 
//                     className={`wizard-icon-wrapper ${
//                       isActive ? 'wizard-icon-active' : ''
//                     }`}
//                   >
//                     {renderStepIcon(status, isAnimating && isCompleted)}
                    
//                     {/* Completion Ring Effect */}
//                     {isAnimating && isCompleted && (
//                       <>
//                         <div className="pulse-ring pulse-ring-1" />
//                         <div className="pulse-ring pulse-ring-2" />
//                       </>
//                     )}
//                   </div>

//                   {/* Label with Enhanced Animation */}
//                   <div 
//                     className={`wizard-label ${getStepColor(status)} ${
//                       isActive ? 'wizard-label-active' : 'wizard-label-inactive'
//                     } ${isAnimating && isCompleted ? 'step-label-animate' : ''}`}
//                   >
//                     <p className={isActive ? 'font-semibold' : ''}>
//                       {step.label}
//                     </p>
//                   </div>

//                   {/* Active Step Pulse Effect */}
//                   {isActive && (
//                     <div className="active-pulse-ring" />
//                   )}
//                 </div>
//               );
//             })}
//           </div>
//         </div>

//         {/* Scroll Hint */}
//         {!showFinalMessage && currentIndex > 1 && (
//           <div className="wizard-scroll-hint">
//             Scroll to view previous steps
//           </div>
//         )}

//         {/* Final Message */}
//         {showFinalMessage && finalMessage && (
//           <div className="wizard-message-container">
//             <div 
//               className={`wizard-message ${finalMessage.bgColor} ${finalMessage.borderColor} message-animate`}
//             >
//               <p className={`wizard-message-text ${finalMessage.color}`}>
//                 {finalMessage.text}
//               </p>
//             </div>
//           </div>
//         )}

//         {/* Back Button */}
//         {/* {showFinalMessage && (
//           <div className="wizard-button-container">
//             <button
//               onClick={onBackToConfig}
//               className="wizard-back-button"
//             >
//               Back to Model Config
//             </button>
//           </div>
//         )} */}
//       </div>
//     </div>
//   );
// };

// export default ModelRetrainingWizard;
