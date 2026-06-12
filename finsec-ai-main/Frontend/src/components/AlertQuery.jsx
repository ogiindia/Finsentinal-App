import React from 'react';
import { AlertCircle, Loader2, Search, Plus, X } from 'lucide-react';

const AlertQuery = ({
  alertQuery,
  setAlertQuery,
  alertCategories,
  categoriesLoading,
  handleAlertQuery,
  addFieldName,
  updateFieldName,
  removeFieldName,
  loading,
  error,
  themeColor
}) => {
  const fields = alertQuery?.fields || [];

// console.log(alertQuery)

  return (
    <div style={{
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '0.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '2rem'
    }}>
      <h2 style={{
        fontSize: '1.25rem',
        fontWeight: '600',
        color: themeColor,
        marginBottom: '1rem'
      }}>
        Alert Filter
      </h2>

      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '1px solid #ef4444',
          borderRadius: '0.375rem',
          padding: '0.75rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={20} color="#ef4444" />
          <span style={{ color: '#991b1b', fontSize: '0.875rem' }}>
            {String(error)}
          </span>
        </div>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '0.5rem'
        }}>
          Category
        </label>
        {categoriesLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Loader2 size={20} className="animate-spin" />
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Loading categories...
            </span>
          </div>
        ) : (
          <select
            value={alertQuery?.category || ''}
            onChange={(e) => {
              const updatedQuery = { ...alertQuery, category: e.target.value };
              setAlertQuery(updatedQuery); // This will trigger the useEffect to save to localStorage
            }}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              boxSizing: 'border-box'
            }}
          >
            <option value="">Select a category</option>
            {alertCategories.map((cat, idx) => (
              <option key={idx} value={cat}>{cat}</option>
            ))}
          </select>
          // <select
          //   value={alertQuery?.category || ''}
          //   onChange={(e) => setAlertQuery({ ...alertQuery, category: e.target.value })}
          //   style={{
          //     width: '100%',
          //     padding: '0.5rem',
          //     border: '1px solid #d1d5db',
          //     borderRadius: '0.375rem',
          //     fontSize: '0.875rem',
          //     boxSizing: 'border-box'
          //   }}
          // >
          //   <option value="">Select a category</option>
          //   {alertCategories.map((cat, idx) => (
          //     <option key={idx} value={cat}>{cat}</option>
          //   ))}
          // </select>
        )}
      </div>



      <button
        onClick={handleAlertQuery}
        disabled={loading}
        style={{
          backgroundColor: themeColor,
          color: 'white',
          border: 'none',
          padding: '0.75rem 1.5rem',
          borderRadius: '0.375rem',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '0.875rem',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          opacity: loading ? 0.6 : 1
        }}
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Searching...
          </>
        ) : (
          <>
            <Search size={16} />
            Search
          </>
        )}
      </button>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default AlertQuery;



{/* <div style={{ marginBottom: '1rem' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '0.5rem' 
        }}>
          <label style={{ 
            fontSize: '0.875rem', 
            fontWeight: '500', 
            color: '#374151' 
          }}>
            Filter Fields
          </label>
          <button
            onClick={addFieldName}
            style={{
              backgroundColor: themeColor,
              color: 'white',
              border: 'none',
              padding: '0.375rem 0.75rem',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem'
            }}
          >
            <Plus size={16} />
            Add Field
          </button>
        </div>

        {fields.map((field, index) => (
          <div key={index} style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            marginBottom: '0.5rem' 
          }}>
            <input
              type="text"
              placeholder="Field name"
              value={field.name || ''}
              onChange={(e) => updateFieldName(index, 'name', e.target.value)}
              style={{
                flex: 1,
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            />
            <input
              type="text"
              placeholder="Value"
              value={field.value || ''}
              onChange={(e) => updateFieldName(index, 'value', e.target.value)}
              style={{
                flex: 1,
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            />
            {fields.length > 1 && (
              <button
                onClick={() => removeFieldName(index)}
                style={{
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        ))}
      </div> */}