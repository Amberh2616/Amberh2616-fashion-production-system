# 多檔案上傳 + 自動解析翻譯 - 設計方案

**日期:** 2026-01-04
**需求:** 拖曳多個 PDF → 系統自動解析 + 翻譯

---

## 🎯 用戶需求

```
用戶操作：
1. 拖曳/上傳多個 PDF 檔案到系統
   ├── Tech Pack.pdf（設計圖、圖文說明）
   ├── BOM.pdf（物料清單表格）
   ├── Spec.pdf（尺寸規格表）
   └── Construction.pdf（工序說明）

2. 系統自動執行（無需額外操作）
   ├── 識別每個 PDF 的類型
   ├── 解析內容（表格/圖文/文字）
   ├── 自動翻譯成中文（GPT-4o-mini）
   └── 存入資料庫（雙語）

3. 用戶看到結果
   ├── Draft Review UI（檢查翻譯）
   ├── BOM Editor（驗證物料）
   ├── Spec Editor（驗證尺寸）
   └── Construction Editor（驗證工序）
```

---

## 📋 實施方案

### Phase 1: 多檔案上傳 UI（前端）

**檔案:** `frontend/app/dashboard/upload/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useDropzone } from 'react-dropzone'

export default function MultiFileUploadPage() {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<Record<string, number>>({})

  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,  // 允許多檔案
    onDrop: async (acceptedFiles) => {
      setFiles(acceptedFiles)
      await handleUploadAndParse(acceptedFiles)
    }
  })

  const handleUploadAndParse = async (files: File[]) => {
    setUploading(true)

    // 創建 Style + Revision
    const revisionId = await createRevision({
      style_number: 'AUTO-' + Date.now(),
      style_name: 'Multi-file upload'
    })

    // 上傳所有檔案
    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('revision_id', revisionId)

      // 上傳 + 自動解析
      const response = await fetch('/api/v2/upload-and-parse/', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()
      setProgress(prev => ({
        ...prev,
        [file.name]: result.status === 'success' ? 100 : -1
      }))
    }

    setUploading(false)
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">上傳 Tech Pack 文件</h1>

      {/* 拖曳區 */}
      <div {...getRootProps()} className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-blue-500">
        <input {...getInputProps()} />
        <p className="text-lg">拖曳多個 PDF 檔案到這裡，或點擊選擇</p>
        <p className="text-sm text-gray-500 mt-2">支援：Tech Pack、BOM、Spec、Construction PDF</p>
      </div>

      {/* 上傳進度 */}
      {files.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-4">上傳進度</h2>
          {files.map(file => (
            <div key={file.name} className="mb-3 p-4 bg-gray-50 rounded">
              <div className="flex justify-between items-center">
                <span>{file.name}</span>
                <span>
                  {progress[file.name] === 100 ? '✅ 完成' :
                   progress[file.name] === -1 ? '❌ 失敗' :
                   progress[file.name] ? `${progress[file.name]}%` : '⏳ 處理中...'}
                </span>
              </div>
              {progress[file.name] && progress[file.name] !== 100 && (
                <div className="mt-2 h-2 bg-gray-200 rounded">
                  <div
                    className="h-full bg-blue-500 rounded transition-all"
                    style={{ width: `${progress[file.name]}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

### Phase 2: 後端 API - 上傳 + 自動解析

**檔案:** `backend/apps/parsing/views.py`

```python
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from django.core.files.storage import default_storage
from .tasks.auto_parse import auto_parse_and_translate

@api_view(['POST'])
@parser_classes([MultiPartParser])
def upload_and_parse(request):
    """
    上傳 PDF + 自動解析翻譯

    POST /api/v2/upload-and-parse/

    Body (multipart/form-data):
    - file: PDF 檔案
    - revision_id: StyleRevision UUID

    Returns:
    {
        "status": "success",
        "file_id": "uuid",
        "file_type": "bom" | "spec" | "construction" | "techpack",
        "task_id": "celery-task-id"
    }
    """
    file = request.FILES.get('file')
    revision_id = request.data.get('revision_id')

    if not file or not revision_id:
        return Response({'error': 'file and revision_id required'}, status=400)

    # 儲存檔案
    file_path = default_storage.save(f'uploads/{file.name}', file)

    # 觸發 Celery 異步解析任務
    task = auto_parse_and_translate.delay(
        file_path=file_path,
        revision_id=revision_id
    )

    return Response({
        'status': 'success',
        'file_id': str(file_path),
        'task_id': task.id
    })
```

---

### Phase 3: 自動解析 + 翻譯 Task

**檔案:** `backend/apps/parsing/tasks/auto_parse.py`

```python
"""
自動解析 + 翻譯 Celery Task

功能：
1. 自動識別 PDF 類型（BOM/Spec/Construction/TechPack）
2. 根據類型調用對應解析器
3. 自動翻譯所有內容
4. 存入資料庫（雙語）
"""

from celery import shared_task
import pdfplumber
from ..utils.translate import machine_translate
from ..utils.pdf_classifier import classify_pdf_type

@shared_task(bind=True)
def auto_parse_and_translate(self, file_path: str, revision_id: str):
    """
    自動解析 + 翻譯 PDF

    流程:
    1. 識別 PDF 類型
    2. 調用對應解析器
    3. 自動翻譯
    4. 存入資料庫
    """

    with pdfplumber.open(file_path) as pdf:
        # Step 1: 識別 PDF 類型
        pdf_type = classify_pdf_type(pdf)

        # Step 2: 根據類型解析
        if pdf_type == 'bom':
            return parse_bom_pdf(pdf, revision_id)
        elif pdf_type == 'spec':
            return parse_spec_pdf(pdf, revision_id)
        elif pdf_type == 'construction':
            return parse_construction_pdf(pdf, revision_id)
        else:  # techpack
            return parse_techpack_pdf(pdf, revision_id)


def parse_bom_pdf(pdf, revision_id):
    """
    解析 BOM PDF（表格）

    流程:
    1. extract_tables() 提取表格
    2. 識別欄位（Material Name, Supplier, UOM...）
    3. 翻譯 Material Name → material_name_zh
    4. 存入 draft_bom_data
    """
    from apps.styles.models import StyleRevision

    revision = StyleRevision.objects.get(id=revision_id)

    bom_items = []

    for page in pdf.pages:
        tables = page.extract_tables()

        for table in tables:
            # 假設第一行是 header
            headers = table[0]

            # 找到 Material Name 欄位（可能是 "Material", "Description", "Item"）
            material_col = find_column_index(headers, ['Material', 'Description', 'Item'])
            supplier_col = find_column_index(headers, ['Supplier'])
            uom_col = find_column_index(headers, ['UOM', 'Unit'])

            # 解析每一行
            for row in table[1:]:
                if not row[material_col]:  # 空行跳過
                    continue

                material_name = row[material_col].strip()

                # 🔥 自動翻譯
                material_name_zh = machine_translate(material_name)

                bom_items.append({
                    'item_number': len(bom_items) + 1,
                    'category': 'fabric',  # TODO: 智能分類
                    'description': material_name,
                    'description_zh': material_name_zh,  # ✅ 雙語
                    'supplier': row[supplier_col] if supplier_col else None,
                    'uom': row[uom_col] if uom_col else 'pcs',
                })

    # 存入 draft_bom_data
    revision.draft_bom_data = {'items': bom_items}
    revision.save()

    return {
        'status': 'success',
        'type': 'bom',
        'items_count': len(bom_items)
    }


def parse_spec_pdf(pdf, revision_id):
    """
    解析 Spec PDF（尺寸表）

    流程:
    1. extract_tables() 提取表格
    2. 識別尺寸點（Chest, Waist, Length...）
    3. 翻譯尺寸點名稱 → point_name_zh
    4. 存入 draft_measurement_data
    """
    from apps.styles.models import StyleRevision

    revision = StyleRevision.objects.get(id=revision_id)

    measurement_points = []

    for page in pdf.pages:
        tables = page.extract_tables()

        for table in tables:
            headers = table[0]

            # 假設第一欄是 Point Name
            for row in table[1:]:
                point_name = row[0].strip()

                # 🔥 自動翻譯
                point_name_zh = machine_translate(point_name)

                # 解析尺寸數據（XXS, XS, S, M, L, XL）
                sizes = {}
                for i, size_label in enumerate(['XXS', 'XS', 'S', 'M', 'L', 'XL']):
                    if i+1 < len(row):
                        sizes[size_label] = float(row[i+1]) if row[i+1] else None

                measurement_points.append({
                    'point_code': f'P{len(measurement_points)+1}',
                    'point_name': point_name,
                    'point_name_zh': point_name_zh,  # ✅ 雙語
                    'sizes': sizes,
                    'tolerance': '+/- 0.5cm'
                })

    # 存入 draft_measurement_data
    revision.draft_measurement_data = {'points': measurement_points}
    revision.save()

    return {
        'status': 'success',
        'type': 'spec',
        'points_count': len(measurement_points)
    }


def parse_construction_pdf(pdf, revision_id):
    """
    解析 Construction PDF（工序說明）

    流程:
    1. extract_text() 提取文字
    2. 分段識別工序（可能是編號列表）
    3. 翻譯工序說明 → description_zh
    4. 存入 draft_construction_data
    """
    from apps.styles.models import StyleRevision

    revision = StyleRevision.objects.get(id=revision_id)

    construction_steps = []

    for page in pdf.pages:
        text = page.extract_text()

        # 簡單分行解析（TODO: 更智能的段落識別）
        lines = text.split('\n')

        step_number = 1
        for line in lines:
            line = line.strip()

            # 跳過空行和標題
            if not line or len(line) < 10:
                continue

            # 🔥 自動翻譯
            description_zh = machine_translate(line)

            construction_steps.append({
                'step_number': step_number,
                'step_name': f'Step {step_number}',
                'description': line,
                'description_zh': description_zh,  # ✅ 雙語
                'machine_type': '',
            })

            step_number += 1

    # 存入 draft_construction_data
    revision.draft_construction_data = {'steps': construction_steps}
    revision.save()

    return {
        'status': 'success',
        'type': 'construction',
        'steps_count': len(construction_steps)
    }


def parse_techpack_pdf(pdf, revision_id):
    """
    解析 Tech Pack PDF（圖文說明）

    使用現有的 DraftBlock 系統
    """
    from .parse_page4 import parse_all_pages
    return parse_all_pages(revision_id)


# 輔助函數
def find_column_index(headers, possible_names):
    """找到欄位索引（支援多種可能的名稱）"""
    for i, header in enumerate(headers):
        for name in possible_names:
            if name.lower() in header.lower():
                return i
    return None
```

---

### Phase 4: PDF 類型識別

**檔案:** `backend/apps/parsing/utils/pdf_classifier.py`

```python
"""
PDF 類型自動識別

規則：
- BOM: 有大量表格 + 包含 "Material", "Supplier" 欄位
- Spec: 有表格 + 包含 "XXS", "XS", "S", "M" 尺寸欄位
- Construction: 文字為主 + 包含步驟編號
- TechPack: 圖文混合 + 有紅線註解
"""

def classify_pdf_type(pdf):
    """
    自動識別 PDF 類型

    Returns: 'bom' | 'spec' | 'construction' | 'techpack'
    """
    first_page = pdf.pages[0]

    # 提取表格和文字
    tables = first_page.extract_tables()
    text = first_page.extract_text() or ""

    # 規則 1: 有表格 + 包含 Material/Supplier → BOM
    if len(tables) > 0:
        table_text = str(tables[0])
        if any(keyword in table_text.lower() for keyword in ['material', 'supplier', 'article']):
            return 'bom'

        # 規則 2: 有表格 + 包含尺寸 → Spec
        if any(size in table_text for size in ['XXS', 'XS', 'S', 'M', 'L', 'XL']):
            return 'spec'

    # 規則 3: 文字有步驟編號 → Construction
    if 'step 1' in text.lower() or '1.' in text[:500]:
        return 'construction'

    # 預設: Tech Pack
    return 'techpack'
```

---

## 🔄 完整流程圖

```
┌─────────────────────────────────────────────────────────┐
│ 1. 用戶拖曳多個 PDF                                     │
├─────────────────────────────────────────────────────────┤
│ Files:                                                  │
│ - Tech_Pack.pdf                                         │
│ - BOM.pdf                                               │
│ - Spec.pdf                                              │
│ - Construction.pdf                                      │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ 2. 前端：逐個上傳到後端                                 │
├─────────────────────────────────────────────────────────┤
│ POST /api/v2/upload-and-parse/                          │
│ - file: PDF                                             │
│ - revision_id: UUID                                     │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ 3. 後端：Celery 異步處理每個檔案                        │
├─────────────────────────────────────────────────────────┤
│ auto_parse_and_translate.delay(file_path, revision_id) │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ 4. PDF 類型識別                                         │
├─────────────────────────────────────────────────────────┤
│ classify_pdf_type(pdf)                                  │
│ → 'bom' | 'spec' | 'construction' | 'techpack'          │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ 5. 根據類型解析                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ BOM.pdf → parse_bom_pdf()                               │
│   ├─ extract_tables()                                   │
│   ├─ 識別欄位（Material, Supplier, UOM）               │
│   ├─ 翻譯: machine_translate(material_name)             │
│   └─ 存入 draft_bom_data（雙語）                        │
│                                                         │
│ Spec.pdf → parse_spec_pdf()                             │
│   ├─ extract_tables()                                   │
│   ├─ 識別尺寸點（Chest, Waist...）                      │
│   ├─ 翻譯: machine_translate(point_name)                │
│   └─ 存入 draft_measurement_data（雙語）                │
│                                                         │
│ Construction.pdf → parse_construction_pdf()             │
│   ├─ extract_text()                                     │
│   ├─ 分段識別工序                                       │
│   ├─ 翻譯: machine_translate(description)               │
│   └─ 存入 draft_construction_data（雙語）               │
│                                                         │
│ Tech_Pack.pdf → parse_techpack_pdf()                    │
│   ├─ extract_words()                                    │
│   ├─ 識別 callouts（圖文說明）                          │
│   ├─ 翻譯: machine_translate(source_text)               │
│   └─ 存入 DraftBlock（雙語）                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ 6. 用戶查看結果                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Draft Review UI → 檢查圖文翻譯                          │
│ BOM Editor → 驗證物料清單（已含中文）                   │
│ Spec Editor → 驗證尺寸表（已含中文）                    │
│ Construction Editor → 驗證工序（已含中文）              │
│                                                         │
│ 全部驗證完成 → Verify → 創建 BOMItem/ConstructionStep  │
│ （雙語資料已在資料庫）                                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 實施計劃

### Week 1: 基礎架構
- [x] 翻譯引擎（已完成）
- [ ] 多檔案上傳 UI
- [ ] 上傳 API endpoint
- [ ] PDF 類型識別器

### Week 2: 解析器
- [ ] BOM 表格解析
- [ ] Spec 表格解析
- [ ] Construction 文字解析
- [ ] 整合現有 TechPack 解析

### Week 3: 整合測試
- [ ] 使用真實 PDF 測試（LW1FLWS）
- [ ] 驗證翻譯品質
- [ ] 修正欄位識別錯誤
- [ ] UI 優化

---

## 🎯 成果

**用戶體驗:**
```
拖曳 4 個 PDF → 等待 2-3 分鐘 → 所有內容已解析 + 翻譯完成 ✅

工廠人員可以：
- 在 BOM Editor 看到中文物料名稱
- 在 Spec Editor 看到中文尺寸點
- 在 Construction Editor 看到中文工序
- 在 MWO PDF 看到雙語輸出

完全不需要手動翻譯！🎉
```

---

**下一步：開始實施 Phase 1（多檔案上傳 UI）？**
