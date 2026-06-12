
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TableView = ({ tableData, onViewCustomer, pageSize = 20, total = 0, onPageChange }) => {
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('transactions'); // 'transactions' | 'connections' | 'risk' | 'id'
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  // ---------- helpers (adjust to your domain) ----------
  const getLevel = (connections = 0) => {
    if (connections >= 50) return 'Level 3';
    if (connections >= 10) return 'Level 2';
    return 'Level 1';
  };

  const getRisk = (tx = 0, hvTouch = false) => {
    const score = tx + (hvTouch ? 3 : 0);
    if (score >= 60) return 'HIGH';
    if (score >= 20) return 'MEDIUM';
    return 'LOW';
  };

  const badge = (text, color) => {
    const palette = {
      gray:  { color: '#334155', background: '#E2E8F0' },
      blue:  { color: '#fff', background: '#3B82F6' },
      green: { color: '#fff', background: '#10B981' },
      red:   { color: '#fff', background: '#EF4444' },
    };
    return (
      <span
        style={{
          ...(palette[color] || palette.gray),
          fontSize: 12,
          padding: '3px 8px',
          borderRadius: 6,
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}
      >
        {text}
      </span>
    );
  };

  // Optional risk boost: mark nodes touching any "high-volume" edge
  const highVolumeSet = useMemo(() => {
    const s = new Set();
    // (displayData?.edges || []).forEach((e) => {
      (tableData?.edges || []).forEach((e) => {
      if ((e.type || '').toLowerCase().includes('high')) {
        s.add(e.source);
        s.add(e.target);
      }
    });
    return s;
  // }, [displayData?.edges]);
  }, [tableData?.edges]);

  // ---------- build rows from your data ----------
  // const rows = useMemo(() => {
  //   const nodes = displayData?.nodes || [];
  //   const info = displayData?.node_info || {};
  //   const q = (query || '').trim().toLowerCase();
   const rows = useMemo(() => {
   const nodes = tableData?.nodes || [];
   const info = tableData?.node_info || {};
   const q = (query || '').trim().toLowerCase();

    const base = nodes
      .map((id) => {
        const n = info[id] || {};
        const tx = n.transaction_count || 0;
        const conn = n.connections || 0;
        const isTop = !!n.is_top;
        const hvTouch = highVolumeSet.has(id);

        return {
          id,
          type: isTop ? 'Top' : 'Connected',
          level: getLevel(conn),
          transactions: tx,
          connections: conn,
          risk: getRisk(tx, hvTouch),
          label: n.label || '-',
        };
      })
      .filter((r) => (q ? r.id.toLowerCase().includes(q) : true));

    base.sort((a, b) => {
      if (sortBy === 'transactions') return b.transactions - a.transactions;
      if (sortBy === 'connections') return b.connections - a.connections;
      if (sortBy === 'risk') {
        const order = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        return (order[b.risk] || 0) - (order[a.risk] || 0);
      }
      // id
      return a.id.localeCompare(b.id, undefined, { numeric: true });
    });

    return base;
  }, [tableData, query, sortBy, highVolumeSet]);

  // ---------- pagination (bottom) ----------
  // const total = rows.length;
  // const totalPages = Math.max(1, Math.ceil(total / pageSize));
  // const currentPage = Math.min(page, totalPages);
  // const start = (currentPage - 1) * pageSize;
  // const pageRows = rows.slice(start, start + pageSize);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = page;
  const pageRows = rows; // backend already paginated

  // const go = (p) => setPage(Math.min(Math.max(1, p), totalPages));
  const go = (p) => {
   const next = Math.min(Math.max(1, p), totalPages);
   setPage(next);
   onPageChange?.(next);
 };

  // ---------- UI ----------
  return (
    <div
      className="table-container"
      style={{ background: '#fff', borderRadius: 8, border: '1px solid #E2E8F0' }}
    >
      {/* Top controls */}
      <div style={{ display: 'flex', gap: 12, padding: 12 }}>
        <input
          type="text"
          placeholder="Filter accounts..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          style={{
            width: 260,
            height: 36,
            border: '1px solid #E2E8F0',
            borderRadius: 6,
            padding: '0 10px',
            outline: 'none',
          }}
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            height: 36,
            border: '1px solid #E2E8F0',
            borderRadius: 6,
            padding: '0 10px',
            outline: 'none',
          }}
        >
          <option value="transactions">Sort by Transactions</option>
          <option value="connections">Sort by Connections</option>
          <option value="risk">Sort by Risk</option>
          <option value="id">Sort by Account ID</option>
        </select>
      </div>

      {/* Table */}
      <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: '#334155' }}>
            <th style={{ padding: '10px 14px' }}>Account ID</th>
            <th style={{ padding: '10px 14px' }}>Type</th>
            <th style={{ padding: '10px 14px' }}>Level</th>
            <th style={{ padding: '10px 14px' }}>Transactions</th>
            <th style={{ padding: '10px 14px' }}>Connections</th>
            <th style={{ padding: '10px 14px' }}>Risk Score</th>
            <th style={{ padding: '10px 14px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {pageRows.length ? (
            pageRows.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid #F1F5F9' }}>
                <td style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono, monospace' }}>
                  {r.id}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  {badge(r.type, r.type === 'Top' ? 'blue' : 'gray')}
                </td>
                <td style={{ padding: '10px 14px' }}>{r.level}</td>
                <td style={{ padding: '10px 14px' }}>{r.transactions}</td>
                <td style={{ padding: '10px 14px' }}>{r.connections}</td>
                <td style={{ padding: '10px 14px' }}>
                  {badge(
                    r.risk,
                    r.risk === 'HIGH' ? 'red' : r.risk === 'MEDIUM' ? 'blue' : 'green'
                  )}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => onViewCustomer?.(r.id)}
                      style={{
                        height: 28,
                        padding: '0 10px',
                        border: '1px solid #CBD5E1',
                        background: '#fff',
                        borderRadius: 6,
                        cursor: 'pointer',
                      }}
                    >
                      View
                    </button>
                    <button
                      // onClick={() => alert(`Details ${r.id}`)}
                      onClick={() =>
                        navigate('/profiling', {
                          state: {
                            customerId: r.id,
                            tab: 'customer',
                          },
                        })
                      }
                      style={{
                        height: 28,
                        padding: '0 10px',
                        border: '1px solid #3B82F6',
                        background: 'transparent',
                        color: '#3B82F6',
                        borderRadius: 6,
                        cursor: 'pointer',
                      }}
                    >
                      Details
                    </button>
                    <button
                      onClick={() =>
                        navigate('/profiling', {
                          state: {
                            customerId: r.id,
                            tab: 'riskfactor',
                          },
                        })
                      }
                      style={{
                        height: 28,
                        padding: '0 10px',
                        border: '1px solid #EF4444',
                        background: 'transparent',
                        color: '#EF4444',
                        cursor: 'pointer',
                        borderRadius: 6,
                        fontWeight: 600,
                      }}
                    >
                      Risk Factor
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={7}
                style={{ padding: 16, textAlign: 'center', color: '#64748B' }}
              >
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Bottom pagination */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 12,
          borderTop: '1px solid #F1F5F9',
        }}
      >
        <div style={{ color: '#64748B', fontSize: 14 }}>
          {/* Showing <strong>{pageRows.length}</strong> of <strong>{total}</strong> accounts · */}
          Page {currentPage} of {totalPages}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <NavBtn label="First" disabled={currentPage === 1} onClick={() => go(1)} />
          <NavBtn label="Prev" disabled={currentPage === 1} onClick={() => go(currentPage - 1)} />
          <NavBtn
            label="Next"
            disabled={currentPage === totalPages}
            onClick={() => go(currentPage + 1)}
          />
          <NavBtn
            label="Last"
            disabled={currentPage === totalPages}
            onClick={() => go(totalPages)}
          />
        </div>
      </div>
    </div>
  );
};

const NavBtn = ({ label, disabled, onClick }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      height: 32,
      padding: '0 12px',
      border: '1px solid #CBD5E1',
      background: disabled ? '#F1F5F9' : '#fff',
      color: disabled ? '#94A3B8' : '#0F172A',
      borderRadius: 6,
      cursor: disabled ? 'not-allowed' : 'pointer',
    }}
  >
    {label}
  </button>
);

export default TableView;