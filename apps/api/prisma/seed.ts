import { PrismaClient, Role, ProjectStatus, TaskStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  const now = new Date();

  // ==========================================
  // 1. Create Organization
  // ==========================================
  const organization = await prisma.organization.upsert({
    where: { domain: 'acmecorp.local' },
    update: {
      name: 'Acme Corporation',
    },
    create: {
      name: 'Acme Corporation',
      domain: 'acmecorp.local',
    },
  });
  console.log(`✅ Organization created/verified: ${organization.name}`);

  // ==========================================
  // 2. Create Users (Deterministic Updates)
  // ==========================================
  const salt = await bcrypt.genSalt(10);
  const seedPasswordRaw = process.env.SEED_PASSWORD || 'Password@123';
  const defaultPassword = await bcrypt.hash(seedPasswordRaw, salt);

  const [superAdmin, manager, developer] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@acmecorp.local' },
      update: {
        firstName: 'System',
        lastName: 'Admin',
        role: Role.SUPER_ADMIN,
        // Optional: Update password during seed re-runs if environment variable changes
        // passwordHash: defaultPassword, 
      },
      create: {
        email: 'admin@acmecorp.local',
        passwordHash: defaultPassword,
        firstName: 'System',
        lastName: 'Admin',
        role: Role.SUPER_ADMIN,
        organizationId: organization.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'manager@acmecorp.local' },
      update: {
        firstName: 'Project',
        lastName: 'Manager',
        role: Role.MANAGER,
      },
      create: {
        email: 'manager@acmecorp.local',
        passwordHash: defaultPassword,
        firstName: 'Project',
        lastName: 'Manager',
        role: Role.MANAGER,
        organizationId: organization.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'dev@acmecorp.local' },
      update: {
        firstName: 'Lead',
        lastName: 'Developer',
        role: Role.USER,
      },
      create: {
        email: 'dev@acmecorp.local',
        passwordHash: defaultPassword,
        firstName: 'Lead',
        lastName: 'Developer',
        role: Role.USER,
        organizationId: organization.id,
      },
    })
  ]);
  console.log(`✅ Users created/verified: Admin, Manager, Developer`);

  // ==========================================
  // 3. Create Client
  // ==========================================
  const clientEmail = 'contact@globex.com';
  
  const client = await prisma.client.upsert({
    where: {
      organizationId_email: {
        organizationId: organization.id,
        email: clientEmail,
      }
    },
    update: {
      name: 'Globex Industries',
      phone: '+1-555-0198',
      companyName: 'Globex Inc.',
    },
    create: {
      name: 'Globex Industries',
      email: clientEmail,
      phone: '+1-555-0198',
      companyName: 'Globex Inc.',
      organizationId: organization.id,
    }
  });
  console.log(`✅ Client created/verified: ${client.name}`);

  // ==========================================
  // 4. Create Project
  // ==========================================
  const threeMonthsLater = new Date(now.getTime());
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

  const project = await prisma.project.upsert({
    where: {
      organizationId_name: {
        organizationId: organization.id,
        name: 'E-Commerce Platform Redesign',
      }
    },
    update: {
      description: 'Complete overhaul of the B2C e-commerce frontend.',
    },
    create: {
      name: 'E-Commerce Platform Redesign',
      description: 'Complete overhaul of the B2C e-commerce frontend.',
      status: ProjectStatus.ACTIVE,
      startDate: now,
      endDate: threeMonthsLater,
      clientId: client.id,
      organizationId: organization.id,
    }
  });
  console.log(`✅ Project created/verified: ${project.name}`);

  // ==========================================
  // 5. Create Tasks
  // ==========================================
  const taskNames = ['Design System Setup', 'API Integration', 'Payment Gateway Testing'];
  const tasks = [];

  for (let i = 0; i < taskNames.length; i++) {
    const dueDate = new Date(now.getTime());
    dueDate.setDate(dueDate.getDate() + (i * 5));

    const task = await prisma.task.upsert({
      where: {
        projectId_name: {
          projectId: project.id,
          name: taskNames[i],
        }
      },
      update: {
        description: `Description for ${taskNames[i]}`,
      },
      create: {
        name: taskNames[i],
        description: `Description for ${taskNames[i]}`,
        status: i === 0 ? TaskStatus.COMPLETED : (i === 1 ? TaskStatus.IN_PROGRESS : TaskStatus.TODO),
        dueDate,
        projectId: project.id,
        assignedToId: developer.id,
        organizationId: organization.id,
      }
    });
    
    tasks.push(task);
  }
  console.log(`✅ Tasks created/verified: ${tasks.length} tasks`);

  // ==========================================
  // 6. Create Time Entries
  // ==========================================
  const existingTimeEntries = await prisma.timeEntry.count({
    where: { taskId: tasks[0].id }
  });

  if (existingTimeEntries === 0) {
    await prisma.timeEntry.createMany({
      data: [
        {
          date: now,
          duration: 120,
          description: 'Initial project setup and repository creation',
          isBillable: true,
          projectId: project.id,
          taskId: tasks[0].id,
          userId: developer.id,
          organizationId: organization.id,
        },
        {
          date: now,
          duration: 45,
          description: 'Team sync and planning',
          isBillable: false,
          projectId: project.id,
          taskId: tasks[0].id,
          userId: manager.id,
          organizationId: organization.id,
        }
      ]
    });
    console.log(`✅ Time Entries seeded successfully`);
  } else {
    console.log(`✅ Time Entries already exist, skipping creation`);
  }

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
