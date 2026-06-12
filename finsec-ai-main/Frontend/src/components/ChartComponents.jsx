import React from 'react';

export const BarChart = ({ data, title, color = '#012834' }) => {
  if (!data || !data.labels || !data.values) return null;

  const maxValue = Math.max(...data.values);
  const chartHeight = 300;

  return (
    <div style={{ width: '100%' }}>
      <h3 style={{
        fontSize: '1rem',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '1rem',
        textAlign: 'center'
      }}>
        {title}
      </h3>
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        height: `${chartHeight}px`,
        padding: '0 1rem',
        borderBottom: '2px solid #e5e7eb',
        gap: '0.5rem'
      }}>
        {data.labels.map((label, index) => {
          const height = (data.values[index] / maxValue) * (chartHeight - 40);
          return (
            <div
              key={index}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
                minWidth: 0
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: `${height}px`,
                  backgroundColor: color,
                  borderRadius: '4px 4px 0 0',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                title={`${label}: ${data.values[index]}`}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                <span style={{
                  position: 'absolute',
                  top: '-20px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  {data.values[index]}
                </span>
              </div>
              <span style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                marginTop: '0.5rem',
                textAlign: 'center',
                wordBreak: 'break-word',
                maxWidth: '100%'
              }}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const PieChart = ({ data, title, colors = ['#012834', '#1e5a6b', '#3a8ca3', '#56bedb', '#72d0ed'] }) => {
  if (!data || !data.labels || !data.values) return null;

  const total = data.values.reduce((sum, val) => sum + val, 0);
  let currentAngle = 0;

  const createSlicePath = (percentage, startAngle) => {
    const angle = (percentage / 100) * 360;
    const endAngle = startAngle + angle;
    
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);
    
    const x1 = 100 + 80 * Math.cos(startRad);
    const y1 = 100 + 80 * Math.sin(startRad);
    const x2 = 100 + 80 * Math.cos(endRad);
    const y2 = 100 + 80 * Math.sin(endRad);
    
    const largeArc = angle > 180 ? 1 : 0;
    
    return `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  return (
    <div style={{ width: '100%' }}>
      <h3 style={{
        fontSize: '1rem',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '1rem',
        textAlign: 'center'
      }}>
        {title}
      </h3>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2rem' }}>
        <svg width="200" height="200" viewBox="0 0 200 200">
          {data.values.map((value, index) => {
            const percentage = (value / total) * 100;
            const path = createSlicePath(percentage, currentAngle);
            currentAngle += (percentage / 100) * 360;
            
            return (
              <path
                key={index}
                d={path}
                fill={colors[index % colors.length]}
                stroke="white"
                strokeWidth="2"
                style={{ cursor: 'pointer', transition: 'opacity 0.3s' }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                <title>{`${data.labels[index]}: ${value} (${percentage.toFixed(1)}%)`}</title>
              </path>
            );
          })}
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {data.labels.map((label, index) => {
            const percentage = ((data.values[index] / total) * 100).toFixed(1);
            return (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    backgroundColor: colors[index % colors.length],
                    borderRadius: '2px'
                  }}
                />
                <span style={{ fontSize: '0.875rem', color: '#374151' }}>
                  {label}: {data.values[index]} ({percentage}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const LineChart = ({ data, title, color = '#012834' }) => {
  if (!data || !data.dates || !data.counts) return null;


  const maxValue = Math.max(...data.counts);
  const chartWidth = 600;
  const chartHeight = 300;
  const padding = 60;

  const yAxisSteps = 5;
  const yStep = Math.ceil(maxValue / yAxisSteps);
  const yMax = yStep * yAxisSteps;

  const points = data.dates.map((date, index) => {
    const x = padding + (index / (data.dates.length - 1)) * (chartWidth - 2 * padding);
    const y = chartHeight - padding - ((data.counts[index] / yMax) * (chartHeight - 2 * padding));
    return { x, y, date, count: data.counts[index] };
  });

  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <h3 style={{
        fontSize: '1rem',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '1rem',
        textAlign: 'center'
      }}>
        {title}
      </h3>
      <svg width={chartWidth} height={chartHeight} style={{ display: 'block', margin: '0 auto' }}>
        {[...Array(yAxisSteps + 1)].map((_, i) => {
          const y = chartHeight - padding - (i / yAxisSteps) * (chartHeight - 2 * padding);
          const value = (i / yAxisSteps) * yMax;
          return (
            <g key={i}>
              <line 
                x1={padding} 
                y1={y} 
                x2={chartWidth - padding} 
                y2={y} 
                stroke="#e5e7eb" 
                strokeWidth="1" 
                strokeDasharray="4,4"
              />
              <text
                x={padding - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="#6b7280"
              >
                {Math.round(value)}
              </text>
            </g>
          );
        })}
        
        <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="#374151" strokeWidth="2" />
        <line x1={padding} y1={padding} x2={padding} y2={chartHeight - padding} stroke="#374151" strokeWidth="2" />
        
        <path d={pathData} fill="none" stroke={color} strokeWidth="3" />
        
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="5"
            fill={color}
            stroke="white"
            strokeWidth="2"
            style={{ cursor: 'pointer' }}
          >
            <title>{`${point.date}: ${point.count}`}</title>
          </circle>
        ))}
        
        {data.dates.map((date, i) => {
          if (i % Math.ceil(data.dates.length / 6) === 0 || i === data.dates.length - 1) {
            return (
              <text
                key={i}
                x={points[i].x}
                y={chartHeight - padding + 20}
                textAnchor="middle"
                fontSize="10"
                fill="#6b7280"
              >
                {date.slice(5)}
              </text>
            );
          }
          return null;
        })}
        
        <text
          x={20}
          y={chartHeight / 2}
          textAnchor="middle"
          fontSize="12"
          fill="#374151"
          fontWeight="600"
          transform={`rotate(-90, 20, ${chartHeight / 2})`}
        >
          Count
        </text>
        
        <text
          x={chartWidth / 2}
          y={chartHeight - 10}
          textAnchor="middle"
          fontSize="12"
          fill="#374151"
          fontWeight="600"
        >
          Date
        </text>
      </svg>
    </div>
  );
};


// export const LineChart = ({ data, title, color = '#012834' }) => {
//   if (!data || !data.dates || !data.counts) return null;

//   const maxValue = Math.max(...data.counts);
//   const padding = 60;
//   const yAxisSteps = 5;
//   const yStep = Math.ceil(maxValue / yAxisSteps);
//   const yMax = yStep * yAxisSteps;

//   // Responsive width using container size
//   const chartHeight = 500;

//   return (
//     <div style={{ width: '100%', overflowX: 'auto' }}>
//       <h3 style={{
//         fontSize: '1rem',
//         fontWeight: '600',
//         color: '#374151',
//         marginBottom: '1rem',
//         textAlign: 'center'
//       }}>
//         {title}
//       </h3>
//       <svg
//         viewBox={`0 0 800 ${chartHeight}`}
//         preserveAspectRatio="xMidYMid meet"
//         style={{ width: '100%', height: 'auto', display: 'block', margin: '0 auto' }}
//       >
//         {[...Array(yAxisSteps + 1)].map((_, i) => {
//           const y = chartHeight - padding - (i / yAxisSteps) * (chartHeight - 2 * padding);
//           const value = (i / yAxisSteps) * yMax;
//           return (
//             <g key={i}>
//               <line
//                 x1={padding}
//                 y1={y}
//                 x2={800 - padding}
//                 y2={y}
//                 stroke="#e5e7eb"
//                 strokeWidth="1"
//                 strokeDasharray="4,4"
//               />
//               <text
//                 x={padding - 10}
//                 y={y + 4}
//                 textAnchor="end"
//                 fontSize="18"
//                 fill="#6b7280"
//               >
//                 {Math.round(value)}
//               </text>
//             </g>
//           );
//         })}

//         <line x1={padding} y1={chartHeight - padding} x2={800 - padding} y2={chartHeight - padding} stroke="#374151" strokeWidth="2" />
//         <line x1={padding} y1={padding} x2={padding} y2={chartHeight - padding} stroke="#374151" strokeWidth="2" />

//         {/* Line Path */}
//         <path
//           d={data.dates.map((_, index) => {
//             const x = padding + (index / (data.dates.length - 1)) * (800 - 2 * padding);
//             const y = chartHeight - padding - ((data.counts[index] / yMax) * (chartHeight - 2 * padding));
//             return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
//           }).join(' ')}
//           fill="none"
//           stroke={color}
//           strokeWidth="3"
//         />

//         {/* Points */}
//         {data.dates.map((date, index) => {
//           const x = padding + (index / (data.dates.length - 1)) * (800 - 2 * padding);
//           const y = chartHeight - padding - ((data.counts[index] / yMax) * (chartHeight - 2 * padding));
//           return (
//             <circle
//               key={index}
//               cx={x}
//               cy={y}
//               r="5"
//               fill={color}
//               stroke="white"
//               strokeWidth="2"
//               style={{ cursor: 'pointer' }}
//             >
//               <title>{`${date}: ${data.counts[index]}`}</title>
//             </circle>
//           );
//         })}

//         {/* X-axis labels */}
//         {data.dates.map((date, i) => {
//           if (i % Math.ceil(data.dates.length / 6) === 0 || i === data.dates.length - 1) {
//             const x = padding + (i / (data.dates.length - 1)) * (800 - 2 * padding);
//             return (
//               <text
//                 key={i}
//                 x={x}
//                 y={chartHeight - padding + 20}
//                 textAnchor="middle"
//                 fontSize="18"
//                 fill="#6b7280"
//               >
//                 {date.slice(5)}
//               </text>
//             );
//           }
//           return null;
//         })}

//         {/* Axis labels */}
//         <text
//           x={20}
//           y={chartHeight / 2}
//           textAnchor="middle"
//           fontSize="20"
//           fill="#374151"
//           fontWeight="600"
//           transform={`rotate(-90, 20, ${chartHeight / 2})`}
//         >
//           Count
//         </text>

//         <text
//           x={800 / 2}
//           y={chartHeight - 10}
//           textAnchor="middle"
//           fontSize="20"
//           fill="#374151"
//           fontWeight="600"
//         >
//           Date
//         </text>
//       </svg>
//     </div>
//   );
// };















export const HorizontalBarChart = ({ data, title, color = '#012834' }) => {
  if (!data || !data.labels || !data.values) return null;

  const maxValue = Math.max(...data.values);

  return (
    <div style={{ width: '100%' }}>
      <h3 style={{
        fontSize: '1rem',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '1rem',
        textAlign: 'center'
      }}>
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0 1rem' }}>
        {data.labels.map((label, index) => {
          const percentage = (data.values[index] / maxValue) * 100;
          return (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{
                fontSize: '0.875rem',
                color: '#374151',
                minWidth: '120px',
                textAlign: 'right'
              }}>
                {label}
              </span>
              <div style={{
                flex: 1,
                height: '24px',
                backgroundColor: '#f3f4f6',
                borderRadius: '4px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div
                  style={{
                    width: `${percentage}%`,
                    height: '100%',
                    backgroundColor: color,
                    transition: 'width 0.5s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    paddingRight: '0.5rem'
                  }}
                >
                  <span style={{ fontSize: '0.75rem', color: 'white', fontWeight: '600' }}>
                    {data.values[index]}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const GroupedBarChart = ({ data, title, colors = ['#3b82f6', '#ec4899'] }) => {
  if (!data || !data.age_groups || !data.male || !data.female) return null;

  const maxValue = Math.max(...data.male, ...data.female);
  const chartHeight = 300;
  const barWidth = 30;
  const paddingTop = 40;
  const paddingBottom = 60;

  const yAxisSteps = 5;
  const yStep = Math.ceil(maxValue / yAxisSteps);
  const yMax = yStep * yAxisSteps;

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <h3 style={{
        fontSize: '1rem',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '1rem',
        textAlign: 'center'
      }}>
        {title}
      </h3>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '0.5rem',
        marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '16px', height: '16px', backgroundColor: colors[0], borderRadius: '2px' }} />
          <span style={{ fontSize: '0.875rem', color: '#374151' }}>Male</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '16px', height: '16px', backgroundColor: colors[1], borderRadius: '2px' }} />
          <span style={{ fontSize: '0.875rem', color: '#374151' }}>Female</span>
        </div>
      </div>

      <div style={{
        position: 'absolute',
        left: '0',
        top: '110px',
        height: `${chartHeight - paddingTop - paddingBottom}px`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        paddingRight: '8px'
      }}>
        {[...Array(yAxisSteps + 1)].map((_, i) => {
          const value = Math.round((yAxisSteps - i) / yAxisSteps * yMax);
          return (
            <span key={i} style={{ fontSize: '0.75rem', color: '#6b7280', textAlign: 'right', minWidth: '30px' }}>
              {value}
            </span>
          );
        })}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        height: `${chartHeight}px`,
        padding: `${paddingTop}px 1rem ${paddingBottom}px 45px`,
        borderBottom: '2px solid #374151',
        borderLeft: '2px solid #374151',
        gap: '1rem',
        position: 'relative'
      }}>
        {[...Array(yAxisSteps + 1)].map((_, i) => {
          const yPosition = (i / yAxisSteps) * 100;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: '45px',
                right: '1rem',
                bottom: `${paddingBottom + yPosition * (chartHeight - paddingTop - paddingBottom) / 100}px`,
                borderTop: '1px dashed #e5e7eb',
                pointerEvents: 'none'
              }}
            />
          );
        })}

        {data.age_groups.map((group, index) => {
          const maleHeight = (data.male[index] / yMax) * (chartHeight - paddingTop - paddingBottom);
          const femaleHeight = (data.female[index] / yMax) * (chartHeight - paddingTop - paddingBottom);
          
          return (
            <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end' }}>
                <div
                  style={{
                    width: `${barWidth}px`,
                    height: `${maleHeight}px`,
                    backgroundColor: colors[0],
                    borderRadius: '4px 4px 0 0',
                    cursor: 'pointer',
                    transition: 'opacity 0.3s',
                    position: 'relative'
                  }}
                  title={`Male: ${data.male[index]}`}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  {data.male[index] > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-20px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      color: colors[0],
                      whiteSpace: 'nowrap'
                    }}>
                      {data.male[index]}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    width: `${barWidth}px`,
                    height: `${femaleHeight}px`,
                    backgroundColor: colors[1],
                    borderRadius: '4px 4px 0 0',
                    cursor: 'pointer',
                    transition: 'opacity 0.3s',
                    position: 'relative'
                  }}
                  title={`Female: ${data.female[index]}`}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  {data.female[index] > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-20px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      color: colors[1],
                      whiteSpace: 'nowrap'
                    }}>
                      {data.female[index]}
                    </span>
                  )}
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#6b7280', textAlign: 'center' }}>
                {group}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{
        position: 'absolute',
        left: '5px',
        top: '50%',
        transform: 'rotate(-90deg) translateX(-50%)',
        transformOrigin: 'left center',
        fontSize: '0.875rem',
        fontWeight: '600',
        color: '#374151',
        whiteSpace: 'nowrap'
      }}>
        Count
      </div>
    </div>
  );
};

export const StackedBarChart = ({ data, title, colors = ['#10b981', '#ef4444'] }) => {
  if (!data || !data.locations || !data.fraud || !data.total) return null;

  const maxValue = Math.max(...data.total);

  return (
    <div style={{ width: '100%' }}>
      <h3 style={{
        fontSize: '1rem',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '1rem',
        textAlign: 'center'
      }}>
        {title}
      </h3>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '0.5rem',
        marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '16px', height: '16px', backgroundColor: colors[0], borderRadius: '2px' }} />
          <span style={{ fontSize: '0.875rem', color: '#374151' }}>Normal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '16px', height: '16px', backgroundColor: colors[1], borderRadius: '2px' }} />
          <span style={{ fontSize: '0.875rem', color: '#374151' }}>Fraud</span>
        </div>
      </div>
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '0.75rem', 
        padding: '0 1rem',
        maxWidth: '100%',
        overflowX: 'auto'
      }}>
        {data.locations.map((location, index) => {
          const fraudPercentage = (data.fraud[index] / data.total[index]) * 100;
          const normalPercentage = 100 - fraudPercentage;
          const totalPercentage = (data.total[index] / maxValue) * 100;
          
          return (
            <div key={index} style={{ minWidth: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.25rem' }}>
                <span style={{
                  fontSize: '0.875rem',
                  color: '#374151',
                  minWidth: '100px',
                  maxWidth: '100px',
                  textAlign: 'right',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }} title={location}>
                  {location}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#6b7280', minWidth: '60px' }}>
                  {data.total[index]} txns
                </span>
              </div>
              <div style={{
                marginLeft: '116px',
                height: '24px',
                backgroundColor: '#f3f4f6',
                borderRadius: '4px',
                overflow: 'hidden',
                display: 'flex',
                width: `calc(100% - 116px)`,
                maxWidth: `${totalPercentage}%`
              }}>
                <div
                  style={{
                    width: `${normalPercentage}%`,
                    backgroundColor: colors[0],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'width 0.3s'
                  }}
                  title={`Normal: ${data.total[index] - data.fraud[index]}`}
                />
                <div
                  style={{
                    width: `${fraudPercentage}%`,
                    backgroundColor: colors[1],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'width 0.3s'
                  }}
                  title={`Fraud: ${data.fraud[index]}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const ScatterPlot = ({ data, title, color = '#8b5cf6' }) => {
  if (!data || !data.ages || !data.incomes) return null;

  const maxAge = Math.max(...data.ages);
  const maxIncome = Math.max(...data.incomes);
  const minAge = Math.min(...data.ages);
  const minIncome = Math.min(...data.incomes);
  
  const chartWidth = 500;
  const chartHeight = 300;
  const padding = 60;

  const xAxisSteps = 5;
  const yAxisSteps = 5;

  return (
    <div style={{ width: '100%' }}>
      <h3 style={{
        fontSize: '1rem',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '1rem',
        textAlign: 'center'
      }}>
        {title}
      </h3>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <svg width={chartWidth} height={chartHeight}>
          {[...Array(yAxisSteps + 1)].map((_, i) => {
            const y = chartHeight - padding - (i / yAxisSteps) * (chartHeight - 2 * padding);
            const value = Math.round((i / yAxisSteps) * maxIncome);
            return (
              <g key={`y-${i}`}>
                <line 
                  x1={padding} 
                  y1={y} 
                  x2={chartWidth - padding} 
                  y2={y} 
                  stroke="#e5e7eb" 
                  strokeWidth="1"
                  strokeDasharray="4,4"
                />
                <text
                  x={padding - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#6b7280"
                >
                  {value}
                </text>
              </g>
            );
          })}
          
          {[...Array(xAxisSteps + 1)].map((_, i) => {
            const x = padding + (i / xAxisSteps) * (chartWidth - 2 * padding);
            const value = Math.round(minAge + (i / xAxisSteps) * (maxAge - minAge));
            return (
              <g key={`x-${i}`}>
                <line 
                  x1={x} 
                  y1={padding} 
                  x2={x} 
                  y2={chartHeight - padding} 
                  stroke="#e5e7eb" 
                  strokeWidth="1"
                  strokeDasharray="4,4"
                />
                <text
                  x={x}
                  y={chartHeight - padding + 20}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#6b7280"
                >
                  {value}
                </text>
              </g>
            );
          })}
          
          <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="#374151" strokeWidth="2" />
          <line x1={padding} y1={padding} x2={padding} y2={chartHeight - padding} stroke="#374151" strokeWidth="2" />
          
          <text x={chartWidth / 2} y={chartHeight - 10} textAnchor="middle" fontSize="12" fill="#374151" fontWeight="600">
            Age
          </text>
          <text x={15} y={chartHeight / 2} textAnchor="middle" fontSize="12" fill="#374151" fontWeight="600" transform={`rotate(-90, 15, ${chartHeight / 2})`}>
            Income
          </text>
          
          {data.ages.map((age, index) => {
            const x = padding + ((age - minAge) / (maxAge - minAge)) * (chartWidth - 2 * padding);
            const y = chartHeight - padding - (data.incomes[index] / maxIncome) * (chartHeight - 2 * padding);
            
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="5"
                fill={color}
                opacity="0.6"
                stroke="white"
                strokeWidth="1"
                style={{ cursor: 'pointer' }}
              >
                <title>{`Age: ${age}, Income: ${Math.round(data.incomes[index])}`}</title>
              </circle>
            );
          })}
        </svg>
      </div>
    </div>
  );
};