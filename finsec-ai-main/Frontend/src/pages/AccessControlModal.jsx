import React, { useState } from "react";

const AccessControlModal = ({ selectedUser, handleAction, setShowModal }) => {
  const [selectedAccess, setSelectedAccess] = useState(null); // Tracks dropdown selection
  const [isUpdateButtonEnabled, setIsUpdateButtonEnabled] = useState(false); // Enable/disable Update button

  // Handle dropdown change
  const handleAccessChange = (event) => {
    const value = event.target.value;
    setSelectedAccess(value);
    setIsUpdateButtonEnabled(value !== null); // Enable button only if a value is selected
  };

  // Handle Update Access button click
  const handleUpdateAccess = () => {
    if (selectedAccess) {
      // Call handleAction with the selected value and user data
      // console.log(selectedUser, selectedAccess)
      handleAction(selectedUser, selectedAccess);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setShowModal(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>User Access Control</h3>

        <div className="modal-info">
          <p><strong>ID:</strong> {selectedUser.id}</p>
          <p><strong>Username:</strong> {selectedUser.username}</p>
          <p><strong>Email:</strong> {selectedUser.email}</p>
          <p><strong>Full Name:</strong> {selectedUser.full_name}</p>
        </div>

        <div className="modal-actions">
          <label htmlFor="modify-access">Modify Access</label>
          <select
            id="modify-access"
            value={selectedAccess || ''}
            onChange={handleAccessChange}
            className="access-dropdown"
          >
            <option value="" disabled>Select an option</option>
            {selectedUser.user_type === "user" && (
              <>
                <option value="admin">Grant Admin Access</option>
                <option value="superadmin">Grant Superadmin Access</option>
              </>
            )}
            {selectedUser.user_type === "admin" && (
              <>
                <option value="user">Grant User Access</option>
                <option value="superadmin">Grant Superadmin Access</option>
              </>
            )}
            {selectedUser.user_type === "superadmin" && (
              <>
                <option value="admin">Grant Admin Access</option>
                <option value="user">Grant User Access</option>
              </>
            )}
          </select>

          {/* Update Access Button - Initially disabled (blurred) */}
          <button
            className={`update-access-btn ${!isUpdateButtonEnabled ? "disabled" : ""}`}
            onClick={handleUpdateAccess}
            disabled={!isUpdateButtonEnabled}
          >
            Update Access
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccessControlModal;
