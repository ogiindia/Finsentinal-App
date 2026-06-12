import React, { useState, useEffect } from 'react';

// export const ParentNodeSelector = ({
//   enabled = false,
//   nodes = [],
//   currentNodeId,
//   selectedNodeId= null,
//   currentNodeParams = [],
//   onSelectionChange,
//   selectedMappingParams,
//   setSelectedMappingParams
// }) => {

export const ParentNodeSelector = ({
  enabled,
  nodes,
  currentNodeId,
  selectedMappingParams,
  currentNodeParams,
  onSelectionChange
}) => {
  const [useParentNode, setUseParentNode] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState([]);
  

  const handleUseParentNodeChange = () => {
    const newState = !useParentNode;
    setUseParentNode(newState);

    if (!newState) {
      // Reset everything when unchecked
      setSelectedNodes([]);
      setSelectedMappingParams({});
      onSelectionChange({}); // Send empty mapping to parent
    }
  };

  const handleNodeCheckboxChange = (nodeId) => {
    let updatedNodes;
    let updatedParams = { ...selectedMappingParams };

    if (selectedNodes.includes(nodeId)) {
      updatedNodes = selectedNodes.filter(id => id !== nodeId);

      const paramToRemove = Object.keys(updatedParams).find(
        key => updatedParams[key] === nodeId
      );
      if (paramToRemove) delete updatedParams[paramToRemove];
    } else {
      updatedNodes = [...selectedNodes, nodeId];
    }

    setSelectedNodes(updatedNodes);
    onSelectionChange(updatedParams); // ✅ ONLY THIS
  };

  // const handleParamChange = (nodeId, param) => {
  //   const updated = { ...selectedMappingParams };

  //   // Remove any existing mapping for this param
  //   Object.keys(updated).forEach(key => {
  //     if (updated[key] === nodeId || key === param) {
  //       delete updated[key];
  //     }
  //   });

  //   updated[param] = nodeId;
  //   setSelectedMappingParams(updated);
  //   onSelectionChange(updated); // Send updated mapping to parent
  // };

  const handleParamChange = (nodeId, param) => {
  const updated = { ...selectedMappingParams };

  Object.keys(updated).forEach(key => {
    if (updated[key] === nodeId || key === param) {
      delete updated[key];
    }
  });

  updated[param] = nodeId;

  // setSelectedMappingParams(updated);
  onSelectionChange(updated); // ✅ ONLY here
};

  const getAvailableParams = (nodeId) => {
    const usedParams = Object.keys(selectedMappingParams).filter(
      param => selectedMappingParams[param] !== nodeId
    );

    return currentNodeParams.filter(
      param => !usedParams.includes(param) || selectedMappingParams[param] === nodeId
    );
  };


  // const handleNodeCheckboxChange = (nodeId) => {
  //   if (selectedNodes.includes(nodeId)) {
  //     setSelectedNodes(prev => prev.filter(id => id !== nodeId));
  //     setSelectedMappingParams(prev => {
  //       const updated = { ...prev };
  //       delete updated[nodeId];
  //       return updated;
  //     });
  //   } else {
  //     setSelectedNodes(prev => [...prev, nodeId]);
  //   }
  // };

  // const handleParentNodeSelectionChange = (useParent, nodeId, targetParam) => {
  //   if (useParent && nodeId) {
  //     setFormValues(prev => ({
  //       ...prev,
  //       parent_result: {
  //         isPreviousOutput: true,
  //         sourceNodeId: nodeId,
  //         targetParam: targetParam || '' // The parameter in THIS node to map to
  //       }
  //     }));
  //   } else {
  //     // If not using parent, remove the parent_result property
  //     const updatedValues = { ...formValues };
  //     delete updatedValues.parent_result;
  //     setFormValues(updatedValues);
  //   }
  // };

  const handleParentNodeSelectionChange = (mappingDict) => {
  if (Object.keys(mappingDict).length > 0) {
    setFormValues(prev => ({
      ...prev,
      parent_result: {
        isPreviousOutput: true,
        mappings: mappingDict   // ✅ dictionary stored
      }
    }));
  } else {
    const updated = { ...formValues };
    delete updated.parent_result;
    setFormValues(updated);
  }
};


  // const [useParentNode, setUseParentNode] = useState(enabled);
  // const [selectedNodes, setSelectedNodes] = useState([]);
  // mappings: { [parentNodeId]: <current_node_param> }
  const [mappings, setMappings] = useState({});

  const usedParams = Object.values(selectedMappingParams);

  const availableParams = currentNodeParams.filter(param =>
    !usedParams.includes(param) || selectedMappingParams[nodes.id] === param
  );


  const availableNodes = nodes.filter(node => node.id !== currentNodeId);

  // useEffect(() => {
  //   setUseParentNode(enabled);
  //   if (selectedNodeId) {
  //     setSelectedNodes([selectedNodeId]);
  //   }
  // }, [enabled, selectedNodeId]);

  // const handleUseParentNodeChange = (e) => {
  //   const isChecked = e.target.checked;
  //   setUseParentNode(isChecked);

  //   if (!isChecked) {
  //     setSelectedNodes([]);
  //     setMappings({});
  //     onSelectionChange(false, []);
  //   } else if (availableNodes.length > 0) {
  //     const firstNodeId = availableNodes[0].id;
  //     setSelectedNodes([firstNodeId]);
  //     setMappings({ [firstNodeId]: "" });
  //     emitSelection([firstNodeId], { [firstNodeId]: "" });
  //   }
  // };

  // const handleNodeCheckboxChange = (nodeId) => {
  //   let updated;
  //   let updatedMappings = { ...mappings };
  //   if (selectedNodes.includes(nodeId)) {
  //     updated = selectedNodes.filter(id => id !== nodeId);
  //     delete updatedMappings[nodeId];
  //   } else {
  //     updated = [...selectedNodes, nodeId];
  //     updatedMappings[nodeId] = "";
  //   }
  //   setSelectedNodes(updated);
  //   setMappings(updatedMappings);
  //   emitSelection(updated, updatedMappings);
  // };

  const handleMappingChange = (nodeId, newParam) => {
    const updatedMappings = { ...mappings, [nodeId]: newParam };
    setMappings(updatedMappings);
    emitSelection(selectedNodes, updatedMappings);
  };

  // Emit selection with proper mapping structure
  const emitSelection = (selected, mappingObj) => {
    if (selected.length === 0) {
      onSelectionChange(false, []);
      return;
    }

    // For simplicity, we'll use the first selected node
    const selectedNodeId = selected[0];
    const targetParam = mappingObj[selectedNodeId] || '';

    // Pass the selection with mapping information
    onSelectionChange(true, selectedNodeId, targetParam);
  };

  return (
    <div style={{
      padding: '10px',
      backgroundColor: '#f8f9fa',
      borderRadius: '5px',
      marginBottom: '15px',
      border: '1px solid #e9ecef'
    }}>
      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', fontWeight: '500' }}>
          <input
            type="checkbox"
            checked={useParentNode}
            onChange={handleUseParentNodeChange}
            style={{ marginRight: '8px' }}
          />
          Use output from previous node
        </label>
      </div>

      {/* {useParentNode && availableNodes.length > 0 && (
        <div>
          {availableNodes.map((node, idx) => (
            <div key={node.id} style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={selectedNodes.includes(node.id)}
                  onChange={() => handleNodeCheckboxChange(node.id)}
                  style={{ marginRight: '8px' }}
                />
                {node.data?.component?.name || 'Unknown'} (Node {idx + 1})
              </label>
              {selectedNodes.includes(node.id) && (
                <div style={{ paddingLeft: '15px', marginTop: '6px' }}>
                  <label style={{ fontSize: '0.8rem', marginRight: '8px' }}>
                    Map parent output to parameter in this node:
                  </label>
                  {/* <select
                    value={selectedMappingParam}
                    onChange={e => setSelectedMappingParam(e.target.value)}
                  > */}
                  {/* <select
                    value={selectedMappingParams[node.id] || ''}
                    onChange={e => {
                      const newParams = { ...selectedMappingParams, [node.id]: e.target.value };
                      setSelectedMappingParam(newParams);
                      handleParentNodeSelectionChange(node.id, e.target.value); // send to parent
                    }}
                  > */}

                    {/* <option value="">Select a parameter</option> */}
                    {/* {currentNodeParams.map((param, i) => (
                      <option key={i} value={param}>{param}</option>
                    ))} */}
                    {/* {availableParams.map((param, i) => (
                      <option key={i} value={param}>{param}</option>
                    ))}

                  </select>
                </div>
              )}

            </div>
          ))}
        </div> 
      )} */}



    {useParentNode && nodes.length > 0 && (
        <div>
          {nodes.map((node, idx) => (
            <div key={node.id} style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={selectedNodes.includes(node.id)}
                  onChange={() => handleNodeCheckboxChange(node.id)}
                  style={{ marginRight: '8px' }}
                />
                {node.data?.component?.name || 'Unknown'} (Node {idx + 1})
              </label>

              {selectedNodes.includes(node.id) && (
                <div style={{ paddingLeft: '15px', marginTop: '6px' }}>
                  <label style={{ fontSize: '0.8rem', marginRight: '8px' }}>
                    Map parent output to parameter in this node:
                  </label>
                  <select
                    value={
                      Object.entries(selectedMappingParams).find(
                        ([, val]) => val === node.id
                      )?.[0] || ''
                    }
                    onChange={e => handleParamChange(node.id, e.target.value)}
                  >
                    {/* <option value="">Select a parameter</option> */}
                    {getAvailableParams(node.id).map((param, i) => (
                      <option key={i} value={param}>{param}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {useParentNode && selectedNodes.length === 0 && (
        <div style={{
          color: '#856404',
          backgroundColor: '#fff3cd',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '0.85rem'
        }}>
          <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
          No parent node selected
        </div>
      )}
    </div>
  );
};

export default ParentNodeSelector;



{/* {selectedNodes.includes(node.id) && (
                <div style={{ paddingLeft: '15px', marginTop: '6px' }}>
                  <label style={{ fontSize: '0.8rem', marginRight: '8px' }}>
                    Map parent output to parameter in this node:
                  </label>
                  <input
                    type="text"
                    value={mappings[node.id] || ''}
                    onChange={e => handleMappingChange(node.id, e.target.value)}
                    style={{
                      padding: '5px',
                      fontSize: '0.85rem',
                      width: '100%'
                    }}
                    placeholder="Enter parameter name in current node"
                  />
                  {currentNodeParams && currentNodeParams.length > 0 && (
                    <div style={{
                      marginTop: '4px',
                      fontSize: '0.78rem',
                      color: '#6c757d'
                    }}>
                      <span>Available parameters in this node: </span>
                      {currentNodeParams.map((param, i) => (
                        <code
                          key={i}
                          style={{
                            background: '#e9ecef',
                            padding: '2px 5px',
                            borderRadius: '3px',
                            marginRight: '5px',
                            cursor: 'pointer'
                          }}
                          onClick={() => handleMappingChange(node.id, param)}
                        >
                          {param}
                        </code>
                      ))}
                    </div>
                  )}
                </div>
              )} */}


{/* <select
                    value={mappings[node.id] || ''}
                    onChange={e => handleMappingChange(node.id, e.target.value)}
                    style={{
                      padding: '5px',
                      fontSize: '0.85rem',
                      width: '100%'
                    }}
                  > */}
{/* <option value="">Select a parameter</option> */ }
{/* {currentNodeParams && currentNodeParams.map((param, i) => (
                      <option key={i} value={param}>
                        {param}
                      </option>
                    ))} */}