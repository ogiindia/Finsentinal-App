import * as d3 from 'd3';

const clusterColorScale = d3
  .scaleOrdinal()
  .domain(['0', '1', '2', '3', '4'])
  .range(d3.schemeCategory10);

export const getClusterColor = (clusterId) =>
  clusterColorScale(String(clusterId));
