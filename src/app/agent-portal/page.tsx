import { redirect } from "next/navigation";

export default function AgentPortalRedirect() {
  // 🚀 PERMANENT REDIRECT: Forces all agents to the secure Main Vault Door
  redirect("/");
}
