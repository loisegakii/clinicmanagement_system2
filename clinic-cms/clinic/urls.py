from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse
from django.shortcuts import redirect
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

# Simple homepage view
def home(request):
    # Option 1: show text
    # return HttpResponse("Welcome to Clinic CMS API!")

    # Option 2: redirect to Swagger docs
    return redirect('/api/docs/')

urlpatterns = [
    path('', home),  # root path

    path('admin/', admin.site.urls),
    
    # API schema and docs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),

    # App routes
    path('api/', include('accounts.urls')),         # Accounts app URLs
    path('api/billing/', include('billing.urls')),  # Billing app URLs (router handles 'invoices')

    # JWT authentication routes
    path('api/auth/', include('accounts.jwt_urls')),
]
