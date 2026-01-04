"""
P3: PDF Export Service
複用 P2 Excel 架構，改用 HTML 模板生成 PDF
使用雙引擎策略：WeasyPrint（Linux/Docker）或 xhtml2pdf（Windows）
"""

from django.template.loader import render_to_string
from django.http import HttpResponse
from django.utils import timezone
from io import BytesIO

# 雙引擎支援：優先使用 WeasyPrint，回退到 xhtml2pdf
try:
    from weasyprint import HTML
    PDF_ENGINE = 'weasyprint'
except (ImportError, OSError):
    # OSError: Windows 上可能缺少 GTK+ 依賴
    from xhtml2pdf import pisa
    PDF_ENGINE = 'xhtml2pdf'


class PDFExporter:
    """Base class for PDF export using HTML templates"""

    @staticmethod
    def create_response(pdf_data, filename):
        """
        Create HTTP response with PDF file

        Args:
            pdf_data: PDF binary data
            filename: File name for download

        Returns:
            HttpResponse with PDF content
        """
        response = HttpResponse(pdf_data, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @staticmethod
    def render_to_pdf(template_name, context):
        """
        Render HTML template to PDF

        Args:
            template_name: Django template path
            context: Template context dict

        Returns:
            PDF binary data

        Raises:
            Exception: If PDF generation fails
        """
        # 添加當前時間到 context
        context['now'] = timezone.now()

        # 渲染 HTML
        html_string = render_to_string(template_name, context)

        # 根據可用引擎生成 PDF
        if PDF_ENGINE == 'weasyprint':
            pdf = HTML(string=html_string).write_pdf()
            return pdf
        else:  # xhtml2pdf
            result = BytesIO()
            pisa_status = pisa.CreatePDF(html_string, dest=result)

            if pisa_status.err:
                raise Exception(f"PDF generation failed with xhtml2pdf: {pisa_status.err}")

            return result.getvalue()


class MWOPDFExporter(PDFExporter):
    """Export SampleMWO to PDF"""

    def export(self, mwo):
        """
        Export MWO to PDF

        Args:
            mwo: SampleMWO instance

        Returns:
            HttpResponse with PDF file
        """
        # Fallback: 如果 snapshot 為空，從 guidance_usage 讀取
        bom_data = getattr(mwo, 'bom_snapshot_json', None) or []

        if not bom_data:
            try:
                run = mwo.sample_run
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
                bom_data = []

        context = {
            'mwo': mwo,
            'bom_data': bom_data,
            'ops_data': getattr(mwo, 'construction_snapshot_json', None) or [],
            'qc_data': getattr(mwo, 'qc_snapshot_json', None) or [],
        }

        pdf_data = self.render_to_pdf('pdf/mwo.html', context)
        filename = f"MWO_{mwo.mwo_no}.pdf"
        return self.create_response(pdf_data, filename)


class EstimatePDFExporter(PDFExporter):
    """Export SampleCostEstimate to PDF"""

    def export(self, estimate):
        """
        Export Cost Estimate to PDF

        Args:
            estimate: SampleCostEstimate instance

        Returns:
            HttpResponse with PDF file
        """
        context = {
            'estimate': estimate,
            'breakdown': getattr(estimate, 'breakdown_snapshot_json', None) or {},
        }

        pdf_data = self.render_to_pdf('pdf/estimate.html', context)
        filename = f"EST_{estimate.id}.pdf"
        return self.create_response(pdf_data, filename)


class T2POPDFExporter(PDFExporter):
    """Export T2POForSample to PDF"""

    def export(self, po):
        """
        Export T2 PO to PDF

        Args:
            po: T2POForSample instance

        Returns:
            HttpResponse with PDF file
        """
        # 查詢 line items
        try:
            lines = list(po.lines.all().order_by('line_no'))
        except Exception:
            lines = []

        context = {
            'po': po,
            'lines': lines,
        }

        pdf_data = self.render_to_pdf('pdf/t2po.html', context)
        filename = f"T2PO_{po.po_no}.pdf"
        return self.create_response(pdf_data, filename)


# 用於檢測當前使用的 PDF 引擎
def get_pdf_engine():
    """
    Get current PDF engine name

    Returns:
        str: 'weasyprint' or 'xhtml2pdf'
    """
    return PDF_ENGINE
