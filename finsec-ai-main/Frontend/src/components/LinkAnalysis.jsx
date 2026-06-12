import React, { useEffect, useRef , useState } from 'react';
import * as d3 from "d3";
import CustomerLinkAnalysis from "./CustomerLinkAnalysis";

const customerData = {
  Customer_Id: 420568,
  First_Name: "Fatima",
  Last_Name: "Al-Hassan",
  Email: "rebeccaholmes@example.net",
  Phone: "(963)652-2163x749",
  Address: "749 Kimberly Freeway, Muharraq, Bahrain",
  Merchant_Address: 0,
  Gender: "female",
  Age: 42,
  Registered: "30-07-2025",
  Orders: 22,
  Spent: 4226.4,
  Job: "Environmental health practitioner",
  Hobbies: "music, photography",
  Is_Married: true,
  Account_Holding: 5,
  Loan_Account: "No",
  "Current_Balance_(BHD)": 1518.94,
  "Income_(BHD)": 783.98,
  GeoLocation: "25.949071, 50.75503",
  Vulnerability: 0,
  Device_ID: "5c0cec491b9f2c2a",
  state: "Muharraq",
};

// export default function LinePlot({
//   data,
//   width = 640,
//   height = 400,
//   marginTop = 20,
//   marginRight = 20,
//   marginBottom = 20,
//   marginLeft = 20
// }) {
//   const x = d3.scaleLinear([0, data.length - 1], [marginLeft, width - marginRight]);
//   const y = d3.scaleLinear(d3.extent(data), [height - marginBottom, marginTop]);
//   const line = d3.line((d, i) => x(i), y);
//   return (
//     <svg width={width} height={height}>
//       <path fill="none" stroke="currentColor" strokeWidth="1.5" d={line(data)} />
//       <g fill="white" stroke="currentColor" strokeWidth="1.5">
//         {data.map((d, i) => (<circle key={i} cx={x(i)} cy={y(d)} r="2.5" />))}
//       </g>
//     </svg>
//   );
// }


const LinkAnalysis = ({
  width = 640,
  height = 400,
  marginTop = 20,
  marginRight = 20,
  marginBottom = 20,
  marginLeft = 20
}) => {
  const svgRef = useRef();

  const data = [10, 20, 15, 25, 30, 22, 35, 40, 38, 45];
//   const data = [
//     { name: 'A', value: 30 },
//     { name: 'B', value: 80 },
//     { name: 'C', value: 45 },
//     { name: 'D', value: 60 },
//     { name: 'E', value: 20 },
//     { name: 'F', value: 90 },
//     { name: 'G', value: 55 },
//   ];

//   useEffect(() => {
//     const svg = d3.select(svgRef.current);
//     const width = 500;
//     const height = 300;
//     const margin = { top: 20, right: 30, bottom: 30, left: 40 };

//     svg.attr('width', width).attr('height', height);

//     const x = d3
//       .scaleBand()
//       .domain(data.map((d) => d.name))
//       .range([margin.left, width - margin.right])
//       .padding(0.1);

//     const y = d3
//       .scaleLinear()
//       .domain([0, d3.max(data, (d) => d.value)])
//       .nice()
//       .range([height - margin.bottom, margin.top]);

//     svg.selectAll('rect').data(data).join('rect')
//       .attr('x', (d) => x(d.name))
//       .attr('y', (d) => y(d.value))
//       .attr('height', (d) => y(0) - y(d.value))
//       .attr('width', x.bandwidth())
//       .attr('fill', 'steelblue');

//     svg.selectAll('.x-axis').remove();
//     svg.selectAll('.y-axis').remove();

//     svg.append('g')
//       .attr('class', 'x-axis')
//       .attr('transform', `translate(0,${height - margin.bottom})`)
//       .call(d3.axisBottom(x));

//     svg.append('g')
//       .attr('class', 'y-axis')
//       .attr('transform', `translate(${margin.left},0)`)
//       .call(d3.axisLeft(y));
//   }, []);

//   return (
//     <div>
//       <h3>Simple Bar Chart using D3.js</h3>
//       <svg ref={svgRef}></svg>
//     </div>
//   );
// const x = d3.scaleLinear([0, data.length - 1], [marginLeft, width - marginRight]);
//   const y = d3.scaleLinear(d3.extent(data), [height - marginBottom, marginTop]);
//   const line = d3.line((d, i) => x(i), y);
//   return (
//     <svg width={width} height={height}>
//       <path fill="none" stroke="currentColor" strokeWidth="1.5" d={line(data)} />
//       <g fill="white" stroke="currentColor" strokeWidth="1.5">
//         {data.map((d, i) => (<circle key={i} cx={x(i)} cy={y(d)} r="2.5" />))}
//       </g>
//     </svg>
//   );
const gx = useRef();
  const gy = useRef();
  const x = d3.scaleLinear([0, data.length - 1], [marginLeft, width - marginRight]);
  const y = d3.scaleLinear(d3.extent(data), [height - marginBottom, marginTop]);
  const line = d3.line((d, i) => x(i), y);
  useEffect(() => void d3.select(gx.current).call(d3.axisBottom(x)), [gx, x]);
  useEffect(() => void d3.select(gy.current).call(d3.axisLeft(y)), [gy, y]);
  return (

<div style={{ padding: 16 }}>
      <CustomerLinkAnalysis
        data={customerData}
        width={1100}
        height={620}
        initialGravity={-260}
        showSensitiveDefault={true}
        // Optional: override the default field map to control WHAT appears with Customer_Id
        // fieldMap={{
        //   ... // start from defaults or define only what you need
        //   Email: { label: "Email", cat: "Contact", icon: "📧", sensitive: true, visible: true },
        //   Payment_Methods: { label: "Payment Methods", cat: "Financial", icon: "💳", visible: true },
        //   IP_Address: { label: "IP Address", cat: "Device", icon: "🌐", sensitive: true, visible: false },
        // }}
        // controls={{ showFieldToggles: false, showCategoryFilters: true }}
      />
    </div>









    // <svg width={width} height={height}>
    //   <g ref={gx} transform={`translate(0,${height - marginBottom})`} />
    //   <g ref={gy} transform={`translate(${marginLeft},0)`} />
    //   <path fill="none" stroke="currentColor" strokeWidth="1.5" d={line(data)} />
    //   <g fill="white" stroke="currentColor" strokeWidth="1.5">
    //     {data.map((d, i) => (<circle key={i} cx={x(i)} cy={y(d)} r="2.5" />))}
    //   </g>
    // </svg>
  );
};

export default LinkAnalysis;
