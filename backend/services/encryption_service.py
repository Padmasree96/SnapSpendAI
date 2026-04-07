from cryptography.fernet import Fernet
from config import settings

# Initialize Fernet with the encryption key from settings
# The key must be a 32-urlsafe-base64-encoded bytes.
# In a real app, you'd generate this once and store it securely.
try:
    _fernet = Fernet(settings.ENCRYPTION_KEY.encode())
except Exception:
    # Fallback for development if key is not properly formatted
    import base64
    import hashlib
    key = base64.urlsafe_b64encode(hashlib.sha256(settings.ENCRYPTION_KEY.encode()).digest())
    _fernet = Fernet(key)

def encrypt_data(data: str) -> str:
    """Encrypt sensitive data string."""
    if not data:
        return data
    return _fernet.encrypt(data.encode()).decode()

def decrypt_data(encrypted_data: str) -> str:
    """Decrypt sensitive data string."""
    if not encrypted_data:
        return encrypted_data
    try:
        return _fernet.decrypt(encrypted_data.encode()).decode()
    except Exception:
        return encrypted_data # Return as is if decryption fails (might not be encrypted)
