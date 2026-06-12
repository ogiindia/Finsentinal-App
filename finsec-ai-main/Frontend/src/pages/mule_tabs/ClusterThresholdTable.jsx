import { getClusterColor } from './clusterColors';

const ClusterThresholdTable = ({ centers }) => {
  return (
    <table className="data-table" style={{ marginTop: '20px'}}>
      <thead>
        <tr>
          <th>Cluster</th>
          <th>Avg Amount</th>
          <th>Time of Day</th>
          <th>Avg Time Gap (min)</th>
          <th>Avg Counterparties</th>
          <th>Avg Location Switch</th>
          <th>Tx Count</th>
        </tr>
      </thead>
      <tbody>
        {centers.map(c => (
          <tr key={c.cluster}>
            <td style={{ 
                fontWeight: 700,
                color: getClusterColor(c.cluster)
                }}>
                Cluster {c.cluster}
            </td>
            <td style={{color:'#000000'}}>{c.amount.toFixed(2)}</td>
            <td style={{color:'#000000'}}>{c.timeOfDay.toFixed(2)}</td>
            <td style={{color:'#000000'}}>{(c.avgTimeGap / 60).toFixed(1)}</td>
            <td style={{color:'#000000'}}>{c.avgCounterparties.toFixed(1)}</td>
            <td style={{color:'#000000'}}>{c.avgLocationSwitch.toFixed(1)}</td>
            <td style={{color:'#000000'}}>{c.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default ClusterThresholdTable;
