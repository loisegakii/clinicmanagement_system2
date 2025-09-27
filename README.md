**Clinic Management System**
A web-based Clinic Management System built using Django REST Framework (backend) and React.js (frontend). 
This system enables receptionists, nurses, and doctors to manage patients, tasks, medications, lab results, and handover logs efficiently.
A full-stack clinic management system with:
- **Backend**: Django REST Framework + JWT authentication  
- **Frontend**: React + Tailwind  
- **Database**: PostgreSQL (configurable)  

This project allows administrators, doctors, lab technicians, pharmacists, and receptionists to manage patients, appointments, and medical records in one unified platform

## Project Structure


##  Features
- **Authentication & Roles** (Admin, Doctor, Patient, etc.)
- **Doctor Profiles** (specialization, schedule, etc.)
- **Appointments** (approve, decline, start consultation)
- **Medical Records** (linked to patients)
- **User Settings** (notifications, themes, layout preferences)
- **Dashboard** for staff

## ⚙️ Backend Setup (Django)
1. Navigate to backend:
   ```bash
   cd clinic-cms

python -m venv venv
source venv/bin/activate   # Mac/Linux
venv\Scripts\activate      # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver

## Frontend Setup (React)
**Navigate to frontend:**
cd clinic-frontend
**Install dependencies:**
npm install
**Start development server:**
npm start
Frontend will run at http://localhost:5173
## API Authentication

**Obtain JWT token:**
POST /api/token/
**Refresh token:**
POST /api/token/refresh/
**Verify token:**
POST /api/token/verify/

## API Endpoints (Examples)
/api/users/ → Manage users
/api/patients/ → CRUD for patients
/api/doctors/ → Manage doctors (with specialization)
/api/appointments/ → Book & manage appointments
/api/medical-records/ → Patient medical history
/api/user-settings/ → Manage user preferences

## Tech Stack
Backend: Django REST Framework, SimpleJWT
Frontend: React, TailwindCSS
Database: PostgreSQL (can switch to SQLite/MySQL)
Auth: JWT-based authentication

