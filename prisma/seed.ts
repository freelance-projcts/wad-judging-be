import { PrismaClient, Gender, Province } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PROVINCES: Province[] = [
  "WESTERN",
  "CENTRAL",
  "SOUTHERN",
  "NORTHERN",
  "EASTERN",
  "NORTH_WESTERN",
  "NORTH_CENTRAL",
  "UVA",
  "SABARAGAMUWA",
];

const MALE_NAMES = [
  "D.A Karunagama",
  "K.A.A Sades",
  "H.L.D.R.S Bandara",
  "J.T Hirushan",
  "M.P.L Karunarathna",
  "W.A.P.S Tharuka",
  "L.G.K Arunasiri",
  "W.G.Y Jayathissa",
  "L.A.A.S.S Liyanarachchi",
  "D.T Halgaswathta",
  "W.A.O.Vishistha",
  "G.D.D.G Thilakarathna",
];

const FEMALE_NAMES = [
  "P.G.D.B Nirmani",
  "W.G.N.N Siriwardhana",
  "W.D.R Kithsara",
  "K.M.Y.S.A Kobbakaduwa",
  "S.S Warakapitiya",
  "G.A.M.G Wijemanna",
  "D.R.S Ranasingha",
  "B.M.A.N Basnayaka",
  "W.A.S.N Wijesinha",
  "P.C Madusanka",
  "L.A.A.S.S Liyanarachchi",
  "B.A.U.C Mahendra",
];

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

  const judgePassword = await bcrypt.hash("Judge@12345", 10);
  const judge = await prisma.user.upsert({
    where: { email: "judge@wadjudging.test" },
    update: { mobileNumber: "0779876543", passwordHash: judgePassword },
    create: {
      name: "Sample Judge",
      email: "judge@wadjudging.test",
      passwordHash: judgePassword,
      mobileNumber: "0779876543",
      role: "JUDGE",
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

  await prisma.judgeAssignment.upsert({
    where: { judgeId_performanceId: { judgeId: judge.id, performanceId: performance1.id } },
    update: {},
    create: { judgeId: judge.id, performanceId: performance1.id },
  });
  await prisma.judgeAssignment.upsert({
    where: { judgeId_performanceId: { judgeId: judge.id, performanceId: performance2.id } },
    update: {},
    create: { judgeId: judge.id, performanceId: performance2.id },
  });

  const events: { name: string; gender: Gender }[] = [
    { name: "Floor Exercises", gender: "MALE" },
    { name: "Rings", gender: "MALE" },
    { name: "Pommel Horse", gender: "MALE" },
    { name: "Vault Table", gender: "FEMALE" },
    { name: "Uneven Bars", gender: "FEMALE" },
  ];
  for (const e of events) {
    await prisma.event.upsert({
      where: { name_gender: { name: e.name, gender: e.gender } },
      update: {},
      create: e,
    });
  }

  let code = 1;
  const pad = (n: number) => String(n).padStart(2, "0");

  for (let i = 0; i < MALE_NAMES.length; i++) {
    const province = PROVINCES[i % PROVINCES.length];
    await prisma.student.upsert({
      where: { code: pad(code) },
      update: {},
      create: {
        code: pad(code),
        fullName: MALE_NAMES[i],
        gender: "MALE",
        province,
        team: i % 2 === 0 ? "A" : "B",
      },
    });
    code++;
  }

  for (let i = 0; i < FEMALE_NAMES.length; i++) {
    const province = PROVINCES[i % PROVINCES.length];
    await prisma.student.upsert({
      where: { code: pad(code) },
      update: {},
      create: {
        code: pad(code),
        fullName: FEMALE_NAMES[i],
        gender: "FEMALE",
        province,
        team: i % 2 === 0 ? "A" : "B",
      },
    });
    code++;
  }

  console.log("Seed complete:");
  console.log(`  Admin: ${admin.email} / Admin@12345`);
  console.log(`  Judge: ${judge.email} / Judge@12345`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
