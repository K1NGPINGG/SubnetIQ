import { createColumnHelper } from "@tanstack/react-table";
import { CrudPage } from "@/components/ui/CrudPage";
import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from "@/hooks/api";
import { tagCreateSchema, tagUpdateSchema } from "@/lib/validators";
import { useThemeStore } from "@/shared/lib/theme-store";
import type { Tag } from "@/types/api";

const col = createColumnHelper<Tag>();

export default function TagsPage() {
  const dark = useThemeStore((s) => s.dark);

  const columns = [
    col.accessor("name", {
      header: "Name",
      cell: (info) => {
        const tag = info.row.original;
        return (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: `${tag.color}22`,
              color: tag.color,
              border: `1px solid ${tag.color}55`,
            }}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />
            {tag.name}
          </span>
        );
      },
    }),
    col.accessor("slug", {
      header: "Slug",
      cell: (info) => <span className="font-mono">{info.getValue()}</span>,
    }),
    col.accessor("description", {
      header: "Description",
      cell: (info) => info.getValue() ?? "—",
    }),
    col.accessor("created_at", {
      header: "Created",
      cell: (info) => new Date(info.getValue()).toLocaleDateString(),
    }),
  ];

  return (
    <div>
      <p className={`mb-4 text-sm ${dark ? "text-gray-400" : "text-gray-600"}`}>
        Tags are reusable labels applied to subnets, IP addresses, and sites to filter and organize resources.
      </p>
      <CrudPage
        entityLabel="Tag"
        searchPlaceholder="Search tags..."
        fields={[
          { name: "name", label: "Name", required: true, placeholder: "dmz" },
          { name: "slug", label: "Slug", required: true, placeholder: "dmz" },
          { name: "color", label: "Color", type: "color" },
          { name: "description", label: "Description", type: "textarea" },
        ]}
        createSchema={tagCreateSchema}
        updateSchema={tagUpdateSchema}
        emptyCreate={() => ({ name: "", slug: "", color: "#1976D2", description: "" })}
        toFormValues={(t) => ({
          name: t.name,
          slug: t.slug,
          color: t.color,
          description: t.description ?? "",
        })}
        columns={columns}
        useList={useTags}
        useCreate={useCreateTag}
        useUpdate={useUpdateTag}
        useDelete={useDeleteTag}
      />
    </div>
  );
}