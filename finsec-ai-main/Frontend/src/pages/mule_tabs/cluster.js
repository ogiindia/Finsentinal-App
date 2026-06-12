import * as d3 from "d3";
import { getClusterColor } from "./clusterColors";

export function renderClusterScatter({
  container,
  data,
  width,
  height,
  onPointClick
}) {
  d3.select(container).selectAll("*").remove();

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const margin = { top: 40, right: 40, bottom: 50, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3
    .scaleLinear()
    .domain(d3.extent(data, d => d.time_of_day))
    .nice()
    .range([0, innerWidth]);

  const y = d3
    .scaleLinear()
    .domain(d3.extent(data, d => d.amount))
    .nice()
    .range([innerHeight, 0]);

  // const color = d3.scaleOrdinal(d3.schemeCategory10);

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x));

  g.append("g").call(d3.axisLeft(y));

  g.selectAll(".point")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "point")
    .attr("cx", d => x(d.time_of_day))
    .attr("cy", d => y(d.amount))
    .attr("r", 6)
    .attr("fill", d => getClusterColor(d.cluster))
    .attr("opacity", 0.8)
    .on("click", (_, d) => onPointClick(d))
    .append("title")
    .text(d =>
      `Cluster: ${d.cluster}
Amount: ${d.amount}
Time: ${d.time_of_day}
Account: ${d.accountId1}
Time:${d.time_of_day}
From:${d.accountId1}
To:${d.accountId2}
Location:${d.terminalId}`
    );
}