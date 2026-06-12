import React, { useEffect, useRef, useState } from "react";
import { renderClusterScatter } from "./cluster";
import ClusterSummaryCards from './ClusterSummaryCards';
import ClusterThresholdTable from './ClusterThresholdTable';




const ClusterView = ({ clusterGroups, centers, summary }) => {
  const containerRef = useRef(null);
  const chartRef = useRef(null);

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const flatData = Object.values(clusterGroups).flat();
  const [selectedPoint, setSelectedPoint] = useState(null);

  useEffect(() => {
  const observer = new ResizeObserver(entries => {
    if (!entries.length) return;
    const { width, height } = entries[0].contentRect;
    setDimensions({
      width,
      height: Math.max(420, height * 0.6)
    });
  });

  if (containerRef.current) {
    observer.observe(containerRef.current);
  }

  return () => observer.disconnect();
}, []);




useEffect(() => {
  if (!dimensions.width || !clusterGroups) return;

  renderClusterScatter({
    container: chartRef.current,
    data: Object.values(clusterGroups).flat(),
    width: dimensions.width,
    height: dimensions.height
  });
}, [dimensions, clusterGroups]);

  return (
  <div
    ref={containerRef}
    style={{
      width: '100%',
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }}
  >
    {/* Graph */}
    <div
      ref={chartRef}
      style={{
        width: '100%',
        minHeight: '420px'
      }}
    />

    {/* Summary Cards */}
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '16px'
      }}
    >
      <ClusterSummaryCards summary={summary} />
    </div>

    {/* Threshold Table */}
    <div
      style={{
        width: '100%',
        overflowX: 'auto'
      }}
    >
      <ClusterThresholdTable centers={centers} />
    </div>
  </div>
);
};

export default ClusterView;