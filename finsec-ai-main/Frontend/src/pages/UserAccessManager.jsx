import React, { useEffect, useState } from "react";
import AccessControlModal from "./AccessControlModal"; // Import AccessControlModal
import "./UserAccessManager.css"; // CSS for your table, modal, etc.
import { API_BASE_URL } from '../service/service';
import { active } from "d3";
import { UserX, UserCog } from 'lucide-react';

const UserAccessManager = (userData) => {
  const [activeTab, setActiveTab] = useState("existing");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Fetch data on tab change
  useEffect(() => {
    fetchUsers();
  }, [activeTab]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const endpoint =
        activeTab === "existing"
          ? "/auth/users/with-access"
          : "/auth/users/no-access";

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'  // Optional if you need cookies/session
      });
      const data = await response.json();
      let userList = Array.isArray(data) ? data : data.users || [];
      if (activeTab === "existing") {
        //   console.log("Before filtering:", userList);
        //   console.log("userData.username:", userData.userData.username);

        // Remove users with the same username as userData.username
        userList = userList.filter(user => user.username !== userData.userData.username);


      }

      // console.log(userList);
      setFilteredUsers(userList);
      setUsers(userList);
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
    }
    setLoading(false);
  };

  // const filteredUsers = (users || []).filter(
  //   (u) =>
  //     u.username?.toLowerCase().includes(search.toLowerCase()) ||
  //     u.email?.toLowerCase().includes(search.toLowerCase()) ||
  //     u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
  //     String(u.id).toLowerCase().includes(search.toLowerCase()) || 
  //     u.user_type?.toLowerCase().includes(search.toLowerCase())
  // );

  const visibleUsers = filteredUsers.slice(0, recordsPerPage);





  // Utility function to highlight search matches
  const highlightText = (text, search) => {
    if (!search || !text) return text; // Check if search or text is null/undefined

    const regex = new RegExp(`(${search})`, "gi"); // Case-insensitive matching
    const parts = text.split(regex);

    return parts.map((part, index) =>
      part.toLowerCase() === search.toLowerCase() ? (
        <span key={index} className="highlight">{part}</span>
      ) : (
        part
      )
    );
  };

  // Update filtered users based on search query
  const handleSearch = (e) => {
    setSearch(e.target.value);
    const filtered = users.filter(
      (user) =>
        user.username?.toLowerCase().includes(e.target.value.toLowerCase()) ||
        user.email?.toLowerCase().includes(e.target.value.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(e.target.value.toLowerCase()) ||
        String(user.id).toLowerCase().includes(e.target.value.toLowerCase()) ||
        user.user_type?.toLowerCase().includes(e.target.value.toLowerCase())
    );
    setFilteredUsers(filtered);
  };

  // Utility function to highlight search matches
  // const highlightText = (text, search) => {
  //   if (!search) return text;

  //   const regex = new RegExp(`(${search})`, "gi"); // Case-insensitive matching
  //   const parts = text.split(regex);

  //   return parts.map((part, index) =>
  //     part.toLowerCase() === search.toLowerCase() ? (
  //       <span key={index} className="highlight">{part}</span>
  //     ) : (
  //       part
  //     )
  //   );
  // };

  // const handleSearch = (e) => {
  //   setSearch(e.target.value);
  //   const filtered = users.filter(
  //     (user) =>
  //       user.username?.toLowerCase().includes(e.target.value.toLowerCase()) ||
  //       user.email?.toLowerCase().includes(e.target.value.toLowerCase()) ||
  //       user.full_name?.toLowerCase().includes(e.target.value.toLowerCase()) ||
  //       String(user.id).toLowerCase().includes(e.target.value.toLowerCase()) ||
  //       user.user_type?.toLowerCase().includes(e.target.value.toLowerCase())
  //   );
  //   setFilteredUsers(filtered);
  // };


  const openEditModal = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };


  const handleDeleteAction = async (user, actionType) => {

    console.log("Calling API → ", { user, actionType });



    const response = await fetch(`${API_BASE_URL}/auth/access/${user.id}`, {
      // const response = await fetch(`${API_BASE_URL}/auth/access/?user_id=${encodeURIComponent(user.id)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });
    const data = await response.json();

    // console.log(data)
    fetchUsers();



    // Call the API for action (e.g., grant admin, degrade user)
    // Placeholder for API call
    setShowModal(false); // Close the modal after action
  };

  const handleAction = async (user, actionType) => {
    console.log("Calling API → ", { user, actionType });



    const response = await fetch(`${API_BASE_URL}/auth/access/${user.id}`, {
      // const response = await fetch(`${API_BASE_URL}/auth/access/?user_id=${encodeURIComponent(user.id)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      // Optional if you need cookies/session
      body: JSON.stringify({
        role: actionType,
        active: true
      })
    });
    const data = await response.json();

    // console.log(data)

    fetchUsers();


    // Call the API for action (e.g., grant admin, degrade user)
    // Placeholder for API call
    setShowModal(false); // Close the modal after action
  };

  return (
    <div className="user-access-container">
      {/* Navigation Tabs */}
      <div className="tabs">
        <button
          className={activeTab === "existing" ? "active" : ""}
          onClick={() => setActiveTab("existing")}
        >
          Existing Users
        </button>
        <button
          className={activeTab === "add" ? "active" : ""}
          onClick={() => setActiveTab("add")}
        >
          Add Users
        </button>
      </div>

      {/* LOADING STATE */}
      {loading && (
        <div className="loading-wrapper">
          <div className="spinner"></div>
          <p>Loading users...</p>
        </div>
      )}


      {/* NO USERS MESSAGE */}
      {/* {!loading && filteredUsers.length === 0 && (
        <div className="no-users-msg">No users</div>
      )} */}












      {/* TABLE HEADER CONTROLS — should show even if filtered list is empty */}
      {!loading && (
        <div className="table-header">
          <select
            className="dropdown"
            value={recordsPerPage}
            onChange={(e) => setRecordsPerPage(Number(e.target.value))}
          >
            <option className="dropdown-options" value="10" disabled={filteredUsers.length < 10}>Show 10</option>
            <option className="dropdown-options" value="20" disabled={filteredUsers.length < 20}>Show 20</option>
            <option className="dropdown-options" value="50" disabled={filteredUsers.length < 50}>Show 50</option>
          </select>

          <input
            type="text"
            placeholder="Search..."
            className="search-box"
            value={search}
            // onChange={(e) => setSearch(e.target.value)}
            onChange={handleSearch}
          />
        </div>
      )}

      {/* TABLE — always show when NOT loading */}
      {!loading && (
        <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
          <table style={{
            width: 'max-content',
            minWidth: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.875rem',
            border: '1px solid #e5e7eb'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                {/* <th>ID</th> */}
                <th>Username</th>
                <th>Email</th>
                <th>Full Name</th>
                  {activeTab === "existing" && (
                <th>User Type</th>
                  )}
               
<th className="sticky-col">Action</th>
  {activeTab === "existing" && (
    <th className="sticky-col">Revoke Access</th>
  )}

              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "20px" }}>
                    No matching users found
                  </td>
                </tr>
              ) : (
                filteredUsers.slice(0, recordsPerPage).map((user) => (
                  <tr key={user.id} >
                    {/* <td>{highlightText(String(user.id), search)}</td> */}
                    <td className="table-td">{highlightText(user.username, search)}</td>
                    <td className="table-td">{highlightText(user.email, search)}</td>
                    <td className="table-td">{highlightText(user.full_name, search)}</td>
                      {activeTab === "existing" && (
                    <td className="table-td">{highlightText(user.user_type, search)}</td>
                      )}
                    <td className="table-td-icon">
                      {activeTab === "existing" ? (
                        <>
                          <button
                            className="table-td-icon-button"
                            onClick={() => openEditModal(user)}
                          >
                            <UserCog />
                          </button>

                        </>
                      ) : (
                        <button
                          className="grant-btn"
                          onClick={() => handleAction(user, "user")}
                        >
                          Grant Access
                        </button>
                      )}
                    </td>
                      {activeTab === "existing" && (
                    <td className="table-td-icon">
                      <button
                        className="table-td-icon-button"
                    
                        onClick={() => handleDeleteAction(user, "remove_access")}
                      >
                        <UserX size={20} color="#dc2626" />
                      </button>
                    </td>
                      )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}




      {/* {!loading && filteredUsers.length > 0 && (
        <div className="table-header">
          <select
            className="dropdown"
            value={recordsPerPage}
            onChange={(e) => setRecordsPerPage(Number(e.target.value))}
          >
            <option value="10">Show 10</option>
            <option value="20">Show 20</option>
            <option value="50">Show 50</option>
          </select>

          <input
            type="text"
            placeholder="Search..."
            className="search-box"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}


      {!loading && filteredUsers.length > 0 && (
        <div className="table-wrapper">
          <table className="scrollable-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Full Name</th>
                <th>User Type</th>
                <th className="sticky-col">Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>{user.full_name}</td>
                  <td>{user.user_type}</td>
                  <td className="sticky-col">
                    {activeTab === "existing" ? (
                      <>
                        <button
                          className="icon-btn edit"
                          onClick={() => openEditModal(user)}
                        >
                          ✏️
                        </button>
                        <button
                          className="icon-btn remove"
                          onClick={() => handleDeleteAction(user, "remove_access")}
                        >
                          ❌
                        </button>
                      </>
                    ) : (
                      <button
                        className="grant-btn"
                        onClick={() => handleAction(user, "user")}
                      >
                        Grant Access
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )} */}








      {/* Pagination (show only when data exists) */}
      {!loading && filteredUsers.length > 0 && (
        <div className="pagination">
          Showing {visibleUsers.length} of {filteredUsers.length}
        </div>
      )}

      {/* EDIT ACCESS POPUP */}
      {showModal && selectedUser && (
        <AccessControlModal
          selectedUser={selectedUser}
          handleAction={handleAction}
          setShowModal={setShowModal}
        />
      )}
    </div>
  );
};

export default UserAccessManager;
