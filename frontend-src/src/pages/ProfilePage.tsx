import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  User,
  Lock,
  Shield,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  QrCode,
} from "lucide-react";
import { useAuthStore } from "@/shared/lib/auth-store";
import { useThemeStore } from "@/shared/lib/theme-store";
import {
  useMfaSetup,
  useMfaEnable,
  useMfaDisable,
  useCurrentUser,
  useUpdateProfile,
} from "@/hooks/api";
import apiClient from "@/shared/lib/api-client";

const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: z.string().min(8, "Must be at least 8 characters"),
    confirm_password: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

export default function ProfilePage() {
  const dark = useThemeStore((s) => s.dark);
  const user = useAuthStore((s) => s.user);
  const { data: freshUser } = useCurrentUser();
  const [tab, setTab] = useState<"profile" | "password" | "mfa">("profile");

  const mfaEnabled = freshUser?.mfa_enabled ?? user?.mfa_enabled ?? false;
  const mfaEnforced = freshUser?.mfa_enforced ?? user?.mfa_enforced ?? false;

  const tabs: { key: typeof tab; label: string; icon: React.ElementType }[] = [
    { key: "profile", label: "Profile", icon: User },
    { key: "password", label: "Password", icon: Lock },
    { key: "mfa", label: "MFA", icon: Shield },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold ${
            dark
              ? "bg-blue-900/30 text-blue-400"
              : "bg-blue-100 text-blue-700"
          }`}
        >
          {(user?.display_name ?? user?.email ?? "U")[0].toUpperCase()}
        </div>
        <div>
          <h2 className={`text-xl font-semibold ${dark ? "text-white" : "text-gray-900"}`}>
            {user?.display_name}
          </h2>
          <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
            {user?.email}
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className={`flex gap-1 rounded-lg p-1 ${dark ? "bg-gray-800" : "bg-gray-100"}`}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-blue-600 text-white shadow"
                : dark
                ? "text-gray-400 hover:text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" && <ProfileTab />}
      {tab === "password" && <PasswordTab />}
      {tab === "mfa" && <MFATab mfaEnabled={mfaEnabled} mfaEnforced={mfaEnforced} />}
    </div>
  );
}

function ProfileTab() {
  const dark = useThemeStore((s) => s.dark);
  const user = useAuthStore((s) => s.user);
  const updateProfileStore = useAuthStore((s) => s.updateProfile);
  const updateProfile = useUpdateProfile();
  const [editing, setEditing] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");

  const handleSave = async () => {
    setError("");
    setSuccess("");
    if (!displayName.trim()) {
      setError("Display name is required");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Valid email is required");
      return;
    }
    try {
      const updated = await updateProfile.mutateAsync({
        display_name: displayName.trim(),
        email: email.trim(),
      });
      updateProfileStore(updated);
      setSuccess("Profile updated successfully");
      setEditing(false);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to update profile");
    }
  };

  const handleCancel = () => {
    setDisplayName(user?.display_name ?? "");
    setEmail(user?.email ?? "");
    setEditing(false);
    setError("");
  };

  const inputClass = `w-full rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
    dark ? "border-gray-600 bg-gray-700 text-white" : "border-gray-300"
  }`;
  const labelClass = `mb-1 block text-sm font-medium ${
    dark ? "text-gray-300" : "text-gray-700"
  }`;

  return (
    <div
      className={`rounded-lg border p-6 ${
        dark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className={`text-base font-semibold ${dark ? "text-white" : "text-gray-900"}`}>
          Account Information
        </h3>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Edit Profile
          </button>
        )}
      </div>

      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          <CheckCircle className="h-4 w-4" />
          {success}
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {editing ? (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Display Name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={inputClass}
              placeholder="Your display name"
            />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className={labelClass}>Role</label>
            <input
              disabled
              value={user?.role === "admin" ? "Administrator" : "Read Only"}
              className={`${inputClass} opacity-60 cursor-not-allowed`}
            />
            <p className={`mt-1 text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>
              Contact an administrator to change your role
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={updateProfile.isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {updateProfile.isPending ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={handleCancel}
              className={`rounded-md border px-4 py-2 text-sm font-medium ${
                dark
                  ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {[
            { label: "Display Name", value: user?.display_name },
            { label: "Email", value: user?.email },
            { label: "Role", value: user?.role === "admin" ? "Administrator" : "Read Only" },
            { label: "Tenant ID", value: user?.tenant_id?.slice(0, 8) + "..." },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <span className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
                {item.label}
              </span>
              <span className={`text-sm font-medium ${dark ? "text-white" : "text-gray-900"}`}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PasswordTab() {
  const dark = useThemeStore((s) => s.dark);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError: setFormError,
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async (data: ChangePasswordForm) => {
    setError("");
    setSuccess(false);
    try {
      await apiClient.post(`/auth/change-password`, {
        current_password: data.current_password,
        new_password: data.new_password,
      });
      setSuccess(true);
      reset();
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || "Failed to change password. Please try again.";
      setError(msg);
    }
  };

  const inputClass = `w-full rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
    dark ? "border-gray-600 bg-gray-700 text-white" : "border-gray-300"
  }`;
  const labelClass = `mb-1 block text-sm font-medium ${
    dark ? "text-gray-300" : "text-gray-700"
  }`;

  return (
    <div
      className={`rounded-lg border p-6 ${
        dark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"
      }`}
    >
      <h3 className={`mb-4 text-base font-semibold ${dark ? "text-white" : "text-gray-900"}`}>
        Change Password
      </h3>

      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          <CheckCircle className="h-4 w-4" />
          Password changed successfully.
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className={labelClass}>Current Password</label>
          <div className="relative">
            <input
              {...register("current_password")}
              type={showCurrent ? "text" : "password"}
              className={inputClass}
              placeholder="Enter current password"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.current_password && (
            <p className="mt-1 text-xs text-red-600">{errors.current_password.message}</p>
          )}
        </div>

        <div>
          <label className={labelClass}>New Password</label>
          <div className="relative">
            <input
              {...register("new_password")}
              type={showNew ? "text" : "password"}
              className={inputClass}
              placeholder="Minimum 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.new_password && (
            <p className="mt-1 text-xs text-red-600">{errors.new_password.message}</p>
          )}
        </div>

        <div>
          <label className={labelClass}>Confirm New Password</label>
          <div className="relative">
            <input
              {...register("confirm_password")}
              type={showConfirm ? "text" : "password"}
              className={inputClass}
              placeholder="Re-enter new password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirm_password && (
            <p className="mt-1 text-xs text-red-600">{errors.confirm_password.message}</p>
          )}
        </div>

        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Change Password
        </button>
      </form>
    </div>
  );
}

function MFATab({
  mfaEnabled,
  mfaEnforced,
}: {
  mfaEnabled: boolean;
  mfaEnforced: boolean;
}) {
  const dark = useThemeStore((s) => s.dark);
  const [setupData, setSetupData] = useState<any>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const mfaSetup = useMfaSetup();
  const mfaEnable = useMfaEnable();
  const mfaDisable = useMfaDisable();

  const handleSetup = async () => {
    setError("");
    try {
      const data = await mfaSetup.mutateAsync();
      setSetupData(data);
    } catch {
      setError("Failed to initiate MFA setup.");
    }
  };

  const handleEnable = async () => {
    if (!setupData || !verifyCode) return;
    setError("");
    setSuccess("");
    try {
      await mfaEnable.mutateAsync({ token: "unused", code: verifyCode });
      setSuccess("MFA enabled successfully!");
      setSetupData(null);
      setVerifyCode("");
    } catch {
      setError("Invalid code. Please try again.");
    }
  };

  const handleDisable = async () => {
    if (!disableCode) return;
    setError("");
    setSuccess("");
    try {
      await mfaDisable.mutateAsync({ code: disableCode });
      setSuccess("MFA disabled successfully.");
      setDisableCode("");
    } catch {
      setError("Failed to disable MFA. Check your code and try again.");
    }
  };

  return (
    <div
      className={`rounded-lg border p-6 ${
        dark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"
      }`}
    >
      <h3 className={`mb-2 text-base font-semibold ${dark ? "text-white" : "text-gray-900"}`}>
        Multi-Factor Authentication
      </h3>
      <p className={`mb-4 text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
        Add an extra layer of security to your account by enabling MFA.
      </p>

      {mfaEnforced && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <AlertCircle className="h-4 w-4" />
          MFA is required by your administrator. You cannot disable it.
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          <CheckCircle className="h-4 w-4" />
          {success}
        </div>
      )}

      {/* Current status */}
      <div className="mb-6 flex items-center gap-3">
        <span className={`text-sm ${dark ? "text-gray-300" : "text-gray-700"}`}>
          Status:
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            mfaEnabled
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
              : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
          }`}
        >
          {mfaEnabled ? "Enabled" : "Disabled"}
        </span>
      </div>

      {/* Setup flow */}
      {setupData && (
        <div className="mb-6 space-y-4 rounded-md border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className={`text-sm font-medium ${dark ? "text-white" : "text-gray-900"}`}>
              Scan this QR code with your authenticator app
            </span>
          </div>
          <img
            src={setupData.qr_code_url}
            alt="MFA QR Code"
            className="h-48 w-48 rounded-md border bg-white p-2"
          />
          <div>
            <label className={`mb-1 block text-sm font-medium ${dark ? "text-gray-300" : "text-gray-700"}`}>
              Or enter this secret manually:
            </label>
            <code
              className={`block rounded-md px-3 py-2 text-sm font-mono ${
                dark ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-900"
              }`}
            >
              {setupData.secret}
            </code>
          </div>
          <div>
            <label className={`mb-1 block text-sm font-medium ${dark ? "text-gray-300" : "text-gray-700"}`}>
              Enter the 6-digit code from your authenticator app:
            </label>
            <div className="flex gap-2">
              <input
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                placeholder="000000"
                maxLength={6}
                className={`w-32 rounded-md border px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                  dark ? "border-gray-600 bg-gray-700 text-white" : "border-gray-300"
                }`}
              />
              <button
                onClick={handleEnable}
                disabled={verifyCode.length !== 6 || mfaEnable.isPending}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {mfaEnable.isPending ? "Verifying..." : "Verify & Enable"}
              </button>
            </div>
          </div>
          <button
            onClick={() => setSetupData(null)}
            className={`text-sm ${dark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}`}
          >
            Cancel setup
          </button>
        </div>
      )}

      {/* Actions */}
      {!setupData && (
        <div className="flex gap-3">
          {!mfaEnabled ? (
            <button
              onClick={handleSetup}
              disabled={mfaSetup.isPending}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Shield className="h-4 w-4" />
              {mfaSetup.isPending ? "Setting up..." : "Enable MFA"}
            </button>
          ) : (
            !mfaEnforced && (
              <div className="space-y-2">
                <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
                  Enter your TOTP code to disable MFA:
                </p>
                <div className="flex gap-2">
                  <input
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value)}
                    placeholder="000000"
                    maxLength={6}
                    className={`w-32 rounded-md border px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                      dark ? "border-gray-600 bg-gray-700 text-white" : "border-gray-300"
                    }`}
                  />
                  <button
                    onClick={handleDisable}
                    disabled={disableCode.length !== 6 || mfaDisable.isPending}
                    className={`rounded-md border px-4 py-2 text-sm font-medium ${
                      dark
                        ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    } disabled:opacity-50`}
                  >
                    {mfaDisable.isPending ? "Disabling..." : "Disable MFA"}
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
