from __future__ import annotations
from fastapi import APIRouter, HTTPException, status, Request, Response, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timedelta
import logging, hashlib, jwt
from sqlalchemy.orm import Session
from sqlalchemy import or_
from enum import Enum
from database import get_db
from model import User, UserBase, UserType
from utils.log_utils import session_logger, set_session_context, clear_session_context

logger = logging.getLogger(__name__)
auth_router = APIRouter(prefix="/auth", tags=["Authentication"])

session_manager = None
settings = None
db_dependency = None

def init_auth_dependencies(sm, st, db_dep):
    global session_manager, settings, db_dependency
    session_manager = sm
    settings = st
    db_dependency = db_dep

class AccessRole(str, Enum):
    SUPERADMIN = "superadmin"
    ADMIN = "admin"
    USER = "user"

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    success: bool
    message: str
    username: str
    name: Optional[str] = None
    user_type: AccessRole
    access_token: str
    token_type: str = "bearer"
    sessionTimeout: int

class SessionResponse(BaseModel):
    valid: bool
    username: Optional[str] = None
    user_type: Optional[AccessRole] = None
    remainingTime: Optional[int] = None

class GrantAccessRequest(BaseModel):
    login: str
    role: AccessRole = AccessRole.USER
    active: bool = True

class UpdateAccessRequest(BaseModel):
    role: Optional[AccessRole] = None
    active: Optional[bool] = None

class UserAccessView(BaseModel):
    user_id: int
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    active: bool = False
    created_at: Optional[str] = None
    last_login: Optional[str] = None

def hash_password(password: str) -> str:
    return hashlib.sha3_512(password.encode("utf-8")).hexdigest()

def verify_password(plain: str, hashed: str) -> bool:
    return hash_password(plain) == hashed

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.SESSION_TIMEOUT_MINUTES))
    to_encode.update({"exp": expire, "iat": datetime.utcnow(), "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_access_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except Exception:
        return None

def _get_user_by_login(db: Session, login_or_email: str) -> Optional[User]:
    return db.query(User).filter(or_(User.username == login_or_email, User.email == login_or_email)).first()

def _get_userbase_for_user(db: Session, user: User) -> Optional[UserBase]:
    return db.query(UserBase).filter(UserBase.User_id == str(user.id)).first()

def _norm_role(val) -> str:
    try:
        return val.value if hasattr(val, "value") else str(val)
    except Exception:
        return str(val)

async def _current_user_record(request: Request, db: Session) -> tuple[User, UserBase]:
    session_id = request.cookies.get("session_id")
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = await session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    user = _get_user_by_login(db, session["username"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    ub = _get_userbase_for_user(db, user)
    if not ub or not bool(ub.is_active):
        raise HTTPException(status_code=403, detail="Access not granted")
    return user, ub

async def require_admin(request: Request, db: Session = Depends(get_db)):
    _, ub = await _current_user_record(request, db)
    role = _norm_role(ub.user_type)
    if role not in [AccessRole.ADMIN, AccessRole.SUPERADMIN]:
        raise HTTPException(status_code=403, detail="Admin privileges required")

async def require_superadmin(request: Request, db: Session = Depends(get_db)):
    _, ub = await _current_user_record(request, db)
    if _norm_role(ub.user_type) != AccessRole.SUPERADMIN:
        raise HTTPException(status_code=403, detail="Superadmin privileges required")

@auth_router.post("/login", response_model=LoginResponse)
async def login(login_request: LoginRequest, response: Response, request: Request, db: Session = Depends(get_db)):
    user = _get_user_by_login(db, login_request.username)
    if not user or not verify_password(login_request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    ub = _get_userbase_for_user(db, user)
    if not ub or not bool(ub.is_active):
        raise HTTPException(status_code=403, detail="Access not granted. Contact an administrator.")
    role = _norm_role(ub.user_type)
    access_token = create_access_token({"sub": user.username, "user_id": user.id, "user_type": role}, timedelta(minutes=settings.SESSION_TIMEOUT_MINUTES))
    session_id = await session_manager.create_session(user.username, access_token)
    set_session_context(session_id)
    session_logger.log_info(f"Login OK {user.username}")
    response.set_cookie(key="session_id", value=session_id, httponly=True, samesite="lax", max_age=settings.SESSION_TIMEOUT_MINUTES * 60, secure=True)
    ub.last_login = datetime.utcnow()
    db.commit()
    return LoginResponse(success=True, message="Login successful!", username=user.username, name=user.full_name, user_type=AccessRole(role), access_token=access_token, token_type="bearer", sessionTimeout=settings.SESSION_TIMEOUT_MINUTES)

@auth_router.post("/logout")
async def logout(request: Request, response: Response):
    session_id = request.cookies.get("session_id")
    if session_id:
        set_session_context(session_id)
        session_logger.log_info("Logout")
        await session_manager.delete_session(session_id)
        response.delete_cookie("session_id")
        clear_session_context()
    return {"success": True, "message": "Logged out"}

@auth_router.get("/session", response_model=SessionResponse)
async def check_session(request: Request):
    session_id = request.cookies.get("session_id")
    if not session_id:
        return SessionResponse(valid=False)
    session = await session_manager.get_session(session_id)
    if not session:
        return SessionResponse(valid=False)
    payload = decode_access_token(session.get("access_token", ""))
    if not payload:
        await session_manager.delete_session(session_id)
        return SessionResponse(valid=False)
    remaining = max(0, int((session["expires_at"] - datetime.utcnow()).total_seconds() / 60)) if "expires_at" in session else None
    role = payload.get("user_type", "user")
    return SessionResponse(valid=True, username=session["username"], user_type=AccessRole(role), remainingTime=remaining)

@auth_router.get("/me")
async def me(request: Request, db: Session = Depends(get_db)):
    user, ub = await _current_user_record(request, db)
    role = _norm_role(ub.user_type)
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "user_type": role,
        "is_active": bool(ub.is_active),
        "created_at": ub.created_at.isoformat() if ub.created_at else None,
        "last_login": ub.last_login.isoformat() if ub.last_login else None,
    }

# @auth_router.post("/access/grant")
# async def grant_access(req: GrantAccessRequest, request: Request, db: Session = Depends(get_db)):
#     await require_superadmin(request, db)
#     user = _get_user_by_login(db, req.login)
#     if not user:
#         raise HTTPException(status_code=404, detail="User not found in directory")
#     ub = _get_userbase_for_user(db, user)
#     if not ub:
#         ub = UserBase(User_id=str(user.id), user_type=req.role, is_active=1 if req.active else 0, created_at=datetime.utcnow())
#         db.add(ub)
#     else:
#         ub.user_type = req.role
#         ub.is_active = 1 if req.active else 0
#         ub.updated_at = datetime.utcnow()
#     db.commit()
#     return {"success": True, "message": "Access granted" if req.active else "Access updated (inactive)", "user_id": user.id, "username": user.username, "role": req.role, "active": req.active}

@auth_router.patch("/access/{user_id}")
async def update_access(user_id: int, req: UpdateAccessRequest, request: Request, db: Session = Depends(get_db)):
    await require_superadmin(request, db)
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found in directory")
    
    ub = _get_userbase_for_user(db, user)
    
    # Create new UserBase record if it doesn't exist
    if not ub:
        role = req.role
        if not ub:
            role = req.role
            ub = UserBase(
                User_id=str(user.id),
                user_type=UserType(role.value if hasattr(role, 'value') else str(role).lower()),  # Fixed
                is_active=1 if (req.active if req.active is not None else True) else 0,
                created_at=datetime.utcnow()
            )
            db.add(ub)
    else:
        if req.role is not None:
            ub.user_type = UserType(req.role.value if hasattr(req.role, 'value') else str(req.role).lower())  # Fixed
        if req.active is not None:
            ub.is_active = 1 if req.active else 0
        ub.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "success": True, 
        "message": "Access granted" if not ub.id else "Access updated",
        "user_id": user.id,
        "username": user.username,
        "role": _norm_role(ub.user_type),
        "active": bool(ub.is_active)
    }

@auth_router.delete("/access/{user_id}")
async def revoke_access(user_id: int, request: Request, db: Session = Depends(get_db)):
    await require_superadmin(request, db)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found in directory")
    ub = _get_userbase_for_user(db, user)
    if not ub:
        return {"success": True, "message": "No access record"}
    db.delete(ub)
    db.commit()
    return {"success": True, "message": "Access revoked"}

# @auth_router.get("/access", response_model=List[UserAccessView])
# async def list_access(request: Request, db: Session = Depends(get_db)):
#     await require_admin(request, db)
#     users = db.query(User).all()
#     out: List[UserAccessView] = []
#     for u in users:
#         ub = _get_userbase_for_user(db, u)
#         role = _norm_role(ub.user_type) if ub else None
#         out.append(UserAccessView(user_id=u.id, username=u.username, email=u.email, full_name=u.full_name, role=role, active=(bool(ub.is_active) if ub else False), created_at=(ub.created_at.isoformat() if ub and ub.created_at else None), last_login=(ub.last_login.isoformat() if ub and ub.last_login else None)))
#     return out

@auth_router.get("/users")
async def list_directory_users(request: Request, db: Session = Depends(get_db)):
    await require_admin(request, db)
    rows = db.query(User).all()
    out = []
    for u in rows:
        ub = _get_userbase_for_user(db, u)
        out.append({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "full_name": u.full_name,
            "user_type": (_norm_role(ub.user_type) if ub else None),
            "is_active": (bool(ub.is_active) if ub else False),
            "created_at": (ub.created_at if ub else None),
            "last_login": (ub.last_login if ub else None),
        })
    return out

# @auth_router.get("/users/{user_id}")
# async def get_directory_user(user_id: int, request: Request, db: Session = Depends(get_db)):
#     await require_admin(request, db)
#     u = db.query(User).filter(User.id == user_id).first()
#     if not u:
#         raise HTTPException(status_code=404, detail="User not found")
#     ub = _get_userbase_for_user(db, u)
#     return {
#         "id": u.id,
#         "username": u.username,
#         "email": u.email,
#         "full_name": u.full_name,
#         "user_type": (_norm_role(ub.user_type) if ub else None),
#         "is_active": (bool(ub.is_active) if ub else False),
#         "created_at": (ub.created_at if ub else None),
#         "last_login": (ub.last_login if ub else None),
#     }

# @auth_router.post("/register")
# async def register_disabled():
#     raise HTTPException(status_code=403, detail="User creation is directory-managed")



@auth_router.get("/users/no-access")
async def list_users_without_access(request: Request, db: Session = Depends(get_db)):
    """
    Returns users who exist in User table but don't have access 
    (no corresponding UserBase record, meaning user_type is null)
    """
    await require_admin(request, db)
    
    # Get all users
    all_users = db.query(User).all()
    
    users_without_access = []
    for user in all_users:
        ub = _get_userbase_for_user(db, user)
        
        # If no UserBase record exists, user has no access
        if not ub:
            users_without_access.append({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "user_type": None,
                "is_active": False,
                "created_at": None,
                "last_login": None
            })
    
    return users_without_access


@auth_router.get("/users/with-access")
async def list_users_with_access(request: Request, db: Session = Depends(get_db)):
    """
    Returns users who have been granted access 
    (have a UserBase record, meaning user_type is not null)
    """
    await require_admin(request, db)
    
    # Get all users
    all_users = db.query(User).all()
    
    users_with_access = []
    for user in all_users:
        ub = _get_userbase_for_user(db, user)
        
        # If UserBase record exists, user has access
        if ub:
            users_with_access.append({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name,
                "user_type": _norm_role(ub.user_type),
                "is_active": bool(ub.is_active),
                "created_at": ub.created_at.isoformat() if ub.created_at else None,
                "last_login": ub.last_login.isoformat() if ub.last_login else None
            })
    
    return users_with_access