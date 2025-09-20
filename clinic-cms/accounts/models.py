from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.exceptions import ValidationError

# -----------------------------
# Define roles available in the system
# -----------------------------
class Roles(models.TextChoices):
    ADMIN = "ADMIN", "Admin"                        # Full system access
    DOCTOR = "DOCTOR", "Doctor"                     # Can treat patients, view/create patient details
    NURSE = "NURSE", "Nurse"                        # Can assist doctors, view/create patient details
    RECEPTIONIST = "RECEPTIONIST", "Receptionist"   # Can register new patients, manage appointments
    PATIENT = "PATIENT", "Patient"                  # Default role, limited access (own data)
    LAB = "LAB", "Lab Technician"                   # Manages lab results
    PHARMACIST = "PHARMACIST", "Pharmacist"         # Handles prescriptions

# -----------------------------
# Custom User model
# -----------------------------
class User(AbstractUser):
    role = models.CharField(
        max_length=20,
        choices=Roles.choices,
        default=Roles.PATIENT,
    )

    SPECIALIZATION_CHOICES = [
        ("general", "General Practitioner"),
        ("pediatrician", "Pediatrician"),
        ("cardiologist", "Cardiologist"),
        ("dermatologist", "Dermatologist"),
        ("neurologist", "Neurologist"),
        ("neurosurgeon", "Neurosurgeon"),
        ("orthopedic", "Orthopedic Surgeon"),
        ("gynecologist", "Gynecologist"),
        ("psychiatrist", "Psychiatrist"),
        ("radiologist", "Radiologist"),
        ("anesthesiologist", "Anesthesiologist"),
        ("ent", "ENT Specialist"),
        ("ophthalmologist", "Ophthalmologist"),
        ("urologist", "Urologist"),
        ("other", "Other"),
    ]

    specialization = models.CharField(
        max_length=50,
        choices=SPECIALIZATION_CHOICES,
        blank=True,
        help_text="Applicable if the user is a Doctor"
    )

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["email"]

    def clean(self):
        """Validate that only doctors can have a specialization."""
        if self.role == Roles.DOCTOR and not self.specialization:
            raise ValidationError({"specialization": "Doctors must have a specialization."})
        if self.role != Roles.DOCTOR and self.specialization:
            raise ValidationError({"specialization": "Only doctors can have a specialization."})

    def __str__(self):
        if self.role == Roles.DOCTOR and self.specialization:
            return f"Dr. {self.get_full_name()} - {self.get_specialization_display()}"
        return f"{self.username} ({self.role})"


# -----------------------------
# Patient Profile model
# -----------------------------
class Patient(models.Model):
    STATUS_ACTIVE = "ACTIVE"
    STATUS_INACTIVE = "INACTIVE"
    STATUS_DISCHARGED = "DISCHARGED"

    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Active"),
        (STATUS_INACTIVE, "Inactive"),
        (STATUS_DISCHARGED, "Discharged"),
    ]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="patient_profile",
    )
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(
        max_length=10,
        choices=[("M", "Male"), ("F", "Female")],
        blank=True,
    )
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    next_of_kin_name = models.CharField(max_length=100, blank=True)
    next_of_kin_phone = models.CharField(max_length=20, blank=True)
    notes_for_doctor = models.TextField(blank=True, null=True)

    assigned_doctor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={"role": Roles.DOCTOR},
        related_name="patients_assigned"
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_ACTIVE,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Patient: {self.user.get_full_name()} ({self.status})"


# -----------------------------
# Appointment model
# -----------------------------
class Appointment(models.Model):
    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name="appointments",
    )
    doctor = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="appointments",
        limit_choices_to={"role": Roles.DOCTOR},
    )
    date = models.DateField()
    time = models.TimeField()

    REQUESTED = "REQUESTED"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"
    STATUS_CHOICES = [
        (REQUESTED, "Requested"),
        (ACCEPTED, "Accepted"),
        (DECLINED, "Declined"),
        (CANCELLED, "Cancelled"),
        (COMPLETED, "Completed"),
    ]

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=REQUESTED,
    )
    requested_by_patient = models.BooleanField(default=False)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["doctor", "date", "time"],
                name="unique_doctor_timeslot",
            )
        ]
        ordering = ["-date", "-time", "-created_at"]

    def __str__(self):
        return (
            f"{self.date} {self.time} - "
            f"Patient: {self.patient.user.get_full_name() or self.patient.user.username} "
            f"with Dr. {self.doctor.get_full_name() or self.doctor.username} "
            f"[{self.status}]"
        )


# -----------------------------
# Medical Record model
# -----------------------------
class MedicalRecord(models.Model):
    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name="medical_records",
    )
    appointment = models.ForeignKey(
        "Appointment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="medical_records",
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_medical_records",
        limit_choices_to={"role__in": [Roles.DOCTOR, Roles.NURSE, Roles.LAB]},
    )
    symptoms = models.TextField(blank=True)
    diagnosis = models.TextField(blank=True)
    notes = models.TextField(blank=True, help_text="Additional notes from staff")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Record for {self.patient.user.get_full_name()} on {self.created_at.date()}"


# -----------------------------
# Prescription model
# -----------------------------
class Prescription(models.Model):
    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name="prescriptions"
    )
    medical_record = models.ForeignKey(
        MedicalRecord,
        on_delete=models.CASCADE,
        related_name="prescriptions"
    )
    prescribed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        limit_choices_to={"role": Roles.DOCTOR},
        related_name="issued_prescriptions"
    )
    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prescriptions"
    )
    medication_name = models.CharField(max_length=255)
    dosage = models.CharField(max_length=100)
    duration = models.CharField(max_length=100)
    notes = models.TextField(blank=True)

    PENDING = "PENDING"
    DISPENSED = "DISPENSED"
    CANCELLED = "CANCELLED"
    STATUS_CHOICES = [
        (PENDING, "Pending"),
        (DISPENSED, "Dispensed"),
        (CANCELLED, "Cancelled"),
    ]

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.medication_name} for {self.patient.user.get_full_name()} [{self.status}]"


# -----------------------------
# Lab Result model
# -----------------------------
class LabResult(models.Model):
    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name="lab_results"
    )
    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lab_results"
    )
    test_name = models.CharField(max_length=255)
    result = models.TextField()
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        limit_choices_to={"role": Roles.LAB},
        related_name="lab_tests_done"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.test_name} - {self.patient.user.get_full_name()}"


# -----------------------------
# User Settings model
# -----------------------------
class UserSettings(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="settings")

    default_appointment_duration = models.PositiveIntegerField(default=30, help_text="Default duration in minutes")
    email_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=False)
    auto_generate_patient_id = models.BooleanField(default=True)

    theme = models.CharField(max_length=10, choices=[("light", "Light"), ("dark", "Dark")], default="light")
    layout = models.CharField(max_length=10, choices=[("compact", "Compact"), ("detailed", "Detailed")], default="compact")

    def __str__(self):
        return f"Settings for {self.user.username}"
