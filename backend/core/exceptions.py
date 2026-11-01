"""API error contract shared by every feature slice (docs/05_API_Design.md:224-235)."""

from rest_framework import status
from rest_framework.exceptions import (
    APIException,
    AuthenticationFailed,
    MethodNotAllowed,
    NotAuthenticated,
    NotFound,
    ParseError,
    PermissionDenied,
    ValidationError,
)
from rest_framework.views import exception_handler


class InvalidCredentials(APIException):
    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = "Incorrect email or password."
    default_code = "INVALID_CREDENTIALS"


class AccountInactive(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "This account has been deactivated."
    default_code = "ACCOUNT_INACTIVE"


class InvalidTokenError(AuthenticationFailed):
    default_detail = "Token is invalid or expired."
    default_code = "INVALID_TOKEN"


class MissingCredentials(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Email and password are required."
    default_code = "VALIDATION_ERROR"


class InvalidPayload(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "A JSON body is required."
    default_code = "INVALID_PAYLOAD"


def _messages(value):
    if isinstance(value, list):
        return [str(item) for item in value]
    return [str(value)]


def _validation_details(data):
    """Normalises DRF error payloads into the frontend's field -> string[] map."""
    if isinstance(data, dict):
        if set(data.keys()) == {"detail"}:
            return None
        return {field: _messages(value) for field, value in data.items()}
    if isinstance(data, list):
        return {"non_field_errors": _messages(data)}
    if data is None:
        return None
    return {"non_field_errors": _messages(data)}


def _detail_message(data, fallback):
    if isinstance(data, dict) and "detail" in data:
        return str(data["detail"])
    if isinstance(data, list) and data:
        return str(data[0])
    return fallback


def api_exception_handler(exc, context):
    """Returns every DRF error in the documented `{success, error}` shape."""
    response = exception_handler(exc, context)
    if response is None:
        return None

    data = response.data
    status_code = response.status_code
    details = None

    if isinstance(exc, ValidationError):
        code = "VALIDATION_ERROR"
        message = "Please correct the highlighted fields."
        details = _validation_details(data)
    elif isinstance(exc, ParseError):
        code = "INVALID_JSON"
        message = "Request body must be valid JSON."
    elif isinstance(exc, NotAuthenticated):
        code = "NOT_AUTHENTICATED"
        message = _detail_message(data, "Authentication credentials were not provided.")
    elif isinstance(exc, PermissionDenied):
        code = "PERMISSION_DENIED"
        message = _detail_message(data, "You do not have permission to perform this action.")
    elif isinstance(exc, AuthenticationFailed):
        code = "INVALID_TOKEN"
        message = "Token is invalid or expired."
    elif isinstance(exc, NotFound):
        code = "NOT_FOUND"
        message = _detail_message(data, "Not found.")
    elif isinstance(exc, MethodNotAllowed):
        code = "METHOD_NOT_ALLOWED"
        message = "Method not allowed."
    elif isinstance(exc, APIException):
        code = getattr(exc, "default_code", "ERROR").upper()
        message = _detail_message(data, "Request failed")
        details = _validation_details(data)
    else:
        code = {404: "NOT_FOUND", 405: "METHOD_NOT_ALLOWED"}.get(status_code, "ERROR")
        message = _detail_message(data, "Request failed")

    error = {"code": code, "message": message}
    if details:
        error["details"] = details

    response.data = {"success": False, "error": error}
    return response
