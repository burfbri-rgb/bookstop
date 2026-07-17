"""One-time migration: convert real prices to token prices.

real_price = (token - 30) * 0.04  →  token = price / 0.04 + 30

Run once after deploying. Usage:
  python migrate_prices.py
"""

from app.database import SessionLocal

def main():
    db = SessionLocal()
    try:
        result = db.execute("UPDATE inventory SET price = ROUND(price / 0.04 + 30, 0)")
        db.commit()
        print(f"Updated {result.rowcount} items")
    finally:
        db.close()

if __name__ == "__main__":
    main()
