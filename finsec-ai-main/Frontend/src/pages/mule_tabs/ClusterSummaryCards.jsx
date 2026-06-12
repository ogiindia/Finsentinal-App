import { getClusterColor } from './clusterColors';

const ClusterSummaryCards = ({ summary }) => {
  return (
    <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
      {summary.map(s => (
        <div
          key={s.cluster}
          style={{
            background: '#ecedee',
            border: '1px solid #63676d',
            borderRadius: '10px',
            padding: '14px',
            minWidth: '180px'
          }}
        >
            <h4 style={{ color: getClusterColor(s.cluster) }}>
                Cluster {s.cluster}
            </h4>
            <p><b>Transactions:</b> {s.count}</p>
            <p><b>Avg Amount:</b> {s.avgAmount.toFixed(2)}</p>
            <p><b>Avg Time Gap (min):</b> {(s.avgTimeGap / 60).toFixed(1)}</p>
            <p><b>Unique Customers:</b> {s.uniqueCustomers}</p>
        </div>
      ))}
    </div>
  );
};

export default ClusterSummaryCards;