import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Truck,
  Upload,
  Eye,
  Trash2,
  RefreshCw,
  Loader2,
  X,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type DocType = "invoice" | "eway_bill" | "delivery_challan";

interface SaleDocumentManagerProps {
  orderId: string;
  invoiceUrl: string | null;
  ewayBillUrl: string | null;
  deliveryChallanUrl: string | null;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const SaleDocumentManager = ({
  orderId,
  invoiceUrl,
  ewayBillUrl,
  deliveryChallanUrl,
}: SaleDocumentManagerProps) => {
  const [uploading, setUploading] = useState<DocType | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [deleteDoc, setDeleteDoc] = useState<DocType | null>(null);
  const [deleting, setDeleting] = useState(false);
  const invoiceInputRef = useRef<HTMLInputElement>(null);
  const ewayInputRef = useRef<HTMLInputElement>(null);
  const challanInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const getStoragePath = (type: DocType) =>
    `${type}/${type}_${orderId}.pdf`;

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage
      .from("sale-documents")
      .getPublicUrl(path);
    return data.publicUrl;
  };

  const handleUpload = async (file: File, type: DocType) => {
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are allowed");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size must be under 10 MB");
      return;
    }

    setUploading(type);
    try {
      const path = getStoragePath(type);

      // Remove existing file first (upsert)
      await supabase.storage.from("sale-documents").remove([path]);

      const { error: uploadError } = await supabase.storage
        .from("sale-documents")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const publicUrl = getPublicUrl(path);
      const column = type === "invoice" ? "invoice_url" : "eway_bill_url";

      const { error: dbError } = await supabase
        .from("sales")
        .update({ [column]: publicUrl })
        .eq("order_id", orderId);

      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ["all-sales"] });
      queryClient.invalidateQueries({ queryKey: ["current-month-sales"] });
      toast.success(
        `${type === "invoice" ? "Invoice" : "E-Way Bill"} uploaded successfully`
      );
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteDoc) return;
    setDeleting(true);
    try {
      const path = getStoragePath(deleteDoc);
      await supabase.storage.from("sale-documents").remove([path]);

      const column =
        deleteDoc === "invoice" ? "invoice_url" : "eway_bill_url";
      await supabase
        .from("sales")
        .update({ [column]: null })
        .eq("order_id", orderId);

      queryClient.invalidateQueries({ queryKey: ["all-sales"] });
      queryClient.invalidateQueries({ queryKey: ["current-month-sales"] });
      toast.success(
        `${deleteDoc === "invoice" ? "Invoice" : "E-Way Bill"} deleted`
      );
    } catch (err: any) {
      toast.error(`Delete failed: ${err.message}`);
    } finally {
      setDeleting(false);
      setDeleteDoc(null);
    }
  };

  const handleView = (url: string, title: string) => {
    // Add cache-busting timestamp
    setPreviewUrl(`${url}?t=${Date.now()}`);
    setPreviewTitle(title);
  };

  const renderDocSection = (
    type: DocType,
    label: string,
    icon: React.ReactNode,
    url: string | null,
    inputRef: React.RefObject<HTMLInputElement>
  ) => (
    <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">
            {url ? "File uploaded ✓" : "No file uploaded"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {url ? (
          <>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => handleView(url, `${label} — ${orderId}`)}
            >
              <Eye className="h-3.5 w-3.5" /> View
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => inputRef.current?.click()}
              disabled={uploading === type}
            >
              {uploading === type ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Replace
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs text-destructive hover:bg-destructive/10"
              onClick={() => setDeleteDoc(type)}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => inputRef.current?.click()}
            disabled={uploading === type}
          >
            {uploading === type ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            Upload PDF
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file, type);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );

  return (
    <>
      <div className="space-y-3">
        {renderDocSection(
          "invoice",
          "Invoice PDF",
          <FileText className="h-5 w-5 text-primary" />,
          invoiceUrl,
          invoiceInputRef as React.RefObject<HTMLInputElement>
        )}
        {renderDocSection(
          "eway_bill",
          "E-Way Bill PDF",
          <Truck className="h-5 w-5 text-primary" />,
          ewayBillUrl,
          ewayInputRef as React.RefObject<HTMLInputElement>
        )}
      </div>

      {/* PDF Preview Dialog */}
      <Dialog
        open={!!previewUrl}
        onOpenChange={(open) => !open && setPreviewUrl(null)}
      >
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {previewTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 px-6 pb-6">
            {previewUrl && (
              <iframe
                src={previewUrl}
                className="w-full h-full rounded-lg border border-border"
                title="PDF Preview"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDoc} onOpenChange={() => setDeleteDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this{" "}
              {deleteDoc === "invoice" ? "invoice" : "e-way bill"}? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
