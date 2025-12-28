"use client";

import { useState, useEffect, useRef } from "react";
import { useUpdateBOMItem } from "@/lib/hooks/useBom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { BOMItem } from "@/lib/types/bom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface EditableConsumptionCellProps {
  item: BOMItem;
  revisionId: string;
}

export function EditableConsumptionCell({ item, revisionId }: EditableConsumptionCellProps) {
  const [value, setValue] = useState(item.consumption);
  const [isEditing, setIsEditing] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateMutation = useUpdateBOMItem(revisionId);

  // Debounced save
  useEffect(() => {
    if (value !== item.consumption && !isEditing) {
      // Clear previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        handleSave(value);
      }, 800); // 800ms debounce
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, isEditing]);

  const handleSave = async (newValue: string) => {
    // Validate
    const numValue = parseFloat(newValue);
    if (isNaN(numValue) || numValue < 0) {
      setSaveState("error");
      setValue(item.consumption); // Rollback
      setTimeout(() => setSaveState("idle"), 2000);
      return;
    }

    setSaveState("saving");

    try {
      await updateMutation.mutateAsync({
        itemId: item.id,
        data: { consumption: newValue },
      });
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (error) {
      setSaveState("error");
      setValue(item.consumption); // Rollback on error
      setTimeout(() => setSaveState("idle"), 2000);
    }
  };

  const handleFocus = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      inputRef.current?.blur();
    }
    if (e.key === "Escape") {
      setValue(item.consumption);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-20 h-8 text-sm"
      />

      {/* Save State Indicator */}
      {saveState === "saving" && (
        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      )}
      {saveState === "saved" && (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      )}
      {saveState === "error" && (
        <XCircle className="h-4 w-4 text-red-500" />
      )}

      {/* Maturity Badge */}
      <Badge
        variant={
          item.consumption_maturity === "locked"
            ? "default"
            : item.consumption_maturity === "confirmed"
            ? "secondary"
            : "outline"
        }
        className="text-xs ml-1"
      >
        {item.consumption_maturity_display}
      </Badge>
    </div>
  );
}
