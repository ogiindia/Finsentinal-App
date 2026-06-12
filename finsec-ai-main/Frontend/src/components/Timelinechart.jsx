import React, { useMemo } from 'react';
import { Scatter } from 'react-chartjs-2';
import 'chart.js/auto';
// import { Chart as ChartJS, TimeScale, LinearScale, PointElement, Tooltip, Legend } from 'chart.js';
import 'chartjs-adapter-date-fns';
import annotationPlugin from 'chartjs-plugin-annotation';
import { currency_symbol } from '../service/service';

//   ChartJS.register(
//   TimeScale,
//   LinearScale,
//   PointElement,
//   Tooltip,
//   Legend,
//   annotationPlugin
// );


const Timelinechart = ({ timelineData, analysisData, score, model_type }) => {







  // const [animatedValue] = useState(0);
// console.log(timelineData)
  const getColor = (value) => {
    if (value <= 10) return '#4caf50'; // Green
    if (value <= 30) return '#ffeb3b'; // Yellow
    if (value <= 60) return '#ff9800'; // Orange
    return '#f44336'; // Red
  };

//   const timelinePoints = Array.isArray(timelineData)
//     ? timelineData.filter(item => item.timestamp)
//     .map(item => ({
//         x: new Date(item.timestamp),
//         y: item.model_result?.score ?? 0,
//         amount: item.amount ?? 0,
//       }))
//     : [];


//     // console.log(analysisData)
// const analysisPoints = analysisData?.TIMESTAMP
//   ? [{
//       x: new Date(analysisData.TIMESTAMP),
//       y: score ?? 0,
//       amount: analysisData.MATCH_DEBITAMOUNT ?? 0,
//       currency: analysisData.MATCH_DEBITCURRENCY ?? '',
//     }]
//   : [];

// // console.log(timelinePoints)
// // console.log(analysisPoints)

// const timelineChartData = {
//   datasets: [
//     {
//       label: '',
//       data: timelinePoints,
//       pointBackgroundColor: timelinePoints.map(item =>
//         item.y < 0 ? 'red' : 'green'
//       ),
//       pointRadius: 6,
//       showLine: false,
//     },
//     {
//       label: '',
//       data: analysisPoints,
//       pointBackgroundColor: analysisPoints.map(() => '#FFA500'), // Bright orange
//       pointRadius: 6,
//       showLine: false,
//     },
//   ],
// };


//   const timelineChartOptions = {
//     scales: {
//       x: {
//         type: 'time',
//         time: {
//           unit: 'month',
//           tooltipFormat: 'MMM yyyy',
//           displayFormats: {
//             month: 'MMM yyyy',
//           },
//         },
//         title: {
//           display: true,
//           text: 'Month',
//           font: {
//             weight: 'bold',
//           },
//         },
//         grid: {
//           color: '#ccc',
//           borderColor: '#000',
//         },
//       },
//       y: {
//         min: -1,
//         max: 1,
//         title: {
//           display: true,
//           text: 'Model Score',
//           font: {
//             weight: 'bold',
//           },
//         },
//         grid: {
//           color: '#ccc',
//           borderColor: '#000',
//         },
//       },
//     },
//     plugins: {
//       legend: {
//         display: false,
//         position: 'top',
//       },

//       tooltip: {
//         displayColors: false,
//         callbacks: {
//           label: function (context) {
//             const score = context.raw.y;
//             const amount = context.raw.amount;
//             return [`Score: ${score}`, `Amount: ${currency_symbol}${amount}`];
//           },
//         },
//         titleFont: {
//           weight: 'bold',
//         },
//         bodyFont: {
//           weight: 'bold',
//         },
//       },
//       annotation: {
//         annotations: {
//           zeroLine: {
//             type: 'line',
//             scaleID: 'y',
//             value: 0,
//             borderColor: 'blue',
//             borderWidth: 2,
//             label: {
//               display: true,
//               content: 'Zero Line',
//               position: 'end',
//               font: {
//                 weight: 'bold',
//               },
//               backgroundColor: 'rgba(0,0,255,0.1)',
//             },
//           },
//         },
//       },
//     },
//   };


const timelinePoints = useMemo(() => {
  if (!Array.isArray(timelineData)) return [];

  return timelineData
    .filter(item => item.timestamp)
    .map(item => ({
      x: new Date(item.timestamp),
      y: item.model_result?.score ?? 0,
      amount: item.amount ?? 0,
      model_type: 'unsupervised'
    }));
}, [timelineData]);


const analysisPoints = useMemo(() => {
  if (!analysisData?.TIMESTAMP) return [];

  return [{
    x: new Date(analysisData.TIMESTAMP),
    y: score ?? 0,
    amount: analysisData.MATCH_DEBITAMOUNT ?? 0,
    currency: analysisData.MATCH_DEBITCURRENCY ?? '',
    model_type: model_type

  }];
}, [analysisData, score]);


const timelineChartData = useMemo(() => ({
  datasets: [
    {
      label: '',
      data: timelinePoints,
      pointBackgroundColor: timelinePoints.map(p =>
        p.y < 0 ? 'red' : 'green'
      ),
      pointRadius: 6,
      showLine: false,
    },
    {
      label: '',
      data: analysisPoints,
      pointBackgroundColor: '#FFA500',
      pointRadius: 6,
      showLine: false,
    },
  ],
}), [timelinePoints, analysisPoints]);


const timelineChartOptions = useMemo(() => ({
  scales: {
    x: {
      type: 'time',
      time: {
        unit: 'month',
        tooltipFormat: 'MMM yyyy',
        displayFormats: { month: 'MMM yyyy' },
      },
      title: { display: true, text: 'Month', font: { weight: 'bold' } },
    },
    y: {
      min: -1,
      max: 1,
      title: { display: true, text: 'Model Score', font: { weight: 'bold' } },
    },
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      displayColors: false,
      callbacks: {
        label: ctx => [
          `Score: ${ctx.raw.y}`,
          `Amount: ${currency_symbol} ${ctx.raw.amount}`,
          `Model Type: ${ctx.raw.model_type}`
        ],
      },
    },
  },
}), []);

  // return (
  //   <div className="dashboard-container" style={{ padding: '20px' }}>
  //     <div className="row timeline-row">
  //       <h3>Transaction Timeline (Last 6 Months)</h3>
  //       {(timelinePoints.length > 0 || analysisPoints.length > 0) ? (
  //         <div style={{ height: '400px' }}>
  //           <Scatter data={timelineChartData} options={timelineChartOptions} />
  //         </div>
  //       ) : (
  //         <p>No data available</p>
  //       )}
  //     </div>
  //   </div>
  // );

  return (
  <div
    style={{
      width: '100vw',
      height: 'calc(100vh - 120px)', // leaves room for header
      padding: '16px',
      boxSizing: 'border-box',
    }}
  >
    <h3 style={{ marginBottom: '12px' }}>
      Transaction Timeline (Last 6 Months)
    </h3>

    {(timelinePoints.length > 0 || analysisPoints.length > 0) ? (
      <div style={{ width: '90%', height: '90%' }}>
        <Scatter
          data={timelineChartData}
          options={{
            ...timelineChartOptions,
            maintainAspectRatio: false,   // VERY IMPORTANT
            responsive: true,
          }}
        />
      </div>
    ) : (
      <p>No data available</p>
    )}
  </div>
);
};

export default Timelinechart;







      
      // const timelineChartOptions = {
      //   scales: {
      //     x: {
      //       type: 'time',
      //       time: {
      //         unit: 'month',
      //         tooltipFormat: 'MMM yyyy',
      //         displayFormats: {
      //           month: 'MMM yyyy',
      //         },
      //       },
      //       title: {
      //         display: true,
      //         text: 'Month',
      //         font: {
      //           weight: 'bold',
      //         },
      //       },
      //       grid: {
      //         color: '#ccc', // Light grid lines
      //         borderColor: '#000', // Axis line color
      //       },
      //     },
      //     y: {
      //       min: -1,
      //       max: 1,
      //       title: {
      //         display: true,
      //         text: 'Model Score',
      //         font: {
      //           weight: 'bold',
      //         },
      //       },
      //       grid: {
      //         color: '#ccc',
      //         borderColor: '#000',
      //       },
      //     },
      //   },
      //   plugins: {
      //     legend: {
      //       display: false,
      //     },
      //     tooltip: {
      //       displayColors: false,
      //       callbacks: {
      //         label: function (context) {
      //           const score = context.raw.y;
      //           const amount = context.raw.amount;
      //           return [
      //             `Score: ${score}`,
      //             `Amount: ₹${amount}`
      //           ];
      //         },
      //       },
      //       titleFont: {
      //         weight: 'bold',
      //       },
      //       bodyFont: {
      //         weight: 'bold',
      //       },
      //     },
      //     annotation: {
      //       annotations: {
      //         zeroLine: {
      //           type: 'line',
      //           scaleID: 'y',
      //           value: 0,
      //           borderColor: 'blue',
      //           borderWidth: 2,
      //           label: {
      //             display: true,
      //             content: 'Zero Line',
      //             position: 'end',
      //             font: {
      //               weight: 'bold',
      //             },
      //             backgroundColor: 'rgba(0,0,255,0.1)',
      //           },
      //         },
      //       },
      //     },
      //   },
      // };
    


      
      // const timelineChartData = {
      //   datasets: [
      //     {
      //       label: 'Timeline',
      //       data: Array.isArray(timelineData)
      //         ? timelineData.map(item => ({
      //           x: item.timestamp,
      //           y: item.model_result?.score ?? 0,
      //           amount: item.amount ?? 0,
      //         }))
      //         : [],
      //       pointBackgroundColor: Array.isArray(timelineData)
      //         ? timelineData.map(item =>
      //           item.model_result?.score < 0 ? 'green' : 'red'
      //         )
      //         : [],
      //       pointRadius: 6,
      //       showLine: false,
      //     },
      //   ],
      // };
    


      
//    const timelineData1 = transactions.map(t => ({
//    date: new Date(t.timestamp).toLocaleDateString(),
//    amount: t.amount,
//    timestamp: t.timestamp
//  })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));