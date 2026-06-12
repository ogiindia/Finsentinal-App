import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import {
 Settings, Check, X, Maximize2, Minimize2,
 Zap, Database, Link
} from 'lucide-react';
// Icon emoji mappings
const iconEmojis = {
 CustomerId: '🆔',
 FirstName: '👤',
 LastName: '👥',
 Email: '✉️',
 Phone: '📱',
 DeviceId: '📟',
 Address: '🏠',
 MerchantAddress: '🏢',
 Gender: '⚧',
 Age: '🎂',
 Registered: '📅',
 Orders: '🛒',
 Spent: '💰',
 Job: '💼',
 Hobbies: '🎨',
 IsMarried: '💍',
 AccountHolding: '🏦',
 LoanAccount: '💳',
 CurrentBalanceBhd: '💵',
 IncomeBhd: '📈',
 GeoLocation: '📍',
 Vulnerability: '⚠️',
 state: '✅',
 'TRAN COUNT 10MIN': '⏱️',
 'TRAN COUNT 1D': '📊',
 'TRAN COUNT 30D': '📈',
 'TRAN COUNT 90D': '📉',
 'TRAN COUNT 180D': '📊',
 'TRAN AMOUNT 10MIN': '💸',
 'TRAN AMOUNT 1D': '💰',
 'TRAN AMOUNT 30D': '💵',
 'TRAN AMOUNT 90D': '💴',
 'TRAN AMOUNT 180D': '💶',
 'TRAN ABOVE300': '⚡',
 DEBITAMOUNT: '💳',
 TIMESTAMP: '🕐'
};
// Mock initial payload
const initialPayload = {
 DEBITACCOUNTNUMBER: "ACC123456",
 BENEFICIARYACCOUNTNUMBER: "ACC789012",
 'TRAN COUNT 10MIN': 5,
 'TRAN COUNT 1D': 23,
 'TRAN COUNT 30D': 156,
 'TRAN COUNT 90D': 478,
 'TRAN COUNT 180D': 892,
 'TRAN AMOUNT 10MIN': 250.50,
 'TRAN AMOUNT 1D': 1250.75,
 'TRAN AMOUNT 30D': 15680.90,
 'TRAN AMOUNT 90D': 48750.25,
 'TRAN AMOUNT 180D': 98540.60,
 'TRAN ABOVE300': 12,
 DEBITAMOUNT: 5000.00,
 TIMESTAMP: new Date().toISOString()
};
const LinkAnalysisGraph = () => {
 const svgRef = useRef(null);
 const [isFullscreen, setIsFullscreen] = useState(false);
 const [customerData, setCustomerData] = useState({ debit: null, beneficiary: null });
 const [activeView, setActiveView] = useState({ debit: 'customer', beneficiary: 'customer' });
 const [visibleFields, setVisibleFields] = useState({
   debit: ['FirstName', 'LastName', 'Email', 'DeviceId', 'Phone'],
   beneficiary: ['FirstName', 'LastName', 'Email', 'DeviceId', 'Phone']
 });
 const [showFieldModal, setShowFieldModal] = useState({ debit: false, beneficiary: false });
 const [transactionData] = useState(initialPayload);
 const activeViewRef = useRef(activeView);
 // Update ref when activeView changes
 useEffect(() => {
   activeViewRef.current = activeView;
 }, [activeView]);
 // Get fields for current view
 const getFieldsForView = (nodeType, viewType) => {
   if (viewType === 'customer') {
     return visibleFields[nodeType] || [];
   } else if (viewType === 'transaction') {
     return ['TRAN ABOVE300', 'DEBITAMOUNT', 'TIMESTAMP'];
   } else if (viewType === 'overview') {
     return [
       'TRAN COUNT 10MIN', 'TRAN COUNT 1D', 'TRAN COUNT 30D',
       'TRAN COUNT 90D', 'TRAN COUNT 180D', 'TRAN AMOUNT 10MIN',
       'TRAN AMOUNT 1D', 'TRAN AMOUNT 30D', 'TRAN AMOUNT 90D',
       'TRAN AMOUNT 180D'
     ];
   }
   return [];
 };
 // Get data for a field
 const getDataForField = (nodeType, field) => {
   if (activeViewRef.current[nodeType] === 'customer') {
     return customerData[nodeType]?.[field];
   } else {
     return transactionData[field];
   }
 };
 // Simulate API calls
 useEffect(() => {
   const fetchCustomerData = async (accountNumber) => {
     await new Promise(resolve => setTimeout(resolve, 500));
     return {
       CustomerId: accountNumber,
       FirstName: accountNumber === initialPayload.DEBITACCOUNTNUMBER ? 'John' : 'Jane',
       LastName: accountNumber === initialPayload.DEBITACCOUNTNUMBER ? 'Doe' : 'Smith',
       Email: accountNumber === initialPayload.DEBITACCOUNTNUMBER ? 'john.doe@email.com' : 'jane.smith@email.com',
       Phone: accountNumber === initialPayload.DEBITACCOUNTNUMBER ? '+1234567890' : '+0987654321',
       Address: '123 Main St, City',
       MerchantAddress: '456 Business Ave',
       Gender: accountNumber === initialPayload.DEBITACCOUNTNUMBER ? 'Male' : 'Female',
       Age: accountNumber === initialPayload.DEBITACCOUNTNUMBER ? 35 : 28,
       Registered: '2020-01-15',
       Orders: 156,
       Spent: 45678.90,
       Job: 'Software Engineer',
       Hobbies: 'Reading, Hiking',
       IsMarried: true,
       AccountHolding: 'Premium',
       LoanAccount: 'Active',
       CurrentBalanceBhd: 12500.75,
       IncomeBhd: 8500.00,
       GeoLocation: '26.2285° N, 50.5860° E',
       Vulnerability: 'Low',
       DeviceId: 'DEV-' + Math.random().toString(36).substr(2, 9),
       state: 'Active'
     };
   };
   Promise.all([
     fetchCustomerData(initialPayload.DEBITACCOUNTNUMBER),
     fetchCustomerData(initialPayload.BENEFICIARYACCOUNTNUMBER)
   ]).then(([debitData, beneficiaryData]) => {
     setCustomerData({ debit: debitData, beneficiary: beneficiaryData });
   });
 }, []);
 // D3 Force Graph
 useEffect(() => {
   if (!customerData.debit || !customerData.beneficiary) return;
   const width = isFullscreen ? window.innerWidth - 100 : 900;
   const height = isFullscreen ? window.innerHeight - 200 : 600;
   // Clear previous graph and tooltips
   d3.select(svgRef.current).selectAll("*").remove();
   d3.select("body").selectAll(".d3-tooltip").remove();
   const svg = d3.select(svgRef.current)
     .attr("width", width)
     .attr("height", height);
   // Create tooltip
   const tooltip = d3.select("body").append("div")
     .attr("class", "d3-tooltip")
     .style("position", "absolute")
     .style("visibility", "hidden")
     .style("background", "rgba(0, 0, 0, 0.9)")
     .style("color", "white")
     .style("padding", "8px 12px")
     .style("border-radius", "6px")
     .style("font-size", "12px")
     .style("pointer-events", "none")
     .style("z-index", "9999")
     .style("box-shadow", "0 2px 8px rgba(0,0,0,0.3)");
   // Create nodes data
   const nodes = [
     { id: 'debit', label: 'Debit Account', x: width * 0.25, y: height / 2, data: customerData.debit },
     { id: 'beneficiary', label: 'Beneficiary Account', x: width * 0.75, y: height / 2, data: customerData.beneficiary }
   ];
   const links = [
     { source: 'debit', target: 'beneficiary', value: transactionData.DEBITAMOUNT }
   ];
   // Create simulation
   const simulation = d3.forceSimulation(nodes)
     .force("link", d3.forceLink(links).id(d => d.id).distance(300))
     .force("charge", d3.forceManyBody().strength(-800))
     .force("center", d3.forceCenter(width / 2, height / 2))
     .force("x", d3.forceX(width / 2).strength(0.05))
     .force("y", d3.forceY(height / 2).strength(0.05));
   // Add gradients
   const defs = svg.append("defs");
   const gradient = defs.append("linearGradient")
     .attr("id", "linkGradient")
     .attr("x1", "0%")
     .attr("y1", "0%")
     .attr("x2", "100%")
     .attr("y2", "0%");
   gradient.append("stop")
     .attr("offset", "0%")
     .style("stop-color", "#3b82f6");
   gradient.append("stop")
     .attr("offset", "50%")
     .style("stop-color", "#10b981");
   gradient.append("stop")
     .attr("offset", "100%")
     .style("stop-color", "#8b5cf6");
   // Add links
   const linkGroup = svg.append("g");
   const linkBackground = linkGroup.selectAll(".link-bg")
     .data(links)
     .enter().append("line")
     .attr("class", "link-bg")
     .attr("stroke", "#000")
     .attr("stroke-width", 2)
     .attr("stroke-dasharray", "10,5")
     .attr("stroke-opacity", 0.3);
   const link = linkGroup.selectAll(".link-main")
     .data(links)
     .enter().append("line")
     .attr("class", "link-main")
     .attr("stroke", "url(#linkGradient)")
     .attr("stroke-width", 3)
     .attr("stroke-opacity", 0.8);
   // Add arrow markers
   const arrowGroup = svg.append("g");
   const updateArrows = () => {
     arrowGroup.selectAll("polygon").remove();
     links.forEach(linkData => {
       const dx = linkData.target.x - linkData.source.x;
       const dy = linkData.target.y - linkData.source.y;
       const numArrows = 3;
       for (let i = 1; i <= numArrows; i++) {
         const t = i / (numArrows + 1);
         const x = linkData.source.x + dx * t;
         const y = linkData.source.y + dy * t;
         const angle = Math.atan2(dy, dx) * 180 / Math.PI;
         arrowGroup.append("polygon")
           .attr("points", "0,-5 10,0 0,5")
           .attr("fill", "#10b981")
           .attr("transform", `translate(${x},${y}) rotate(${angle})`)
           .attr("opacity", 0.8);
       }
     });
   };
   // Add nodes
   const node = svg.append("g")
     .selectAll("g")
     .data(nodes)
     .enter().append("g")
     .attr("class", "node-group");
   // Build each node
   node.each(function(d) {
     const g = d3.select(this);
     const nodeId = d.id;
     const isDebit = nodeId === 'debit';
     const radius = 60;
     // Outer status ring
     g.append("circle")
       .attr("r", radius + 15)
       .attr("fill", "none")
       .attr("stroke", nodeId === 'beneficiary' ? "#ef4444" : "#6b7280")
       .attr("stroke-width", 3)
       .attr("stroke-dasharray", nodeId === 'beneficiary' ? "30,100" : "none")
       .attr("opacity", 0.8);
     // Status label
     g.append("text")
       .attr("y", radius + 35)
       .attr("text-anchor", "middle")
       .attr("font-size", "12px")
       .attr("font-weight", "600")
       .attr("fill", nodeId === 'beneficiary' ? "#ef4444" : "#6b7280")
       .text(nodeId === 'beneficiary' ? "Suspicious" : "Not Reviewed");
     // Main node circle
     const mainCircle = g.append("circle")
       .attr("r", radius)
       .attr("fill", isDebit ? "#3b82f6" : "#1e293b")
       .attr("stroke", "#fff")
       .attr("stroke-width", 3)
       .style("cursor", "move");
     // Credit card icon background
     g.append("rect")
       .attr("x", -25)
       .attr("y", -15)
       .attr("width", 50)
       .attr("height", 30)
       .attr("rx", 3)
       .attr("fill", "#fff")
       .attr("opacity", 0.9);
     // Credit card stripe
     g.append("rect")
       .attr("x", -20)
       .attr("y", -5)
       .attr("width", 30)
       .attr("height", 3)
       .attr("fill", "#374151");
     // Account number
     g.append("text")
       .attr("y", radius + 55)
       .attr("text-anchor", "middle")
       .attr("font-size", "11px")
       .attr("fill", "#374151")
       .text(isDebit ? initialPayload.DEBITACCOUNTNUMBER : initialPayload.BENEFICIARYACCOUNTNUMBER);
     // Toggle buttons
     const buttonData = [
       { id: 'customer', icon: '👤', angle: -60 },
       { id: 'transaction', icon: '💳', angle: 0 },
       { id: 'overview', icon: '📊', angle: 60 }
     ];
     const buttonRadius = radius + 50;
     buttonData.forEach(button => {
       const angleRad = (button.angle - 90) * Math.PI / 180;
       const bx = Math.cos(angleRad) * buttonRadius;
       const by = Math.sin(angleRad) * buttonRadius;
       // Connection line to button
       g.append("line")
         .attr("x1", Math.cos(angleRad) * (radius + 5))
         .attr("y1", Math.sin(angleRad) * (radius + 5))
         .attr("x2", bx)
         .attr("y2", by)
         .attr("stroke", "#d1d5db")
         .attr("stroke-width", 1)
         .attr("stroke-dasharray", "2,2");
       const buttonGroup = g.append("g")
         .attr("transform", `translate(${bx}, ${by})`)
         .style("cursor", "pointer");
       // Button circle
       const buttonCircle = buttonGroup.append("circle")
         .attr("r", 20)
         .attr("fill", activeViewRef.current[nodeId] === button.id ?
           (isDebit ? "#3b82f6" : "#1e293b") : "#f3f4f6")
         .attr("stroke", activeViewRef.current[nodeId] === button.id ? "#fff" : "#d1d5db")
         .attr("stroke-width", 2);
       // Button icon
       buttonGroup.append("text")
         .attr("text-anchor", "middle")
         .attr("dy", 5)
         .attr("font-size", "16px")
         .text(button.icon)
         .style("pointer-events", "none");
       // Button click handler
       buttonGroup.on("click", function(event) {
         event.stopPropagation();
         setActiveView(prev => ({ ...prev, [nodeId]: button.id }));
       });
       // Hover effects
       buttonGroup.on("mouseenter", function() {
         d3.select(this).select("circle")
           .transition()
           .duration(200)
           .attr("r", 22);
       }).on("mouseleave", function() {
         d3.select(this).select("circle")
           .transition()
           .duration(200)
           .attr("r", 20);
       });
     });
     // Sub-nodes group
     const subNodeGroup = g.append("g").attr("class", "sub-nodes");
     // Function to render sub-nodes
     const renderSubNodes = () => {
       subNodeGroup.selectAll(".sub-node-group").remove();
       const currentView = activeViewRef.current[nodeId];
       const fields = getFieldsForView(nodeId, currentView);
       const subNodeRadius = 140;
       fields.forEach((field, index) => {
         const angle = (index * (360 / fields.length)) - 90;
         const angleRad = angle * Math.PI / 180;
         const sx = Math.cos(angleRad) * subNodeRadius;
         const sy = Math.sin(angleRad) * subNodeRadius;
         const subNodeG = subNodeGroup.append("g")
           .attr("class", "sub-node-group");
         // Connection line
         subNodeG.append("line")
           .attr("x1", Math.cos(angleRad) * (radius + 5))
           .attr("y1", Math.sin(angleRad) * (radius + 5))
           .attr("x2", sx)
           .attr("y2", sy)
           .attr("stroke", "#d1d5db")
           .attr("stroke-width", 1)
           .attr("stroke-opacity", 0.5)
           .attr("stroke-dasharray", "3,3");
         const subNode = subNodeG.append("g")
           .attr("transform", `translate(${sx}, ${sy})`);
         // Sub-node circle
         const circle = subNode.append("circle")
           .attr("r", 18)
           .attr("fill", "#f9fafb")
           .attr("stroke", isDebit ? "#3b82f6" : "#1e293b")
           .attr("stroke-width", 2)
           .attr("opacity", 0.9)
           .style("cursor", "pointer");
         // Sub-node icon
         subNode.append("text")
           .attr("text-anchor", "middle")
           .attr("dy", 5)
           .attr("font-size", "14px")
           .text(iconEmojis[field] || '📄')
           .style("pointer-events", "none");
         // Hover events
         circle.on("mouseenter", function(event) {
           const value = getDataForField(nodeId, field);
           const displayValue = typeof value === 'boolean' ? (value ? 'Yes' : 'No') :
                              typeof value === 'number' ? value.toLocaleString() :
                              value || 'N/A';
           tooltip
             .style("visibility", "visible")
             .html(`<strong>${field}</strong><br/>${displayValue}`);
           d3.select(this)
             .transition()
             .duration(200)
             .attr("r", 22)
             .attr("fill", isDebit ? "#dbeafe" : "#e2e8f0");
         })
         .on("mousemove", function(event) {
           tooltip
             .style("top", (event.pageY - 10) + "px")
             .style("left", (event.pageX + 10) + "px");
         })
         .on("mouseleave", function() {
           tooltip.style("visibility", "hidden");
           d3.select(this)
             .transition()
             .duration(200)
             .attr("r", 18)
             .attr("fill", "#f9fafb");
         });
       });
     };
     // Initial render
     renderSubNodes();
     // Store render function for updates
     g.node().__renderSubNodes = renderSubNodes;
   });
   // Add drag behavior
   node.call(d3.drag()
     .on("start", function(event, d) {
       if (!event.active) simulation.alphaTarget(0.3).restart();
       d.fx = d.x;
       d.fy = d.y;
     })
     .on("drag", function(event, d) {
       d.fx = event.x;
       d.fy = event.y;
     })
     .on("end", function(event, d) {
       if (!event.active) simulation.alphaTarget(0);
       d.fx = null;
       d.fy = null;
     }));
   // Update positions on tick
   simulation.on("tick", () => {
     link
       .attr("x1", d => d.source.x)
       .attr("y1", d => d.source.y)
       .attr("x2", d => d.target.x)
       .attr("y2", d => d.target.y);
     linkBackground
       .attr("x1", d => d.source.x)
       .attr("y1", d => d.source.y)
       .attr("x2", d => d.target.x)
       .attr("y2", d => d.target.y);
     node.attr("transform", d => `translate(${d.x},${d.y})`);
     updateArrows();
   });
   // Cleanup on unmount
   return () => {
     simulation.stop();
     d3.select("body").selectAll(".d3-tooltip").remove();
   };
 }, [customerData, isFullscreen, transactionData]);
 // Update sub-nodes when activeView changes
 useEffect(() => {
   const nodeGroups = d3.select(svgRef.current).selectAll(".node-group");
   nodeGroups.each(function() {
     if (this.__renderSubNodes) {
       this.__renderSubNodes();
     }
   });
 }, [activeView]);
 // Field Selection Modal
 const FieldModal = ({ nodeType, onClose }) => {
   const allFields = Object.keys(customerData[nodeType] || {});
   const [selectedFields, setSelectedFields] = useState(new Set(visibleFields[nodeType]));
   const handleToggle = (field) => {
     const newSelected = new Set(selectedFields);
     if (newSelected.has(field)) {
       newSelected.delete(field);
     } else {
       newSelected.add(field);
     }
     setSelectedFields(newSelected);
   };
   const handleSave = () => {
     setVisibleFields(prev => ({
       ...prev,
       [nodeType]: Array.from(selectedFields)
     }));
     onClose();
   };
   return (
<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
<div className="bg-white rounded-xl p-6 w-96 max-h-[80vh] overflow-y-auto">
<div className="flex justify-between items-center mb-4">
<h3 className="text-lg font-bold">Select Fields to Display</h3>
<button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
<X className="w-5 h-5" />
</button>
</div>
<div className="space-y-2">
           {allFields.map(field => (
<label key={field} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
<input
                 type="checkbox"
                 checked={selectedFields.has(field)}
                 onChange={() => handleToggle(field)}
                 className="w-4 h-4 text-blue-600"
               />
<span className="text-sm flex items-center gap-2">
<span>{iconEmojis[field] || '📄'}</span>
<span>{field}</span>
</span>
</label>
           ))}
</div>
<div className="flex justify-end space-x-2 mt-4 pt-4 border-t">
<button
             onClick={onClose}
             className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
>
             Cancel
</button>
<button
             onClick={handleSave}
             className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
>
             Save Changes
</button>
</div>
</div>
</div>
   );
 };
 return (
<div className={`relative ${isFullscreen ? 'fixed inset-0 bg-gray-50 z-50' : ''}`}>
     {/* Header */}
<div className="bg-white shadow-sm border-b px-6 py-4 flex items-center justify-between">
<div className="flex items-center space-x-3">
<Link className="w-6 h-6 text-blue-600" />
<h1 className="text-xl font-bold text-gray-800">Link Analysis Graph</h1>
</div>
<div className="flex items-center space-x-4">
         {activeView.debit === 'customer' && (
<button
             onClick={() => setShowFieldModal(prev => ({ ...prev, debit: true }))}
             className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm flex items-center space-x-2"
>
<Settings className="w-4 h-4" />
<span>Configure Debit Fields</span>
</button>
         )}
         {activeView.beneficiary === 'customer' && (
<button
             onClick={() => setShowFieldModal(prev => ({ ...prev, beneficiary: true }))}
             className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-sm flex items-center space-x-2"
>
<Settings className="w-4 h-4" />
<span>Configure Beneficiary Fields</span>
</button>
         )}
<button
           onClick={() => setIsFullscreen(!isFullscreen)}
           className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
>
           {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
</button>
</div>
</div>
     {/* Graph Container */}
<div className="relative p-4" style={{ height: isFullscreen ? 'calc(100vh - 80px)' : '600px' }}>
<svg ref={svgRef} className="w-full h-full"></svg>
       {/* Transaction Amount Badge */}
<div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-full shadow-lg z-20">
<div className="flex items-center space-x-2">
<Zap className="w-4 h-4 animate-pulse" />
<span className="text-sm font-bold">
             Transaction: ${transactionData.DEBITAMOUNT?.toLocaleString()}
</span>
</div>
</div>
</div>
     {/* Checklist View */}
<div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl p-4 max-w-xs max-h-96 overflow-y-auto z-40">
<h3 className="font-bold text-sm mb-3">Field Visibility</h3>
<div className="space-y-1">
         {[...new Set([
           ...Object.keys(customerData.debit || {}),
           ...Object.keys(customerData.beneficiary || {}),
           ...Object.keys(transactionData)
         ])].map(field => {
           const isVisible = visibleFields.debit?.includes(field) ||
                           visibleFields.beneficiary?.includes(field) ||
                           Object.keys(transactionData).includes(field);
           return (
<div key={field} className="flex items-center space-x-2 text-xs">
<span>{iconEmojis[field] || '📄'}</span>
<span className={isVisible ? 'text-gray-700' : 'text-gray-400'}>
                 {field}
</span>
               {isVisible ? (
<Check className="w-3 h-3 text-green-500 ml-auto" />
               ) : (
<X className="w-3 h-3 text-gray-300 ml-auto" />
               )}
</div>
           );
         })}
</div>
</div>
     {/* Field Selection Modals */}
     {showFieldModal.debit && (
<FieldModal
         nodeType="debit"
         onClose={() => setShowFieldModal(prev => ({ ...prev, debit: false }))}
       />
     )}
     {showFieldModal.beneficiary && (
<FieldModal
         nodeType="beneficiary"
         onClose={() => setShowFieldModal(prev => ({ ...prev, beneficiary: false }))}
       />
     )}
</div>
 );
};
export default LinkAnalysisGraph;