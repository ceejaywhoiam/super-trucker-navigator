const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from "react";
import {
  User as UserIcon,
  Mail,
  Shield,
  LogOut,
  Trash2,
  AlertTriangle,
  Loader2,
  Info,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Account() {
  const { user, logout } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState("");

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteNotice("");
    try {
      // Account deletion runs as a backend function (deleteMyAccount) which
      // requires a Builder+ plan. If it isn't deployed, fall back to a clear
      // notice so the user knows how to complete removal.
      const { base44 } = await import("@/api/base44Client");
      await db.functions.invoke("deleteMyAccount", {});
      logout(true);
    } catch (e) {
      setDeleteNotice(
        "Self-service account deletion isn't available on this plan. Please contact support to permanently remove your account."
      );
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
            <UserIcon className="w-6 h-6 text-black" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-white truncate">
              {user?.full_name || "Trucker"}
            </p>
            <p className="text-sm text-zinc-400 truncate">{user?.email}</p>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-zinc-300">
            <Mail className="w-4 h-4 text-zinc-500 shrink-0" />
            <span className="truncate">{user?.email}</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-300 capitalize">
            <Shield className="w-4 h-4 text-zinc-500 shrink-0" />
            <span>{user?.role || "user"}</span>
          </div>
        </div>
      </div>

      <Button
        onClick={() => logout(true)}
        variant="outline"
        className="w-full border-white/10 text-white hover:bg-white/5 min-h-[48px]"
      >
        <LogOut className="w-4 h-4" />
        <span className="ml-2">Sign out</span>
      </Button>

      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5">
        <h3 className="font-semibold text-rose-300 flex items-center gap-2 mb-1">
          <AlertTriangle className="w-4 h-4" /> Delete account
        </h3>
        <p className="text-sm text-zinc-400 mb-3">
          Permanently remove your account and all associated data. This cannot be undone.
        </p>
        {deleteNotice && (
          <div className="flex items-start gap-2 text-sm text-amber-300 mb-3">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{deleteNotice}</span>
          </div>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              className="w-full min-h-[48px]"
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              <span className="ml-2">{deleting ? "Deleting…" : "Delete my account"}</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-zinc-900 border-white/10 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete account permanently?</AlertDialogTitle>
              <AlertDialogDescription className="text-zinc-400">
                This will permanently remove your account and all your data. This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                className="border-white/10 text-white"
                disabled={deleting}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-rose-600 hover:bg-rose-500"
              >
                {deleting ? "Deleting…" : "Yes, delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}