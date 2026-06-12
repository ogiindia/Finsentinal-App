import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import './TransactionLinkGraph.css'; // Include styles separately

const TransactionLinkGraph = ({ data }) => {
  const svgRef = useRef();
  const timelineRef = useRef();
  const containerRef = useRef();
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Normalize and filter data
  const normalizedData = data
    .map(d => {
      const trimmed = {};
      Object.keys(d).forEach(k => trimmed[k.trim()] = d[k]);
      trimmed.Timestamp = d3.timeParse('%d-%m-%Y %H:%M')(trimmed.Timestamp);
      return trimmed;
    })
    .filter(d => d['Is Laundering'] === 1);

  const nodesMap = new Map();
  const links = [];

  normalizedData.forEach(tx => {
    const source = tx['Account'];
    const target = tx['Account1'];

    if (!nodesMap.has(source)) nodesMap.set(source, { id: source });
    if (!nodesMap.has(target)) nodesMap.set(target, { id: target, timestamp: tx.Timestamp });

    links.push({
      source,
      target,
      amount: tx['Amount Paid'],
      currency: tx['Payment Currency']
    });
  });

  const nodes = Array.from(nodesMap.values());

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = containerRef.current.clientWidth;
    const height = isFullscreen ? window.innerHeight : 500;

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const zoom = d3.zoom().on('zoom', (event) => {
      svgGroup.attr('transform', event.transform);
    });

    svg.call(zoom);

    const svgGroup = svg.append('g');

    const link = svgGroup.selectAll('.link')
      .data(links)
      .enter()
      .append('line')
      .attr('class', 'link')
      .on('mouseover', function (event, d) {
        d3.select(this).classed('highlight', true);
        tooltip
          .style('opacity', 1)
          .html(`Amount: ${d.amount}<br/>Currency: ${d.currency}`)
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 28}px`);
      })
      .on('mouseout', function () {
        d3.select(this).classed('highlight', false);
        tooltip.style('opacity', 0);
      });

    const node = svgGroup.selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .call(d3.drag()
        .on('start', dragStart)
        .on('drag', dragged)
        .on('end', dragEnd));

    node.append('circle')
      .attr('r', 20)
      .attr('class', 'account-node');

    node.append('text')
      .attr('dy', 4)
      .attr('text-anchor', 'middle')
      .text(d => d.id);

    const tooltip = d3.select(containerRef.current)
      .append('div')
      .attr('class', 'tooltip');

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node
        .attr('transform', d => `translate(${d.x},${d.y})`);
    });

    function dragStart(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragEnd(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  }, [normalizedData, isFullscreen]);

  useEffect(() => {
    const timeline = d3.select(timelineRef.current);
    timeline.selectAll('*').remove();

    const width = containerRef.current.clientWidth;
    const height = 100;

    const timelineSvg = timeline
      .attr('width', width)
      .attr('height', height);

    const xScale = d3.scaleTime()
      .domain(d3.extent(normalizedData, d => d.Timestamp))
      .range([50, width - 50]);

    timelineSvg.append('g')
      .attr('transform', `translate(0,${height - 30})`)
      .call(d3.axisBottom(xScale));

    timelineSvg.selectAll('.timeline-node')
      .data(normalizedData)
      .enter()
      .append('circle')
      .attr('class', 'timeline-node')
      .attr('cx', d => xScale(d.Timestamp))
      .attr('cy', height / 2)
      .attr('r', 6)
      .attr('fill', '#007acc');
  }, [normalizedData]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div ref={containerRef} className={`graph-container ${isFullscreen ? 'fullscreen' : ''}`}>
      <button onClick={toggleFullscreen} className="fullscreen-btn">
        {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
      </button>
      <svg ref={svgRef} className="graph-svg" />
      <svg ref={timelineRef} className="timeline-svg" />
    </div>
  );
};

export default TransactionLinkGraph;