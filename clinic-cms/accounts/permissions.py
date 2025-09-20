from rest_framework.permissions import BasePermission, SAFE_METHODS
from .models import Roles

# =========================================================
# Admin-only permission
# =========================================================
class IsAdmin(BasePermission):
    """
    Allows access only to users with the ADMIN role.
    """
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == Roles.ADMIN
        )

# =========================================================
# Patient permissions
# =========================================================
class IsPatient(BasePermission):
    """
    Allows access only to users with the PATIENT role.
    """
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == Roles.PATIENT
        )

# =========================================================
# Doctor permissions
# =========================================================
class IsDoctor(BasePermission):
    """
    Allows access only to users with the DOCTOR role.
    """
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == Roles.DOCTOR
        )

# =========================================================
# Nurse permissions
# =========================================================
class IsNurse(BasePermission):
    """
    Allows access only to users with the NURSE role.
    """
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == Roles.NURSE
        )

# =========================================================
# Receptionist permissions
# =========================================================
class IsReceptionist(BasePermission):
    """
    Allows access only to users with the RECEPTIONIST role.
    """
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == Roles.RECEPTIONIST
        )

# =========================================================
# Pharmacist permissions
# =========================================================
class IsPharmacist(BasePermission):
    """
    Allows access only to users with the PHARMACIST role.
    """
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == Roles.PHARMACIST
        )

# =========================================================
# Lab Technician permissions
# =========================================================
class IsLab(BasePermission):
    """
    Allows access only to users with the LAB role.
    """
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == Roles.LAB
        )

# =========================================================
# Read-only permission (safe methods only)
# =========================================================
class ReadOnly(BasePermission):
    """
    Allows only read-only (GET, HEAD, OPTIONS) requests.
    """
    def has_permission(self, request, view):
        return request.method in SAFE_METHODS
