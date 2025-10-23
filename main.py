# main.py - Soil Submission Portal Backend (Phase 1)
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
import csv
import os
import json
from datetime import datetime
from io import StringIO

# Database configuration
DATABASE_URL = "postgresql://kas_user:6812@localhost:55432/kas_samples"
SCHEMA_NAME = "kas_portal"
CSV_EXPORT_DIR = "portal_exports"
CSV_UPLOAD_DIR = "portal_uploads"

# Create directories
os.makedirs(CSV_EXPORT_DIR, exist_ok=True)
os.makedirs(CSV_UPLOAD_DIR, exist_ok=True)

# Initialize FastAPI
app = FastAPI(
    title="KAS Soil Submission Portal API",
    description="API for managing soil sample submissions and lab results",
    version="1.0.0"
)

# CORS middleware (allow frontend to connect)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================
# DATABASE CONNECTION
# =====================================================

@contextmanager
def get_db():
    """Database connection context manager."""
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(f"SET search_path TO {SCHEMA_NAME}")
    try:
        yield conn, cur
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cur.close()
        conn.close()

# =====================================================
# PYDANTIC MODELS (Request/Response schemas)
# =====================================================

class CompanyCreate(BaseModel):
    company_name: str
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    country: str = "USA"
    notes: Optional[str] = None

class GrowerCreate(BaseModel):
    company_id: int
    grower_name: str
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None  # NEW
    city: Optional[str] = None      # NEW
    state: Optional[str] = None     # NEW
    zip: Optional[str] = None       # NEW
    notes: Optional[str] = None

class FarmCreate(BaseModel):
    grower_id: int
    farm_name: str
    location: Optional[str] = None
    total_acres: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    notes: Optional[str] = None

class FieldCreate(BaseModel):
    farm_id: int
    field_name: str
    acres: Optional[float] = None
    description: Optional[str] = None
    notes: Optional[str] = None

class LimeHistoryEntry(BaseModel):
    type: str  # "Calcium Carbonate", "Dolomite", "Gypsum"
    month: int  # 1-12
    year: int
    amount_lbs_ac: float

class SampleTestsCreate(BaseModel):
    # Standard tests (default True)
    test_b: bool = True
    test_ca: bool = True
    test_cu: bool = True
    test_fe: bool = True
    test_k: bool = True
    test_mg: bool = True
    test_mn: bool = True
    test_na: bool = True
    test_om: bool = True
    test_p2: bool = True
    test_ph1: bool = True
    test_s: bool = True
    test_zn: bool = True
    
    # Optional tests (toggles)
    test_bulk_den: bool = False
    test_cl: bool = False
    test_co: bool = False
    test_mo: bool = False
    test_salts: bool = False
    
    # Additional tests (dropdown)
    test_al: bool = False
    test_i: bool = False
    test_morgan: bool = False
    test_nh3: bool = False
    test_no3: bool = False
    test_olsen: bool = False
    test_bray_p1: bool = False
    test_ph2_salt: bool = False
    test_ph3_buffer: bool = False
    test_pret: bool = False
    test_other: bool = False
    test_ssc: bool = False
    test_se: bool = False
    test_si: bool = False
    test_plfa: bool = False
    test_total_p: bool = False

class SampleCreate(BaseModel):
    grower_id: int
    farm_id: int
    field_id: int
    sample_name: Optional[str] = None
    zone: Optional[str] = None
    plot_id: Optional[str] = None
    crop: Optional[str] = None
    yield_goal: Optional[float] = None
    previous_crop: Optional[str] = None
    previous_crop_yield: Optional[float] = None
    lime_history: Optional[List[LimeHistoryEntry]] = None
    acres: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    elevation: Optional[float] = None
    collect_datetime: Optional[datetime] = None
    special_notes: Optional[str] = None
    program_level: str = "Excellent"  # NEW: Excellent, Building, or Minimal
    organic: bool = False  # NEW: Organic toggle
    tests: SampleTestsCreate = Field(default_factory=SampleTestsCreate)

class BatchCreate(BaseModel):
    company_id: int
    samples: List[SampleCreate]
    notes: Optional[str] = None
    created_by: Optional[str] = "Internal"

# =====================================================
# COMPANY ENDPOINTS
# =====================================================

@app.post("/api/companies/", status_code=201)
def create_company(company: CompanyCreate):
    """Create a new company/client."""
    with get_db() as (conn, cur):
        try:
            cur.execute("""
                INSERT INTO companies (company_name, contact_person, email, phone, 
                                     address, city, state, zip, country, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, company_name, is_outside_us
            """, (company.company_name, company.contact_person, company.email, 
                  company.phone, company.address, company.city, company.state,
                  company.zip, company.country, company.notes))
            
            result = cur.fetchone()
            return {
                "id": result["id"],
                "company_name": result["company_name"],
                "is_outside_us": result["is_outside_us"]
            }
        except psycopg2.IntegrityError:
            raise HTTPException(status_code=400, detail="Company already exists")

@app.get("/api/companies/")
def list_companies():
    """Get all companies."""
    with get_db() as (conn, cur):
        cur.execute("""
            SELECT id, company_name, contact_person, email, phone, 
                   city, state, country, is_outside_us
            FROM companies
            ORDER BY company_name
        """)
        return cur.fetchall()

@app.get("/api/companies/{company_id}")
def get_company(company_id: int):
    """Get company details."""
    with get_db() as (conn, cur):
        cur.execute("SELECT * FROM companies WHERE id = %s", (company_id,))
        company = cur.fetchone()
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        return company

@app.get("/api/companies/search/{search_term}")
def search_companies(search_term: str):
    """Search companies by name."""
    with get_db() as (conn, cur):
        cur.execute("""
            SELECT id, company_name, contact_person, email, city, state
            FROM companies
            WHERE company_name ILIKE %s OR contact_person ILIKE %s
            ORDER BY company_name
            LIMIT 20
        """, (f"%{search_term}%", f"%{search_term}%"))
        return cur.fetchall()

# =====================================================
# GROWER ENDPOINTS
# =====================================================

@app.post("/api/growers/", status_code=201)
def create_grower(grower: GrowerCreate):
    """Create a new grower."""
    with get_db() as (conn, cur):
        try:
            cur.execute("""
                INSERT INTO growers (company_id, grower_name, contact_person, email, phone, 
                                   address, city, state, zip, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, grower_name
            """, (grower.company_id, grower.grower_name, grower.contact_person,
                  grower.email, grower.phone, grower.address, grower.city, 
                  grower.state, grower.zip, grower.notes))
            return cur.fetchone()
        except psycopg2.IntegrityError:
            raise HTTPException(status_code=400, detail="Grower already exists for this company")

@app.get("/api/growers/company/{company_id}")
def list_growers_by_company(company_id: int):
    """Get all growers for a company."""
    with get_db() as (conn, cur):
        cur.execute("""
            SELECT g.*, c.company_name
            FROM growers g
            JOIN companies c ON g.company_id = c.id
            WHERE g.company_id = %s
            ORDER BY g.grower_name
        """, (company_id,))
        return cur.fetchall()

@app.get("/api/growers/search/{search_term}")
def search_growers(search_term: str):
    """Search growers by name."""
    with get_db() as (conn, cur):
        cur.execute("""
            SELECT g.*, c.company_name
            FROM growers g
            JOIN companies c ON g.company_id = c.id
            WHERE g.grower_name ILIKE %s
            ORDER BY g.grower_name
            LIMIT 20
        """, (f"%{search_term}%",))
        return cur.fetchall()

# Update existing grower
@app.put("/api/growers/{grower_id}")
def update_grower(grower_id: int, grower: GrowerCreate):
    """Update an existing grower."""
    with get_db() as (conn, cur):
        try:
            cur.execute("""
                UPDATE growers 
                SET grower_name = %s, contact_person = %s, email = %s, phone = %s, 
                    address = %s, city = %s, state = %s, zip = %s, notes = %s
                WHERE id = %s
                RETURNING id, grower_name
            """, (grower.grower_name, grower.contact_person, grower.email, 
                  grower.phone, grower.address, grower.city, grower.state, 
                  grower.zip, grower.notes, grower_id))
            
            result = cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Grower not found")
            return result
        except psycopg2.IntegrityError:
            raise HTTPException(status_code=400, detail="Grower name already exists for this company")
        
# Delete grower
@app.delete("/api/growers/{grower_id}")
def delete_grower(grower_id: int):
    """Delete a grower and all associated data."""
    with get_db() as (conn, cur):
        cur.execute("DELETE FROM growers WHERE id = %s", (grower_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Grower not found")
        return {"message": "Grower deleted successfully"}

# =====================================================
# FARM ENDPOINTS
# =====================================================

@app.post("/api/farms/", status_code=201)
def create_farm(farm: FarmCreate):
    """Create a new farm."""
    with get_db() as (conn, cur):
        try:
            cur.execute("""
                INSERT INTO farms (grower_id, farm_name, location, total_acres, 
                                 latitude, longitude, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id, farm_name
            """, (farm.grower_id, farm.farm_name, farm.location, farm.total_acres,
                  farm.latitude, farm.longitude, farm.notes))
            return cur.fetchone()
        except psycopg2.IntegrityError:
            raise HTTPException(status_code=400, detail="Farm already exists for this grower")

@app.get("/api/farms/grower/{grower_id}")
def list_farms_by_grower(grower_id: int):
    """Get all farms for a grower."""
    with get_db() as (conn, cur):
        cur.execute("""
            SELECT f.*, g.grower_name
            FROM farms f
            JOIN growers g ON f.grower_id = g.id
            WHERE f.grower_id = %s
            ORDER BY f.farm_name
        """, (grower_id,))
        return cur.fetchall()

# Delete farm
@app.delete("/api/farms/{farm_id}")
def delete_farm(farm_id: int):
    """Delete a farm and all its fields."""
    with get_db() as (conn, cur):
        cur.execute("DELETE FROM farms WHERE id = %s", (farm_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Farm not found")
        return {"message": "Farm deleted successfully"}

# =====================================================
# FIELD ENDPOINTS
# =====================================================

@app.post("/api/fields/", status_code=201)
def create_field(field: FieldCreate):
    """Create a new field."""
    with get_db() as (conn, cur):
        try:
            cur.execute("""
                INSERT INTO fields (farm_id, field_name, acres, description, notes)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, field_name
            """, (field.farm_id, field.field_name, field.acres, 
                  field.description, field.notes))
            return cur.fetchone()
        except psycopg2.IntegrityError:
            raise HTTPException(status_code=400, detail="Field already exists for this farm")

@app.get("/api/fields/farm/{farm_id}")
def list_fields_by_farm(farm_id: int):
    """Get all fields for a farm."""
    with get_db() as (conn, cur):
        cur.execute("""
            SELECT fd.*, f.farm_name
            FROM fields fd
            JOIN farms f ON fd.farm_id = f.id
            WHERE fd.farm_id = %s
            ORDER BY fd.field_name
        """, (farm_id,))
        return cur.fetchall()

# Delete field
@app.delete("/api/fields/{field_id}")
def delete_field(field_id: int):
    """Delete a field."""
    with get_db() as (conn, cur):
        cur.execute("DELETE FROM fields WHERE id = %s", (field_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Field not found")
        return {"message": "Field deleted successfully"}

# =====================================================
# BATCH/SUBMISSION ENDPOINTS
# =====================================================

@app.post("/api/batches/", status_code=201)
def create_batch(batch: BatchCreate):
    """Create a new submission batch with samples."""
    with get_db() as (conn, cur):
        # Generate batch ID
        cur.execute("SELECT generate_batch_id()")
        batch_id = cur.fetchone()["generate_batch_id"]
        
        # Extract batch number (the xxxxx part)
        batch_number = int(batch_id.split('-')[1])
        
        # Get company info for quarantine logic
        cur.execute("SELECT is_outside_us FROM companies WHERE id = %s", (batch.company_id,))
        company = cur.fetchone()
        is_outside_us = company["is_outside_us"] if company else False
        
        # Create batch
        cur.execute("""
            INSERT INTO submission_batches 
            (batch_id, company_id, batch_number, sample_count, notes, created_by)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (batch_id, batch.company_id, batch_number, len(batch.samples), batch.notes, batch.created_by))
                
        batch_db_id = cur.fetchone()["id"]
        
        # Create samples
        sample_ids = []
        for idx, sample in enumerate(batch.samples, start=1):
            # Generate bag ID
            bag_id = f"{batch_number:05d}-{idx}"
            
            # Insert sample
            # Convert lime_history to JSON for PostgreSQL
            lime_history_json = None
            if sample.lime_history:
                lime_history_json = json.dumps([entry.dict() for entry in sample.lime_history])
            
            cur.execute("""
                INSERT INTO samples 
                (batch_id, sample_sequence, bag_id, company_id, grower_id, farm_id, field_id,
                sample_name, zone, plot_id, crop, yield_goal, previous_crop, previous_crop_yield,
                lime_history, acres, latitude, longitude, elevation, collect_datetime, 
                special_notes, program_level, organic, quarantine)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                batch_id, idx, bag_id, batch.company_id, sample.grower_id, 
                sample.farm_id, sample.field_id, sample.sample_name, sample.zone,
                sample.plot_id, sample.crop, sample.yield_goal, sample.previous_crop,
                sample.previous_crop_yield,
                lime_history_json,  # <-- CHANGED: Use the JSON string instead
                sample.acres, sample.latitude, sample.longitude, sample.elevation,
                sample.collect_datetime, sample.special_notes, sample.program_level, 
                sample.organic, is_outside_us
            ))
                        
            sample_id = cur.fetchone()["id"]
            sample_ids.append(sample_id)
            
            # Insert sample tests
            tests = sample.tests.dict()
            test_columns = ", ".join(tests.keys())
            test_values = ", ".join(["%s"] * len(tests))
            
            cur.execute(f"""
                INSERT INTO sample_tests (sample_id, {test_columns})
                VALUES (%s, {test_values})
            """, (sample_id, *tests.values()))
        
        return {
            "batch_id": batch_id,
            "batch_number": batch_number,
            "sample_count": len(sample_ids),
            "samples": sample_ids
        }

@app.get("/api/batches/")
def list_batches(limit: int = 100, offset: int = 0):
    """Get all submission batches with grower_name included."""
    with get_db() as (conn, cur):
        cur.execute("""
            SELECT sb.*, c.company_name,
                   (SELECT g.grower_name 
                    FROM samples s 
                    JOIN growers g ON s.grower_id = g.id 
                    WHERE s.batch_id = sb.batch_id 
                    LIMIT 1) as grower_name
            FROM submission_batches sb
            LEFT JOIN companies c ON sb.company_id = c.id
            ORDER BY sb.submission_date DESC
            LIMIT %s OFFSET %s
        """, (limit, offset))
        return cur.fetchall()

@app.get("/api/batches/{batch_id}")
def get_batch(batch_id: str):
    """Get batch details with samples - UPDATED TO INCLUDE NAMES."""
    with get_db() as (conn, cur):
        # Get batch info
        cur.execute("SELECT * FROM submission_batches WHERE batch_id = %s", (batch_id,))
        batch = cur.fetchone()
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")
        
        # Get samples with joined names
        cur.execute("""
            SELECT s.*, st.*, 
                   c.company_name, g.grower_name, f.farm_name, fd.field_name
            FROM samples s
            LEFT JOIN sample_tests st ON s.id = st.sample_id
            LEFT JOIN companies c ON s.company_id = c.id
            LEFT JOIN growers g ON s.grower_id = g.id
            LEFT JOIN farms f ON s.farm_id = f.id
            LEFT JOIN fields fd ON s.field_id = fd.id
            WHERE s.batch_id = %s
            ORDER BY s.sample_sequence
        """, (batch_id,))
        samples = cur.fetchall()
        
        return {
            "batch": batch,
            "samples": samples
        }
    
@app.delete("/api/batches/{batch_id}")
def delete_batch(batch_id: str):
    """Delete a batch and all associated samples."""
    with get_db() as (conn, cur):
        # Delete samples first (foreign key constraint)
        cur.execute("DELETE FROM samples WHERE batch_id = %s", (batch_id,))
        
        # Delete sample tests
        cur.execute("""
            DELETE FROM sample_tests WHERE sample_id IN (
                SELECT id FROM samples WHERE batch_id = %s
            )
        """, (batch_id,))
        
        # Delete batch
        cur.execute("DELETE FROM submission_batches WHERE batch_id = %s", (batch_id,))
        
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Batch not found")
        
        conn.commit()
        
        return {"message": f"Batch {batch_id} deleted successfully"}

# =====================================================
# CSV GENERATION
# =====================================================

@app.post("/api/batches/{batch_id}/generate-csv")
def generate_lab_csv(batch_id: str):
    """Generate CSV file in lab format for submission."""
    with get_db() as (conn, cur):
        # Get batch and samples
        cur.execute("""
            SELECT s.*, st.*, 
                   c.company_name, g.grower_name, f.farm_name, fd.field_name
            FROM samples s
            LEFT JOIN sample_tests st ON s.id = st.sample_id
            LEFT JOIN companies c ON s.company_id = c.id
            LEFT JOIN growers g ON s.grower_id = g.id
            LEFT JOIN farms f ON s.farm_id = f.id
            LEFT JOIN fields fd ON s.field_id = fd.id
            WHERE s.batch_id = %s
            ORDER BY s.sample_sequence
        """, (batch_id,))
        
        samples = cur.fetchall()
        if not samples:
            raise HTTPException(status_code=404, detail="Batch not found or has no samples")
        
        # CSV header (from your example)
        headers = [
            "CustomerOrderNo", "LayerId", "OrderNotes", "SampleName", "CollectDateTime",
            "Grower", "Farm", "Field", "Acres", "Latitude", "Longitude", "Elevation",
            "BagId", "SpecialNote", "Quarantine",
            "Crop1", "CropYieldGoal1", "CropNote1",
            "Crop2", "CropYieldGoal2", "CropNote2",
            "Crop3", "CropYieldGoal3", "CropNote3",
            "Crop4", "CropYieldGoal4", "CropNote4",
            "Al", "B", "BulkDen", "Ca", "Cl", "Co", "Cu", "Fe", "I", "K", "Mg", "Mn", "Mo",
            "Morgan", "Na", "NH3", "NO3", "OLSE", "NO", "MP1", "P2", "PH1 (Water)",
            "PH2 (Salt)", "PH3 (Buffer)", "PRET", "S", "Salts", "Zn", "Other",
            "Sand Silt Clay", "Se", "Si", "PLFA", "Total P"
        ]
        
        # Generate CSV
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(headers)
        
        for sample in samples:
            # Build row
            row = [
                "",  # CustomerOrderNo (empty for lab's use)
                batch_id,  # LayerId
                "",  # OrderNotes
                sample["sample_name"] or sample["field_name"] or "",
                sample["collect_datetime"].strftime("%m/%d/%y") if sample["collect_datetime"] else "",
                sample["grower_name"] or "",
                sample["farm_name"] or "",
                sample["field_name"] or "",
                sample["acres"] or "",
                sample["latitude"] or "",
                sample["longitude"] or "",
                sample["elevation"] or "",
                sample["bag_id"],
                sample["special_notes"] or "",
                "Y" if sample["quarantine"] else "N",
                sample["crop"] or "",
                sample["yield_goal"] or "",
                "",  # CropNote1
                "",  # Crop2
                "",  # CropYieldGoal2
                "",  # CropNote2
                "",  # Crop3
                "",  # CropYieldGoal3
                "",  # CropNote3
                "",  # Crop4
                "",  # CropYieldGoal4
                "",  # CropNote4
            ]
            
            # Add test flags (Y/N)
            test_map = {
                "Al": sample.get("test_al"),
                "B": sample.get("test_b"),
                "BulkDen": sample.get("test_bulk_den"),
                "Ca": sample.get("test_ca"),
                "Cl": sample.get("test_cl"),
                "Co": sample.get("test_co"),
                "Cu": sample.get("test_cu"),
                "Fe": sample.get("test_fe"),
                "I": sample.get("test_i"),
                "K": sample.get("test_k"),
                "Mg": sample.get("test_mg"),
                "Mn": sample.get("test_mn"),
                "Mo": sample.get("test_mo"),
                "Morgan": sample.get("test_morgan"),
                "Na": sample.get("test_na"),
                "NH3": sample.get("test_nh3"),
                "NO3": sample.get("test_no3"),
                "OLSE": sample.get("test_olsen"),
                "NO": "",
                "MP1": sample.get("test_bray_p1"),
                "P2": sample.get("test_p2"),
                "PH1 (Water)": sample.get("test_ph1"),
                "PH2 (Salt)": sample.get("test_ph2_salt"),
                "PH3 (Buffer)": sample.get("test_ph3_buffer"),
                "PRET": sample.get("test_pret"),
                "S": sample.get("test_s"),
                "Salts": sample.get("test_salts"),
                "Zn": sample.get("test_zn"),
                "Other": sample.get("test_other"),
                "Sand Silt Clay": sample.get("test_ssc"),
                "Se": sample.get("test_se"),
                "Si": sample.get("test_si"),
                "PLFA": sample.get("test_plfa"),
                "Total P": sample.get("test_total_p"),
            }
            
            for test in test_map.values():
                row.append("Y" if test else "")
            
            writer.writerow(row)
        
        # Save CSV file
        csv_filename = f"{batch_id}_lab_submission.csv"
        csv_path = os.path.join(CSV_EXPORT_DIR, csv_filename)
        
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            f.write(output.getvalue())
        
        # Update batch
        cur.execute("""
            UPDATE submission_batches
            SET csv_generated = TRUE, csv_path = %s, status = 'CSV Generated'
            WHERE batch_id = %s
        """, (csv_path, batch_id))
        
        return {
            "batch_id": batch_id,
            "csv_filename": csv_filename,
            "csv_path": csv_path,
            "sample_count": len(samples)
        }

@app.get("/api/batches/{batch_id}/download-csv")
def download_lab_csv(batch_id: str):
    """Download the generated CSV file."""
    with get_db() as (conn, cur):
        cur.execute("SELECT csv_path FROM submission_batches WHERE batch_id = %s", (batch_id,))
        result = cur.fetchone()
        
        if not result or not result["csv_path"]:
            raise HTTPException(status_code=404, detail="CSV not generated yet")
        
        csv_path = result["csv_path"]
        if not os.path.exists(csv_path):
            raise HTTPException(status_code=404, detail="CSV file not found")
        
        return FileResponse(
            csv_path,
            media_type="text/csv",
            filename=os.path.basename(csv_path)
        )

# =====================================================
# LAB RESULT IMPORT (Multi-file)
# =====================================================

@app.post("/api/lab-results/import")
async def import_lab_results(files: List[UploadFile] = File(...)):
    """Import multiple lab result CSV files."""
    results = []
    
    for file in files:
        try:
            # Save uploaded file
            upload_path = os.path.join(CSV_UPLOAD_DIR, file.filename)
            content = await file.read()
            
            with open(upload_path, 'wb') as f:
                f.write(content)
            
            # Parse CSV
            csv_data = content.decode('utf-8')
            reader = csv.DictReader(StringIO(csv_data))
            rows = list(reader)
            
            if not rows:
                results.append({
                    "filename": file.filename,
                    "status": "error",
                    "message": "Empty CSV file"
                })
                continue
            
            # Extract batch info from first row
            first_row = rows[0]
            batch_id = first_row.get("LayerId", "").strip()
            control_id = first_row.get("ControlID", "").strip()
            
            if not batch_id:
                results.append({
                    "filename": file.filename,
                    "status": "error",
                    "message": "No LayerId (batch_id) found in CSV"
                })
                continue
            
            with get_db() as (conn, cur):
                # Check if batch exists
                cur.execute("SELECT id FROM submission_batches WHERE batch_id = %s", (batch_id,))
                batch = cur.fetchone()
                
                if not batch:
                    results.append({
                        "filename": file.filename,
                        "status": "error",
                        "message": f"Batch {batch_id} not found in system"
                    })
                    continue
                
                # Create lab result record
                cur.execute("""
                    INSERT INTO lab_results 
                    (batch_id, control_id, csv_filename, csv_path, sample_count, imported_by)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (batch_id, control_id, file.filename, upload_path, len(rows), "Internal"))
                
                lab_result_id = cur.fetchone()["id"]
                
                # Import each row's data
                for row in rows:
                    bag_id = row.get("BagId", "").strip()
                    
                    # Find matching sample
                    cur.execute("""
                        SELECT id FROM samples 
                        WHERE batch_id = %s AND bag_id = %s
                    """, (batch_id, bag_id))
                    
                    sample = cur.fetchone()
                    sample_id = sample["id"] if sample else None
                    
                    # Store all field data
                    for field_name, field_value in row.items():
                        if field_value and field_value.strip():
                            cur.execute("""
                                INSERT INTO lab_result_data 
                                (lab_result_id, sample_id, bag_id, field_name, field_value)
                                VALUES (%s, %s, %s, %s, %s)
                            """, (lab_result_id, sample_id, bag_id, field_name, field_value.strip()))
                
                # Update batch with control_id and full_batch_id
                if control_id:
                    full_batch_id = f"{batch_id}-{control_id}"
                    cur.execute("""
                        UPDATE submission_batches
                        SET control_id = %s, full_batch_id = %s, status = 'Lab Results Received'
                        WHERE batch_id = %s
                    """, (control_id, full_batch_id, batch_id))
                
                results.append({
                    "filename": file.filename,
                    "status": "success",
                    "batch_id": batch_id,
                    "control_id": control_id,
                    "sample_count": len(rows)
                })
        
        except Exception as e:
            results.append({
                "filename": file.filename,
                "status": "error",
                "message": str(e)
            })
    
    return {
        "total_files": len(files),
        "results": results
    }

@app.get("/api/lab-results/batch/{batch_id}")
def get_lab_results(batch_id: str):
    """Get lab results for a batch."""
    with get_db() as (conn, cur):
        cur.execute("""
            SELECT lr.*, 
                   COUNT(lrd.id) as data_points
            FROM lab_results lr
            LEFT JOIN lab_result_data lrd ON lr.id = lrd.lab_result_id
            WHERE lr.batch_id = %s
            GROUP BY lr.id
            ORDER BY lr.import_date DESC
        """, (batch_id,))
        return cur.fetchall()

# =====================================================
# EXPORT FOR REC SYSTEM
# =====================================================

@app.post("/api/batches/{batch_id}/export-for-rec-system")
def export_for_rec_system(batch_id: str):
    """Generate CSV in format compatible with desktop rec system importer."""
    with get_db() as (conn, cur):
        # Check if lab results exist
        cur.execute("""
            SELECT control_id, full_batch_id 
            FROM submission_batches 
            WHERE batch_id = %s
        """, (batch_id,))
        
        batch = cur.fetchone()
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")
        
        if not batch["control_id"]:
            raise HTTPException(status_code=400, detail="No lab results imported yet")
        
        # Get all lab result data
        cur.execute("""
            SELECT lrd.*, s.bag_id, s.sample_sequence
            FROM lab_result_data lrd
            JOIN samples s ON lrd.sample_id = s.id
            WHERE lrd.lab_result_id IN (
                SELECT id FROM lab_results WHERE batch_id = %s
            )
            ORDER BY s.sample_sequence, lrd.field_name
        """, (batch_id,))
        
        data_rows = cur.fetchall()
        
        # Pivot data by sample
        samples_data = {}
        for row in data_rows:
            sample_seq = row["sample_sequence"]
            if sample_seq not in samples_data:
                samples_data[sample_seq] = {"Batch_ID": batch["full_batch_id"]}
            samples_data[sample_seq][row["field_name"]] = row["field_value"]
        
        # Get all field names for header
        all_fields = set()
        for sample in samples_data.values():
            all_fields.update(sample.keys())
        
        # Sort fields
        field_order = ["Batch_ID", "ControlID", "ClientName", "LabNo", "ReportDate"]
        other_fields = sorted(all_fields - set(field_order))
        headers = [f for f in field_order if f in all_fields] + other_fields
        
        # Generate CSV
        output = StringIO()
        writer = csv.DictWriter(output, fieldnames=headers, extrasaction='ignore')
        writer.writeheader()
        
        for sample_seq in sorted(samples_data.keys()):
            writer.writerow(samples_data[sample_seq])
        
        # Save file
        csv_filename = f"{batch['full_batch_id']}_for_rec_system.csv"
        csv_path = os.path.join(CSV_EXPORT_DIR, csv_filename)
        
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            f.write(output.getvalue())
        
        return {
            "batch_id": batch_id,
            "full_batch_id": batch["full_batch_id"],
            "csv_filename": csv_filename,
            "csv_path": csv_path,
            "sample_count": len(samples_data)
        }

@app.get("/api/batches/{batch_id}/download-rec-csv")
def download_rec_csv(batch_id: str):
    """Download CSV for rec system import."""
    csv_filename = f"*{batch_id}*_for_rec_system.csv"
    
    # Find the file
    import glob
    matches = glob.glob(os.path.join(CSV_EXPORT_DIR, csv_filename))
    
    if not matches:
        raise HTTPException(status_code=404, detail="Rec system CSV not generated yet")
    
    return FileResponse(
        matches[0],
        media_type="text/csv",
        filename=os.path.basename(matches[0])
    )

# =====================================================
# HEALTH CHECK
# =====================================================

@app.get("/")
def health_check():
    """API health check."""
    return {
        "status": "healthy",
        "service": "KAS Soil Submission Portal API",
        "version": "1.0.0",
        "phase": "1 - Internal Submission"
    }

@app.get("/api/stats")
def get_stats():
    """Get system statistics."""
    with get_db() as (conn, cur):
        cur.execute("SELECT COUNT(*) as total FROM submission_batches")
        total_batches = cur.fetchone()["total"]
        
        cur.execute("SELECT COUNT(*) as total FROM samples")
        total_samples = cur.fetchone()["total"]
        
        cur.execute("SELECT COUNT(*) as total FROM companies")
        total_companies = cur.fetchone()["total"]
        
        cur.execute("""
            SELECT COUNT(*) as total FROM submission_batches 
            WHERE status = 'Lab Results Received'
        """)
        completed_batches = cur.fetchone()["total"]
        
        return {
            "total_batches": total_batches,
            "total_samples": total_samples,
            "total_companies": total_companies,
            "completed_batches": completed_batches
        }

# =====================================================
# PLOT HISTORY LOOKUP (for autofill)
# =====================================================

@app.get("/api/plot-history/{plot_id}")
def get_plot_history(plot_id: str):
    """
    Get historical data for a Plot ID from kas_desktop schema.
    Used for auto-filling sample data based on previous submissions.
    """
    if not plot_id or len(plot_id.strip()) < 2:
        return []
    
    plot_id_normalized = plot_id.strip().upper()
    
    with get_db() as (conn, cur):
        try:
            # Query kas_desktop schema for plot history
            cur.execute("SET search_path TO kas_desktop")
            
            cur.execute("""
                SELECT DISTINCT ON (s.batch_id)
                    s.value as field_value,
                    s.field_name,
                    b.batch_id,
                    b.import_date
                FROM samples s
                JOIN batches b ON s.batch_id = b.batch_id
                WHERE UPPER(s.value) = %s 
                AND s.field_name IN ('Plot_ID', 'PlotID', 'Plot ID')
                ORDER BY s.batch_id, b.import_date DESC
                LIMIT 3
            """, (plot_id_normalized,))
            
            plot_batches = cur.fetchall()
            
            if not plot_batches:
                return []
            
            results = []
            for batch_row in plot_batches:
                batch_id = batch_row["batch_id"]
                
                # Get all sample data for this batch/plot
                cur.execute("""
                    SELECT s.sample_index, s.field_name, s.value
                    FROM samples s
                    WHERE s.batch_id = %s
                    AND EXISTS (
                        SELECT 1 FROM samples s2
                        WHERE s2.batch_id = s.batch_id
                        AND s2.sample_index = s.sample_index
                        AND s2.field_name IN ('Plot_ID', 'PlotID', 'Plot ID')
                        AND UPPER(s2.value) = %s
                    )
                    ORDER BY s.sample_index
                """, (batch_id, plot_id_normalized))
                
                sample_data = {}
                for row in cur.fetchall():
                    field = row["field_name"]
                    value = row["value"]
                    if value:
                        sample_data[field] = value
                
                if sample_data:
                    results.append({
                        "batch_id": batch_id,
                        "import_date": batch_row["import_date"],
                        "crop": sample_data.get("Crop"),
                        "previous_crop": sample_data.get("Previous Crop") or sample_data.get("Previous_Crop"),
                        "yield_goal": sample_data.get("Expected_Yield"),
                        "grower": sample_data.get("Grower"),
                        "farm": sample_data.get("Farm"),
                        "field": sample_data.get("Field")
                    })
            
            # Reset search path
            cur.execute("SET search_path TO kas_portal")
            
            return results
            
        except Exception as e:
            print(f"Error fetching plot history: {e}")
            # Reset search path on error
            cur.execute("SET search_path TO kas_portal")
            return []

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)