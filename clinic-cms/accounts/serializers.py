from rest_framework import serializers
from .models import (
    User, Roles, Patient, Appointment, MedicalRecord,
    Prescription, LabResult, UserSettings
)
import random
import string

# =========================================================
# USER SETTINGS SERIALIZER
# =========================================================
class UserSettingsSerializer(serializers.ModelSerializer):
    """Serializer for receptionist/admin settings (linked to User)."""
    class Meta:
        model = UserSettings
        fields = [
            "default_appointment_duration",
            "notification_preferences",
            "auto_generate_patient_id",
            "theme",
            "layout_preference",
        ]

# =========================================================
# USER SERIALIZERS
# =========================================================
class UserSerializer(serializers.ModelSerializer):
    """General serializer for returning user information including nested settings."""
    settings = UserSettingsSerializer(source="usersettings", read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name", "role",
            "specialization", "date_joined", "is_active", "settings",
        ]
        read_only_fields = ["id", "date_joined", "is_active", "role"]

class DoctorListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for doctor dropdowns."""
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "full_name", "specialization"]

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()

class SignupSerializer(serializers.ModelSerializer):
    """Public signup (always creates Patients)."""
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "password"]
        read_only_fields = ["id"]

    def create(self, validated_data):
        user = User(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            role=Roles.PATIENT,
            is_staff=False,
        )
        user.set_password(validated_data["password"])
        user.save()
        return user

# =========================================================
# CREATE USERS (ADMIN)
# =========================================================
class CreateDoctorSerializer(serializers.ModelSerializer):
    """Admin creates doctors."""
    password = serializers.CharField(write_only=True, min_length=8)
    SPECIALIZATIONS = ["General Practitioner", "Neurosurgeon", "Pediatrician", "Cardiologist", "Dermatologist", "Other"]

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "password", "specialization"]

    def validate_specialization(self, value):
        if value not in self.SPECIALIZATIONS:
            raise serializers.ValidationError("Invalid specialization")
        return value

    def create(self, validated_data):
        user = User(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            specialization=validated_data.get("specialization", ""),
            role=Roles.DOCTOR,
            is_staff=True,
        )
        user.set_password(validated_data["password"])
        user.save()
        return user

class CreateLabTechnicianSerializer(serializers.ModelSerializer):
    """Admin creates lab technicians."""
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "password"]

    def create(self, validated_data):
        user = User(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            role=Roles.LAB,
            is_staff=False,
        )
        user.set_password(validated_data["password"])
        user.save()
        return user

class CreatePharmacistSerializer(serializers.ModelSerializer):
    """Admin creates pharmacists."""
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "password"]

    def create(self, validated_data):
        user = User(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            role=Roles.PHARMACIST,
            is_staff=False,
        )
        user.set_password(validated_data["password"])
        user.save()
        return user

class AdminCreateUserSerializer(serializers.ModelSerializer):
    """Admin can create any user (with role)."""
    password = serializers.CharField(write_only=True, min_length=8)
    SPECIALIZATIONS = ["General Practitioner", "Neurosurgeon", "Pediatrician", "Cardiologist", "Dermatologist", "Other"]

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "password", "role", "specialization"]

    def create(self, validated_data):
        role = validated_data.get("role")
        if role not in [Roles.ADMIN, Roles.DOCTOR, Roles.NURSE, Roles.RECEPTIONIST, Roles.PHARMACIST, Roles.LAB, Roles.PATIENT]:
            raise serializers.ValidationError({"role": "Invalid role selected"})

        specialization = validated_data.get("specialization", "")
        if role == Roles.DOCTOR and specialization not in self.SPECIALIZATIONS:
            raise serializers.ValidationError({"specialization": "Invalid specialization"})

        user = User(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            specialization=specialization if role == Roles.DOCTOR else "",
            role=role,
            is_staff=True if role in [Roles.ADMIN, Roles.DOCTOR] else False,
        )
        user.set_password(validated_data["password"])
        user.save()
        return user

class ChangePasswordSerializer(serializers.Serializer):
    """Dedicated password change endpoint serializer."""
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)

# =========================================================
# PATIENT SERIALIZERS
# =========================================================
class PatientSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    full_name = serializers.SerializerMethodField()
    date_joined = serializers.DateTimeField(source="user.date_joined", read_only=True)

    class Meta:
        model = Patient
        fields = [
            "id", "username", "email", "first_name", "last_name", "full_name", "date_joined",
            "date_of_birth", "gender", "phone", "address", "next_of_kin_name", "next_of_kin_phone",
            "notes_for_doctor", "created_at",
        ]
        read_only_fields = ["id", "created_at", "date_joined", "username", "email", "first_name", "last_name", "full_name"]

    def get_full_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() if obj.user else ""

class DoctorPatientSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Patient
        fields = ["id", "user", "date_of_birth", "gender", "phone"]

class CreatePatientSerializer(serializers.ModelSerializer):
    username = serializers.CharField(write_only=True, required=False)
    email = serializers.EmailField(write_only=True, required=False)
    first_name = serializers.CharField(write_only=True, required=False)
    last_name = serializers.CharField(write_only=True, required=False)
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Patient
        fields = [
            "id", "date_of_birth", "gender", "phone", "address", "next_of_kin_name", "next_of_kin_phone",
            "created_at", "username", "email", "first_name", "last_name", "password",
        ]
        read_only_fields = ["id", "created_at"]

    def create(self, validated_data):
        username = validated_data.pop("username", f"user_{random.randint(1000, 9999)}")
        email = validated_data.pop("email", "")
        first_name = validated_data.pop("first_name", "")
        last_name = validated_data.pop("last_name", "")
        password = validated_data.pop("password", "".join(random.choices(string.ascii_letters + string.digits, k=10)))

        user = User(username=username, email=email, first_name=first_name, last_name=last_name, role=Roles.PATIENT, is_staff=False)
        user.set_password(password)
        user.save()

        patient = Patient.objects.create(user=user, **validated_data)
        patient.generated_password = password
        return patient

# =========================================================
# APPOINTMENT SERIALIZERS
# =========================================================
class CreateAppointmentSerializer(serializers.ModelSerializer):
    patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all(), required=False)
    doctor_name = serializers.SerializerMethodField(read_only=True)
    doctor_specialty = serializers.CharField(source="doctor.specialization", read_only=True)
    patient_name = serializers.CharField(source="patient.user.get_full_name", read_only=True)
    patient_email = serializers.EmailField(source="patient.user.email", read_only=True)
    patient_phone = serializers.CharField(source="patient.phone", read_only=True)

    class Meta:
        model = Appointment
        fields = ["id", "patient", "patient_name", "patient_email", "patient_phone", "doctor", "doctor_name", "doctor_specialty",
                  "date", "time", "status", "requested_by_patient", "notes"]
        read_only_fields = ["id", "requested_by_patient"]

    def get_doctor_name(self, obj):
        if obj.doctor:
            return f"{obj.doctor.first_name} {obj.doctor.last_name}".strip()
        return None

class AppointmentSerializer(serializers.ModelSerializer):
    doctor_name = serializers.SerializerMethodField()
    patient_name = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = ["id", "date", "time", "status", "doctor", "doctor_name", "patient", "patient_name"]

    def get_doctor_name(self, obj):
        return f"{obj.doctor.first_name} {obj.doctor.last_name}".strip() if obj.doctor else None

    def get_patient_name(self, obj):
        return f"{obj.patient.user.first_name} {obj.patient.user.last_name}".strip() if obj.patient and obj.patient.user else None

class AppointmentDetailSerializer(serializers.ModelSerializer):
    patient = PatientSerializer(read_only=True)
    doctor = UserSerializer(read_only=True)

    class Meta:
        model = Appointment
        fields = ["id", "patient", "doctor", "date", "time", "status", "requested_by_patient", "notes", "created_at"]
        read_only_fields = ["id", "created_at", "requested_by_patient"]

# =========================================================
# PRESCRIPTION SERIALIZERS
# =========================================================
class PrescriptionSerializer(serializers.ModelSerializer):
    prescribed_by = UserSerializer(read_only=True)

    class Meta:
        model = Prescription
        fields = ["id", "patient", "medical_record", "appointment", "prescribed_by",
                  "medication_name", "dosage", "duration", "notes", "status", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

# =========================================================
# LAB RESULT SERIALIZERS
# =========================================================
class LabResultSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = LabResult
        fields = ["id", "patient", "appointment", "test_name", "result", "created_by", "created_at"]
        read_only_fields = ["id", "created_at"]

# =========================================================
# MEDICAL RECORD SERIALIZERS
# =========================================================
class MedicalRecordSerializer(serializers.ModelSerializer):
    patient = PatientSerializer(read_only=True)
    created_by = UserSerializer(read_only=True)
    appointment = AppointmentSerializer(read_only=True)
    prescriptions = PrescriptionSerializer(many=True, read_only=True)

    class Meta:
        model = MedicalRecord
        fields = ["id", "patient", "appointment", "created_by", "symptoms", "diagnosis",
                  "prescriptions", "notes", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

class CreateMedicalRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalRecord
        fields = ["id", "patient", "appointment", "created_by", "symptoms", "diagnosis", "notes"]
        read_only_fields = ["id"]

    def validate_created_by(self, value):
        if value.role not in [Roles.DOCTOR, Roles.NURSE, Roles.LAB]:
            raise serializers.ValidationError("Only Doctors, Nurses, or Lab Technicians can create records.")
        return value
