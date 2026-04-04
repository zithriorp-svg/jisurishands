import { prisma } from "@/lib/db";
import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Check if there are any users in the database
  const userCount = await prisma.user.count();
  const showSeedButton = userCount === 0;

  return <LoginClient showSeedButton={showSeedButton} />;
}
