import { ensureNodeIdentity } from "@/lib/evomap/auth";
import { getRuntimeConfig } from "@/lib/config/runtime";

export async function helloNode(mode = getRuntimeConfig().evomapMode) {
  return ensureNodeIdentity("master", mode);
}
