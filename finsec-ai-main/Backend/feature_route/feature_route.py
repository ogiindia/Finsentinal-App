from fastapi import APIRouter, Depends, Body
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy.sql import select
from database import get_db
from utils.log_utils import session_logger as logger
import pandas as pd
from config import FEATURE_DIR
from model import FeatureTable
from datetime import datetime

feature_route = APIRouter(prefix='/feature', tags=['Features'])

@feature_route.get('/channel_list')
def channel_list():
    try:
        channel = ['AEPS', 'ATM_POS_ECOM', 'IB', 'MB']
        return JSONResponse({
            'status': 'Success',
            'channels': channel
        })
    except Exception as e:
        logger.log_error(f"Something went wrong!!: {e}")
        return JSONResponse({
            "Status": "Failed",
            "channels": []
        })
    
@feature_route.get('/features')
def features(channel: str):
    try:
        if channel in ['AEPS', 'ATM_POS_ECOM', 'IB', 'MB']:
            df = pd.read_csv(f'{FEATURE_DIR}/uco_{channel.lower()}.csv')
            return JSONResponse(df.to_dict())
        else:
            logger.log_error(f'Something went wrong: Channel not found')
            return JSONResponse({
                'status':'Failed',
                'message':'Channel not found'
                })
    except Exception as e:
        logger.log_error(f'Something went wrong: {e}')
        return JSONResponse({
                'status':'Failed',
                'message':f'Something went wrong: {e}'
                })
    
@feature_route.get('/channels_v2')
def channels_v2(db: Session = Depends(get_db)):
    try:  
        channels = db.execute(
            select(FeatureTable.channel).distinct()
        ).scalars().all()
        return channels

    except Exception as e:
        return JSONResponse({
            'status': 'Failed',
            'data': f'Something went wrong: {e}'
        })
    

@feature_route.get("/features_details")
def features_details(channel: str, db: Session = Depends(get_db)):
    try:
        data = (
            db.query(FeatureTable)
            .filter(FeatureTable.channel == channel)
            .all()
        )

        if not data:
            return JSONResponse(
                status_code=404,
                content={
                    "status": "Failed",
                    "data": [],
                    "message": "Data Not Found",
                },
            )

        result = [
            {
                "id": item.id,
                "name": item.name,
                "description": item.description,
                "channel": item.channel,
                "query": item.Query,
                "workflow_id": item.workflow_id,
                "created_at": item.created_at,
                "updated_at": item.updated_at,
            }
            for item in data
        ]

        return {
            "status": "Success",
            "data": result,
            "count": len(result),
        }

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "status": "Error",
                "message": str(e),
            },
        )

@feature_route.post("/features_details")
def add_feature(
    payload: dict = Body(...),
    db: Session = Depends(get_db)
):
    try:
        channel = payload["channel"]
        feature = FeatureTable(
            name=payload["name"],
            description=payload.get("description"),
            channel=channel.upper(),
            Query=payload.get("query") if payload.get("query") else None,
            workflow_id=payload.get("workflow_id") if payload.get("workflow_id") else None,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(feature)
        db.commit()
        db.refresh(feature)

        return {
            "status": "Success",
            "message": "Feature added successfully",
            "id": feature.id,
        }

    except Exception as e:
        db.rollback()
        return JSONResponse(
            status_code=500,
            content={"status": "Error", "message": str(e)},
        )


@feature_route.put("/features_details/{feature_id}")
def update_feature(
    feature_id: int,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
):
    try:
        feature = db.query(FeatureTable).filter(FeatureTable.id == feature_id).first()

        if not feature:
            return JSONResponse(
                status_code=404,
                content={"status": "Failed", "message": "Feature not found"},
            )

        feature.name = payload.get("name", feature.name)
        feature.description = payload.get("description", feature.description)
        feature.Query = payload.get("query", feature.Query)
        feature.workflow_id = payload.get("workflow_id", feature.workflow_id)
        feature.updated_at = datetime.utcnow()

        db.commit()

        return {"status": "Success", "message": "Feature updated successfully"}

    except Exception as e:
        db.rollback()
        return JSONResponse(
            status_code=500,
            content={"status": "Error", "message": str(e)},
        )



@feature_route.delete("/features_details/{feature_id}")
def delete_feature(
    feature_id: int,
    db: Session = Depends(get_db),
):
    try:
        feature = db.query(FeatureTable).filter(FeatureTable.id == feature_id).first()

        if not feature:
            return JSONResponse(
                status_code=404,
                content={"status": "Failed", "message": "Feature not found"},
            )

        db.delete(feature)
        db.commit()

        return {"status": "Success", "message": "Feature deleted successfully"}

    except Exception as e:
        db.rollback()
        return JSONResponse(
            status_code=500,
            content={"status": "Error", "message": str(e)},
        )
    