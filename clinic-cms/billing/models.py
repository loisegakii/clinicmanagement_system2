from django.db import models
from accounts.models import Patient, User, Appointment

class Invoice(models.Model):
    STATUS_CHOICES = [
        ("unpaid", "Unpaid"),
        ("paid", "Paid"),
        ("cancelled", "Cancelled"),
    ]

    # Foreign key relationship to Patient, with related name for reverse relation
    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, related_name="invoices"
    )
    
    # Foreign key relationship to User (Doctor), with limit to "DOCTOR" role
    doctor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="doctor_invoices",
        limit_choices_to={"role": "DOCTOR"},
    )
    
    # Foreign key relationship to Appointment, optional (can be null)
    appointment = models.ForeignKey(
        Appointment, on_delete=models.SET_NULL, null=True, blank=True
    )
    
    # Foreign key relationship to User (issued_by), limited to ADMIN or RECEPTIONIST roles
    issued_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="issued_invoices",
        limit_choices_to={"role__in": ["ADMIN", "RECEPTIONIST"]},
    )

    # Amount for the invoice (ensuring it's a decimal value)
    amount = models.DecimalField(max_digits=10, decimal_places=2)

    # Optional description field for the invoice
    description = models.TextField(blank=True)

    # Invoice status with predefined choices
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="unpaid")

    # Timestamps for record creation and updates
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        # String representation to show invoice ID and patient name
        return f"Invoice {self.id} - {self.patient.user.get_full_name()} - {self.status}"

    # Custom validation to ensure amount is greater than zero
    def clean(self):
        if self.amount <= 0:
            raise ValidationError("Amount must be greater than zero.")

    # Custom method to check if the invoice can be marked as paid
    def can_be_paid(self):
        return self.status == "unpaid"

    # Example method to mark invoice as paid, can be useful in logic
    def mark_as_paid(self):
        self.status = "paid"
        self.save()
