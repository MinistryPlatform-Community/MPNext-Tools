import { TextMessaging } from './text-messaging';
import { parseToolParams } from '@/lib/tool-params.server';

interface TextMessagingPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export function generateMetadata() {
  return { title: 'Text Messaging' };
}

export default async function TextMessagingPage({ searchParams }: TextMessagingPageProps) {
  const params = await parseToolParams(await searchParams);

  return <TextMessaging params={params} />;
}
