import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { WalletConnectionStatus } from "@/lib/identity/wallets/phantom";

interface WalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnectPhantom: () => void;
  onInstallPhantom: () => void;
  status: WalletConnectionStatus;
  isAuthenticating: boolean;
}

export function WalletConnectionDialog({
  open,
  onOpenChange,
  onConnectPhantom,
  onInstallPhantom,
  status,
  isAuthenticating,
}: WalletDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-neutral-800 bg-black text-white">
        <DialogHeader>
          <DialogTitle className="text-xl">Connect Wallet</DialogTitle>
          <DialogDescription className="text-neutral-400">
            {status === WalletConnectionStatus.NotDetected
              ? "Phantom wallet not detected. Please install it to continue."
              : "Choose a wallet connection method to continue"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {status !== WalletConnectionStatus.NotDetected ? (
            <Button
              onClick={onConnectPhantom}
              disabled={isAuthenticating}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {isAuthenticating ? "Connecting..." : "Connect Phantom Wallet"}
            </Button>
          ) : (
            <Button
              onClick={onInstallPhantom}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              Install Phantom Wallet
            </Button>
          )}
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between text-xs text-neutral-500">
          <p>Phantom wallet is required to use OpChan's features</p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 