import { TrainingTool } from './training-tool';
import { parseToolParams } from '@/lib/tool-params';

interface TrainingToolPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TrainingToolPage({ searchParams }: TrainingToolPageProps) {
  const params = await parseToolParams(await searchParams);

  return <TrainingTool params={params} />;
}
