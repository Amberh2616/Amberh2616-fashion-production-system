"use client";

import { useState, useRef } from "react";
import { useSetPreEstimate, useConfirmConsumption, useLockConsumption } from "@/lib/hooks/useBom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { BOMItem } from "@/lib/types/bom";
import { CheckCircle2, XCircle, Loader2, Lock, ChevronDown, History } from "lucide-react";

interface EditableConsumptionCellProps {
  item: BOMItem;
  revisionId: string;
}

export function EditableConsumptionCell({ item, revisionId }: EditableConsumptionCellProps) {
  const [preEstimateValue, setPreEstimateValue] = useState(item.pre_estimate_value || "");
  const [confirmedValue, setConfirmedValue] = useState(item.confirmed_value || "");
  const [isEditing, setIsEditing] = useState(false);
  const [editField, setEditField] = useState<"pre_estimate" | "confirmed" | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  const setPreEstimateMutation = useSetPreEstimate(revisionId);
  const confirmConsumptionMutation = useConfirmConsumption(revisionId);
  const lockConsumptionMutation = useLockConsumption(revisionId);

  const handleSavePreEstimate = async () => {
    const numValue = parseFloat(preEstimateValue);
    if (isNaN(numValue) || numValue < 0) {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 2000);
      return;
    }

    setSaveState("saving");
    try {
      await setPreEstimateMutation.mutateAsync({
        itemId: item.id,
        value: preEstimateValue,
      });
      setSaveState("saved");
      setEditField(null);
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (error) {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 2000);
    }
  };

  const handleSaveConfirmed = async () => {
    const numValue = parseFloat(confirmedValue);
    if (isNaN(numValue) || numValue < 0) {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 2000);
      return;
    }

    setSaveState("saving");
    try {
      await confirmConsumptionMutation.mutateAsync({
        itemId: item.id,
        value: confirmedValue,
        source: "manual",
      });
      setSaveState("saved");
      setEditField(null);
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (error) {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 2000);
    }
  };

  const handleLock = async () => {
    setSaveState("saving");
    try {
      await lockConsumptionMutation.mutateAsync(item.id);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (error) {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 2000);
    }
  };

  const isLocked = item.consumption_maturity === "locked";
  const currentValue = item.current_consumption || item.consumption || "0";

  // 狀態 Badge 配置
  const maturityConfig = {
    unknown: { label: "待填寫", color: "bg-gray-100 text-gray-600" },
    pre_estimate: { label: "預估", color: "bg-blue-100 text-blue-700" },
    confirmed: { label: "已確認", color: "bg-green-100 text-green-700" },
    locked: { label: "已鎖定", color: "bg-amber-100 text-amber-700" },
  };

  const config = maturityConfig[item.consumption_maturity] || maturityConfig.unknown;

  return (
    <Popover open={isEditing} onOpenChange={setIsEditing}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 px-2 text-sm font-mono ${isLocked ? "bg-amber-50" : ""}`}
          disabled={isLocked}
        >
          <span className="mr-2">{parseFloat(currentValue).toFixed(4)}</span>
          <Badge className={`text-[10px] px-1 ${config.color}`}>
            {isLocked && <Lock className="h-3 w-3 mr-1" />}
            {config.label}
          </Badge>
          {!isLocked && <ChevronDown className="h-3 w-3 ml-1 opacity-50" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          <div className="text-sm font-medium">用量管理</div>

          {/* 原始用量（只讀） */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">原始用量（Tech Pack）</label>
            <div className="text-sm font-mono bg-gray-50 px-2 py-1 rounded">
              {item.consumption || "-"} {item.unit}
            </div>
          </div>

          {/* 預估用量 */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">預估用量（工廠經驗值）</label>
            {editField === "pre_estimate" ? (
              <div className="flex items-center gap-2">
                <Input
                  ref={inputRef}
                  type="text"
                  value={preEstimateValue}
                  onChange={(e) => setPreEstimateValue(e.target.value)}
                  className="h-8 text-sm font-mono"
                  placeholder="輸入預估用量"
                  autoFocus
                />
                <Button size="sm" onClick={handleSavePreEstimate} disabled={saveState === "saving"}>
                  {saveState === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : "保存"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditField(null)}>
                  取消
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="text-sm font-mono bg-blue-50 px-2 py-1 rounded flex-1">
                  {item.pre_estimate_value || "-"} {item.unit}
                </div>
                {!isLocked && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setPreEstimateValue(item.pre_estimate_value || item.consumption || "");
                      setEditField("pre_estimate");
                    }}
                  >
                    編輯
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* 確認用量 */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">確認用量（Marker Report / 樣衣實際）</label>
            {editField === "confirmed" ? (
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={confirmedValue}
                  onChange={(e) => setConfirmedValue(e.target.value)}
                  className="h-8 text-sm font-mono"
                  placeholder="輸入確認用量"
                  autoFocus
                />
                <Button size="sm" onClick={handleSaveConfirmed} disabled={saveState === "saving"}>
                  {saveState === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : "保存"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditField(null)}>
                  取消
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="text-sm font-mono bg-green-50 px-2 py-1 rounded flex-1">
                  {item.confirmed_value || "-"} {item.unit}
                </div>
                {!isLocked && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setConfirmedValue(item.confirmed_value || item.pre_estimate_value || item.consumption || "");
                      setEditField("confirmed");
                    }}
                  >
                    編輯
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* 鎖定用量 */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">鎖定用量（大貨確認後）</label>
            <div className="flex items-center gap-2">
              <div className="text-sm font-mono bg-amber-50 px-2 py-1 rounded flex-1">
                {item.locked_value ? (
                  <>
                    {item.locked_value} {item.unit}
                    <Lock className="h-3 w-3 inline ml-2 text-amber-600" />
                  </>
                ) : (
                  "-"
                )}
              </div>
              {!isLocked && item.confirmed_value && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleLock}
                  disabled={saveState === "saving"}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  {saveState === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : "鎖定"}
                </Button>
              )}
            </div>
            {!item.confirmed_value && !isLocked && (
              <p className="text-xs text-muted-foreground">需先確認用量才能鎖定</p>
            )}
          </div>

          {/* 狀態指示 */}
          <div className="border-t pt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {saveState === "saved" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              {saveState === "error" && <XCircle className="h-4 w-4 text-red-500" />}
              <span className="text-xs text-muted-foreground">
                當前狀態：{config.label}
              </span>
            </div>
            {item.consumption_history && item.consumption_history.length > 0 && (
              <Button size="sm" variant="ghost" className="text-xs">
                <History className="h-3 w-3 mr-1" />
                歷史 ({item.consumption_history.length})
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
