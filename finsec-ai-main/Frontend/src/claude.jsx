import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';

// Icon mapping configuration
const ICONS_MAP = {
  CustomerId: 'fa-id-card', FirstName: 'fa-user', LastName: 'fa-user-tag',
  Email: 'fa-envelope', Phone: 'fa-phone', Address: 'fa-map-marker-alt',
  MerchantAddress: 'fa-store', Gender: 'fa-venus-mars', Age: 'fa-birthday-cake',
  Registered: 'fa-calendar-check', Orders: 'fa-shopping-cart', Spent: 'fa-money-bill-wave',
  Job: 'fa-briefcase', Hobbies: 'fa-heart', IsMarried: 'fa-ring',
  AccountHolding: 'fa-university', LoanAccount: 'fa-credit-card', CurrentBalanceBhd: 'fa-wallet',
  IncomeBhd: 'fa-chart-line', GeoLocation: 'fa-globe', Vulnerability: 'fa-exclamation-triangle',
  DeviceId: 'fa-mobile-alt', state: 'fa-flag', Transactions: 'fa-exchange-alt',
  Hide: 'fa-eye-slash', Info: 'fa-info-circle', Expand: 'fa-expand', Fetch: 'fa-download'
};

// Mock API functions
const mockAPI = {
  customerDetails: async (customerId) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      CustomerId: customerId, FirstName: 'John', LastName: 'Doe',
      Email: `customer${customerId}@email.com`, Phone: '+1234567890',
      DeviceId: `device-${customerId}`, Address: '123 Main St',
      Gender: 'Male', Age: 35, Registered: '2020-01-15',
      state: 'Active', Job: 'Engineer', Hobbies: 'Reading', Orders: 45, Spent: 5000
    };
  },
  transactionDetails: async (customerId) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      SentCount: 3, SentCustomerID: ['789', '790', '791'],
      ReceivedCount: 2, RecievedCustomerID: ['792', '793'], TotalCount: 5
    };
  },
  searchByField: async (field, value) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return { CustomerIds: ['800', '801'] };
  }
};

// Link styling rules
const LINK_STYLES = {
  'Customer->Customer (initial debit->beneficiary)': {
    arrow: true,
    color: '#16a34a',
    strokeWidth: 3,
    animated: true,
    markerId: 'arrow-green',
    strokeDasharray: '6,4',
    glow: { enabled: true, color: '#72f089', radius: 6 },
    arrow: true, color: '#ef4444', strokeWidth: 3, animated: true,
    markerId: 'arrow-red', strokeDasharray: '6,4',
    glow: { enabled: true, color: '#ff8a8a', radius: 6 },
    applyToConnectedNodes: { boldNodeStroke: true, nodeGlow: true }
  },
  'initial': {
    arrow: true, color: '#ef4444', strokeWidth: 3, animated: true,
    markerId: 'arrow-red', strokeDasharray: '6,4',
    glow: { enabled: true, color: '#ff8a8a', radius: 6 },
    applyToConnectedNodes: { boldNodeStroke: true, nodeGlow: true }
  },
  'Customer->Information': {
    arrow: false, color: '#9ca3af', strokeWidth: 1.5, animated: false,
    markerId: null, strokeDasharray: null, glow: { enabled: false },
    applyToConnectedNodes: { boldNodeStroke: false }
  },
  'Customer->Transaction': {
    arrow: false, color: '#9ca3af', strokeWidth: 1.5, animated: false,
    markerId: null, glow: { enabled: false }, applyToConnectedNodes: { boldNodeStroke: false }
  },
  'TransactionSent->Customer': {
    arrow: true, color: '#ef4444', strokeWidth: 3, animated: true,
    markerId: 'arrow-red', strokeDasharray: '8,4',
    glow: { enabled: true, color: '#ff8a8a', radius: 5 },
    applyToConnectedNodes: { boldNodeStroke: true, nodeGlow: true }
  },
  'Customer->TransactionReceived': {
    arrow: true, color: '#16a34a', strokeWidth: 3, animated: true,
    markerId: 'arrow-green', strokeDasharray: '8,4',
    glow: { enabled: true, color: '#72f089', radius: 5 },
    applyToConnectedNodes: { boldNodeStroke: true, nodeGlow: true }
  }
};

const ForceDirectedGraph = ({
  initialNodes = [], initialLinks = [], onGraphChange, onNodeApiError,
  configurableFields = ['FirstName', 'LastName', 'Email', 'DeviceId', 'Phone'],
  linkValues = []
}) => {
  const svgRef = useRef(null);
  const simulationRef = useRef(null);
  const [nodes, setNodes] = useState(initialNodes);
  const [links, setLinks] = useState(initialLinks);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tooltip, setTooltip] = useState({ visible: false, content: '', x: 0, y: 0, isHtml: false });
  const containerRef = useRef(null);
  const initializedRef = useRef(false);
  const [selectedFields, setSelectedFields] = useState(configurableFields);
  const [showFieldSelector, setShowFieldSelector] = useState(false);
  const animationFrameRef = useRef(null);

  const allAvailableFields = [
    'CustomerId', 'FirstName', 'LastName', 'Email', 'Phone', 'Address',
    'MerchantAddress', 'Gender', 'Age', 'Registered', 'Orders', 'Spent',
    'Job', 'Hobbies', 'IsMarried', 'AccountHolding', 'LoanAccount',
    'CurrentBalanceBhd', 'IncomeBhd', 'GeoLocation', 'Vulnerability', 'DeviceId', 'state'
  ];

  const generateId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const getLinkStyle = (link) => {
    if (link.styleKey && LINK_STYLES[link.styleKey]) return LINK_STYLES[link.styleKey];
    if (link.type && LINK_STYLES[link.type]) return LINK_STYLES[link.type];

    const sourceNode = nodes.find(n => n.id === (link.source.id || link.source));
    const targetNode = nodes.find(n => n.id === (link.target.id || link.target));
    if (!sourceNode || !targetNode) return {};

    if (sourceNode.type === 'Customer' && targetNode.type === 'Information') return LINK_STYLES['Customer->Information'];
    if (sourceNode.type === 'Customer' && targetNode.type === 'Transaction') return LINK_STYLES['Customer->Transaction'];
    if (sourceNode.type === 'Transaction' && sourceNode.transactionType === 'Sent' && targetNode.type === 'Customer') return LINK_STYLES['TransactionSent->Customer'];
    if (sourceNode.type === 'Customer' && targetNode.type === 'Transaction' && targetNode.transactionType === 'Received') return LINK_STYLES['Customer->TransactionReceived'];
    if (sourceNode.type === 'Customer' && targetNode.type === 'Customer') return LINK_STYLES['initial'];
    return {};
  };

  const updateGraph = useCallback((newNodes, newLinks) => {
    setNodes(newNodes);
    setLinks(newLinks);
    if (onGraphChange) onGraphChange(newNodes, newLinks);
  }, [onGraphChange]);

  const findAllDescendants = (nodeId, currentNodes) => {
    const descendants = [];
    const directChildren = currentNodes.filter(n => n.parentId === nodeId);
    directChildren.forEach(child => {
      descendants.push(child.id);
      descendants.push(...findAllDescendants(child.id, currentNodes));
    });
    return descendants;
  };

  const handleFieldToggle = (field) => {
    setSelectedFields(prev => prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]);
  };

  const applyFieldChanges = () => {
    initializedRef.current = false;

    const visibleCustomerNodes = nodes.filter(n => n.type === 'Customer');
    const resetNodes = visibleCustomerNodes.map(n => ({
      ...n,
      data: {
        customerDetails: n.data?.customerDetails,
        transactionDetails: n.data?.transactionDetails,
        infoNodesVisible: false,
        transactionNodesVisible: false
      }
    }));

    const customerLinks = links.filter(l => {
      const sourceNode = nodes.find(n => n.id === (l.source.id || l.source));
      const targetNode = nodes.find(n => n.id === (l.target.id || l.target));
      return sourceNode?.type === 'Customer' && targetNode?.type === 'Customer';
    });

    setNodes(resetNodes);
    setLinks(customerLinks);

    if (onGraphChange) {
      onGraphChange(resetNodes, customerLinks);
    }

    setShowFieldSelector(false);
    setTimeout(() => { initializedRef.current = false; }, 100);
  };

  useEffect(() => {
    if (initializedRef.current) return;

    const initializeGraph = async () => {
      initializedRef.current = true;
      const initialCustomers = initialNodes.filter(n => n.type === 'Customer');
      const updatedNodes = [...initialNodes];
      const updatedLinks = [...initialLinks];

      for (const customer of initialCustomers) {
        try {
          const nodeIndex = updatedNodes.findIndex(n => n.id === customer.id);
          const customerData = await mockAPI.customerDetails(customer.customerId);
          if (nodeIndex !== -1) {
            updatedNodes[nodeIndex].data = {
              ...updatedNodes[nodeIndex].data, customerDetails: customerData, infoNodesVisible: true
            };
          }

          selectedFields.forEach(field => {
            if (customerData[field]) {
              const infoNode = {
                id: generateId(`info-${field}-${customer.id}`), type: 'Information',
                fieldName: field, fieldValue: customerData[field], label: field,
                parentId: customer.id, data: { fieldValue: customerData[field] }
              };
              updatedNodes.push(infoNode);
              updatedLinks.push({
                id: generateId('link'), source: customer.id, target: infoNode.id, type: 'Customer->Information'
              });
            }
          });

          const transactionData = await mockAPI.transactionDetails(customer.customerId);
          updatedNodes[nodeIndex].data = {
            ...updatedNodes[nodeIndex].data, transactionDetails: transactionData, transactionNodesVisible: true
          };

          const sentNode = {
            id: generateId(`transaction-sent-${customer.customerId}`), type: 'Transaction',
            transactionType: 'Sent', label: 'Sent', parentId: customer.id,
            data: { transactionDetails: transactionData, count: transactionData.SentCount }
          };
          updatedNodes.push(sentNode);
          updatedLinks.push({ id: generateId('link'), source: customer.id, target: sentNode.id, type: 'Customer->Transaction' });

          const receivedNode = {
            id: generateId(`transaction-received-${customer.customerId}`), type: 'Transaction',
            transactionType: 'Received', label: 'Received', parentId: customer.id,
            data: { transactionDetails: transactionData, count: transactionData.ReceivedCount }
          };
          updatedNodes.push(receivedNode);
          updatedLinks.push({ id: generateId('link'), source: customer.id, target: receivedNode.id, type: 'Customer->Transaction' });

        } catch (error) {
          console.error(`Error initializing customer ${customer.customerId}:`, error);
          if (onNodeApiError) onNodeApiError(customer.id, error);
        }
      }
      updateGraph(updatedNodes, updatedLinks);
    };

    if (initialNodes.length > 0 && !initializedRef.current) initializeGraph();
  }, [selectedFields]);

  const handleCustomerDetails = async (node) => {
    try {
      const nodeIndex = nodes.findIndex(n => n.id === node.id);
      const updatedNodes = [...nodes];
      const existingInfoNodes = nodes.filter(n => n.type === 'Information' && n.parentId === node.id);

      if (existingInfoNodes.length > 0 && node.data?.infoNodesVisible) {
        const infoNodeIds = existingInfoNodes.map(n => n.id);
        const allDescendantIds = [];
        infoNodeIds.forEach(infoId => {
          allDescendantIds.push(infoId);
          allDescendantIds.push(...findAllDescendants(infoId, nodes));
        });

        const filteredNodes = updatedNodes.filter(n => !allDescendantIds.includes(n.id));
        const filteredLinks = links.filter(l =>
          !allDescendantIds.includes(l.source.id || l.source) && !allDescendantIds.includes(l.target.id || l.target)
        );
        const finalNodeIndex = filteredNodes.findIndex(n => n.id === node.id);
        if (finalNodeIndex !== -1) {
          filteredNodes[finalNodeIndex].data = { ...filteredNodes[finalNodeIndex].data, infoNodesVisible: false };
        }
        updateGraph(filteredNodes, filteredLinks);
      } else {
        let customerData = node.data?.customerDetails;
        if (!customerData) {
          customerData = await mockAPI.customerDetails(node.customerId);
          updatedNodes[nodeIndex].data = { ...updatedNodes[nodeIndex].data, customerDetails: customerData };
        }

        if (existingInfoNodes.length > 0) {
          const newLinks = [...links];
          existingInfoNodes.forEach(infoNode => {
            updatedNodes.push(infoNode);
            newLinks.push({ id: generateId('link'), source: node.id, target: infoNode.id, type: 'Customer->Information' });
          });
          updatedNodes[nodeIndex].data = { ...updatedNodes[nodeIndex].data, infoNodesVisible: true };
          updateGraph(updatedNodes, newLinks);
        } else {
          const newLinks = [...links];
          selectedFields.forEach(field => {
            if (customerData[field]) {
              const infoNode = {
                id: generateId(`info-${field}-${node.id}`), type: 'Information',
                fieldName: field, fieldValue: customerData[field], label: field,
                parentId: node.id, data: { fieldValue: customerData[field] }
              };
              updatedNodes.push(infoNode);
              newLinks.push({ id: generateId('link'), source: node.id, target: infoNode.id, type: 'Customer->Information' });
            }
          });
          updatedNodes[nodeIndex].data = { ...updatedNodes[nodeIndex].data, infoNodesVisible: true };
          updateGraph(updatedNodes, newLinks);
        }
      }
    } catch (error) {
      console.error('Error fetching customer details:', error);
      if (onNodeApiError) onNodeApiError(node.id, error);
    }
  };

  const handleTransactionDetails = async (node) => {
    const nodeIndex = nodes.findIndex(n => n.id === node.id);
    const updatedNodes = [...nodes];
    const existingTxNodes = nodes.filter(n => n.type === 'Transaction' && n.parentId === node.id);

    if (existingTxNodes.length > 0 && node.data?.transactionNodesVisible) {
      const txNodeIds = existingTxNodes.map(n => n.id);
      const allDescendantIds = [];
      txNodeIds.forEach(txId => {
        allDescendantIds.push(txId);
        allDescendantIds.push(...findAllDescendants(txId, nodes));
      });

      const filteredNodes = updatedNodes.filter(n => !allDescendantIds.includes(n.id));
      const filteredLinks = links.filter(l =>
        !allDescendantIds.includes(l.source.id || l.source) && !allDescendantIds.includes(l.target.id || l.target)
      );
      const finalNodeIndex = filteredNodes.findIndex(n => n.id === node.id);
      if (finalNodeIndex !== -1) {
        filteredNodes[finalNodeIndex].data = { ...filteredNodes[finalNodeIndex].data, transactionNodesVisible: false };
      }
      updateGraph(filteredNodes, filteredLinks);
    } else {
      let transactionData = node.data?.transactionDetails;
      if (!transactionData) {
        try {
          transactionData = await mockAPI.transactionDetails(node.customerId);
          updatedNodes[nodeIndex].data = { ...updatedNodes[nodeIndex].data, transactionDetails: transactionData };
        } catch (error) {
          console.error('Error fetching transaction details:', error);
          if (onNodeApiError) onNodeApiError(node.id, error);
          return;
        }
      }

      if (existingTxNodes.length > 0) {
        const newLinks = [...links];
        existingTxNodes.forEach(txNode => {
          updatedNodes.push(txNode);
          newLinks.push({ id: generateId('link'), source: node.id, target: txNode.id, type: 'Customer->Transaction' });
        });
        updatedNodes[nodeIndex].data = { ...updatedNodes[nodeIndex].data, transactionNodesVisible: true };
        updateGraph(updatedNodes, newLinks);
      } else {
        const newLinks = [...links];
        const sentNode = {
          id: generateId(`transaction-sent-${node.customerId}`), type: 'Transaction',
          transactionType: 'Sent', label: 'Sent', parentId: node.id,
          data: { transactionDetails: transactionData, count: transactionData.SentCount }
        };
        updatedNodes.push(sentNode);
        newLinks.push({ id: generateId('link'), source: node.id, target: sentNode.id, type: 'Customer->Transaction' });

        const receivedNode = {
          id: generateId(`transaction-received-${node.customerId}`), type: 'Transaction',
          transactionType: 'Received', label: 'Received', parentId: node.id,
          data: { transactionDetails: transactionData, count: transactionData.ReceivedCount }
        };
        updatedNodes.push(receivedNode);
        newLinks.push({ id: generateId('link'), source: node.id, target: receivedNode.id, type: 'Customer->Transaction' });

        updatedNodes[nodeIndex].data = { ...updatedNodes[nodeIndex].data, transactionNodesVisible: true };
        updateGraph(updatedNodes, newLinks);
      }
    }
  };

  const handleHideDetails = (node) => {
    const allDescendantIds = findAllDescendants(node.id, nodes);
    const filteredNodes = nodes.filter(n => !allDescendantIds.includes(n.id));
    const filteredLinks = links.filter(l =>
      !allDescendantIds.includes(l.source.id || l.source) && !allDescendantIds.includes(l.target.id || l.target)
    );
    const nodeIndex = filteredNodes.findIndex(n => n.id === node.id);
    if (nodeIndex !== -1) {
      filteredNodes[nodeIndex].data = { ...filteredNodes[nodeIndex].data, infoNodesVisible: false, transactionNodesVisible: false };
    }
    updateGraph(filteredNodes, filteredLinks);
  };

  const handleTransactionExpand = async (node) => {
    const data = node.data?.transactionDetails;
    if (!data) return;

    const existingCustomers = nodes.filter(n => n.type === 'Customer' && n.parentId === node.id);

    if (existingCustomers.length > 0) {
      const customerIds = existingCustomers.map(n => n.id);
      const allDescendantIds = [];
      customerIds.forEach(custId => {
        allDescendantIds.push(custId);
        allDescendantIds.push(...findAllDescendants(custId, nodes));
      });

      const filteredNodes = nodes.filter(n => !allDescendantIds.includes(n.id));
      const filteredLinks = links.filter(l =>
        !allDescendantIds.includes(l.source.id || l.source) && !allDescendantIds.includes(l.target.id || l.target)
      );
      updateGraph(filteredNodes, filteredLinks);
    } else {
      const updatedNodes = [...nodes];
      const newLinks = [...links];
      const customerIds = node.transactionType === 'Sent' ? data.SentCustomerID : data.RecievedCustomerID;

      if (customerIds && Array.isArray(customerIds)) {
        customerIds.forEach(customerId => {
          const customerNode = {
            id: generateId(`customer-${customerId}`), type: 'Customer',
            customerId: customerId, label: `Customer ${customerId}`, parentId: node.id, data: {}
          };
          updatedNodes.push(customerNode);

          if (node.transactionType === 'Sent') {
            newLinks.push({
              id: generateId('link'), source: node.id, target: customerNode.id,
              type: 'TransactionSent->Customer', styleKey: 'TransactionSent->Customer'
            });
          } else {
            newLinks.push({
              id: generateId('link'), source: customerNode.id, target: node.id,
              type: 'Customer->TransactionReceived', styleKey: 'Customer->TransactionReceived'
            });
          }
        });
        updateGraph(updatedNodes, newLinks);
      }
    }
  };

  const handleInformationFetch = async (node) => {
    try {
      const result = await mockAPI.searchByField(node.fieldName, node.fieldValue);
      const existingCustomers = nodes.filter(n => n.type === 'Customer' && n.parentId === node.id);

      if (existingCustomers.length > 0) {
        const customerIds = existingCustomers.map(n => n.id);
        const allDescendantIds = [];
        customerIds.forEach(custId => {
          allDescendantIds.push(custId);
          allDescendantIds.push(...findAllDescendants(custId, nodes));
        });

        const filteredNodes = nodes.filter(n => !allDescendantIds.includes(n.id));
        const filteredLinks = links.filter(l =>
          !allDescendantIds.includes(l.source.id || l.source) && !allDescendantIds.includes(l.target.id || l.target)
        );
        updateGraph(filteredNodes, filteredLinks);
      } else {
        const updatedNodes = [...nodes];
        const newLinks = [...links];

        if (result.CustomerIds && Array.isArray(result.CustomerIds)) {
          result.CustomerIds.forEach(customerId => {
            const customerNode = {
              id: generateId(`customer-${customerId}`), type: 'Customer',
              customerId: customerId, label: `Customer ${customerId}`, parentId: node.id, data: {}
            };
            updatedNodes.push(customerNode);
            newLinks.push({ id: generateId('link'), source: node.id, target: customerNode.id, type: 'Information->Customer' });
          });
          updateGraph(updatedNodes, newLinks);
        }
      }
    } catch (error) {
      console.error('Error fetching information:', error);
      if (onNodeApiError) onNodeApiError(node.id, error);
    }
  };

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    svg.selectAll('*').remove();

    const defs = svg.append('defs');
    ['red', 'green', 'neutral'].forEach(color => {
      const colorMap = { red: '#ef4444', green: '#16a34a', neutral: '#9ca3af' };
      defs.append('marker')
        .attr('id', `arrow-${color}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', colorMap[color]);
    });

    const glowFilter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    glowFilter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const container = svg.append('g');

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-500).distanceMin(50).distanceMax(800))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => {
        if (d.type === 'Customer') return 50;
        if (d.type === 'Transaction') return 40;
        return 30;
      }));

    simulationRef.current = simulation;

    nodes.forEach(node => {
      if (node.xHint === 'left') node.x = width * 0.3;
      if (node.xHint === 'right') node.x = width * 0.7;
    });

    const link = container.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => getLinkStyle(d).color || '#9ca3af')
      .attr('stroke-width', d => getLinkStyle(d).strokeWidth || 1.5)
      .attr('stroke-dasharray', d => getLinkStyle(d).strokeDasharray || null)
      .attr('marker-end', d => {
        const style = getLinkStyle(d);
        return style.markerId ? `url(#${style.markerId})` : null;
      })
      .attr('filter', d => getLinkStyle(d).glow?.enabled ? 'url(#glow)' : null)
      .style('cursor', 'pointer')
      .on('mouseenter', (event, d) => {
        if (d.type === 'initial' || d.styleKey === 'Customer->Customer (initial debit->beneficiary)') {
          const sourceNode = nodes.find(n => n.id === (d.source.id || d.source));
          const targetNode = nodes.find(n => n.id === (d.target.id || d.target));
          const linkValue = linkValues.find(lv => lv.linkId === d.id);

          if (sourceNode && targetNode) {
            let content = `
              <div class="font-semibold mb-1">Transaction Details</div>
              <div>From: Customer ${sourceNode.customerId} (${sourceNode.label})</div>
              <div>To: Customer ${targetNode.customerId} (${targetNode.label})</div>
            `;

            if (linkValue) {
              content += `
                <div class="mt-2 pt-2 border-t border-gray-600">
                  <div>Amount: ${linkValue.currency} ${linkValue.amount.toLocaleString()}</div>
                  <div>Date: ${linkValue.date}</div>
                </div>
              `;
            }

            content += `<div class="mt-1 text-xs text-gray-300">Initial Debit-Beneficiary Connection</div>`;

            setTooltip({ visible: true, content, x: event.pageX + 10, y: event.pageY + 10, isHtml: true });
          }
        }
      })
      .on('mouseleave', () => {
        setTooltip({ visible: false, content: '', x: 0, y: 0, isHtml: false });
      });

    if (links.some(l => getLinkStyle(l).animated)) {
      let dashOffset = 0;
      d3.timer(() => {
        dashOffset -= 1.5;
        link.filter(d => getLinkStyle(d).animated).attr('stroke-dashoffset', dashOffset);
      });
    }

    const initialLinks = links.filter(l => l.type === 'initial' || l.styleKey === 'Customer->Customer (initial debit->beneficiary)');

    if (initialLinks.length > 0) {
      initialLinks.forEach((linkData) => {
        const sourceNode = nodes.find(n => n.id === (linkData.source.id || linkData.source));
        const targetNode = nodes.find(n => n.id === (linkData.target.id || linkData.target));
        const linkValue = linkValues.find(lv => lv.linkId === linkData.id);

        if (sourceNode && targetNode) {
          for (let i = 0; i < 3; i++) {
            const arrow = container.append('g')
              .attr('class', 'animated-arrow')
              .style('opacity', 0);

            arrow.append('circle')
              .attr('r', 8)
              .attr('fill', '#ef4444')
              .attr('stroke', '#fff')
              .attr('stroke-width', 2);

            arrow.append('path')
              .attr('d', 'M-3,-3 L3,0 L-3,3 Z')
              .attr('fill', '#fff')
              .attr('transform', 'translate(0, 0)');

            const animateArrow = () => {
              let progress = (i * 0.33);

              const animate = () => {
                progress += 0.005;
                if (progress > 1) {
                  progress = 0;
                  arrow.style('opacity', 0);
                  setTimeout(() => arrow.style('opacity', 1), 200);
                }

                const x = sourceNode.x + (targetNode.x - sourceNode.x) * progress;
                const y = sourceNode.y + (targetNode.y - sourceNode.y) * progress;
                const angle = Math.atan2(targetNode.y - sourceNode.y, targetNode.x - sourceNode.x) * 180 / Math.PI;

                arrow
                  .attr('transform', `translate(${x}, ${y}) rotate(${angle})`)
                  .style('opacity', progress < 0.1 || progress > 0.9 ? 0 : 1);

                animationFrameRef.current = requestAnimationFrame(animate);
              };

              setTimeout(() => {
                arrow.style('opacity', 1);
                animate();
              }, i * 1000);
            };

            animateArrow();

            if (linkValue) {
              arrow.on('mouseenter', (event) => {
                const content = `
                  <div class="font-semibold">Transaction Value</div>
                  <div>Amount: ${linkValue.currency} ${linkValue.amount.toLocaleString()}</div>
                  <div>Date: ${linkValue.date}</div>
                `;
                setTooltip({ visible: true, content, x: event.pageX + 10, y: event.pageY + 10, isHtml: true });
              }).on('mouseleave', () => {
                setTooltip({ visible: false, content: '', x: 0, y: 0, isHtml: false });
              });
            }
          }
        }
      });
    }

    const node = container.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    const customerNodes = node.filter(d => d.type === 'Customer');

    const customerGradient = defs.append('radialGradient')
      .attr('id', 'customer-gradient')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%');

    customerGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#dbeafe')
      .append('animate')
      .attr('attributeName', 'stop-color')
      .attr('values', '#dbeafe;#bfdbfe;#93c5fd;#bfdbfe;#dbeafe')
      .attr('dur', '4s')
      .attr('repeatCount', 'indefinite');

    customerGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#3b82f6')
      .append('animate')
      .attr('attributeName', 'stop-color')
      .attr('values', '#3b82f6;#2563eb;#1d4ed8;#2563eb;#3b82f6')
      .attr('dur', '4s')
      .attr('repeatCount', 'indefinite');

    customerNodes.append('circle')
      .attr('r', 40)
      .attr('fill', 'url(#customer-gradient)')
      .attr('stroke', '#1e40af')
      .attr('stroke-width', d => {
        const connectedLinks = links.filter(l =>
          (l.source.id || l.source) === d.id || (l.target.id || l.target) === d.id
        );
        const hasBoldLink = connectedLinks.some(l => getLinkStyle(l).applyToConnectedNodes?.boldNodeStroke);
        return hasBoldLink ? 3 : 2;
      })
      .attr('filter', d => {
        const connectedLinks = links.filter(l =>
          (l.source.id || l.source) === d.id || (l.target.id || l.target) === d.id
        );
        const hasGlow = connectedLinks.some(l => getLinkStyle(l).applyToConnectedNodes?.nodeGlow);
        return hasGlow ? 'url(#glow)' : null;
      });

    customerNodes.append('foreignObject')
      .attr('width', 20)
      .attr('height', 20)
      .attr('x', -10)
      .attr('y', -10)
      .html('<i class="fas fa-user" style="font-size: 20px; color: #1e3a8a;"></i>')
      .attr('pointer-events', 'none');

    const sliceRadius = 40;
    const sliceWidth = 16;
    const actions = [
      { startAngle: -150, endAngle: -30, icon: ICONS_MAP.FirstName, action: 'userDetails', color: '#10b981' },
      { startAngle: -30, endAngle: 90, icon: ICONS_MAP.Transactions, action: 'transactionDetails', color: '#f59e0b' },
      { startAngle: 90, endAngle: 210, icon: ICONS_MAP.Hide, action: 'hideDetails', color: '#ef4444' }
    ];

    actions.forEach(({ startAngle, endAngle, icon, action, color }) => {
      const arc = d3.arc()
        .innerRadius(sliceRadius)
        .outerRadius(sliceRadius + sliceWidth)
        .startAngle((startAngle * Math.PI) / 180)
        .endAngle((endAngle * Math.PI) / 180);

      const sliceGroup = customerNodes.append('g')
        .attr('class', 'slice-button')
        .style('cursor', 'pointer')
        .on('click', (event, d) => {
          event.stopPropagation();
          if (action === 'userDetails') handleCustomerDetails(d);
          else if (action === 'transactionDetails') handleTransactionDetails(d);
          else if (action === 'hideDetails') handleHideDetails(d);
        })
        .on('mouseenter', function (event, d) {
          d3.select(this).select('path')
            .transition()
            .duration(200)
            .attr('d', d3.arc()
              .innerRadius(sliceRadius)
              .outerRadius(sliceRadius + sliceWidth + 5)
              .startAngle((startAngle * Math.PI) / 180)
              .endAngle((endAngle * Math.PI) / 180));

          const connectedNodeIds = [];
          if (action === 'userDetails') {
            nodes.filter(n => n.type === 'Information' && n.parentId === d.id).forEach(n => connectedNodeIds.push(n.id));
          } else if (action === 'transactionDetails') {
            nodes.filter(n => n.type === 'Transaction' && n.parentId === d.id).forEach(n => connectedNodeIds.push(n.id));
          }

          node.filter(n => connectedNodeIds.includes(n.id))
            .select('circle')
            .transition()
            .duration(200)
            .attr('stroke-width', 3)
            .attr('filter', 'url(#glow)');
        })
        .on('mouseleave', function () {
          d3.select(this).select('path')
            .transition()
            .duration(200)
            .attr('d', arc);

          node.selectAll('circle')
            .transition()
            .duration(200)
            .attr('stroke-width', d => {
              if (d.type === 'Customer') return 2;
              if (d.type === 'Transaction') return 2;
              return 1.5;
            })
            .attr('filter', null);
        });

      sliceGroup.append('path')
        .attr('d', arc)
        .attr('fill', color)
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);

      const midAngle = ((startAngle + endAngle) / 2 * Math.PI) / 180;
      const iconDistance = sliceRadius + sliceWidth / 2;
      const iconX = Math.cos(midAngle) * iconDistance;
      const iconY = Math.sin(midAngle) * iconDistance;

      sliceGroup.append('foreignObject')
        .attr('width', 18)
        .attr('height', 18)
        .attr('x', iconX - 9)
        .attr('y', iconY - 9)
        .html(`<i class="fas ${icon}" style="font-size: 16px; color: white;"></i>`)
        .style('pointer-events', 'none');
    });

    customerNodes.append('text')
      .attr('y', 70)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', '#1e40af')
      .text(d => d.customerId || d.label);

    const transactionNodes = node.filter(d => d.type === 'Transaction');

    const transactionGradient = defs.append('radialGradient')
      .attr('id', 'transaction-gradient')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%');

    transactionGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#fef3c7')
      .append('animate')
      .attr('attributeName', 'stop-color')
      .attr('values', '#fef3c7;#fde68a;#fcd34d;#fde68a;#fef3c7')
      .attr('dur', '3s')
      .attr('repeatCount', 'indefinite');

    transactionGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#f59e0b')
      .append('animate')
      .attr('attributeName', 'stop-color')
      .attr('values', '#f59e0b;#d97706;#b45309;#d97706;#f59e0b')
      .attr('dur', '3s')
      .attr('repeatCount', 'indefinite');

    transactionNodes.append('circle')
      .attr('r', 30)
      .attr('fill', 'url(#transaction-gradient)')
      .attr('stroke', '#92400e')
      .attr('stroke-width', 2);

    transactionNodes.append('line')
      .attr('x1', 0)
      .attr('y1', -30)
      .attr('x2', 0)
      .attr('y2', 30)
      .attr('stroke', '#92400e')
      .attr('stroke-width', 2);

    transactionNodes.append('foreignObject')
      .attr('width', 16)
      .attr('height', 16)
      .attr('x', -22)
      .attr('y', -8)
      .html('<i class="fas fa-expand" style="font-size: 14px; color: #78350f;"></i>')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        handleTransactionExpand(d);
      });

    transactionNodes.append('foreignObject')
      .attr('width', 16)
      .attr('height', 16)
      .attr('x', 6)
      .attr('y', -8)
      .html('<i class="fas fa-eye-slash" style="font-size: 14px; color: #78350f;"></i>')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        handleTransactionExpand(d);
      });

    transactionNodes.append('text')
      .attr('y', 48)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .attr('fill', '#92400e')
      .text(d => `${d.transactionType} (${d.data?.count || 0})`);

    const infoNodes = node.filter(d => d.type === 'Information');

    const infoGradient = defs.append('radialGradient')
      .attr('id', 'info-gradient')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%');

    infoGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#d1fae5')
      .append('animate')
      .attr('attributeName', 'stop-color')
      .attr('values', '#d1fae5;#a7f3d0;#6ee7b7;#a7f3d0;#d1fae5')
      .attr('dur', '3.5s')
      .attr('repeatCount', 'indefinite');

    infoGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#10b981')
      .append('animate')
      .attr('attributeName', 'stop-color')
      .attr('values', '#10b981;#059669;#047857;#059669;#10b981')
      .attr('dur', '3.5s')
      .attr('repeatCount', 'indefinite');

    infoNodes.append('circle')
      .attr('r', 20)
      .attr('fill', 'url(#info-gradient)')
      .attr('stroke', '#065f46')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        handleInformationFetch(d);
      });

    infoNodes.append('foreignObject')
      .attr('width', 16)
      .attr('height', 16)
      .attr('x', -8)
      .attr('y', -8)
      .html(d => `<i class="fas ${ICONS_MAP[d.fieldName] || 'fa-info'}" style="font-size: 16px; color: #064e3b;"></i>`)
      .style('pointer-events', 'none');

    infoNodes.append('text')
      .attr('y', 35)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('fill', '#065f46')
      .text(d => String(d.fieldValue || '').substring(0, 15));

    node.on('mouseenter', (event, d) => {
      let content = '';
      if (d.type === 'Customer' && d.data?.customerDetails) {
        content = selectedFields
          .filter(f => d.data.customerDetails[f])
          .map(f => d.data.customerDetails[f])
          .join(', ');
      } else if (d.type === 'Transaction' && d.data) {
        content = `Count: ${d.data.count || 0}`;
      } else if (d.type === 'Information') {
        content = String(d.fieldValue || '');
      }

      if (content) {
        setTooltip({ visible: true, content, x: event.pageX + 10, y: event.pageY + 10, isHtml: false });
      }
    }).on('mouseleave', () => {
      setTooltip({ visible: false, content: '', x: 0, y: 0, isHtml: false });
    });

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom);

    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [nodes, links, selectedFields, linkValues]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-screen bg-gray-50">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" />

      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={() => setShowFieldSelector(!showFieldSelector)}
          className="px-4 py-2 bg-white border border-gray-300 rounded shadow hover:bg-gray-100 transition"
        >
          <i className="fas fa-cog mr-2"></i>
          Configure Fields
        </button>

        <button
          onClick={toggleFullscreen}
          className="px-4 py-2 bg-white border border-gray-300 rounded shadow hover:bg-gray-100 transition"
        >
          <i className={`fas fa-${isFullscreen ? 'compress' : 'expand'}`}></i>
        </button>
      </div>

      {showFieldSelector && (
        <div className="absolute top-20 right-4 z-20 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-md max-h-96 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">Select Customer Detail Fields</h3>
          <div className="space-y-2 mb-4">
            {allAvailableFields.map(field => (
              <label key={field} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                <input
                  type="checkbox"
                  checked={selectedFields.includes(field)}
                  onChange={() => handleFieldToggle(field)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{field}</span>
                <i className={`fas ${ICONS_MAP[field] || 'fa-info'} text-gray-400 ml-auto`}></i>
              </label>
            ))}
          </div>
          <div className="flex gap-2 pt-3 border-t">
            <button
              onClick={applyFieldChanges}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-medium"
            >
              Apply & Refresh
            </button>
            <button
              onClick={() => setShowFieldSelector(false)}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <svg ref={svgRef} className="w-full h-full" style={{ cursor: 'grab' }} />

      {tooltip.visible && (
        <div
          className="absolute bg-black text-white px-3 py-2 rounded text-sm pointer-events-none max-w-xs"
          style={{ left: tooltip.x, top: tooltip.y, zIndex: 1000 }}
        >
          {tooltip.isHtml ? (
            <div dangerouslySetInnerHTML={{ __html: tooltip.content }} />
          ) : (
            tooltip.content
          )}
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [graphState, setGraphState] = useState({
    nodes: [
      {
        id: 'customer-346577',
        type: 'Customer',
        label: 'Debit',
        customerId: '346577',
        xHint: 'left',
        data: {}
      },
      {
        id: 'customer-575885',
        type: 'Customer',
        label: 'Beneficiary',
        customerId: '575885',
        xHint: 'right',
        data: {}
      }
    ],
    links: [
      {
        id: 'link-debit-beneficiary',
        source: 'customer-346577',
        target: 'customer-575885',
        type: 'initial',
        styleKey: 'Customer->Customer (initial debit->beneficiary)'
      }
    ]
  });

  const handleGraphChange = (nodes, links) => {
    setGraphState({ nodes, links });
    // console.log('Graph updated:', { nodes: nodes.length, links: links.length });
  };

  const handleNodeApiError = (nodeId, error) => {
    console.error(`API error for node ${nodeId}:`, error);
  };

  return (
    <div className="w-full h-screen">
      <ForceDirectedGraph
        initialNodes={graphState.nodes}
        initialLinks={graphState.links}
        onGraphChange={handleGraphChange}
        onNodeApiError={handleNodeApiError}
        configurableFields={['FirstName', 'LastName', 'Email', 'DeviceId', 'Phone']}
        linkValues={[
          { linkId: 'link-debit-beneficiary', amount: 5000, currency: 'USD', date: '2025-01-15' }
        ]}
      />
    </div>
  );
}