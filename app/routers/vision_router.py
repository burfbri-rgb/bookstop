import base64
from uuid import UUID

import requests
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from app.auth import require_owner_id
from app.config import GOOGLE_VISION_API_KEY

router = APIRouter(prefix="/api/vision", tags=["vision"])

VISION_URL = "https://vision.googleapis.com/v1/images:annotate"
BOOKS_URL = "https://www.googleapis.com/books/v1/volumes"


def _extract_isbn(texts: list[str]) -> str | None:
    import re
    for t in texts:
        clean = t.replace("-", "").strip()
        if re.match(r"^(97[89]\d{10}|\d{9}[\dXx])$", clean):
            return clean


@router.post("/lookup")
def vision_lookup(file: UploadFile = File(...), owner_id: UUID = Depends(require_owner_id)):
    if not GOOGLE_VISION_API_KEY:
        raise HTTPException(400, "Google Cloud Vision API key not configured")

    image_data = base64.b64encode(file.file.read()).decode()

    payload = {
        "requests": [{
            "image": {"content": image_data},
            "features": [
                {"type": "WEB_DETECTION", "maxResults": 5},
                {"type": "LABEL_DETECTION", "maxResults": 10},
                {"type": "TEXT_DETECTION", "maxResults": 1},
            ],
        }]
    }

    resp = requests.post(f"{VISION_URL}?key={GOOGLE_VISION_API_KEY}", json=payload, timeout=30)
    if resp.status_code != 200:
        raise HTTPException(502, f"Vision API error: {resp.text}")

    data = resp.json()
    annotations = (data.get("responses") or [{}])[0]

    labels = [a["description"] for a in (annotations.get("labelAnnotations") or [])]
    web_entities = [e["description"] for e in (annotations.get("webDetection") or {}).get("webEntities") or []]
    texts_raw = [a["description"] for a in (annotations.get("textAnnotations") or [])]

    isbn = _extract_isbn(texts_raw)
    title = None
    authors = None
    estimated_price = None

    if isbn:
        book_resp = requests.get(BOOKS_URL, params={"q": f"isbn:{isbn}"}, timeout=10)
        if book_resp.status_code == 200:
            items = (book_resp.json().get("items") or [])
            if items:
                info = items[0]["volumeInfo"]
                title = info.get("title")
                authors = info.get("authors")
                # ponytail: Google Books retail price is rarely available, skip
                for identifier in info.get("industryIdentifiers") or []:
                    if identifier.get("type") in ("ISBN_13", "ISBN_10"):
                        isbn = identifier["identifier"]
                        break

    return {
        "isbn": isbn,
        "title": title,
        "authors": authors,
        "labels": labels[:5],
        "web_entities": web_entities[:5],
    }
