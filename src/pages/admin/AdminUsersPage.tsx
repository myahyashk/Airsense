import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  Key,
  Trash2,
  UserCheck,
  UserX,
  Shield,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
} from "lucide-react";
import { HeroCard } from "../../components/layout/HeroCard";
import { Card } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";
import { api } from "../../services/api";
import { AdminUser } from "../../services/types";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export const AdminUsersPage: React.FC = () => {
  const { user: currentAdmin } = useAuth();
  const { addToast } = useToast();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const [tempPasswordModal, setTempPasswordModal] = useState<{
    user: AdminUser;
    tempPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminUsers(search, page, 10);
      setUsers(data.items);
      setTotal(data.total);
    } catch (err: any) {
      addToast({ type: "danger", title: "Error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  const handleToggleRole = async (targetUser: AdminUser) => {
    if (targetUser.id === currentAdmin?.id) {
      addToast({
        type: "warning",
        title: "Action Prohibited",
        message: "You cannot change the role of your own admin account.",
      });
      return;
    }

    const nextRole = targetUser.role === "admin" ? "user" : "admin";
    try {
      await api.updateAdminUser(targetUser.id, { role: nextRole });
      addToast({
        type: "success",
        title: "Role Updated",
        message: `User ${targetUser.email} role changed to ${nextRole}.`,
      });
      fetchUsers();
    } catch (err: any) {
      addToast({ type: "danger", title: "Update Failed", message: err.message });
    }
  };

  const handleToggleActive = async (targetUser: AdminUser) => {
    if (targetUser.id === currentAdmin?.id) {
      addToast({
        type: "warning",
        title: "Action Prohibited",
        message: "You cannot deactivate your own admin account.",
      });
      return;
    }

    try {
      await api.updateAdminUser(targetUser.id, { active: !targetUser.active });
      addToast({
        type: "info",
        title: "Status Updated",
        message: `Account for ${targetUser.email} is now ${!targetUser.active ? "Active" : "Deactivated"}.`,
      });
      fetchUsers();
    } catch (err: any) {
      addToast({ type: "danger", title: "Update Failed", message: err.message });
    }
  };

  const handleResetPassword = async (targetUser: AdminUser) => {
    try {
      const res = await api.resetUserPassword(targetUser.id);
      setTempPasswordModal({ user: targetUser, tempPassword: res.temporary_password });
      setCopied(false);
    } catch (err: any) {
      addToast({ type: "danger", title: "Reset Failed", message: err.message });
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.deleteAdminUser(deleteTarget.id);
      addToast({
        type: "success",
        title: "User Deleted",
        message: `Account for ${deleteTarget.email} was removed.`,
      });
      setDeleteTarget(null);
      fetchUsers();
    } catch (err: any) {
      addToast({ type: "danger", title: "Deletion Failed", message: err.message });
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = () => {
    if (tempPasswordModal?.tempPassword) {
      navigator.clipboard.writeText(tempPasswordModal.tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const totalPages = Math.ceil(total / 10) || 1;

  return (
    <div className="space-y-6">
      <HeroCard
        title="Campus User &amp; Role Management"
        description="Search, promote, deactivate, reset passwords, or delete university accounts. Role changes and security operations are audited in real time."
        keyValueLabel="TOTAL REGISTERED"
        keyValue={total}
        statusChipText="RBAC Enforced"
        statusChipColor="teal"
      />

      {/* Search and Action Bar */}
      <Card className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-[#0b1626] border border-[#1d3b61] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-[#4f9eff]"
          />
        </div>

        <div className="text-xs text-slate-400">
          Showing {users.length} of {total} campus accounts
        </div>
      </Card>

      {/* Users Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0b1626] text-slate-400 uppercase tracking-wider font-semibold border-b border-[#1d3b61]">
              <tr>
                <th className="py-3.5 px-5">User</th>
                <th className="py-3.5 px-5">Role</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5">Joined</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1d3b61]/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Loading accounts...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No matching accounts found.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isCurrent = u.id === currentAdmin?.id;
                  return (
                    <tr key={u.id} className="hover:bg-[#152c46]/50 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="font-semibold text-white flex items-center gap-2">
                          <span>{u.name}</span>
                          {isCurrent && (
                            <span className="text-[10px] bg-[#123a63] text-[#4f9eff] px-1.5 py-0.2 rounded font-normal">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-slate-400 font-mono text-[11px]">{u.email}</div>
                      </td>

                      <td className="py-3.5 px-5">
                        <button
                          onClick={() => handleToggleRole(u)}
                          disabled={isCurrent}
                          title={isCurrent ? "Cannot demote your own account" : "Click to toggle role"}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all border ${
                            u.role === "admin"
                              ? "bg-[#4f9eff]/20 text-[#4f9eff] border-[#4f9eff]/40 hover:bg-[#4f9eff]/30"
                              : "bg-[#2ec4a6]/15 text-[#2ec4a6] border-[#2ec4a6]/30 hover:bg-[#2ec4a6]/25"
                          } ${isCurrent ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}
                        >
                          <Shield className="w-3 h-3" />
                          <span>{u.role}</span>
                        </button>
                      </td>

                      <td className="py-3.5 px-5">
                        <button
                          onClick={() => handleToggleActive(u)}
                          disabled={isCurrent}
                          title={isCurrent ? "Cannot deactivate own account" : "Click to toggle active status"}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                            u.active
                              ? "bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30 hover:bg-[#10b981]/25"
                              : "bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/30 hover:bg-[#ef4444]/25"
                          } ${isCurrent ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}
                        >
                          {u.active ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                          <span>{u.active ? "Active" : "Disabled"}</span>
                        </button>
                      </td>

                      <td className="py-3.5 px-5 text-slate-400 font-mono">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleResetPassword(u)}
                            className="p-1.5 text-slate-400 hover:text-[#4f9eff] hover:bg-[#112338] rounded-lg transition-colors"
                            title="Reset password to temporary value"
                          >
                            <Key className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setDeleteTarget(u)}
                            disabled={isCurrent}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isCurrent
                                ? "text-slate-600 cursor-not-allowed"
                                : "text-slate-400 hover:text-[#ef4444] hover:bg-[#112338]"
                            }`}
                            title={isCurrent ? "Cannot delete own account" : "Delete account"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-[#0b1626] border-t border-[#1d3b61] flex items-center justify-between text-xs text-slate-400">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-[#1d3b61] hover:bg-[#112338] disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-[#1d3b61] hover:bg-[#112338] disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>

      {/* Temporary Password Modal */}
      <Modal
        isOpen={!!tempPasswordModal}
        onClose={() => setTempPasswordModal(null)}
        title="Temporary Password Generated"
        confirmLabel="Done"
        onConfirm={() => setTempPasswordModal(null)}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            A temporary password has been set for account{" "}
            <strong className="text-white">{tempPasswordModal?.user.email}</strong>. Please provide it to the user.
          </p>

          <div className="flex items-center justify-between bg-[#0b1626] border border-[#1d3b61] rounded-xl p-3">
            <code className="text-sm font-bold text-[#2ec4a6] tracking-wider">
              {tempPasswordModal?.tempPassword}
            </code>
            <button
              onClick={copyToClipboard}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-[#10b981]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteUser}
        title="Delete Campus Account"
        description={`Are you sure you want to permanently delete the account for ${deleteTarget?.name} (${deleteTarget?.email})? This action cannot be reversed.`}
        confirmLabel="Yes, Delete User"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </div>
  );
};
