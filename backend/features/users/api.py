from rest_framework import status
from rest_framework.exceptions import NotAuthenticated, ParseError, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.exceptions import MissingCredentials

from .serializers import ProfileUpdateSerializer, RegisterSerializer, UserProfileSerializer
from .services import (
    authenticate_user,
    blacklist_refresh_token,
    issue_tokens,
    refresh_session,
    register_user,
    update_profile,
)

# Mirrors AUTH_COOKIES.refreshToken in frontend/src/config/site-config.ts.
REFRESH_COOKIE = "asip_refresh_token"


def _body(request) -> dict:
    try:
        data = request.data
    except ParseError:
        return {}
    return data if isinstance(data, dict) else {}


class RegisterView(APIView):
    """POST `/api/v1/auth/register/` (docs/05_API_Design.md:139-163)."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        if "role" in _body(request):
            raise ValidationError({"role": ["Role cannot be set through registration."]})

        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        register_user(**serializer.validated_data)

        return Response({"message": "Account created"}, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """POST `/api/v1/auth/login/` (docs/05_API_Design.md:167-184)."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        email = _body(request).get("email")
        password = _body(request).get("password")

        if not isinstance(email, str) or not isinstance(password, str):
            raise MissingCredentials()
        if not email.strip() or not password:
            raise MissingCredentials()

        user = authenticate_user(email=email, password=password)
        return Response(issue_tokens(user))


class LogoutView(APIView):
    """POST `/api/v1/auth/logout/` (docs/05_API_Design.md:186-194)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        body = _body(request)
        refresh = body.get("refresh_token") or request.COOKIES.get(REFRESH_COOKIE)
        blacklist_refresh_token(refresh if isinstance(refresh, str) else None)
        return Response({"message": "Logged out"})


class RefreshView(APIView):
    """POST `/api/v1/auth/refresh/`.

    docs/05 documents the refresh token but omits this endpoint; the frontend
    BFF already relies on `/auth/refresh/` with a body or cookie token.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        body = _body(request)
        token = body.get("refresh_token") or request.COOKIES.get(REFRESH_COOKIE)

        if not isinstance(token, str) or not token:
            raise NotAuthenticated("No refresh token was provided.")

        user = refresh_session(refresh_token=token)
        return Response(issue_tokens(user))


class ProfileView(APIView):
    """GET/PUT `/api/v1/users/profile/` (docs/05_API_Design.md:250-268)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserProfileSerializer(request.user).data)

    def put(self, request):
        serializer = ProfileUpdateSerializer(request.user, data=request.data)
        serializer.is_valid(raise_exception=True)
        user = update_profile(request.user, **serializer.validated_data)
        return Response(UserProfileSerializer(user).data)
