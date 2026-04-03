import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Clean existing data (dev only) ────────────────────────
  await prisma.actionLog.deleteMany();
  await prisma.automationRun.deleteMany();
  await prisma.aIPolicy.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.publishTarget.deleteMany();
  await prisma.contentDraft.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.socialConnection.deleteMany();
  await prisma.roleBinding.deleteMany();
  await prisma.member.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.organization.deleteMany();

  // ─── Create Default Organization ───────────────────────────
  const org = await prisma.organization.create({
    data: {
      name: 'Social Bot',
      slug: 'social-bot',
      settings: {},
    },
  });
  console.log(`✅ Created organization: ${org.name} (${org.id})`);

  // ─── Create Default Workspace ──────────────────────────────
  const workspace = await prisma.workspace.create({
    data: {
      organizationId: org.id,
      name: 'Main',
      slug: 'main',
      description: 'Default workspace for multi-platform publishing',
    },
  });
  console.log(`✅ Created workspace: ${workspace.name} (${workspace.id})`);

  // ─── Create Admin User ─────────────────────────────────────
  const adminMember = await prisma.member.create({
    data: {
      organizationId: org.id,
      userId: 'admin-user-001',
      email: 'admin@socialbot.local',
      displayName: 'Admin User',
      avatarUrl: null,
    },
  });
  console.log(`✅ Created member: ${adminMember.email} (${adminMember.id})`);

  // ─── Assign Admin Role to Workspace ────────────────────────
  await prisma.roleBinding.create({
    data: {
      memberId: adminMember.id,
      workspaceId: workspace.id,
      role: 'OWNER',
    },
  });
  console.log(`✅ Assigned OWNER role to ${adminMember.email} in workspace ${workspace.slug}`);

  // ─── Create AI Policies (examples) ─────────────────────────
  await prisma.aIPolicy.create({
    data: {
      workspaceId: workspace.id,
      name: 'Default Caption Generator',
      action: 'GENERATE_CAPTION',
      prompt: 'Generate an engaging social media caption for this content. Keep it concise and include relevant emojis.',
      model: 'gpt-4',
      enabled: true,
      config: {},
    },
  });

  await prisma.aIPolicy.create({
    data: {
      workspaceId: workspace.id,
      name: 'Hashtag Suggester',
      action: 'SUGGEST_HASHTAGS',
      prompt: 'Suggest 5-10 relevant hashtags for this content. Focus on reach and engagement.',
      model: 'gpt-4',
      enabled: true,
      config: {},
    },
  });
  console.log('✅ Created default AI policies');

  // ─── Log Initial Action ────────────────────────────────────
  await prisma.actionLog.create({
    data: {
      organizationId: org.id,
      workspaceId: workspace.id,
      actorId: adminMember.id,
      level: 'INFO',
      action: 'system.seed',
      resourceType: 'organization',
      resourceId: org.id,
      payload: {
        message: 'Database seeded successfully',
        timestamp: new Date().toISOString(),
      },
      outcome: 'SUCCESS',
    },
  });

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Summary:');
  console.log(`   Organization: ${org.name} (${org.slug})`);
  console.log(`   Workspace:    ${workspace.name} (${workspace.slug})`);
  console.log(`   Admin Email:  ${adminMember.email}`);
  console.log(`   \n💡 Use this email to sign in via POST /api/v1/auth/login`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
