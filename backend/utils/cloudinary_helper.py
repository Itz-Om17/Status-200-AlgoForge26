import os
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv

load_dotenv()

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

def upload_to_cloudinary(file_path, folder="audits"):
    """
    Uploads a file to Cloudinary as a 'raw' resource (for .pkl, .csv).
    Returns the secure URL.
    """
    try:
        response = cloudinary.uploader.upload(
            file_path,
            resource_type="raw",
            folder=folder,
            use_filename=True,
            unique_filename=True
        )
        return response.get("secure_url")
    except Exception as e:
        print(f"[Cloudinary] Upload failed: {e}")
        return None
