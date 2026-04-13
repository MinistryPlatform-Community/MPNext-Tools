import { AddressLabels } from './address-labels';
import { parseToolParams } from '@/lib/tool-params';

interface AddressLabelsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AddressLabelsPage({ searchParams }: AddressLabelsPageProps) {
  const params = await parseToolParams(await searchParams);

  return <AddressLabels params={params} />;
}
