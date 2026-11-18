from django.db.models import Q
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from features.organizations.models import Organization
from features.services.models import Service

from .models import Conversation, Message, ServiceRequest
from .serializers import (
    ConversationCreateSerializer,
    ConversationSerializer,
    ServiceRequestCreateSerializer,
    ServiceRequestSerializer,
)


class ConversationListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = (
            Conversation.objects.filter(Q(user=request.user) | Q(organization__owner=request.user))
            .select_related("organization", "user", "service")
            .prefetch_related("messages__sender")
        )
        serializer = ConversationSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = ConversationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        organization = Organization.objects.filter(pk=data["organization_id"]).first()
        if not organization:
            return Response({"detail": "Organization not found."}, status=status.HTTP_404_NOT_FOUND)

        service = None
        if data.get("service_id"):
            service = Service.objects.filter(pk=data["service_id"], organization=organization).first()
            if not service:
                return Response({"detail": "Service not found for this organization."}, status=status.HTTP_404_NOT_FOUND)

        conversation = Conversation.objects.create(
            organization=organization,
            user=request.user,
            service=service,
            subject=data.get("subject", ""),
        )
        Message.objects.create(
            conversation=conversation,
            sender=request.user,
            body=data["message"],
        )

        return Response(ConversationSerializer(conversation).data, status=status.HTTP_201_CREATED)


class ServiceRequestListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = ServiceRequest.objects.filter(Q(user=request.user) | Q(organization__owner=request.user)).select_related(
            "organization",
            "user",
            "service",
        )
        serializer = ServiceRequestSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = ServiceRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        organization = Organization.objects.filter(pk=data["organization_id"]).first()
        if not organization:
            return Response({"detail": "Organization not found."}, status=status.HTTP_404_NOT_FOUND)

        service = None
        if data.get("service_id"):
            service = Service.objects.filter(pk=data["service_id"], organization=organization).first()
            if not service:
                return Response({"detail": "Service not found for this organization."}, status=status.HTTP_404_NOT_FOUND)

        request_obj = ServiceRequest.objects.create(
            organization=organization,
            user=request.user,
            service=service,
            subject=data.get("subject", ""),
            request_type=data.get("request_type", "quote"),
            preferred_date=data.get("preferred_date"),
            budget=data.get("budget"),
            message=data.get("message", ""),
            contact_name=data.get("contact_name", ""),
            contact_email=data.get("contact_email", ""),
            contact_phone=data.get("contact_phone", ""),
        )
        return Response(ServiceRequestSerializer(request_obj).data, status=status.HTTP_201_CREATED)
