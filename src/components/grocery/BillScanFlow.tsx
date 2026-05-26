import { forwardRef, useImperativeHandle, useState } from "react";
import { AIPantryImportDialog } from "./AIPantryImportDialog";
import { ScanBillDialog, type ScannedBill } from "./ScanBillDialog";
import { BillReviewDialog } from "./BillReviewDialog";
import type { PantryItem } from "@/hooks/usePantryItems";

export interface BillScanFlowHandle {
  openScan: () => void;
  openAIImport: () => void;
}

interface BillScanFlowProps {
  householdId: string;
  userId: string;
  pantryItems: PantryItem[];
  onAIImport: (items: Partial<PantryItem>[]) => void;
  onSaveScannedBill: (args: {
    inserts: Array<Partial<PantryItem>>;
    merges: Array<{ id: string; quantity: number }>;
    billDate: string | null;
  }) => Promise<void>;
}

export const BillScanFlow = forwardRef<BillScanFlowHandle, BillScanFlowProps>(
  ({ householdId, userId, pantryItems, onAIImport, onSaveScannedBill }, ref) => {
    const [showScanBill, setShowScanBill] = useState(false);
    const [showAIImport, setShowAIImport] = useState(false);
    const [scannedBill, setScannedBill] = useState<ScannedBill | null>(null);
    const [isSavingBill, setIsSavingBill] = useState(false);

    useImperativeHandle(
      ref,
      () => ({
        openScan: () => setShowScanBill(true),
        openAIImport: () => setShowAIImport(true),
      }),
      [],
    );

    const handleConfirm = async (args: {
      inserts: Array<Partial<PantryItem>>;
      merges: Array<{ id: string; quantity: number }>;
      billDate: string | null;
    }) => {
      setIsSavingBill(true);
      try {
        await onSaveScannedBill(args);
        setScannedBill(null);
      } finally {
        setIsSavingBill(false);
      }
    };

    return (
      <>
        <AIPantryImportDialog
          open={showAIImport}
          onOpenChange={setShowAIImport}
          onItemsExtracted={onAIImport}
          householdId={householdId}
          userId={userId}
        />

        <ScanBillDialog
          open={showScanBill}
          onOpenChange={setShowScanBill}
          householdId={householdId}
          onScanned={(bill) => setScannedBill(bill)}
        />

        <BillReviewDialog
          open={!!scannedBill}
          onOpenChange={(o) => {
            if (!o) setScannedBill(null);
          }}
          bill={scannedBill}
          pantryItems={pantryItems}
          onConfirm={handleConfirm}
          isSaving={isSavingBill}
        />
      </>
    );
  },
);

BillScanFlow.displayName = "BillScanFlow";