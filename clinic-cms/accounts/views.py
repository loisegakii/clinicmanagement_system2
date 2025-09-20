from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.generics import CreateAPIView
from rest_framework.decorators import action
from django.core.exceptions import PermissionDenied

from .models import User, Roles, Patient, Appointment, MedicalRecord
from .serializers import (
    UserSerializer,
    SignupSerializer,
    CreateDoctorSerializer,
    CreateLabTechnicianSerializer,
    CreatePharmacistSerializer,
    PatientSerializer,
    DoctorPatientSerializer,
    CreatePatientSerializer,
    AppointmentSerializer,
    CreateAppointmentSerializer,
    MedicalRecordSerializer,
    CreateMedicalRecordSerializer,
    AdminCreateUserSerializer,
    UserSettingsSerializer,
)
from .permissions import IsAdmin, IsDoctor, IsPatient, IsReceptionist, IsPharmacist


# =========================================================
# SIGNUP VIEW (public → always creates Patient role)
# =========================================================
class SignupView(CreateAPIView):
    queryset = User.objects.all()
    serializer_class = SignupSerializer
    permission_classes = [AllowAny]


# =========================================================
# "ME" endpoint → get current logged-in user profile
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
            {
                "message": "User created successfully!",
                "user": AdminCreateUserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        return Response(
            {
                "message": "User updated successfully!",
                "user": AdminCreateUserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(
            {"message": "User deleted successfully!"},
            status=status.HTTP_204_NO_CONTENT,
        )


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
# LAB TECHNICIANS
# =========================================================
class LabTechnicianViewSet(viewsets.ModelViewSet):
    queryset = User.objects.filter(role=Roles.LAB).order_by("-date_joined")
    serializer_class = CreateLabTechnicianSerializer
    permission_classes = [IsAuthenticated, IsAdmin]


# =========================================================
# PHARMACISTS
# =========================================================
class PharmacistViewSet(viewsets.ModelViewSet):
    queryset = User.objects.filter(role=Roles.PHARMACIST).order_by("-date_joined")
    serializer_class = CreatePharmacistSerializer
    permission_classes = [IsAuthenticated, IsAdmin]


# =========================================================
# PATIENTS
# =========================================================
class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all().order_by("-created_at")
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        user = self.request.user
        if user.role == Roles.DOCTOR:
            return DoctorPatientSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return CreatePatientSerializer
        return PatientSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == Roles.PATIENT:
            return Patient.objects.filter(user=user)
        elif user.role == Roles.DOCTOR:
            return Patient.objects.filter(assigned_doctor=user)
        elif user.role in [Roles.ADMIN, Roles.RECEPTIONIST]:
            return Patient.objects.all().order_by("-created_at")
        return Patient.objects.none()

    def create(self, request, *args, **kwargs):
        if request.user.role not in [Roles.RECEPTIONIST, Roles.ADMIN]:
            return Response(
                {"detail": "Only Admins or Receptionists can create patients."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        patient = serializer.save()

        response_data = serializer.data
        if hasattr(patient, "generated_password"):
            response_data["generated_password"] = patient.generated_password

        return Response(response_data, status=status.HTTP_201_CREATED)


# =========================================================
# APPOINTMENTS
# =========================================================
class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.all().order_by("-created_at")
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return CreateAppointmentSerializer
        return AppointmentSerializer

    def get_queryset(self):
        user = self.request.user

        if user.role == Roles.PATIENT:
            return Appointment.objects.filter(patient__user=user)
        elif user.role == Roles.DOCTOR:
            return Appointment.objects.filter(doctor=user)
        elif user.role in [Roles.ADMIN, Roles.RECEPTIONIST]:
            return Appointment.objects.all().order_by("-created_at")
        return Appointment.objects.none()

    def perform_create(self, serializer):
        user = self.request.user

        if user.role == Roles.PATIENT:
            patient = getattr(user, "patient_profile", None)
            doctor = serializer.validated_data.get("doctor")

            if not doctor:
                raise PermissionDenied("Doctor is required to book an appointment.")

            serializer.save(patient=patient, doctor=doctor, requested_by_patient=True)

        elif user.role in [Roles.RECEPTIONIST, Roles.ADMIN]:
            patient = serializer.validated_data.get("patient")
            doctor = serializer.validated_data.get("doctor")

            if not patient:
                raise PermissionDenied("Patient ID is required to create an appointment.")
            if not doctor:
                raise PermissionDenied("Doctor ID is required to create an appointment.")

            serializer.save(patient=patient, doctor=doctor, requested_by_patient=False)

        else:
            raise PermissionDenied("You are not allowed to create appointments.")


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

        if user.role == Roles.PATIENT:
            return qs.filter(patient__user=user)
        elif user.role == Roles.DOCTOR:
            return qs.filter(patient__assigned_doctor=user)
        elif user.role == Roles.LAB:
            return qs.filter(created_by=user)
        elif user.role == Roles.RECEPTIONIST:
            return qs.none()
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        patient = serializer.validated_data.get("patient")

        if user.role == Roles.DOCTOR:
            if patient.assigned_doctor != user:
                raise PermissionDenied("You can only add records for your assigned patients.")
        elif user.role not in [Roles.DOCTOR, Roles.LAB, Roles.ADMIN]:
            raise PermissionDenied("You are not allowed to create medical records.")

        serializer.save(created_by=user)

    def perform_update(self, serializer):
        user = self.request.user
        patient = serializer.instance.patient

        if user.role == Roles.DOCTOR and patient.assigned_doctor != user:
            raise PermissionDenied("You cannot update records for patients not assigned to you.")

        serializer.save()


# =========================================================
# USER SETTINGS (directly on User model)
# =========================================================
class UserSettingsView(APIView):
    """
    GET → fetch logged-in user's settings
    PUT/PATCH → update logged-in user's settings
    """
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
