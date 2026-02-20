import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding TimeRange data...');

  const timeRanges = [
    { label: '09-12', startTime: '09:00', endTime: '12:00' },
    { label: '12-15', startTime: '12:00', endTime: '15:00' },
    { label: '15-18', startTime: '15:00', endTime: '18:00' },
    { label: '18-20', startTime: '18:00', endTime: '20:00' },
  ];

  for (const timeRange of timeRanges) {
    await prisma.timeRange.upsert({
      where: { label: timeRange.label },
      update: { startTime: timeRange.startTime, endTime: timeRange.endTime },
      create: timeRange,
    });
    console.log(`TimeRange ${timeRange.label} seeded`);
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
