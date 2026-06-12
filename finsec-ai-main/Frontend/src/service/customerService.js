import API_BASE_URL from "../service/service";

/* 1. Customer master data */
export const fetchCustomerData = async (accountNumber) => {
  const res = await fetch(
    `${API_BASE_URL}/customer/customer_data?cust_id=${encodeURIComponent(accountNumber)}`,
    { method: "GET", credentials: "include" }
  );
  if (!res.ok) throw new Error("Customer data failed");
  return res.json();
};

/* 2. Fraud statistics */
export const fetchFraudStats = async (accountNumber) => {
  const res = await fetch(
    `${API_BASE_URL}/customer/fraud_statistics?cust_id=${encodeURIComponent(accountNumber)}`,
    { method: "GET", credentials: "include" }
  );
  if (!res.ok) throw new Error("Fraud stats failed");
  return res.json();
};

/* 3. Transaction / timeline data */
export const fetchTransactionData = async (accountNumber) => {
  const res = await fetch(
    `${API_BASE_URL}/customer/trans_data?cust_id=${encodeURIComponent(accountNumber)}`,
    { method: "GET", credentials: "include" }
  );
  if (!res.ok) throw new Error("Transaction data failed");
  return res.json();
};