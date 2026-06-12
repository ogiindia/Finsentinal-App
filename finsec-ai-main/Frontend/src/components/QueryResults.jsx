import React, { useEffect, useState, useRef } from 'react';
import { Table, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../service/service';

// const QueryResults = ({ 
//   alertResponse,
//   currentPage, 
//   setCurrentPage, 
//   alertQuery,
//   rowsPerPage, 
//   themeColor 
// }) => {

const QueryResults = ({
  alertResponse,
  alertQuery,
  currentPage,
  setCurrentPage,
  rowsPerPage,
  themeColor,
  openDropdown,
  closeDropdown,
  payload,
  modelColumns,
  searchTerms,
  featureMappings,
  setOpenDropdowns,
  openDropdowns,
  dropdownRefs,
  handleSearchChange,
  handleMappingChange,
  toggleDropdown,
  selectedModel,
  getmodelname
}) => {
  // Only UI logic here


  // console.log(alertResponse)

  //   const callApi = async (model) => {
  //     try {
  //         const response = await fetch('/your-api-endpoint', {
  //             method: 'POST',
  //             headers: { 'Content-Type': 'application/json' },
  //             body: JSON.stringify({
  //                 id: model.id,
  //                 model_name: model.model_name,
  //                 model_type: model.model_type
  //             })
  //         });
  //         const data = await response.json();
  //         console.log('API Response:', data);
  //     } catch (error) {
  //         console.error('API Error:', error);
  //     }
  // };





  // const payload = [
  //     {
  //         id: 12,
  //         model_name: "Sample_test",
  //         model_filename: "bbccd25f-60da-416a-a1cd-2e723d20d508.onnx",
  //         model_type: "supervised",
  //         target_column: "Is_Fraud"
  //     },
  //     {
  //         id: 13,
  //         model_name: "Sample_test_2",
  //         model_filename: "12c75fad-3ab6-4978-8d94-35b4749c67a3.onnx",
  //         model_type: "unsupervised",
  //         target_column: null
  //     },
  //     {
  //         id: 14,
  //         model_name: "Sample_model_3",
  //         model_filename: "9c7ccd1d-7cc5-47c0-9a8d-24121a212bfd.onnx",
  //         model_type: "unsupervised",
  //         target_column: null
  //     }
  // ];






  // const [searchTerms, setSearchTerms] = useState({});
  // const [openDropdowns, setOpenDropdowns] = useState({});
  // const [featureMappings, setFeatureMappings] = useState({});
  // const dropdownRefs = useRef({});

  // const modelColumns = ['Select Model']; // define columns

  // const handleSearchChange = (col, value) => {
  //   setSearchTerms(prev => ({ ...prev, [col]: value }));
  // };

  // const handleMappingChange = (col, value) => {
  //   setFeatureMappings(prev => ({ ...prev, [col]: value }));
  //   setOpenDropdowns(prev => ({ ...prev, [col]: false }));
  // };

  // const toggleDropdown = (col) => {
  //   setOpenDropdowns(prev => ({ ...prev, [col]: !prev[col] }));
  // };









































































































































  // useEffect(() => {
  //   getmodelname();
  // }, []);

  // const handleSearchChange = (col, value) => {
  //   setSearchTerms(prev => ({ ...prev, [col]: value }));
  // };

  // const handleMappingChange = (col, value) => {
  //   setFeatureMappings(prev => ({ ...prev, [col]: value }));
  //   setOpenDropdowns(prev => ({ ...prev, [col]: false }));
  // };

  // const toggleDropdown = (col) => {
  //   setOpenDropdowns(prev => ({ ...prev, [col]: !prev[col] }));
  // };


  //   const getmodelname = async () => {

  //     try {
  //       const Alertcategery = alertQuery?.category;
  //         const response = await fetch(`${API_BASE_URL}/model_config/list_by_category/${(Alertcategery)}`, {
  //           method: 'GET',
  //           headers: {
  //             'Content-Type': 'application/json',
  //           },
  //         });
  //         const data = await response.json();
  //         console.log(data.models);
  //               console.log(data.models);
  //     setPayload(data.models || []);

  //     // Set default selection and call API
  //     if (data.models && data.models.length > 0) {
  //       const defaultModel = data.models[0];
  //       const col = modelColumns[0];
  //       setFeatureMappings({ [col]: defaultModel.model_name });
  //       setSearchTerms({ [col]: defaultModel.model_name });
  //       callApi(defaultModel);
  //     }
  //         // return data.models;
  //       } catch (err) {
  //         console.error('Table API error:', err);
  //         return null;
  //       }
  //   }


  // const [payload, setPayload] = useState([]);
  // const [searchTerms, setSearchTerms] = useState({});
  // const [openDropdowns, setOpenDropdowns] = useState({});
  // const [featureMappings, setFeatureMappings] = useState({});
  // const dropdownRefs = useRef({});
  // const modelColumns = ['Select Model'];

  // const callApi = async (model) => {
  //   console.log(model)
  //   try {
  //     const response = await fetch('/your-api-endpoint', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({
  //         id: model.id,
  //         model_name: model.model_name,
  //         model_type: model.model_type
  //       })
  //     });
  //     const data = await response.json();
  //     console.log('API Response:', data);
  //   } catch (error) {
  //     console.error('API Error:', error);
  //   }
  // };

  const navigate = useNavigate();
  const handleViewAnalysis = (row) => {
    // const selectedModel = await getmodelname(row);
    // console.log(selectedModel)
    // getmodelname(row)

    if (selectedModel) {
      navigate('/dashboardanalysis', {
        state: {
          rowData: row,
          selectedModel
        }
      });
    } else {
      // console.log('not found')
    }
  };





































































  if (!alertResponse || !alertResponse.data || alertResponse.data.length === 0) {
    return (
      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          color: '#9ca3af'
        }}>
          <Table
            size={64}
            style={{
              margin: '0 auto 1rem',
              strokeWidth: 1
            }}
          />
          <p style={{
            fontSize: '1.125rem',
            fontWeight: '500',
            marginBottom: '0.5rem'
          }}>
            No results yet
          </p>
          <p style={{ fontSize: '0.875rem' }}>
            Execute a query to see results
          </p>
        </div>
      </div>
    );
  }
  const columns = alertResponse.columns || [];
  const data = alertResponse.data || [];
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = data.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(data.length / rowsPerPage);
  return (
    <div style={{
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '0.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1rem'
        }}>
          <Table size={24} color={themeColor} />
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: themeColor,
            margin: 0
          }}>
            Query Results
          </h2>
          {alertResponse.recordCount && (
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              ({alertResponse.recordCount} records)
            </span>
          )}
        </div>




        {/* <div style={{ maxHeight: 'auto', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}> */}

        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '0.5rem',
          marginRight: '1rem'
        }}>
          <>
            {modelColumns.map((col) => (
              <div key={col} >
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#6b7280' }}>
                  {col}
                </label>
                <div style={{ position: 'relative', paddingBottom: '16px' }} ref={el => dropdownRefs.current[col] = el}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="text"
                      // value={featureMappings[col] || searchTerms[col] || ''}
                      value={openDropdowns[col] ? (searchTerms[col] ?? '') : (featureMappings[col] ?? '')}
                      onChange={(e) => handleSearchChange(col, e.target.value)}
                      // onFocus={() => setOpenDropdowns(prev => ({ ...prev, [col]: true }))}
                      // onFocus={() => toggleDropdown(col, true)}
                      onFocus={() => openDropdown(col)}
                      onBlur={() => {
                        // Give time for click selection inside dropdown
                        setTimeout(() => {
                          closeDropdown(col);
                          // Clear query after closing
                          handleSearchChange(col, '');
                        }, 150);
                      }}
                      placeholder="Select any Model.."
                      style={{ flex: 1, padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
                    />
                    <button
                      onClick={() => toggleDropdown(col)}
                      style={{ padding: '10px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer' }}
                    >
                      ▼
                    </button>
                  </div>

                  {openDropdowns[col] && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
                      background: 'white', border: '1px solid #d1d5db', borderRadius: '8px',
                      maxHeight: '200px', overflowY: 'auto', zIndex: 1000,
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>

                      {payload.length === 0 ? (
                        <div style={{
                          padding: '10px 12px',
                          fontSize: '14px',
                          color: '#9ca3af',
                          textAlign: 'center'
                        }}>
                          No model found
                        </div>
                      ) : (
                        payload.filter(item =>
                          item.model_name.toLowerCase().includes(searchTerms[col]?.toLowerCase() || '')
                        ).map((model) => (
                          <div
                            key={model.id}
                            onClick={() => {
                              handleMappingChange(col, model.model_name);
                              // callApi(model);
                            }}
                            style={{
                              padding: '10px 12px', cursor: 'pointer',
                              fontSize: '14px', color: '#374151',
                              background: featureMappings[col] === model.model_name ? '#e0f2fe' : 'transparent',
                              borderBottom: '1px solid #f3f4f6'
                            }}
                          >
                            <div style={{ fontWeight: '600', fontSize: '15px' }}>{model.model_name}</div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>{model.model_type}</div>
                          </div>
                        ))
                      )}





                      {/* {payload.filter(item =>
                  item.model_name.toLowerCase().includes(searchTerms[col]?.toLowerCase() || '')
                ).map((model) => (
                  <div
                    key={model.id}
                    onClick={() => {
                      handleMappingChange(col, model.model_name);
                      // callApi(model);
                    }}
                    style={{
                      padding: '10px 12px', cursor: 'pointer',
                      fontSize: '14px', color: '#374151',
                      background: featureMappings[col] === model.model_name ? '#e0f2fe' : 'transparent',
                      borderBottom: '1px solid #f3f4f6'
                    }}
                  >
                    <div style={{ fontWeight: '600', fontSize: '15px' }}>{model.model_name}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{model.model_type}</div>
                  </div>
                ))} */}



                    </div>
                  )}
                </div>
              </div>
            ))}
          </>


        </div>

      </div>





      {/* add dropdown and one search feild */}
      <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
        <table style={{
          width: 'max-content',
          minWidth: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.875rem',
          border: '1px solid #e5e7eb'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <th style={{
                padding: '0.75rem',
                textAlign: 'left',
                fontWeight: '600',
                color: '#374151',
                border: '1px solid #e5e7eb',
                backgroundColor: '#f9fafb',
                width: '60px'
              }}>
                #
              </th>
              {columns.map((col, idx) => (
                <th key={idx} style={{
                  padding: '0.75rem',
                  textAlign: 'left',
                  fontWeight: '600',
                  color: '#374151',
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#f9fafb',
                  whiteSpace: 'nowrap'
                }}>
                  {col.replace(/_X0020_/g, ' ')}
                </th>
              ))}
              <th style={{
                padding: '0.75rem',
                textAlign: 'left',
                fontWeight: '600',
                color: '#374151',
                border: '1px solid #e5e7eb',
                // backgroundColor: '#f9fafb',
                width: '140px',
                position: 'sticky',
                right: 0,
                backgroundColor: '#f9fafb',
                zIndex: 1
              }}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {currentRows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                style={{
                  backgroundColor: rowIdx % 2 === 0 ? 'white' : '#f9fafb'
                }}
              >
                <td style={{
                  padding: '0.75rem',
                  border: '1px solid #e5e7eb',
                  color: '#6b7280'
                }}>
                  {indexOfFirstRow + rowIdx + 1}
                </td>
                {columns.map((col, colIdx) => (
                  <td key={colIdx} style={{
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    color: '#374151',
                    whiteSpace: 'nowrap',
                    maxWidth: '300px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {row[col] !== null && row[col] !== undefined ? row[col] : '-'}
                  </td>
                ))}
                <td style={{
                  padding: '0.75rem',
                  border: '1px solid #e5e7eb',
                  position: 'sticky',
                  right: 0,
                  backgroundColor: rowIdx % 2 === 0 ? 'white' : '#f9fafb',
                  zIndex: 1
                }}>
                  <button
                    onClick={() => handleViewAnalysis(row)}
                    style={{
                      backgroundColor: themeColor,
                      color: 'white',
                      border: 'none',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    View Analysis
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '1rem',
        borderTop: '1px solid #e5e7eb'
      }}>
        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          Showing {indexOfFirstRow + 1} to {Math.min(indexOfLastRow, data.length)} of {data.length} entries
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            style={{
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.25rem',
              backgroundColor: currentPage === 1 ? '#f3f4f6' : 'white',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{
            padding: '0.5rem 0.75rem',
            fontSize: '0.875rem',
            color: '#374151'
          }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            style={{
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.25rem',
              backgroundColor: currentPage === totalPages ? '#f3f4f6' : 'white',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default QueryResults;





// const getmodelname = async () => {
//   try {
//     const Alertcategery = row?.CATEGORYFULLTITLE;
//     const response = await fetch(`${API_BASE_URL}/model_config/list_by_category/${Alertcategery}`, {
//       method: 'GET',
//       headers: { 'Content-Type': 'application/json' },
//     });
//     const data = await response.json();
//     console.log(data.models);
//     setPayload(data.models || []);

//     // Set default selection and call API
//     if (data.models && data.models.length > 0) {
//       const defaultModel = data.models[0];
//       const col = modelColumns[0];
//       setFeatureMappings({ [col]: defaultModel.model_name });
//       setSearchTerms({ [col]: defaultModel.model_name });
//       callApi(defaultModel);
//     }
//   } catch (err) {
//     console.error('Table API error:', err);
//   }
// };



















{/*
      {modelColumns.map((col) => (
        <div key={col} style={{ marginBottom: '16px' , width: '60%'}}>
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
                ▼
              </button>
            </div>

            {openDropdowns[col] && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
                background: 'white', border: '1px solid #d1d5db', borderRadius: '8px',
                maxHeight: '200px', overflowY: 'auto', zIndex: 1000,
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}>
                {payload.filter(item =>
                  item.model_name.toLowerCase().includes(searchTerms[col]?.toLowerCase() || '')
                ).map((model) => (
                  <div
                    key={model.id}
                    onClick={() => {
                      handleMappingChange(col, model.model_name);
                      callApi(model);
                    }}
                    style={{
                      padding: '10px 12px', cursor: 'pointer',
                      fontSize: '14px', color: '#374151',
                      background: featureMappings[col] === model.model_name ? '#e0f2fe' : 'transparent',
                      borderBottom: '1px solid #f3f4f6'
                    }}
                  >
                    <div style={{ fontWeight: '600', fontSize: '15px' }}>{model.model_name}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{model.model_type}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
  </div> */}



















{/* Dropdown and Search Field */ }
{/* <div style={{ marginBottom: '1rem' }}> */ }
{/* Dropdown (example using native select) */ }

{/* <select style={{
      padding: '0.5rem',
      borderRadius: '0.375rem',
      border: '1px solid #d1d5db',
      // width: '100%',
      marginBottom: '1rem'
    }}>
      <option value="">Select an option</option>
      <option value="option1">Option 1</option>
      <option value="option2">Option 2</option>
    </select> */}

{/* Dashed line */ }
{/* <div style={{
      borderTop: '1px dashed #d1d5db',
      marginBottom: '0.5rem'
    }}></div>

    
    <input
      type="text"
      placeholder="search..."
      onFocus={(e) => e.target.placeholder = ''}
      onBlur={(e) => e.target.placeholder = 'search...'}
      style={{
        width: '100%',
        padding: '0.5rem',
        border: 'none',
        outline: 'none',
        fontSize: '1rem',
        backgroundColor: '#f9fafb'
      }}
    /> */}
{/* </div> */ }


{/* <div style={{
  display: 'flex',
  alignItems: 'center',
  // backgroundColor: '#6a0dad', // Purple background
  padding: '1rem',
  borderRadius: '0.5rem'
}}>
  <div style={{
    display: 'flex',
    alignItems: 'center',
    border: '2px solid black',
    borderRadius: '9999px', // pill shape
    padding: '0.5rem 1rem',
    // width: '100%',
    color: 'black'
  }}> */}
{/* Search Icon */ }
{/* <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" style={{ marginRight: '0.5rem' }} viewBox="0 0 24 24">
      <path d="M10 2a8 8 0 105.293 14.293l4.707 4.707 1.414-1.414-4.707-4.707A8 8 0 0010 2zm0 2a6 6 0 110 12 6 6 0 010-12z"/>
    </svg> */}

{/* Search Input */ }
{/* <input
      type="text"
      placeholder="Search"
      style={{
        flex: 1,
        background: 'transparent',
        border: 'none',
        outline: 'none',
        color: 'black',
        fontSize: '1rem'
      }}
      onFocus={(e) => e.target.placeholder = ''}
      onBlur={(e) => e.target.placeholder = 'Search'}
    />
  </div>
</div> */}











{/* <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#374151' }}>
                                    Model's({Object.values(featureMappings).filter(v => v).length}/{modelColumns.length})
                                </h3>
                                <button
                                    onClick={handleClearMapping}
                                    style={{ padding: '8px 16px', background: '#ef4444', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                >
                                    <Trash2 size={16} />
                                    Clear All
                                </button>
                            </div> */}



{/* <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
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
                            </div> */}





