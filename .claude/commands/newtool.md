# New Tool Command

Scaffold a new Ministry Platform tool by copying the template tool pattern, updating all names/text, and adding it to the homepage.

## Arguments

- `$ARGUMENTS` - The tool name (e.g., `contacts`, `Event Manager`, `group-wizard`). If not provided, ask the user for a tool name before proceeding.

## Instructions

### 1. Parse the tool name

From the provided name, derive these variants:

| Variant | Example (input: "Event Manager") | Usage |
|---------|-------------------------------|-------|
| **routeName** | `eventmanager` | Route folder name — lowercase, no spaces, no hyphens |
| **fileName** | `event-manager` | Component file name — kebab-case |
| **componentName** | `EventManager` | React component & interface names — PascalCase |
| **displayName** | `Event Manager` | Human-readable title shown in headers, cards, tooltips |

If the input is ambiguous (e.g., single word like `contacts`), treat it as both the routeName and derive the rest:
- `contacts` → routeName: `contacts`, fileName: `contacts`, componentName: `Contacts`, displayName: `Contacts`

### 2. Create the route page

Create `src/app/(web)/tools/{routeName}/page.tsx`:

```tsx
import { {componentName} } from "./{fileName}";
import { requireToolAccess } from "@/app/(web)/tools/require-tool-access";
import { parseToolParams } from "@/lib/tool-params.server";

interface {componentName}PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function {componentName}Page({ searchParams }: {componentName}PageProps) {
  // Self-gating, before ANY param parsing or data call — see require-tool-access.ts.
  // Pick the MP table/operation this tool actually needs.
  await requireToolAccess({ table: "dp_Tools", operation: "read" });

  const params = await parseToolParams(await searchParams);

  return <{componentName} params={params} />;
}

export async function generateMetadata() {
  return {
    title: "{displayName}",
  };
}
```

### 3. Create the tool component

Create `src/app/(web)/tools/{routeName}/{fileName}.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ToolContainer } from "@/components/tool";
import { Users } from "lucide-react";
import { ToolParams, isNewRecord } from "@/lib/tool-params";

interface {componentName}Props {
  params: ToolParams;
}

export function {componentName}({ params }: {componentName}Props) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const isNew = isNewRecord(params);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  const handleClose = () => {
    router.back();
  };

  const toolTitle = "{displayName}";

  return (
    <ToolContainer
      params={params}
      title={toolTitle}
      infoContent={
        <div className="space-y-2">
          <p className="font-semibold">{displayName}</p>
          <p className="text-sm">
            {isNew ? "Create a new record" : "Edit an existing record"} in Ministry Platform.
          </p>
          {params.pageID && (
            <p className="text-xs text-gray-400 mt-2">
              Launched from Page ID: {params.pageID}
              {params.s !== undefined && ` | Selection: ${params.s}`}
            </p>
          )}
        </div>
      }
      onSave={handleSave}
      onClose={handleClose}
      isSaving={isSaving}
    >

      {/* Main Tool Window */}
      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* Tool Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Users className="w-4 h-4" />
              {displayName}
            </h2>

          </div>
        </div>
      </div>
    </ToolContainer>
  );
}
```

### 4. Add to the homepage

Edit `src/app/(web)/page.tsx` and add a new `<Card>` inside the existing grid (`<div className="grid ...">`) after the last card:

```tsx
<Card className="flex flex-col">
  <CardHeader>
    <CardTitle>{displayName}</CardTitle>
    <CardDescription>
      {displayName} tool for Ministry Platform
    </CardDescription>
  </CardHeader>
  <CardContent className="mt-auto">
    <Link href="/tools/{routeName}">
      <Button className="w-full">Open Tool</Button>
    </Link>
  </CardContent>
</Card>
```

### 5. Verify

After creating all files, confirm the new tool by listing the created files and showing the updated homepage card grid.

## Checklist

- [ ] Tool name parsed into all 4 variants (routeName, fileName, componentName, displayName)
- [ ] Route page created at `src/app/(web)/tools/{routeName}/page.tsx`
- [ ] Tool component created at `src/app/(web)/tools/{routeName}/{fileName}.tsx`
- [ ] Homepage card added to `src/app/(web)/page.tsx`
- [ ] All placeholder text replaced with the tool's displayName
- [ ] `page.tsx` calls `requireToolAccess()` before parsing params, and imports `parseToolParams` from `@/lib/tool-params.server` (not `@/lib/tool-params`, which must stay client-safe)
- [ ] No `console.log` (ESLint `no-console` allows only `warn`/`error`)
- [ ] Component uses named export (no default export) — except `page.tsx` which requires default export per Next.js

## Multiple Tools

If the user provides multiple tool names (comma-separated or space-separated), repeat steps 2–4 for each tool. For example:

```
/newtool eventmanager, contacts
```

Creates both tools and adds both cards to the homepage.

## Notes

- The `ToolContainer` renders a `DevPanel` above the title bar automatically on localhost in development builds — no manual scaffolding needed.
- `tools/layout.tsx` only redirects role-less users for UX; it does **not** protect the page. Each page gates itself with `requireToolAccess` (`src/app/(web)/tools/require-tool-access.ts`), and any server action / service the tool adds must gate again with `AuthorizationService.requireSecurityRole()` (CLAUDE.md practice #12).
- Add co-located tests (`page.test.tsx`, `{fileName}.test.tsx`) — CI enforces coverage thresholds (`vitest.config.mts`).
- The `page.tsx` uses a default export (Next.js requirement), but the tool component uses a named export per project convention
- Route names should be lowercase with no separators (matching existing pattern: `template`, `groupwizard`, `addresslabels`, `fieldmanagement`, `addeditfamily`)
