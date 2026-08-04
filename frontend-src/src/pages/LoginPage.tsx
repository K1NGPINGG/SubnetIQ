import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import { useLogin } from "@/hooks/api";
import { useAuthStore } from "@/shared/lib/auth-store";
import { loginSchema } from "@/lib/validators";
import { Logo } from "@/components/ui/Logo";
import apiClient from "@/shared/lib/api-client";
import type { LoginRequest, TokenResponse, UserInfo } from "@/types/api";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);
  const navigate = useNavigate();
  const loginMutation = useLogin();
  const storeLogin = useAuthStore((s) => s.login);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginRequest) => {
    setError(null);
    loginMutation.mutate(data, {
      onSuccess: (response) => {
        if (response.requires_mfa && !response.user) {
          setMfaToken(response.access_token);
          return;
        }
        storeLogin(
          response.user!,
          response.access_token,
          response.refresh_token
        );
        navigate("/");
      },
      onError: (err: any) => {
        setError(
          err.response?.data?.detail || "Invalid email or password"
        );
      },
    });
  };

  const onMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaToken || mfaCode.length !== 6) return;
    setMfaLoading(true);
    setError(null);
    try {
      const response = await apiClient.post<TokenResponse>("/auth/mfa/verify", {
        token: mfaToken,
        code: mfaCode,
      });
      const data = response.data;
      if (data.user) {
        storeLogin(data.user, data.access_token, data.refresh_token);
        navigate("/");
      } else {
        setError("MFA verification failed. Please try again.");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Invalid MFA code. Please try again."
      );
    } finally {
      setMfaLoading(false);
    }
  };

  if (mfaToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center">
            <Logo size={88} textClassName="text-3xl font-semibold text-white" />
          </div>

          <div className="rounded-xl border border-gray-700 bg-gray-900 p-8 shadow-lg">
            <h2 className="mb-6 text-lg font-semibold text-white">
              Multi-Factor Authentication
            </h2>
            <p className="mb-4 text-sm text-gray-400">
              Enter the 6-digit code from your authenticator app.
            </p>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-md bg-red-900/30 p-3 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={onMfaSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="mfa-code"
                  className="mb-1 block text-sm font-medium text-gray-300"
                >
                  Authentication Code
                </label>
                <input
                  id="mfa-code"
                  type="text"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  className="w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-center text-lg font-mono tracking-widest text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <button
                type="submit"
                disabled={mfaLoading || mfaCode.length !== 6}
                className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mfaLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Verifying...
                  </span>
                ) : (
                  "Verify"
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMfaToken(null);
                  setMfaCode("");
                  setError(null);
                }}
                className="w-full text-center text-sm text-gray-400 hover:text-white"
              >
                Back to login
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo size={88} textClassName="text-3xl font-semibold text-white" />
        </div>

        <div className="rounded-xl border border-gray-700 bg-gray-900 p-8 shadow-lg">
          <h2 className="mb-6 text-lg font-semibold text-white">
            Sign in to your account
          </h2>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-md bg-red-900/30 p-3 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-gray-300"
              >
                Email address
              </label>
              <input
                {...register("email")}
                type="email"
                id="email"
                autoComplete="email"
                className="w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="you@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-gray-300"
              >
                Password
              </label>
              <input
                {...register("password")}
                type="password"
                id="password"
                autoComplete="current-password"
                className="w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Enter your password"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loginMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
