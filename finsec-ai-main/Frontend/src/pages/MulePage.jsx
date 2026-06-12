import React, { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '../service/service';
import  MuleAnalysis from './MuleAnalysis';
import TransactionLinkAnalysis from './TransactionLinkAnalysis';
import TransactionLinkGraph from './TransactionLinkGraph';
import { use } from 'react';
import MuleNetworkAnalysis from './MuleNetworkAnalysis';


const MulePage = ({ themeColor = '#012834' }) => {
  const [patterns, setPatterns] = useState([]);
  const [selectedPattern, setSelectedPattern] = useState('');
  const [networkData, setNetworkData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hoveredEdge, setHoveredEdge] = useState(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, data: null });
  const canvasRef = useRef(null);
  const [selectedTab, setSelectedTab] = useState('graph1');

  useEffect(() => {
    fetchPatterns();
  }, []);

  useEffect(() => {
    if (networkData && canvasRef.current) {
      drawNetwork();
    }
  }, [networkData, hoveredEdge]);

  const fetchPatterns = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/mule/patterns`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();

  
      setPatterns(data.patterns || []);
    } catch (err) {
      console.error('Error fetching patterns:', err);
      setError('Failed to load patterns');
    }
  };

  const fetchPatternData = async (patternType) => {
    setLoading(true);
    setError(null);



    try {
      const response = await fetch(`${API_BASE_URL}/mule/pattern/${patternType}`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
          // console.log(data)
      setNetworkData(data);
    } catch (err) {
      console.error('Error fetching pattern data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/mule/pattern/${patternType}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
          // console.log(data)
      // setNetworkData(data);
    } catch (err) {
      console.error('Error fetching pattern data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePatternChange = (e) => {
    const pattern = e.target.value;
    setSelectedPattern(pattern);
    if (pattern) {
      fetchPatternData(pattern);
    } else {
      setNetworkData(null);
    }
  };

  const drawNetwork = () => {
    const canvas = canvasRef.current;
    if (!canvas || !networkData) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const nodes = networkData.nodes;
    const edges = networkData.edges;

    // Calculate node positions using force-directed layout
    const nodePositions = calculateNodePositions(nodes, edges, width, height);

    // Draw edges
    edges.forEach((edge, index) => {
      const source = nodePositions[edge.source];
      const target = nodePositions[edge.target];

      if (!source || !target) return;

      const isHovered = hoveredEdge === index;
      const isLaundering = edge.is_laundering === 1;

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      
      if (isHovered) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 4;
      } else if (isLaundering) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
      }
      
      ctx.stroke();

      // Draw arrow
      drawArrow(ctx, source.x, source.y, target.x, target.y, isHovered ? '#fbbf24' : (isLaundering ? '#ef4444' : '#10b981'));
    });

    // Draw nodes
    Object.entries(nodePositions).forEach(([nodeId, pos]) => {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 20, 0, 2 * Math.PI);
      ctx.fillStyle = themeColor;
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw node label
      ctx.fillStyle = 'white';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(nodeId.substring(0, 8), pos.x, pos.y);
    });
  };

  const calculateNodePositions = (nodes, edges, width, height) => {
    const positions = {};
    const padding = 100;
    
    if (nodes.length === 0) return positions;

    // Simple circular layout
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - padding;

    nodes.forEach((node, index) => {
      const angle = (2 * Math.PI * index) / nodes.length;
      positions[node.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });

    return positions;
  };

  const drawArrow = (ctx, fromX, fromY, toX, toY, color) => {
    const headLength = 15;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    
    const arrowX = toX - 20 * Math.cos(angle);
    const arrowY = toY - 20 * Math.sin(angle);

    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(
      arrowX - headLength * Math.cos(angle - Math.PI / 6),
      arrowY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(
      arrowX - headLength * Math.cos(angle + Math.PI / 6),
      arrowY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const handleCanvasMouseMove = (e) => {
    if (!networkData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const nodes = networkData.nodes;
    const edges = networkData.edges;
    const nodePositions = calculateNodePositions(nodes, edges, canvas.width, canvas.height);

    let foundEdge = null;
    let edgeIndex = -1;

    edges.forEach((edge, index) => {
      const source = nodePositions[edge.source];
      const target = nodePositions[edge.target];

      if (!source || !target) return;

      const distance = distanceToLine(mouseX, mouseY, source.x, source.y, target.x, target.y);
      
      if (distance < 10) {
        foundEdge = edge;
        edgeIndex = index;
      }
    });

    if (foundEdge) {
      setHoveredEdge(edgeIndex);
      setTooltip({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        data: foundEdge
      });
      canvas.style.cursor = 'pointer';
    } else {
      setHoveredEdge(null);
      setTooltip({ visible: false, x: 0, y: 0, data: null });
      canvas.style.cursor = 'default';
    }
  };

//   const rawData = [
//   {
//     "Timestamp": "01-09-2022 00:43",
//     "From Bank": 12963,
//     "Account": "80296CA20",
//     "To Bank ": 241869,
//     "Account1": "80F390FC0",
//     "Amount Received ": 12562.68,
//     "Receiving Currency": "Swiss Franc",
//     "Amount Paid": 12562.68,
//     "Payment Currency": "Swiss Franc",
//     "Payment Format": "ACH",
//     "Is Laundering": 1
//   },
//   {
//     "Timestamp": "01-09-2022 07:15",
//     "From Bank": 1588,
//     "Account": "801ABC430",
//     "To Bank ": 241869,
//     "Account1": "80F390FC0",
//     "Amount Received ": 10475.35,
//     "Receiving Currency": "Swiss Franc",
//     "Amount Paid": 10475.35,
//     "Payment Currency": "Swiss Franc",
//     "Payment Format": "ACH",
//     "Is Laundering": 1
//   },
//   {
//     "Timestamp": "01-09-2022 15:25",
//     "From Bank": 3051,
//     "Account": "8012E62B0",
//     "To Bank ": 241869,
//     "Account1": "80F390FC0",
//     "Amount Received ": 13315.35,
//     "Receiving Currency": "Swiss Franc",
//     "Amount Paid": 13315.35,
//     "Payment Currency": "Swiss Franc",
//     "Payment Format": "ACH",
//     "Is Laundering": 1
//   },
//   {
//     "Timestamp": "01-09-2022 15:32",
//     "From Bank": 2843,
//     "Account": "8043B07C0",
//     "To Bank ": 241869,
//     "Account1": "80F390FC0",
//     "Amount Received ": 7999.49,
//     "Receiving Currency": "Swiss Franc",
//     "Amount Paid": 7999.49,
//     "Payment Currency": "Swiss Franc",
//     "Payment Format": "ACH",
//     "Is Laundering": 1
//   },
//   {
//     "Timestamp": "01-09-2022 17:25",
//     "From Bank": 29788,
//     "Account": "80399CED0",
//     "To Bank ": 241869,
//     "Account1": "80F390FC0",
//     "Amount Received ": null,
//     "Receiving Currency": "Swiss Franc",
//     "Amount Paid": 8430.98,
//     "Payment Currency": "Swiss Franc",
//     "Payment Format": "ACH",
//     "Is Laundering": 1
//   },
//   {
//     "Timestamp": "02-09-2022 07:29",
//     "From Bank": 28183,
//     "Account": "80BF4C160",
//     "To Bank ": 241869,
//     "Account1": "80F390FC0",
//     "Amount Received ": 295.9,
//     "Receiving Currency": "Swiss Franc",
//     "Amount Paid": 295.9,
//     "Payment Currency": "Swiss Franc",
//     "Payment Format": "ACH",
//     "Is Laundering": 1
//   },
//   {
//     "Timestamp": "02-09-2022 15:44",
//     "From Bank": 131167,
//     "Account": "80C21E690",
//     "To Bank ": 241869,
//     "Account1": "80F390FC0",
//     "Amount Received ": 3354.5,
//     "Receiving Currency": "Swiss Franc",
//     "Amount Paid": 3354.5,
//     "Payment Currency": "Swiss Franc",
//     "Payment Format": "ACH",
//     "Is Laundering": 1
//   },
//   {
//     "Timestamp": "03-09-2022 03:54",
//     "From Bank": 129974,
//     "Account": "80FE25690",
//     "To Bank ": 241869,
//     "Account1": "80F390FC0",
//     "Amount Received ": 9547.03,
//     "Receiving Currency": "Swiss Franc",
//     "Amount Paid": 9547.03,
//     "Payment Currency": "Swiss Franc",
//     "Payment Format": "ACH",
//     "Is Laundering": 1
//   },
//   {
//     "Timestamp": "03-09-2022 07:12",
//     "From Bank": 3051,
//     "Account": "806A3D750",
//     "To Bank ": 241869,
//     "Account1": "80F390FC0",
//     "Amount Received ": 2024.65,
//     "Receiving Currency": "Swiss Franc",
//     "Amount Paid": 2024.65,
//     "Payment Currency": "Swiss Franc",
//     "Payment Format": "ACH",
//     "Is Laundering": 1
//   },
//   {
//     "Timestamp": "03-09-2022 11:07",
//     "From Bank": 13157,
//     "Account": "805CA5A30",
//     "To Bank ": 241869,
//     "Account1": "80F390FC0",
//     "Amount Received ": 4513.56,
//     "Receiving Currency": "Swiss Franc",
//     "Amount Paid": 4513.56,
//     "Payment Currency": "Swiss Franc",
//     "Payment Format": "ACH",
//     "Is Laundering": 1
//   },
//   {
//     "Timestamp": "03-09-2022 14:28",
//     "From Bank": 1047,
//     "Account": "8031B5390",
//     "To Bank ": 241869,
//     "Account1": "80F390FC0",
//     "Amount Received ": 12427.99,
//     "Receiving Currency": "Swiss Franc",
//     "Amount Paid": 12427.99,
//     "Payment Currency": "Swiss Franc",
//     "Payment Format": "ACH",
//     "Is Laundering": 1
//   },
//   {
//     "Timestamp": "04-09-2022 14:07",
//     "From Bank": 214050,
//     "Account": "80543C3C0",
//     "To Bank ": 241869,
//     "Account1": "80F390FC0",
//     "Amount Received ": 1514.49,
//     "Receiving Currency": "Swiss Franc",
//     "Amount Paid": 1514.49,
//     "Payment Currency": "Swiss Franc",
//     "Payment Format": "ACH",
//     "Is Laundering": 1
//   },
//   {
//     "Timestamp": "04-09-2022 16:21",
//     "From Bank": 1501,
//     "Account": "808C45FE0",
//     "To Bank ": 241869,
//     "Account1": "80F390FC0",
//     "Amount Received ": 10058.54,
//     "Receiving Currency": "Swiss Franc",
//     "Amount Paid": 10058.54,
//     "Payment Currency": "Swiss Franc",
//     "Payment Format": "ACH",
//     "Is Laundering": 1
//   },
//   {
//     "Timestamp": "04-09-2022 16:37",
//     "From Bank": 241869,
//     "Account": "80F390FC0",
//     "To Bank ": 7548,
//     "Account1": "805284730",
//     "Amount Received ": 11674.83,
//     "Receiving Currency": "Euro",
//     "Amount Paid": 11674.83,
//     "Payment Currency": "Euro",
//     "Payment Format": "ACH",
//     "Is Laundering": 1
//   },
//   {
//     "Timestamp": "04-09-2022 17:23",
//     "From Bank": 241869,
//     "Account": "80F390FC0",
//     "To Bank ": 1467,
//     "Account1": "801D43090",
//     "Amount Received ": 4832.76,
//     "Receiving Currency": "US Dollar",
//     "Amount Paid": 4832.76,
//     "Payment Currency": "US Dollar",
//     "Payment Format": "ACH",
//     "Is Laundering": 1
//   },
//   {
//     "Timestamp": "06-09-2022 18:07",
//     "From Bank": 241869,
//     "Account": "80F390FC0",
//     "To Bank ": 22736,
//     "Account1": "807DC76A0",
//     "Amount Received ": 6240.05,
//     "Receiving Currency": "US Dollar",
//     "Amount Paid": 6240.05,
//     "Payment Currency": "US Dollar",
//     "Payment Format": "ACH",
//     "Is Laundering": 1
//   },
//   {
//     "Timestamp": "06-09-2022 19:16",
//     "From Bank": 241869,
//     "Account": "80F390FC0",
//     "To Bank ": 129974,
//     "Account1": "80E0D4970",
//     "Amount Received ": 7782.25,
//     "Receiving Currency": "US Dollar",
//     "Amount Paid": 7782.25,
//     "Payment Currency": "US Dollar",
//     "Payment Format": "ACH",
//     "Is Laundering": 1
//   }
// ]







// const sampleTransactionData = [
//   {
//     "Timestamp": "01-09-2022 00:43",
//     "From Bank": 12963,
//     "Account": "80296CA20",
//     "To Bank ": 241869,
//     "Account1": "80F390FC0",
//     "Amount Received ": 12562.68,
//     "Receiving Currency": "Swiss Franc",
//     "Amount Paid": 12562.68,
//     "Payment Currency": "Swiss Franc",
//     "Payment Format": "ACH",
//     "Is Laundering": 1
//   },
//   {
//     "Timestamp": "01-09-2022 07:15",
//     "From Bank": 1588,
//     "Account": "801ABC430",
//     "To Bank ": 241869,
//     "Account1": "80F390FC0",
//     "Amount Received ": 10475.35,
//     "Receiving Currency": "Swiss Franc",
//     "Amount Paid": 10475.35,
//     "Payment Currency": "Swiss Franc",
//     "Payment Format": "ACH",
//     "Is Laundering": 1
//   },
//   {
//     "Timestamp": "01-09-2022 15:25",
//     "From Bank": 3051,
//     "Account": "8012E62B0",
//     "To Bank ": 241869,
//     "Account1": "80F390FC0",
//     "Amount Received ": 13315.35,
//     "Receiving Currency": "Swiss Franc",
//     "Amount Paid": 13315.35,
//     "Payment Currency": "Swiss Franc",
//     "Payment Format": "ACH",
//     "Is Laundering": 1
//   },
//   {
//     "Timestamp": "01-09-2022 15:32",
//     "From Bank": 2843,
//     "Account": "8043B07C0",
//     "To Bank ": 241869,
//     "Account1": "80F390FC0",
//     "Amount Received ": 7999.49,
//     "Receiving Currency": "Swiss Franc",
//     "Amount Paid": 7999.49,
//     "Payment Currency": "Swiss Franc",
//     "Payment Format": "ACH",
//     "Is Laundering": 1
//   },
//   {
//     "Timestamp": "01-09-2022 17:25",
//     "From Bank": 29788,
//     "Account": "80399CED0",
//     "To Bank ": 241869,
//     "Account1": "80F390FC0",
//     "Amount Received ": null,
//     "Receiving Currency": "Swiss Franc",
//     "Amount Paid": 8430.98,
//     "Payment Currency": "Swiss Franc",
//     "Payment Format": "ACH",
//     "Is Laundering": 1
//   },
//   {
//     "Timestamp": "02-09-2022 07:29",
//     "From Bank": 28183,
//     "Account": "80BF4C160",
//     "To Bank ": 241869,
//     "Account1": "80F390FC0",
//     "Amount Received ": 295.9,
//     "Receiving Currency": "Swiss Franc",
//     "Amount Paid": 295.9,
//     "Payment Currency": "Swiss Franc",
//     "Payment Format": "ACH",
//     "Is Laundering": 1
//   },
//   {
//     "Timestamp": "02-09-2022 15:44",
//     "From Bank": 131167,
//     "Account": "80C21E690",
//     "To Bank ": 241869,
//     "Account1": "80F390FC0",
//     "Amount Received ": 3354.5,
//     "Receiving Currency": "Swiss Franc",
//     "Amount Paid": 3354.5,
//     "Payment Currency": "Swiss Franc",
//     "Payment Format": "ACH",
//     "Is Laundering": 1
//   },
//   {
//     "Timestamp": "03-09-2022 03:54",
//     "From Bank": 129974,
//     "Account": "80FE25690",
//     "To Bank ": 241869,
//     "Account1": "80F390FC0",
//     "Amount Received ": 9547.03,
//     "Receiving Currency": "Swiss Franc",
//     "Amount Paid": 9547.03,
//     "Payment Currency": "Swiss Franc",
//     "Payment Format": "ACH",
//     "Is Laundering": 1
//   },
//   {
//     "Timestamp": "03-09-2022 07:12",
//     "From Bank": 3051,
//     "Account": "806A3D750",
//     "To Bank ": 241869,
//     "Account1": "80F390FC0",
//     "Amount Received ": 2024.65,
//     "Receiving Currency": "Swiss Franc",
//     "Amount Paid": 2024.65,
//     "Payment Currency": "Swiss Franc",
//     "Payment Format": "ACH",
//     "Is Laundering": 1
//   },
//   {
//     "Timestamp": "03-09-2022 11:07",
//     "From Bank": 13157,
//     "Account": "805CA5A30",
//     "To Bank ": 241869,
//     "Account1": "80F390FC0",
//     "Amount Received ": 4513.56,
//     "Receiving Currency": "Swiss Franc",
//     "Amount Paid": 4513.56,
//     "Payment Currency": "Swiss Franc",
//     "Payment Format": "ACH",
//     "Is Laundering": 1
//   },
//   {
//     "Timestamp": "03-09-2022 14:28",
//     "From Bank": 1047,
//     "Account": "8031B5390",
//     "To Bank ": 241869,
//     "Account1": "80F390FC0",
//     "Amount Received ": 12427.99,
//     "Receiving Currency": "Swiss Franc",
//     "Amount Paid": 12427.99,
//     "Payment Currency": "Swiss Franc",
//     "Payment Format": "ACH",
//     "Is Laundering": 1
//   },
//   {
//     "Timestamp": "04-09-2022 14:07",
//     "From Bank": 214050,
//     "Account": "80543C3C0",
//     "To Bank ": 241869,
//     "Account1": "80F390FC0",
//     "Amount Received ": 1514.49,
//     "Receiving Currency": "Swiss Franc",
//     "Amount Paid": 1514.49,
//     "Payment Currency": "Swiss Franc",
//     "Payment Format": "ACH",
//     "Is Laundering": 1
//   },
//   {
//     "Timestamp": "04-09-2022 16:21",
//     "From Bank": 1501,
//     "Account": "808C45FE0",
//     "To Bank ": 241869,
//     "Account1": "80F390FC0",
//     "Amount Received ": 10058.54,
//     "Receiving Currency": "Swiss Franc",
//     "Amount Paid": 10058.54,
//     "Payment Currency": "Swiss Franc",
//     "Payment Format": "ACH",
//     "Is Laundering": 1
//   },
//   {
//     "Timestamp": "04-09-2022 16:37",
//     "From Bank": 241869,
//     "Account": "80F390FC0",
//     "To Bank ": 7548,
//     "Account1": "805284730",
//     "Amount Received ": 11674.83,
//     "Receiving Currency": "Euro",
//     "Amount Paid": 11674.83,
//     "Payment Currency": "Euro",
//     "Payment Format": "ACH",
//     "Is Laundering": 1
//   },
//   {
//     "Timestamp": "04-09-2022 17:23",
//     "From Bank": 241869,
//     "Account": "80F390FC0",
//     "To Bank ": 1467,
//     "Account1": "801D43090",
//     "Amount Received ": 4832.76,
//     "Receiving Currency": "US Dollar",
//     "Amount Paid": 4832.76,
//     "Payment Currency": "US Dollar",
//     "Payment Format": "ACH",
//     "Is Laundering": 1
//   },
//   {
//     "Timestamp": "06-09-2022 18:07",
//     "From Bank": 241869,
//     "Account": "80F390FC0",
//     "To Bank ": 22736,
//     "Account1": "807DC76A0",
//     "Amount Received ": 6240.05,
//     "Receiving Currency": "US Dollar",
//     "Amount Paid": 6240.05,
//     "Payment Currency": "US Dollar",
//     "Payment Format": "ACH",
//     "Is Laundering": 1
//   },
//   {
//     "Timestamp": "06-09-2022 19:16",
//     "From Bank": 241869,
//     "Account": "80F390FC0",
//     "To Bank ": 129974,
//     "Account1": "80E0D4970",
//     "Amount Received ": 7782.25,
//     "Receiving Currency": "US Dollar",
//     "Amount Paid": 7782.25,
//     "Payment Currency": "US Dollar",
//     "Payment Format": "ACH",
//     "Is Laundering": 1
//   }
// ]
  const distanceToLine = (px, py, x1, y1, x2, y2) => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

    return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '2rem' }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '2rem'
        }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: themeColor,
            marginBottom: '0.5rem'
          }}>
            Mule Net
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Visualize transaction patterns to identify potential money mule activities
          </p>
        </div>

         <MuleNetworkAnalysis />

        {/* --- New Tabs --- */}
        {/* <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1rem'
        }}>
          <button
            onClick={() => setSelectedTab('graph')}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: selectedTab === 'graph' ? themeColor : '#e5e7eb',
              color: selectedTab === 'graph' ? '#fff' : '#374151',
              fontWeight: '600'
            }}
          >
            Graph View
          </button>

          <button
            onClick={() => setSelectedTab('iframe')}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: selectedTab === 'iframe' ? themeColor : '#e5e7eb',
              color: selectedTab === 'iframe' ? '#fff' : '#374151',
              fontWeight: '600'
            }}
          >
            Mule Service
          </button>
        </div> */}

        {/* --- Tab Content Wrapper --- */}
        {selectedTab === 'graph' && (
          <>
            {/* Pattern Selector */}
            <div style={{
              backgroundColor: 'white',
              padding: '1.5rem',
              borderRadius: '0.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '2rem'
            }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Select Transaction Pattern
              </label>
              <select
                value={selectedPattern}
                onChange={handlePatternChange}
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  padding: '0.75rem',
                  fontSize: '0.875rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  backgroundColor: 'white',
                  color: '#374151',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="">-- Select a Pattern --</option>
                {patterns.map((pattern) => (
                  <option key={pattern.id} value={pattern.id}>
                    {pattern.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Network Visualization */}
            <div style={{
              backgroundColor: 'white',
              padding: '1.5rem',
              borderRadius: '0.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              position: 'relative'
            }}>
              {!loading && !error && !networkData && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '600px',
                  color: '#6b7280',
                  fontSize: '1rem'
                }}>
                  Select a pattern to visualize the transaction network
                </div>
              )}

              {loading && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '600px'
                }}>
                  <Loader2 size={48} color={themeColor} style={{ animation: 'spin 1s linear infinite' }} />
                </div>
              )}

              {!loading && networkData && (
                <canvas
                  ref={canvasRef}
                  width={1500}
                  height={800}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseLeave={() => {
                    setHoveredEdge(null);
                    setTooltip({ visible: false, x: 0, y: 0, data: null });
                  }}
                  style={{
                    width: '100%',
                    height: 'auto',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.375rem'
                  }}
                />
              )}
            </div>
          </>
        )}

        {/* {selectedTab === 'iframe' && (
          <div style={{
            backgroundColor: 'white',
            padding: '1rem',
            borderRadius: '0.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <iframe
              src="http://localhost:8002/iframe"
              style={{
                width: '100%',
                height: '800px',
                border: 'none',
                borderRadius: '0.5rem'
              }}
              title="Mule Service"
            />
          </div>
          // <MuleNetworkAnalysis1 />

       

        )} */}

      </div>
    </div>
  );
};

export default MulePage;