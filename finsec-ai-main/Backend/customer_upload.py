import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from model import Customer, Base
from config import CUST_DATA, DB_URL  # Import your database URL
from datetime import datetime

def migrate_customer_data():
    """Migrate customer data from CSV to database"""
    
    # Create database connection
    engine = create_engine(DB_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # Read CSV file
        df = pd.read_csv(CUST_DATA)
        print(f"Found {len(df)} records in CSV file")
        
        # Check if table is empty
        existing_count = session.query(Customer).count()
        print(f"Existing records in database: {existing_count}")
        
        if existing_count > 0:
            response = input("Customer table already has data. Overwrite? (yes/no): ")
            if response.lower() != 'yes':
                print("Migration cancelled")
                return
            # Delete existing records
            session.query(Customer).delete()
            session.commit()
            print("Existing records deleted")
        
        # Insert data in batches
        batch_size = 1000
        total_inserted = 0
        
        for i in range(0, len(df), batch_size):
            batch = df.iloc[i:i+batch_size]
            customers = []
            
            for _, row in batch.iterrows():
                customer = Customer(
                    customer_id=int(row.get('Customer_Id', row.get('customer_id'))),
                    first_name=str(row.get('First_Name', row.get('first_name', ''))),
                    last_name=str(row.get('Last_Name', row.get('last_name', ''))),
                    email=str(row.get('Email', row.get('email', ''))),
                    phone=str(row.get('Phone', row.get('phone', ''))),
                    gender=str(row.get('Gender', row.get('gender', ''))),
                    age=int(row.get('Age', row.get('age', 0))) if pd.notna(row.get('Age', row.get('age'))) else None,
                    is_married=bool(row.get('Is_Married', row.get('is_married', False))),
                    address=str(row.get('Address', row.get('address', ''))),
                    merchant_address=int(row.get('Merchant_Address', row.get('merchant_address', 0))) if pd.notna(row.get('Merchant_Address')) else None,
                    state=str(row.get('State', row.get('state', ''))),
                    geo_location=str(row.get('GeoLocation', row.get('geo_location', ''))),
                    registered=pd.to_datetime(row.get('Registered', row.get('registered'))).date() if pd.notna(row.get('Registered')) else None,
                    account_holding=int(row.get('Account_Holding', row.get('account_holding', 0))) if pd.notna(row.get('Account_Holding')) else None,
                    loan_account=str(row.get('Loan_Account', row.get('loan_account', ''))),
                    current_balance=float(row.get('Current_Balance_(BHD)', row.get('current_balance', 0))) if pd.notna(row.get('Current_Balance_(BHD)')) else None,
                    income=float(row.get('Income_(BHD)', row.get('income', 0))) if pd.notna(row.get('Income_(BHD)')) else None,
                    orders=int(row.get('Orders', row.get('orders', 0))) if pd.notna(row.get('Orders')) else 0,
                    spent=float(row.get('Spent', row.get('spent', 0))) if pd.notna(row.get('Spent')) else 0.0,
                    job=str(row.get('Job', row.get('job', ''))),
                    hobbies=str(row.get('Hobbies', row.get('hobbies', ''))),
                    vulnerability=int(row.get('Vulnerability', row.get('vulnerability', 0))) if pd.notna(row.get('Vulnerability')) else 0,
                    device_id=str(row.get('Device_ID', row.get('device_id', '')))
                )
                customers.append(customer)
            
            # Bulk insert batch
            session.bulk_save_objects(customers)
            session.commit()
            total_inserted += len(customers)
            print(f"Inserted {total_inserted}/{len(df)} records")
        
        print(f"\nMigration completed successfully!")
        print(f"Total records inserted: {total_inserted}")
        
        # Verify
        final_count = session.query(Customer).count()
        print(f"Final record count in database: {final_count}")
        
    except Exception as e:
        session.rollback()
        print(f"Error during migration: {str(e)}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    migrate_customer_data()
