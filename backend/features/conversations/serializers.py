from rest_framework import serializers

from .models import Conversation, Message, ServiceRequest


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender.name", read_only=True)
    sender_email = serializers.EmailField(source="sender.email", read_only=True)

    class Meta:
        model = Message
        fields = (
            "id",
            "conversation_id",
            "sender_id",
            "sender_name",
            "sender_email",
            "body",
            "is_read",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class ConversationSerializer(serializers.ModelSerializer):
    organization_id = serializers.UUIDField(source="organization.id", read_only=True)
    organization_name = serializers.CharField(source="organization.name", read_only=True)
    user_id = serializers.UUIDField(source="user.id", read_only=True)
    service_id = serializers.UUIDField(source="service.id", read_only=True, allow_null=True)
    service_name = serializers.CharField(source="service.name", read_only=True, allow_null=True)
    messages = MessageSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = (
            "id",
            "organization_id",
            "organization_name",
            "user_id",
            "service_id",
            "service_name",
            "subject",
            "status",
            "last_message",
            "messages",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_last_message(self, obj):
        msg = obj.messages.order_by("-created_at").first()
        if not msg:
            return None
        return {
            "id": str(msg.id),
            "body": msg.body,
            "sender_id": str(msg.sender_id),
            "created_at": msg.created_at.isoformat(),
        }


class ConversationCreateSerializer(serializers.Serializer):
    organization_id = serializers.UUIDField()
    service_id = serializers.UUIDField(required=False, allow_null=True)
    subject = serializers.CharField(required=False, allow_blank=True, default="")
    message = serializers.CharField(required=True, allow_blank=False)


class ServiceRequestSerializer(serializers.ModelSerializer):
    organization_id = serializers.UUIDField(source="organization.id", read_only=True)
    organization_name = serializers.CharField(source="organization.name", read_only=True)
    user_id = serializers.UUIDField(source="user.id", read_only=True)
    service_id = serializers.UUIDField(source="service.id", read_only=True, allow_null=True)
    service_name = serializers.CharField(source="service.name", read_only=True, allow_null=True)

    class Meta:
        model = ServiceRequest
        fields = (
            "id",
            "organization_id",
            "organization_name",
            "user_id",
            "service_id",
            "service_name",
            "subject",
            "request_type",
            "status",
            "preferred_date",
            "budget",
            "message",
            "contact_name",
            "contact_email",
            "contact_phone",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class ServiceRequestCreateSerializer(serializers.Serializer):
    organization_id = serializers.UUIDField()
    service_id = serializers.UUIDField(required=False, allow_null=True)
    subject = serializers.CharField(required=False, allow_blank=True, default="")
    request_type = serializers.ChoiceField(choices=["quote", "booking", "general"], required=False, default="quote")
    preferred_date = serializers.DateField(required=False, allow_null=True)
    budget = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    message = serializers.CharField(required=False, allow_blank=True, default="")
    contact_name = serializers.CharField(required=False, allow_blank=True, default="")
    contact_email = serializers.EmailField(required=False, allow_blank=True, default="")
    contact_phone = serializers.CharField(required=False, allow_blank=True, default="")
