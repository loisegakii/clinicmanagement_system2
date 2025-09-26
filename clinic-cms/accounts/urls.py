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
    PrescriptionViewSet,
    LabResultViewSet,
    UserSettingsView,
    nurse_me,
    PrescribedMedicationList,
    NurseTasksViewSet,
    NurseMedicationsViewSet,
    NurseAlertsViewSet,
    NurseHandoversViewSet,
)

# -------------------------
# MAIN ROUTER
# -------------------------
router = routers.DefaultRouter()
router.register(r"users", UserViewSet, basename="user")
router.register(r"doctors", DoctorViewSet, basename="doctor")
router.register(r"lab-technicians", LabTechnicianViewSet, basename="lab")
router.register(r"pharmacists", PharmacistViewSet, basename="pharmacist")
router.register(r"patients", PatientViewSet, basename="patient")
router.register(r"appointments", AppointmentViewSet, basename="appointment")
router.register(r"medical-records", MedicalRecordViewSet, basename="medicalrecord")
router.register(r"prescriptions", PrescriptionViewSet, basename="prescription")
router.register(r"lab-results", LabResultViewSet, basename="labresult")

# -------------------------
# NURSE DASHBOARD ROUTER
# -------------------------
nurse_router = routers.DefaultRouter()
nurse_router.register(r"nurse/tasks", NurseTasksViewSet, basename="nurse-tasks")
nurse_router.register(r"nurse/medications", NurseMedicationsViewSet, basename="nurse-medications")
nurse_router.register(r"nurse/alerts", NurseAlertsViewSet, basename="nurse-alerts")
nurse_router.register(r"nurse/handovers", NurseHandoversViewSet, basename="nurse-handovers")

# -------------------------
# NESTED ROUTER: patient medical records
# -------------------------
patients_router = routers.NestedDefaultRouter(router, r"patients", lookup="patient")
patients_router.register(
    r"medical-records",
    MedicalRecordViewSet,
    basename="patient-medicalrecord",
)

# -------------------------
# URL PATTERNS
# -------------------------
urlpatterns = [
    # JWT Authentication
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("token/verify/", TokenVerifyView.as_view(), name="token_verify"),

    # Prescribed Medications (shared endpoint)
    path("prescribed-medications/", PrescribedMedicationList.as_view(), name="prescribed-medications"),

    # User-specific endpoints
    path("signup/", SignupView.as_view(), name="signup"),
    path("me/", MeView.as_view(), name="me"),
    path("settings/", UserSettingsView.as_view(), name="user-settings"),
    path("nurse/me/", nurse_me, name="nurse-me"),

    # Include routers
    path("", include(router.urls)),
    path("", include(patients_router.urls)),
    path("", include(nurse_router.urls)),
]
