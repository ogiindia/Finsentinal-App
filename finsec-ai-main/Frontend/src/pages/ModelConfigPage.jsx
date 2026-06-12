import React, { useState, useEffect, useRef } from 'react';
import { Upload, Save, Loader2, AlertCircle, CheckCircle, FileUp, Trash2, Database, FileText, Search, ChevronDown, Edit, X } from 'lucide-react';
import { API_BASE_URL } from '../service/service';
import RetrainPopup from "./RetrainPopup";

const EnhancedModelConfigPage = ({ themeColor = '#0D1B2A' }) => {
    const [modelFile, setModelFile] = useState(null);
    const [modelColumns, setModelColumns] = useState([]);
    const [uploadedModelFilename, setUploadedModelFilename] = useState('');
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [queryFields, setQueryFields] = useState([]);
    const [featureMappings, setFeatureMappings] = useState({});
    const [searchTerms, setSearchTerms] = useState({});
    const [openDropdowns, setOpenDropdowns] = useState({});
    const dropdownRefs = useRef({});
    const [modelType, setModelType] = useState('supervised');
    const [modelName, setModelName] = useState('');
    const [targetColumn, setTargetColumn] = useState('');
    const [dataFilePath, setDataFilePath] = useState('');
    const [dataFileType, setDataFileType] = useState('csv');
    const [categoryModels, setCategoryModels] = useState([]);
    const [modelStatuses, setModelStatuses] = useState({});
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);

    const [showRetrain, setShowRetrain] = useState(false);

    const [closedAlertData, setClosedAlertData] = useState([]); // holds CloasedAlertData
    const [currentModel, setCurrentModel] = useState(null);


    const [loading, setLoading] = useState({
        upload: false,
        categories: false,
        fields: false,
        save: false,
        models: false
    });
    const [messages, setMessages] = useState({
        success: null,
        error: null
    });

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        if (selectedCategory) {
            fetchQueryFields();
            fetchCategoryModels();
            fetchModelData();
        }
    }, [selectedCategory, modelType]);


    
    const [isPollingActive, setIsPollingActive] = useState(false);



    
    useEffect(() => {
        // console.log(isPollingActive)
        const fetchStatuses = async () => {
            const statuses = {};
            for (const model of categoryModels) {
                if (model.model_type === 'supervised') {
                    statuses[model.id] = { loading: true };
                    setModelStatuses(prev => ({ ...prev, [model.id]: statuses[model.id] }));
                    try {
                        const response = await fetch(
                            `${API_BASE_URL}/api/retrain/status/${model.id}`,
                            {
                                method: 'GET',
                                credentials: 'include',
                                headers: { 'Content-Type': 'application/json' }
                            }
                        );
                        if (response.ok) {
                            const data = await response.json();
                            // console.log(data)
                            statuses[model.id] = {
                                loading: false,
                                Updated_at: data.updated_at,
                                Retrain_Status: data.current_stage,
                                current_version: data.current_version
                            };
                        } else {
                            statuses[model.id] = { loading: false };
                        }
                    } catch (err) {
                        console.error(`Error fetching retrain status for model ${model.id}:`, err);
                        statuses[model.id] = { loading: false };
                    }

                    setModelStatuses(prev => ({ ...prev, [model.id]: statuses[model.id] }));
                }
            }
        };

        if (categoryModels.length > 0) {
            // console.log(isPollingActive)
            fetchStatuses();
        }
    }, [categoryModels]);



// useEffect(() => {
//     console.log(isPollingActive)

//         const fetchStatuses = async () => {
//             const statuses = {};
//                 console.log(isPollingActive)
//             for (const model of categoryModels) {
//                 if (model.model_type === 'supervised') {
//                     statuses[model.id] = { loading: true };
//                     setModelStatuses(prev => ({ ...prev, [model.id]: statuses[model.id] }));
//                     try {
//                         const response = await fetch(
//                             `${API_BASE_URL}/api/retrain/status/${model.id}`,
//                             {
//                                 method: 'GET',
//                                 credentials: 'include',
//                                 headers: { 'Content-Type': 'application/json' }
//                             }
//                         );
//                         if (response.ok) {
//                             const data = await response.json();
//                             // console.log(data)
//                             statuses[model.id] = {
//                                 loading: false,
//                                 Updated_at: data.Updated_at,
//                                 Retrain_Status: data.Retrain_Status,
//                                 current_version: data.current_version
//                             };
//                         } else {
//                             statuses[model.id] = { loading: false };
//                         }
//                     } catch (err) {
//                         console.error(`Error fetching retrain status for model ${model.id}:`, err);
//                         statuses[model.id] = { loading: false };
//                     }

//                     setModelStatuses(prev => ({ ...prev, [model.id]: statuses[model.id] }));
//                 }
//             }
//         };


//         let timeout;
//         if (isPollingActive) {
//             fetchStatuses();
//             timeout = setTimeout(() => {
//                     console.log(isPollingActive)
                    
//                 setIsPollingActive(false);
//             }, 60000); // Stop after 1 minute
//         }

//         return () => clearTimeout(timeout);
//     }, [isPollingActive]);




useEffect(() => {
    let intervalId;

    const fetchStatuses = async () => {
        const statuses = {};
        let allDone = true;

        for (const model of categoryModels) {
            if (model.model_type === 'supervised') {
                statuses[model.id] = { loading: true };
                setModelStatuses(prev => ({ ...prev, [model.id]: statuses[model.id] }));

                try {
                    const response = await fetch(
                        `${API_BASE_URL}/api/retrain/status/${model.id}`,
                        {
                            method: 'GET',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' }
                        }
                    );

                    if (response.ok) {
                        const data = await response.json();
                        // console.log(data)
                        statuses[model.id] = {
                            loading: false,
                            Updated_at: data.updated_at,
                            Retrain_Status: data.current_stage,
                            current_version: data.current_version
                        };

                        // Check if status is still in progress
                        if (data.stage_status !== 'completed' && data.stage_status !== 'failed') {
                            allDone = false;
                        }
                    } else {
                        statuses[model.id] = { loading: false };
                        allDone = false; // Assume not done if error
                    }
                } catch (err) {
                    console.error(`Error fetching retrain status for model ${model.id}:`, err);
                    statuses[model.id] = { loading: false };
                    allDone = false;
                }

                setModelStatuses(prev => ({ ...prev, [model.id]: statuses[model.id] }));
            }
        }

        // If all models are done, clear the interval
        if (allDone && intervalId) {
            clearInterval(intervalId);
            // console.log('Polling stopped: All models completed or failed.');
            // fetchStatuses();
            
        }
    };


    if (categoryModels.length > 0 && isPollingActive) {
        fetchStatuses(); // Initial call
        intervalId = setInterval(fetchStatuses, 3000); // Poll every 3 seconds
    }

    return () => {
        if (intervalId) clearInterval(intervalId); // Cleanup on unmount or dependency change
    };
}, [categoryModels, isPollingActive]);





    useEffect(() => {
        const handleClickOutside = (event) => {
            Object.keys(dropdownRefs.current).forEach((key) => {
                if (dropdownRefs.current[key] && !dropdownRefs.current[key].contains(event.target)) {
                    setOpenDropdowns(prev => ({ ...prev, [key]: false }));
                }
            });
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);











    const fetchCategories = async () => {
        setLoading(prev => ({ ...prev, categories: true }));
        try {
            const response = await fetch(`${API_BASE_URL}/alert/catgories_v2`, {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!response.ok) throw new Error('Failed to fetch categories');
            const data = await response.json();
            const categoryList = data.map(cat => cat.alertcategory);
            setCategories(categoryList);
        } catch (err) {
            setMessages({ error: err.message, success: null });
        } finally {
            setLoading(prev => ({ ...prev, categories: false }));
        }
    };


    const fetchQueryFields = async () => {
        if (!selectedCategory) {
            setQueryFields([]);
            return;
        }
        setLoading(prev => ({ ...prev, fields: true }));
        setMessages({ error: null, success: null });
        try {
            const response = await fetch(`${API_BASE_URL}/alert/query_v2?alert_category=${encodeURIComponent(selectedCategory)}`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch query fields: ${response.status}`);
            }
            const data = await response.json();
            let fieldsList = [];
            if (data.data && Array.isArray(data.data) && data.data.length > 0) {
                const firstAlert = data.data[0];
                if (firstAlert.details) {
                    try {
                        const detailsArray = JSON.parse(firstAlert.details);
                        if (Array.isArray(detailsArray)) {
                            fieldsList = detailsArray
                                .map(item => item.displayName)
                                .filter(name => name);
                        }
                    } catch (parseError) {
                        console.error('Error parsing details JSON:', parseError);
                        setMessages({
                            error: 'Failed to parse alert details. Invalid JSON format.',
                            success: null
                        });
                        setQueryFields([]);
                        setLoading(prev => ({ ...prev, fields: false }));
                        return;
                    }
                }
            } else if (data.columns && Array.isArray(data.columns)) {
                fieldsList = data.columns.map(col => String(col).replace(/_X0020_/g, ' '));
            }
            setQueryFields(fieldsList);
            if (modelType === 'supervised' && targetColumn && !fieldsList.includes(targetColumn)) {
                fieldsList.push(targetColumn);
            }
            if (fieldsList.length === 0) {
                setMessages({
                    error: 'No fields found for this category. Try selecting a different category.',
                    success: null
                });
            }
        } catch (err) {
            console.error('Error fetching query fields:', err);
            setMessages({ error: err.message, success: null });
            setQueryFields([]);
        } finally {
            setLoading(prev => ({ ...prev, fields: false }));
        }
    };

    const fetchCategoryModels = async () => {
        if (!selectedCategory) {
            setCategoryModels([]);
            return;
        }
        setLoading(prev => ({ ...prev, models: true }));
        try {
            const response = await fetch(
                `${API_BASE_URL}/model_config/list_by_category/${selectedCategory}`,
                {
                    method: 'GET',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' }
                }
            );
            if (response.ok) {
                const data = await response.json();
                // console.log(data.models)
                setCategoryModels(data.models || []);
            } else {
                setCategoryModels([]);
            }
        } catch (err) {
            console.error('Error fetching category models:', err);
            setCategoryModels([]);
        } finally {
            setLoading(prev => ({ ...prev, models: false }));
        }
    };


    const fetchModelData = async (modelId) => {
        if (modelId){
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/retrain/status/${modelId}`,
                {
                    method: 'GET',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' }
                }
            );
            if (response.ok) {
                const data = await response.json();
                // console.log(data)
            } else {
                // setCategoryModels([]);
            }
        } catch (err) {
            console.error('Error fetching category models:', err);
        } finally {

        }
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.name.endsWith('.onnx')) {
            setMessages({ error: 'Please upload an ONNX file (.onnx)', success: null });
            return;
        }
        setLoading(prev => ({ ...prev, upload: true }));
        setMessages({ error: null, success: null });
        const formData = new FormData();
        formData.append('file', file);
        try {
            const response = await fetch(`${API_BASE_URL}/model_config/model_inputs`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            if (!response.ok) throw new Error('Failed to upload model');
            const data = await response.json();
            if (data.error) {
                setMessages({ error: data.error, success: null });
                return;
            }
            setModelFile(file);
            setModelColumns(data.columns || []);
            setUploadedModelFilename(data.saved_filename || '');
            const initialMappings = {};
            const initialSearchTerms = {};
            (data.columns || []).forEach(col => {
                initialMappings[col] = '';
                initialSearchTerms[col] = '';
            });
            setFeatureMappings(initialMappings);
            setSearchTerms(initialSearchTerms);
            setMessages({
                success: `Model uploaded successfully! Original: ${data.original_filename}, Saved as: ${data.saved_filename}`,
                error: null
            });
        } catch (err) {
            setMessages({ error: err.message, success: null });
        } finally {
            setLoading(prev => ({ ...prev, upload: false }));
        }
    };

    const handleMappingChange = (modelFeature, queryField) => {
        setFeatureMappings(prev => ({ ...prev, [modelFeature]: queryField }));
        setSearchTerms(prev => ({ ...prev, [modelFeature]: queryField }));
        setOpenDropdowns(prev => ({ ...prev, [modelFeature]: false }));
    };

    const handleSearchChange = (modelFeature, value) => {
        setSearchTerms(prev => ({ ...prev, [modelFeature]: value }));
        setFeatureMappings(prev => ({ ...prev, [modelFeature]: value }));
    };

    const toggleDropdown = (modelFeature) => {
        setOpenDropdowns(prev => ({ ...prev, [modelFeature]: !prev[modelFeature] }));
    };

    const getFilteredFields = (modelFeature) => {
        const searchTerm = searchTerms[modelFeature] || '';
        if (!searchTerm) return queryFields;
        return queryFields.filter(field =>
            field.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };



    const handleSaveMapping = async () => {
        try {
            if (!selectedCategory) {
                setMessages({ error: 'Please select an alert category', success: null });
                return;
            }
            if (!modelName || modelName.trim() === '') {
                setMessages({ error: 'Please provide a model name', success: null });
                return;
            }
            if (!uploadedModelFilename) {
                setMessages({ error: 'Please upload an ONNX model file first', success: null });
                return;
            }
            if (!dataFilePath) {
                setMessages({ error: 'Please provide a data file path', success: null });
                return;
            }
            const unmappedColumns = modelColumns.filter(
                col => !featureMappings[col] || featureMappings[col] === ''
            );
            if (unmappedColumns.length > 0) {
                setMessages({
                    error: `Please map all model columns. Unmapped: ${unmappedColumns.join(', ')}`,
                    success: null
                });
                return;
            }
            setLoading(prev => ({ ...prev, save: true }));
            setMessages({ error: null, success: null });
            const configData = {
                alert_category: selectedCategory,
                model_name: modelName,
                model_filename: uploadedModelFilename,
                model_type: modelType,
                target_column: targetColumn || null,
                feature_mappings: featureMappings,
                data_file_path: dataFilePath,
                data_file_type: dataFileType
            };
            const response = await fetch(`${API_BASE_URL}/model_config/create`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(configData),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to save configuration');
            }
            const result = await response.json();
            setMessages({
                success: 'Configuration saved successfully!',
                error: null
            });
            await fetchCategoryModels();
            setModelName('');
            setModelFile(null);
            setUploadedModelFilename('');
            setModelColumns([]);
            setFeatureMappings({});
            setSearchTerms({});
            setTimeout(() => {
                setMessages({ success: null, error: null });
            }, 3000);
        } catch (err) {
            console.error('Error saving configuration:', err);
            setMessages({ error: err.message, success: null });
        } finally {
            setLoading(prev => ({ ...prev, save: false }));
        }
    };

    const handleDeleteModel = async (modelId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/model_config/delete/${modelId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to delete model');
            }
            setMessages({ success: 'Model deleted successfully', error: null });
            await fetchCategoryModels();
            setTimeout(() => {
                setMessages({ success: null, error: null });
            }, 3000);
        } catch (err) {
            setMessages({ error: err.message, success: null });
        }
    };

    const confirmDelete = (modelId) => {
        setConfirmAction({
            type: 'delete',
            modelId: modelId,
            message: 'Are you sure you want to delete this model? This action cannot be undone.'
        });
        setShowConfirmDialog(true);
    };

    const handleConfirm = () => {
        if (confirmAction && confirmAction.type === 'delete') {
            handleDeleteModel(confirmAction.modelId);
        }
        setShowConfirmDialog(false);
        setConfirmAction(null);
    };

    const handleClearMapping = () => {
        const initialMappings = {};
        const initialSearchTerms = {};
        modelColumns.forEach(col => {
            initialMappings[col] = '';
            initialSearchTerms[col] = '';
        });
        setFeatureMappings(initialMappings);
        setSearchTerms(initialSearchTerms);
        setMessages({ success: 'Mappings cleared', error: null });
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




    const handleRetrain = async (model, modelStatuses) => {
        // console.log(model)
        // console.log(modelStatuses)
        // console.log(selectedCategory)
        if (selectedCategory) {
            // Get yesterday's date (ignoring time)
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);


            const response = await fetch(`${API_BASE_URL}/alert/query_v2?alert_category=${encodeURIComponent(selectedCategory)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });

            const data = await response.json();
            if (response.ok && data.data && Array.isArray(data.data)) {
                const transformedData = transformData(data.data);
                const allColumns = new Set();
                transformedData.forEach(row => {
                    Object.keys(row).forEach(key => allColumns.add(key));
                });
                const columnsArray = Array.from(allColumns).sort();

                const CloasedAlertData = []


                if (modelStatuses.Updated_at) {
                    for (const model of transformedData) {
                        
                        // console.log(yesterday)
                        const closeDate = model.CLOSEDATE ? new Date(model.CLOSEDATE) : null;

                        if (closeDate !== '' && closeDate !== null && closeDate > modelStatuses.Updated_at) {


                        // if ( closeDate !== '' && closeDate !== null  && closeDate <= yesterday) {
                            CloasedAlertData.push(model)
                        }
                    }
                } else {
                    for (const model of transformedData) {
                        if (model.CLOSEDATE) {
                            CloasedAlertData.push(model)
                        }
                    }

                }
                setClosedAlertData(CloasedAlertData);
                setCurrentModel(model);
                setShowRetrain(true);

            }
        } else {
            // console.log('not found')
        }
        // pop up 

        // return (
        //     <>
        //       {/* ... your page content ... */}
        //       <button onClick={() => handleRetrain({ model_name: "MyModel", model_type: "XGB" }, { Updated_at: "2025-01-01T00:00:00Z" })}>
        //         Open Retrain Popup (demo)
        //       </button>

        //       <RetrainPopup
        //         open={showRetrain}
        //         rows={closedAlertData}
        //         model={currentModel}
        //         onClose={() => setShowRetrain(false)}
        //         onSubmit={handleSubmitRetrain}
        //       />
        //     </>
        //   );
    };



    const handleSubmitRetrain = (selectedRows) => {
        // Do whatever you need with the selected rows
        // console.log("Submitting selected rows:", selectedRows);

        // Example: call your retrain API here
        // await fetch(`${API_BASE_URL}/models/retrain`, { method: 'POST', body: JSON.stringify({ model_id: currentModel?.id, rows: selectedRows })})

        setShowRetrain(false);
    };






























































































































    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom, #f0f4f8, #e2e8f0)', padding: '24px' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', padding: '32px', marginBottom: '24px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: themeColor, marginBottom: '8px' }}>
                            S-Connect
                        </h1>
                        <p style={{ color: '#6b7280', fontSize: '16px' }}>
                            Configure ONNX models with database storage and data processing
                        </p>
                    </div>

                    {messages.error && (
                        <div style={{ background: '#fee', border: '1px solid #fcc', borderRadius: '8px', padding: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertCircle size={20} color="#dc2626" />
                            <span style={{ color: '#dc2626' }}>{messages.error}</span>
                        </div>
                    )}

                    {messages.success && (
                        <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '8px', padding: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CheckCircle size={20} color="#059669" />
                            <span style={{ color: '#059669' }}>{messages.success}</span>
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                                Alert Category *
                            </label>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', background: 'white' }}
                                disabled={loading.categories}
                            >
                                <option value="">Select Category</option>
                                {categories.map((cat, idx) => (
                                    <option key={idx} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                                Model Type *
                            </label>
                            <select
                                value={modelType}
                                onChange={(e) => setModelType(e.target.value)}
                                style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', background: 'white' }}
                            >
                                <option value="supervised">Supervised</option>
                                <option value="unsupervised">Unsupervised</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ marginBottom: '32px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                            Model Name *
                        </label>
                        <input
                            type="text"
                            value={modelName}
                            onChange={(e) => setModelName(e.target.value)}
                            placeholder="Enter a descriptive name for this model"
                            style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
                        />
                    </div>

                    <div style={{ marginBottom: '32px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                            Upload ONNX Model *
                        </label>
                        <div style={{ border: '2px dashed #d1d5db', borderRadius: '12px', padding: '32px', textAlign: 'center', background: '#fafafa', cursor: 'pointer', position: 'relative' }}>
                            <input
                                type="file"
                                accept=".onnx"
                                onChange={handleFileUpload}
                                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                            />
                            <FileUp size={48} color={themeColor} style={{ margin: '0 auto 16px' }} />
                            <p style={{ fontSize: '16px', color: '#374151', marginBottom: '4px' }}>
                                {modelFile ? modelFile.name : 'Click to upload or drag and drop'}
                            </p>
                            <p style={{ fontSize: '14px', color: '#6b7280' }}>
                                ONNX files only (.onnx)
                            </p>
                        </div>
                        {uploadedModelFilename && (
                            <div style={{ marginTop: '12px', padding: '12px', background: '#d1fae5', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CheckCircle size={20} color="#059669" />
                                <div>
                                    <p style={{ color: '#059669', fontSize: '14px', fontWeight: '600' }}>✓ Model uploaded successfully!</p>
                                    <p style={{ color: '#047857', fontSize: '12px' }}>Saved as: {uploadedModelFilename}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {modelType === 'supervised' && (
                        <div style={{ marginBottom: '32px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                                Target Column *
                            </label>
                            <input
                                type="text"
                                value={targetColumn}
                                onChange={(e) => setTargetColumn(e.target.value)}
                                placeholder="Enter target column name"
                                style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
                            />
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '32px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                                Data File Path *
                            </label>
                            <input
                                type="text"
                                value={dataFilePath}
                                onChange={(e) => setDataFilePath(e.target.value)}
                                placeholder="/path/to/data.csv"
                                style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                                File Type *
                            </label>
                            <select
                                value={dataFileType}
                                onChange={(e) => setDataFileType(e.target.value)}
                                style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', background: 'white' }}
                            >
                                <option value="csv">CSV</option>
                                <option value="parquet">Parquet</option>
                            </select>
                        </div>
                    </div>

                    {modelColumns.length > 0 && (
                        <div style={{ marginBottom: '32px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#374151' }}>
                                    Feature Mapping ({Object.values(featureMappings).filter(v => v).length}/{modelColumns.length})
                                </h3>
                                <button
                                    onClick={handleClearMapping}
                                    style={{ padding: '8px 16px', background: '#ef4444', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                >
                                    <Trash2 size={16} />
                                    Clear All
                                </button>
                            </div>
                            <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
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
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
                        <button
                            onClick={handleSaveMapping}
                            disabled={loading.save || !uploadedModelFilename || !selectedCategory || !modelName}
                            style={{ padding: '12px 32px', background: loading.save ? '#9ca3af' : themeColor, color: 'white', borderRadius: '8px', border: 'none', cursor: loading.save ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: '600' }}
                        >
                            {loading.save ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                            {loading.save ? 'Saving...' : 'Save Configuration'}
                        </button>
                    </div>
                </div>

                {selectedCategory && (
                    <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', padding: '32px' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: themeColor, marginBottom: '16px' }}>
                            Models for "{selectedCategory}"
                        </h2>
                        {loading.models ? (
                            <div style={{ textAlign: 'center', padding: '32px' }}>
                                <Loader2 size={32} color={themeColor} className="animate-spin" style={{ margin: '0 auto' }} />
                                <p style={{ color: '#6b7280', marginTop: '16px' }}>Loading models...</p>
                            </div>
                        ) : categoryModels.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '48px', background: '#fafafa', borderRadius: '8px' }}>
                                <Database size={48} color="#9ca3af" style={{ margin: '0 auto 16px' }} />
                                <p style={{ fontSize: '16px', color: '#6b7280' }}>No models configured for this category</p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Model Name</th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Type</th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Target Column</th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Created</th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Last retrain date</th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Retrain Status</th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Retrain Version</th>
                                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Retrain</th>
                                            <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {categoryModels.map((model) => (
                                            <tr key={model.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                                <td style={{ padding: '12px', fontSize: '14px', color: '#374151' }}>{model.model_name}</td>
                                                <td style={{ padding: '12px', fontSize: '14px' }}>
                                                    <span style={{ padding: '4px 12px', background: model.model_type === 'supervised' ? '#dbeafe' : '#fef3c7', color: model.model_type === 'supervised' ? '#1e40af' : '#92400e', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                                                        {model.model_type}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>{model.target_column || '-'}</td>
                                                <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>
                                                    {model.created_at ? new Date(model.created_at).toLocaleDateString() : '-'}
                                                </td>







                                                <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>
                                                    {modelStatuses[model.id]?.loading
                                                        ? <Loader2 size={16} className="animate-spin" />
                                                        : modelStatuses[model.id]?.Updated_at
                                                            ? new Date(modelStatuses[model.id].Updated_at).toLocaleDateString()
                                                            : '-'}
                                                </td>
                                                <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>
                                                    {modelStatuses[model.id]?.loading
                                                        ? <Loader2 size={16} className="animate-spin" />
                                                        : modelStatuses[model.id]?.Retrain_Status || '-'}
                                                </td>
                                                <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>
                                                    {modelStatuses[model.id]?.loading
                                                        ? <Loader2 size={16} className="animate-spin" />
                                                        : modelStatuses[model.id]?.current_version || '-'}
                                                </td>
                                                <td style={{ padding: '12px' }}>
                                                    {model.model_type === 'supervised' ? (
                                                        modelStatuses[model.id]?.loading ? (
                                                            <Loader2 size={16} className="animate-spin" />
                                                        ) : (
                                                            <button
                                                                onClick={() => handleRetrain(model, modelStatuses[model.id])}
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
                                                                Retrain
                                                            </button>
                                                        )
                                                    ) : (
                                                        <button
                                                            disabled
                                                            title="Can't retrain the unsupervised models"
                                                            style={{
                                                                backgroundColor: '#d1d5db',
                                                                color: '#6b7280',
                                                                border: 'none',
                                                                padding: '0.25rem 0.75rem',
                                                                borderRadius: '0.25rem',
                                                                fontSize: '0.75rem',
                                                                cursor: 'not-allowed',
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                        >
                                                            Retrain
                                                        </button>
                                                    )}
                                                </td>










                                                {/* data from another API */}
                                                {/* <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>
                                                    {model.created_at ? new Date(model.created_at).toLocaleDateString() : '-'}
                                                </td>
                                                <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>
                                                    {model.created_at ? new Date(model.created_at).toLocaleDateString() : '-'}
                                                </td>
                                                <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>
                                                    {model.created_at ? new Date(model.created_at).toLocaleDateString() : '-'}
                                                </td>
                                                <td
                                                    style={{
                                                        padding: '0.75rem',
                                                        border: '1px solid #e5e7eb',
                                                        position: 'sticky',
                                                        right: 0,
                                                        backgroundColor: '#f9fafb',
                                                        zIndex: 1
                                                    }}
                                                >
                                                    {model.model_type === 'supervised' ? (
                                                        <button
                                                            onClick={() => handleRetrain()}
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
                                                            Retrain
                                                        </button>
                                                    ) : (
                                                        <button
                                                            disabled
                                                            title="Can't retrain the unsupervised models"
                                                            style={{
                                                                backgroundColor: '#d1d5db', // gray background for disabled
                                                                color: '#6b7280', // muted text
                                                                border: 'none',
                                                                padding: '0.25rem 0.75rem',
                                                                borderRadius: '0.25rem',
                                                                fontSize: '0.75rem',
                                                                cursor: 'not-allowed',
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                        >
                                                            Retrain
                                                        </button>
                                                    )}
                                                </td> */}

































                                                {/* <td style={{
                  padding: '0.75rem',
                  border: '1px solid #e5e7eb',
                  position: 'sticky',
                  right: 0,
                  backgroundColor: '#f9fafb',
                  zIndex: 1
                }}>
                  <button 
                    onClick={() => handleRetrain()}
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
                    Retrain
                  </button>
                </td> */}

                                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                        <button
                                                            onClick={() => confirmDelete(model.id)}
                                                            style={{ padding: '8px', background: '#fee', border: '1px solid #fcc', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                            title="Delete model"
                                                        >
                                                            <Trash2 size={16} color="#dc2626" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {showConfirmDialog && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '24px', maxWidth: '400px', width: '90%' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#374151', marginBottom: '16px' }}>Confirm Delete</h3>
                        <p style={{ color: '#6b7280', marginBottom: '24px' }}>{confirmAction?.message}</p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => { setShowConfirmDialog(false); setConfirmAction(null); }}
                                style={{ padding: '8px 16px', background: '#f3f4f6', color: '#374151', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirm}
                                style={{ padding: '8px 16px', background: '#dc2626', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <>

                <RetrainPopup
                    open={showRetrain}
                    rows={closedAlertData}
                    model={currentModel}
                    onClose={() => setShowRetrain(false)}
                    onSubmit={handleSubmitRetrain}
                    setIsPollingActive={setIsPollingActive}
                />


            </>
        </div>
    );
};

export default EnhancedModelConfigPage;