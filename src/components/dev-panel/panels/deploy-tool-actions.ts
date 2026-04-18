"use server";

import { requireDevSession } from "./require-dev-session";
import {
  ToolService,
  type DeployToolInput,
  type DeployToolResult,
  type PageLookup,
  type RoleLookup,
} from "@/services/toolService";

export async function listPagesAction(search?: string): Promise<PageLookup[]> {
  await requireDevSession("Deploy Tool");
  const toolService = await ToolService.getInstance();
  return toolService.listPages(search);
}

export async function listRolesAction(search?: string): Promise<RoleLookup[]> {
  await requireDevSession("Deploy Tool");
  const toolService = await ToolService.getInstance();
  return toolService.listRoles(search);
}

export async function deployToolAction(input: DeployToolInput): Promise<DeployToolResult> {
  await requireDevSession("Deploy Tool");
  const toolService = await ToolService.getInstance();
  return toolService.deployTool(input);
}

export interface DeployToolEnvStatus {
  hasDevCreds: boolean;
  missing: string[];
}

export async function getDeployToolEnvStatusAction(): Promise<DeployToolEnvStatus> {
  await requireDevSession("Deploy Tool");
  const missing: string[] = [];
  if (!process.env.MINISTRY_PLATFORM_DEV_CLIENT_ID) missing.push("MINISTRY_PLATFORM_DEV_CLIENT_ID");
  if (!process.env.MINISTRY_PLATFORM_DEV_CLIENT_SECRET) missing.push("MINISTRY_PLATFORM_DEV_CLIENT_SECRET");
  return {
    hasDevCreds: missing.length === 0,
    missing,
  };
}
