from rest_framework import serializers
from .models import (
    User, Roles, Patient, Appointment, MedicalRecord,
    Prescription, LabResult, UserSettings, Task, Alert, Notification,
    BedStatus, Medication, HandoverLog, PendingAdmission, PlannedDischarge, PrescribedMedication
)
import random
import string

# =========================================================
# USER SETTINGS SERIALIZER
# =========================================================
class UserSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSettings
        fields = [
            "default_appointment_duration",
            "email_notifications",
            "sms_notifications",
            "auto_generate_patient_id",
            "theme",
            "layout",
        ]

# =========================================================
# USER SERIALIZERS
# =========================================================
class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name", "full_name", "role",
            "specialization", "date_joined", "is_active", "settings",
        ]
        read_only_fields = ["id", "date_joined", "is_active", "role"]

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username

class DoctorListSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "full_name", "specialization"]

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()

class SignupSerializer(serializers.ModelSerializer):
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
    name = serializers.SerializerMethodField()  # Add name field for compatibility
    age = serializers.SerializerMethodField()
    date_joined = serializers.DateTimeField(source="user.date_joined", read_only=True)

    class Meta:
        model = Patient
        fields = [
            "id", "username", "email", "first_name", "last_name", "full_name", "name", "age",
            "date_joined", "date_of_birth", "gender", "phone", "address", 
            "next_of_kin_name", "next_of_kin_phone", "notes_for_doctor", 
            "temperature", "blood_pressure", "heart_rate", "respiratory_rate",
            "status", "created_at",
        ]
        read_only_fields = ["id", "created_at", "date_joined", "username", "email", "full_name", "name", "first_name", "last_name", "age"]

    def get_full_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() if obj.user else ""
    
    def get_name(self, obj):
        # Provide compatibility with frontend code that expects 'name' field
        return self.get_full_name(obj)
    
    def get_age(self, obj): 
        if not obj.date_of_birth:
            return None
        from datetime import date
        today = date.today()
        age = today.year - obj.date_of_birth.year
        if today.month < obj.date_of_birth.month or (today.month == obj.date_of_birth.month and today.day < obj.date_of_birth.day):
            age -= 1
        return age

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
            "temperature", "blood_pressure", "heart_rate", "respiratory_rate",
            "created_at", "username", "email", "first_name", "last_name", "password",
        ]
        read_only_fields = ["id", "created_at"]

    def create(self, validated_data):
        username = validated_data.pop("username", f"user_{random.randint(1000,9999)}")
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
# DOCTOR-PATIENT RELATIONSHIP SERIALIZER
# =========================================================
class DoctorPatientSerializer(serializers.ModelSerializer):
    doctor_name = serializers.SerializerMethodField()
    patient_name = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()  # Add name for compatibility

    class Meta:
        model = Patient
        fields = ["id", "patient_name", "name", "doctor", "doctor_name"]

    def get_doctor_name(self, obj):
        if obj.assigned_doctor:
            return f"{obj.assigned_doctor.first_name} {obj.assigned_doctor.last_name}".strip()
        return None

    def get_patient_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() if obj.user else ""

    def get_name(self, obj):
        return self.get_patient_name(obj)

# =========================================================
# APPOINTMENT SERIALIZERS
# =========================================================
class AppointmentSerializer(serializers.ModelSerializer):
    doctor_name = serializers.SerializerMethodField()
    patient_name = serializers.SerializerMethodField()
    doctor_specialty = serializers.SerializerMethodField()
    temperature = serializers.FloatField(source="patient.temperature", read_only=True)
    blood_pressure = serializers.CharField(source="patient.blood_pressure", read_only=True)
    heart_rate = serializers.IntegerField(source="patient.heart_rate", read_only=True)
    respiratory_rate = serializers.IntegerField(source="patient.respiratory_rate", read_only=True)

    class Meta:
        model = Appointment
        fields = [
            "id", "date", "time", "status", "reason", "notes", "doctor", "doctor_name", "doctor_specialty",
            "patient", "patient_name", "temperature", "blood_pressure", "heart_rate", "respiratory_rate",
            "created_at"
        ]

    def get_doctor_name(self, obj):
        return f"{obj.doctor.first_name} {obj.doctor.last_name}".strip() if obj.doctor else None

    def get_patient_name(self, obj):
        return f"{obj.patient.user.first_name} {obj.patient.user.last_name}".strip() if obj.patient and obj.patient.user else None

    def get_doctor_specialty(self, obj):
        return obj.doctor.specialization if obj.doctor else "General"

class CreateAppointmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = ["id", "patient", "doctor", "date", "time", "reason", "notes", "status"]

    def validate(self, data):
        if not data.get("doctor"):
            raise serializers.ValidationError("Doctor is required")
        if not data.get("patient"):
            raise serializers.ValidationError("Patient is required")
        return data

# =========================================================
# MEDICAL RECORD SERIALIZERS
# =========================================================
class MedicalRecordSerializer(serializers.ModelSerializer):
    patient = PatientSerializer(read_only=True)
    patient_name = serializers.SerializerMethodField()
    created_by = UserSerializer(read_only=True)
    appointment = AppointmentSerializer(read_only=True)
    temperature = serializers.FloatField(source="patient.temperature", read_only=True)
    blood_pressure = serializers.CharField(source="patient.blood_pressure", read_only=True)
    heart_rate = serializers.IntegerField(source="patient.heart_rate", read_only=True)
    respiratory_rate = serializers.IntegerField(source="patient.respiratory_rate", read_only=True)

    class Meta:
        model = MedicalRecord
    class Meta:
        model = MedicalRecord
        fields = [
            "id", "patient", "patient_name", "appointment", "created_by", "symptoms", "diagnosis",
            "notes", "temperature", "blood_pressure", "heart_rate", "respiratory_rate",
            "created_at", "updated_at"
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_patient_name(self, obj):
        return f"{obj.patient.user.first_name} {obj.patient.user.last_name}".strip() if obj.patient and obj.patient.user else ""

class CreateMedicalRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalRecord
        fields = ["id", "patient", "appointment", "created_by", "symptoms", "diagnosis", "notes"]
        read_only_fields = ["id"]

# =========================================================
# PRESCRIPTION SERIALIZER
# =========================================================
class PrescriptionSerializer(serializers.ModelSerializer):
    prescribed_by = UserSerializer(read_only=True)
    patient_name = serializers.SerializerMethodField()

    class Meta:
        model = Prescription
        fields = ["id", "patient", "patient_name", "medical_record", "appointment", "prescribed_by",
                  "medication_name", "dosage", "duration", "notes", "status", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_patient_name(self, obj):
        return f"{obj.patient.user.first_name} {obj.patient.user.last_name}".strip() if obj.patient and obj.patient.user else ""

class PrescribedMedicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrescribedMedication
        fields = ['id', 'patient_name', 'medication_name', 'dosage', 'doctor_name']
        read_only_fields = ['id']
        
# =========================================================
# LAB RESULT SERIALIZER
# =========================================================
class LabResultSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    patient_name = serializers.SerializerMethodField()

    class Meta:
        model = LabResult
        fields = ["id", "patient", "patient_name", "appointment", "test_name", "result", "created_by", "created_at", "date"]
        read_only_fields = ["id", "created_at"]

    def get_patient_name(self, obj):
        return f"{obj.patient.user.first_name} {obj.patient.user.last_name}".strip() if obj.patient and obj.patient.user else ""

# =========================================================
# TASK / ALERT / NOTIFICATION / BED / MEDICATION / HANDOVER SERIALIZERS
# =========================================================
class TaskSerializer(serializers.ModelSerializer):
    nurse_name = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = ["id", "nurse", "nurse_name", "description", "completed", "completed_at", "created_at"]
        read_only_fields = ["id", "created_at", "completed_at"]

    def get_nurse_name(self, obj):
        return f"{obj.nurse.first_name} {obj.nurse.last_name}".strip() if obj.nurse else ""

class AlertSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()

    class Meta:
        model = Alert
        fields = ["id", "patient", "patient_name", "message", "acknowledged", "read", "created_at"]
        read_only_fields = ["id", "created_at"]

    def get_patient_name(self, obj):
        return obj.patient.user.get_full_name() if obj.patient and obj.patient.user else None

class NotificationSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ["id", "user", "user_name", "message", "read", "created_at"]
        read_only_fields = ["id", "created_at"]

    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip()

class BedStatusSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()

    class Meta:
        model = BedStatus
        fields = ["id", "bed_number", "occupied", "patient", "patient_name", "updated_at"]
        read_only_fields = ["id", "updated_at"]

    def get_patient_name(self, obj):
        return obj.patient.user.get_full_name() if obj.patient else None

class MedicationSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()

    class Meta:
        model = Medication
        fields = ["id", "patient", "patient_name", "name", "dosage", "scheduled_time", "administered", "administered_at"]
        read_only_fields = ["id", "administered_at"]

    def get_patient_name(self, obj):
        return obj.patient.user.get_full_name() if obj.patient and obj.patient.user else "Unknown Patient"

# =========================================================
# HANDOVER SERIALIZER
# =========================================================
class HandoverLogSerializer(serializers.ModelSerializer):
    nurse_name = serializers.SerializerMethodField()

    class Meta:
        model = HandoverLog
        fields = ["id", "nurse", "nurse_name", "note", "created_at"]
        read_only_fields = ["id", "created_at"]

    def get_nurse_name(self, obj):
        return f"{obj.nurse.first_name} {obj.nurse.last_name}".strip() if obj.nurse else ""

class PendingAdmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PendingAdmission
        fields = ["id", "patient_name", "age", "gender", "diagnosis", "assigned_room", "processed", "created_at"]
        read_only_fields = ["id", "created_at"]

class PlannedDischargeSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()

    class Meta:
        model = PlannedDischarge
        fields = ["id", "patient", "patient_name", "target_time", "discharge_destination", "completed"]
        read_only_fields = ["id"]

    def get_patient_name(self, obj):
        return obj.patient.user.get_full_name() if obj.patient else None

# =========================================================
# BASIC NURSE INFO
# Used by the nurse/me/ endpoint
# =========================================================
class NurseSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "name", "email"]
        
    def get_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username