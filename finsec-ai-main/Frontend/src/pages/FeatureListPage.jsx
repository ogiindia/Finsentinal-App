import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../service/service';
import { Copy } from 'lucide-react';

const FeatureListPage = ({ themeColor = '#0D1B2A' }) => {
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    id: null,
    name: '',
    description: '',
    query: '',
    workflow_id: '',
    channel: '',
  });
  const [sqlThinking, setSqlThinking] = useState({
    visible: false,
    status: 'idle', // idle | loading | success | error
    message: '',
  });

  /* ---------------- API ---------------- */

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    const res = await fetch(`${API_BASE_URL}/feature/channels_v2`, {
      credentials: 'include',
    });
    const data = await res.json();
    if (Array.isArray(data)) {
      setChannels(data);
      return data;
    }
    return [];
  };

  const askSql8 = async () => {
    if (!formData.description?.trim()) {
      alert('Description is required to generate SQL');
      return;
    }

    setSqlThinking({
      visible: true,
      status: 'loading',
      message: '...',
    });

    try {
      // 1. Fetch DB schema
      const schemaRes = await fetch(
        `${API_BASE_URL}/model_config/db/schema`,
        { credentials: 'include' }
      );

      if (!schemaRes.ok) throw new Error('Schema fetch failed');

      const schemaData = await schemaRes.json();

      // 2. Send to LLM
      const llmRes = await fetch(
        `${API_BASE_URL}/llm/generate-sql`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: formData.description,
            schema: schemaData,
          }),
        }
      );

      if (!llmRes.ok) throw new Error('LLM error');

      const llmData = await llmRes.json();
      // console.log(llmData);

      setSqlThinking({
        visible: true,
        status: 'success',
        message: llmData?.sql || 'No SQL generated',
      });
    } catch (err) {
      setSqlThinking({
        visible: true,
        status: 'error',
        message: 'Unable to process',
      });
    }
  };

  const fetchFeatures = async (channel) => {
    setLoading(true);
    const res = await fetch(
      `${API_BASE_URL}/feature/features_details?channel=${encodeURIComponent(
        channel
      )}`,
      { credentials: 'include' }
    );
    const data = await res.json();
    setFeatures(res.ok && data.status === 'Success' ? data.data : []);
    setLoading(false);
  };

  /* ---------------- HANDLERS ---------------- */

  const handleChannelChange = (e) => {
    const value = e.target.value;
    setSelectedChannel(value);
    setFeatures([]);
    if (value) fetchFeatures(value);
  };

  const openView = (row) => {
    setModalMode('view');
    setFormData(row);
    setCopied(false);
    setShowModal(true);
  };

  const openEdit = (row) => {
    setModalMode('edit');
    setFormData(row);
    setShowModal(true);
  };

  const openAdd = () => {
    setModalMode('add');
    setFormData({
      id: null,
      name: '',
      description: '',
      query: '',
      workflow_id: '',
      channel: selectedChannel || '',
    });
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const saveFeature = async () => {
    const isEdit = modalMode === 'edit';

    const normalizedChannel =
      modalMode === 'add'
        ? formData.channel.trim().toUpperCase()
        : formData.channel;

    const payload = {
      ...formData,
      channel: normalizedChannel,
    };

    const url = isEdit
      ? `${API_BASE_URL}/feature/features_details/${formData.id}`
      : `${API_BASE_URL}/feature/features_details`;

    await fetch(url, {
      method: isEdit ? 'PUT' : 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    closeModal();

    if (!isEdit) {
      const updatedChannels = await loadChannels();

      if (updatedChannels.includes(normalizedChannel)) {
        setSelectedChannel(normalizedChannel);
        fetchFeatures(normalizedChannel);
      }
    } else {
      fetchFeatures(selectedChannel);
    }
  };

  const deleteFeature = async (id) => {
    if (!window.confirm('Delete this feature?')) return;
    await fetch(`${API_BASE_URL}/feature/features_details/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    fetchFeatures(selectedChannel);
  };

  const copyQuery = async () => {
    await navigator.clipboard.writeText(formData.query || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ---------------- UI ---------------- */

  return (
    <div style={{ padding: '1.5rem' }}>
      <div>
        <h1
          style={{
                  fontSize: '2rem',
                  fontWeight: '700',
                  color: themeColor,
                  marginBottom: '0.25rem'
                }}
        >
                KeyStone
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                Information about Keystone/features
        </p>
      </div>
        

      <div style={cardStyle}>
        <label style={labelStyle}>Select Channel</label>
        <select
          value={selectedChannel}
          onChange={handleChannelChange}
          style={selectStyle}
        >
          <option value="">Select channel</option>
          {channels.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {selectedChannel && (
        <button style={addPrimaryBtn} onClick={openAdd}>
          + Add Feature
        </button>
      )}

      <div style={tableCardStyle}>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Feature Name</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {features.length === 0 ? (
                <tr>
                  <td colSpan="2" style={emptyStyle}>
                    No features found
                  </td>
                </tr>
              ) : (
                features.map((row, idx) => (
                  <tr
                    key={row.id}
                    style={{ background: idx % 2 ? '#f9fafb' : 'white' }}
                  >
                    <td style={tdStyle}>{row.name}</td>
                    <td style={tdStyle}>
                      <div style={actionGroupStyle}>
                        <button
                          style={{ ...actionBtn, ...viewBtn }}
                          onClick={() => openView(row)}
                        >
                          View
                        </button>
                        <button
                          style={{ ...actionBtn, ...editBtn }}
                          onClick={() => openEdit(row)}
                        >
                          Edit
                        </button>
                        <button
                          style={{ ...actionBtn, ...deleteBtn }}
                          onClick={() => deleteFeature(row.id)}
                        >
                          Delete
                        </button>
                        <button style={{ ...actionBtn, ...workflowBtn }}>
                          Workflow
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && modalMode === 'view' && (
        <div style={modalOverlay}>
          <div style={viewModalBox}>
            <div style={viewHeader}>
              <h3>Feature Details</h3>
              <button onClick={closeModal} style={closeBtn}>
                ✕
              </button>
            </div>

            <Detail label="Name" value={formData.name} />
            <Detail label="Channel" value={formData.channel} />
            <Detail label="Description" value={formData.description} />
            <Detail label="Workflow ID" value={formData.workflow_id} />

            <div style={queryHeader}>
              <span style={viewLabel}>Query</span>
              <button style={copyBtn} onClick={copyQuery}>
                <Copy size={14} />
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre style={queryBox}>{formData.query}</pre>

            <div style={{ textAlign: 'right' }}>
              <button style={cancelBtn} onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && modalMode !== 'view' && (
        <div style={modalOverlay}>
          <div style={editModalBox}>
            <h3>{modalMode === 'add' ? 'Add Feature' : 'Edit Feature'}</h3>

            <Field label="Name" name="name" value={formData.name} onChange={handleChange} />
            <Field
              label="Channel"
              name="channel"
              value={formData.channel}
              onChange={handleChange}
              disabled={modalMode === 'edit'}
            />
            <Field
              label="Workflow ID"
              name="workflow_id"
              value={formData.workflow_id}
              onChange={handleChange}
            />
            <Field
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              textarea
            />
            {modalMode === 'add' && (
              <div style={{ position: 'relative', marginBottom: '0.6rem' }}>
                {sqlThinking.visible && (
                  <div style={thinkingPopup}>
                    <div style={thinkingHeader}>
                      <span>Sql8</span>
                      <button
                        style={thinkingCloseBtn}
                        onClick={() =>
                          setSqlThinking({ visible: false, status: 'idle', message: '' })
                        }
                      >
                        ×
                      </button>
                    </div>

                    <div style={thinkingBody}>
                      {sqlThinking.message}
                    </div>
                  </div>
                )}

                <button style={askSqlBtn} onClick={askSql8}>
                  Ask Sql8
                </button>
              </div>
            )}
            <Field
              label="Query"
              name="query"
              value={formData.query}
              onChange={handleChange}
              textarea
            />

            <div style={{ textAlign: 'right' }}>
              <button style={cancelBtn} onClick={closeModal}>
                Cancel
              </button>
              <button style={saveBtn} onClick={saveFeature}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------------- COMPONENTS ---------------- */

const Field = ({ label, textarea, ...props }) => (
  <div style={{ marginBottom: '0.6rem' }}>
    <label style={labelStyle}>{label}</label>
    {textarea ? (
      <textarea {...props} style={inputStyle} />
    ) : (
      <input {...props} style={inputBoxStyle} />
    )}
  </div>
);

const Detail = ({ label, value }) => (
  <div style={{ marginBottom: '0.6rem' }}>
    <div style={viewLabel}>{label}</div>
    <div style={viewValue}>{value || '-'}</div>
  </div>
);

/* ---------------- STYLES ---------------- */

const cardStyle = { background: 'white', padding: '1rem', marginBottom: '1rem' };
const tableCardStyle = { background: 'white', padding: '0.5rem' };
const tableStyle = { width: '100%', borderCollapse: 'collapse' };
const thStyle = { textAlign: 'left', padding: '0.6rem', background: '#f3f4f6' };
const tdStyle = { padding: '0.5rem', borderBottom: '1px solid #e5e7eb' };
const emptyStyle = { textAlign: 'center', padding: '1rem', color: '#6b7280' };
const labelStyle = { fontSize: '0.75rem' };
const selectStyle = { padding: '0.4rem', width: '250px' };
const inputStyle = { width: '100%', minHeight: '60px' };
const inputBoxStyle = { width: '100%', padding: '0.35rem' };

const addPrimaryBtn = {
  marginBottom: '0.75rem',
  padding: '0.45rem 0.8rem',
  background: '#2563eb',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
};

const saveBtn = {
  marginLeft: '0.5rem',
  padding: '0.45rem 0.8rem',
  background: '#16a34a',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
};

const cancelBtn = {
  padding: '0.45rem 0.8rem',
  background: '#9ca3af',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
};

const askSqlBtn = {
  padding: '0.35rem 0.7rem',
  background: '#0ea5e9',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  fontSize: '0.75rem',
};

const thinkingPopup = {
  position: 'absolute',
  bottom: '120%',
  left: 0,
  maxWidth: '260px',
  background: '#e0f2fe',
  color: '#075985',
  padding: '0.4rem 0.6rem',
  borderRadius: '12px',
  fontSize: '0.7rem',
  boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
};

const thinkingHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: '0.65rem',
  fontWeight: 600,
  marginBottom: '0.2rem',
};

const thinkingBody = {
  fontSize: '0.7rem',
  lineHeight: 1.3,
};

const thinkingCloseBtn = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  fontSize: '0.8rem',
  lineHeight: 1,
  padding: 0,
  color: '#075985',
};

const actionGroupStyle = { display: 'flex', gap: '0.4rem' };
const actionBtn = { padding: '0.3rem 0.6rem', borderRadius: '4px', border: 'none', fontSize: '0.75rem' };
const viewBtn = { background: '#2563eb', color: 'white' };
const editBtn = { background: '#f59e0b', color: 'white' };
const deleteBtn = { background: '#dc2626', color: 'white' };
const workflowBtn = { background: '#059669', color: 'white' };

const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center' };
const viewModalBox = { background: 'white', padding: '1.2rem', width: '600px', borderRadius: '8px' };
const editModalBox = { background: 'white', padding: '1rem', width: '500px', borderRadius: '6px' };
const viewHeader = { display: 'flex', justifyContent: 'space-between' };
const closeBtn = { background: 'transparent', border: 'none', fontSize: '1rem' };
const viewLabel = { fontSize: '0.7rem', color: '#6b7280' };
const viewValue = { fontSize: '0.9rem', fontWeight: 500 };

const queryHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const queryBox = { background: '#111827', color: '#e5e7eb', padding: '0.7rem', borderRadius: '6px', fontSize: '0.75rem' };
const copyBtn = { display: 'flex', gap: '0.3rem', alignItems: 'center', background: '#374151', color: 'white', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '4px' };

export default FeatureListPage;