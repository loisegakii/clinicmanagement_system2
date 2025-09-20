from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from .models import User, Roles


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = (
        "id",
        "username",
        "email",
        "first_name",
        "last_name",
        "role",
        "specialization",  # show specialization
        "is_active",
        "date_joined",
    )

    list_filter = ("role", "specialization", "is_active", "is_staff", "is_superuser")

    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name", "email")}),
        (
            "Roles & permissions",
            {
                "fields": (
                    "role",
                    "specialization",  # allow setting specialization
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )

    def get_fieldsets(self, request, obj=None):
        """
        Show specialization field only if the user is a doctor.
        """
        fieldsets = super().get_fieldsets(request, obj)
        if obj and obj.role != Roles.DOCTOR:
            # Remove specialization field for non-doctors
            role_fields = fieldsets[2][1]["fields"]
            role_fields = tuple(f for f in role_fields if f != "specialization")
            fieldsets = (
                fieldsets[0],
                fieldsets[1],
                (fieldsets[2][0], {"fields": role_fields}),
            ) + fieldsets[3:]
        return fieldsets
