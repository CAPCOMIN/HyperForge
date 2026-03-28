import { ensureNodeIdentity } from "@/lib/evomap/auth";
import { env } from "@/lib/utils/env";

export async function helloNode(mode = env.EVOMAP_MODE) {
  return ensureNodeIdentity("master", mode);
}
