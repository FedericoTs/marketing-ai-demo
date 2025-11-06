"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, CreditCard, Users, DollarSign, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactCount: number;
  costPerContact: number;
  totalCost: number;
  margin: number;
  filters: any;
  audienceName?: string;
}

type PurchaseStage =
  | "confirm"
  | "processing"
  | "success"
  | "error";

export function PurchaseModal({
  isOpen,
  onClose,
  contactCount,
  costPerContact,
  totalCost,
  margin,
  filters,
  audienceName,
}: PurchaseModalProps) {
  const [stage, setStage] = useState<PurchaseStage>("confirm");
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [recipientListId, setRecipientListId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [actualImportedCount, setActualImportedCount] = useState<number | null>(null);
  const [isMockData, setIsMockData] = useState(false);

  // Fetch current credit balance
  useEffect(() => {
    if (isOpen) {
      fetchCreditBalance();
    }
  }, [isOpen]);

  const fetchCreditBalance = async () => {
    try {
      setLoadingBalance(true);
      const response = await fetch("/api/organization/credits");

      if (!response.ok) {
        throw new Error("Failed to fetch credit balance");
      }

      const data = await response.json();
      setCreditBalance(data.credits);
    } catch (error) {
      console.error("Error fetching credit balance:", error);
      toast.error("Failed to load credit balance");
      setCreditBalance(0);
    } finally {
      setLoadingBalance(false);
    }
  };

  const handlePurchase = async () => {
    // Validate sufficient credits
    if (creditBalance !== null && creditBalance < totalCost) {
      toast.error("Insufficient credits. Please purchase more credits.");
      return;
    }

    setStage("processing");
    setProgress(0);

    try {
      // Stage 1: Initiating purchase
      setProgress(25);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Stage 2: Fetching contacts from Data Axle
      setProgress(50);

      const requestBody = {
        filters,
        maxContacts: contactCount,
        audienceName: audienceName || `Audience - ${new Date().toLocaleDateString()}`,
      };

      console.log('[Purchase Modal] Sending request:', requestBody);

      const purchaseResponse = await fetch("/api/audience/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!purchaseResponse.ok) {
        const errorData = await purchaseResponse.json();
        console.error('[Purchase Modal] API error:', errorData);
        const errorMessage = errorData.details
          ? `${errorData.error}: ${errorData.details}`
          : errorData.error || "Purchase failed";
        throw new Error(errorMessage);
      }

      const purchaseData = await purchaseResponse.json();
      setRecipientListId(purchaseData.recipientListId);
      setActualImportedCount(purchaseData.actualContactsImported || purchaseData.contactCount);
      setIsMockData(purchaseData.isMockData || false);

      // Stage 3: Deducting credits
      setProgress(75);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Stage 4: Complete
      setProgress(100);
      await new Promise(resolve => setTimeout(resolve, 300));

      setStage("success");

      // Show appropriate success message
      const successMessage = purchaseData.isMockData
        ? `Mock purchase complete: ${purchaseData.actualContactsImported.toLocaleString()} sample contacts generated!`
        : `Successfully purchased ${purchaseData.contactCount.toLocaleString()} contacts!`;

      toast.success(successMessage);

      // Refresh credit balance
      fetchCreditBalance();
    } catch (error: any) {
      console.error("Purchase error:", error);
      setErrorMessage(error.message || "An unexpected error occurred");
      setStage("error");
      toast.error("Purchase failed");
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setStage("confirm");
    setProgress(0);
    setErrorMessage("");
    setRecipientListId(null);
    setActualImportedCount(null);
    setIsMockData(false);
    onClose();
  };

  const handleRetry = () => {
    setStage("confirm");
    setErrorMessage("");
    setProgress(0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const remainingCredits = creditBalance !== null ? creditBalance - totalCost : 0;
  const hasSufficientCredits = remainingCredits >= 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {stage === "confirm" && "Confirm Contact Purchase"}
            {stage === "processing" && "Processing Purchase..."}
            {stage === "success" && "Purchase Successful!"}
            {stage === "error" && "Purchase Failed"}
          </DialogTitle>
          <DialogDescription>
            {stage === "confirm" && "Review your purchase details below"}
            {stage === "processing" && "Please wait while we process your request"}
            {stage === "success" && "Your contacts have been added to a new recipient list"}
            {stage === "error" && "An error occurred during the purchase"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Confirmation Stage */}
          {stage === "confirm" && (
            <>
              {/* Credit Balance */}
              <div className={cn(
                "rounded-lg p-4 border-2",
                hasSufficientCredits
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className={cn(
                      "h-5 w-5",
                      hasSufficientCredits ? "text-green-600" : "text-red-600"
                    )} />
                    <span className="font-medium text-slate-700">Current Balance</span>
                  </div>
                  {loadingBalance ? (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  ) : (
                    <span className={cn(
                      "text-lg font-bold",
                      hasSufficientCredits ? "text-green-700" : "text-red-700"
                    )}>
                      {formatCurrency(creditBalance || 0)}
                    </span>
                  )}
                </div>
              </div>

              {/* Purchase Summary */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                <h4 className="text-sm font-semibold text-slate-700">Purchase Summary</h4>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">Contacts</span>
                  </div>
                  <span className="font-medium text-slate-900">
                    {contactCount.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-600">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-sm">Cost per Contact</span>
                  </div>
                  <span className="font-medium text-slate-900">
                    {formatCurrency(costPerContact)}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">Total Cost</span>
                    <span className="text-lg font-bold text-slate-900">
                      {formatCurrency(totalCost)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600">Remaining Credits</span>
                    <span className={cn(
                      "font-semibold",
                      hasSufficientCredits ? "text-green-700" : "text-red-700"
                    )}>
                      {formatCurrency(Math.max(0, remainingCredits))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Warning if insufficient credits */}
              {!hasSufficientCredits && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-700">
                    <p className="font-medium">Insufficient Credits</p>
                    <p className="text-red-600">
                      You need {formatCurrency(totalCost - (creditBalance || 0))} more credits to complete this purchase.
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePurchase}
                  disabled={!hasSufficientCredits || loadingBalance}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {loadingBalance ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Confirm Purchase"
                  )}
                </Button>
              </div>
            </>
          )}

          {/* Processing Stage */}
          {stage === "processing" && (
            <div className="py-6 space-y-4">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                <div className="w-full">
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-slate-600 text-center mt-2">
                    {progress < 30 && "Initiating purchase..."}
                    {progress >= 30 && progress < 60 && "Fetching contacts from Data Axle..."}
                    {progress >= 60 && progress < 90 && "Deducting credits..."}
                    {progress >= 90 && "Finalizing..."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success Stage */}
          {stage === "success" && (
            <div className="py-6 space-y-4">
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-full bg-green-100 p-3">
                  <CheckCircle2 className="h-12 w-12 text-green-600" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">
                    Purchase Complete!
                  </h3>
                  <p className="text-sm text-slate-600">
                    {actualImportedCount?.toLocaleString() || contactCount.toLocaleString()} contacts have been added to your recipient list
                  </p>
                  {isMockData && (
                    <p className="text-xs text-orange-600 mt-1">
                      Testing mode: Sample data generated for {contactCount.toLocaleString()} contact purchase
                    </p>
                  )}
                </div>

                <div className="w-full rounded-lg bg-green-50 border border-green-200 p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Credits Used</span>
                    <span className="font-medium text-slate-900">{formatCurrency(totalCost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Remaining Balance</span>
                    <span className="font-semibold text-green-700">
                      {formatCurrency(creditBalance || 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                >
                  Close
                </Button>
                {recipientListId && (
                  <Button
                    onClick={() => window.location.href = '/templates'}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    Design Mailer
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Error Stage */}
          {stage === "error" && (
            <div className="py-6 space-y-4">
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-full bg-red-100 p-3">
                  <XCircle className="h-12 w-12 text-red-600" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">
                    Purchase Failed
                  </h3>
                  <p className="text-sm text-slate-600">
                    {errorMessage || "An unexpected error occurred"}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRetry}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
