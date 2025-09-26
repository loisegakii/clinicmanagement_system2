from django.contrib.auth.models import AbstractUser 
from django.db import models
from django.core.exceptions import ValidationError
from datetime import date

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
    
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
    ]
    
    STATUS_ACTIVE = "ACTIVE"
    STATUS_INACTIVE = "INACTIVE"
    STATUS_DISCHARGED = "DISCHARGED"

    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Admitted', 'Admitted'),
        ('Attended', 'Attended'),
        ('Discharged', 'Discharged'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='patient_profile')
    date_of_birth = models.DateField(default=date(2000, 1, 1))
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    phone = models.CharField(max_length=15, blank=True)
    address = models.TextField(blank=True)
    next_of_kin_name = models.CharField(max_length=100, blank=True)
    next_of_kin_phone = models.CharField(max_length=15, blank=True)
    notes_for_doctor = models.TextField(default="", blank=True)
    assigned_doctor = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='assigned_patients'
    )
    
    # Vitals
    temperature = models.FloatField(null=True, blank=True, help_text="Temperature in Celsius")
    blood_pressure = models.CharField(max_length=20, blank=True, help_text="e.g., 120/80")
    heart_rate = models.IntegerField(null=True, blank=True, help_text="Beats per minute")
    respiratory_rate = models.IntegerField(null=True, blank=True, help_text="Breaths per minute")
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.first_name} {self.user.last_name}"

    # -----------------------------
    # Vitals fields for nurse updates
    # -----------------------------
    temperature = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    blood_pressure = models.CharField(max_length=20, blank=True)
    heart_rate = models.IntegerField(null=True, blank=True)
    respiratory_rate = models.IntegerField(null=True, blank=True)

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
    STATUS_CHOICES = [
        ('REQUESTED', 'Requested'),
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
        ('APPROVED', 'Approved'),
        ('DECLINED', 'Declined'),
        ('CANCELLED', 'Cancelled'),
        ('COMPLETED', 'Completed'),
        ('DONE', 'Done'),
    ]
    
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='appointments')
    doctor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='doctor_appointments')
    date = models.DateField()
    time = models.TimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='REQUESTED')
    reason = models.TextField(blank=True) 
    notes = models.TextField(default="", blank=True)
    requested_by_patient = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Appointment: {self.patient} with Dr. {self.doctor} on {self.date}"
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
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='lab_results')
    appointment = models.ForeignKey(Appointment, on_delete=models.SET_NULL, null=True, blank=True)
    test_name = models.CharField(max_length=200)
    result = models.TextField()
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    

    def __str__(self):
        return f"{self.test_name} for {self.patient}"

# -----------------------------
# User Settings model
# -----------------------------
class UserSettings(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="settings")

    default_appointment_duration = models.PositiveIntegerField(default=30, help_text="Default duration in minutes")
    email_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=False)
    auto_generate_patient_id = models.BooleanField(default=True)
    notifications_enabled = models.BooleanField(default=True)
    theme = models.CharField(max_length=10, choices=[("light", "Light"), ("dark", "Dark")], default="light")
    layout = models.CharField(max_length=10, choices=[("compact", "Compact"), ("detailed", "Detailed")], default="compact")

    def __str__(self):
        return f"Settings for {self.user.username}"

# -----------------------------
# Handover Log model
# -----------------------------
class HandoverLog(models.Model):
    nurse = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        limit_choices_to={"role": Roles.NURSE},
        related_name="handover_logs"
    )
    note = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Handover by {self.nurse.username} at {self.created_at}"

# -----------------------------
# Notification model
# -----------------------------
class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    message = models.TextField()
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notification for {self.user.username} - {'Read' if self.read else 'Unread'}"

# -----------------------------
# Alert model
# -----------------------------
class Alert(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='alerts')
    message = models.TextField()
    acknowledged = models.BooleanField(default=False)
    read = models.BooleanField(default=False)  
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Alert for {self.patient}: {self.message[:50]}..."

# -----------------------------
# Task model
# -----------------------------
class Task(models.Model):
    nurse = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tasks')
    description = models.TextField()  # Changed from 'title' to 'description'
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Task: {self.description[:50]}..."

# -----------------------------
# Bed Status model
# -----------------------------
class BedStatus(models.Model):
    bed_number = models.CharField(max_length=10)
    occupied = models.BooleanField(default=False)
    patient = models.ForeignKey(Patient, null=True, blank=True, on_delete=models.SET_NULL)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Bed {self.bed_number} - {'Occupied' if self.occupied else 'Available'}"

# -----------------------------
# Medication model (for nurses)
# -----------------------------
class Medication(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="medications")
    name = models.CharField(max_length=255)
    dosage = models.CharField(max_length=100)
    administered = models.BooleanField(default=False)
    administered_at = models.DateTimeField(null=True, blank=True)
    scheduled_time = models.DateTimeField()

    def __str__(self):
        status = "Administered" if self.administered else "Pending"
        return f"{self.name} for {self.patient.user.username} - {status}"

# -----------------------------
# Pending Admission model
# -----------------------------
class PendingAdmission(models.Model):
    patient_name = models.CharField(max_length=100)
    age = models.PositiveIntegerField()
    gender = models.CharField(max_length=10, choices=[("M", "Male"), ("F", "Female")])
    diagnosis = models.TextField(blank=True)
    assigned_room = models.CharField(max_length=10, blank=True)
    processed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Pending Admission: {self.patient_name} - {'Processed' if self.processed else 'Pending'}"

# -----------------------------
# Planned Discharge model
# -----------------------------
class PlannedDischarge(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="planned_discharges")
    target_time = models.DateTimeField()
    discharge_destination = models.CharField(max_length=255)
    completed = models.BooleanField(default=False)

    def __str__(self):
        return f"Planned Discharge for {self.patient.user.username} - {'Completed' if self.completed else 'Pending'}"
# ===========================================================
# Nurse model
# ===========================================================
class Nurse(models.Model):
    # Each nurse is linked to a User account (one-to-one relationship)
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="nurse"
    )

    # Nurse-specific fields
    name = models.CharField(
        max_length=255,
        help_text="Full name of the nurse"
    )
    department = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Department the nurse belongs to (optional)"
    )
    phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="Contact phone number of the nurse (optional)"
    )

    # String representation of the nurse
    def __str__(self):
        return f"Nurse: {self.name}"
  #----------------------------------------------------
  #prescription medication model
  #----------------------------------------------------
    
class PrescribedMedication(models.Model):
    patient_name = models.CharField(max_length=255)
    medication_name = models.CharField(max_length=255)
    dosage = models.CharField(max_length=100)
    doctor_name = models.CharField(max_length=255)
    date_prescribed = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.medication_name} for {self.patient_name}"