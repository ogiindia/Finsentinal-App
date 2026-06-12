from model import AlertCategoryFile
from pathlib import Path
import httpx
from sqlalchemy.orm import Session
import json
from datetime import datetime
from config import settings, ALERT_DIR
from database import SessionLocal
from utils.log_utils import session_logger as logger
from alert.alert_schema import UpdateAlertRequest


def get_base_url(settings) -> str:
    return f"https://{settings.EXTERNAL_API_IP}:{settings.EXTERNAL_API_PORT}/cm-new-gen"

async def get_http_client(settings):
    return httpx.AsyncClient(verify=settings.VERIFY_SSL, timeout=settings.REQUEST_TIMEOUT, headers={"User-Agent": f"{settings.API_TITLE}/{settings.API_VERSION}"})

async def service_login(settings) -> str:
    login_url = f"{get_base_url(settings)}/api/auth/signin"
    payload = {
        "username": settings.API_USERNAME,
        "password": settings.API_PASSWORD,
        "domain": settings.API_DOMAIN
    }

    async with await get_http_client(settings) as client:
        response = await client.post(login_url, json=payload)

    if response.status_code != 200:
        raise RuntimeError("Service login failed")

    token = response.json().get("accessToken")
    if not token:
        raise RuntimeError("Access token missing")

    return token


async def fetch_categories(settings, token: str) -> list:
    url = f"{get_base_url(settings)}/alertCategory/byUser"
    headers = {"Authorization": f"Bearer {token}"}

    async with await get_http_client(settings) as client:
        response = await client.get(url, headers=headers)

    if response.status_code != 200:
        return []

    data = response.json()
    return data.get("categories", data) if isinstance(data, dict) else data


def get_existing_categories(db: Session) -> set:
    return {
        row.alertcategory
        for row in db.query(AlertCategoryFile.alertcategory).all()
    }


async def fetch_alerts_for_category(settings, token, category_title: str):
    url = f"{get_base_url(settings)}/finder/external/Alert"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    payload = {
        "selectedDetails": "true",
        "selectedFieldName": [
            "Extr_cr_trxn_amount", "Title", "PRIORITY", "STATUS",
            "CLOSEDATE", "CLOSEREASON", "LEVEL", "ASSIGNEDTO"
        ],
        "queryFilter": f'[[\"CATEGORYFULLTITLE\",\"=\",\"{category_title}\"]]'
    }

    async with await get_http_client(settings) as client:
        response = await client.post(url, headers=headers, json=payload)

    return response.json() if response.status_code == 200 else None


# def save_category_json(category: str, data: list, base_dir: Path) -> str:
#     safe_name = "".join(c if c.isalnum() else "_" for c in category)
#     path = base_dir / f"{safe_name}.json"
#     logger.log_info(data)

#     payload = {
#         "category": category,
#         "fetched_at": datetime.utcnow().isoformat(),
#         "data": data
#     }

#     with open(path, "w", encoding="utf-8") as f:
#         json.dump(payload, f, indent=2, ensure_ascii=False)

#     return str(path)

def save_category_json(category: str, data: list, base_dir: Path) -> str:
    safe_name = "".join(c if c.isalnum() else "_" for c in category)
    path = base_dir / f"{safe_name}.json"

    enriched_data = []

    for item in data:
        # Parse details JSON string safely
        try:
            details_list = json.loads(item.get("details", "[]"))
        except json.JSONDecodeError:
            details_list = []

        # Build index for quick replacement
        details_index = {
            d.get("displayName"): d for d in details_list if "displayName" in d
        }

        # Merge fieldsValues into details
        for key, value in (item.get("fieldsValues") or {}).items():
            if key in details_index:
                details_index[key]["value"] = value
            else:
                details_list.append({
                    "displayName": key,
                    "value": value
                })

        # Update item
        updated_item = dict(item)
        updated_item["details"] = json.dumps(details_list, ensure_ascii=False)

        enriched_data.append(updated_item)

    payload = {
        "category": category,
        "fetched_at": datetime.utcnow().isoformat(),
        "data": enriched_data
    }

    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    return str(path)


async def sync_new_categories_task(app):
    settings = app.state.settings
    # SessionLocal = app.state.db_session

    token = await service_login(settings)
    categories = await fetch_categories(settings, token)

    db = SessionLocal()
    existing = get_existing_categories(db)

    new_categories = [
        c.get("title") for c in categories
        if c.get("title") not in existing
    ]

    base_dir = Path(ALERT_DIR)
    base_dir.mkdir(exist_ok=True)

    for category in new_categories:
        alerts = await fetch_alerts_for_category(settings, token, category)
        if not alerts:
            continue

        filepath = save_category_json(category, alerts, base_dir)

        db.add(AlertCategoryFile(
            alertcategory=category,
            filepath=filepath
        ))
        db.commit()

    db.close()


async def sync_new_categories_task_v2(app):
    settings = app.state.settings
    logger.log_info("🚀 Background alert sync started (FULL REFRESH)")

    db = SessionLocal()

    try:
        # Login
        logger.log_info("🔐 Service login started")
        token = await service_login(settings)
        logger.log_info("✅ Service login successful")

        # Fetch categories
        categories = await fetch_categories(settings, token)
        logger.log_info(f"📂 Total categories fetched: {len(categories)}")

        base_dir = Path(ALERT_DIR)
        base_dir.mkdir(exist_ok=True)

        for idx, cat in enumerate(categories, start=1):
            category = cat.get("title")
            if not category:
                continue

            logger.log_info(f"➡️ [{idx}/{len(categories)}] Processing category: {category}")

            try:
                # Fetch alerts
                alerts = await fetch_alerts_for_category(settings, token, category)

                if alerts is None:
                    logger.log_warning(f"⚠️ No response for category: {category}")
                    continue

                logger.log_info(
                    f"📦 Alerts fetched for {category}: "
                    f"{len(alerts) if isinstance(alerts, list) else 1}"
                )

                # Save / overwrite JSON
                filepath = save_category_json(category, alerts, base_dir)
                logger.log_info(f"💾 JSON updated: {filepath}")

                # UPSERT DB record
                record = (
                    db.query(AlertCategoryFile)
                    .filter(AlertCategoryFile.alertcategory == category)
                    .first()
                )

                if record:
                    record.filepath = filepath
                    record.last_updated = datetime.utcnow()
                    logger.log_info(f"🔁 DB record updated for: {category}")
                else:
                    db.add(AlertCategoryFile(
                        alertcategory=category,
                        filepath=filepath
                    ))
                    logger.log_info(f"🆕 DB record created for: {category}")

                db.commit()

            except Exception as e:
                db.rollback()
                logger.log_error(
                    f"❌ Failed processing category {category}: {str(e)}",
                    exc_info=True
                )

        logger.log_info("🎯 Background alert sync completed successfully")

    except Exception as e:
        logger.log_error(f"🔥 Alert sync failed: {str(e)}", exc_info=True)

    finally:
        db.close()
        logger.log_info("🔚 DB session closed")



# async def update_alert(settings, token, request):
#     url = f"{get_base_url(settings)}/alert/alertaction/"
#     headers = {
#         "Authorization": f"Bearer {token}",
#         "Content-Type": "application/json"
#     }
#     payload = {"idAlerts":[request.ID],
#                "actionsElement":[{"idAction":7,"inputParameters":None}],
#                "fields":[{"clear":False,"fieldName":"ASSIGNEDTO","value":request.ASSIGNEDTO},
#                          {"clear":False,"fieldName":"CATEGORYFULLTITLE","value":request.category},
#                          {"clear":False,"fieldName":"CLOSEDATE","value":request.CLOSEDATE},
#                          {"clear":False,"fieldName":"CLOSEREASON","value":request.CLOSEREASON},
#                          {"clear":False,"fieldName":"CREATIONDATE","value":request.CREATIONDATE},
#                          {"clear":False,"fieldName":"ID","value":f"{request.ID}"},
#                          {"clear":False,"fieldName":"LEVEL","value":request.LEVEL},
#                          {"clear":False,"fieldName":"PRIORITY","value":request.PRIORITY},
#                          {"clear":False,"fieldName":"STATUS","value":request.STATUS},
#                          {"clear":False,"fieldName":"TIMESTAMP","value":request.timestamp},
#                          {"clear":False,"fieldName":"TITLE","value":request.TITLE},
#                          {"clear":False,"fieldName":"NOTE","value":f"<p>{request.NOTE}</p>"}],
#                          "alertModify":[{"idAlert":request.ID,"modifyDate":None}]}
#     async with await get_http_client(settings) as client:
#         response = await client.post(url, headers=headers, json=payload)

#     return response.json() if response.status_code == 200 else None

async def update_alert(settings, token: str, request: UpdateAlertRequest):
    payload = {
        "idAlerts": [request.ID],
        "actionsElement": [{"idAction": 7, "inputParameters": None}],
        "fields": [
            {"clear": False, "fieldName": "ASSIGNEDTO", "value": request.ASSIGNEDTO},
            {"clear": False, "fieldName": "CATEGORYFULLTITLE", "value": request.category},
            {"clear": False, "fieldName": "CLOSEDATE", "value": request.CLOSEDATE},
            {"clear": False, "fieldName": "CLOSEREASON", "value": request.CLOSEREASON},
            {"clear": False, "fieldName": "CREATIONDATE", "value": request.CREATIONDATE},
            {"clear": False, "fieldName": "ID", "value": request.ID},
            {"clear": False, "fieldName": "LEVEL", "value": request.LEVEL},
            {"clear": False, "fieldName": "PRIORITY", "value": request.PRIORITY},
            {"clear": False, "fieldName": "STATUS", "value": request.STATUS},
            {"clear": False, "fieldName": "TIMESTAMP", "value": request.timestamp},
            {"clear": False, "fieldName": "TITLE", "value": request.TITLE},
            {"clear": False, "fieldName": "NOTE", "value": f"<p>ML analysis: \n{request.NOTE}</p>"}
        ],
        "alertModify": [{"idAlert": request.ID, "modifyDate": None}]
    }

    async with await get_http_client(settings) as client:
        response = await client.post(
            f"{get_base_url(settings)}/alert/alertaction/",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            json=payload
        )

    return response.json()