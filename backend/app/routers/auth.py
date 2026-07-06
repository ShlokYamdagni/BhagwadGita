from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import verify_password, get_password_hash, create_access_token
from backend.app.core.dependencies import get_current_user
from backend.app.models.models import User
from backend.app.schemas.schemas import UserCreate, UserOut, Token, UserSettingsUpdate

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)) -> Any:
    """
    Register a new user.
    """
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The user with this email already exists in the system.",
        )
    
    hashed_password = get_password_hash(user_in.password)
    new_user = User(
        email=user_in.email,
        password_hash=hashed_password,
        full_name=user_in.full_name,
        settings={"theme": "system", "language": "english", "voice_enabled": False}
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=Token)
def login_user(
    db: Session = Depends(get_db), 
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, retrieve a JWT token for future requests.
    """
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
    
    access_token = create_access_token(subject=user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
    }

@router.get("/me", response_model=UserOut)
def read_user_me(current_user: User = Depends(get_current_user)) -> Any:
    """
    Get the currently logged-in user profile.
    """
    return current_user

@router.put("/settings", response_model=UserOut)
def update_user_settings(
    settings_in: UserSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Update theme or accessibility settings for the current user.
    """
    # Clone current settings
    user_settings = dict(current_user.settings or {})
    
    if settings_in.theme is not None:
        user_settings["theme"] = settings_in.theme
    if settings_in.language is not None:
        user_settings["language"] = settings_in.language
    if settings_in.voice_enabled is not None:
        user_settings["voice_enabled"] = settings_in.voice_enabled
        
    current_user.settings = user_settings
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/oauth/{provider}", response_model=Token)
def oauth_login(provider: str, token_in: Token, db: Session = Depends(get_db)) -> Any:
    """
    Mock endpoint for external OAuth verifications (Google & Apple).
    Takes a client token, validates with the provider, and signs a local JWT.
    """
    if provider not in ["google", "apple"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported OAuth provider: {provider}"
        )
    
    # In production, verify the external token (e.g. google ID token) via:
    # idinfo = id_token.verify_oauth2_token(token_in.access_token, requests.Request(), CLIENT_ID)
    # email = idinfo['email']
    
    # For local/development execution, mock valid authentication using a test account:
    mock_email = f"oauth_user_{provider}@gita-counselor.app"
    user = db.query(User).filter(User.email == mock_email).first()
    
    if not user:
        # Create a stub user
        user = User(
            email=mock_email,
            password_hash=get_password_hash(f"OAuthRandomPasswordStub-{provider}"),
            full_name=f"Spiritual seeker ({provider.capitalize()})",
            settings={"theme": "system", "language": "english", "voice_enabled": False}
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
    access_token = create_access_token(subject=user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
    }

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> None:
    """
    Delete current user account and purge all their database entries (sessions, messages, bookmarks).
    """
    db.delete(current_user)
    db.commit()
    return
