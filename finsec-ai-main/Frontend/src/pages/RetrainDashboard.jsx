import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Database, AlertCircle, Check, X, Eye, Search } from 'lucide-react';

const RetrainDashboard = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState('Retrain');

  // Retrain Tab States
  const [externalExpanded, setExternalExpanded] = useState(false);
  const [alertExpanded, setAlertExpanded] = useState(false);
  
  // Input states
  const [externalInputs, setExternalInputs] = useState(['', '']);
  const [alertInputs, setAlertInputs] = useState(['', '']);
  
  // API validation states
  const [externalValidation, setExternalValidation] = useState([null, null]);
  const [alertValidation, setAlertValidation] = useState([null, null]);
  
  // Column data from API responses
  const [externalcol, setExternalcol] = useState(null);
  const [alertcol, setAlertcol] = useState(null);
  const [Availablevalue, setAvailablevalue] = useState([]);
  const [Availablecol, setAvailablecol] = useState([]);
  
  // Dropdown selections
  const [externalDropdowns, setExternalDropdowns] = useState({});
  const [alertDropdowns, setAlertDropdowns] = useState({});
  
  // Flags
  const [externalflag, setExternalflag] = useState(false);
  const [alertflag, setAlertflag] = useState(false);
  
  // Alert Table States
  const [tableData, setTableData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [columnFilters, setColumnFilters] = useState({});
  const [selectAll, setSelectAll] = useState(false);

  // Mock API call for input validation
  const validateInput = async (value, type, index) => {
    try {
      // Simulating API call
      const response = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value, type })
      });
      
      // Mock response for demo
      const isValid = value.trim().length > 0;
      const status = isValid ? 200 : 400;
      
      if (status === 200) {
        const mockData = { columns: ['Column1', 'Column2', 'Column3'] };
        
        if (type === 'external') {
          setExternalValidation(prev => {
            const newValidation = [...prev];
            newValidation[index] = true;
            return newValidation;
          });
          if (!externalcol) setExternalcol(mockData.columns);
        } else {
          setAlertValidation(prev => {
            const newValidation = [...prev];
            newValidation[index] = true;
            return newValidation;
          });
          if (!alertcol) setAlertcol(mockData.columns);
        }
      } else {
        if (type === 'external') {
          setExternalValidation(prev => {
            const newValidation = [...prev];
            newValidation[index] = false;
            return newValidation;
          });
        } else {
          setAlertValidation(prev => {
            const newValidation = [...prev];
            newValidation[index] = false;
            return newValidation;
          });
        }
      }
    } catch (error) {
      console.error('Validation error:', error);
      if (type === 'external') {
        setExternalValidation(prev => {
          const newValidation = [...prev];
          newValidation[index] = false;
          return newValidation;
        });
      } else {
        setAlertValidation(prev => {
          const newValidation = [...prev];
          newValidation[index] = false;
          return newValidation;
        });
      }
    }
  };

  // Validate input on blur or enter
  const validateInputOnBlur = (value, type, index) => {
    if (!value.trim()) return;
    
    // Check for valid extensions
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const hasValidExtension = validExtensions.some(ext => 
      value.toLowerCase().endsWith(ext)
    );
    
    if (hasValidExtension) {
      // Update the main state
      if (type === 'external') {
        const newInputs = [...externalInputs];
        newInputs[index] = value;
        setExternalInputs(newInputs);
      } else {
        const newInputs = [...alertInputs];
        newInputs[index] = value;
        setAlertInputs(newInputs);
      }
      
      // Call validation API
      validateInput(value, type, index);
    } else {
      // Update the main state first
      if (type === 'external') {
        const newInputs = [...externalInputs];
        newInputs[index] = value;
        setExternalInputs(newInputs);
      } else {
        const newInputs = [...alertInputs];
        newInputs[index] = value;
        setAlertInputs(newInputs);
      }
      
      // Set validation to false if extension is invalid
      if (type === 'external') {
        setExternalValidation(prev => {
          const newValidation = [...prev];
          newValidation[index] = false;
          return newValidation;
        });
      } else {
        setAlertValidation(prev => {
          const newValidation = [...prev];
          newValidation[index] = false;
          return newValidation;
        });
      }
    }
  };

  // Call /getvalue API when both columns are available
  useEffect(() => {
    const fetchAvailableValues = async () => {
      if (externalcol && alertcol) {
        try {
          const response = await fetch('/api/getvalue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ externalcol, alertcol })
          });
          
          // Mock response
          const mockValues = ['Value1', 'Value2', 'Value3', 'Value4', 'Value5'];
          const combinedCols = [...externalcol, ...alertcol];
          
          setAvailablevalue(mockValues);
          setAvailablecol(combinedCols);
          
          // Initialize dropdowns
          const externalDropdownInit = {};
          const alertDropdownInit = {};
          
          externalcol.forEach(col => {
            externalDropdownInit[col] = '';
          });
          alertcol.forEach(col => {
            alertDropdownInit[col] = '';
          });
          
          setExternalDropdowns(externalDropdownInit);
          setAlertDropdowns(alertDropdownInit);
        } catch (error) {
          console.error('Error fetching values:', error);
        }
      }
    };
    
    fetchAvailableValues();
  }, [externalcol, alertcol]);

  // Check if all dropdowns are selected
  useEffect(() => {
    if (Object.keys(externalDropdowns).length > 0) {
      const allSelected = Object.values(externalDropdowns).every(val => val !== '');
      if (allSelected) {
        setExternalflag(true);
      }
    }
  }, [externalDropdowns]);

  useEffect(() => {
    if (Object.keys(alertDropdowns).length > 0) {
      const allSelected = Object.values(alertDropdowns).every(val => val !== '');
      if (allSelected) {
        setAlertflag(true);
      }
    }
  }, [alertDropdowns]);

  // Get available values for dropdown (prevent duplicates)
  const getAvailableValues = (currentKey, isExternal) => {
    const selectedValues = isExternal 
      ? Object.entries(externalDropdowns)
          .filter(([key, val]) => key !== currentKey && val !== '')
          .map(([, val]) => val)
      : Object.entries(alertDropdowns)
          .filter(([key, val]) => key !== currentKey && val !== '')
          .map(([, val]) => val);
    
    return Availablevalue.filter(val => !selectedValues.includes(val));
  };

  // Fetch alert table data
  useEffect(() => {
    const fetchTableData = async () => {
      if (activeTab === 'Stats') {
        try {
          // Mock API call
          const mockData = [
            { id: 1, alert: 'High Risk Transaction', amount: 5000, date: '2024-01-15', status: 'Pending' },
            { id: 2, alert: 'Suspicious Pattern', amount: 3200, date: '2024-01-16', status: 'Reviewed' },
            { id: 3, alert: 'Multiple Transfers', amount: 8900, date: '2024-01-17', status: 'Pending' },
            { id: 4, alert: 'Large Withdrawal', amount: 12000, date: '2024-01-18', status: 'Flagged' },
            { id: 5, alert: 'Unusual Activity', amount: 4500, date: '2024-01-19', status: 'Reviewed' },
            { id: 6, alert: 'Cross-border Transfer', amount: 7800, date: '2024-01-20', status: 'Pending' },
            { id: 7, alert: 'Rapid Transactions', amount: 2300, date: '2024-01-21', status: 'Cleared' },
            { id: 8, alert: 'High Risk Merchant', amount: 6700, date: '2024-01-22', status: 'Flagged' },
          ];
          
          setTableData(mockData);
          setFilteredData(mockData);
        } catch (error) {
          console.error('Error fetching table data:', error);
        }
      }
    };
    
    fetchTableData();
  }, [activeTab]);

  // Apply filters and search
  useEffect(() => {
    let filtered = [...tableData];
    
    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(row => 
        Object.values(row).some(val => 
          String(val).toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
    
    // Apply column filters
    Object.entries(columnFilters).forEach(([column, filterValue]) => {
      if (filterValue) {
        filtered = filtered.filter(row => 
          String(row[column]).toLowerCase().includes(filterValue.toLowerCase())
        );
      }
    });
    
    setFilteredData(filtered);
    setCurrentPage(1);
  }, [searchQuery, columnFilters, tableData]);

  // Handle select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRows(new Set());
      setSelectAll(false);
    } else {
      const visibleRows = getCurrentPageData().map(row => row.id);
      setSelectedRows(new Set(visibleRows));
      setSelectAll(true);
    }
  };

  // Get current page data
  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredData.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  // Expandable Card Component
  const ExpandableCard = ({ title, icon: Icon, expanded, setExpanded, children }) => (
    <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden transition-all duration-300 hover:shadow-md">
      <div 
        className="flex items-center justify-between p-4 bg-white cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Icon className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-800">{title}</h3>
        </div>
        <div className="transform transition-transform duration-300" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <ChevronDown className="w-5 h-5 text-gray-500" />
        </div>
      </div>
      
      <div 
        className="overflow-hidden transition-all duration-300"
        style={{ 
          maxHeight: expanded ? '1000px' : '0px',
          opacity: expanded ? 1 : 0
        }}
      >
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          {children}
        </div>
      </div>
    </div>
  );

  // Input Field Component with local state
  const InputField = ({ initialValue, type, index, validation, placeholder }) => {
    const [localValue, setLocalValue] = useState(initialValue);

    useEffect(() => {
      setLocalValue(initialValue);
    }, [initialValue]);

    const handleBlur = () => {
      validateInputOnBlur(localValue, type, index);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        validateInputOnBlur(localValue, type, index);
      }
    };

    return (
      <div className="relative">
        <input
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
            validation === true 
              ? 'border-green-500 focus:ring-green-200 bg-green-50' 
              : validation === false 
              ? 'border-red-500 focus:ring-red-200 bg-red-50' 
              : 'border-gray-300 focus:ring-blue-200'
          }`}
        />
        {validation !== null && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {validation ? (
              <Check className="w-5 h-5 text-green-500" />
            ) : (
              <X className="w-5 h-5 text-red-500" />
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Model Retraining Dashboard</h1>
          <p className="text-gray-600">Configure and manage your model retraining process</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('Stats')}
              className={`flex-1 px-6 py-4 font-semibold transition-all ${
                activeTab === 'Stats'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              Stats
            </button>
            <button
              onClick={() => setActiveTab('Retrain')}
              className={`flex-1 px-6 py-4 font-semibold transition-all ${
                activeTab === 'Retrain'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              Retrain
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'Retrain' ? (
          <div className="space-y-6">
            {/* External Data Card */}
            <ExpandableCard 
              title="External Data" 
              icon={Database}
              expanded={externalExpanded}
              setExpanded={setExternalExpanded}
            >
              <p className="text-sm text-gray-600 mb-4">
                Enter the path of the external data (.csv, .xls, .xlsx)
              </p>
              
              <div className="space-y-3 mb-4">
                {externalInputs.map((input, index) => (
                  <InputField
                    key={index}
                    initialValue={input}
                    type="external"
                    index={index}
                    validation={externalValidation[index]}
                    placeholder={`External data path ${index + 1}`}
                  />
                ))}
              </div>

              {/* Dropdowns */}
              {Object.keys(externalDropdowns).length > 0 && (
                <div className="space-y-3 mt-4">
                  <h4 className="font-semibold text-gray-700 mb-2">Map Columns</h4>
                  {Object.keys(externalDropdowns).map((col) => (
                    <div key={col} className="flex items-center gap-3">
                      <label className="w-32 text-sm font-medium text-gray-700">{col}:</label>
                      <select
                        value={externalDropdowns[col]}
                        onChange={(e) => setExternalDropdowns(prev => ({ ...prev, [col]: e.target.value }))}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                      >
                        <option value="">Select value</option>
                        {getAvailableValues(col, true).map(val => (
                          <option key={val} value={val}>{val}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                  {externalflag && (
                    <div className="flex items-center gap-2 text-green-600 mt-2">
                      <Check className="w-5 h-5" />
                      <span className="text-sm font-medium">All columns mapped successfully</span>
                    </div>
                  )}
                </div>
              )}
            </ExpandableCard>

            {/* Alert Data Card */}
            <ExpandableCard 
              title="Alert Data" 
              icon={AlertCircle}
              expanded={alertExpanded}
              setExpanded={setAlertExpanded}
            >
              <p className="text-sm text-gray-600 mb-4">
                Enter the path of the alert data (.csv, .xls, .xlsx)
              </p>
              
              <div className="space-y-3 mb-4">
                {alertInputs.map((input, index) => (
                  <InputField
                    key={index}
                    initialValue={input}
                    type="alert"
                    index={index}
                    validation={alertValidation[index]}
                    placeholder={`Alert data path ${index + 1}`}
                  />
                ))}
              </div>

              {/* Dropdowns */}
              {Object.keys(alertDropdowns).length > 0 && (
                <div className="space-y-3 mt-4">
                  <h4 className="font-semibold text-gray-700 mb-2">Map Columns</h4>
                  {Object.keys(alertDropdowns).map((col) => (
                    <div key={col} className="flex items-center gap-3">
                      <label className="w-32 text-sm font-medium text-gray-700">{col}:</label>
                      <select
                        value={alertDropdowns[col]}
                        onChange={(e) => setAlertDropdowns(prev => ({ ...prev, [col]: e.target.value }))}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                      >
                        <option value="">Select value</option>
                        {getAvailableValues(col, false).map(val => (
                          <option key={val} value={val}>{val}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                  {alertflag && (
                    <div className="flex items-center gap-2 text-green-600 mt-2">
                      <Check className="w-5 h-5" />
                      <span className="text-sm font-medium">All columns mapped successfully</span>
                    </div>
                  )}
                </div>
              )}
            </ExpandableCard>

            {/* Retrain Button */}
            <div className="flex justify-end">
              <button
                disabled={!externalflag && !alertflag}
                className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                  externalflag || alertflag
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Retrain Model
              </button>
            </div>
          </div>
        ) : (
          // Stats Tab - Alert Table
          <div className="bg-white rounded-lg shadow-sm p-6">
            {/* Search and Rows Per Page */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Alert Statistics</h2>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value={10}>10 rows</option>
                  <option value={20}>20 rows</option>
                  <option value={30}>30 rows</option>
                  <option value={50}>50 rows</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      <div className="flex flex-col gap-1">
                        <span>ID</span>
                        <input
                          type="text"
                          placeholder="Filter..."
                          onChange={(e) => setColumnFilters(prev => ({ ...prev, id: e.target.value }))}
                          className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-200"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      <div className="flex flex-col gap-1">
                        <span>Alert</span>
                        <input
                          type="text"
                          placeholder="Filter..."
                          onChange={(e) => setColumnFilters(prev => ({ ...prev, alert: e.target.value }))}
                          className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-200"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      <div className="flex flex-col gap-1">
                        <span>Amount</span>
                        <input
                          type="text"
                          placeholder="Filter..."
                          onChange={(e) => setColumnFilters(prev => ({ ...prev, amount: e.target.value }))}
                          className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-200"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      <div className="flex flex-col gap-1">
                        <span>Date</span>
                        <input
                          type="text"
                          placeholder="Filter..."
                          onChange={(e) => setColumnFilters(prev => ({ ...prev, date: e.target.value }))}
                          className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-200"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      <div className="flex flex-col gap-1">
                        <span>Status</span>
                        <input
                          type="text"
                          placeholder="Filter..."
                          onChange={(e) => setColumnFilters(prev => ({ ...prev, status: e.target.value }))}
                          className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-200"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {getCurrentPageData().map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(row.id)}
                          onChange={() => {
                            const newSelected = new Set(selectedRows);
                            if (newSelected.has(row.id)) {
                              newSelected.delete(row.id);
                            } else {
                              newSelected.add(row.id);
                            }
                            setSelectedRows(newSelected);
                            setSelectAll(false);
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.id}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.alert}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">${row.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.date}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          row.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                          row.status === 'Reviewed' ? 'bg-blue-100 text-blue-800' :
                          row.status === 'Flagged' ? 'bg-red-100 text-red-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, filteredData.length)} of {filteredData.length} entries
                {selectedRows.size > 0 && ` • ${selectedRows.size} selected`}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 rounded-lg transition-colors ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RetrainDashboard;