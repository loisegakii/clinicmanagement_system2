from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission
from django.core.exceptions import PermissionDenied
from django.http import HttpResponse

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from io import BytesIO

from .models import Invoice
from .serializers import InvoiceSerializer
from accounts.models import Roles, Patient, Appointment, User


class IsAdminOrReceptionist(BasePermission):
    def has_permission(self, request, view):
        return request.user.role in [Roles.ADMIN, Roles.RECEPTIONIST]


class InvoiceViewSet(viewsets.ModelViewSet):
    """
    ViewSet to handle CRUD operations for invoices.
    Provides custom actions to mark invoices as paid and download PDF invoices.
    """
    queryset = Invoice.objects.all().order_by("-created_at")
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Restrict invoices depending on user role."""
        user = self.request.user

        if user.role in [Roles.ADMIN, Roles.RECEPTIONIST]:
            return Invoice.objects.all().order_by("-created_at")
        elif user.role == Roles.DOCTOR:
            return Invoice.objects.filter(doctor=user).order_by("-created_at")
        elif user.role == Roles.PATIENT:
            try:
                patient = Patient.objects.get(user=user)
                return Invoice.objects.filter(patient=patient).order_by("-created_at")
            except Patient.DoesNotExist:
                return Invoice.objects.none()
        return Invoice.objects.none()

    def perform_create(self, serializer):
        """Receptionists/Admins can create invoices linked to patients (appointment optional)."""
        user = self.request.user

        if user.role not in [Roles.RECEPTIONIST, Roles.ADMIN]:
            raise PermissionDenied("Only Admins or Receptionists can issue invoices.")

        patient_id = self.request.data.get("patient")
        appointment_id = self.request.data.get("appointment")
        doctor_id = self.request.data.get("doctor")

        if not patient_id:
            raise serializers.ValidationError({"patient": "Patient ID is required."})

        try:
            patient = Patient.objects.get(id=patient_id)
        except Patient.DoesNotExist:
            raise serializers.ValidationError({"patient": "Invalid patient ID."})

        appointment = None
        doctor = None

        if appointment_id:
            try:
                appointment = Appointment.objects.get(id=appointment_id, patient=patient)
                doctor = appointment.doctor  # Auto-link doctor from appointment
            except Appointment.DoesNotExist:
                raise serializers.ValidationError(
                    {"appointment": "Invalid appointment for this patient."}
                )
        elif doctor_id:
            try:
                doctor = User.objects.get(id=doctor_id, role=Roles.DOCTOR)
            except User.DoesNotExist:
                raise serializers.ValidationError({"doctor": "Invalid doctor ID."})

        # Save invoice (doctor may come from appointment or direct input)
        serializer.save(
            patient=patient,
            doctor=doctor,
            appointment=appointment,
            issued_by=user,
        )

    # =======================================================
    # Custom actions
    # =======================================================
    @action(detail=True, methods=["post"], permission_classes=[IsAdminOrReceptionist])
    def mark_as_paid(self, request, pk=None):
        """Mark invoice as paid"""
        invoice = self.get_object()

        if invoice.status == "paid":
            return Response({"detail": "Invoice is already marked as paid."},
                            status=status.HTTP_400_BAD_REQUEST)

        invoice.status = "paid"
        invoice.save()
        return Response({"message": "Invoice marked as paid successfully."},
                        status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def download(self, request, pk=None):
        """Generate a real PDF invoice and return it as a download"""
        invoice = self.get_object()

        # Create PDF in memory
        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)

        # Invoice header
        p.setFont("Helvetica-Bold", 16)
        p.drawString(200, 750, "AfyaCare Invoice")

        # Invoice details
        p.setFont("Helvetica", 12)
        y = 700
        p.drawString(50, y, f"Invoice ID: {invoice.id}")
        y -= 20
        p.drawString(50, y, f"Patient: {invoice.patient.user.get_full_name()}")
        y -= 20
        if invoice.doctor:
            p.drawString(50, y, f"Doctor: Dr. {invoice.doctor.first_name} {invoice.doctor.last_name}")
            y -= 20
        if invoice.appointment:
            p.drawString(50, y, f"Appointment: {invoice.appointment.date}")
            y -= 20
        p.drawString(50, y, f"Amount: Ksh {invoice.amount}")
        y -= 20
        p.drawString(50, y, f"Status: {invoice.status}")
        y -= 20
        p.drawString(50, y, f"Issued Date: {invoice.created_at.strftime('%Y-%m-%d %H:%M')}")

        # Footer
        p.setFont("Helvetica-Oblique", 10)
        p.drawString(200, 50, "Thank you for choosing AfyaCare")

        # Finalize PDF
        p.showPage()
        p.save()

        buffer.seek(0)

        # Return as downloadable file
        response = HttpResponse(buffer, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="invoice_{invoice.id}.pdf"'
        return response

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def unpaid(self, request):
        """List all unpaid invoices (Receptionist/Admin only)"""
        user = request.user
        if user.role not in [Roles.RECEPTIONIST, Roles.ADMIN]:
            return Response({"detail": "Not authorized to view unpaid invoices."},
                            status=status.HTTP_403_FORBIDDEN)

        invoices = Invoice.objects.filter(status="unpaid")
        serializer = self.get_serializer(invoices, many=True)
        return Response(serializer.data)
