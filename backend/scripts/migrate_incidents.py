from sqlalchemy import text
from app.db.session import engine

def migrate():
    with engine.connect() as conn:
        print("Migrating database: Adding 'status' column to 'incidents' table...")
        conn.execute(text("ALTER TABLE incidents ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'unresolved' NOT NULL;"))
        conn.commit()
        print("Migration successful!")

if __name__ == "__main__":
    migrate()
