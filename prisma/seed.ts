import { PrismaClient, UserRole, UserStatus, LocationStatus, PhotoKind } from "@prisma/client";
import bcrypt from "bcryptjs";
import { slugify } from "../lib/utils";

const prisma = new PrismaClient();

async function main() {
  const adminEmail =
    process.env.ADMIN_BOOTSTRAP_EMAIL ?? "admin@photoloc.local";
  const adminPassword =
    process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "changeme123!";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: UserRole.ADMIN,
      status: UserStatus.APPROVED,
    },
    create: {
      email: adminEmail,
      fullName: "Admin",
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.APPROVED,
      emailVerified: new Date(),
    },
  });

  console.log(`Admin user ready: ${admin.email}`);

  const samplePassword = await bcrypt.hash("photographer", 10);
  const photographer = await prisma.user.upsert({
    where: { email: "demo@photoloc.local" },
    update: { status: UserStatus.APPROVED },
    create: {
      email: "demo@photoloc.local",
      fullName: "Demo Photographer",
      passwordHash: samplePassword,
      teacherOrSchool: "PhotoLoc Academy",
      portfolioUrl: "https://example.com/portfolio",
      role: UserRole.USER,
      status: UserStatus.APPROVED,
      emailVerified: new Date(),
    },
  });

  const samples = [
    {
      title: "Old Jaffa Stone Stairs",
      description:
        "Sun-warmed limestone stairs with a sea-glimpse alcove. Great for golden-hour portraits and editorial shoots.",
      latitude: 32.0524,
      longitude: 34.7531,
      wheelchair: false,
      publicTransport: true,
      restroom: true,
      paid: false,
      styleTags: ["urban", "rustic", "golden-hour"],
    },
    {
      title: "Florentin Mural Alley",
      description:
        "Saturated street-art alley, dense color, suitable for fashion and band portraits. Tight space, bring a 35mm.",
      latitude: 32.0571,
      longitude: 34.7704,
      wheelchair: true,
      publicTransport: true,
      restroom: false,
      paid: false,
      styleTags: ["urban", "graffiti", "fashion"],
    },
    {
      title: "Hidden Wadi Pool",
      description:
        "Secret freshwater pool fringed by ferns. Best in spring after the rains. Coordinates redacted; unlock to view.",
      latitude: 32.7,
      longitude: 35.4,
      wheelchair: false,
      publicTransport: false,
      restroom: false,
      paid: false,
      isSecret: true,
      styleTags: ["nature", "water", "moody"],
    },
  ];

  for (const s of samples) {
    const slug = slugify(s.title);
    await prisma.location.upsert({
      where: { slug },
      update: {},
      create: {
        ...s,
        slug,
        status: LocationStatus.PUBLISHED,
        approvedAt: new Date(),
        awardedPoints: true,
        submitterId: photographer.id,
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
