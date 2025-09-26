from rest_framework.views import APIView 
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.generics import CreateAPIView
from django.shortcuts import get_object_or_404
from django.core.exceptions import PermissionDenied
from django.http import JsonResponse
from rest_framework.viewsets import ModelViewSet
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

# Import models
from .models import (
    User, Roles, Patient, Appointment, MedicalRecord, Prescription,
    LabResult, Task, Medication, Alert, HandoverLog, PrescribedMedication
)

# Import serializers
from .serializers import (
    UserSerializer, SignupSerializer, CreateDoctorSerializer,
    CreateLabTechnicianSerializer, CreatePharmacistSerializer,
    PatientSerializer, DoctorPatientSerializer, CreatePatientSerializer,
    AppointmentSerializer, CreateAppointmentSerializer,
    MedicalRecordSerializer, CreateMedicalRecordSerializer,
    AdminCreateUserSerializer, UserSettingsSerializer,
    PrescriptionSerializer, LabResultSerializer,
    TaskSerializer, MedicationSerializer, AlertSerializer,
    HandoverLogSerializer, NurseSerializer, PrescribedMedicationSerializer
)

# Import permissions
from .permissions import IsAdmin, IsDoctor, IsPatient, IsReceptionist, IsPharmacist, IsNurse

# =========================================================
# SIGNUP VIEW
# =========================================================
class SignupView(CreateAPIView):
    queryset = User.objects.all()
    serializer_class = SignupSerializer
    permission_classes = [AllowAny]

# =========================================================
# "ME" endpoint (generic)
# =========================================================
class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

# =========================================================
# USERS (Admins only)
# =========================================================
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("-date_joined")
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return AdminCreateUserSerializer
        return UserSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {"message": "User created successfully!", "user": AdminCreateUserSerializer(user).data},
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {"message": "User updated successfully!", "user": AdminCreateUserSerializer(user).data},
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response({"message": "User deleted successfully!"}, status=status.HTTP_204_NO_CONTENT)

# =========================================================
# DOCTORS
# =========================================================
class DoctorViewSet(viewsets.ModelViewSet):
    queryset = User.objects.filter(role=Roles.DOCTOR).order_by("-date_joined")
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        return CreateDoctorSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == Roles.DOCTOR:
            return User.objects.filter(id=user.id)
        elif user.role in [Roles.ADMIN, Roles.RECEPTIONIST]:
            return User.objects.filter(role=Roles.DOCTOR)
        return User.objects.none()

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated, IsDoctor])
    def patients(self, request):
        patients = Patient.objects.filter(assigned_doctor=request.user)
        serializer = DoctorPatientSerializer(patients, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated, IsDoctor])
    def appointments(self, request):
        appointments = Appointment.objects.filter(doctor=request.user)
        serializer = AppointmentSerializer(appointments, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated, IsDoctor])
    def dashboard(self, request):
        total_patients = Patient.objects.filter(assigned_doctor=request.user).count()
        total_appointments = Appointment.objects.filter(doctor=request.user).count()
        total_records = MedicalRecord.objects.filter(patient__assigned_doctor=request.user).count()
        return Response({
            "total_patients": total_patients,
            "total_appointments": total_appointments,
            "total_records": total_records,
        })

# =========================================================
# NURSE DASHBOARD VIEWSETS (FULL CRUD)
# =========================================================

# ------------------------------
# Nurse Tasks CRUD
# ------------------------------
class NurseTasksViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated, IsNurse]

    def get_queryset(self):
        """
        Restrict tasks to only those assigned to the current nurse.
        Returns tasks in descending order of creation date.
        """
        return Task.objects.filter(nurse=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        """
        Automatically assign the logged-in nurse as the task owner when creating.
        """
        serializer.save(nurse=self.request.user)
    
    def perform_update(self, serializer):
        """
        Allow nurses to update their own tasks (e.g., mark as completed)
        """
        instance = serializer.save()
        if serializer.validated_data.get('completed') and not instance.completed_at:
            instance.completed_at = timezone.now()
            instance.save()

# ------------------------------
# Nurse Medications CRUD
# ------------------------------
class NurseMedicationsViewSet(viewsets.ModelViewSet):
    """
    Nurse Dashboard → Medications
    Full CRUD functionality for medications linked to patients under the nurse's care.
    """
    serializer_class = MedicationSerializer
    permission_classes = [IsAuthenticated, IsNurse]

    def get_queryset(self):
        """
        Return all medications for now - nurses can see all medications
        In a real system, you might want to filter by assigned patients
        """
        return Medication.objects.all().order_by("-scheduled_time")

    def perform_create(self, serializer):
        """
        Save new medication.
        """
        serializer.save()

# ------------------------------
# Nurse Alerts CRUD
# ------------------------------
class NurseAlertsViewSet(viewsets.ModelViewSet):
    """
    Nurse Dashboard → Alerts
    Full CRUD functionality for alerts.
    """
    serializer_class = AlertSerializer
    permission_classes = [IsAuthenticated, IsNurse]

    def get_queryset(self):
        """
        Return all alerts for now - nurses should see all patient alerts
        """
        return Alert.objects.all().order_by("-created_at")

    def perform_create(self, serializer):
        """
        Save new alert.
        """
        serializer.save()

# ------------------------------
# Nurse Handover Logs CRUD
# ------------------------------
class NurseHandoversViewSet(viewsets.ModelViewSet):
    """
    Nurse Dashboard → Handover Logs
    Full CRUD functionality for handover notes of the logged-in nurse.
    """
    serializer_class = HandoverLogSerializer
    permission_classes = [IsAuthenticated, IsNurse]

    def get_queryset(self):
        """
        Return all handover logs - nurses should see all handovers for continuity of care
        """
        return HandoverLog.objects.all().order_by("-created_at")

    def perform_create(self, serializer):
        """
        Automatically assign the current nurse when creating a new handover log.
        """
        serializer.save(nurse=self.request.user)

# =========================================================
# TASKS
# =========================================================
class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

# =========================================================
# MEDICATIONS
# =========================================================
class MedicationViewSet(viewsets.ModelViewSet):
    queryset = Medication.objects.all()
    serializer_class = MedicationSerializer
    permission_classes = [IsAuthenticated]

# =========================================================
# ALERTS
# =========================================================
class AlertViewSet(viewsets.ModelViewSet):
    queryset = Alert.objects.all()
    serializer_class = AlertSerializer
    permission_classes = [IsAuthenticated]

# =========================================================
# HANDOVER NOTES
# =========================================================
class HandoverLogViewSet(viewsets.ModelViewSet):
    queryset = HandoverLog.objects.all().order_by("-created_at")
    serializer_class = HandoverLogSerializer
    permission_classes = [IsAuthenticated]

# =========================================================
# APPOINTMENTS - FIXED VERSION
# =========================================================
class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        try:
            user = self.request.user
            logger.info(f"AppointmentViewSet.get_queryset called for user: {user.username} (role: {user.role})")
            
            queryset = Appointment.objects.select_related('patient__user', 'doctor').all()
            
            if user.role == Roles.PATIENT:
                # Patient can only see their own appointments
                patient_profile = getattr(user, 'patient_profile', None)
                if patient_profile:
                    queryset = queryset.filter(patient=patient_profile)
                else:
                    queryset = Appointment.objects.none()
            elif user.role == Roles.DOCTOR:
                # Doctor can see appointments where they are the doctor
                queryset = queryset.filter(doctor=user)
            elif user.role in [Roles.ADMIN, Roles.RECEPTIONIST, Roles.NURSE]:
                # Admin, receptionist, and nurse can see all appointments
                pass
            else:
                queryset = Appointment.objects.none()
            
            return queryset.order_by("-created_at")
            
        except Exception as e:
            logger.error(f"Error in AppointmentViewSet.get_queryset: {str(e)}")
            # Return empty queryset on error to prevent 500 errors
            return Appointment.objects.none()

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return CreateAppointmentSerializer
        return AppointmentSerializer

    def list(self, request, *args, **kwargs):
        try:
            queryset = self.filter_queryset(self.get_queryset())
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error in AppointmentViewSet.list: {str(e)}")
            return Response(
                {"error": "Unable to fetch appointments", "detail": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def perform_create(self, serializer):
        try:
            user = self.request.user
            if user.role == Roles.PATIENT:
                patient = getattr(user, "patient_profile", None)
                if not patient:
                    raise PermissionDenied("Patient profile not found.")
                doctor = serializer.validated_data.get("doctor")
                if not doctor:
                    raise PermissionDenied("Doctor is required to book an appointment.")
                serializer.save(patient=patient, doctor=doctor, requested_by_patient=True)
            elif user.role in [Roles.RECEPTIONIST, Roles.ADMIN]:
                patient = serializer.validated_data.get("patient")
                doctor = serializer.validated_data.get("doctor")
                if not patient or not doctor:
                    raise PermissionDenied("Patient and Doctor are required.")
                serializer.save(patient=patient, doctor=doctor, requested_by_patient=False)
            else:
                raise PermissionDenied("You are not allowed to create appointments.")
        except Exception as e:
            logger.error(f"Error in AppointmentViewSet.perform_create: {str(e)}")
            raise

# =========================================================
# MEDICAL RECORDS
# =========================================================
class MedicalRecordViewSet(viewsets.ModelViewSet):
    queryset = MedicalRecord.objects.all().order_by("-created_at")
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return CreateMedicalRecordSerializer
        return MedicalRecordSerializer

    def get_queryset(self):
        user = self.request.user
        qs = MedicalRecord.objects.all()
        
        # Filter by query parameters
        patient_id = self.request.query_params.get('patient')
        appointment_id = self.request.query_params.get('appointment')
        
        if patient_id:
            qs = qs.filter(patient_id=patient_id)
        if appointment_id:
            qs = qs.filter(appointment_id=appointment_id)
            
        if user.role == Roles.PATIENT:
            return qs.filter(patient__user=user)
        elif user.role == Roles.DOCTOR:
            return qs.filter(patient__assigned_doctor=user)
        elif user.role == Roles.LAB:
            return qs.filter(created_by=user)
        elif user.role == Roles.NURSE:
            return qs  # Nurses can see all medical records
        elif user.role == Roles.RECEPTIONIST:
            return qs.none()
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        patient = serializer.validated_data.get("patient")
        if user.role == Roles.DOCTOR and patient.assigned_doctor != user:
            raise PermissionDenied("You can only add records for your assigned patients.")
        elif user.role not in [Roles.DOCTOR, Roles.LAB, Roles.ADMIN, Roles.NURSE]:
            raise PermissionDenied("You are not allowed to create medical records.")
        serializer.save(created_by=user)

    def perform_update(self, serializer):
        user = self.request.user
        patient = serializer.instance.patient
        if user.role == Roles.DOCTOR and patient.assigned_doctor != user:
            raise PermissionDenied("You cannot update records for patients not assigned to you.")
        serializer.save()

# =========================================================
# PRESCRIPTIONS
# =========================================================
class PrescriptionViewSet(viewsets.ModelViewSet):
    queryset = Prescription.objects.all().order_by("-created_at")
    serializer_class = PrescriptionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Prescription.objects.all()
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status__iexact=status_param)

        if user.role == Roles.DOCTOR:
            qs = qs.filter(patient__assigned_doctor=user)
        elif user.role == Roles.PATIENT:
            qs = qs.filter(patient__user=user)
        elif user.role == Roles.NURSE:
            # Nurses can see all prescriptions
            pass
        return qs

# =========================================================
# PRESCRIBED MEDICATIONS
# =========================================================
class PrescribedMedicationViewSet(viewsets.ModelViewSet):
    queryset = PrescribedMedication.objects.all().order_by("-date_prescribed")
    serializer_class = PrescribedMedicationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PrescribedMedication.objects.all().order_by("-date_prescribed")

class PrescribedMedicationList(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        meds = PrescribedMedication.objects.all()
        serializer = PrescribedMedicationSerializer(meds, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

# =========================================================
# PATIENTS
# =========================================================
class PatientViewSet(viewsets.ModelViewSet):
    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Patient.objects.select_related('user').all().order_by("id")

    def get_serializer_class(self):
        if self.action in ["create"]:
            return CreatePatientSerializer
        return PatientSerializer

    @action(detail=True, methods=['post'])
    def admit(self, request, pk=None):
        patient = self.get_object()
        patient.status = 'Admitted'
        patient.save()
        return Response({'status': 'Patient admitted'})

    @action(detail=True, methods=['post'])  
    def discharge(self, request, pk=None):
        patient = self.get_object()
        patient.status = 'Discharged'
        patient.save()
        return Response({'status': 'Patient discharged'})

    @action(detail=True, methods=['post'])
    def attend(self, request, pk=None):
        patient = self.get_object()
        patient.status = 'Attended'
        patient.save()
        return Response({'status': 'Patient attended'})
    
    def perform_update(self, serializer):
        """
        Allow updating patient information including vitals and status
        """
        serializer.save()

# =========================================================
# LAB RESULTS
# =========================================================
class LabResultViewSet(viewsets.ModelViewSet):
    queryset = LabResult.objects.all().order_by("-created_at")
    serializer_class = LabResultSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = LabResult.objects.all().order_by("-created_at")
        doctor_param = self.request.query_params.get("doctor")

        if doctor_param == "true" and user.role == Roles.DOCTOR:
            qs = qs.filter(patient__assigned_doctor=user)
        elif user.role == Roles.PATIENT:
            qs = qs.filter(patient__user=user)
        elif user.role == Roles.LAB:
            qs = qs.filter(created_by=user)
        elif user.role == Roles.NURSE:
            # Nurses can see all lab results
            pass
        elif user.role == Roles.RECEPTIONIST:
            qs = qs.none()
        return qs

# =========================================================
# LAB TECHNICIANS
# =========================================================
class LabTechnicianViewSet(viewsets.ModelViewSet):
    queryset = User.objects.filter(role=Roles.LAB)
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return CreateLabTechnicianSerializer
        return UserSerializer

# =========================================================
# PHARMACISTS
# =========================================================
class PharmacistViewSet(viewsets.ModelViewSet):
    queryset = User.objects.filter(role=Roles.PHARMACIST)
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return CreatePharmacistSerializer
        return UserSerializer

# =========================================================
# USER SETTINGS
# =========================================================
class UserSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            settings = request.user.settings
            serializer = UserSettingsSerializer(settings)
            return Response(serializer.data)
        except AttributeError:
            # User doesn't have settings yet, create default ones
            from .models import UserSettings
            settings = UserSettings.objects.create(user=request.user)
            serializer = UserSettingsSerializer(settings)
            return Response(serializer.data)

    def put(self, request):
        try:
            settings = request.user.settings
        except AttributeError:
            from .models import UserSettings
            settings = UserSettings.objects.create(user=request.user)
            
        serializer = UserSettingsSerializer(settings, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Settings updated successfully!", "settings": serializer.data})

    def patch(self, request):
        try:
            settings = request.user.settings
        except AttributeError:
            from .models import UserSettings
            settings = UserSettings.objects.create(user=request.user)
            
        serializer = UserSettingsSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Settings updated successfully!", "settings": serializer.data})

# =========================================================
# NURSE "ME" ENDPOINT
# =========================================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def nurse_me(request):
    """
    Simple endpoint for a nurse to retrieve their own profile.
    """
    user = request.user
    if user.role == Roles.NURSE:
        return Response({
            "id": user.id,
            "name": user.get_full_name() or user.username,
            "username": user.username,
            "email": user.email,
            "role": user.role,
        })
    return Response({"detail": "Not a nurse."}, status=404)

# =========================================================
# NO PAGINATION VIEWSET
# =========================================================
class NoPaginationModelViewSet(ModelViewSet):
    """
    Helper ViewSet for cases where you want all results without pagination.
    """
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)