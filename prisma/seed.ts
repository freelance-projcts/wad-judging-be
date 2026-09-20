import { PrismaClient, Gender, Province, Student, Event } from "@prisma/client";
import bcrypt from "bcryptjs";
import { calculateFinalScore } from "../src/lib/scoring";

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

/** Extra WESTERN/Team A students so that province+team group has enough members
 *  (7, alongside student "01" from the round-robin) to actually exercise the
 *  top-5 (team performance) and top-3 (top eight) cutoffs. */
const EXTRA_WESTERN_TEAM_A_NAMES = [
  "R.M.S Perera",
  "N.K.D Fernando",
  "A.B.C Silva",
  "T.L.M Jayasuriya",
  "C.D.E Gunasekara",
  "P.Q.R Wickramasinghe",
];

async function createMark(
  studentId: string,
  eventId: string,
  performanceId: string,
  judgeId: string,
  scores: { d: number; e1: number; e2: number; e3: number; e4: number; p: number },
  round = 1
) {
  const finalScore = calculateFinalScore(scores);
  await prisma.markEntry.upsert({
    where: { studentId_eventId_performanceId_round: { studentId, eventId, performanceId, round } },
    update: {},
    create: {
      studentId,
      eventId,
      performanceId,
      round,
      judgeId,
      dScore: scores.d,
      e1Score: scores.e1,
      e2Score: scores.e2,
      e3Score: scores.e3,
      e4Score: scores.e4,
      penaltyScore: scores.p,
      finalScore,
    },
  });
}

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

  // Deliberately mixed so All-Rounders demonstrates picking the right
  // performance per event, not just always using Performance 1. Floor
  // Exercises and Vault Table support 2 rounds (one classic multi-attempt
  // event per gender); every other event is single-round.
  const events: { name: string; gender: Gender; defaultPerformanceId: string; supportsMultipleRounds: boolean }[] = [
    { name: "Floor Exercises", gender: "MALE", defaultPerformanceId: performance1.id, supportsMultipleRounds: true },
    { name: "Rings", gender: "MALE", defaultPerformanceId: performance2.id, supportsMultipleRounds: false },
    { name: "Pommel Horse", gender: "MALE", defaultPerformanceId: performance1.id, supportsMultipleRounds: false },
    { name: "Vault Table", gender: "FEMALE", defaultPerformanceId: performance2.id, supportsMultipleRounds: true },
    { name: "Uneven Bars", gender: "FEMALE", defaultPerformanceId: performance1.id, supportsMultipleRounds: false },
  ];
  const eventByName = new Map<string, Event>();
  for (const e of events) {
    const event = await prisma.event.upsert({
      where: { name_gender: { name: e.name, gender: e.gender } },
      update: { defaultPerformanceId: e.defaultPerformanceId, supportsMultipleRounds: e.supportsMultipleRounds },
      create: e,
    });
    eventByName.set(e.name, event);
  }

  let code = 1;
  const pad = (n: number) => String(n).padStart(2, "0");
  const maleStudents: Student[] = [];
  const femaleStudents: Student[] = [];

  for (let i = 0; i < MALE_NAMES.length; i++) {
    const province = PROVINCES[i % PROVINCES.length];
    const student = await prisma.student.upsert({
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
    maleStudents.push(student);
    code++;
  }

  for (let i = 0; i < FEMALE_NAMES.length; i++) {
    const province = PROVINCES[i % PROVINCES.length];
    const student = await prisma.student.upsert({
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
    femaleStudents.push(student);
    code++;
  }

  const extraWesternStudents: Student[] = [];
  for (const name of EXTRA_WESTERN_TEAM_A_NAMES) {
    const student = await prisma.student.upsert({
      where: { code: pad(code) },
      update: {},
      create: { code: pad(code), fullName: name, gender: "MALE", province: "WESTERN", team: "A" },
    });
    extraWesternStudents.push(student);
    maleStudents.push(student);
    code++;
  }

  // --- Sample marks -------------------------------------------------------

  const floorExercises = eventByName.get("Floor Exercises")!;
  const pommelHorse = eventByName.get("Pommel Horse")!;
  const rings = eventByName.get("Rings")!;
  const vaultTable = eventByName.get("Vault Table")!;
  const unevenBars = eventByName.get("Uneven Bars")!;

  // Floor Exercises / Performance 1 - all 18 male students, D/P vary per student.
  // This event supports 2 rounds; round 2 uses independent scores so the
  // team-performance/top-eight views visibly show an averaged score.
  for (let i = 0; i < maleStudents.length; i++) {
    await createMark(
      maleStudents[i].id,
      floorExercises.id,
      performance1.id,
      judge.id,
      { d: 6 + i * 0.15, e1: 8, e2: 8.5, e3: 7.5, e4: 9, p: i % 3 === 0 ? 0.25 : 0 },
      1
    );
    await createMark(
      maleStudents[i].id,
      floorExercises.id,
      performance1.id,
      judge.id,
      { d: 6.3 + i * 0.15, e1: 8, e2: 8.5, e3: 7.5, e4: 9, p: i % 4 === 0 ? 0.2 : 0 },
      2
    );
  }

  // Floor Exercises / Performance 2 - same 18 students, independent scores
  // (proves P1/P2 never overwrite each other), engineered so ranks 8 and 9 tie.
  const p2FloorD = [
    9.0, 8.7, 8.4, 8.1, 7.8, 7.5, 7.2, // ranks 1-7
    6.9, 6.9, // tie at 8th/9th
    6.6, 6.3, 6.0, 5.7, 5.4, 5.1, 4.8, 4.5, 4.2, // remaining 9
  ];
  for (let i = 0; i < maleStudents.length; i++) {
    await createMark(maleStudents[i].id, floorExercises.id, performance2.id, judge.id, {
      d: p2FloorD[i],
      e1: 8,
      e2: 8,
      e3: 8,
      e4: 8,
      p: 0,
    });
  }

  // Pommel Horse / Performance 1 and Rings / Performance 2 - the 12 original male students.
  for (let i = 0; i < 12; i++) {
    const scores = { d: 5 + i * 0.2, e1: 7, e2: 7.5, e3: 8, e4: 8.5, p: 0 };
    await createMark(maleStudents[i].id, pommelHorse.id, performance1.id, judge.id, scores);
    await createMark(maleStudents[i].id, rings.id, performance2.id, judge.id, scores);
  }

  // Vault Table / Performance 2 (2 rounds, independent scores) and Uneven Bars /
  // Performance 1 (single round) - the 12 original female students; deliberately
  // skip one Uneven Bars mark to exercise the "hasMark: false" path.
  for (let i = 0; i < femaleStudents.length; i++) {
    const scores = { d: 5 + i * 0.2, e1: 7, e2: 7.5, e3: 8, e4: 8.5, p: 0 };
    await createMark(femaleStudents[i].id, vaultTable.id, performance2.id, judge.id, scores, 1);
    await createMark(
      femaleStudents[i].id,
      vaultTable.id,
      performance2.id,
      judge.id,
      { d: 5.4 + i * 0.2, e1: 7, e2: 7.5, e3: 8, e4: 8.5, p: 0 },
      2
    );
    if (i < femaleStudents.length - 1) {
      await createMark(femaleStudents[i].id, unevenBars.id, performance1.id, judge.id, scores);
    }
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
