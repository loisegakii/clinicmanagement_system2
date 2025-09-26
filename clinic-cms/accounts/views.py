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
from datetime import timedelta
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
    def notifications(self, request):
        """
        Get notifications for the current doctor
        """
        try:
            # Get pending appointments
            pending_appointments = Appointment.objects.filter(
                doctor=request.user,
                status__in=['REQUESTED', 'PENDING']
            ).count()
            
            # Get lab results ready for review (last 7 days)
            lab_results = LabResult.objects.filter(
                patient__assigned_doctor=request.user,
                created_at__gte=timezone.now() - timedelta(days=7)
            ).count()
            
            # Get completed medical records (last 24 hours)
            completed_records = MedicalRecord.objects.filter(
                patient__assigned_doctor=request.user,
                created_at__gte=timezone.now() - timedelta(days=1)
            ).count()

            notifications = []
            
            if pending_appointments > 0:
                notifications.append({
                    "message": f"You have {pending_appointments} pending appointment(s) requiring approval",
                    "type": "appointment",
                    "count": pending_appointments
                })
                
            if lab_results > 0:
                notifications.append({
                    "message": f"{lab_results} new lab result(s) available for review",
                    "type": "lab_result", 
                    "count": lab_results
                })
                
            if completed_records > 0:
                notifications.append({
                    "message": f"{completed_records} new medical record(s) created",
                    "type": "medical_record",
                    "count": completed_records
                })

            return Response(notifications)
            
        except Exception as e:
            logger.error(f"Error fetching doctor notifications: {str(e)}")
            return Response([], status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated, IsDoctor])
    def patients(self, request):
        """
        Enhanced patients endpoint with comprehensive data
        """
        try:
            patients = Patient.objects.filter(assigned_doctor=request.user).select_related('user')
            
            # Add comprehensive patient data
            patient_data = []
            for patient in patients:
                # Calculate age
                age = None
                if patient.date_of_birth:
                    today = timezone.now().date()
                    age = today.year - patient.date_of_birth.year
                    if today.month < patient.date_of_birth.month or (
                        today.month == patient.date_of_birth.month and 
                        today.day < patient.date_of_birth.day
                    ):
                        age -= 1
                
                patient_info = {
                    "id": patient.id,
                    "name": f"{patient.user.first_name} {patient.user.last_name}".strip(),
                    "first_name": patient.user.first_name,
                    "last_name": patient.user.last_name,
                    "username": patient.user.username,
                    "email": patient.user.email,
                    "phone": patient.phone,
                    "age": age,
                    "gender": patient.gender,
                    "status": patient.status,
                    "date_of_birth": patient.date_of_birth,
                    "address": patient.address,
                    "next_of_kin_name": patient.next_of_kin_name,
                    "next_of_kin_phone": patient.next_of_kin_phone,
                    "temperature": float(patient.temperature) if patient.temperature else None,
                    "blood_pressure": patient.blood_pressure,
                    "heart_rate": patient.heart_rate,
                    "respiratory_rate": patient.respiratory_rate,
                    "notes_for_doctor": patient.notes_for_doctor,
                    "created_at": patient.created_at
                }
                patient_data.append(patient_info)
            
            return Response(patient_data)
            
        except Exception as e:
            logger.error(f"Error fetching doctor patients: {str(e)}")
            return Response({"error": "Failed to fetch patients"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated, IsDoctor])
    def appointments(self, request):
        """
        Enhanced appointments endpoint with patient details
        """
        try:
            appointments = Appointment.objects.filter(
                doctor=request.user
            ).select_related('patient__user').order_by('-created_at')
            
            appointment_data = []
            for appointment in appointments:
                # Calculate patient age if date of birth exists
                patient_age = None
                if appointment.patient.date_of_birth:
                    today = timezone.now().date()
                    patient_age = today.year - appointment.patient.date_of_birth.year
                    if today.month < appointment.patient.date_of_birth.month or (
                        today.month == appointment.patient.date_of_birth.month and 
                        today.day < appointment.patient.date_of_birth.day
                    ):
                        patient_age -= 1

                appointment_info = {
                    "id": appointment.id,
                    "patient_id": appointment.patient.id,
                    "patient_name": f"{appointment.patient.user.first_name} {appointment.patient.user.last_name}".strip(),
                    "patient": {
                        "id": appointment.patient.id,
                        "name": f"{appointment.patient.user.first_name} {appointment.patient.user.last_name}".strip(),
                        "phone": appointment.patient.phone,
                        "age": patient_age
                    },
                    "date": appointment.date,
                    "time": appointment.time,
                    "status": appointment.status,
                    "reason": appointment.reason,
                    "notes": appointment.notes,
                    "is_emergency": appointment.reason and "emergency" in appointment.reason.lower(),
                    "created_at": appointment.created_at
                }
                appointment_data.append(appointment_info)
            
            return Response(appointment_data)
            
        except Exception as e:
            logger.error(f"Error fetching doctor appointments: {str(e)}")
            return Response({"error": "Failed to fetch appointments"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated, IsDoctor])
    def dashboard(self, request):
        """
        Enhanced dashboard stats
        """
        try:
            total_patients = Patient.objects.filter(assigned_doctor=request.user).count()
            
            total_appointments = Appointment.objects.filter(doctor=request.user).count()
            pending_appointments = Appointment.objects.filter(
                doctor=request.user,
                status__in=['REQUESTED', 'PENDING']
            ).count()
            
            total_records = MedicalRecord.objects.filter(
                patient__assigned_doctor=request.user
            ).count()
            
            admitted_patients = Patient.objects.filter(
                assigned_doctor=request.user,
                status='Admitted'
            ).count()
            
            # Recent consultations (last 30 days)
            recent_consultations = MedicalRecord.objects.filter(
                patient__assigned_doctor=request.user,
                created_at__gte=timezone.now() - timedelta(days=30)
            ).count()

            return Response({
                "total_patients": total_patients,
                "total_appointments": total_appointments,
                "pending_appointments": pending_appointments,
                "total_records": total_records,
                "admitted_patients": admitted_patients,
                "recent_consultations": recent_consultations,
                "totalConsultations": recent_consultations,  # For compatibility
                "pendingAppointments": pending_appointments,  # For compatibility
                "admittedPatients": admitted_patients  # For compatibility
            })
            
        except Exception as e:
            logger.error(f"Error fetching dashboard stats: {str(e)}")
            return Response({
                "total_patients": 0,
                "total_appointments": 0,
                "pending_appointments": 0,
                "total_records": 0,
                "admitted_patients": 0,
                "recent_consultations": 0,
                "totalConsultations": 0,
                "pendingAppointments": 0,
                "admittedPatients": 0
            }, status=status.HTTP_200_OK)
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

    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated, IsDoctor])
    def approve(self, request, pk=None):
        """
        Approve an appointment (doctor only)
        """
        try:
            appointment = self.get_object()
            
            # Check if the appointment belongs to the requesting doctor
            if appointment.doctor != request.user:
                return Response(
                    {"error": "You can only approve your own appointments"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Check if appointment is in a state that can be approved
            if appointment.status not in ['REQUESTED', 'PENDING']:
                return Response(
                    {"error": f"Cannot approve appointment with status: {appointment.status}"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            appointment.status = 'ACCEPTED'
            appointment.save()
            
            serializer = self.get_serializer(appointment)
            return Response({
                "message": "Appointment approved successfully",
                "appointment": serializer.data
            })
            
        except Exception as e:
            logger.error(f"Error approving appointment: {str(e)}")
            return Response(
                {"error": "Failed to approve appointment"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated, IsDoctor])
    def decline(self, request, pk=None):
        """
        Decline an appointment (doctor only)
        """
        try:
            appointment = self.get_object()
            
            # Check if the appointment belongs to the requesting doctor
            if appointment.doctor != request.user:
                return Response(
                    {"error": "You can only decline your own appointments"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Check if appointment is in a state that can be declined
            if appointment.status not in ['REQUESTED', 'PENDING']:
                return Response(
                    {"error": f"Cannot decline appointment with status: {appointment.status}"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            appointment.status = 'DECLINED'
            appointment.save()
            
            serializer = self.get_serializer(appointment)
            return Response({
                "message": "Appointment declined successfully",
                "appointment": serializer.data
            })
            
        except Exception as e:
            logger.error(f"Error declining appointment: {str(e)}")
            return Response(
                {"error": "Failed to decline appointment"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated, IsDoctor])
    def complete(self, request, pk=None):
        """
        Mark appointment as completed (doctor only)
        """
        try:
            appointment = self.get_object()
            
            # Check if the appointment belongs to the requesting doctor
            if appointment.doctor != request.user:
                return Response(
                    {"error": "You can only complete your own appointments"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Check if appointment can be completed
            if appointment.status not in ['ACCEPTED', 'APPROVED']:
                return Response(
                    {"error": f"Cannot complete appointment with status: {appointment.status}"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            appointment.status = 'COMPLETED'
            appointment.save()
            
            serializer = self.get_serializer(appointment)
            return Response({
                "message": "Appointment completed successfully",
                "appointment": serializer.data
            })
            
        except Exception as e:
            logger.error(f"Error completing appointment: {str(e)}")
            return Response(
                {"error": "Failed to complete appointment"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
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
        serializer = UserSettingsSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        serializer = UserSettingsSerializer(request.user, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Settings updated successfully!", "settings": serializer.data})

    def patch(self, request):
        serializer = UserSettingsSerializer(request.user, data=request.data, partial=True)
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