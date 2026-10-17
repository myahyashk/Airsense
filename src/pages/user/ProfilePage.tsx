import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, Trash2, Save, ShieldAlert, Check } from "lucide-react";
import { HeroCard } from "../../components/layout/HeroCard";
import { Card } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { api } from "../../services/api";

export const ProfilePage: React.FC = () => {
  const { user, refreshUser, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Profile Edit State
  const [name, setName] = useState<string>(user?.name || "");
  const [isUpdatingName, setIsUpdatingName] = useState<boolean>(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);

  // Account Deletion Modal State
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsUpdatingName(true);
    try {
      await api.updateMe({ name: name.trim() });
      await refreshUser();
      addToast({
        type: "success",
        title: "Profile Updated",
        message: "Your name has been updated successfully.",
      });
    } catch (err: any) {
      addToast({
        type: "danger",
        title: "Update Failed",
        message: err.message,
      });
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      addToast({
        type: "warning",
        title: "Password Too Short",
        message: "New password must be at least 8 characters long.",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast({
        type: "danger",
        title: "Passwords Mismatch",
        message: "New password and confirmation do not match.",
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      addToast({
        type: "success",
        title: "Password Changed",
        message: "Your password has been changed securely.",
      });
    } catch (err: any) {
      addToast({
        type: "danger",
        title: "Password Change Failed",
        message: err.message,
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await api.deleteAccount();
      addToast({
        type: "info",
        title: "Account Deleted",
        message: "Your account has been deleted permanently.",
      });
      logout();
      navigate("/login");
    } catch (err: any) {
      addToast({
        type: "danger",
        title: "Deletion Failed",
        message: err.message,
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="space-y-6">
      <HeroCard
        title="Personal Account Profile"
        description="Manage your account profile details, credentials, and authentication security."
        keyValueLabel="ROLE"
        keyValue={user?.role?.toUpperCase()}
        statusChipText="Verified Member"
        statusChipColor="blue"
      />

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Name and Email */}
        <Card className="p-6">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-[#4f9eff]" />
            <span>Profile Details</span>
          </h3>

          <form onSubmit={handleUpdateName} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                University Email Address (Read-only)
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ""}
                className="w-full bg-[#0b1626] border border-[#1d3b61] rounded-xl px-4 py-2.5 text-sm text-slate-400 font-mono cursor-not-allowed opacity-80"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#112338] border border-[#1d3b61] focus:border-[#4f9eff] rounded-xl px-4 py-2.5 text-sm text-white"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isUpdatingName}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#123a63] hover:bg-[#183252] border border-[#244b7a] text-white text-xs font-bold rounded-xl transition-all"
              >
                <Save className="w-4 h-4 text-[#4f9eff]" />
                <span>{isUpdatingName ? "Updating..." : "Save Name"}</span>
              </button>
            </div>
          </form>
        </Card>

        {/* Change Password */}
        <Card className="p-6">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#2ec4a6]" />
            <span>Security &amp; Password</span>
          </h3>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#112338] border border-[#1d3b61] focus:border-[#4f9eff] rounded-xl px-4 py-2.5 text-sm text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  New Password (min 8 chars)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#112338] border border-[#1d3b61] focus:border-[#4f9eff] rounded-xl px-4 py-2.5 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#112338] border border-[#1d3b61] focus:border-[#4f9eff] rounded-xl px-4 py-2.5 text-sm text-white"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isChangingPassword}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#123a63] hover:bg-[#183252] border border-[#244b7a] text-white text-xs font-bold rounded-xl transition-all"
              >
                <Lock className="w-4 h-4 text-[#2ec4a6]" />
                <span>{isChangingPassword ? "Changing..." : "Change Password"}</span>
              </button>
            </div>
          </form>
        </Card>

        {/* Danger Zone: Account Deletion */}
        <Card className="p-6 border-[#881337]/50 bg-[#881337]/10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-rose-300 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-[#ef4444]" />
                <span>Danger Zone: Delete Account</span>
              </h4>
              <p className="text-xs text-slate-400">
                Permanently delete your account and personal preferences from the campus database.
              </p>
            </div>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 bg-[#ef4444] hover:bg-[#dc2626] text-white text-xs font-bold rounded-xl transition-all shadow-md flex-shrink-0"
            >
              Delete My Account
            </button>
          </div>
        </Card>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        title="Confirm Account Deletion"
        description="Are you absolutely sure you want to permanently delete your AirSense user account? This action cannot be undone."
        confirmLabel="Yes, Delete My Account"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </div>
  );
};
