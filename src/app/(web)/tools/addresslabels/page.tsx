import { AddressLabels } from './address-labels';
import { requireToolAccess } from '@/app/(web)/tools/require-tool-access';
import { parseToolParams } from '@/lib/tool-params.server';

interface AddressLabelsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AddressLabelsPage({ searchParams }: AddressLabelsPageProps) {
  // Self-gating, before ANY param parsing or data call — see require-tool-access.ts.
  await requireToolAccess({ table: 'Contacts', operation: 'read' });

  const params = await parseToolParams(await searchParams);

  return <AddressLabels params={params} />;
}
