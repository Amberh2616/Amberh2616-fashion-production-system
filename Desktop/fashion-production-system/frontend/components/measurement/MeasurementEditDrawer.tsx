"use client";

import { useState, useEffect } from "react";
import { useUpdateMeasurement, useTranslateMeasurement } from "@/lib/hooks/useMeasurement";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MeasurementItem } from "@/lib/types/measurement";
import { Sparkles } from "lucide-react";

interface MeasurementEditDrawerProps {
  item: MeasurementItem;
  revisionId: string;
  open: boolean;
  onClose: () => void;
}

export function MeasurementEditDrawer({
  item,
  revisionId,
  open,
  onClose,
}: MeasurementEditDrawerProps) {
  const [formData, setFormData] = useState<{
    point_name: string;
    point_name_zh: string;
    point_code: string;
    tolerance_plus: string;
    tolerance_minus: string;
    unit: string;
    values: Record<string, number | null>;
  }>({
    point_name: item.point_name || "",
    point_name_zh: item.point_name_zh || "",
    point_code: item.point_code || "",
    tolerance_plus: item.tolerance_plus || "0",
    tolerance_minus: item.tolerance_minus || "0",
    unit: item.unit || "cm",
    values: item.values && typeof item.values === "object" ? { ...item.values } : {},
  });

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const updateMutation = useUpdateMeasurement(revisionId);
  const translateMutation = useTranslateMeasurement(revisionId);

  // Reset form when item changes
  useEffect(() => {
    setFormData({
      point_name: item.point_name || "",
      point_name_zh: item.point_name_zh || "",
      point_code: item.point_code || "",
      tolerance_plus: item.tolerance_plus || "0",
      tolerance_minus: item.tolerance_minus || "0",
      unit: item.unit || "cm",
      values: item.values && typeof item.values === "object" ? { ...item.values } : {},
    });
    setSuccessMessage("");
    setErrorMessage("");
  }, [item]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleValueChange = (size: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      values: {
        ...prev.values,
        [size]: value === "" ? null : parseFloat(value) || 0,
      },
    }));
  };

  const handleAutoTranslate = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await translateMutation.mutateAsync(item.id);
      setSuccessMessage("AI 翻譯完成！");
    } catch (error) {
      setErrorMessage((error as Error).message || "AI 翻譯失敗");
    }
  };

  const handleSave = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    // Filter out null values from formData.values
    const cleanedValues: Record<string, number> = {};
    Object.entries(formData.values).forEach(([key, value]) => {
      if (value !== null) {
        cleanedValues[key] = value;
      }
    });

    try {
      await updateMutation.mutateAsync({
        itemId: item.id,
        data: {
          point_name: formData.point_name,
          point_name_zh: formData.point_name_zh || undefined,
          point_code: formData.point_code || undefined,
          tolerance_plus: formData.tolerance_plus,
          tolerance_minus: formData.tolerance_minus,
          unit: formData.unit,
          values: cleanedValues,
          translation_status: formData.point_name_zh ? "confirmed" : "pending",
        },
      });

      setSuccessMessage("儲存成功！");
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      setErrorMessage((error as Error).message || "儲存失敗");
    }
  };

  // Get all size keys
  const sizeKeys = Object.keys(formData.values).sort((a, b) => {
    const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL', '5XL'];
    const aIndex = sizeOrder.indexOf(a);
    const bIndex = sizeOrder.indexOf(b);
    if (aIndex >= 0 && bIndex >= 0) return aIndex - bIndex;
    if (aIndex >= 0) return -1;
    if (bIndex >= 0) return 1;
    return a.localeCompare(b);
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>編輯尺寸點</DialogTitle>
          <DialogDescription>
            編輯尺寸點的名稱、數值、公差等資訊
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">基本資訊</TabsTrigger>
            <TabsTrigger value="values">尺碼數值</TabsTrigger>
            <TabsTrigger value="translation">翻譯</TabsTrigger>
          </TabsList>

          {/* Basic Info Tab */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            {/* Success/Error messages */}
            {successMessage && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
                {successMessage}
              </div>
            )}
            {errorMessage && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="point_name">尺寸點名稱（英文）</Label>
                <Input
                  id="point_name"
                  value={formData.point_name}
                  onChange={(e) => handleChange("point_name", e.target.value)}
                  placeholder="e.g. CHEST WIDTH"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="point_code">編碼</Label>
                <Input
                  id="point_code"
                  value={formData.point_code}
                  onChange={(e) => handleChange("point_code", e.target.value)}
                  placeholder="e.g. A, B, 1, 2"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tolerance_plus">公差 (+)</Label>
                <Input
                  id="tolerance_plus"
                  type="number"
                  step="0.01"
                  value={formData.tolerance_plus}
                  onChange={(e) => handleChange("tolerance_plus", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tolerance_minus">公差 (-)</Label>
                <Input
                  id="tolerance_minus"
                  type="number"
                  step="0.01"
                  value={formData.tolerance_minus}
                  onChange={(e) => handleChange("tolerance_minus", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">單位</Label>
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => handleChange("unit", e.target.value)}
                  placeholder="cm / inches"
                />
              </div>
            </div>
          </TabsContent>

          {/* Size Values Tab */}
          <TabsContent value="values" className="space-y-4 mt-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm font-medium mb-3">各尺碼數值</div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {sizeKeys.map((size) => (
                  <div key={size} className="space-y-1">
                    <Label htmlFor={`size_${size}`} className="text-xs">
                      {size}
                    </Label>
                    <Input
                      id={`size_${size}`}
                      type="number"
                      step="0.01"
                      value={formData.values[size] ?? ""}
                      onChange={(e) => handleValueChange(size, e.target.value)}
                      className="h-9"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-900">
                提示：直接輸入數字修改各尺碼的尺寸值，留空表示該尺碼無此尺寸點
              </div>
            </div>
          </TabsContent>

          {/* Translation Tab */}
          <TabsContent value="translation" className="space-y-4 mt-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-muted-foreground">翻譯狀態：</span>
              <Badge
                variant={item.translation_status === "confirmed" ? "default" : "secondary"}
              >
                {item.translation_status === "confirmed" ? "已確認" : "待翻譯"}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label htmlFor="point_name_zh">尺寸點名稱（中文）</Label>
              <div className="flex gap-2">
                <Input
                  id="point_name_zh"
                  value={formData.point_name_zh}
                  onChange={(e) => handleChange("point_name_zh", e.target.value)}
                  placeholder="輸入中文尺寸點名稱..."
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={handleAutoTranslate}
                  disabled={translateMutation.isPending}
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  {translateMutation.isPending ? "翻譯中..." : "AI 翻譯"}
                </Button>
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <div className="text-xs text-muted-foreground mb-2">原始名稱（英文）</div>
              <div className="text-sm font-medium">{item.point_name}</div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? "儲存中..." : "儲存變更"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
