from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
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
