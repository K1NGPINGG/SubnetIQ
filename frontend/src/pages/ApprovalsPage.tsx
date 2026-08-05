import { useState } from "react";
import { Check, X, History } from "lucide-react";
import { createColumnHelper } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  useApprovals,
  useApproveRequest,
  useRejectRequest,
} from "@/hooks/api";
import { useThemeStore } from "@/shared/lib/theme-store";
import { usePermission } from "@/shared/lib/use-permission";
import type { ApprovalRequest } from "@/types/api";
import type { PaginationState } from "@tanstack/react-table";

const col = createColumnHelper<ApprovalRequest>();

type FilterTab = "pending" | "all";

const statusVariant = (status: string) =>
  status === "pending" ? "warning" : status === "approved" ? "success" : "danger";

export default function ApprovalsPage() {
  const dark = useThemeStore((s) => s.dark);
  const { canWrite } = usePermission();
  const [filter, setFilter] = useState<FilterTab>("pending");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [decision, setDecision] = useState<{
    approval: ApprovalRequest;
    action: "approve" | "reject";
  } | null>(null);

  const { data = [], isLoading } = useApprovals({
    status: filter === "pending" ? "pending" : undefined,
  });
  const approveMutation = useApproveRequest();
  const rejectMutation = useRejectRequest();

  const pageCount = Math.max(1, Math.ceil(data.length / pagination.pageSize));
  const safePageIndex = Math.min(pagination.pageIndex, pageCount - 1);
  const pagedData = data.slice(
    safePageIndex * pagination.pageSize,
    (safePageIndex + 1) * pagination.pageSize
  );

  const columns = [
    col.accessor("request_type", {
      header: "Type",
      cell: (info) => (
        <Badge variant="info" className="capitalize">
          {info.getValue()}
        </Badge>
      ),
    }),
    col.accessor("ip_address_id", {
      header: "IP",
      cell: (info) => (
        <span className="font-mono">{info.getValue().slice(0, 8)}…</span>
      ),
    }),
    col.accessor("status", {
      header: "Status",
      cell: (info) => (
        <Badge variant={statusVariant(info.getValue())}>{info.getValue()}</Badge>
      ),
    }),
    col.accessor("reason", {
      header: "Reason",
      cell: (info) => (
        <span className="max-w-xs truncate" title={info.getValue() ?? undefined}>
          {info.getValue() ?? "—"}
        </span>
      ),
    }),
    col.accessor("created_at", {
      header: "Requested",
      cell: (info) => new Date(info.getValue()).toLocaleString(),
    }),
    col.accessor("decision_notes", {
      header: "Decision Notes",
      cell: (info) => (
        <span className="max-w-xs truncate" title={info.getValue() ?? undefined}>
          {info.getValue() ?? "—"}
        </span>
      ),
    }),
    ...(canWrite
      ? [
          col.display({
            id: "actions",
            header: "Actions",
            cell: (info) => {
              const row = info.row.original;
              if (row.status !== "pending") return <span className="text-xs text-gray-400">Done</span>;
              return (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setDecision({ approval: row, action: "approve" })}
                    className={`rounded p-1.5 ${dark ? "text-emerald-400 hover:bg-emerald-900/30" : "text-emerald-600 hover:bg-emerald-50"}`}
                    title="Approve"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDecision({ approval: row, action: "reject" })}
                    className={`rounded p-1.5 ${dark ? "text-red-400 hover:bg-red-900/30" : "text-red-600 hover:bg-red-50"}`}
                    title="Reject"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            },
          }),
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter("pending")}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              filter === "pending"
                ? "bg-blue-600 text-white"
                : dark
                ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            <History className="h-4 w-4" />
            Pending
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-blue-600 text-white"
                : dark
                ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            All
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={pagedData}
        pageCount={pageCount}
        pagination={{ ...pagination, pageIndex: safePageIndex }}
        onPaginationChange={setPagination}
        loading={isLoading}
      />

      {decision && (
        <DecisionModal
          approval={decision.approval}
          action={decision.action}
          onClose={() => setDecision(null)}
          onSubmit={(notes) => {
            const mutation = decision.action === "approve" ? approveMutation : rejectMutation;
            mutation.mutate(
              { id: decision.approval.id, data: { notes: notes || null } },
              { onSuccess: () => setDecision(null) }
            );
          }}
          loading={
            decision.action === "approve"
              ? approveMutation.isPending
              : rejectMutation.isPending
          }
        />
      )}
    </div>
  );
}

function DecisionModal({
  approval,
  action,
  onClose,
  onSubmit,
  loading,
}: {
  approval: ApprovalRequest;
  action: "approve" | "reject";
  onClose: () => void;
  onSubmit: (notes: string) => void;
  loading: boolean;
}) {
  const dark = useThemeStore((s) => s.dark);
  const [notes, setNotes] = useState("");

  const inputClass = `w-full rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${dark ? "border-gray-600 bg-gray-700 text-white" : "border-gray-300"}`;

  return (
    <Modal
      open
      onClose={onClose}
      title={`${action === "approve" ? "Approve" : "Reject"} Request`}
      footer={
        <>
          <button
            onClick={onClose}
            className={`rounded-md border px-4 py-2 text-sm font-medium ${dark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(notes)}
            disabled={loading}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
              action === "approve"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {loading ? "Saving..." : action === "approve" ? "Approve" : "Reject"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className={`text-sm ${dark ? "text-gray-300" : "text-gray-600"}`}>
          <strong>{approval.request_type}</strong> request for IP{" "}
          <code className="font-mono">{approval.ip_address_id.slice(0, 8)}…</code>
          {approval.reason ? <> — {approval.reason}</> : null}.
          {action === "approve" && approval.request_type === "release"
            ? " Approving will release this IP."
            : null}
        </p>
        <div>
          <label className={`mb-1 block text-sm font-medium ${dark ? "text-gray-300" : "text-gray-700"}`}>
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClass}
            rows={3}
            placeholder="Decision notes"
          />
        </div>
      </div>
    </Modal>
  );
}