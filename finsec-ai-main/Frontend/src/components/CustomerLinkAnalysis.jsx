import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import API_BASE_URL from '../service/service';

// Icon mapping configuration
const ICONS_MAP = {
  CustomerId: 'fa-id-card',
  FirstName: 'fa-user',
  LastName: 'fa-user-tag',
  Email: 'fa-envelope',
  Phone: 'fa-phone',
  Address: 'fa-map-marker-alt',
  MerchantAddress: 'fa-store',
  Gender: 'fa-venus-mars',
  Age: 'fa-birthday-cake',
  Registered: 'fa-calendar-check',
  Orders: 'fa-shopping-cart',
  Spent: 'fa-money-bill-wave',
  Job: 'fa-briefcase',
  Hobbies: 'fa-heart',
  IsMarried: 'fa-ring',
  AccountHolding: 'fa-university',
  LoanAccount: 'fa-credit-card',
  CurrentBalanceBhd: 'fa-wallet',
  IncomeBhd: 'fa-chart-line',
  GeoLocation: 'fa-globe',
  Vulnerability: 'fa-exclamation-triangle',
  DeviceId: 'fa-mobile-alt',
  state: 'fa-flag',
  Transactions: 'fa-exchange-alt',
  Hide: 'fa-eye-slash',
  Info: 'fa-info-circle',
  Expand: 'fa-expand',
  Fetch: 'fa-download'
};

function getValueByField(fieldName) {
  if (fieldName === 'FirstName') {
    return 'first_name';
  } else if (fieldName === 'LastName') {
    return 'last_name';
  } else if (fieldName === 'DeviceId') {
    return 'device_id';
  } else {
    return fieldName; // or throw an error if needed
  }
}



const CustomerLinkAnalysis = ({
  initialNodes = [],
  initialLinks = [],
  onGraphChange,
  onNodeApiError,
  configurableFields = ['FirstName', 'LastName', 'Email', 'DeviceId', 'Phone'],
  linkValues = []
}) => {


  const [initialnodes, setInitialNodes] = useState(initialNodes);
  const [initiallinks, setInitialLinks] = useState(initialLinks);

// Date filter states
const [showDateFilter, setShowDateFilter] = useState(false);
const [datePreset, setDatePreset] = useState('last6months');
const [customStartDate, setCustomStartDate] = useState('');
const [customEndDate, setCustomEndDate] = useState('');
const [appliedDateRange, setAppliedDateRange] = useState({ start: null, end: null, preset: 'last6months' });

const datePresets = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last3months', label: 'Last 3 Months' },
  { value: 'last6months', label: 'Last 6 Months' },
  { value: 'lastmonth', label: 'Last Month' },
  { value: 'lastyear', label: 'Last Year' },
  { value: 'thisyear', label: 'This Year' },
  { value: 'nofilter', label: 'No Filter' },
  { value: 'custom', label: 'Custom Date Range' }
];

// Transaction filter states
const [showTransactionFilter, setShowTransactionFilter] = useState(false);
const [transactionPreset, setTransactionPreset] = useState('all');
const [transactionCount, setTransactionCount] = useState(20);
const [appliedTransactionFilter, setAppliedTransactionFilter] = useState({ preset: 'all', count: 20 });


const [isFraud, setFraud] = useState(false);

const transactionCountOptions = [10, 20, 30, 40, 50, 75, 100];


// const formatDate = (date) => {
//   if (!date) return null;
//   const day = String(date.getDate()).padStart(2, '0');
//   const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
//   const year = date.getFullYear();
//   return `${day}/${month}/${year}`;
// };
const formatDate = (date) => {
  if (!date) return null;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
};

const calculateDateRange = (preset) => {
  const now = new Date();
  let start, end;

  switch (preset) {
    case 'today':
      start = new Date(now.setHours(0, 0, 0, 0));
      end = new Date(now.setHours(23, 59, 59, 999));
      break;
    case 'yesterday':
      start = new Date(now.setDate(now.getDate() - 1));
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setHours(23, 59, 59, 999);
      break;
    case 'last3months':
      end = new Date();
      start = new Date(now.setMonth(now.getMonth() - 3));
      break;
    case 'last6months':
      end = new Date();
      start = new Date(now.setMonth(now.getMonth() - 6));
      break;
    case 'lastmonth':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'lastyear':
      start = new Date(now.getFullYear() - 1, 0, 1);
      end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      break;
    case 'thisyear':
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date();
      break;
    case 'nofilter':
      return { start: null, end: null };
    case 'custom':
      return { 
        start: customStartDate ? new Date(customStartDate) : null, 
        end: customEndDate ? new Date(customEndDate) : null 
      };
    default:
      end = new Date();
      start = new Date(now.setMonth(now.getMonth() - 6));
  }

  return { 
// start: formatDate(start),  end: formatDate(end)
start,  end
 };
};




const incrementTransactionCount = () => {
  const currentIndex = transactionCountOptions.indexOf(transactionCount);
  if (currentIndex < transactionCountOptions.length - 1) {
    setTransactionCount(transactionCountOptions[currentIndex + 1]);
  }
};
 
const decrementTransactionCount = () => {
  const currentIndex = transactionCountOptions.indexOf(transactionCount);
  if (currentIndex > 0) {
    setTransactionCount(transactionCountOptions[currentIndex - 1]);
  }
};
 
const handleTransactionCountChange = (e) => {
  const value = parseInt(e.target.value);
  if (value >= 10 && value <= 100) {
    setTransactionCount(value);
  }
};


const applyTransactionFilter = () => {
  setAppliedTransactionFilter({ preset: transactionPreset, count: transactionCount });
  
  console.log('Transaction Filter Applied:', {
    preset: transactionPreset,
    transactionCount: transactionCount ,appliedTransactionFilter
  });

  setShowTransactionFilter(false);
  
  // Refresh with new filters without losing existing nodes
  // setTimeout(() => {
    refreshTransactionNodes();
  // }, 100);
};


 

const resetTransactionFilter = () => {
  setTransactionPreset('all');
  setTransactionCount(20);
  setAppliedTransactionFilter({ preset: 'all', count: 20 });
  
  console.log('Transaction Filter Reset to Defaults (All, Count: 20)');
  
  // Refresh with default filters
  // setTimeout(() => {
    refreshTransactionNodes();
  // }, 100);
};



const applyDateFilter = () => {




  const dateRange = calculateDateRange(datePreset);
  setAppliedDateRange({ start: dateRange.start, end: dateRange.end, preset: datePreset });
  
  

  // Refresh graph with date filter
  initializedRef.current = false;
  setShowDateFilter(false);
  
  updateGraph(initialnodes, initiallinks);
};

const resetDateFilter = () => {
  setDatePreset('last6months');
  setCustomStartDate('');
  setCustomEndDate('');
  const dateRange = calculateDateRange('last6months');
  setAppliedDateRange({ start: dateRange.start, end: dateRange.end, preset: 'last6months' });
  
  // console.log('Date Filter Reset to Last 6 Months');
  initializedRef.current = false;
  initializeGraph()
  updateGraph(initialnodes, initiallinks);

};


  const svgRef = useRef(null);
  const simulationRef = useRef(null);
  const [nodes, setNodes] = useState(initialNodes);
  const [links, setLinks] = useState(initialLinks);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // const [tooltip, setTooltip] = useState({ visible: false, content: '', x: 0, y: 0 });
  const [tooltip, setTooltip] = useState({ visible: false, content: '', x: 0, y: 0, isHtml: false });
  const containerRef = useRef(null);
  const initializedRef = useRef(false);
  const animationFrameRef = useRef(null);

  const [selectedFields, setSelectedFields] = useState(configurableFields);
  const [showFieldSelector, setShowFieldSelector] = useState(false);


  const mockAPI = {





    
    customerDetails: async (customerId) => {
      // await new Promise(resolve => setTimeout(resolve, 300));
      // customerId = '420568'
      // console.log(customerId)
      if (!customerId || customerId === "N/A"){
        return null;
      };


const queryPayload = {
  query : `query Customers {
    customers(filter: { customer_id_eq: "${customerId}" }) {
        customer_id
        first_name
        last_name
        email
        phone
        gender
        age
        is_married
        address
        merchant_address
        state
        geo_location
        registered
        account_holding
        loan_account
        current_balance
        income
        orders
        spent
        job
        hobbies
        vulnerability
        device_id
        created_at
        updated_at
    }
}`
};

      const response = await fetch(`${API_BASE_URL}/cust_graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(queryPayload)
      });
      // console.log(response)
      const result = await response.json();
      // console.log(result.data.customers[0])

      const customer = result?.data?.customers?.[0];

      if (!customer) {
        return null;
      }

      return {
        CustomerId: customer.customer_id,
        FirstName: customer.first_name ?? null,
        LastName: customer.last_name ?? null,
        Email: customer.email ?? null,
        Phone: customer.phone ?? null,
        DeviceId: customer.device_id ?? null,
        Address: customer.address ?? null,
        Gender: customer.gender ?? null,
        Age: customer.age ?? null,
        Registered: customer.registered ?? null,
        state: customer.state ?? null
      };
    },
    transactionDetails: async (customerId) => {
      // await new Promise(resolve => setTimeout(resolve, 300));



// console.log(datePreset)
        const dateRange = calculateDateRange(datePreset);
        setAppliedDateRange({ start: dateRange.start, end: dateRange.end, preset: 'last6months' });

const filter = `date_filter: { gte: "${formatDate(dateRange.start)}", lte: "${formatDate(dateRange.end)}" }`;




const fraudOnly = appliedTransactionFilter.preset === 'fraud';

 const transPayload = {
        query: `query Transaction_customer_profile {
    transaction_customer_profile(customer_id: "${customerId}"
      fraud_only: ${fraudOnly}

    ${filter}
      ) {
        customer_id
        stats {
            customer_id
            total_transactions
            outgoing_count
            incoming_count
            total_amount_sent
            total_amount_received
            avg_amount_sent
            avg_amount_received
            fraud_count
            fraud_percentage
            unique_recipients
            unique_senders
            most_frequent_recipient
            most_frequent_sender
            date_range_start
            date_range_end
        }
        outgoing_transactions {
            id
            customer_id
            timestamp
            amount
            location
            to_customer_id
            feature_data {
                id
                alsalam_id
                fraud
                risk_score
            }
        }
        incoming_transactions {
            id
            customer_id
            timestamp
            amount
            to_customer_id
            feature_data {
                id
                alsalam_id
                fraud
                risk_score
            }
        }
    }
}`
      }



      // console.log("Raw payload:", JSON.stringify(transPayload, null, 2));

      const queryPayload = {
        query: `query ($customer_id: String!) 
      {Customers(where: 
      {all: [
      {column: "Customer_Id", op: EQ, value: $customer_id}]
      }) {customer_id} 
       }`,
        variables: {
          customer_id: String(customerId)
        }
      };
      // console.log(transPayload)
      const response = await fetch(`${API_BASE_URL}/trans_graphql`, {

        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(transPayload)
      });

      const result = await response.json();
      // console.log(result)
      // console.log(result.data.transaction_customer_profile)


      const sentcustids = [];
      const receivedcustids = [];
      const sentcustid = result.data.transaction_customer_profile.outgoing_transactions.length;
      const recievedcustid = result.data.transaction_customer_profile.incoming_transactions.length;



      if (sentcustid > 0) {
        const sentcustomerData = result.data.transaction_customer_profile.outgoing_transactions;
        // console.log(sentcustomerData)
        sentcustomerData.forEach(txn => {
          sentcustids.push({
            to_customer_id: txn.to_customer_id,
            fraud: txn.feature_data?.fraud ?? false // default to false if missing
          });
        });
        //    const sentcustomerIds = result.data.transaction_customer_profile.outgoing_transactions.map(n => n.to_customer_id);
        //         sentcustomerIds.forEach(to_customer_id => {
        //           sentcustids.push(to_customer_id );
        //         });
      }

      if (recievedcustid > 0) {
        const receivedcustomerData = result.data.transaction_customer_profile.incoming_transactions;
        // console.log(receivedcustomerData)
        receivedcustomerData.forEach(txn => {
          receivedcustids.push({
            to_customer_id: txn.customer_id,
            fraud: txn.feature_data?.fraud ?? false
          });
        });
        //    const recivedcustomerIds = result.data.transaction_customer_profile.incoming_transactions.map(n => n.customer_id);
        //         recivedcustomerIds.forEach(customer_id => {
        //           receivedcustids.push(customer_id);
        //         });
      }
      // console.log(sentcustids)
      // console.log(receivedcustids)

      return {
        SentCount: result.data.transaction_customer_profile.stats.outgoing_count,
        SentCustomerID: sentcustids,
        ReceivedCount: result.data.transaction_customer_profile.stats.incoming_count,
        RecievedCustomerID: receivedcustids,
        TotalCount: result.data.transaction_customer_profile.stats.total_transactions
      };

      // return {
      //   SentCount: sentIds.length,
      //   SentCustomerID: sentIds,
      //   ReceivedCount: receivedIds.length,
      //   RecievedCustomerID: receivedIds,
      //   TotalCount: sentIds.length + receivedIds.length
      // };
    },
        // limit: 10
    searchByField: async (field, value) => {
      // console.log(field + ": " + value);
      const schemafeild = getValueByField(field)

      // console.log(schemafeild.toLowerCase())
      // console.log(initialNodes)



      // exclude_customer_id: 938133


      
const queryPayload = {
  query: `query Check_column_value {
    check_column_value(
        column_name: "${schemafeild.toLowerCase()}"
        value: "${String(value)}"
        limit: ${transactionCount}
    ) {
        column_name
        value
        exists
        count
        other_customer_ids
    }
}`
}

    //   const queryPayload = {
    //     query: `query ($${field}: String!) {
    //   customers(
    //     where: {
    //       all: [
    //         { column: "${schemafeild}", op: EQ, value: $${field} }
    //       ]
    //     },

    //   ) {
    //     CustomerId
    //   }
    // }`,
    //     variables: {
    //       [field]: value
    //     }
    //   };

      // console.log(queryPayload);

      const response = await fetch(`${API_BASE_URL}/cust_graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(queryPayload)
      });

      const result = await response.json();
      // console.log(result)
      // console.log(result.data.check_column_value)

      const customers = result.data.check_column_value.other_customer_ids
// console.log(customers)

      return {
        customers
      };

    }
  };


  // All available fields from customer details API
  const allAvailableFields = [
    'CustomerId', 'FirstName', 'LastName', 'Email', 'Phone', 'Address',
    'MerchantAddress', 'Gender', 'Age', 'Registered', 'Orders', 'Spent',
    'Job', 'Hobbies', 'IsMarried', 'AccountHolding', 'LoanAccount',
    'CurrentBalanceBhd', 'IncomeBhd', 'GeoLocation', 'Vulnerability',
    'DeviceId', 'state'
  ];

  
  // Handle field selection change
  const handleFieldToggle = (field) => {
    setSelectedFields(prev => {
      if (prev.includes(field)) {
        return prev.filter(f => f !== field);
      } else {
        return [...prev, field];
      }
    });
  };

 
  // Apply field changes and refresh graph
  const applyFieldChanges = () => {
    // Reset initialization flag to allow re-initialization
    initializedRef.current = false;
    // Clear all nodes except the initial customer nodes
    const customerNodes = nodes.filter(n =>
      n.type === 'Customer' &&
      (n.id === 'customer-346577' || n.id === 'customer-575885')
    );
    // Reset their data but keep the customer details if already fetched
    const resetNodes = customerNodes.map(n => ({
      ...n,
      data: {
        customerDetails: n.data?.customerDetails,
        infoNodesVisible: false,
        transactionNodesVisible: false
      }
    }));
    // Keep only the initial link
    const initialLink = initialLinks[0];
    // Update state
    setNodes(resetNodes);
    setLinks([initialLink]);
    // Close the field selector
    setShowFieldSelector(false);
    // Trigger re-initialization with new fields
    setTimeout(() => {
      initializedRef.current = false;
    }, 100);
  };










const refreshTransactionNodes = () => {
  const customerNodes = nodes.filter(n => n.type === 'Customer' && !n.parentId);
  const updatedNodes = [...customerNodes];
  const updatedLinks = links.filter(l => {
    const sourceNode = nodes.find(n => n.id === (l.source.id || l.source));
    const targetNode = nodes.find(n => n.id === (l.target.id || l.target));
    return sourceNode?.type === 'Customer' && targetNode?.type === 'Customer';
  });

  customerNodes.forEach(customer => {
    const customerData = customer.data?.customerDetails;
    const transactionData = customer.data?.transactionDetails;
    // console.log(customer.data?.transactionDetails)
    // Re-add information nodes
    if (customerData && customer.data?.infoNodesVisible) {
      selectedFields.forEach(field => {
        if (customerData[field]) {
          const infoNode = {
            id: generateId(`info-${field}-${customer.id}`),
            type: 'Information',
            fieldName: field,
            fieldValue: customerData[field],
            label: field,
            parentId: customer.id,
            data: { fieldValue: customerData[field] }
          };
          updatedNodes.push(infoNode);
          updatedLinks.push({
            id: generateId('link'),
            source: customer.id,
            target: infoNode.id,
            type: 'Customer->Information'
          });
        }
      });
    }
    
    // Re-add transaction nodes with filters
    if (transactionData && customer.data?.transactionNodesVisible) {
      // Sent node
      const sentNode = {
        id: generateId(`transaction-sent-${customer.customerId}`),
        type: 'Transaction',
        transactionType: 'Sent',
        label: 'Sent',
        parentId: customer.id,
        data: { 
          transactionDetails: transactionData,
          fullSentCustomers: transactionData.SentCustomerID,  // Preserve full data
          count: transactionData.SentCount, 
          expanded: true 
        }
      };
      updatedNodes.push(sentNode);
      updatedLinks.push({
        id: generateId('link'),
        source: customer.id,
        target: sentNode.id,
        type: 'Customer->Transaction'
      });

      // Sent customers with filters - USE FULL DATA from transactionData
      if (transactionData.SentCustomerID && Array.isArray(transactionData.SentCustomerID)) {
        // Apply fraud filter on FULL data
        let filteredSent = transactionData.SentCustomerID;
        // if (appliedTransactionFilter.preset === 'fraud') {
        if (transactionPreset === 'fraud') {
          filteredSent = filteredSent.filter(item => 
            typeof item === 'object' ? item.fraud === -1 : false
          );
        }
        
        // Apply count limit
        const limitedSent = filteredSent.slice(0, transactionCount);
        
        limitedSent.forEach(item => {
          const custId = typeof item === 'object' ? item.to_customer_id : item;
          const isFraud = typeof item === 'object' ? item.fraud === -1 : false;
          
          const sentCustomer = {
            id: generateId(`customer-${custId}`),
            type: 'Customer',
            customerId: custId,
            label: `Customer ${custId}`,
            parentId: sentNode.id,
            data: { fraud: isFraud }
          };
          updatedNodes.push(sentCustomer);
          
          const linkStyleKey = isFraud ? 'TransactionSent->Customer-Fraud' : 'TransactionSent->Customer';
          updatedLinks.push({
            id: generateId('link'),
            source: sentNode.id,
            target: sentCustomer.id,
            type: linkStyleKey,
            styleKey: linkStyleKey,
            fraud: isFraud
          });
        });
        
        // console.log(`Refreshed Sent: ${limitedSent.length} of ${filteredSent.length} (Total: ${transactionData.SentCustomerID.length})`);
      }

      // Received node
      const receivedNode = {
        id: generateId(`transaction-received-${customer.customerId}`),
        type: 'Transaction',
        transactionType: 'Received',
        label: 'Received',
        parentId: customer.id,
        data: { 
          transactionDetails: transactionData,
          fullReceivedCustomers: transactionData.RecievedCustomerID,  // Preserve full data
          count: transactionData.ReceivedCount, 
          expanded: true 
        }
      };
      updatedNodes.push(receivedNode);
      updatedLinks.push({
        id: generateId('link'),
        source: customer.id,
        target: receivedNode.id,
        type: 'Customer->Transaction'
      });

      // Received customers with filters - USE FULL DATA from transactionData
      if (transactionData.RecievedCustomerID && Array.isArray(transactionData.RecievedCustomerID)) {
        // Apply fraud filter on FULL data
        let filteredReceived = transactionData.RecievedCustomerID;
        if (transactionPreset === 'fraud') {
          // if (appliedTransactionFilter.preset === 'fraud') {
          filteredReceived = filteredReceived.filter(item => 
            typeof item === 'object' ? item.fraud === -1 : false
          );
        }
        
        // Apply count limit
        const limitedReceived = filteredReceived.slice(0, transactionCount);
        
        limitedReceived.forEach(item => {
          const custId = typeof item === 'object' ? item.to_customer_id : item;
          const isFraud = typeof item === 'object' ? item.fraud === -1 : false;
          
          const receivedCustomer = {
            id: generateId(`customer-${custId}`),
            type: 'Customer',
            customerId: custId,
            label: `Customer ${custId}`,
            parentId: receivedNode.id,
            data: { fraud: isFraud }
          };
          updatedNodes.push(receivedCustomer);
          
          const linkStyleKey = isFraud ? 'Customer->TransactionReceived-Fraud' : 'Customer->TransactionReceived';
          updatedLinks.push({
            id: generateId('link'),
            source: receivedCustomer.id,
            target: receivedNode.id,
            type: linkStyleKey,
            styleKey: linkStyleKey,
            fraud: isFraud
          });
        });
        
        // console.log(`Refreshed Received: ${limitedReceived.length} of ${filteredReceived.length} (Total: ${transactionData.RecievedCustomerID.length})`);
      }
    }
  });

  updateGraph(updatedNodes, updatedLinks);
};

const LINK_STYLES = {
  'Customer->Customer (initial debit->beneficiary)': {
    arrow: true, color: '#ef4444', strokeWidth: 3, animated: true,
    markerId: 'arrow-red', strokeDasharray: '6,4',
    glow: { enabled: true, color: '#ff8a8a', radius: 6 },
    applyToConnectedNodes: { boldNodeStroke: true, nodeGlow: true }
  },
  'initial': {
    arrow: true, color: '#ef4444', strokeWidth: 3, animated: true,
    markerId: 'arrow-red', strokeDasharray: '6,4',
    glow: { enabled: true, color: '#ff8a8a', radius: 6 },
    applyToConnectedNodes: { boldNodeStroke: true, nodeGlow: true }
  },
  'Customer->Information': {
    arrow: false, color: '#9ca3af', strokeWidth: 1.5, animated: false,
    markerId: null, strokeDasharray: null, glow: { enabled: false },
    applyToConnectedNodes: { boldNodeStroke: false }
  },
  'Customer->Transaction': {
    arrow: false, color: '#9ca3af', strokeWidth: 1.5, animated: false,
    markerId: null, glow: { enabled: false }, applyToConnectedNodes: { boldNodeStroke: false }
  },
  'TransactionSent->Customer': {
    arrow: true, color: '#ef4444', strokeWidth: 3, animated: true,
    markerId: 'arrow-red', strokeDasharray: '8,4',
    glow: { enabled: true, color: '#ff8a8a', radius: 5 },
    applyToConnectedNodes: { boldNodeStroke: true, nodeGlow: true }
  },
  'TransactionSent->Customer-Fraud': {
    arrow: true, color: '#dc2626', strokeWidth: 4, animated: true,
    markerId: 'arrow-red', strokeDasharray: '4,2',
    glow: { enabled: true, color: '#fca5a5', radius: 8 },
    applyToConnectedNodes: { boldNodeStroke: true, nodeGlow: true }
  },
  'Customer->TransactionReceived': {
    arrow: true, color: '#16a34a', strokeWidth: 3, animated: true,
    markerId: 'arrow-green', strokeDasharray: '8,4',
    glow: { enabled: true, color: '#72f089', radius: 5 },
    applyToConnectedNodes: { boldNodeStroke: true, nodeGlow: true }
  },
  'Customer->TransactionReceived-Fraud': {
    arrow: true, color: '#dc2626', strokeWidth: 4, animated: true,
    markerId: 'arrow-red', strokeDasharray: '4,2',
    glow: { enabled: true, color: '#fca5a5', radius: 8 },
    applyToConnectedNodes: { boldNodeStroke: true, nodeGlow: true }
  }
};


  const applyColor = (baseStyle, link) => {
    // console.log(baseStyle, link)
    if (!baseStyle) return {};
    const color = link?.color;
    if (!color) return baseStyle;

    const markerId =
      color === '#16a34a' ? 'arrow-green'
        : color === '#ef4444' ? 'arrow-red'
          : baseStyle.markerId;

    return { ...baseStyle, color, markerId };
  };


  // Generate unique ID
  const generateId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const getLinkStyle = (link) => {
    // Guard against undefined link
    if (!link) return {};
    // console.log(initialNodes.score)
    // Safe logging
    // console.log(link?.color);

    // 1) Direct styleKey match
    if (link.styleKey && LINK_STYLES[link.styleKey]) {
      return applyColor(LINK_STYLES[link.styleKey], link);
    }

    // 2) Type match
    if (link.type && LINK_STYLES[link.type]) {
      return applyColor(LINK_STYLES[link.type], link);
    }

    // 3) Derive from source/target node types
    const sourceId = typeof link.source === 'object' ? link.source?.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target?.id : link.target;

    const sourceNode = nodes?.find?.(n => n.id === sourceId);
    const targetNode = nodes?.find?.(n => n.id === targetId);

    if (!sourceNode || !targetNode) {
      // Fallback style (still allow color override)
      return applyColor(LINK_STYLES['initial'], link);
    }

    if (sourceNode.type === 'Customer' && targetNode.type === 'Information') {
      // console.log(initialNodes.score)
      return applyColor(LINK_STYLES['Customer-&gt;Information'], link);
    }

    if (sourceNode.type === 'Customer' && targetNode.type === 'Transaction') {
      return applyColor(LINK_STYLES['Customer-&gt;Transaction'], link);
    }

    if (sourceNode.type === 'Transaction' && sourceNode.transactionType === 'Sent' && targetNode.type === 'Customer') {
      return applyColor(LINK_STYLES['TransactionSent-&gt;Customer'], link);
    }

    if (sourceNode.type === 'Customer' && targetNode.type === 'Transaction' && targetNode.transactionType === 'Received') {
      return applyColor(LINK_STYLES['Customer-&gt;TransactionReceived'], link);
    }

    // 4) Default for Customer -> Customer
    if (sourceNode.type === 'Customer' && targetNode.type === 'Customer') {
      return applyColor(LINK_STYLES['initial'], link);
    }

    // 5) Final fallback (still allow color override)
    return applyColor(LINK_STYLES['initial'], link);
  };

  // Update graph state and notify parent
  const updateGraph = useCallback((newNodes, newLinks) => {
    // console.log(newNodes)
    setNodes(newNodes);
    setLinks(newLinks);
    if (onGraphChange) {
      // console.log('updated')
      onGraphChange(newNodes, newLinks);
    }
  }, [onGraphChange]);

 
  // Handle customer details action - toggle visibility with recursive hide
  const handleCustomerDetails = async (node) => {
    try {
      const nodeIndex = nodes.findIndex(n => n.id === node.id);
      const updatedNodes = [...nodes];

      // Check if information nodes already exist and are visible
      const existingInfoNodes = nodes.filter(n => n.type === 'Information' && n.parentId === node.id);

      if (existingInfoNodes.length > 0 && node.data?.infoNodesVisible) {
        // Hide information nodes and all their descendants recursively
        const infoNodeIds = existingInfoNodes.map(n => n.id);
        const allDescendantIds = [];

        infoNodeIds.forEach(infoId => {
          allDescendantIds.push(infoId);
          const descendants = findAllDescendants(infoId, nodes);
          allDescendantIds.push(...descendants);
        });

        const filteredNodes = updatedNodes.filter(n => !allDescendantIds.includes(n.id));
        const filteredLinks = links.filter(l =>
          !allDescendantIds.includes(l.source.id || l.source) &&
          !allDescendantIds.includes(l.target.id || l.target)
        );

        const finalNodeIndex = filteredNodes.findIndex(n => n.id === node.id);
        if (finalNodeIndex !== -1) {
          filteredNodes[finalNodeIndex].data = {
            ...filteredNodes[finalNodeIndex].data,
            infoNodesVisible: false
          };
        }

        updateGraph(filteredNodes, filteredLinks);
      } else {
        // Check if data is already stored
        let customerData = node.data?.customerDetails;

        // if (!customerData) {
        //   // Fetch data from API only if not stored
        //   customerData = await mockAPI.customerDetails(node.customerId);
        //   updatedNodes[nodeIndex].data = {
        //     ...updatedNodes[nodeIndex].data,
        //     customerDetails: customerData
        //   };
        // }

        if (!customerData) {
          return null;
        }

        // Show/create information nodes
        if (existingInfoNodes.length > 0) {
          // Nodes exist but are hidden, just show them by re-adding
          const newLinks = [...links];
          existingInfoNodes.forEach(infoNode => {
            updatedNodes.push(infoNode);
            newLinks.push({
              id: generateId('link'),
              source: node.id,
              target: infoNode.id,
              type: 'Customer->Information'
            });
          });
          updatedNodes[nodeIndex].data = {
            ...updatedNodes[nodeIndex].data,
            infoNodesVisible: true
          };
          updateGraph(updatedNodes, newLinks);
        } else {
          // Create new information nodes
          const newLinks = [...links];
          // configurableFields.forEach(field => {
          selectedFields.forEach(field => {
            if (customerData[field]) {
              const infoNode = {
                id: generateId(`info-${field}-${node.id}`),
                type: 'Information',
                fieldName: field,
                fieldValue: customerData[field],
                label: field,
                parentId: node.id,
                data: { fieldValue: customerData[field] }
              };
              updatedNodes.push(infoNode);
              newLinks.push({
                id: generateId('link'),
                source: node.id,
                target: infoNode.id,
                type: 'Customer->Information'
              });
            }
          });
          updatedNodes[nodeIndex].data = {
            ...updatedNodes[nodeIndex].data,
            infoNodesVisible: true
          };
          updateGraph(updatedNodes, newLinks);
        }
      }
    } catch (error) {
      console.error('Error fetching customer details:', error);
      if (onNodeApiError) {
        onNodeApiError(node.id, error);
      }
    }
  };

  // Handle transaction details action - toggle visibility with recursive hide
  const handleTransactionDetails = async (node) => {
    const nodeIndex = nodes.findIndex(n => n.id === node.id);
    const updatedNodes = [...nodes];

    // Check if transaction nodes already exist
    const existingTxNodes = nodes.filter(n => n.type === 'Transaction' && n.parentId === node.id);

    if (existingTxNodes.length > 0 && node.data?.transactionNodesVisible) {
      // Hide transaction nodes and all their descendants recursively
      const txNodeIds = existingTxNodes.map(n => n.id);
      const allDescendantIds = [];

      txNodeIds.forEach(txId => {
        allDescendantIds.push(txId);
        const descendants = findAllDescendants(txId, nodes);
        allDescendantIds.push(...descendants);
      });

      const filteredNodes = updatedNodes.filter(n => !allDescendantIds.includes(n.id));
      const filteredLinks = links.filter(l =>
        !allDescendantIds.includes(l.source.id || l.source) &&
        !allDescendantIds.includes(l.target.id || l.target)
      );

      const finalNodeIndex = filteredNodes.findIndex(n => n.id === node.id);
      if (finalNodeIndex !== -1) {
        filteredNodes[finalNodeIndex].data = {
          ...filteredNodes[finalNodeIndex].data,
          transactionNodesVisible: false
        };
      }

      updateGraph(filteredNodes, filteredLinks);
    } else {
      // Check if data is already stored
      let transactionData = node.data?.transactionDetails;

 

      if (!transactionData){
        return null;
      };

      // Show/create transaction nodes
      if (existingTxNodes.length > 0) {
        // Nodes exist but are hidden, show them
        const newLinks = [...links];
        existingTxNodes.forEach(txNode => {
          updatedNodes.push(txNode);
          newLinks.push({
            id: generateId('link'),
            source: node.id,
            target: txNode.id,
            type: 'Customer->Transaction'
          });
        });
        updatedNodes[nodeIndex].data = {
          ...updatedNodes[nodeIndex].data,
          transactionNodesVisible: true
        };
        updateGraph(updatedNodes, newLinks);
      } else {
        // Create new transaction nodes
        const newLinks = [...links];

        // Create Sent transaction node
        const sentNode = {
          id: generateId(`transaction-sent-${node.customerId}`),
          type: 'Transaction',
          transactionType: 'Sent',
          label: 'Sent',
          parentId: node.id,
          data: { transactionDetails: transactionData, count: transactionData.SentCount }
        };
        updatedNodes.push(sentNode);
        newLinks.push({
          id: generateId('link'),
          source: node.id,
          target: sentNode.id,
          type: 'Customer->Transaction'
        });

        // Create Received transaction node
        const receivedNode = {
          id: generateId(`transaction-received-${node.customerId}`),
          type: 'Transaction',
          transactionType: 'Received',
          label: 'Received',
          parentId: node.id,
          data: { transactionDetails: transactionData, count: transactionData.ReceivedCount }
        };
        updatedNodes.push(receivedNode);
        newLinks.push({
          id: generateId('link'),
          source: node.id,
          target: receivedNode.id,
          type: 'Customer->Transaction'
        });

        updatedNodes[nodeIndex].data = {
          ...updatedNodes[nodeIndex].data,
          transactionNodesVisible: true
        };
        updateGraph(updatedNodes, newLinks);
      }
    }
  };

  // Recursively find all descendant nodes
  const findAllDescendants = (nodeId, currentNodes) => {
    const descendants = [];
    const directChildren = currentNodes.filter(n => n.parentId === nodeId);

    directChildren.forEach(child => {
      descendants.push(child.id);
      // Recursively find descendants of this child
      const childDescendants = findAllDescendants(child.id, currentNodes);
      descendants.push(...childDescendants);
    });

    return descendants;
  };

  // Handle hide details action - recursively hide all descendants
  const handleHideDetails = (node) => {
    // Find all descendant node IDs recursively
    const allDescendantIds = findAllDescendants(node.id, nodes);

    // Filter out all descendants
    const filteredNodes = nodes.filter(n => !allDescendantIds.includes(n.id));
    const filteredLinks = links.filter(l =>
      !allDescendantIds.includes(l.source.id || l.source) &&
      !allDescendantIds.includes(l.target.id || l.target)
    );

    // Update the node's visibility flags
    const nodeIndex = filteredNodes.findIndex(n => n.id === node.id);
    if (nodeIndex !== -1) {
      filteredNodes[nodeIndex].data = {
        ...filteredNodes[nodeIndex].data,
        infoNodesVisible: false,
        transactionNodesVisible: false
      };
    }

    updateGraph(filteredNodes, filteredLinks);
  };

const handleTransactionExpand = async (node) => {
  const data = node.data?.transactionDetails;
  if (!data) return;

  const existingCustomers = nodes.filter(n => n.type === 'Customer' && n.parentId === node.id);
  
  if (existingCustomers.length > 0) {
    // Collapse
    const customerIds = existingCustomers.map(n => n.id);
    const allDescendantIds = [];
    customerIds.forEach(custId => {
      allDescendantIds.push(custId);
      allDescendantIds.push(...findAllDescendants(custId, nodes));
    });
    
    const filteredNodes = nodes.filter(n => !allDescendantIds.includes(n.id));
    const filteredLinks = links.filter(l => 
      !allDescendantIds.includes(l.source.id || l.source) && 
      !allDescendantIds.includes(l.target.id || l.target)
    );
    
    const nodeIndex = filteredNodes.findIndex(n => n.id === node.id);
    if (nodeIndex !== -1) {
      filteredNodes[nodeIndex].data = { ...filteredNodes[nodeIndex].data, expanded: false };
    }
    
    updateGraph(filteredNodes, filteredLinks);
  } else {
    // Expand
    const updatedNodes = [...nodes];
    const newLinks = [...links];
    let customerList = node.transactionType === 'Sent' ? data.SentCustomerID : data.RecievedCustomerID;

    if (customerList && Array.isArray(customerList)) {
      // Filter by fraud preset
      if (appliedTransactionFilter.preset === 'fraud') {
        customerList = customerList.filter(item => {
          return typeof item === 'object' ? item.fraud === -1 : false;
        });
      }
      
      // Apply count limit
      const limitedCustomerIds = customerList.slice(0, appliedTransactionFilter.count);
      
      limitedCustomerIds.forEach(item => {
        // const customerId = typeof item === 'object' ? item.customerId : item;
        const customerId = typeof item === 'object' ? item.to_customer_id : item;
        const isFraud = typeof item === 'object' ? item.fraud === -1 : false;
        
        const customerNode = {
          id: generateId(`customer-${customerId}`), 
          type: 'Customer',
          customerId: customerId, 
          label: `Customer ${customerId}`, 
          parentId: node.id, 
          data: { fraud: isFraud }
        };
        updatedNodes.push(customerNode);
        
        if (node.transactionType === 'Sent') {
          const linkStyleKey = isFraud ? 'TransactionSent->Customer-Fraud' : 'TransactionSent->Customer';
          newLinks.push({
            id: generateId('link'), 
            source: node.id, 
            target: customerNode.id,
            type: linkStyleKey, 
            styleKey: linkStyleKey,
            fraud: isFraud
          });
        } else {
          const linkStyleKey = isFraud ? 'Customer->TransactionReceived-Fraud' : 'Customer->TransactionReceived';
          newLinks.push({
            id: generateId('link'), 
            source: customerNode.id, 
            target: node.id,
            type: linkStyleKey, 
            styleKey: linkStyleKey,
            fraud: isFraud
          });
        }
      });
      
      const nodeIndex = updatedNodes.findIndex(n => n.id === node.id);
      if (nodeIndex !== -1) {
        updatedNodes[nodeIndex].data = { ...updatedNodes[nodeIndex].data, expanded: true };
      }
      
      updateGraph(updatedNodes, newLinks);
      
      // console.log(`${node.transactionType}: Showing ${limitedCustomerIds.length} customers (Preset: ${appliedTransactionFilter.preset}, Fraud count: ${limitedCustomerIds.filter(i => typeof i === 'object' && i.fraud === -1).length})`);
    }
  }
};

  // Handle information fetch - with recursive hide
  const handleInformationFetch = async (node) => {
    // console.log(node)
    try {
      const result = await mockAPI.searchByField(node.fieldName, node.fieldValue);

      // console.log(nodes)
      // Check if customers already exist
      const existingCustomers = nodes.filter(n => n.type === 'Customer' && n.parentId === node.id);
      // console.log(existingCustomers)
      if (existingCustomers.length > 0) {
        // Remove customers and all their descendants recursively
        const customerIds = existingCustomers.map(n => n.id);
        const allDescendantIds = [];

        customerIds.forEach(custId => {
          allDescendantIds.push(custId);
          const descendants = findAllDescendants(custId, nodes);
          allDescendantIds.push(...descendants);
        });

        const filteredNodes = nodes.filter(n => !allDescendantIds.includes(n.id));
        const filteredLinks = links.filter(l =>
          !allDescendantIds.includes(l.source.id || l.source) &&
          !allDescendantIds.includes(l.target.id || l.target)
        );
        updateGraph(filteredNodes, filteredLinks);
      } else {
        // Create customer nodes
        const updatedNodes = [...nodes];
        const newLinks = [...links];
        // console.log(result)
        if (result.customers && Array.isArray(result.customers)) {
          result.customers.forEach(customer => {
            // console.log(customer.CustomerId);
            const customerNode = {
              id: generateId(`customer-${customer}`),
              type: 'Customer',
              customerId: customer,
              label: `Customer ${customer}`,
              parentId: node.id,
              data: {}
            };
            // const customerNode = {
            //   id: generateId(`customer-${customer.CustomerId}`),
            //   type: 'Customer',
            //   customerId: customer.CustomerId,
            //   label: `Customer ${customer.CustomerId}`,
            //   parentId: node.id,
            //   data: {}
            // };
            updatedNodes.push(customerNode);
            newLinks.push({
              id: generateId('link'),
              source: node.id,
              target: customerNode.id,
              type: 'Information->Customer'
            });
          });
          updateGraph(updatedNodes, newLinks);
        }
      }
    } catch (error) {
      console.error('Error fetching information:', error);
      if (onNodeApiError) {
        onNodeApiError(node.id, error);
      }
    }
  };


  const initializeGraph = async () => {
    initializedRef.current = true;
    const initialCustomers = initialNodes.filter(n => n.type === 'Customer');
    const updatedNodes = [...initialNodes];
    const updatedLinks = [...initialLinks];

    for (const customer of initialCustomers) {
      if (!customer.customerId || customer.customerId === 'N/A') {
        console.warn('Skipping invalid customer node', customer);
        continue;
      }
      try {
        const nodeIndex = updatedNodes.findIndex(n => n.id === customer.id);
    
        const customerData = await mockAPI.customerDetails(customer.customerId);
        if (nodeIndex !== -1) {
          updatedNodes[nodeIndex].data = { 
            ...updatedNodes[nodeIndex].data, 
            customerDetails: customerData, 
            infoNodesVisible: true 
          };
        }

        if (!customerData) {
          console.warn(`Customer data missing for ${customer.customerId}`);
          continue; // skip this customer safely
        }

        selectedFields.forEach(field => {
          if (customerData?.[field] != null) {
            
            const infoNode = {
              id: generateId(`info-${field}-${customer.id}`), 
              type: 'Information',
              fieldName: field, 
              fieldValue: customerData[field], 
              label: field,
              parentId: customer.id, 
              data: { fieldValue: customerData[field] }
            };
            updatedNodes.push(infoNode);
            updatedLinks.push({
              id: generateId('link'), 
              source: customer.id, 
              target: infoNode.id, 
              type: 'Customer->Information'
            });
          }
        });

        const transactionData = await mockAPI.transactionDetails(customer.customerId);
        // console.log(transactionData)
        // IMPORTANT: Store COMPLETE transaction data in node
        updatedNodes[nodeIndex].data = {
          ...updatedNodes[nodeIndex].data, 
          transactionDetails: transactionData,  // Store full data here
          transactionNodesVisible: true
        };

        // Create Sent transaction node and store FULL data
        const sentNode = {
          id: generateId(`transaction-sent-${customer.customerId}`), 
          type: 'Transaction',
          transactionType: 'Sent', 
          label: 'Sent', 
          parentId: customer.id,
          data: { 
            transactionDetails: transactionData,  // Full data stored here
            fullSentCustomers: transactionData.SentCustomerID,  // KEEP ORIGINAL FULL DATA
            count: transactionData.SentCount,
            expanded: true
          }
        };
        updatedNodes.push(sentNode);
        updatedLinks.push({ 
          id: generateId('link'), 
          source: customer.id, 
          target: sentNode.id, 
          type: 'Customer->Transaction' 
        });

        // AUTO-EXPAND: Create customer nodes from Sent transactions
        if (transactionData.SentCustomerID && Array.isArray(transactionData.SentCustomerID)) {
          let filteredSentCustomers = transactionData.SentCustomerID;
          if (appliedTransactionFilter.preset === 'fraud') {
            filteredSentCustomers = filteredSentCustomers.filter(item => item.fraud === -1);
          }
          
          const limitedSentCustomers = filteredSentCustomers.slice(0, transactionCount);
          // console.log(limitedSentCustomers)
          limitedSentCustomers.forEach(item => {
            const customerId = typeof item === 'object' ? item.to_customer_id : item;
            const isFraud = typeof item === 'object' ? item.fraud === -1 : false;
            
            const sentCustomerNode = {
              id: generateId(`customer-${customerId}`),
              type: 'Customer',
              customerId: customerId,
              label: `Customer ${customerId}`,
              parentId: sentNode.id,
              data: { fraud: isFraud }
            };
            updatedNodes.push(sentCustomerNode);
            
            const linkStyleKey = isFraud ? 'TransactionSent->Customer-Fraud' : 'TransactionSent->Customer';
            updatedLinks.push({
              id: generateId('link'),
              source: sentNode.id,
              target: sentCustomerNode.id,
              type: linkStyleKey,
              styleKey: linkStyleKey,
              fraud: isFraud
            });
          });
          
          // console.log(`Sent Transactions: Showing ${limitedSentCustomers.length} of ${filteredSentCustomers.length} (Preset: ${appliedTransactionFilter.preset})`);
        }

        // Create Received transaction node and store FULL data
        const receivedNode = {
          id: generateId(`transaction-received-${customer.customerId}`), 
          type: 'Transaction',
          transactionType: 'Received', 
          label: 'Received', 
          parentId: customer.id,
          data: { 
            transactionDetails: transactionData,  // Full data stored here
            fullReceivedCustomers: transactionData.RecievedCustomerID,  // KEEP ORIGINAL FULL DATA
            count: transactionData.ReceivedCount,
            expanded: true
          }
        };
        updatedNodes.push(receivedNode);
        updatedLinks.push({ 
          id: generateId('link'), 
          source: customer.id, 
          target: receivedNode.id, 
          type: 'Customer->Transaction' 
        });

        // AUTO-EXPAND: Create customer nodes from Received transactions
        if (transactionData.RecievedCustomerID && Array.isArray(transactionData.RecievedCustomerID)) {
          let filteredReceivedCustomers = transactionData.RecievedCustomerID;
          if (appliedTransactionFilter.preset === 'fraud') {
            filteredReceivedCustomers = filteredReceivedCustomers.filter(item => item.fraud === -1);
          }
          
          const limitedReceivedCustomers = filteredReceivedCustomers.slice(0, transactionCount);
          // console.log(limitedReceivedCustomers)
          limitedReceivedCustomers.forEach(item => {
            const customerId = typeof item === 'object' ? item.to_customer_id : item;
            const isFraud = typeof item === 'object' ? item.fraud === -1 : false;
            // console.log(customerId)
            const receivedCustomerNode = {
              id: generateId(`customer-${customerId}`),
              type: 'Customer',
              customerId: customerId,
              label: `Customer ${customerId}`,
              parentId: receivedNode.id,
              data: { fraud: isFraud }
            };
            updatedNodes.push(receivedCustomerNode);
            
            const linkStyleKey = isFraud ? 'Customer->TransactionReceived-Fraud' : 'Customer->TransactionReceived';
            updatedLinks.push({
              id: generateId('link'),
              source: receivedCustomerNode.id,
              target: receivedNode.id,
              type: linkStyleKey,
              styleKey: linkStyleKey,
              fraud: isFraud
            });
          });
          
          // console.log(`Received Transactions: Showing ${limitedReceivedCustomers.length} of ${filteredReceivedCustomers.length} (Preset: ${appliedTransactionFilter.preset})`);
        }

      } catch (error) {
        console.error(`Error initializing customer ${customer.customerId}:`, error);
        if (onNodeApiError) onNodeApiError(customer.id, error);
      }
    }
    updateGraph(updatedNodes, updatedLinks);
  };

   // Initialize with API calls on mount - fetch data and show nodes immediately
//   useEffect(() => {
//     if (initialNodes.length > 2) return;
// // initializeGraph()

//     if (initialNodes.length > 0 && !initializedRef.current) {
//       initializeGraph();
//     }
//     // }, []);
//   }, [selectedFields, appliedTransactionFilter.count, appliedTransactionFilter.preset]);

useEffect(() => {
  if (!initializedRef.current && initialNodes.length > 0) {
    initializedRef.current = true;
    initializeGraph();
  }
}, [initialNodes]);


  
  // Render nodes with D3
  useEffect(() => {
    if (nodes.length === 2){
      initializeGraph()
    };




    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Clear existing content
    svg.selectAll('*').remove();

    // Create defs for markers and filters
    const defs = svg.append('defs');

    // Arrow markers
    ['red', 'green', 'neutral'].forEach(color => {
      const colorMap = { red: '#ef4444', green: '#16a34a', neutral: '#9ca3af' };
      defs.append('marker')
        .attr('id', `arrow-${color}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', colorMap[color]);
    });

    // Glow filters
    const glowFilter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');

    glowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'coloredBlur');

    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Create container group
    const container = svg.append('g');

    // Create simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-500).distanceMin(50).distanceMax(800))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => {
        if (d.type === 'Customer') return 50;
        if (d.type === 'Transaction') return 40;
        return 30;
      }));

    simulationRef.current = simulation;

    // Apply position hints
    nodes.forEach(node => {
      if (node.xHint === 'left') node.x = width * 0.3;
      if (node.xHint === 'right') node.x = width * 0.7;
    });
    // console.log(nodes)
    // Create links
    const link = container.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => {
        // console.log(d)
        const style = getLinkStyle(d);
        return style.color || '#9ca3af';
      })
      .attr('stroke-width', d => {
        const style = getLinkStyle(d);
        return style.strokeWidth || 1.5;
      })
      .attr('stroke-dasharray', d => {
        const style = getLinkStyle(d);
        return style.strokeDasharray || null;
      })
      .attr('marker-end', d => {
        const style = getLinkStyle(d);
        return style.markerId ? `url(#${style.markerId})` : null;
      })
      .attr('filter', d => getLinkStyle(d).glow?.enabled ? 'url(#glow)' : null)
      // .attr('filter', d => {
      //   const style = getLinkStyle(d);
      //   return style.glow?.enabled ? 'url(#glow)' : null;
      //   // });
      // }
      // )
      .style('cursor', 'pointer')
      .on('mouseenter', (event, d) => {
        // Show tooltip for initial link
        if (d.type === 'initial' || d.styleKey === 'Customer->Customer (initial debit->beneficiary)') {
          const sourceNode = nodes.find(n => n.id === (d.source.id || d.source));
          const targetNode = nodes.find(n => n.id === (d.target.id || d.target));
          const linkValue = linkValues.find(lv => lv.linkId === d.id);


          // <div class="font-semibold mb-1">Transaction Details</div>
          // <div>From: Customer ${sourceNode.customerId} (${sourceNode.label})</div>
          // <div>To: Customer ${targetNode.customerId} (${targetNode.label})</div>

          if (sourceNode && targetNode) {
            let content = `
              Transaction Details                           
              From: Customer ${sourceNode.customerId} (${sourceNode.label})
              To: Customer ${targetNode.customerId} (${targetNode.label})
            `;


            // <div class="mt-2 pt-2 border-t border-gray-600">
            //       <div>Amount: ${linkValue.currency} ${linkValue.amount.toLocaleString()}</div>
            //       <div>Date: ${linkValue.date}</div>
            //     </div>

            if (linkValue) {
              content += `
                
                  Amount: ${linkValue.currency} ${linkValue.amount.toLocaleString()}
                  Date: ${linkValue.date}
                
              `;
            }

            // <div class="mt-1 text-xs text-gray-300">Initial Debit-Beneficiary Connection</div>

            // content += `Initial Debit-Beneficiary Connection`;

            setTooltip({
              visible: true,
              content,
              x: event.pageX + 10,
              y: event.pageY + 10,
              isHtml: true
            });
          }
        }
      })
      .on('mouseleave', () => {
        setTooltip({ visible: false, content: '', x: 0, y: 0, isHtml: false });
      });

    // Animate dashed links
    if (links.some(l => getLinkStyle(l).animated)) {
      let dashOffset = 0;
      d3.timer(() => {
        dashOffset -= 1.5;
        link.filter(d => getLinkStyle(d).animated)
          .attr('stroke-dashoffset', dashOffset);
      });
    }

    // Create node groups
    const node = container.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Render Customer nodes
    const customerNodes = node.filter(d => d.type === 'Customer');

    // Add animated gradient definitions for customer nodes
    const customerGradient = defs.append('radialGradient')
      .attr('id', 'customer-gradient')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%');

    customerGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#dbeafe')
      .append('animate')
      .attr('attributeName', 'stop-color')
      .attr('values', '#dbeafe;#bfdbfe;#93c5fd;#bfdbfe;#dbeafe')
      .attr('dur', '4s')
      .attr('repeatCount', 'indefinite');

    customerGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#3b82f6')
      .append('animate')
      .attr('attributeName', 'stop-color')
      .attr('values', '#3b82f6;#2563eb;#1d4ed8;#2563eb;#3b82f6')
      .attr('dur', '4s')
      .attr('repeatCount', 'indefinite');

    customerNodes.append('circle')
      .attr('r', 40)
      .attr('fill', 'url(#customer-gradient)')
      .attr('stroke', '#1e40af')
      .attr('stroke-width', d => {
        const connectedLinks = links.filter(l =>
          (l.source.id || l.source) === d.id || (l.target.id || l.target) === d.id
        );
        const hasBoldLink = connectedLinks.some(l => {
          const style = getLinkStyle(l);


          return style.applyToConnectedNodes?.boldNodeStroke;
        });
        return hasBoldLink ? 3 : 2;
      })
      .attr('filter', d => {
        const connectedLinks = links.filter(l =>
          (l.source.id || l.source) === d.id || (l.target.id || l.target) === d.id
        );
        const hasGlow = connectedLinks.some(l => {
          const style = getLinkStyle(l);
          return style.applyToConnectedNodes?.nodeGlow;
        });
        return hasGlow ? 'url(#glow)' : null;
      });

    // Center icon
    customerNodes.append('foreignObject')
      // .attr('width', 20)
      // .attr('height', 20)
      .attr('width', 24)
      .attr('height', 24)
      .attr('x', -12)
      .attr('y', -12)
      .html('<i class="fas fa-user" style="font-size: 24px; color: #1e3a8a;"></i>')
      .attr('pointer-events', 'none');

    // Create 3 pie slice buttons around the customer node
    const sliceRadius = 40;
    const sliceWidth = 14;
    const actions = [
      { startAngle: -150, endAngle: -30, icon: ICONS_MAP.FirstName, action: 'userDetails', color: '#10b981' },
      { startAngle: -30, endAngle: 90, icon: ICONS_MAP.Transactions, action: 'transactionDetails', color: '#f59e0b' },
      { startAngle: 90, endAngle: 210, icon: ICONS_MAP.Hide, action: 'hideDetails', color: '#ef4444' }
    ];

    actions.forEach(({ startAngle, endAngle, icon, action, color }) => {
      const arc = d3.arc()
        .innerRadius(sliceRadius)
        .outerRadius(sliceRadius + sliceWidth)
        .startAngle((startAngle * Math.PI) / 180)
        .endAngle((endAngle * Math.PI) / 180);

      const sliceGroup = customerNodes.append('g')
        .attr('class', 'slice-button')
        .style('cursor', 'pointer')
        .on('click', (event, d) => {
          event.stopPropagation();
          if (action === 'userDetails') handleCustomerDetails(d);
          else if (action === 'transactionDetails') handleTransactionDetails(d);
          else if (action === 'hideDetails') handleHideDetails(d);
        })
        .on('mouseenter', function () {
          d3.select(this).select('path')
            .transition()
            .duration(200)
            .attr('d', d3.arc()
              .innerRadius(sliceRadius)
              .outerRadius(sliceRadius + sliceWidth + 4)
              .startAngle((startAngle * Math.PI) / 180)
              .endAngle((endAngle * Math.PI) / 180));
        })
        .on('mouseleave', function () {
          d3.select(this).select('path')
            .transition()
            .duration(200)
            .attr('d', arc);
        });

      sliceGroup.append('path')
        .attr('d', arc)
        .attr('fill', color)
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);

      // Position icon in the middle of the arc
      const midAngle = ((startAngle + endAngle) / 2 * Math.PI) / 180;
      const iconDistance = sliceRadius + sliceWidth / 2;
      const iconX = Math.cos(midAngle) * iconDistance;
      const iconY = Math.sin(midAngle) * iconDistance;

      sliceGroup.append('foreignObject')
        .attr('width', 16)
        .attr('height', 16)
        .attr('x', iconX - 8)
        .attr('y', iconY - 8)
        .html(`<i class="fas ${icon}" style="font-size: 14px; color: white;"></i>`)
        .style('pointer-events', 'none');
    });

    // Customer label
    customerNodes.append('text')
      .attr('y', 70)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', '#1e40af')
      .text(d => d.customerId || d.label);

    // Render Transaction nodes
    const transactionNodes = node.filter(d => d.type === 'Transaction');

    // Add animated gradient for transaction nodes
    const transactionGradient = defs.append('radialGradient')
      .attr('id', 'transaction-gradient')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%');

    transactionGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#fef3c7')
      .append('animate')
      .attr('attributeName', 'stop-color')
      .attr('values', '#fef3c7;#fde68a;#fcd34d;#fde68a;#fef3c7')
      .attr('dur', '3s')
      .attr('repeatCount', 'indefinite');

    transactionGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#f59e0b')
      .append('animate')
      .attr('attributeName', 'stop-color')
      .attr('values', '#f59e0b;#d97706;#b45309;#d97706;#f59e0b')
      .attr('dur', '3s')
      .attr('repeatCount', 'indefinite');

    transactionNodes.append('circle')
      .attr('r', 30)
      .attr('fill', 'url(#transaction-gradient)')
      .attr('stroke', '#92400e')
      .attr('stroke-width', 2);

    // Vertical divider line
    transactionNodes.append('line')
      .attr('x1', 0)
      .attr('y1', -30)
      .attr('x2', 0)
      .attr('y2', 30)
      .attr('stroke', '#92400e')
      .attr('stroke-width', 2);

    // Left side (Expand icon)
    transactionNodes.append('foreignObject')
      .attr('width', 16)
      .attr('height', 16)
      .attr('x', -22)
      .attr('y', -8)
      .html('<i class="fas fa-expand" style="font-size: 14px; color: #78350f;"></i>')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        handleTransactionExpand(d);
      });

    // Right side (Hide icon)
    transactionNodes.append('foreignObject')
      .attr('width', 16)
      .attr('height', 16)
      .attr('x', 6)
      .attr('y', -8)
      .html('<i class="fas fa-eye-slash" style="font-size: 14px; color: #78350f;"></i>')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        handleTransactionExpand(d);
      });

    // Transaction label
    transactionNodes.append('text')
      .attr('y', 48)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .attr('fill', '#92400e')
      .text(d => `${d.transactionType} (${d.data?.count || 0})`);

    // Render Information nodes
    const infoNodes = node.filter(d => d.type === 'Information');

    // Add animated gradient for information nodes
    const infoGradient = defs.append('radialGradient')
      .attr('id', 'info-gradient')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%');

    infoGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#d1fae5')
      .append('animate')
      .attr('attributeName', 'stop-color')
      .attr('values', '#d1fae5;#a7f3d0;#6ee7b7;#a7f3d0;#d1fae5')
      .attr('dur', '3.5s')
      .attr('repeatCount', 'indefinite');

    infoGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#10b981')
      .append('animate')
      .attr('attributeName', 'stop-color')
      .attr('values', '#10b981;#059669;#047857;#059669;#10b981')
      .attr('dur', '3.5s')
      .attr('repeatCount', 'indefinite');

    infoNodes.append('circle')
      .attr('r', 20)
      .attr('fill', 'url(#info-gradient)')
      .attr('stroke', '#065f46')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        handleInformationFetch(d);
      });

    // Center field icon only (no hide icon)
    infoNodes.append('foreignObject')
      .attr('width', 16)
      .attr('height', 16)
      .attr('x', -8)
      .attr('y', -8)
      .html(d => `<i class="fas ${ICONS_MAP[d.fieldName] || 'fa-info'}" style="font-size: 16px; color: #ffffff;"></i>`)
      .style('pointer-events', 'none');
// 064e3b
    // Information label
    infoNodes.append('text')
      .attr('y', 35)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('fill', '#065f46')
      .text(d => String(d.fieldValue || '').substring(0, 15));

    // Tooltips
    node.on('mouseenter', (event, d) => {
      let content = '';
      if (d.type === 'Customer' && d.data?.customerDetails) {
        // content = configurableFields
        content = selectedFields
          .filter(f => d.data.customerDetails[f])
          .map(f => d.data.customerDetails[f])
          .join(', ');
      } else if (d.type === 'Transaction' && d.data) {
        content = `Count: ${d.data.count || 0}`;
      } else if (d.type === 'Information') {
        content = String(d.fieldValue || '');
      }

      if (content) {
        setTooltip({
          visible: true,
          content,
          x: event.pageX + 10,
          // y: event.pageY + 10
          y: event.pageY + 10,
          isHtml: false
        });
      }
    }).on('mouseleave', () => {
      // setTooltip({ visible: false, content: '', x: 0, y: 0 });
      setTooltip({ visible: false, content: '', x: 0, y: 0, isHtml: false });
    });

    // Update positions
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Zoom and pan
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Drag functions
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
    // }, [nodes, links, configurableFields]);
  }, [nodes, links, selectedFields, linkValues]);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-screen bg-gray-50">
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css"
      />

      {/* <div className="absolute top-4 right-4 z-10"> */}

<div className="absolute top-4 right-4 z-10 flex gap-2">
  <button
    onClick={() => setShowTransactionFilter(!showTransactionFilter)}
    className="px-4 py-2 bg-white border border-gray-300 rounded shadow hover:bg-gray-100 transition"
  >
    <i className="fas fa-filter mr-2" ></i>
    Transaction Filter
    {(appliedTransactionFilter.preset !== 'all' || appliedTransactionFilter.count !== 20) && (
      <span className="ml-2 px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full">
        Active
      </span>
    )}
  </button>
  
  <button
    onClick={() => setShowDateFilter(!showDateFilter)}
    className="px-4 py-2 bg-white border border-gray-300 rounded shadow hover:bg-gray-100 transition"
  >
    <i className="fas fa-calendar-alt mr-2"></i>
    Date Filter
    {appliedDateRange.preset !== 'last6months' && (
      <span className="ml-2 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
        Active
      </span>
    )}
  </button>
  
  <button
    onClick={() => setShowFieldSelector(!showFieldSelector)}
    className="px-4 py-2 bg-white border border-gray-300 rounded shadow hover:bg-gray-100 transition"
  >
    <i className="fas fa-cog mr-2"></i>
    Configure Fields
  </button>
  
  <button
    onClick={toggleFullscreen}
    className="px-4 py-2 bg-white border border-gray-300 rounded shadow hover:bg-gray-100 transition"
  >
    <i className={`fas fa-${isFullscreen ? 'compress' : 'expand'}`}></i>
  </button>
</div>

{/* 

<div className="absolute top-4 right-4 z-10 flex gap-2">
  <button
    onClick={() => setShowDateFilter(!showDateFilter)}
    className="px-4 py-2 bg-white border border-gray-300 rounded shadow hover:bg-gray-100 transition"
  >
    <i className="fas fa-calendar-alt mr-2"></i>
    Date Filter
    {appliedDateRange.preset !== 'last6months' && (
      <span className="ml-2 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
        Active
      </span>
    )}
  </button>
  
  <button
    onClick={() => setShowFieldSelector(!showFieldSelector)}
    className="px-4 py-2 bg-white border border-gray-300 rounded shadow hover:bg-gray-100 transition"
  >
    <i className="fas fa-cog mr-2"></i>
    Configure Fields
  </button>
  
  <button
    onClick={toggleFullscreen}
    className="px-4 py-2 bg-white border border-gray-300 rounded shadow hover:bg-gray-100 transition"
  >
    <i className={`fas fa-${isFullscreen ? 'compress' : 'expand'}`}></i>
  </button>
</div> */}





      {/* <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={() => setShowFieldSelector(!showFieldSelector)}
          className="px-4 py-2 bg-white border border-gray-300 rounded shadow hover:bg-gray-100 transition"
          aria-label="Configure fields"
        >
          <i className="fas fa-cog mr-2"></i>
          Configure Fields
        </button>
        <button
          onClick={toggleFullscreen}
          className="px-4 py-2 bg-white border border-gray-300 rounded shadow hover:bg-gray-100 transition"
          aria-label="Toggle fullscreen"
        >
          <i className={`fas fa-${isFullscreen ? 'compress' : 'expand'}`}></i>
        </button>
      </div> */}



      {showTransactionFilter && (
  <div className="absolute top-20 right-40 z-30 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-96">
    <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
      <i className="fas fa-filter mr-2 text-purple-600" style={{ color: '#0D1B2A' }}></i>
      Transaction Filter
    </h3>
    
    {/* Preset Filter */}
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Presets
      </label>
      <div className="flex gap-2">
        {/* <button
          onClick={() => setTransactionPreset('all')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
            transactionPreset === 'all'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        > */}
        
<button
  onClick={() => setTransactionPreset('all')}
  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
    transactionPreset === 'all'
      ? 'text-white shadow-md'
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  }`}
  style={transactionPreset === 'all' ? { backgroundColor: '#0D1B2A' } : {}}
>

          <i className="fas fa-list mr-2" ></i>
          All
        </button>
        <button
          onClick={() => setTransactionPreset('fraud')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
            transactionPreset === 'fraud'
              ? 'bg-red-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <i className="fas fa-exclamation-triangle mr-2"></i>
          Fraud
        </button>
      </div>
    </div>
    
    {/* Transaction Count */}
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Transaction Count
      </label>
      <div className="flex items-center gap-2">
        <button
          onClick={decrementTransactionCount}
          disabled={transactionCount === 10}
          className="p-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <i className="fas fa-minus text-gray-600"></i>
        </button>
        
        <div className="flex-1 relative">
          <select
            value={transactionCount}
            onChange={(e) => setTransactionCount(parseInt(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 appearance-none bg-white cursor-pointer"
          >
            {transactionCountOptions.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <i className="fas fa-chevron-down text-gray-400 text-xs"></i>
          </div>
        </div>
        
        <button
          onClick={incrementTransactionCount}
          disabled={transactionCount === 100}
          className="p-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <i className="fas fa-plus text-gray-600"></i>
        </button>
      </div>
      
      {/* Manual input option */}
      <div className="mt-2">
        <input
          type="number"
          min="10"
          max="100"
          value={transactionCount}
          onChange={handleTransactionCountChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          placeholder="Enter count (10-100)"
        />
      </div>
    </div>
    
    {/* Action Buttons */}
    <div className="flex gap-2 pt-3 border-t">
      <button
        onClick={applyTransactionFilter}
        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium text-sm shadow-md" style={{ backgroundColor: '#0D1B2A' }}
      >
        <i className="fas fa-check mr-2"></i>
        Apply
      </button>
      <button
        onClick={resetTransactionFilter}
        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm"
      >
        <i className="fas fa-undo mr-2"></i>
        Reset
      </button>
    </div>
    
    {/* Current Status */}
    <div className="mt-3 p-2 bg-purple-50 rounded text-xs text-purple-800" style={{ color: '#0D1B2A' }}>
      <i className="fas fa-info-circle mr-1" style={{ color: '#0D1B2A' }}></i>
      Current: <strong>{appliedTransactionFilter.preset === 'all' ? 'All' : 'Fraud'}</strong> | 
      Count: <strong>{appliedTransactionFilter.count}</strong>
    </div>
  </div>
)}



{showDateFilter && (
  <div className="absolute top-20 right-12 z-20 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-80">
    <h3 className="text-lg font-semibold mb-3 text-gray-800 flex items-center">
      <i className="fas fa-calendar-alt mr-2 text-blue-600" style={{ color: '#0D1B2A' }}></i>
      Date Filter
    </h3>
    
    <div className="space-y-3 mb-4">
      {datePresets.map(preset => (
        <label key={preset.value} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
          <input
            type="radio"
            name="datePreset"
            value={preset.value}
            checked={datePreset === preset.value}
            onChange={(e) => setDatePreset(e.target.value)}
            className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">{preset.label}</span>
          {preset.value === 'last6months' && (
            <span className="ml-auto text-xs text-gray-500">(Default)</span>
          )}
        </label>
      ))}
      
      {datePreset === 'custom' && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      )}
    </div>
    
    <div className="flex gap-2 pt-3 border-t">
      <button
        onClick={applyDateFilter}
        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-medium text-sm" style={{ backgroundColor: '#0D1B2A' }}
      >
        <i className="fas fa-check mr-2"></i>
        Apply
      </button>
      <button
        onClick={resetDateFilter}
        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition text-sm"
      >
        <i className="fas fa-undo mr-2"></i>
        Reset
      </button>
    </div>
    
    <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-800" style={{ color: '#0D1B2A' }}>
      <i className="fas fa-info-circle mr-1" style={{ color: '#0D1B2A' }}></i>
      Current: <strong>{datePresets.find(p => p.value === appliedDateRange.preset)?.label || 'Last 6 Months'}</strong>
    </div>
  </div>
)}

      {showFieldSelector && (
        <div className="absolute top-20 right-4 z-20 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-md max-h-96 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">Select Customer Detail Fields</h3>
          <div className="space-y-2 mb-4">
            {allAvailableFields.map(field => (
              <label key={field} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                <input
                  type="checkbox"
                  checked={selectedFields.includes(field)}
                  onChange={() => handleFieldToggle(field)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{field}</span>
                <i className={`fas ${ICONS_MAP[field] || 'fa-info'} text-gray-400 ml-auto`}></i>
              </label>
            ))}
          </div>
          <div className="flex gap-2 pt-3 border-t">
            <button
              onClick={applyFieldChanges}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-medium" style={{ backgroundColor: '#0D1B2A' }}
            >
              Apply & Refresh
            </button>
            <button
              onClick={() => setShowFieldSelector(false)}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ cursor: 'grab' }}
      />

      {tooltip.visible && (
        <div
          className="absolute bg-black text-white px-3 py-2 rounded text-sm pointer-events-none max-w-xs"
          style={{ left: tooltip.x, top: tooltip.y, zIndex: 1000 }}
        >
          {tooltip.content}
          {tooltip.isHtml ? (
            <div dangerouslySetInnerHTML={{ __html: tooltip.content }} />
          ) : (
            tooltip.content
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerLinkAnalysis;