import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';

const TransactionLinkAnalysis = ({ data }) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
  const [selectedTimeRange, setSelectedTimeRange] = useState(null);

  // Process and normalize the data
  const processedData = useMemo(() => {
    if (!data || !Array.isArray(data)) return { nodes: [], links: [], timeline: [] };

    // Normalize keys and filter for laundering transactions
    const normalized = data.map(item => {
      const normalizedItem = {};
      Object.keys(item).forEach(key => {
        const trimmedKey = key.trim();
        normalizedItem[trimmedKey] = item[key];
      });
      return normalizedItem;
    }).filter(item => item['Is Laundering'] === 1);

    // Parse timestamps
    const parseDate = (dateStr) => {
      const [date, time] = dateStr.split(' ');
      const [day, month, year] = date.split('-');
      const [hour, minute] = time.split(':');
      return new Date(year, month - 1, day, hour, minute);
    };

    // Create nodes and links
    const nodeMap = new Map();
    const links = [];
    const timelineData = [];

    normalized.forEach((transaction, index) => {
      const fromAccount = transaction['Account'];
      const toAccount = transaction['Account1'];
      const fromBank = transaction['From Bank'];
      const toBank = transaction['To Bank'];
      const amount = transaction['Amount Received'];
      const currency = transaction['Receiving Currency'];
      const timestamp = parseDate(transaction['Timestamp']);

      // Add nodes
      if (!nodeMap.has(fromAccount)) {
        nodeMap.set(fromAccount, {
          id: fromAccount,
          bank: fromBank,
          type: 'from',
          transactions: []
        });
      }
      if (!nodeMap.has(toAccount)) {
        nodeMap.set(toAccount, {
          id: toAccount,
          bank: toBank,
          type: 'to',
          transactions: []
        });
      }

      // Update transaction lists
      nodeMap.get(fromAccount).transactions.push(transaction);
      nodeMap.get(toAccount).transactions.push(transaction);

      // Create link
      links.push({
        source: fromAccount,
        target: toAccount,
        amount,
        currency,
        timestamp,
        index,
        transaction
      });

      // Add to timeline
      timelineData.push({
        account: toAccount,
        timestamp,
        amount,
        currency,
        fromAccount,
        index
      });
    });

    // Sort timeline by timestamp
    timelineData.sort((a, b) => a.timestamp - b.timestamp);

    return {
      nodes: Array.from(nodeMap.values()),
      links,
      timeline: timelineData
    };
  }, [data]);

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: width || 1200,
          height: isFullscreen ? window.innerHeight - 40 : (height || 800)
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [isFullscreen]);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  // Combined visualization
  useEffect(() => {
    if (!processedData.nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = dimensions.width;
    const height = dimensions.height;
    
    // Reserve space for timeline at bottom
    const timelineHeight = 180;
    const graphHeight = height - timelineHeight - 20;
    const margin = { top: 10, right: 30, bottom: 10, left: 60 };

    // Add title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .style('font-size', '20px')
      .style('font-weight', 'bold')
      .style('fill', '#333')
      .text('Transaction Network Analysis & Timeline');

    // Create main container group
    const mainG = svg.append('g')
      .attr('transform', 'translate(0, 30)');

    // Create graph container
    const graphContainer = mainG.append('g')
      .attr('class', 'graph-container');

    // Set up zoom behavior for graph only
    const zoom = d3.zoom()
      .scaleExtent([0.1, 10])
      .on('zoom', (event) => {
        graphG.attr('transform', event.transform);
      });

    // Create a rect to catch zoom events only in graph area
    graphContainer.append('rect')
      .attr('width', width)
      .attr('height', graphHeight)
      .attr('fill', 'white')
      .attr('stroke', '#e0e0e0')
      .attr('stroke-width', 1)
      .call(zoom);

    // Create graph group for zoom transformations
    const graphG = graphContainer.append('g');

    // Create arrow markers for directed edges
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#666');

    // Create force simulation
    const simulation = d3.forceSimulation(processedData.nodes)
      .force('link', d3.forceLink(processedData.links)
        .id(d => d.id)
        .distance(150))
      .force('charge', d3.forceManyBody().strength(-500))
      .force('center', d3.forceCenter(width / 2, graphHeight / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Create links
    const link = graphG.append('g')
      .selectAll('line')
      .data(processedData.links)
      .join('line')
      .attr('class', 'link')
      .attr('stroke', '#999')
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead)')
      .style('cursor', 'pointer');

    // Create link labels (hidden by default)
    const linkLabel = graphG.append('g')
      .selectAll('g')
      .data(processedData.links)
      .join('g')
      .attr('class', 'link-label-group')
      .style('display', 'none');

    linkLabel.append('rect')
      .attr('x', -40)
      .attr('y', -10)
      .attr('width', 80)
      .attr('height', 20)
      .attr('fill', 'white')
      .attr('stroke', '#666')
      .attr('stroke-width', 1)
      .attr('rx', 3);

    linkLabel.append('text')
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('fill', '#333')
      // .text(d => `${d.currency} ${d.amount.toLocaleString()}`);

    // Create node groups
    const node = graphG.append('g')
      .selectAll('g')
      .data(processedData.nodes)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'move')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Add circles as node backgrounds
    node.append('circle')
      .attr('r', 25)
      .attr('fill', d => d.type === 'from' ? '#ff7f0e' : '#2ca02c')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Add user icons (using text emoji as placeholder)
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .style('font-size', '20px')
      .style('user-select', 'none')
      .text('👤');

    // Add labels
    node.append('text')
      .attr('dy', 40)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#333')
      .text(d => d.id);

    // Add hover effects for links
    link.on('mouseover', function(event, d) {
      d3.select(this).attr('stroke', '#333').attr('stroke-width', 3);
      
      // Show amount label
      linkLabel.filter(l => l === d)
        .style('display', 'block');
    })
    .on('mouseout', function(event, d) {
      d3.select(this).attr('stroke', '#999').attr('stroke-width', 2);
      
      // Hide amount label
      linkLabel.filter(l => l === d)
        .style('display', 'none');
    });

    // Add hover effects for nodes
    node.on('mouseover', function(event, d) {
      // Dim non-connected nodes and links
      node.style('opacity', n => {
        const connected = processedData.links.some(l => 
          (l.source.id === d.id && l.target.id === n.id) ||
          (l.target.id === d.id && l.source.id === n.id) ||
          n.id === d.id
        );
        return connected ? 1 : 0.3;
      });

      link.style('opacity', l => 
        l.source.id === d.id || l.target.id === d.id ? 1 : 0.3
      );
    })
    .on('mouseout', function() {
      node.style('opacity', 1);
      link.style('opacity', 1);
    });

    // Drag functions
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

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      linkLabel.attr('transform', d => 
        `translate(${(d.source.x + d.target.x) / 2},${(d.source.y + d.target.y) / 2})`
      );

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // TIMELINE SECTION - Integrated below the graph
    const timelineContainer = mainG.append('g')
      .attr('class', 'timeline-container')
      .attr('transform', `translate(0, ${graphHeight + 10})`);

    // Add timeline background
    timelineContainer.append('rect')
      .attr('width', width)
      .attr('height', timelineHeight)
      .attr('fill', 'white')
      .attr('stroke', '#e0e0e0')
      .attr('stroke-width', 1);

    // Add timeline title
    timelineContainer.append('text')
      .attr('x', width / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .style('fill', '#555')
      .text('Transaction Timeline (Account1 Nodes)');

    const timelineG = timelineContainer.append('g')
      .attr('transform', `translate(${margin.left}, 30)`);

    const timelineWidth = width - margin.left - margin.right;
    const timelineVizHeight = timelineHeight - 50;

    // Create scales for timeline
    const xScale = d3.scaleTime()
      .domain(d3.extent(processedData.timeline, d => d.timestamp))
      .range([0, timelineWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(processedData.timeline, d => d.amount)])
      .range([timelineVizHeight, 0]);

    // Create axes
    timelineG.append('g')
      .attr('transform', `translate(0,${timelineVizHeight})`)
      .call(d3.axisBottom(xScale)
        .tickFormat(d3.timeFormat('%d-%m %H:%M')))
      .style('font-size', '11px');

    timelineG.append('g')
      .call(d3.axisLeft(yScale)
        .tickFormat(d => `$${d / 1000}k`))
      .style('font-size', '11px');

    // Create brush for selection
    const brush = d3.brushX()
      .extent([[0, 0], [timelineWidth, timelineVizHeight]])
      .on('brush end', function(event) {
        if (event.selection) {
          const [x0, x1] = event.selection;
          const timeRange = [xScale.invert(x0), xScale.invert(x1)];
          setSelectedTimeRange(timeRange);
          
          // Highlight corresponding elements in graph
          link.attr('stroke', d => {
            return d.timestamp >= timeRange[0] && d.timestamp <= timeRange[1] ? '#e74c3c' : '#999';
          }).attr('stroke-width', d => {
            return d.timestamp >= timeRange[0] && d.timestamp <= timeRange[1] ? 3 : 2;
          });

          node.selectAll('circle').attr('fill', d => {
            const hasTransaction = processedData.links.some(l => 
              (l.source.id === d.id || l.target.id === d.id) &&
              l.timestamp >= timeRange[0] && l.timestamp <= timeRange[1]
            );
            return hasTransaction ? '#e74c3c' : (d.type === 'from' ? '#ff7f0e' : '#2ca02c');
          });
        } else {
          setSelectedTimeRange(null);
          // Reset colors
          link.attr('stroke', '#999').attr('stroke-width', 2);
          node.selectAll('circle').attr('fill', d => d.type === 'from' ? '#ff7f0e' : '#2ca02c');
        }
      });

    // Add brush
    timelineG.append('g')
      .attr('class', 'brush')
      .call(brush);

    // Create line generator
    const line = d3.line()
      .x(d => xScale(d.timestamp))
      .y(d => yScale(d.amount))
      .curve(d3.curveMonotoneX);

    // Group timeline data by account
    const accounts = d3.group(processedData.timeline, d => d.account);

    // Color scale for different accounts
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Add lines for each account
    accounts.forEach((values, account) => {
      const accountColor = colorScale(account);
      
      timelineG.append('path')
        .datum(values)
        .attr('fill', 'none')
        .attr('stroke', accountColor)
        .attr('stroke-width', 2)
        .attr('d', line)
        .style('opacity', 0.8);

      // Add dots
      timelineG.selectAll(`.dot-${account.replace(/[^a-zA-Z0-9]/g, '')}`)
        .data(values)
        .join('circle')
        .attr('class', `dot-${account.replace(/[^a-zA-Z0-9]/g, '')}`)
        .attr('cx', d => xScale(d.timestamp))
        .attr('cy', d => yScale(d.amount))
        .attr('r', 4)
        .attr('fill', accountColor)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          // Create tooltip
          const tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip')
            .style('position', 'absolute')
            .style('background', 'rgba(0, 0, 0, 0.85)')
            .style('color', 'white')
            .style('padding', '10px')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('box-shadow', '0 2px 4px rgba(0,0,0,0.2)')
            .html(`
              <strong>Account:</strong> ${d.account}<br/>
              <strong>From:</strong> ${d.fromAccount}<br/>
              <strong>Amount:</strong> ${d.currency} ${d.amount.toLocaleString()}<br/>
              <strong>Time:</strong> ${d.timestamp.toLocaleString()}
            `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');

          d3.select(this).attr('r', 6);
          
          // Highlight corresponding link in graph
          link.attr('stroke', l => {
            return l.timestamp === d.timestamp && l.target === d.account ? '#e74c3c' : '#999';
          }).attr('stroke-width', l => {
            return l.timestamp === d.timestamp && l.target === d.account ? 3 : 2;
          });
        })
        .on('mouseout', function() {
          d3.select('body').selectAll('.tooltip').remove();
          d3.select(this).attr('r', 4);
          
          // Reset link colors if no brush selection
          if (!selectedTimeRange) {
            link.attr('stroke', '#999').attr('stroke-width', 2);
          }
        });
    });

    // Add legend for timeline accounts
    const legendG = timelineContainer.append('g')
      .attr('transform', `translate(${width - 150}, 30)`);

    legendG.append('text')
      .attr('x', 0)
      .attr('y', -5)
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text('Accounts:');

    const legendItems = Array.from(accounts.keys()).slice(0, 5); // Show first 5 accounts
    legendItems.forEach((account, i) => {
      const legendItem = legendG.append('g')
        .attr('transform', `translate(0, ${i * 20 + 10})`);
      
      legendItem.append('circle')
        .attr('r', 4)
        .attr('fill', colorScale(account));
      
      legendItem.append('text')
        .attr('x', 10)
        .attr('y', 4)
        .style('font-size', '11px')
        .text(account.length > 10 ? account.substring(0, 10) + '...' : account);
    });

    return () => {
      simulation.stop();
    };
  }, [processedData, dimensions, selectedTimeRange]);

  return (
    <div 
      ref={containerRef}
      style={{
        width: '100%',
        height: isFullscreen ? '100vh' : '850px',
        position: 'relative',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        padding: '20px',
        boxSizing: 'border-box'
      }}
    >
      <style>{`
        .link {
          transition: all 0.3s ease;
        }
        .node {
          transition: opacity 0.3s ease;
        }
        .brush .selection {
          fill: #3498db;
          fill-opacity: 0.3;
          stroke: #2980b9;
          stroke-width: 1;
        }
        .fullscreen-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          padding: 8px 16px;
          background: #3498db;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          z-index: 1000;
          transition: background 0.3s ease;
        }
        .fullscreen-btn:hover {
          background: #2980b9;
        }
      `}</style>
      
      <button 
        className="fullscreen-btn"
        onClick={toggleFullscreen}
      >
        {isFullscreen ? '🗙 Exit Fullscreen' : '⛶ Fullscreen'}
      </button>

      <svg 
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{ 
          width: '100%', 
          height: '100%',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}
      />
    </div>
  );
};

export default TransactionLinkAnalysis;