import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from ml import extract_text, extract_skills, recommend

app = Flask(__name__)
CORS(app)
# MySQL: export DATABASE_URL="mysql+pymysql://root:password@localhost/job_portal"
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///job_portal.db")
db = SQLAlchemy(app)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    skills = db.Column(db.Text, default="")

class Job(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120), nullable=False)
    company = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=False)
    skills = db.Column(db.Text, nullable=False)

class Recommendation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    job_id = db.Column(db.Integer, db.ForeignKey("job.id"), nullable=False)
    score = db.Column(db.Float, nullable=False)
    missing_skills = db.Column(db.Text, default="")

class Application(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    job_id = db.Column(db.Integer, db.ForeignKey("job.id"), nullable=False)

SEED = [
    ("Machine Learning Intern", "TechNova", "Build and train ML models on tabular data using Python and scikit-learn.", "python,machine learning,scikit-learn,pandas,numpy,sql"),
    ("Data Analyst", "InsightHub", "Analyse business data, build dashboards and reports.", "sql,excel,power bi,tableau,python,statistics"),
    ("Full Stack Developer", "WebWorks", "Develop web apps with React frontends and Flask REST APIs.", "react,javascript,flask,python,mysql,rest api,html,css"),
    ("Deep Learning Engineer", "VisionAI", "Design neural networks for computer vision and NLP tasks.", "python,deep learning,tensorflow,pytorch,computer vision,nlp"),
    ("Backend Developer", "CloudBase", "Build scalable services, deploy with Docker on AWS.", "python,django,sql,docker,aws,git,linux"),
    ("Frontend Developer", "PixelCraft", "Create responsive interfaces with modern JavaScript.", "javascript,react,html,css,bootstrap,git"),
]

with app.app_context():
    db.create_all()
    if Job.query.count() == 0:
        db.session.add_all(Job(title=t, company=c, description=d, skills=s) for t, c, d, s in SEED)
        db.session.commit()

def job_dict(j):
    return {"id": j.id, "title": j.title, "company": j.company, "description": j.description}

@app.post("/api/register")
def register():
    d = request.get_json()
    user = User.query.filter_by(email=d["email"]).first()
    if not user:
        user = User(name=d["name"], email=d["email"])
        db.session.add(user)
        db.session.commit()
    return jsonify({"id": user.id, "name": user.name})

@app.post("/api/upload-resume")
def upload_resume():
    user = db.session.get(User, int(request.form["user_id"]))
    f = request.files.get("resume")
    if not user or not f:
        return jsonify({"error": "user_id and resume PDF required"}), 400
    skills = extract_skills(extract_text(f))
    user.skills = ",".join(skills)
    Recommendation.query.filter_by(user_id=user.id).delete()
    results = recommend(skills, Job.query.all())
    for r in results:
        db.session.add(Recommendation(user_id=user.id, job_id=r["job"].id,
                                      score=r["score"], missing_skills=",".join(r["missing"])))
    db.session.commit()
    return jsonify({"skills": skills, "recommendations": [
        {**job_dict(r["job"]), "score": r["score"], "matched": r["matched"], "missing": r["missing"]}
        for r in results]})

@app.post("/api/apply")
def apply_job():
    d = request.get_json()
    db.session.add(Application(user_id=d["user_id"], job_id=d["job_id"]))
    db.session.commit()
    return jsonify({"status": "applied"})

@app.get("/api/applications/<int:user_id>")
def applications(user_id):
    rows = db.session.query(Application, Job).join(Job, Job.id == Application.job_id)\
        .filter(Application.user_id == user_id).all()
    return jsonify([job_dict(j) for _, j in rows])

if __name__ == "__main__":
    app.run(debug=True, port=5000)
