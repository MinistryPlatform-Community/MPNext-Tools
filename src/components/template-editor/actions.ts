'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import type { MjmlCompileResult } from '@/components/template-editor/types';

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session;
}

const MAX_MJML_SIZE = 512_000; // 500KB

export async function compileMjml(mjmlSource: string): Promise<MjmlCompileResult> {
  await getSession();

  if (!mjmlSource || mjmlSource.length > MAX_MJML_SIZE) {
    throw new Error(`MJML source must be between 1 and ${MAX_MJML_SIZE} characters`);
  }

  const mjml2html = (await import('mjml')).default;

  const result = mjml2html(mjmlSource, {
    validationLevel: 'soft',
    minify: false,
  });

  return {
    html: result.html,
    errors: result.errors.map((e) => ({
      line: e.line,
      message: e.message,
      tagName: e.tagName,
      formattedMessage: e.formattedMessage,
    })),
  };
}
