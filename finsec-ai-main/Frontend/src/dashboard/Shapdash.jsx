import { useLocation } from 'react-router-dom';

const Shapdash = () => {
  const location = useLocation();
  const rowData = location.state?.rowData;
  const alertResponse = location.state?.alertResponse;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Row Details</h2>
      <pre className="bg-gray-100 p-4 rounded">{JSON.stringify(rowData, null, 2)}</pre>
    </div>
  );
};

export default Shapdash;
