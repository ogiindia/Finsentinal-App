import React, { useEffect, useMemo, useState } from "react";
import "./RetrainPopup.css";
import { API_BASE_URL } from '../service/service';
import { BrainCircuit, X } from 'lucide-react';
import ModelRetrainingWizard from "./ModelRetrainingWizard";

/**
 * rows: array of objects (CloasedAlertData)
 * model: { model_name, model_type, ... }
 * onClose: () => void
 * onSubmit: (selectedRows) => void
 */
export default function RetrainPopup({ open, rows = [], model, onClose, onSubmit, setIsPollingActive }) {
  const [selected, setSelected] = useState(new Set());
// console.log(model)

  // Reset selection when opening
  useEffect(() => {
    if (open) setSelected(new Set());
  }, [open]);


  // Choose a stable ID if you have one in your row objects
  const getRowId = (row, index) => row?.id ?? row?.ID ?? row?._id ?? index;

  const isChecked = (row, idx) => selected.has(getRowId(row, idx));
  const allChecked = rows.length > 0 && rows.every((r, i) => selected.has(getRowId(r, i)));
  const someChecked = selected.size > 0 && !allChecked;

  const toggleAll = (checked) => {
    if (checked) {
      const next = new Set();
      rows.forEach((r, i) => next.add(getRowId(r, i)));
      setSelected(next);
    } else {
      setSelected(new Set());
    }
  };

  const toggleRow = (row, idx) => {
    const id = getRowId(row, idx);
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };


  const [showWizard, setShowWizard] = useState(false);


  const handleBackToConfig = () => {
    setShowWizard(false);
    onClose()
    // Navigate back to config page
  };

  // Call this on your Submit button
  const handleSubmit = async () => {
    const selectedRows = rows.filter((r, i) => selected.has(getRowId(r, i)));
    // Do whatever you need: save, send to API, lift to parent, etc.
    // Example: onSubmit?.(selectedRows);
    // console.log("Selected rows array:", selectedRows.length);
    // console.log(selectedRows)
    if (selectedRows.length > 0) {
      // console.log(model.id)
      setIsPollingActive(true);
      // onClose()
      try {
        const response = await fetch(`${API_BASE_URL}/api/retrain/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model_id: model.id,
            data:
              selectedRows
            ,
            run_async: false
          }),
        });

        if (!response.ok) {
          throw new Error('API call failed');
        }
        const result = await response.json();
        setShowWizard(true)








        // console.log(result)
        // console.log('API Response:', result);
      } catch (error) {
        console.error('Error:', error);
      }






    }






  };


















































  // Columns: infer from all keys
  const columns = useMemo(() => {
    const keys = new Set();
    rows.forEach((r) => Object.keys(r || {}).forEach((k) => keys.add(k)));
    // Optional: put checkbox column first; we compute keys only for data columns
    return Array.from(keys);
  }, [rows]);

  // Helper to get a row id; fallback to index
  // const getRowId = (row, index) => {
  //   // Prefer a stable unique field if present
  //   return row?.id ?? row?.ID ?? row?._id ?? index;
  // };

  // const isChecked = (row, idx) => selected.has(getRowId(row, idx));
  // const allChecked = rows.length > 0 && rows.every((r, i) => selected.has(getRowId(r, i)));
  // const someChecked = selected.size > 0 && !allChecked;

  // const toggleAll = (checked) => {
  //   if (checked) {
  //     const next = new Set();
  //     rows.forEach((r, i) => next.add(getRowId(r, i)));
  //     setSelected(next);
  //   } else {
  //     setSelected(new Set());
  //   }
  // };

  // const toggleRow = (row, idx) => {
  //   const id = getRowId(row, idx);
  //   const next = new Set(selected);
  //   if (next.has(id)) next.delete(id);
  //   else next.add(id);
  //   setSelected(next);
  // };

  const handleReset = () => setSelected(new Set());

  // const handleSubmit = () => {
  //   if (selected.size === 0) return;
  //   const selectedRows = rows.filter((r, i) => selected.has(getRowId(r, i)));
  //   onSubmit?.(selectedRows);
  // };

  // close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="retrain-modal-overlay" aria-modal="true" role="dialog">
      <div className="retrain-modal">
        {/* Header */}
        <div className="retrain-header">
          <div className="retrain-icon" aria-hidden>
            <BrainCircuit />
            {/* Retrain / refresh-like icon (SVG) */}
            {/* <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v2.5a.5.5 0 0 0 .85.35l3.4-3.4a.5.5 0 0 0 0-.7l-3.4-3.4A.5.5 0 0 0 12 1V3a9 9 0 1 0 9 9h-2a7 7 0 1 1-7-7z" fill="#c8d0ff"/>
            </svg> */}
          </div>
          <div className="retrain-title-wrap">
            <div className="retrain-title">{model?.model_name ?? "Model"}</div>
            <div className="retrain-subtitle">{model?.model_type ?? "Type"}</div>
          </div>
          <button className="retrain-close" onClick={onClose} aria-label="Close">
            <X />
            {/* <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6L6 18" stroke="#e8ecf8" strokeWidth="2" strokeLinecap="round"/>
            </svg> */}
          </button>
        </div>








        {/* Body */}
        <div className="retrain-body">



{!showWizard ? (
  rows.length === 0 ? (
    <div className="retrain-empty-state">
      <button
        className="no-alert-btn"
        onClick={onClose}
        aria-label="Close popup - no alerts found"
      >
        {/* Optional icon */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 2a10 10 0 1010 10A10.011 10.011 0 0012 2zm1 15h-2v-2h2zm0-4h-2V7h2z" fill="currentColor" />
        </svg>
        No Alert Found
      </button>
    </div>
  ) : (
    <div className="retrain-table-wrap" role="region" aria-label="Closed alerts">
      <div className="retrain-table-scroll">
        <table className="retrain-table">
          <thead className="retrain-thead">
            <tr>
              <th style={{ width: 42 }}>
                <input
                  className="retrain-checkbox"
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => { if (el) el.indeterminate = someChecked; }}
                  onChange={(e) => toggleAll(e.target.checked)}
                  aria-label="Select all"
                />
              </th>
              {columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="retrain-tbody">
            {rows.map((row, idx) => (
              <tr key={getRowId(row, idx)}>
                <td>
                  <input
                    className="retrain-checkbox"
                    type="checkbox"
                    checked={isChecked(row, idx)}
                    onChange={() => toggleRow(row, idx)}
                    aria-label={`Select row ${idx + 1}`}
                  />
                </td>
                {columns.map((col) => (
                  <td key={col}>
                    <span className="truncate mono" title={String(row?.[col] ?? "")}>
                      {formatCell(row?.[col])}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
) : (
  <ModelRetrainingWizard
    showWizard={showWizard}
    apiEndpoint="/api/model-status"
    onBackToConfig={handleBackToConfig}
    model={model}
  />
)}





          {/* Footer */}
          {!showWizard && (





          <div className="retrain-footer">
            <div className="retrain-count">
              Selected: <strong>{selected.size}</strong> {selected.size === 1 ? "row" : "rows"}
            </div>
            <div className="retrain-actions">
              {selected.size > 0 && (
                <button className="btn btn-reset" onClick={handleReset}>
                  Reset
                </button>
              )}
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={selected.size === 0}
              >
                Submit
              </button>
            </div>
          </div>
          )}

          
        </div>



        {/* Body */}
        {/* <div className="retrain-body"> */}
        {/* Table */}





        {/* add dropdown and one search field (your controls can sit above this table) */}
        {/* <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
  <table
    style={{
      width: 'max-content',
      minWidth: '100%',
      borderCollapse: 'collapse',
      fontSize: '0.875rem',
      border: '1px solid #e5e7eb'
    }}
  >
    <thead>
      <tr style={{ backgroundColor: '#f3f4f6' }}>
        <th style={{ width: 42, border: '1px solid #e5e7eb', padding: '0.75rem' }}>
          <input
            className="retrain-checkbox"
            type="checkbox"
            checked={allChecked}
            ref={(el) => { if (el) el.indeterminate = someChecked; }}
            onChange={(e) => toggleAll(e.target.checked)}
            aria-label="Select all"
          />
        </th>

        {columns.map((col, idx) => (
          <th
            key={idx}
            style={{
              padding: '0.75rem',
              textAlign: 'left',
              fontWeight: '600',
              color: '#374151',
              border: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
              whiteSpace: 'nowrap'
            }}
          >
            {col.replace(/_X0020_/g, ' ')}
          </th>
        ))}
      </tr>
    </thead>

    <tbody>
      {rows.map((row, rowIdx) => (
        <tr
          key={getRowId(row, rowIdx)}
          style={{
            backgroundColor: rowIdx % 2 === 0 ? 'white' : '#f9fafb'
          }}
        >
          <td
            style={{
              padding: '0.75rem',
              border: '1px solid #e5e7eb',
              color: '#374151',
              whiteSpace: 'nowrap'
            }}
          >
            <input
              className="retrain-checkbox"
              type="checkbox"
              checked={isChecked(row, rowIdx)}
              onChange={() => toggleRow(row, rowIdx)}
              aria-label={`Select row ${rowIdx + 1}`}
            />
          </td>

          {columns.map((col, colIdx) => (
            <td
              key={colIdx}
              style={{
                padding: '0.75rem',
                border: '1px solid #e5e7eb',
                color: '#374151',
                whiteSpace: 'nowrap',
                maxWidth: '300px',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
              title={row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}
            >
              {row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
</div> */}











        {/* 
          <div className="retrain-table-wrap" role="region" aria-label="Closed alerts">
            <table className="retrain-table">
              <thead className="retrain-thead">
                <tr>
                  <th style={{ width: 42 }}>
                    <input
                      className="retrain-checkbox"
                      type="checkbox"
                      checked={allChecked}
                      ref={(el) => {
                        if (el) el.indeterminate = someChecked;
                      }}
                      onChange={(e) => toggleAll(e.target.checked)}
                      aria-label="Select all"
                    />
                  </th>
                  {columns.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="retrain-tbody">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} style={{ padding: "16px", textAlign: "center", color: "var(--muted)" }}>
                      No closed alerts found for this model.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr key={getRowId(row, idx)}>
                      <td>
                        <input
                          className="retrain-checkbox"
                          type="checkbox"
                          checked={isChecked(row, idx)}
                          onChange={() => toggleRow(row, idx)}
                          aria-label={`Select row ${idx + 1}`}
                        />
                      </td>
                      {columns.map((col) => (
                        <td key={col}>
                          <span className="truncate mono" title={String(row?.[col] ?? "")}>
                            {formatCell(row?.[col])}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div> */}

        {/* Footer */}
        {/* <div className="retrain-footer">
            <div className="retrain-count">
              Selected: <strong>{selected.size}</strong> {selected.size === 1 ? "row" : "rows"}
            </div>
            <div className="retrain-actions">
              {selected.size > 0 && (
                <button className="btn btn-reset" onClick={handleReset}>
                  Reset
                </button>
              )}
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={selected.size === 0}
              >
                Submit
              </button>
            </div>
          </div>
        </div> */}





      </div>
    </div>
  );
}

// Render values nicely in cells
function formatCell(value) {
  if (value == null) return "";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}
``