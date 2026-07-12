import cloudinary
import cloudinary.uploader

from app.config import CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET

cloudinary.config(
    cloud_name=CLOUDINARY_CLOUD_NAME,
    api_key=CLOUDINARY_API_KEY,
    api_secret=CLOUDINARY_API_SECRET,
)


def process_and_upload(file_bytes: bytes, prefix: str = "items") -> str:
    result = cloudinary.uploader.upload(
        file_bytes,
        folder=prefix,
        resource_type="image",
        overwrite=False,
    )
    return result["secure_url"]


def upload_raw(file_bytes: bytes, prefix: str = "receipts") -> str:
    result = cloudinary.uploader.upload(
        file_bytes,
        folder=prefix,
        resource_type="image",
        overwrite=False,
    )
    return result["secure_url"]
