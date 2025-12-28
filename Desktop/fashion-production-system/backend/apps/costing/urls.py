"""
Costing URL Configuration
"""

from django.urls import path
from . import views

urlpatterns = [
    # List/Create CostSheets for a revision (GET/POST)
    path(
        'revisions/<uuid:revision_id>/cost-sheets/',
        views.cost_sheets_list_create,
        name='cost-sheets-list-create'
    ),

    # Get/Update single CostSheet detail (GET/PATCH)
    path(
        'cost-sheets/<int:cost_sheet_id>/',
        views.cost_sheet_detail_update,
        name='cost-sheet-detail-update'
    ),
]
