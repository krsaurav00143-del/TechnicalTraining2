# AI-Based Job Recommendation and Skill Gap Analysis System

## Run backend
    cd backend
    pip install -r requirements.txt
    python app.py                       # uses SQLite by default
    # For MySQL: run schema.sql, then
    # export DATABASE_URL="mysql+pymysql://root:PASSWORD@localhost/job_portal"

## Run frontend
    cd frontend
    npm install
    npm run dev                         # http://localhost:5173

## Flow
Register -> upload PDF resume -> skills extracted (pdfplumber + keyword matching)
-> TF-IDF cosine similarity (60%) + skill overlap (40%) ranks jobs
-> skill-gap report -> recommendations and applications saved to the database.
