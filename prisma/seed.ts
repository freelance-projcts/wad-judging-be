import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("Admin@12345", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@wadjudging.test" },
    update: { mobileNumber: "0771234567", passwordHash: adminPassword },
    create: {
      name: "System Administrator",
      email: "admin@wadjudging.test",
      passwordHash: adminPassword,
      mobileNumber: "0771234567",
      role: "ADMIN",
    },
  });

  const performance1 = await prisma.performance.upsert({
    where: { name: "Performance 1" },
    update: {},
    create: { name: "Performance 1", order: 1 },
  });
  const performance2 = await prisma.performance.upsert({
    where: { name: "Performance 2" },
    update: {},
    create: { name: "Performance 2", order: 2 },
  });

  console.log("Seed complete:");
  console.log(`  Admin: ${admin.email} / Admin@12345`);
  console.log(`  Performances: ${performance1.name}, ${performance2.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
