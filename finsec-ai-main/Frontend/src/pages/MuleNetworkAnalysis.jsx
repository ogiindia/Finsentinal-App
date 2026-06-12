import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { User, Search, X, Maximize2, Minimize2, Loader2, Filter } from 'lucide-react';
import { API_BASE_URL } from '../service/service';
import TableView from './TableView';
import ClusterView from "./mule_tabs/ClusterView";
// =============================================================================
// MOCK API FUNCTIONS - Replace with actual API calls
// =============================================================================

// =============================================================================
// STYLES
// =============================================================================
const styles = `
  

  .mule-network-container {
    --color-bg-primary: #d6d8ddff;
    --color-bg-secondary: #ecedeeff;
    --color-bg-themecolor: #0D1B2A;
    --color-bg-tertiary: #2d333bff;
    --color-border: #63676dff;
    --color-text-primary: #090909ff;
    --color-text-secondary: #94A3B8;
    --color-text-muted: #64748B;
    --color-accent: #0D1B2A;
    --color-accent-hover: #34393dff;
    --color-success: #10B981;
    --color-warning: #F59E0B;
    --color-danger: #EF4444;
    --color-purple: #8B5CF6;
    
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
    border-radius: 12px;
    overflow: hidden;
    height: 100%;
    min-height: 600px;
    display: flex;
    flex-direction: column;
  }

  .mule-network-container * {
    box-sizing: border-box;
  }

  /* Top Level Tabs */
  .top-tabs {
    display: flex;
    gap: 4px;
    padding: 12px 16px;
    background: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border);
  }

  .top-tab {
    padding: 10px 20px;
    border: none;
    background: transparent;
    color: var(--color-text-themecolor);
    border: 1px solid var(--color-border);
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .top-tab:hover {
    background: var(--color-bg-tertiary);
    color: white;
  }

  .top-tab.active {
    background: var(--color-accent);
    color: white;
  }

  /* Inner Header */
  .inner-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border);
  }

  .inner-tabs {
    display: flex;
    gap: 4px;
  }

  .inner-tab {
    padding: 8px 16px;
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-text-themecolor);
    font-family: inherit;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.2s ease;
  }

  .inner-tab:hover {
     background: var(--color-bg-tertiary);
    color: white;
  }

  .inner-tab.active {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: white;
  }

  .stats-display {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    color: var(--color-text-secondary);
    display: flex;
    gap: 16px;
  }

  .stat-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .stat-label {
    color: var(--color-text-muted);
  }

  .stat-value {
    color: var(--color-accent);
    font-weight: 600;
  }

  /* Graph Container */
  .graph-container {
    flex: 1;
    display: flex;
    position: relative;
    background: var(--color-bg-primary);
    overflow: hidden;
  }

  .graph-container.fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
    border-radius: 0;
  }

  .graph-area {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  .graph-svg {
    width: 100%;
    height: 100%;
    background: radial-gradient(circle at 50% 50%, var(--color-bg-secondary) 0%, var(--color-bg-primary) 100%);
  }

  /* Search Box */
  .search-box {
    position: absolute;
    top: 16px;
    left: 16px;
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .search-input-container {
    display: flex;
    align-items: center;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 0 12px;
    width: 240px;
    transition: all 0.3s ease;
  }

  .search-input-container:focus-within {
    width: 300px;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
  }

  .search-input {
    flex: 1;
    border: none;
    background: transparent;
    color: var(--color-text-primary);
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    padding: 10px 0;
    outline: none;
  }

  .search-input::placeholder {
    color: var(--color-text-muted);
    font-family: 'Plus Jakarta Sans', sans-serif;
  }

  .search-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.2s ease;
  }

  .search-btn:hover:not(:disabled) {
    background: var(--color-accent);
    color: white;
  }

  .search-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .clear-btn {
    color: var(--color-text-muted);
  }

  .clear-btn:hover {
    color: var(--color-danger);
    background: rgba(239, 68, 68, 0.1);
  }

  /* Suggestions Dropdown */
  .suggestions-dropdown {
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    max-height: 200px;
    overflow-y: auto;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
  }

  .suggestion-item {
    padding: 10px 14px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    color: var(--color-text-secondary);
    cursor: pointer;
    border-bottom: 1px solid var(--color-border);
    transition: all 0.15s ease;
  }

  .suggestion-item:last-child {
    border-bottom: none;
  }

  .suggestion-item:hover {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
  }

  .suggestion-item.is-top {
    color: var(--color-success);
  }

  /* Fullscreen Button */
  .fullscreen-btn {
    position: absolute;
    top: 16px;
    right: 16px;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: 1px solid var(--color-border);
    background: var(--color-bg-secondary);
    color: var(--color-text-secondary);
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .fullscreen-btn:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  /* Legend Panel */
  .legend-panel {
    width: 220px;
    background: var(--color-bg-secondary);
    border-left: 1px solid var(--color-border);
    padding: 16px;
    overflow-y: auto;
  }

  .legend-section {
    margin-bottom: 20px;
  }

  .legend-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-themecolor);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    margin-bottom: 4px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid transparent;
  }

  .legend-item:hover {
    background: var(--color-bg-tertiary);
    color : white;
  }

  .legend-item.active {
    background: var(--color-bg-tertiary);
    
    color : white;
  }

  .legend-item.dimmed {
    opacity: 0.4;
    
  }

  .legend-color {
    width: 14px;
    height: 14px;
    border-radius: 4px;
  }

  .legend-color.circle {
    border-radius: 50%;
  }

  .legend-label {
    font-size: 13px;
    color: var(--color-text-themecolor);
  }

  .legend-item.active .legend-label {
    color: var(--color-text-primary);
  }

  /* Loading Overlay */
  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(15, 23, 42, 0.8);
    backdrop-filter: blur(4px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    z-index: 20;
  }

  .loading-spinner {
    animation: spin 1s linear infinite;
    color: var(--color-accent);
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .loading-text {
    color: var(--color-text-secondary);
    font-size: 14px;
  }

  /* Tooltip */
  .graph-tooltip {
    position: absolute;
    pointer-events: none;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    z-index: 100;
    min-width: 180px;
    opacity: 0;
    transition: opacity 0.15s ease;
  }

  .graph-tooltip.visible {
    opacity: 1;
  }

  .tooltip-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--color-border);
  }

  .tooltip-id {
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .tooltip-badge {
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .tooltip-badge.top {
    background: var(--color-success);
    color: white;
  }

  .tooltip-badge.regular {
    background: var(--color-bg-tertiary);
    color: var(--color-text-secondary);
  }

  .tooltip-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    margin-bottom: 4px;
  }

  .tooltip-label {
    color: var(--color-text-muted);
  }

  .tooltip-value {
    font-family: 'JetBrains Mono', monospace;
    color: var(--color-text-primary);
  }

  /* Table View */
  .table-container {
    flex: 1;
    padding: 16px;
    overflow: auto;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .data-table th {
    text-align: left;
    padding: 12px 16px;
    background: var(--color-bg-secondary);
    color: var(--color-text-muted);
    font-weight: 600;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.5px;
    border-bottom: 1px solid var(--color-border);
  }

  .data-table td {
    padding: 12px 16px;
    border-bottom: 1px solid var(--color-border);
    color: var(--color-text-secondary);
  }

  .empty-table-message {
    text-align: center;
    padding: 40px;
    color: var(--color-text-muted);
  }

  /* Cluster Placeholder */
  .cluster-placeholder {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-muted);
    font-size: 16px;
  }

  /* D3 Specific Styles */
  .node-group {
    cursor: pointer;
  }

  .node-group:hover .node-circle {
    stroke-width: 3px;
    stroke: var(--color-accent);
  }

  .node-circle {
    transition: stroke-width 0.2s ease;
  }

  .edge-line {
    fill: none;
    stroke-width: 2;
    opacity: 0.7;
  }

  .edge-line:hover {
    opacity: 1;
    stroke-width: 3;
  }

  
/* Edge Tooltip Styles */
.edge-tooltip {
  position: absolute;
  pointer-events: none;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 12px 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  z-index: 100;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.edge-tooltip.visible {
  opacity: 1;
}

.edge-tooltip-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.edge-tooltip-nodes {
  display: flex;
  align-items: center;
  gap: 12px;
}

.edge-node-id {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 600;
  color: white;
  background: var(--color-bg-tertiary);
  padding: 4px 8px;
  border-radius: 4px;
}

.edge-direction-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.edge-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 600;
}

.edge-count.sent {
  color: var(--color-accent);
}

.edge-count.received {
  color: var(--color-warning);
}

.edge-arrow-icon {
  width: 32px;
  height: 32px;
}

.edge-type-badge {
  font-size: 10px;
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: 600;
  text-transform: capitalize;
  color: white;
}

/* Selection styles for nodes and edges */
.node-selected {
  animation: nodeSelectedPulse 1.5s ease-in-out infinite;
}

@keyframes nodeSelectedPulse {
  0%, 100% {
    filter: drop-shadow(0 0 4px rgba(59, 130, 246, 0.6));
  }
  50% {
    filter: drop-shadow(0 0 12px rgba(59, 130, 246, 0.9));
  }
}

.edge-selected {
  stroke-width: 4px !important;
  opacity: 1 !important;
  animation: edgeSelectedPulse 1.5s ease-in-out infinite;
}

@keyframes edgeSelectedPulse {
  0%, 100% {
    filter: drop-shadow(0 0 3px currentColor);
  }
  50% {
    filter: drop-shadow(0 0 8px currentColor);
  }
}

/* Selection Card Styles */
.selection-card {
  margin-top: 16px;
  
  border: 1px solid var(--color-border);
  border-radius: 10px;
  overflow: hidden;
}

.selection-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
}

.selection-card-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.selection-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.selection-close-btn:hover {
  background: var(--color-danger);
  color: white;
}

.selection-card-body {
  padding: 12px;
}

.selection-detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid var(--color-border);
}

.selection-detail-row:last-of-type {
  border-bottom: none;
  margin-bottom: 12px;
}

.selection-label {
  font-size: 11px;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.selection-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  
  color: var(--color-text-primary);
  font-weight: 800;
}

.selection-action-btn {
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: var(--color-accent);
  color: white;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
  margin-top: 4px;
}

.selection-action-btn:hover {
  background: var(--color-accent-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.selection-action-btn.link-analysis {
  background: var(--color-purple);
}

.selection-action-btn.link-analysis:hover {
  background: #7C3AED;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}
`;

// =============================================================================
// COMPONENT
// =============================================================================
const MuleNetworkAnalysis = () => {
  // State
  const [topLevelTab, setTopLevelTab] = useState('Mule Graph');
  const [innerTab, setInnerTab] = useState('Table View');
  const [initialData, setInitialData] = useState(null);
  const [displayData, setDisplayData] = useState(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, data: null });
  const [clusterData, setClusterData] = useState(null);
  const [isClusterLoading, setIsClusterLoading] = useState(false);
  const [graphData, setGraphData] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [tablePage, setTablePage] = useState(1);
  const [tableTotal, setTableTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Filter state
  const [activeNodeFilter, setActiveNodeFilter] = useState(null); // 'top' | 'regular' | null
  const [activeEdgeFilters, setActiveEdgeFilters] = useState(new Set()); // Set of edge types

  // Add after the existing state declarations
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [edgeTooltip, setEdgeTooltip] = useState({ visible: false, x: 0, y: 0, data: null });


  // Refs
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const simulationRef = useRef(null);





  const INITIAL_API_URL = `${API_BASE_URL}/mule/mule_network`;          // TODO: replace with your endpoint
  const SEARCH_API_URL = `${API_BASE_URL}/mule/get_filtered_graph`;

  const fetchInitialData = async () => {
    const res = await fetch(INITIAL_API_URL);
    const json = await res.json();
    // console.log(json.data)
    return new Promise((resolve) => {
      setTimeout(() => resolve(json), 800);
    });
  };

  const fetchFilteredGraph = async (nodeId) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/mule/get_filtered_graph?node_id=${encodeURIComponent(nodeId)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );

      if (!res.ok) {
        throw new Error(`Failed to fetch filtered graph: ${res.status}`);
      }

      const json = await res.json();

      setDisplayData(json.data);
      setGraphData(json.data);
    } catch (err) {
      console.error('fetchFilteredGraph error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTableData = async (page = 1, pageSize = 20) => {
  try {
    const res = await fetch(
      `${API_BASE_URL}/mule/mule_network_table?page=${page}&page_size=${pageSize}`
    );

    const json = await res.json();

    setTableData(json.data);
    setTableTotal(json.total);
  } catch (err) {
    console.error('Table API failed', err);
  }
};


useEffect(() => {
  if (innerTab === 'Table View') {
    fetchTableData(tablePage);
  }
}, [innerTab, tablePage]);

  const onNodeClick = (nodeId) => {
    fetchFilteredGraph(nodeId);
  };



  const onSearchSelect = (customerId) => {
    fetchFilteredGraph(customerId);
  };


  const fetchSearchData = async (accountId) => {

    const response = await fetch(`${SEARCH_API_URL}?node_id=${encodeURIComponent(accountId)}`, {

      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const data = await response.json();
    console.log(data);

    return new Promise((resolve) => {
      setTimeout(() => resolve(data), 800);
    });

    // return new Promise((resolve) => {
    //   setTimeout(() => {
    //     // Return a subset of data centered on the searched node
    //     const centerNode = accountId;
    //     const relatedEdges = initialData.data.edges.filter(
    //       e => e.source === centerNode || e.target === centerNode
    //     );
    //     const relatedNodes = new Set([centerNode]);
    //     relatedEdges.forEach(e => {
    //       relatedNodes.add(e.source);
    //       relatedNodes.add(e.target);
    //     });

    //     const filteredNodeInfo = {};
    //     relatedNodes.forEach(nodeId => {
    //       if (initialData.data.node_info[nodeId]) {
    //         filteredNodeInfo[nodeId] = initialData.data.node_info[nodeId];
    //       }
    //     });

    //     resolve({
    //       data: {
    //         nodes: Array.from(relatedNodes),
    //         edges: relatedEdges,
    //         node_info: filteredNodeInfo
    //       }
    //     });
    //   }, 600);
    // });
  };

  // =============================================================================
  // CONSTANTS
  // =============================================================================
  const EDGE_COLORS = {
    'incoming': '#3B82F6',    // Blue
    'outgoing': '#F59E0B',    // Amber
    'indirect': '#8B5CF6',    // Purple
    'high-volume': '#EF4444', // Red
  };

  const NODE_COLORS = {
    top: '#ed3c3cff',      // Green for top nodes
    regular: '#86ee88ff',  // Slate for regular nodes
  };

  const handleEdgeClick = useCallback((edgeData) => {
  setSelectedNode(null); // Deselect any selected node
  setSelectedEdge(prev => {
    if (prev && prev.source === edgeData.source && prev.target === edgeData.target && prev.type === edgeData.type) {
      return null; // Unselect if same edge clicked
    }
    return edgeData;
  });
}, []);

const handleNodeSelect = useCallback((nodeId) => {
  setSelectedEdge(null); // Deselect any selected edge
  setSelectedNode(prev => {
    if (prev === nodeId) {
      return null; // Unselect if same node clicked
    }
    return nodeId;
  });
  setSearchValue(nodeId);
}, []);

// Helper function to get transaction counts between two nodes
const getEdgeTransactionCounts = useCallback((source, target) => {
  if (!displayData) return { sent: 0, received: 0 };
  
  const sent = displayData.edges.filter(
    e => e.source === source && e.target === target
  ).length;
  
  const received = displayData.edges.filter(
    e => e.source === target && e.target === source
  ).length;
  
  return { sent, received };
}, [displayData]);


  // =============================================================================
  // DATA FETCHING
  // =============================================================================
  useEffect(() => {
    const loadInitialData = async () => {
      setIsInitialLoading(true);

      try {
        const response = await fetchInitialData();
        setGraphData(response.data);
        setTableData(response.data);
        setInitialData(response.data);
        setDisplayData(response.data);
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
      } finally {
        setIsInitialLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // =============================================================================
  // SEARCH LOGIC
  // =============================================================================
  const handleSearchChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setSearchValue(value);
    setShowSuggestions(value.length > 0);

    if (value === '') {
      // Revert to initial data when search is cleared
      setDisplayData(initialData);
      setIsSearchActive(false);
    }
  };

  const handleClearSearch = () => {
    setSearchValue('');
    setShowSuggestions(false);
    setDisplayData(initialData);
    setIsSearchActive(false);
  };

  const filteredSuggestions = useMemo(() => {
    if (!initialData || !searchValue) return [];
    return initialData.nodes
      .filter(nodeId => nodeId.includes(searchValue))
      .slice(0, 10);
  }, [initialData, searchValue]);

  const isValidSearch = useMemo(() => {
    if (!initialData || !searchValue) return false;
    return initialData.nodes.includes(searchValue);
  }, [initialData, searchValue]);

  // const handleSearch = async () => {
  //   if (!isValidSearch) return;

  //   setIsSearchLoading(true);
  //   setShowSuggestions(false);

  //   try {
  //     const response = await fetchSearchData(searchValue);
  //     setDisplayData(response);
  //     setIsSearchActive(true);
  //   } catch (error) {
  //     console.error('Search failed:', error);
  //   } finally {
  //     setIsSearchLoading(false);
  //   }
  // };

  const handleSearch = async () => {
    if (!isValidSearch) return;

    setIsSearchLoading(true);
    setShowSuggestions(false);

    try {
      await fetchFilteredGraph(searchValue); // 🔥 API CALL
      setIsSearchActive(true);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearchLoading(false);
    }
  };

  const handleSuggestionSelect = (nodeId) => {
    setSearchValue(nodeId);
    setShowSuggestions(false);

    fetchFilteredGraph(nodeId); // 🔥 API CALL
  };

  const handleNodeClick = useCallback((nodeId) => {
    setSearchValue(nodeId);
  }, []);

  // =============================================================================
  // FILTER LOGIC
  // =============================================================================
  const handleNodeFilterClick = (filterType) => {
    setActiveNodeFilter(prev => prev === filterType ? null : filterType);
  };

  const handleEdgeFilterClick = (edgeType) => {
    setActiveEdgeFilters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(edgeType)) {
        newSet.delete(edgeType);
      } else {
        newSet.add(edgeType);
      }
      return newSet;
    });
  };

  // =============================================================================
  // D3 VISUALIZATION
  // =============================================================================
  useEffect(() => {
    if (!displayData || innerTab !== 'Graph View' || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = svgRef.current.parentElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Clear previous visualization
    svg.selectAll('*').remove();

    // Stop previous simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    // Create zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Main group for zoom/pan
    const g = svg.append('g');

    // Prepare data
    const nodes = displayData.nodes.map(id => ({
      id,
      ...displayData.node_info[id],
    }));

    const links = displayData.edges.map(e => ({
      source: e.source,
      target: e.target,
      type: e.type,
    }));

    // Filter visibility based on active filters
    const getNodeOpacity = (node) => {
      if (activeNodeFilter === null) return 1;
      if (activeNodeFilter === 'top' && node.is_top) return 1;
      if (activeNodeFilter === 'regular' && !node.is_top) return 1;
      return 0.1;
    };

    const getEdgeOpacity = (edge) => {
      if (activeEdgeFilters.size === 0) return 0.7;
      if (activeEdgeFilters.has(edge.type)) return 0.9;
      return 0.1;
    };

    // Create simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    simulationRef.current = simulation;

    // Arrow markers for edge direction
    const defs = svg.append('defs');
    Object.entries(EDGE_COLORS).forEach(([type, color]) => {
      defs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 25)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('fill', color)
        .attr('d', 'M0,-5L10,0L0,5');
    });

    // Draw edges
    // const link = g.append('g')
    //   .attr('class', 'edges')
    //   .selectAll('line')
    //   .data(links)
    //   .join('line')
    //   .attr('class', 'edge-line')
    //   .attr('stroke', d => EDGE_COLORS[d.type] || '#666')
    //   .attr('marker-end', d => `url(#arrow-${d.type})`)
    //   .style('opacity', d => getEdgeOpacity(d));


    // Draw edges
const link = g.append('g')
  .attr('class', 'edges')
  .selectAll('line')
  .data(links)
  .join('line')
  .attr('class', d => {
    const isSelected = selectedEdge && 
      selectedEdge.source === d.source && 
      selectedEdge.target === d.target && 
      selectedEdge.type === d.type;
    return `edge-line ${isSelected ? 'edge-selected' : ''}`;
  })
  .attr('stroke', d => EDGE_COLORS[d.type] || '#666')
  .attr('marker-end', d => `url(#arrow-${d.type})`)
  .style('opacity', d => getEdgeOpacity(d))
  .style('cursor', 'pointer')
  .on('click', (event, d) => {
    event.stopPropagation();
    handleEdgeClick({
      source: d.source.id || d.source,
      target: d.target.id || d.target,
      type: d.type
    });
  })
  .on('mouseenter', (event, d) => {
    const rect = container.getBoundingClientRect();
    const sourceId = d.source.id || d.source;
    const targetId = d.target.id || d.target;
    setEdgeTooltip({
      visible: true,
      x: event.clientX - rect.left + 10,
      y: event.clientY - rect.top - 10,
      data: {
        source: sourceId,
        target: targetId,
        type: d.type,
        ...getEdgeTransactionCounts(sourceId, targetId)
      }
    });
  })
  .on('mousemove', (event) => {
    const rect = container.getBoundingClientRect();
    setEdgeTooltip(prev => ({
      ...prev,
      x: event.clientX - rect.left + 10,
      y: event.clientY - rect.top - 10,
    }));
  })
  .on('mouseleave', () => {
    setEdgeTooltip({ visible: false, x: 0, y: 0, data: null });
  });


    // Draw nodes
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'node-group')
      .style('opacity', d => getNodeOpacity(d))
      .call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    // Node circles
    // node.append('circle')
    //   .attr('class', 'node-circle')
    //   .attr('r', d => d.is_top ? 20 : 14)
    //   .attr('fill', d => d.is_top ? NODE_COLORS.top : NODE_COLORS.regular)
    //   .attr('stroke', d => d.is_top ? '#059669' : '#475569')
    //   .attr('stroke-width', 2);


      // Node circles
node.append('circle')
  .attr('class', d => `node-circle ${selectedNode === d.id ? 'node-selected' : ''}`)
  .attr('r', d => d.is_top ? 20 : 14)
  .attr('fill', d => d.is_top ? NODE_COLORS.top : NODE_COLORS.regular)
  .attr('stroke', d => {
    if (selectedNode === d.id) return '#3B82F6';
    return d.is_top ? '#059669' : '#475569';
  })
  .attr('stroke-width', d => selectedNode === d.id ? 3 : 2);

    // User icon in nodes
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', d => d.is_top ? '14px' : '10px')
      .attr('fill', 'white')
      .text('👤');

    // Node labels
    node.append('text')
      .attr('dy', d => d.is_top ? 35 : 28)
      .attr('text-anchor', 'middle')
      .attr('fill', '#0f0f0fff')
      .attr('font-size', '10px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .text(d => d.id);

    // Node interactions
    node
      // .on('click', (event, d) => {
      //   handleNodeClick(d.id);
      // })
      .on('click', (event, d) => {
    event.stopPropagation();
    handleNodeSelect(d.id);
    fetchFilteredGraph(d.id);
  })
      .on('mouseenter', (event, d) => {
        const rect = container.getBoundingClientRect();
        setTooltip({
          visible: true,
          x: event.clientX - rect.left + 10,
          y: event.clientY - rect.top - 10,
          data: d,
        });
      })
      .on('mousemove', (event) => {
        const rect = container.getBoundingClientRect();
        setTooltip(prev => ({
          ...prev,
          x: event.clientX - rect.left + 10,
          y: event.clientY - rect.top - 10,
        }));
      })
      .on('mouseleave', () => {
        setTooltip({ visible: false, x: 0, y: 0, data: null });
      });

    // Simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Initial zoom to fit
    const initialScale = 0.8;
    svg.call(zoom.transform, d3.zoomIdentity
      .translate(width * (1 - initialScale) / 2, height * (1 - initialScale) / 2)
      .scale(initialScale));

    // Cleanup
    return () => {
      simulation.stop();
    };
  // }, [displayData, innerTab, activeNodeFilter, activeEdgeFilters, handleNodeClick]);
  }, [displayData, innerTab, activeNodeFilter, activeEdgeFilters, handleNodeClick]);
  // }, [displayData, innerTab, activeNodeFilter, activeEdgeFilters, handleNodeClick, selectedNode, selectedEdge, handleEdgeClick, handleNodeSelect, getEdgeTransactionCounts]);

  // Update opacity when filters change
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);

    svg.selectAll('.node-group')
      .transition()
      .duration(300)
      .style('opacity', function () {
        const data = d3.select(this).datum();
        if (activeNodeFilter === null) return 1;
        if (activeNodeFilter === 'top' && data.is_top) return 1;
        if (activeNodeFilter === 'regular' && !data.is_top) return 1;
        return 0.1;
      });

    svg.selectAll('.edge-line')
      .transition()
      .duration(300)
      .style('opacity', function () {
        const data = d3.select(this).datum();
        if (activeEdgeFilters.size === 0) return 0.7;
        if (activeEdgeFilters.has(data.type)) return 0.9;
        return 0.1;
      });
  }, [activeNodeFilter, activeEdgeFilters]);

  useEffect(() => {
  if (topLevelTab !== 'Cluster') return;

  if (clusterData) return; // prevent re-fetching

  const fetchClusterData = async () => {
    try {
      setIsClusterLoading(true);

      const res = await fetch(`${API_BASE_URL}/mule/mule_cluster`);
      const json = await res.json();

      setClusterData(json);
    } catch (err) {
      console.error('Cluster API error:', err);
    } finally {
      setIsClusterLoading(false);
    }
  };

  fetchClusterData();
}, [topLevelTab]);


  // =============================================================================
  // COMPUTED VALUES
  // =============================================================================
  const nodeCount = displayData?.nodes?.length || 0;
  const edgeCount = displayData?.edges?.length || 0;
  // const displayData = graphData;


  // =============================================================================
  // RENDER
  // =============================================================================
  return (
    <>
      <style>{styles}</style>
      <div className={`mule-network-container ${isFullscreen ? 'fullscreen' : ''}`} ref={containerRef}>
        {/* Top Level Tabs */}
        <div className="top-tabs">
          <button
            className={`top-tab ${topLevelTab === 'Mule Graph' ? 'active' : ''}`}
            onClick={() => setTopLevelTab('Mule Graph')}
          >
            Mule Graph
          </button>

          <button
            className={`top-tab ${topLevelTab === 'Cluster' ? 'active' : ''}`}
            onClick={() => setTopLevelTab('Cluster')}
          >
            Cluster
          </button>
        </div>

        {topLevelTab === 'Mule Graph' && (
          <>
            {/* Inner Header */}
            <div className="inner-header">
              <div className="inner-tabs">
                {/* {['Table View', 'Graph View'].map(tab => ( */}
                {['Table View'].map(tab => (
                  <button
                    key={tab}
                    className={`inner-tab ${innerTab === tab ? 'active' : ''}`}
                    onClick={() => setInnerTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="stats-display">
                <div className="stat-item">
                  <span className="stat-label">Nodes:</span>
                  <span className="stat-value">{nodeCount}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Edges:</span>
                  <span className="stat-value">{edgeCount}</span>
                </div>
              </div>
            </div>

            {innerTab === 'Graph View' ? (
              <div className={`graph-container ${isFullscreen ? 'fullscreen' : ''}`}>
                <div className="graph-area">
                  {/* Search Box */}
                  <div className="search-box">
                    <div className="search-input-container">
                      <input
                        type="text"
                        className="search-input"
                        placeholder="Search or Select account..."
                        value={searchValue}
                        onChange={handleSearchChange}
                        onFocus={() => searchValue && setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      />
                      {searchValue && (
                        <button
                          className="search-btn clear-btn"
                          onClick={handleClearSearch}
                          aria-label="Clear search"
                        >
                          <X size={16} />
                        </button>
                      )}
                      <button
                        className="search-btn"
                        onClick={handleSearch}
                        disabled={!isValidSearch || isSearchLoading}
                        aria-label="Search"
                      >
                        <Search size={16} />
                      </button>
                    </div>
                    {showSuggestions && filteredSuggestions.length > 0 && (
                      <div className="suggestions-dropdown">
                        {filteredSuggestions.map(nodeId => (
                          <div
                            key={nodeId}
                            className={`suggestion-item ${initialData?.node_info[nodeId]?.is_top ? 'is-top' : ''}`}
                            onClick={() => handleSuggestionSelect(nodeId)}
                          >
                            {nodeId}
                            {initialData?.node_info[nodeId]?.is_top && ' (Top)'}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Fullscreen Button */}
                  <button
                    className="fullscreen-btn"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                  >
                    {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                  </button>

                  {/* SVG Graph */}
                  <svg ref={svgRef} className="graph-svg" />


                      {/* Edge Tooltip */}
<div
  className={`edge-tooltip ${edgeTooltip.visible ? 'visible' : ''}`}
  style={{ left: edgeTooltip.x, top: edgeTooltip.y }}
>
  {edgeTooltip.data && (
    <div className="edge-tooltip-content">
      <div className="edge-tooltip-nodes">
        <span className="edge-node-id">{edgeTooltip.data.source}</span>
        <div className="edge-direction-indicator">
          <span className="edge-count sent">{edgeTooltip.data.sent}</span>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="edge-arrow-icon">
            <path d="M7 12H17M17 12L13 8M17 12L13 16" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M17 12H7M7 12L11 8M7 12L11 16" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="translate(0, 6)"/>
          </svg>
          <span className="edge-count received">{edgeTooltip.data.received}</span>
        </div>
        <span className="edge-node-id">{edgeTooltip.data.target}</span>
      </div>
      <div className="edge-type-badge" style={{ background: EDGE_COLORS[edgeTooltip.data.type] }}>
        {edgeTooltip.data.type}
      </div>
    </div>
  )}
</div>















                  {/* Tooltip */}
                  <div
                    className={`graph-tooltip ${tooltip.visible ? 'visible' : ''}`}
                    style={{ left: tooltip.x, top: tooltip.y }}
                  >
                    {tooltip.data && (
                      <>
                        <div className="tooltip-header">
                          <span className="tooltip-id">{tooltip.data.id}</span>
                          <span className={`tooltip-badge ${tooltip.data.is_top ? 'top' : 'regular'}`}>
                            {tooltip.data.is_top ? 'Mule Customer' : 'Regular'}
                          </span>
                        </div>
                        {tooltip.data.label && (
                          <div className="tooltip-row">
                            <span className="tooltip-label">Label</span>
                            <span className="tooltip-value">{tooltip.data.label}</span>
                          </div>
                        )}
                        <div className="tooltip-row">
                          <span className="tooltip-label">Transactions</span>
                          <span className="tooltip-value">{tooltip.data.transaction_count || 0}</span>
                        </div>
                        <div className="tooltip-row">
                          <span className="tooltip-label">Connections</span>
                          <span className="tooltip-value">{tooltip.data.connections || 0}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Loading Overlay */}
                  {(isInitialLoading || isSearchLoading) && (
                    <div className="loading-overlay">
                      <Loader2 size={40} className="loading-spinner" />
                      <span className="loading-text">
                        {isInitialLoading ? 'Loading network data...' : 'Searching...'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Legend Panel */}
                <div className="legend-panel">
                  <div className="legend-section">
                    <div className="legend-title">
                      <Filter size={14} />
                      Node Types
                    </div>
                    <div
                      className={`legend-item ${activeNodeFilter === 'top' ? 'active' : ''} ${activeNodeFilter && activeNodeFilter !== 'top' ? 'dimmed' : ''}`}
                      onClick={() => handleNodeFilterClick('top')}
                    >
                      <div className="legend-color circle" style={{ background: NODE_COLORS.top }} />
                      <span className="legend-label">Mule Customers</span>
                    </div>
                    <div
                      className={`legend-item ${activeNodeFilter === 'regular' ? 'active' : ''} ${activeNodeFilter && activeNodeFilter !== 'regular' ? 'dimmed' : ''}`}
                      onClick={() => handleNodeFilterClick('regular')}
                    >
                      <div className="legend-color circle" style={{ background: NODE_COLORS.regular }} />
                      <span className="legend-label">Regular Nodes</span>
                    </div>
                  </div>

                  <div className="legend-section">
                    <div className="legend-title">
                      <Filter size={14} />
                      Edge Types
                    </div>
                    {Object.entries(EDGE_COLORS).map(([type, color]) => (
                      <div
                        key={type}
                        className={`legend-item ${activeEdgeFilters.has(type) ? 'active' : ''} ${activeEdgeFilters.size > 0 && !activeEdgeFilters.has(type) ? 'dimmed' : ''}`}
                        onClick={() => handleEdgeFilterClick(type)}
                      >
                        <div className="legend-color" style={{ background: color }} />
                        <span className="legend-label" style={{ textTransform: 'capitalize' }}>
                          {type.replace('-', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>



                  {/* Selection Details Card */}
{(selectedNode || selectedEdge) && (
  <div className="selection-card">
    <div className="selection-card-header">
      <span className="selection-card-title">
        {selectedNode ? 'Node Selected' : 'Edge Selected'}
      </span>
      <button 
        className="selection-close-btn"
        onClick={() => {
          setSelectedNode(null);
          setSelectedEdge(null);
        }}
        aria-label="Clear selection"
      >
        <X size={14} />
      </button>
    </div>
    
    <div className="selection-card-body">
      {selectedNode && (
        <>
          <div className="selection-detail-row">
            <span className="selection-label">Node ID</span>
            <span className="selection-value">{selectedNode}</span>
          </div>
          {displayData?.node_info[selectedNode] && (
            <>
              <div className="selection-detail-row">
                <span className="selection-label">Type</span>
                <span className="selection-value" style={{ color: displayData.node_info[selectedNode].is_top ? '#10B981' : '#64748B' }}>
                  {displayData.node_info[selectedNode].is_top ? 'Top Node' : 'Regular'}
                </span>
              </div>
              <div className="selection-detail-row">
                <span className="selection-label">Transactions</span>
                <span className="selection-value">{displayData.node_info[selectedNode].transaction_count || 0}</span>
              </div>
              <div className="selection-detail-row">
                <span className="selection-label">Connections</span>
                <span className="selection-value">{displayData.node_info[selectedNode].connections || 0}</span>
              </div>
            </>
          )}
          {/*
          <button className="selection-action-btn">
            View Transaction Analysis
          </button>
          */}
        </>
      )}
      
      {selectedEdge && (
        <>
          <div className="selection-detail-row">
            <span className="selection-label">Source</span>
            <span className="selection-value">{selectedEdge.source}</span>
          </div>
          <div className="selection-detail-row">
            <span className="selection-label">Target</span>
            <span className="selection-value">{selectedEdge.target}</span>
          </div>
          <div className="selection-detail-row">
            <span className="selection-label">Type</span>
            <span className="selection-value" style={{ color: EDGE_COLORS[selectedEdge.type], textTransform: 'capitalize' }}>
              {selectedEdge.type.replace('-', ' ')}
            </span>
          </div>
          {/* <button className="selection-action-btn link-analysis">
            View Link Analysis
          </button> */}
        </>
      )}
    </div>
  </div>
)}















                </div>
              </div>
            ) : (
              /* Table View */
              // wherever you render the table
              <div >
              {/* <TableView displayData={displayData} pageSize={10} /> */}
              {/* <TableView
                displayData={tableData}
                pageSize={20}
                onViewCustomer={(customerId) => {
                  // 1️⃣ Switch to Graph tab
                  setInnerTab('Graph View');

                  // 2️⃣ Select node visually
                  setSelectedNode(customerId);
                  setSearchValue(customerId);

                  // 3️⃣ Fetch filtered graph
                  fetchFilteredGraph(customerId);
                }}
              /> */}
              <TableView
                tableData={tableData}
                total={tableTotal}
                pageSize={20}
                onPageChange={(p) => setTablePage(p)}
                onViewCustomer={(nodeId) => {
                  setInnerTab('Graph View');
                  setSearchValue(nodeId);
                  fetchFilteredGraph(nodeId);
                }}
              />
              </div>
              // <div className="table-container">
              //   <table className="data-table">
              //     <thead>
              //       <tr>
              //         <th>Node ID</th>
              //         <th>Type</th>
              //         <th>Transactions</th>
              //         <th>Connections</th>
              //         <th>Label</th>
              //       </tr>
              //     </thead>
              //     <tbody>
              //       {displayData?.nodes?.length > 0 ? (
              //         displayData.nodes.map(nodeId => {
              //           const info = displayData.node_info[nodeId] || {};
              //           return (
              //             <tr key={nodeId}>
              //               <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>{nodeId}</td>
              //               <td>
              //                 <span style={{
              //                   color: info.is_top ? '#10B981' : '#64748B',
              //                   fontWeight: info.is_top ? 600 : 400
              //                 }}>
              //                   {info.is_top ? 'Top' : 'Regular'}
              //                 </span>
              //               </td>
              //               <td>{info.transaction_count || '-'}</td>
              //               <td>{info.connections || '-'}</td>
              //               <td>{info.label || '-'}</td>
              //             </tr>
              //           );
              //         })
              //       ) : (
              //         <tr>
              //           <td colSpan={5} className="empty-table-message">
              //             No data available
              //           </td>
              //         </tr>
              //       )}
              //     </tbody>
              //   </table>
              // </div>
            )}
          </>
        )}

        {topLevelTab === 'Cluster' && (
          <div className="graph-container" style={{background: '#f0f0f0'}}>
            {isClusterLoading && (
              <div className="loading-overlay">
                <span>Loading clusters...</span>
              </div>
            )}

            {!isClusterLoading && clusterData?.clusterGroups && (
              <ClusterView
              clusterGroups={clusterData.clusterGroups}
              centers={clusterData.centers}
              summary={clusterData.summary}
            />
            )}

            {!isClusterLoading && !clusterData?.clusterGroups && (
              <div className="cluster-placeholder">
                No cluster data available
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default MuleNetworkAnalysis;
