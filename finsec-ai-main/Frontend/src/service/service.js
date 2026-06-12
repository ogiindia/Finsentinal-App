const API_BASE_URL = 'http://localhost:8002';

const GRAPHQL_ENDPOINTS = {
  customer: `${API_BASE_URL}/cust_graphql`,
  transaction: `${API_BASE_URL}/trans_graphql`,
  main: `${API_BASE_URL}/graphql`
};
// flagService.js
let chatbotFlag = false;

export const getChatbotFlag = () => {
  return chatbotFlag;
};

export const setChatbotFlag = (value) => {
  chatbotFlag = value;
};

export const graphqlRequest = async (endpoint, query, variables = {}) => {
  const url = GRAPHQL_ENDPOINTS[endpoint] || GRAPHQL_ENDPOINTS.main;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ query, variables })
  });
  
  if (response.status === 401) {
    alert('Authentication token expired. Please login again.');
    window.location.href = '/login';
    return;
  }
  
  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.statusText}`);
  }
  
  const result = await response.json();
  if (result.errors) {
    throw new Error(result.errors[0].message);
  }
  
  return result.data;
};

export const apiRequest = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (response.status === 401) {
    alert('Authentication token expired. Please login again.');
    window.location.href = '/login';
    return;
  }

  return response;
};

export const customerGraphQL = async (query, variables = {}) => {
  return graphqlRequest('customer', query, variables);
};

export const transactionGraphQL = async (query, variables = {}) => {
  return graphqlRequest('transaction', query, variables);
};

export { API_BASE_URL, GRAPHQL_ENDPOINTS , chatbotFlag };
export default API_BASE_URL;

export const currency_symbol = 'BHD';