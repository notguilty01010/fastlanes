import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminCount = await prisma.user.count({ where: { role: "admin" } });
  if (adminCount > 0) {
    console.log(`Admin already exists (count=${adminCount}), skipping seed.`);
    return;
  }

  const email = process.env.ADMIN_INITIAL_EMAIL;
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  const name = process.env.ADMIN_INITIAL_NAME ?? "Admin";

  if (!email || !password) {
    console.warn(
      "[seed] No admin in DB and ADMIN_INITIAL_EMAIL/ADMIN_INITIAL_PASSWORD are not set — skipping.",
    );
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      name,
      passwordHash,
      role: "admin",
      isActive: true,
    },
  });

  console.log(`[seed] Created admin ${email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
