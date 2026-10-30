from rest_framework.renderers import JSONRenderer


class EnvelopeJSONRenderer(JSONRenderer):
    """Wraps every successful response in the docs/05 standard envelope.

    Views return plain payloads; this renderer is the single place that adds
    `{"success": true, "data": ...}`. Pre-enveloped responses (the health probe
    and paginated lists) pass straight through so they are never double-wrapped.
    """

    def render(self, data, accepted_media_type=None, renderer_context=None):
        response = (renderer_context or {}).get("response")

        if isinstance(data, dict) and "success" in data:
            payload = data
        elif response is not None and response.status_code >= 400:
            # Errors are shaped by `core.exceptions.api_exception_handler`.
            # This guard exists so a bare error can never escape the envelope.
            payload = {
                "success": False,
                "error": {"code": "ERROR", "message": self._message(data)},
            }
        else:
            payload = {"success": True, "data": data if data is not None else {}}

        return super().render(payload, accepted_media_type, renderer_context)

    @staticmethod
    def _message(data):
        if isinstance(data, dict) and "detail" in data:
            return str(data["detail"])
        return "Request failed"
