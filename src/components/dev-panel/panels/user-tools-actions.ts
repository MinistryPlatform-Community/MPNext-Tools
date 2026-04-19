"use server";

import { requireDevSession } from "./require-dev-session";
import { ToolService } from "@/services/toolService";
import { UserService } from "@/services/userService";

export async function getUserTools(): Promise<string[]> {
  const session = await requireDevSession("Dev panel");

  const userGuid = (session.user as Record<string, unknown>).userGuid as string | undefined;
  if (!userGuid) {
    throw new Error("User GUID not found in session");
  }

  const userService = await UserService.getInstance();
  const userId = await userService.getUserIdByGuid(userGuid);

  const toolService = await ToolService.getInstance();
  const toolPaths = await toolService.getUserTools(userId);

  return toolPaths;
}
