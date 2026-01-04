"""
P3: Batch Export Service
批量匯出多個 SampleRun 的文件到 ZIP
"""

import zipfile
from io import BytesIO
from django.http import HttpResponse
from datetime import datetime

from .pdf_export import MWOPDFExporter, EstimatePDFExporter, T2POPDFExporter
from .excel_export import MWOExcelExporter, EstimateExcelExporter, T2POExcelExporter


def batch_export_sample_runs(
    run_ids: list,
    export_types: list = None,
    format: str = 'pdf',
    organization=None
):
    """
    批量匯出多個 SampleRun 的文件到 ZIP

    Args:
        run_ids: SampleRun UUID 列表
        export_types: ['mwo', 'estimate', 'po'] 子集，默認全部
        format: 'pdf' or 'excel'
        organization: 租戶過濾

    Returns:
        HttpResponse with ZIP file

    ZIP 結構:
        export_2026-01-04_143022.zip
        ├── Run-001_LW1FLWS/
        │   ├── MWO-2601-000001.pdf
        │   ├── EST-2601-000001-v1.pdf
        │   └── T2PO-2601-000001.pdf
        └── Run-002_LW1DKES/
            └── ...
    """
    from apps.samples.models import SampleRun

    if export_types is None:
        export_types = ['mwo', 'estimate', 'po']

    # 查詢 Runs（使用租戶過濾）
    runs = SampleRun.objects.filter(id__in=run_ids)
    if organization:
        runs = runs.filter(organization=organization)

    runs = runs.select_related(
        'sample_request__revision__style',
        'sample_request'
    ).prefetch_related(
        'mwos',
        'sample_request__estimates',
        't2pos'
    )

    if not runs.exists():
        return HttpResponse('No runs found', status=404)

    # 準備 ZIP 緩衝區
    zip_buffer = BytesIO()
    results = {'total': runs.count(), 'succeeded': 0, 'failed': 0, 'errors': []}

    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for run in runs:
            # 資料夾名稱
            style_number = 'Unknown'
            if run.sample_request and run.sample_request.revision and run.sample_request.revision.style:
                style_number = run.sample_request.revision.style.style_number
            folder = f"Run-{run.run_no:03d}_{style_number}/"

            # 匯出 MWO
            if 'mwo' in export_types:
                try:
                    mwo = run.mwos.filter(is_latest=True).first()
                    if mwo:
                        if format == 'pdf':
                            exporter = MWOPDFExporter()
                            # Read from snapshot or guidance_usage
                            bom_data = getattr(mwo, 'bom_snapshot_json', None) or []
                            if not bom_data:
                                try:
                                    if hasattr(run, 'guidance_usage') and run.guidance_usage:
                                        usage_lines = run.guidance_usage.usage_lines.select_related('bom_item').all()
                                        bom_data = []
                                        for idx, ul in enumerate(usage_lines, 1):
                                            bom_item = ul.bom_item
                                            bom_data.append({
                                                'line_no': idx,
                                                'material_name': bom_item.material_name,
                                                'uom': ul.consumption_unit or '',
                                                'consumption': float(ul.consumption) if ul.consumption else 0,
                                                'unit_price': float(getattr(bom_item, 'unit_price', 0) or 0),
                                                'supplier_name': getattr(bom_item, 'supplier', '') or '',
                                            })
                                except Exception:
                                    pass

                            context = {
                                'mwo': mwo,
                                'bom_data': bom_data,
                                'ops_data': getattr(mwo, 'construction_snapshot_json', None) or [],
                                'qc_data': getattr(mwo, 'qc_snapshot_json', None) or [],
                            }
                            file_data = exporter.render_to_pdf('pdf/mwo.html', context)
                            ext = 'pdf'
                        else:  # excel
                            exporter = MWOExcelExporter()
                            response = exporter.export(mwo)
                            file_data = response.content
                            ext = 'xlsx'

                        zip_file.writestr(f"{folder}MWO_{mwo.mwo_no}.{ext}", file_data)
                        results['succeeded'] += 1
                except Exception as e:
                    results['failed'] += 1
                    results['errors'].append(f"Run {run.id} MWO: {str(e)}")

            # 匯出 Estimate
            if 'estimate' in export_types:
                try:
                    estimate = run.sample_request.estimates.filter(
                        status__in=['accepted', 'sent', 'draft']
                    ).order_by('-estimate_version').first()

                    if estimate:
                        if format == 'pdf':
                            exporter = EstimatePDFExporter()
                            context = {
                                'estimate': estimate,
                                'breakdown': getattr(estimate, 'breakdown_snapshot_json', None) or {},
                            }
                            file_data = exporter.render_to_pdf('pdf/estimate.html', context)
                            ext = 'pdf'
                        else:  # excel
                            exporter = EstimateExcelExporter()
                            response = exporter.export(estimate)
                            file_data = response.content
                            ext = 'xlsx'

                        zip_file.writestr(f"{folder}EST_{estimate.id}.{ext}", file_data)
                        results['succeeded'] += 1
                except Exception as e:
                    results['failed'] += 1
                    results['errors'].append(f"Run {run.id} Estimate: {str(e)}")

            # 匯出 PO
            if 'po' in export_types:
                try:
                    po = run.t2pos.filter(
                        status__in=['issued', 'confirmed', 'delivered']
                    ).order_by('-version_no').first()

                    if not po:
                        po = run.t2pos.filter(status='draft').order_by('-version_no').first()

                    if po:
                        if format == 'pdf':
                            exporter = T2POPDFExporter()
                            lines = list(po.lines.all().order_by('line_no'))
                            context = {
                                'po': po,
                                'lines': lines,
                            }
                            file_data = exporter.render_to_pdf('pdf/t2po.html', context)
                            ext = 'pdf'
                        else:  # excel
                            exporter = T2POExcelExporter()
                            response = exporter.export(po)
                            file_data = response.content
                            ext = 'xlsx'

                        zip_file.writestr(f"{folder}T2PO_{po.po_no}.{ext}", file_data)
                        results['succeeded'] += 1
                except Exception as e:
                    results['failed'] += 1
                    results['errors'].append(f"Run {run.id} PO: {str(e)}")

    # 返回 ZIP
    zip_buffer.seek(0)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"export_{len(runs)}_runs_{format}_{timestamp}.zip"

    response = HttpResponse(zip_buffer, content_type='application/zip')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response
