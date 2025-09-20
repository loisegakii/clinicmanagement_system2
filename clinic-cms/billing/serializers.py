from rest_framework import serializers
from .models import Invoice
from accounts.models import Patient, User, Appointment


class InvoiceSerializer(serializers.ModelSerializer):
    # Accept IDs for patient, doctor, appointment
    patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all())
    doctor = serializers.PrimaryKeyRelatedField(queryset=User.objects.filter(role="DOCTOR"))
    appointment = serializers.PrimaryKeyRelatedField(
        queryset=Appointment.objects.all(), required=False, allow_null=True
    )

    # Read-only display fields
    patient_name = serializers.CharField(source="patient.user.get_full_name", read_only=True)
    doctor_name = serializers.CharField(source="doctor.get_full_name", read_only=True)
    issued_by_name = serializers.CharField(source="issued_by.get_full_name", read_only=True)
    appointment_date = serializers.DateField(source="appointment.date", read_only=True)
    appointment_time = serializers.TimeField(source="appointment.time", read_only=True)

    class Meta:
        model = Invoice
        fields = [
            "id",
            "patient",           # Patient ID (write-only)
            "patient_name",      # Patient full name (read-only)
            "doctor",            # Doctor ID (write-only)
            "doctor_name",       # Doctor full name (read-only)
            "appointment",       # Appointment ID (write-only, optional)
            "appointment_date",  # Appointment date (read-only)
            "appointment_time",  # Appointment time (read-only)
            "issued_by",         # Issued by (write-only)
            "issued_by_name",    # Issued by full name (read-only)
            "amount",
            "description",
            "status",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
            'issued_by': {'write_only': True, 'required': False},  # usually auto-set
        }

    def create(self, validated_data):
        """Ensure issued_by is set from request user if not provided."""
        request = self.context.get("request")
        if request and not validated_data.get("issued_by"):
            validated_data["issued_by"] = request.user
        return super().create(validated_data)
