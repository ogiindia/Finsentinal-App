import requests

# Step 1: Define the login URL and payload
login_url = "https://10.74.169.117:444/cm-new-gen/api/auth/signin"
login_payload = {
    "username": "E5735910",
    "password": "Nandyjackson007",
    "domain": "FNFIS.com"
}

# Step 2: Perform the login request (disable SSL verification for self-signed certs)
login_response = requests.post(login_url, json=login_payload, verify=False)

# Step 3: Check login success and extract token
if login_response.status_code == 200:
    print("Login successful!")
    login_data = login_response.json()
    access_token = login_data.get("accessToken")  # Adjust key if different

    if access_token:
        print("Access Token:", access_token)

        # Step 4: Use the token to access another API
        protected_url = "https://10.74.169.117:444/cm-new-gen/finder/external/Alert"  # Replace with actual endpoint
        
        protected_payload = {
  "selectedDetails": "true",
  "selectedFieldName": [
    "Extr_cr_trxn_amount,","Title"
  ],
  "queryFilter": "[[\"CATEGORYFULLTITLE\",\"=\",\"CBI_TEST_STAFF_ABOVE_25K\"]]"
}


        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        protected_response = requests.post(protected_url, headers=headers, json=protected_payload, verify=False)
        
        if protected_response.status_code == 200:
            print("Protected API POST successful!")
            print("Response JSON:", protected_response.json())
        else:
            print("Failed to access protected API:", protected_response.status_code)
            print("Error:", protected_response.text)
    else:
        print("Access token not found in response.")
else:
    print("Login failed with status code:", login_response.status_code)
    print("Error response:", login_response.text)
