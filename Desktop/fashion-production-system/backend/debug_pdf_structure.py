"""Debug PDF table structure across pages"""
import pdfplumber

pdf_path = 'demo_data/bom/Spring2025_APACNuluSpaghettiCamiContrastNecklineTankwithBraBRLycraLW1FLWS_SabrinaFashionIndustrialCorporation_2024-Mar2.pdf'

with pdfplumber.open(pdf_path) as pdf:
    # Check pages 2-6
    for page_num in range(1, 6):
        print(f'\n{"="*80}')
        print(f'PAGE {page_num + 1}')
        print("="*80)

        page = pdf.pages[page_num]
        tables = page.extract_tables()

        if not tables:
            print(f'❌ No tables found')
            continue

        # Find main table (biggest one)
        main_table = max(tables, key=len)

        print(f'Found table with {len(main_table)} rows')

        # Show first 5 rows
        print('\n📋 First 5 rows:')
        for i, row in enumerate(main_table[:5]):
            print(f'\nRow {i}: ({len(row)} columns)')
            for j, cell in enumerate(row):
                cell_str = str(cell)[:50] if cell else ''
                print(f'  [{j:2d}] {cell_str}')
