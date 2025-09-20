from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InvoiceViewSet

# Create the router and register the InvoiceViewSet
router = DefaultRouter()
router.register(r'invoices', InvoiceViewSet, basename='invoice')  # only 'invoices'

# Include the router-generated URLs in the urlpatterns
urlpatterns = [
    path('', include(router.urls)),  # no extra 'billing/' prefix
]
