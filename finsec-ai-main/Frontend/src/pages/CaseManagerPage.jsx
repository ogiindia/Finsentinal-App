import React, { useState, useEffect , useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '../service/service';
import AlertQuery from '../components/AlertQuery';
import QueryResults from '../components/QueryResults';
import toast from 'react-hot-toast';

const CaseManagerPage = () => {
  const themeColor = '#012834';
  const navigate = useNavigate();

  const [alertCategories, setAlertCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [alertResponse, setAlertResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [syncing, setSyncing] = useState(false);

  const usePersistentState = (key, defaultValue) => {
    const [value, setValue] = useState(() => {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : defaultValue;
    });

    useEffect(() => {
      localStorage.setItem(key, JSON.stringify(value));
    }, [key, value]);

    return [value, setValue];
  };

  const [alertQuery, setAlertQuery] = usePersistentState('alertQuery', {
    category: '',
    fields: [{ name: '', value: '' }]
  });

  useEffect(() => {
    const savedResponse = localStorage.getItem('alertResponse');
    const savedCategories = localStorage.getItem('alertCategories');

    if (savedResponse) setAlertResponse(JSON.parse(savedResponse));
    if (savedCategories) setAlertCategories(JSON.parse(savedCategories));
  }, []);

  useEffect(() => {
    localStorage.setItem('alertQuery', JSON.stringify(alertQuery));
  }, [alertQuery]);

  useEffect(() => {
    if (alertResponse) {
      localStorage.setItem('alertResponse', JSON.stringify(alertResponse));
    }
  }, [alertResponse]);

  useEffect(() => {
    if (alertCategories.length > 0) {
      localStorage.setItem('alertCategories', JSON.stringify(alertCategories));
    }
  }, [alertCategories]);

  useEffect(() => {
    const savedQuery = localStorage.getItem('alertQuery');
    if (savedQuery) {
      setAlertQuery(JSON.parse(savedQuery));
    }
  }, []);

  useEffect(() => {
    fetchAlertCategories();
  }, []);


  
  
  useEffect(() => {
    getmodelname(alertQuery);
  }, [alertQuery]);



  const fetchAlertCategories = async () => {
    const cachedCategories = localStorage.getItem('alertCategories');
    if (cachedCategories) {
      setAlertCategories(JSON.parse(cachedCategories));
      setCategoriesLoading(false);
    }

    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/alert/catgories_v2`, {
        credentials: 'include'
      });

      if (response.status === 401) {
        alert('Authentication token expired. Please login again.');
        navigate('/login');
        return;
      }

      const data = await response.json();

      if (response.ok) {
        const categoryTitles = data.map(cat => cat.alertcategory);
        setAlertCategories(categoryTitles);
        localStorage.setItem('alertCategories', JSON.stringify(categoryTitles));
      } else {
        setError('Failed to load categories');
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      setError('Failed to load categories');
    } finally {
      setCategoriesLoading(false);
    }
  };

//   const syncAlertsInBackground = async () => {
//   // 🔔 Immediate feedback
//   const toastId = toast.loading('Fetching the latest alerts is in progress...');

//   try {
//     const response = await fetch(`${API_BASE_URL}/alert/sync/categories`, {
//       method: 'POST', // or GET if your API expects GET
//       credentials: 'include'
//     });

//     if (response.status === 401) {
//       toast.dismiss(toastId);
//       toast.error('Session expired. Please login again.');
//       navigate('/login');
//       return;
//     }

//     if (!response.ok) {
//       throw new Error('Sync failed');
//     }

//     // ✅ Optional: success feedback
//     toast.success('Alert sync started successfully', { id: toastId });

//   } catch (err) {
//     console.error('Alert sync failed:', err);
//     toast.error('Failed to start alert sync', { id: toastId });
//   }
// };

  const syncAlertsInBackground = async () => {
    if (syncing) return;
    setSyncing(true);

    const toastId = toast.loading('Fetching the latest alerts is in progress...');
    try {
      await fetch(`${API_BASE_URL}/alert/sync/categories`, { credentials: 'include' });
      toast.success('Alert sync started', { id: toastId });
    } catch {
      toast.error('Sync failed', { id: toastId });
    } finally {
      setSyncing(false);
    }
  };

  const transformData = (rawData) => {
    if (!rawData || !Array.isArray(rawData)) return [];

    return rawData.map(row => {
      let details = row.details;

      if (typeof details === 'string') {
        try {
          details = JSON.parse(details);
        } catch (e) {
          console.error('Error parsing details:', e);
          return {};
        }
      }

      if (Array.isArray(details)) {
        const transformedRow = {};
        details.forEach(item => {
          if (item.displayName && item.value !== undefined) {
            transformedRow[item.displayName] = item.value;
          }
        });
        return transformedRow;
      }

      return {};
    });
  };

  //  const columns =  [];
  //         const data =  [];

  const handleAlertQuery = async () => {
    if (!alertQuery.category) {
      setError('Please select a category');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const validFields = alertQuery.fields.filter(field => field.name && field.value);
      const selectedFieldName = validFields.map(field => field.name);

      const response = await fetch(`${API_BASE_URL}/alert/query_v2?alert_category=${encodeURIComponent(alertQuery.category)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.status === 401) {
        alert('Authentication token expired. Please login again.');
        navigate('/login');
        return;
      }

      const data = await response.json();
      console.log(data)
      if (response.ok && data.data && Array.isArray(data.data)) {
        const transformedData = transformData(data.data);

        const allColumns = new Set();
        transformedData.forEach(row => {
          Object.keys(row).forEach(key => allColumns.add(key));
        });

        const columnsArray = Array.from(allColumns).sort();

        setAlertResponse({
          ...data,
          data: transformedData,
          columns: columnsArray,
          recordCount: transformedData.length
        });
          // const columns = columnsArray || [];
          // const data = transformedData || [];
        setCurrentPage(1);
        setError(null);
      } else {
        let errorMessage = 'Query failed';
        if (data.detail) {
          if (Array.isArray(data.detail)) {
            errorMessage = data.detail.map(err => err.msg || err).join(', ');
          } else if (typeof data.detail === 'string') {
            errorMessage = data.detail;
          }
        } else if (data.error) {
          errorMessage = data.error;
        }
        setError(errorMessage);
      }
    } catch (err) {
      console.error('Query error:', err);
      setError('Query error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const addFieldName = () => {
    setAlertQuery({
      ...alertQuery,
      fields: [...alertQuery.fields, { name: '', value: '' }]
    });
  };

  const updateFieldName = (index, key, value) => {
    const newFields = [...alertQuery.fields];
    newFields[index][key] = value;
    setAlertQuery({ ...alertQuery, fields: newFields });
  };

  const removeFieldName = (index) => {
    if (alertQuery.fields.length > 1) {
      const newFields = alertQuery.fields.filter((_, i) => i !== index);
      setAlertQuery({ ...alertQuery, fields: newFields });
    }
  };


















































  // const columns = alertResponse.columns || [];
  // const data = alertResponse.data || [];
  // const indexOfLastRow = currentPage * rowsPerPage;
  // const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  // const currentRows = data.slice(indexOfFirstRow, indexOfLastRow);
  // const totalPages = Math.ceil(data.length / rowsPerPage);


const [payload, setPayload] = useState([]);
  const [searchTerms, setSearchTerms] = useState({});
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [featureMappings, setFeatureMappings] = useState({});
  // const [currentPage, setCurrentPage] = useState(1);

  const modelColumns = ['Select Model'];



  const [selectedModel, setSelectedModel] = useState(null);



  const getmodelname = async (alertQuery) => {
    try {
      const Alertcategery = alertQuery?.category;
      const response = await fetch(`${API_BASE_URL}/model_config/list_by_category`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      // console.log(data.models)
      setPayload(data.models || []);
      

      if (data.models && data.models.length > 0) {
        const defaultModel = data.models[0];
        const col = modelColumns[0];
        // console.log(col)
        setFeatureMappings({ [col]: defaultModel.model_name });
        // setSearchTerms({ [col]: defaultModel.model_name });
        setSearchTerms({ [col]: '' });
        // callApi(defaultModel);
        setSelectedModel(defaultModel);
      }else{
        setSelectedModel(null);
        setFeatureMappings('');
        setSearchTerms('');
      }
    } catch (err) {
      console.error('Table API error:', err);
      // return null;
    }
  };


  // const callApi = async (model) => {
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

  const handleSearchChange = (col, value) => {
    setSearchTerms(prev => ({ ...prev, [col]: value }));
  };

  const handleMappingChange = (col, value) => {
    setFeatureMappings(prev => ({ ...prev, [col]: value }));
      setSearchTerms(prev => ({ ...prev, [col]: '' })); // ✅ Clear search
    setOpenDropdowns(prev => ({ ...prev, [col]: false }));
    const selectedModel = payload.find(m => m.model_name === value);
    if (selectedModel) {
      // callApi(selectedModel);
      setSelectedModel(selectedModel);
    }
  };

  const toggleDropdown = (col) => {
    setOpenDropdowns(prev => ({ ...prev, [col]: !prev[col] }));
  };


  
const openDropdown = (col) => {
  setOpenDropdowns(prev => ({ ...prev, [col]: true }));
};

const closeDropdown = (col) => {
  setOpenDropdowns(prev => ({ ...prev, [col]: false }));
};



// const toggleDropdown = (col, forceOpen = null) => {
//   setOpenDropdowns(prev => ({
//     ...prev,
//     [col]: forceOpen !== null ? forceOpen : !prev[col]
//   }));
// };
``





































  return (
    <div style={{
      padding: '2rem',
      minHeight: 'calc(100vh - 140px)',
      backgroundColor: '#f9fafb'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            color: themeColor,
            margin: 0
          }}>
            Alert-Q Index
          </h1>
          {/* <button
            onClick={fetchAlertCategories}
            disabled={categoriesLoading}
            style={{
              backgroundColor: themeColor,
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              cursor: categoriesLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              opacity: categoriesLoading ? 0.6 : 1
            }}
          >
            <RefreshCw size={16} />
            Reload
          </button> */}
          <button
            onClick={syncAlertsInBackground}
            style={{
              backgroundColor: themeColor,
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem'
            }}
          >
            <RefreshCw size={16} />
            Sync Alerts
</button>
        </div>

        <AlertQuery
          alertQuery={alertQuery}
          setAlertQuery={setAlertQuery}
          alertCategories={alertCategories}
          categoriesLoading={categoriesLoading}
          handleAlertQuery={handleAlertQuery}
          addFieldName={addFieldName}
          updateFieldName={updateFieldName}
          removeFieldName={removeFieldName}
          loading={loading}
          error={error}
          themeColor={themeColor}
        />

<QueryResults
      alertResponse={alertResponse}
      alertQuery={alertQuery}
      currentPage={currentPage}
      setCurrentPage={setCurrentPage}
      rowsPerPage={rowsPerPage}
      themeColor={themeColor}
      payload={payload}
      modelColumns={modelColumns}
      searchTerms={searchTerms}
      featureMappings={featureMappings}
      setOpenDropdowns={setOpenDropdowns}
      openDropdowns={openDropdowns}
      
  openDropdown={openDropdown}
  closeDropdown={closeDropdown}

      dropdownRefs={useRef({})}
      handleSearchChange={handleSearchChange}
      handleMappingChange={handleMappingChange}
      toggleDropdown={toggleDropdown}
      getmodelname={getmodelname} 
      selectedModel={selectedModel}
    />

      </div>
    </div>
  );
};

export default CaseManagerPage;