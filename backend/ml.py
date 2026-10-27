import re
import pdfplumber
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

SKILLS = ["python", "java", "c++", "javascript", "react", "flask", "django", "sql", "mysql",
          "mongodb", "html", "css", "git", "machine learning", "deep learning", "tensorflow",
          "keras", "pytorch", "scikit-learn", "pandas", "numpy", "nlp", "computer vision",
          "data analysis", "statistics", "power bi", "tableau", "docker", "aws", "rest api",
          "bootstrap", "node.js", "excel", "linux"]

def extract_text(file_obj):
    with pdfplumber.open(file_obj) as pdf:
        return "\n".join((p.extract_text() or "") for p in pdf.pages)

def extract_skills(text):
    text = text.lower()
    return sorted(s for s in SKILLS
                  if re.search(r"(?<![a-z0-9+])" + re.escape(s) + r"(?![a-z0-9+])", text))

def recommend(user_skills, jobs, top_n=10):
    """Rank jobs: 60% TF-IDF cosine similarity + 40% skill overlap ratio."""
    if not jobs:
        return []
    docs = [f"{j.title} {j.description} {j.skills}" for j in jobs]
    vec = TfidfVectorizer(stop_words="english")
    matrix = vec.fit_transform(docs + [" ".join(user_skills)])
    sims = cosine_similarity(matrix[-1], matrix[:-1]).flatten()
    have = set(user_skills)
    results = []
    for job, sim in zip(jobs, sims):
        req = {s.strip().lower() for s in job.skills.split(",") if s.strip()}
        overlap = len(req & have) / len(req) if req else 0
        results.append({"job": job, "score": round(0.6 * float(sim) + 0.4 * overlap, 4),
                        "matched": sorted(req & have), "missing": sorted(req - have)})
    return sorted(results, key=lambda r: r["score"], reverse=True)[:top_n]
