import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new (PrismaClient as any)({ adapter });

async function main() {
  console.log("Seeding database...");

  // Clear existing data
  await prisma.notification.deleteMany();
  await prisma.sharedRecord.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.report.deleteMany();
  await prisma.medicalRecord.deleteMany();
  await prisma.familyMember.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash("Password123!@", 12);

  // Create patients
  const sarah = await prisma.user.create({
    data: {
      email: "sarah.johnson@email.com",
      password,
      name: "Sarah Johnson",
      role: "PATIENT",
    },
  });

  const marcus = await prisma.user.create({
    data: {
      email: "marcus.johnson@email.com",
      password,
      name: "Marcus Johnson",
      role: "PATIENT",
    },
  });

  const elena = await prisma.user.create({
    data: {
      email: "elena.garcia@email.com",
      password,
      name: "Elena Garcia",
      role: "PATIENT",
    },
  });

  // Create providers
  await prisma.user.create({
    data: {
      email: "dr.chen@hospital.com",
      password,
      name: "Dr. Michael Chen",
      role: "PROVIDER",
      provider: {
        create: {
          specialty: "Radiology",
          licenseNumber: "RAD-2024-1001",
          facilityName: "City General Hospital",
          facilityAddress: "100 Main Street, Suite 200",
          phone: "(555) 100-2000",
          bio: "Board-certified radiologist with 15 years of experience in diagnostic imaging.",
        },
      },
    },
  });

  await prisma.user.create({
    data: {
      email: "dr.rodriguez@neurohealth.com",
      password,
      name: "Dr. Emily Rodriguez",
      role: "PROVIDER",
      provider: {
        create: {
          specialty: "Neurology",
          licenseNumber: "NEU-2024-2002",
          facilityName: "NeuroHealth Imaging Center",
          facilityAddress: "250 Medical Drive",
          phone: "(555) 200-3000",
          bio: "Neurologist specializing in brain imaging and headache disorders.",
        },
      },
    },
  });

  await prisma.user.create({
    data: {
      email: "dr.thompson@sportsmed.com",
      password,
      name: "Dr. Lisa Thompson",
      role: "PROVIDER",
      provider: {
        create: {
          specialty: "Sports Medicine",
          licenseNumber: "SPM-2024-3003",
          facilityName: "SportsMed Clinic",
          facilityAddress: "500 Athletic Way",
          phone: "(555) 300-4000",
          bio: "Sports medicine specialist focused on musculoskeletal imaging and rehabilitation.",
        },
      },
    },
  });

  // Create admin
  await prisma.user.create({
    data: {
      email: "admin@healthapp.com",
      password,
      name: "Admin User",
      role: "ADMIN",
    },
  });

  // Create medical records for Sarah
  const chestXray = await prisma.medicalRecord.create({
    data: {
      userId: sarah.id,
      title: "Chest X-Ray",
      type: "XRAY",
      bodyPart: "Chest",
      facility: "City General Hospital",
      referringPhysician: "Dr. Michael Chen",
      recordDate: new Date("2026-02-03"),
      notes: "Annual routine checkup. No abnormalities detected.",
    },
  });

  const brainMri = await prisma.medicalRecord.create({
    data: {
      userId: sarah.id,
      title: "Brain MRI",
      type: "MRI",
      bodyPart: "Head",
      facility: "NeuroHealth Imaging Center",
      referringPhysician: "Dr. Emily Rodriguez",
      recordDate: new Date("2026-01-22"),
      notes: "Follow-up from headache consultation. Normal findings.",
    },
  });

  await prisma.medicalRecord.create({
    data: {
      userId: sarah.id,
      title: "Abdominal CT Scan",
      type: "CT_SCAN",
      bodyPart: "Abdomen",
      facility: "Metro Diagnostic Clinic",
      referringPhysician: "Dr. James Park",
      recordDate: new Date("2026-01-15"),
      notes: "Ordered for abdominal pain evaluation.",
    },
  });

  const kneeUltrasound = await prisma.medicalRecord.create({
    data: {
      userId: sarah.id,
      title: "Knee Ultrasound",
      type: "ULTRASOUND",
      bodyPart: "Right Knee",
      facility: "SportsMed Clinic",
      referringPhysician: "Dr. Lisa Thompson",
      recordDate: new Date("2026-01-08"),
      notes: "Post-injury assessment. Minor inflammation noted.",
    },
  });

  const lumbarMri = await prisma.medicalRecord.create({
    data: {
      userId: sarah.id,
      title: "Lumbar Spine MRI",
      type: "MRI",
      bodyPart: "Lower Back",
      facility: "NeuroHealth Imaging Center",
      referringPhysician: "Dr. Robert Kim",
      recordDate: new Date("2025-12-10"),
      notes: "Lower back pain evaluation. Mild disc bulge at L4-L5.",
    },
  });

  await prisma.medicalRecord.create({
    data: {
      userId: sarah.id,
      title: "Shoulder X-Ray",
      type: "XRAY",
      bodyPart: "Left Shoulder",
      facility: "SportsMed Clinic",
      referringPhysician: "Dr. Lisa Thompson",
      recordDate: new Date("2025-11-15"),
      notes: "Rotator cuff assessment. No fracture detected.",
    },
  });

  // Create records for Marcus
  const marcusRecord = await prisma.medicalRecord.create({
    data: {
      userId: marcus.id,
      title: "Ankle X-Ray",
      type: "XRAY",
      bodyPart: "Right Ankle",
      facility: "SportsMed Clinic",
      referringPhysician: "Dr. Lisa Thompson",
      recordDate: new Date("2026-01-20"),
      notes: "Sprain assessment. No fracture visible.",
    },
  });

  // Create records for Elena
  await prisma.medicalRecord.create({
    data: {
      userId: elena.id,
      title: "Pelvic Ultrasound",
      type: "ULTRASOUND",
      bodyPart: "Pelvis",
      facility: "City General Hospital",
      referringPhysician: "Dr. Michael Chen",
      recordDate: new Date("2026-01-30"),
      notes: "Routine screening. Normal findings.",
    },
  });

  // Create reports
  await prisma.report.create({
    data: {
      medicalRecordId: chestXray.id,
      content:
        "PA and lateral views of the chest were obtained. The lungs are clear bilaterally with no focal consolidation, pleural effusion, or pneumothorax. The cardiac silhouette is normal in size. The mediastinal contours are unremarkable. No acute osseous abnormality is identified. Impression: Normal chest radiograph.",
      summary: "Normal chest X-ray with no abnormalities detected.",
      keyFindings: "Clear lungs, normal heart size, no fractures",
    },
  });

  await prisma.report.create({
    data: {
      medicalRecordId: brainMri.id,
      content:
        "MRI of the brain was performed with and without contrast. No evidence of acute intracranial hemorrhage, mass effect, or midline shift. The ventricles and sulci are normal in size and configuration. No restricted diffusion to suggest acute infarction. The major intracranial vessels demonstrate normal flow voids. No abnormal enhancement is seen. Impression: Normal MRI of the brain.",
      summary: "Normal brain MRI with no signs of hemorrhage, mass, or infarction.",
      keyFindings: "No hemorrhage, normal ventricles, no mass effect",
    },
  });

  await prisma.report.create({
    data: {
      medicalRecordId: lumbarMri.id,
      content:
        "MRI of the lumbar spine without contrast. There is a mild broad-based disc bulge at L4-L5 without significant central canal stenosis or neural foraminal narrowing. The remaining intervertebral discs demonstrate normal signal intensity and height. The conus medullaris terminates at L1 level. No evidence of spondylolisthesis. Impression: Mild disc bulge at L4-L5 without significant stenosis.",
      summary: "Mild disc bulge at L4-L5, but no nerve compression or significant narrowing.",
      keyFindings: "L4-L5 disc bulge, no stenosis, no nerve compression",
    },
  });

  await prisma.report.create({
    data: {
      medicalRecordId: kneeUltrasound.id,
      content:
        "Ultrasound of the right knee was performed. There is mild joint effusion in the suprapatellar recess. The quadriceps and patellar tendons are intact. No Baker cyst is identified. The medial and lateral collateral ligaments appear intact. Mild soft tissue edema is noted around the lateral aspect. Impression: Mild joint effusion and lateral soft tissue edema, likely post-traumatic.",
      summary: "Mild swelling in the right knee joint, likely from injury. Ligaments are intact.",
      keyFindings: "Mild joint effusion, intact ligaments, soft tissue swelling",
    },
  });

  // Create shared records
  await prisma.sharedRecord.create({
    data: {
      medicalRecordId: brainMri.id,
      sharedByUserId: sarah.id,
      sharedWithEmail: "dr.rodriguez@neurohealth.com",
      permission: "VIEW",
      expiresAt: new Date("2026-03-22"),
    },
  });

  await prisma.sharedRecord.create({
    data: {
      medicalRecordId: kneeUltrasound.id,
      sharedByUserId: sarah.id,
      sharedWithEmail: "dr.thompson@sportsmed.com",
      permission: "DOWNLOAD",
      expiresAt: new Date("2026-04-08"),
    },
  });

  await prisma.sharedRecord.create({
    data: {
      medicalRecordId: chestXray.id,
      sharedByUserId: sarah.id,
      sharedWithEmail: "marcus.johnson@email.com",
      permission: "VIEW",
    },
  });

  await prisma.sharedRecord.create({
    data: {
      medicalRecordId: lumbarMri.id,
      sharedByUserId: sarah.id,
      sharedWithEmail: "dr.chen@hospital.com",
      permission: "VIEW",
      expiresAt: new Date("2026-02-28"),
    },
  });

  // Create family members
  await prisma.familyMember.create({
    data: {
      userId: sarah.id,
      memberUserId: marcus.id,
      relationship: "Spouse",
      consentGiven: true,
    },
  });

  await prisma.familyMember.create({
    data: {
      userId: sarah.id,
      memberUserId: elena.id,
      relationship: "Sister",
      consentGiven: true,
    },
  });

  // Create follow-ups
  await prisma.followUp.create({
    data: {
      userId: sarah.id,
      medicalRecordId: brainMri.id,
      recommendation: "MRI Follow-up Consultation",
      status: "SCHEDULED",
      dueDate: new Date("2026-02-18"),
      notes: "Discuss MRI results with Dr. Rodriguez.",
    },
  });

  await prisma.followUp.create({
    data: {
      userId: sarah.id,
      recommendation: "Annual Physical Exam",
      status: "PENDING",
      dueDate: new Date("2026-03-05"),
      notes: "Schedule annual physical with Dr. Chen.",
    },
  });

  await prisma.followUp.create({
    data: {
      userId: sarah.id,
      medicalRecordId: kneeUltrasound.id,
      recommendation: "Knee Re-evaluation",
      status: "PENDING",
      dueDate: new Date("2026-03-12"),
      notes: "Follow-up on knee inflammation with Dr. Thompson.",
    },
  });

  await prisma.followUp.create({
    data: {
      userId: marcus.id,
      medicalRecordId: marcusRecord.id,
      recommendation: "Ankle Follow-up X-Ray",
      status: "SCHEDULED",
      dueDate: new Date("2026-02-20"),
    },
  });

  // Create notifications for Sarah
  await prisma.notification.createMany({
    data: [
      {
        userId: sarah.id,
        title: "New Report Available",
        message: "Your Chest X-Ray report is now available to view.",
        type: "REPORT",
        read: false,
      },
      {
        userId: sarah.id,
        title: "Record Shared",
        message: "You shared your Brain MRI with Dr. Rodriguez.",
        type: "SHARE",
        read: true,
      },
      {
        userId: sarah.id,
        title: "Follow-up Reminder",
        message: "Your MRI follow-up consultation with Dr. Rodriguez is coming up on Feb 18.",
        type: "REMINDER",
        read: false,
      },
      {
        userId: sarah.id,
        title: "Family Member Added",
        message: "Marcus Johnson has been added as a family member.",
        type: "FAMILY",
        read: true,
      },
      {
        userId: sarah.id,
        title: "New Report Available",
        message: "Your Lumbar Spine MRI report is now available to view.",
        type: "REPORT",
        read: false,
      },
    ],
  });

  console.log("Seeding complete!");
  console.log(`
Test accounts (all use password: Password123!@):
  Patient:  sarah.johnson@email.com
  Patient:  marcus.johnson@email.com
  Patient:  elena.garcia@email.com
  Provider: dr.chen@hospital.com
  Provider: dr.rodriguez@neurohealth.com
  Provider: dr.thompson@sportsmed.com
  Admin:    admin@healthapp.com
  `);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
