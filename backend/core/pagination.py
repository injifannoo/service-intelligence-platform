from urllib.parse import urlencode

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_paginated_response(self, data):
        """Emits the docs/05 pagination block instead of DRF's `results` key."""
        return Response(
            {
                "success": True,
                "data": data,
                "pagination": {
                    "count": self.page.paginator.count,
                    "next": self.get_next_link(),
                    "previous": self.get_previous_link(),
                    "page_size": self.get_page_size(self.request),
                },
            }
        )

    def get_next_link(self):
        if not self.page.has_next():
            return None
        return self._link(self.page.next_page_number())

    def get_previous_link(self):
        if not self.page.has_previous():
            return None
        return self._link(self.page.previous_page_number())

    def _link(self, page_number):
        """Relative link with filters first, then page/page_size like the BFF.

        DRF omits `page=1`, but the frontend contract always includes both
        page parameters.
        """
        params = [
            (key, value)
            for key, value in self.request.query_params.items()
            if key not in (self.page_query_param, self.page_size_query_param)
        ]
        params.append((self.page_query_param, page_number))
        params.append((self.page_size_query_param, self.get_page_size(self.request)))
        return f"?{urlencode(params)}"
