"""
Development settings
"""

from .base import *

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0"]

# Database
# Use SQLite for development (easy setup)
# Switch to PostgreSQL when ready for production-like testing
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# For PostgreSQL in development, uncomment and configure:
# DATABASES = {
#     "default": {
#         "ENGINE": "django.db.backends.postgresql",
#         "NAME": os.getenv("DB_NAME", "fashion_plm_dev"),
#         "USER": os.getenv("DB_USER", "postgres"),
#         "PASSWORD": os.getenv("DB_PASSWORD", "postgres"),
#         "HOST": os.getenv("DB_HOST", "localhost"),
#         "PORT": os.getenv("DB_PORT", "5432"),
#     }
# }

# CORS settings for development
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# Email backend for development (console)
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Logging
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "apps": {
            "handlers": ["console"],
            "level": "DEBUG",
            "propagate": False,
        },
    },
}

# Development-specific settings
INTERNAL_IPS = ["127.0.0.1"]

# Cache (use local memory for development)
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "fashion-plm-cache",
    }
}
