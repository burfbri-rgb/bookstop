from os import getenv

from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = getenv("DATABASE_URL", "sqlite:///./bookstop.db")
JWT_SECRET = getenv("JWT_SECRET", "change-me")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24

CLOUDINARY_CLOUD_NAME = getenv("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_API_KEY = getenv("CLOUDINARY_API_KEY", "")
CLOUDINARY_API_SECRET = getenv("CLOUDINARY_API_SECRET", "")
