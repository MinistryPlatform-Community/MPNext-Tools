"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  ToolService,
  type DeployToolInput,
  type DeployToolResult,
  type PageLookup,
  type RoleLookup,
} from "@/services/toolService";

async function requireDevSession(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Deploy Tool is not available in production.");
  }
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    throw new Error("Unauthorized - Missing user session data");
  }
}

export async function listPagesAction(search?: string): Promise<PageLookup[]> {
  await requireDevSession();
  const toolService = await ToolService.getInstance();
  return toolService.listPages(search);
}

export async function listRolesAction(search?: string): Promise<RoleLookup[]> {
  await requireDevSession();
  const toolService = await ToolService.getInstance();
  return toolService.listRoles(search);
}

export async function deployToolAction(input: DeployToolInput): Promise<DeployToolResult> {
  await requireDevSession();
  const toolService = await ToolService.getInstance();
  return toolService.deployTool(input);
}

export interface DeployToolEnvStatus {
  hasDevCreds: boolean;
  missing: string[];
}

export async function getDeployToolEnvStatusAction(): Promise<DeployToolEnvStatus> {
  await requireDevSession();
  const missing: string[] = [];
  if (!process.env.MINISTRY_PLATFORM_DEV_CLIENT_ID) missing.push("MINISTRY_PLATFORM_DEV_CLIENT_ID");
  if (!process.env.MINISTRY_PLATFORM_DEV_CLIENT_SECRET) missing.push("MINISTRY_PLATFORM_DEV_CLIENT_SECRET");
  return {
    hasDevCreds: missing.length === 0,
    missing,
  };
}
