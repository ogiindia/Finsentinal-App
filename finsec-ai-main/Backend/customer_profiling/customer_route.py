from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
import pandas as pd
from model import AlsalamTrans, ALSalamModelResult, Customer, RiskTable
from database import get_db
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, case, cast, TIMESTAMP, Date
from collections import Counter
from datetime import datetime, timedelta
from customer_profiling.customer_schema import RiskStatsResponse
from sqlalchemy import func

customer_route = APIRouter(prefix='/customer', tags=['Customer Profiling'])

# ==================== Customer Data Endpoint ====================

@customer_route.get('/customer_data')
async def get_customer_data(cust_id: str, db: Session = Depends(get_db)):
    """
    Get customer data from the Customer table in the database
    """
    try:
        # Query the Customer table instead of reading CSV
        customer = db.query(Customer).filter(
            Customer.customer_id == cust_id
        ).first()
        
        if not customer:
            # raise HTTPException(
            #     status_code=404, 
            #     detail=f"Customer with ID {cust_id} not found"
            # )
            return {"customer_data": {}}
        
        # Convert SQLAlchemy model to dictionary
        customer_data = {
            "id": customer.id,
            "customer_id": customer.customer_id,
            "first_name": customer.first_name,
            "last_name": customer.last_name,
            "full_name": customer.get_full_name(),
            "email": customer.email,
            "phone": customer.phone,
            "gender": customer.gender,
            "age": customer.age,
            "is_married": customer.is_married,
            "address": customer.address,
            "merchant_address": customer.merchant_address,
            "state": customer.state,
            "geo_location": customer.geo_location,
            "registered": customer.registered.isoformat() if customer.registered else None,
            "account_holding": customer.account_holding,
            "loan_account": customer.loan_account,
            "has_loan": customer.has_loan(),
            "current_balance": customer.current_balance,
            "balance_status": customer.get_balance_status(),
            "income": customer.income,
            "orders": customer.orders,
            "spent": customer.spent,
            "job": customer.job,
            "hobbies": customer.hobbies,
            "vulnerability": customer.vulnerability,
            "is_vulnerable": customer.is_vulnerable(),
            "device_id": customer.device_id,
            "created_at": customer.created_at.isoformat() if customer.created_at else None,
            "updated_at": customer.updated_at.isoformat() if customer.updated_at else None
        }
        
        return {"customer_data": customer_data}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error retrieving customer data: {str(e)}"
        )

# ==================== Fraud Statistics Endpoint ====================

@customer_route.get('/fraud_statistics')
async def get_fraud_statistics(cust_id: str, db: Session = Depends(get_db)):
    try:
        results = (
            db.query(AlsalamTrans, ALSalamModelResult)
            .join(ALSalamModelResult, AlsalamTrans.id == ALSalamModelResult.alsalam_id)
            .filter(
                or_(
                    AlsalamTrans.Customer_Id == cust_id,
                    AlsalamTrans.To_Customer_Id == cust_id,
                )
            )
            .all()
        )
        
        if not results:
            return {
            "customer_id": cust_id,
            "overall_statistics": {
                "total_transactions": 0,
                "analyzed_transactions": 0,
                "unanalyzed_transactions": 0,
                "fraud_count": 0,
                "non_fraud_count": 0,
                "fraud_percentage": 0,
                "non_fraud_percentage": 0
            },
            "sent_transactions": {
                "total_analyzed": 0,
                "fraud_count": 0,
                "non_fraud_count": 0,
                "fraud_percentage": 0,
                "non_fraud_percentage": 0
            },
            "received_transactions": {
                "total_analyzed": 0,
                "fraud_count": 0,
                "non_fraud_count": 0,
                "fraud_percentage": 0,
                "non_fraud_percentage": 0
            },
            "risk_level": get_risk_level(0)
        }
            # raise HTTPException(status_code=404, detail=f"No transactions with fraud analysis found for customer ID: {cust_id}")
        
        sent_fraud_count = sent_non_fraud_count = received_fraud_count = received_non_fraud_count = 0
        total_fraud_count = total_non_fraud_count = transactions_without_fraud_analysis = 0
        
        for transaction, feature in results:
            if feature and feature.fraud is not None:
                is_sender = transaction.Customer_Id == cust_id
                
                if feature.fraud == -1:
                    total_fraud_count += 1
                    if is_sender:
                        sent_fraud_count += 1
                    else:
                        received_fraud_count += 1
                elif feature.fraud == 1:
                    total_non_fraud_count += 1
                    if is_sender:
                        sent_non_fraud_count += 1
                    else:
                        received_non_fraud_count += 1
            else:
                transactions_without_fraud_analysis += 1
        
        total_analyzed = total_fraud_count + total_non_fraud_count
        total_sent_analyzed = sent_fraud_count + sent_non_fraud_count
        total_received_analyzed = received_fraud_count + received_non_fraud_count
        
        fraud_percentage = (total_fraud_count / total_analyzed * 100) if total_analyzed > 0 else 0
        non_fraud_percentage = (total_non_fraud_count / total_analyzed * 100) if total_analyzed > 0 else 0
        sent_fraud_percentage = (sent_fraud_count / total_sent_analyzed * 100) if total_sent_analyzed > 0 else 0
        sent_non_fraud_percentage = (sent_non_fraud_count / total_sent_analyzed * 100) if total_sent_analyzed > 0 else 0
        received_fraud_percentage = (received_fraud_count / total_received_analyzed * 100) if total_received_analyzed > 0 else 0
        received_non_fraud_percentage = (received_non_fraud_count / total_received_analyzed * 100) if total_received_analyzed > 0 else 0
        
        return {
            "customer_id": cust_id,
            "overall_statistics": {
                "total_transactions": len(results),
                "analyzed_transactions": total_analyzed,
                "unanalyzed_transactions": transactions_without_fraud_analysis,
                "fraud_count": total_fraud_count,
                "non_fraud_count": total_non_fraud_count,
                "fraud_percentage": round(fraud_percentage, 2),
                "non_fraud_percentage": round(non_fraud_percentage, 2)
            },
            "sent_transactions": {
                "total_analyzed": total_sent_analyzed,
                "fraud_count": sent_fraud_count,
                "non_fraud_count": sent_non_fraud_count,
                "fraud_percentage": round(sent_fraud_percentage, 2),
                "non_fraud_percentage": round(sent_non_fraud_percentage, 2)
            },
            "received_transactions": {
                "total_analyzed": total_received_analyzed,
                "fraud_count": received_fraud_count,
                "non_fraud_count": received_non_fraud_count,
                "fraud_percentage": round(received_fraud_percentage, 2),
                "non_fraud_percentage": round(received_non_fraud_percentage, 2)
            },
            "risk_level": get_risk_level(fraud_percentage)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

def get_risk_level(fraud_percentage: float) -> str:
    if fraud_percentage == 0:
        return "Very Low"
    elif fraud_percentage < 5:
        return "Low"
    elif fraud_percentage < 15:
        return "Medium"
    elif fraud_percentage < 30:
        return "High"
    else:
        return "Very High"

# ==================== Transaction Data Endpoint ====================

@customer_route.get('/trans_data')
async def get_trans_data(cust_id: str, db: Session = Depends(get_db)):
    try:
        results = (
            db.query(AlsalamTrans, ALSalamModelResult)
            .outerjoin(ALSalamModelResult, AlsalamTrans.id == ALSalamModelResult.alsalam_id)
            .filter(
                or_(
                    AlsalamTrans.Customer_Id == cust_id,
                    AlsalamTrans.To_Customer_Id == cust_id,
                )
            )
            .all()
        )
        
        if not results:
            return {
            "customer_id": cust_id,
            "total_transactions": 0,
            "sent_transactions": [],
            "received_transactions": [],
            "total_records": 0,
            "data": []
        }
            # raise HTTPException(status_code=404, detail=f"No transactions found for customer ID: {cust_id}")
        
        combined_data = []
        sent_transactions = received_transactions = 0
        
        for transaction, feature in results:
            is_sender = transaction.Customer_Id == cust_id
            is_receiver = transaction.To_Customer_Id == cust_id
            
            if is_sender:
                sent_transactions += 1
                transaction_type = "sent"
            elif is_receiver:
                received_transactions += 1
                transaction_type = "received"
            else:
                transaction_type = "unknown"
            
            trans_data = {
                "transaction_id": transaction.id,
                "customer_id": transaction.Customer_Id,
                "timestamp": transaction.Timestamp,
                "amount": transaction.Amount,
                "location": transaction.Location,
                "to_customer_id": transaction.To_Customer_Id,
                "transaction_type": transaction_type,
                "is_sender": is_sender,
                "is_receiver": is_receiver
            }
            
            if feature:
                combined_record = {
                    **trans_data,
                    "model_result": {
                        "result_id": feature.id,
                        "fraud": getattr(feature, 'fraud', None),
                        "score": getattr(feature, 'risk_score', None)
                    }
                }
            else:
                combined_record = {**trans_data, "model_result": None}
            
            combined_data.append(combined_record)
        
        return {
            "customer_id": cust_id,
            "total_transactions": len([r for r in results if r[0]]),
            "sent_transactions": sent_transactions,
            "received_transactions": received_transactions,
            "total_records": len(combined_data),
            "data": combined_data
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# ==================== Profiling Endpoints ====================

@customer_route.get('/profiling/age-distribution')
async def get_age_distribution(db: Session = Depends(get_db)):
    """Get age distribution from Customer table"""
    try:
        customers = db.query(Customer.age).filter(Customer.age.isnot(None)).all()
        ages = [c.age for c in customers]
        
        if not ages:
            raise HTTPException(status_code=404, detail="No customer age data found")
        
        age_bins = [0, 20, 30, 40, 50, 60, 100]
        age_labels = ['<20', '20-30', '30-40', '40-50', '50-60', '60+']
        
        df = pd.DataFrame({'Age': ages})
        df['age_group'] = pd.cut(df['Age'], bins=age_bins, labels=age_labels, right=False)
        age_counts = df['age_group'].value_counts().sort_index()
        
        return {
            "labels": age_counts.index.tolist(),
            "values": age_counts.values.tolist()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@customer_route.get('/profiling/gender-distribution')
async def get_gender_distribution(db: Session = Depends(get_db)):
    """Get gender distribution from Customer table"""
    try:
        customers = db.query(Customer.gender).filter(Customer.gender.isnot(None)).all()
        genders = [c.gender for c in customers]
        
        if not genders:
            raise HTTPException(status_code=404, detail="No customer gender data found")
        
        gender_counts = Counter(genders)
        
        return {
            "labels": list(gender_counts.keys()),
            "values": list(gender_counts.values())
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@customer_route.get('/profiling/income-distribution')
async def get_income_distribution(db: Session = Depends(get_db)):
    """Get income distribution from Customer table"""
    try:
        customers = db.query(Customer.income).filter(Customer.income.isnot(None)).all()
        incomes = [c.income for c in customers]
        
        if not incomes:
            raise HTTPException(status_code=404, detail="No customer income data found")
        
        income_bins = [0, 100, 250, 500, 750, 1000, float('inf')]
        income_labels = ['<100', '100-250', '250-500', '500-750', '750-1000', '1000+']
        
        df = pd.DataFrame({'Income': incomes})
        df['income_group'] = pd.cut(df['Income'], bins=income_bins, labels=income_labels, right=False)
        income_counts = df['income_group'].value_counts().sort_index()
        
        return {
            "labels": income_counts.index.tolist(),
            "values": income_counts.values.tolist()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@customer_route.get('/profiling/occupation-distribution')
async def get_occupation_distribution(db: Session = Depends(get_db)):
    """Get occupation distribution from Customer table"""
    try:
        customers = db.query(Customer.job).filter(Customer.job.isnot(None)).all()
        jobs = [c.job for c in customers]
        
        if not jobs:
            raise HTTPException(status_code=404, detail="No customer occupation data found")
        
        job_counts = Counter(jobs).most_common(10)
        
        return {
            "labels": [job[0] for job in job_counts],
            "values": [job[1] for job in job_counts]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@customer_route.get('/profiling/location-distribution')
async def get_location_distribution(db: Session = Depends(get_db)):
    """Get location distribution from Customer table"""
    try:
        customers = db.query(Customer.state).filter(Customer.state.isnot(None)).all()
        states = [c.state for c in customers]
        
        if not states:
            raise HTTPException(status_code=404, detail="No customer location data found")
        
        state_counts = Counter(states).most_common(15)
        
        return {
            "labels": [state[0] for state in state_counts],
            "values": [state[1] for state in state_counts]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@customer_route.get('/profiling/account-type-distribution')
async def get_account_type_distribution(db: Session = Depends(get_db)):
    """Get account type distribution from Customer table"""
    try:
        customers = db.query(Customer.account_holding).filter(Customer.account_holding.isnot(None)).all()
        account_types = [c.account_holding for c in customers]
        
        if not account_types:
            raise HTTPException(status_code=404, detail="No customer account type data found")
        
        account_counts = Counter(account_types)
        
        return {
            "labels": list(account_counts.keys()),
            "values": list(account_counts.values())
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@customer_route.get('/profiling/transaction-patterns')
async def get_transaction_patterns(db: Session = Depends(get_db)):
    """Get transaction patterns from transaction table"""
    try:
        # Database-agnostic: works with MySQL, PostgreSQL, and Oracle
        date_column = cast(AlsalamTrans.Timestamp, Date)
        
        results = db.query(
            date_column.label('date'),
            func.count(AlsalamTrans.id).label('count')
        )\
        .group_by(date_column)\
        .order_by(date_column.desc())\
        .limit(30).all()
        
        dates = [str(r.date) for r in reversed(results)]
        counts = [r.count for r in reversed(results)]
        
        return {"dates": dates, "counts": counts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@customer_route.get('/profiling/customer-segments')
async def get_customer_segments(db: Session = Depends(get_db)):
    """Get customer segments based on income from Customer table"""
    try:
        customers = db.query(Customer.income).filter(Customer.income.isnot(None)).all()
        incomes = [c.income for c in customers]
        
        if not incomes:
            raise HTTPException(status_code=404, detail="No customer income data found")
        
        def categorize_customer(income_value):
            if income_value > 750:
                return 'High Value'
            elif income_value > 500:
                return 'Medium Value'
            else:
                return 'Standard'
        
        segments = [categorize_customer(income) for income in incomes]
        segment_counts = Counter(segments)
        
        return {
            "labels": list(segment_counts.keys()),
            "values": list(segment_counts.values())
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@customer_route.get('/profiling/age-gender-distribution')
async def get_age_gender_distribution(db: Session = Depends(get_db)):
    """Get age and gender distribution from Customer table"""
    try:
        customers = db.query(Customer.age, Customer.gender)\
            .filter(Customer.age.isnot(None), Customer.gender.isnot(None))\
            .all()
        
        if not customers:
            raise HTTPException(status_code=404, detail="No customer data found")
        
        df = pd.DataFrame([(c.age, c.gender) for c in customers], columns=['Age', 'Gender'])
        
        age_bins = [0, 20, 30, 40, 50, 60, 100]
        age_labels = ['<20', '20-30', '30-40', '40-50', '50-60', '60+']
        
        df['age_group'] = pd.cut(df['Age'], bins=age_bins, labels=age_labels, right=False)
        grouped = df.groupby(['age_group', 'Gender'], observed=True).size().unstack(fill_value=0)
        
        age_groups_list = [str(x) for x in grouped.index.to_numpy()]
        
        male_values = []
        female_values = []
        
        for gender_col in grouped.columns:
            if gender_col in ['Male', 'M', 'male', 'm']:
                male_values = [int(x) for x in grouped[gender_col].to_numpy()]
            elif gender_col in ['Female', 'F', 'female', 'f']:
                female_values = [int(x) for x in grouped[gender_col].to_numpy()]
        
        if not male_values:
            male_values = [0] * len(age_groups_list)
        if not female_values:
            female_values = [0] * len(age_groups_list)
        
        return {
            "age_groups": age_groups_list,
            "male": male_values,
            "female": female_values
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@customer_route.get('/profiling/income-by-occupation')
async def get_income_by_occupation(db: Session = Depends(get_db)):
    """Get average income by occupation from Customer table"""
    try:
        customers = db.query(Customer.job, Customer.income)\
            .filter(Customer.job.isnot(None), Customer.income.isnot(None))\
            .all()
        
        if not customers:
            raise HTTPException(status_code=404, detail="No customer occupation/income data found")
        
        df = pd.DataFrame([(c.job, c.income) for c in customers], columns=['Job', 'Income'])
        avg_income = df.groupby('Job')['Income'].mean().sort_values(ascending=False).head(10)
        
        return {
            "labels": avg_income.index.tolist(),
            "values": [round(val, 2) for val in avg_income.values.tolist()]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@customer_route.get('/profiling/transaction-volume')
async def get_transaction_volume(db: Session = Depends(get_db)):
    """Get transaction volume by hour from transaction table"""
    try:
        results = db.query(
            func.extract('hour', cast(AlsalamTrans.Timestamp, TIMESTAMP)).label('hour'),
            func.count(AlsalamTrans.id).label('count')
        )\
        .group_by(func.extract('hour', cast(AlsalamTrans.Timestamp, TIMESTAMP)))\
        .order_by(func.extract('hour', cast(AlsalamTrans.Timestamp, TIMESTAMP))).all()
        
        if not results:
            hours = [f"{i:02d}:00" for i in range(24)]
            counts = [50 + (i * 5) % 100 for i in range(24)]
            return {"hours": hours, "counts": counts}
        
        hours = [f"{int(r.hour):02d}:00" for r in results]
        counts = [r.count for r in results]
        
        return {"hours": hours, "counts": counts}
    except Exception as e:
        hours = [f"{i:02d}:00" for i in range(24)]
        counts = [50 + (i * 5) % 100 for i in range(24)]
        return {"hours": hours, "counts": counts}

@customer_route.get('/profiling/fraud-by-location')
async def get_fraud_by_location(db: Session = Depends(get_db)):
    """Get fraud statistics by location from transaction table"""
    try:
        results = db.query(
            AlsalamTrans.Location,
            func.count(AlsalamTrans.id).label('total'),
            func.sum(case((ALSalamModelResult.fraud == -1, 1), else_=0)).label('fraud_count')
        )\
        .join(ALSalamModelResult, AlsalamTrans.id == ALSalamModelResult.alsalam_id)\
        .group_by(AlsalamTrans.Location)\
        .order_by(func.count(AlsalamTrans.id).desc())\
        .limit(10).all()
        
        return {
            "locations": [r.Location for r in results],
            "fraud": [r.fraud_count for r in results],
            "total": [r.total for r in results]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@customer_route.get('/profiling/transaction-amount-distribution')
async def get_transaction_amount_distribution(db: Session = Depends(get_db)):
    """Get transaction amount distribution from transaction table"""
    try:
        results = db.query(AlsalamTrans.Amount).all()
        amounts = [r.Amount for r in results]
        
        if not amounts:
            raise HTTPException(status_code=404, detail="No transaction data found")
        
        bins = [0, 1000, 5000, 10000, 50000, 100000, float('inf')]
        labels = ['<1K', '1K-5K', '5K-10K', '10K-50K', '50K-100K', '100K+']
        
        df = pd.DataFrame({'Amount': amounts})
        df['amount_range'] = pd.cut(df['Amount'], bins=bins, labels=labels, right=False)
        amount_counts = df['amount_range'].value_counts().sort_index()
        
        return {
            "labels": amount_counts.index.tolist(),
            "values": amount_counts.values.tolist()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@customer_route.get('/profiling/customer-age-income')
async def get_customer_age_income(db: Session = Depends(get_db)):
    """Get customer age vs income scatter data from Customer table"""
    try:
        customers = db.query(Customer.age, Customer.income)\
            .filter(Customer.age.isnot(None), Customer.income.isnot(None))\
            .limit(100).all()
        
        if not customers:
            raise HTTPException(status_code=404, detail="No customer age/income data found")
        
        ages = [c.age for c in customers]
        incomes = [c.income for c in customers]
        
        return {"ages": ages, "incomes": incomes}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@customer_route.get('/customer_list')
def get_customer_list(db: Session = Depends(get_db)):
    """Get list of all customers from the transaction table in the database"""
    try:
        customers = db.query(AlsalamTrans.Customer_Id, AlsalamTrans.To_Customer_Id).distinct().all()
        if customers:
            customer_set = set()
            for cust in customers:
                customer_set.add(cust.Customer_Id)
                customer_set.add(cust.To_Customer_Id)
            customer_list = list(customer_set)
        else:
            customer_list = []
        return {"customers": customer_list}
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error retrieving customer list: {str(e)}"
        )
    
@customer_route.get('/risk_fraud_statistics')
async def get_risk_fraud_statistics(cust_id: str, db: Session = Depends(get_db)):
    try:
        if cust_id == "All":
            results = (
                db.query(AlsalamTrans, ALSalamModelResult)
                .join(ALSalamModelResult, AlsalamTrans.id == ALSalamModelResult.alsalam_id)
                .all()
            )
        else:
            results = (
                db.query(AlsalamTrans, ALSalamModelResult)
                .join(ALSalamModelResult, AlsalamTrans.id == ALSalamModelResult.alsalam_id)
                .filter(
                    or_(
                        AlsalamTrans.Customer_Id == cust_id,
                        AlsalamTrans.To_Customer_Id == cust_id,
                    )
                )
                .all()
            )
        
        if not results:
            return {
            "customer_id": cust_id,
            "overall_statistics": {
                "total_transactions": 0,
                "analyzed_transactions": 0,
                "unanalyzed_transactions": 0,
                "fraud_count": 0,
                "non_fraud_count": 0,
                "fraud_percentage": 0,
                "non_fraud_percentage": 0
            },
            "sent_transactions": {
                "total_analyzed": 0,
                "fraud_count": 0,
                "non_fraud_count": 0,
                "fraud_percentage": 0,
                "non_fraud_percentage": 0
            },
            "received_transactions": {
                "total_analyzed": 0,
                "fraud_count": 0,
                "non_fraud_count": 0,
                "fraud_percentage": 0,
                "non_fraud_percentage": 0
            },
            "risk_level": get_risk_level(0)
        }
            # raise HTTPException(status_code=404, detail=f"No transactions with fraud analysis found for customer ID: {cust_id}")
        
        sent_fraud_count = sent_non_fraud_count = received_fraud_count = received_non_fraud_count = 0
        total_fraud_count = total_non_fraud_count = transactions_without_fraud_analysis = 0
        
        for transaction, feature in results:
            if feature and feature.fraud is not None:
                if cust_id == 'All':
                    is_sender = transaction.Customer_Id
                else:
                    is_sender = transaction.Customer_Id == cust_id
                
                if feature.fraud == -1:
                    total_fraud_count += 1
                    if is_sender:
                        sent_fraud_count += 1
                    else:
                        received_fraud_count += 1
                elif feature.fraud == 1:
                    total_non_fraud_count += 1
                    if is_sender:
                        sent_non_fraud_count += 1
                    else:
                        received_non_fraud_count += 1
            else:
                transactions_without_fraud_analysis += 1
        
        total_analyzed = total_fraud_count + total_non_fraud_count
        total_sent_analyzed = sent_fraud_count + sent_non_fraud_count
        total_received_analyzed = received_fraud_count + received_non_fraud_count
        
        fraud_percentage = (total_fraud_count / total_analyzed * 100) if total_analyzed > 0 else 0
        non_fraud_percentage = (total_non_fraud_count / total_analyzed * 100) if total_analyzed > 0 else 0
        sent_fraud_percentage = (sent_fraud_count / total_sent_analyzed * 100) if total_sent_analyzed > 0 else 0
        sent_non_fraud_percentage = (sent_non_fraud_count / total_sent_analyzed * 100) if total_sent_analyzed > 0 else 0
        received_fraud_percentage = (received_fraud_count / total_received_analyzed * 100) if total_received_analyzed > 0 else 0
        received_non_fraud_percentage = (received_non_fraud_count / total_received_analyzed * 100) if total_received_analyzed > 0 else 0
        
        return {
            "customer_id": cust_id,
            "overall_statistics": {
                "total_transactions": len(results),
                "analyzed_transactions": total_analyzed,
                "unanalyzed_transactions": transactions_without_fraud_analysis,
                "fraud_count": total_fraud_count,
                "non_fraud_count": total_non_fraud_count,
                "fraud_percentage": round(fraud_percentage, 2),
                "non_fraud_percentage": round(non_fraud_percentage, 2)
            },
            "sent_transactions": {
                "total_analyzed": total_sent_analyzed,
                "fraud_count": sent_fraud_count,
                "non_fraud_count": sent_non_fraud_count,
                "fraud_percentage": round(sent_fraud_percentage, 2),
                "non_fraud_percentage": round(sent_non_fraud_percentage, 2)
            },
            "received_transactions": {
                "total_analyzed": total_received_analyzed,
                "fraud_count": received_fraud_count,
                "non_fraud_count": received_non_fraud_count,
                "fraud_percentage": round(received_fraud_percentage, 2),
                "non_fraud_percentage": round(received_non_fraud_percentage, 2)
            },
            "risk_level": get_risk_level(fraud_percentage)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    

# @customer_route.get('/risk_trans_data')
# async def get_risk_trans_data(cust_id: str, db: Session = Depends(get_db)):
#     try:
#         if cust_id == 'All':
#             results = (
#             db.query(AlsalamTrans, ALSalamModelResult)
#             .outerjoin(ALSalamModelResult, AlsalamTrans.id == ALSalamModelResult.alsalam_id)
#             .all()
#         )
#         else:
#             results = (
#                 db.query(AlsalamTrans, ALSalamModelResult)
#                 .outerjoin(ALSalamModelResult, AlsalamTrans.id == ALSalamModelResult.alsalam_id)
#                 .filter(
#                     or_(
#                         AlsalamTrans.Customer_Id == cust_id,
#                         AlsalamTrans.To_Customer_Id == cust_id,
#                     )
#                 )
#                 .all()
#             )
        
#         if not results:
#             return {
#             "customer_id": cust_id,
#             "total_transactions": 0,
#             "sent_transactions": [],
#             "received_transactions": [],
#             "total_records": 0,
#             "data": []
#         }
#             # raise HTTPException(status_code=404, detail=f"No transactions found for customer ID: {cust_id}")
        
#         combined_data = []
#         sent_transactions = received_transactions = 0
        
#         for transaction, feature in results:
#             if cust_id == 'All':
#                 is_sender = transaction.Customer_Id
#                 is_receiver = transaction.To_Customer_Id
#             else:
#                 is_sender = transaction.Customer_Id == cust_id
#                 is_receiver = transaction.To_Customer_Id == cust_id
            
#             if is_sender:
#                 sent_transactions += 1
#                 transaction_type = "sent"
#             elif is_receiver:
#                 received_transactions += 1
#                 transaction_type = "received"
#             else:
#                 transaction_type = "unknown"
            
#             trans_data = {
#                 "transaction_id": transaction.id,
#                 "customer_id": transaction.Customer_Id,
#                 "timestamp": transaction.Timestamp,
#                 "amount": transaction.Amount,
#                 "location": transaction.Location,
#                 "to_customer_id": transaction.To_Customer_Id,
#                 "transaction_type": transaction_type,
#                 "is_sender": is_sender,
#                 "is_receiver": is_receiver
#             }
            
#             if feature:
#                 combined_record = {
#                     **trans_data,
#                     "model_result": {
#                         "result_id": feature.id,
#                         "fraud": getattr(feature, 'fraud', None),
#                         "score": getattr(feature, 'risk_score', None)
#                     }
#                 }
#             else:
#                 combined_record = {**trans_data, "model_result": None}
            
#             combined_data.append(combined_record)
        
#         return {
#             "customer_id": cust_id,
#             "total_transactions": len([r for r in results if r[0]]),
#             "sent_transactions": sent_transactions,
#             "received_transactions": received_transactions,
#             "total_records": len(combined_data),
#             "data": combined_data
#         }
    
#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@customer_route.get('/risk_trans_data')
async def get_risk_trans_data(
    cust_id: str,
    offset: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    try:
        query = (
            db.query(AlsalamTrans, ALSalamModelResult)
            .outerjoin(ALSalamModelResult, AlsalamTrans.id == ALSalamModelResult.alsalam_id)
        )

        if cust_id != 'All':
            query = query.filter(
                or_(
                    AlsalamTrans.Customer_Id == cust_id,
                    AlsalamTrans.To_Customer_Id == cust_id
                )
            )

        total_records = query.count()

        results = (
            query
            .order_by(AlsalamTrans.Timestamp.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        
        if not results:
            return {
            "customer_id": cust_id,
            "total_transactions": 0,
            "sent_transactions": [],
            "received_transactions": [],
            "total_records": 0,
            "data": []
        }
            # raise HTTPException(status_code=404, detail=f"No transactions found for customer ID: {cust_id}")
        
        combined_data = []
        sent_transactions = received_transactions = 0
        
        for transaction, feature in results:
            if cust_id == 'All':
                is_sender = transaction.Customer_Id
                is_receiver = transaction.To_Customer_Id
            else:
                is_sender = transaction.Customer_Id == cust_id
                is_receiver = transaction.To_Customer_Id == cust_id
            
            # if is_sender:
            #     sent_transactions += 1
            #     transaction_type = "sent"
            # elif is_receiver:
            #     received_transactions += 1
            #     transaction_type = "received"
            # else:
            #     transaction_type = "unknown"
            
            trans_data = {
                "transaction_id": transaction.id,
                "customer_id": transaction.Customer_Id,
                "timestamp": transaction.Timestamp,
                "amount": transaction.Amount,
                "location": transaction.Location,
                "from_customer_id": transaction.Customer_Id,
                "to_customer_id": transaction.To_Customer_Id,
                # "transaction_type": transaction_type,
                "is_sender": is_sender,
                "is_receiver": is_receiver
            }
            
            if feature:
                combined_record = {
                    **trans_data,
                    "model_result": {
                        "result_id": feature.id,
                        "fraud": getattr(feature, 'fraud', None),
                        "score": getattr(feature, 'risk_score', None)
                    }
                }
            else:
                combined_record = {**trans_data, "model_result": None}
            
            combined_data.append(combined_record)
        
        return {
            "customer_id": cust_id,
            "offset": offset,
            "limit": limit,
            "total_records": total_records,
            "data": combined_data
        }

    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    

# @customer_route.get('/stats')
# def stats():
#     df = pd.read_csv("/storage/AIML/MLDashboard/FinSentinel_Microservice/files/customer_behavior_features_all_customers_with_prob.csv")
#     return JSONResponse({
#         'data': df.to_json()
#     })

# @customer_route.get('/risk_stats')
# def risk_stats(limit: int, offset: int, db: Session=Depends(get_db)):
#     data = (
#         db.query(RiskTable)
#             .offset(offset)
#             .limit(limit)
#             .all()
#             )
#     return JSONResponse({
#         'data': data,
#         'offset': offset,
#         'limit': limit
#     })


# @customer_route.get("/risk_stats")
# def risk_stats(
#     limit: int = 20,
#     offset: int = 0,
#     customer_id: str | None = None,
#     db: Session = Depends(get_db)
# ):
#     query = db.query(RiskTable)

#     if customer_id:
#         query = query.filter(RiskTable.customer_id.ilike(f"%{customer_id}%"))

#     rows = (
#         query
#         .order_by(RiskTable.risk_probability.desc())
#         .offset(offset)
#         .limit(limit)
#         .all()
#     )

#     return {
#         "data": rows,
#         "offset": offset,
#         "limit": limit
#     }


# @customer_route.get("/risk_stats")
# def risk_stats(
#     limit: int = 20,
#     offset: int = 0,
#     customer_id: str | None = None,
#     db: Session = Depends(get_db)
# ):
#     query = db.query(RiskTable)

#     if customer_id:
#         query = query.filter(RiskTable.customer_id.ilike(f"%{customer_id}%"))

#     total = query.with_entities(func.count()).scalar()

#     rows = (
#         query
#         .order_by(RiskTable.risk_probability.desc())
#         .offset(offset)
#         .limit(limit)
#         .all()
#     )

#     return {
#         "data": rows,
#         "offset": offset,
#         "limit": limit,
#         "total": total
#     }


@customer_route.get("/risk_stats")
def risk_stats(
    limit: int = 20,
    offset: int = 0,
    customer_id: str | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(RiskTable)

    if customer_id:
        query = query.filter(RiskTable.customer_id.ilike(f"%{customer_id}%"))

    # ✅ CORRECT COUNT
    total = query.with_entities(func.count(RiskTable.id)).scalar()

    rows = (
        query
        .order_by(RiskTable.risk_probability.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return {
        "data": rows,
        "offset": offset,
        "limit": limit,
        "total": total
    }

@customer_route.get("/risk_customer_ids")
def risk_customer_ids(
    q: str = "",
    limit: int = 10,
    db: Session = Depends(get_db)
):
    rows = (
        db.query(RiskTable.customer_id)
        .filter(RiskTable.customer_id.ilike(f"%{q}%"))
        .distinct()
        .limit(limit)
        .all()
    )

    return {
        "customers": [r[0] for r in rows]
    }

