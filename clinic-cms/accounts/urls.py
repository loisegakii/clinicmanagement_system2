# accounts/urls.py
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)
from rest_framework_nested import routers
from .views import (
    MeView,
    SignupView,
    UserViewSet,
    PatientViewSet,
    DoctorViewSet,
    LabTechnicianViewSet,
    PharmacistViewSet,
    AppointmentViewSet,
    MedicalRecordViewSet,
    UserSettingsView,   # ✅ FIX: use APIView not ViewSet
)

# =========================================================
# MAIN ROUTERS
# =========================================================
router = routers.DefaultRouter()
router.register(r"users", UserViewSet, basename="user")                        # Admin-only user management
router.register(r"doctors", DoctorViewSet, basename="doctor")                  # Doctors CRUD + custom doctor actions
router.register(r"lab-technicians", LabTechnicianViewSet, basename="lab")      # Lab staff
router.register(r"pharmacists", PharmacistViewSet, basename="pharmacist")      # Pharmacy staff
router.register(r"patients", PatientViewSet, basename="patient")               # Patients (Admin/Receptionist managed)
router.register(r"appointments", AppointmentViewSet, basename="appointment")   # Appointments
router.register(r"medical-records", MedicalRecordViewSet, basename="medicalrecord") # Medical records

# =========================================================
# NESTED ROUTERS
# Example: /patients/{id}/medical-records/
# =========================================================
patients_router = routers.NestedDefaultRouter(router, r"patients", lookup="patient")
patients_router.register(
    r"medical-records",
    MedicalRecordViewSet,
    basename="patient-medicalrecord",
)

# =========================================================
# URL PATTERNS
# =========================================================
urlpatterns = [
    # ----------------------
    # JWT Authentication
    # ----------------------
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("token/verify/", TokenVerifyView.as_view(), name="token_verify"),

    # ----------------------
    # App-wide endpoints
    # ----------------------
    path("signup/", SignupView.as_view(), name="signup"),  # Public signup (optional)
    path("me/", MeView.as_view(), name="me"),              # Current user profile
    path("settings/", UserSettingsView.as_view(), name="user-settings"),  # ✅ FIX: APIView, not router

    # ----------------------
    # Routers (auto-generated REST routes)
    # ----------------------
    path("", include(router.urls)),
    path("", include(patients_router.urls)),
]
