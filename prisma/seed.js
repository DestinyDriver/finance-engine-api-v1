const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const categories = [
    { name: "Salary", description: "Monthly salary", color: "#10B981" },
    {
      name: "Investments",
      description: "Investment returns",
      color: "#3B82F6",
    },
    { name: "Housing", description: "Rent and mortgage", color: "#F59E0B" },
    { name: "Food", description: "Groceries and dining", color: "#EF4444" },
    { name: "Transport", description: "Transit and fuel", color: "#6366F1" },
    { name: "Healthcare", description: "Medical expenses", color: "#EC4899" },
    {
      name: "Entertainment",
      description: "Leisure and subscriptions",
      color: "#14B8A6",
    },
  ];

  await Promise.all(
    categories.map((category) =>
      prisma.category.upsert({
        where: { name: category.name },
        update: {},
        create: category,
      }),
    ),
  );

  const users = [
    {
      email: "admin@financedash.com",
      password: await bcrypt.hash("Admin@123456", 12),
      firstName: "System",
      lastName: "Admin",
      role: "ADMIN",
      status: "ACTIVE",
    },
    {
      email: "analyst@financedash.com",
      password: await bcrypt.hash("Analyst@123456", 12),
      firstName: "Jane",
      lastName: "Smith",
      role: "ANALYST",
      status: "ACTIVE",
    },
    {
      email: "viewer@financedash.com",
      password: await bcrypt.hash("Viewer@123456", 12),
      firstName: "John",
      lastName: "Doe",
      role: "VIEWER",
      status: "ACTIVE",
    },
  ];

  await Promise.all(
    users.map((user) =>
      prisma.user.upsert({
        where: { email: user.email },
        update: {},
        create: user,
      }),
    ),
  );

  const admin = await prisma.user.findUnique({
    where: { email: "admin@financedash.com" },
  });
  const salary = await prisma.category.findUnique({
    where: { name: "Salary" },
  });
  const food = await prisma.category.findUnique({ where: { name: "Food" } });
  const housing = await prisma.category.findUnique({
    where: { name: "Housing" },
  });
  const transport = await prisma.category.findUnique({
    where: { name: "Transport" },
  });
  const investments = await prisma.category.findUnique({
    where: { name: "Investments" },
  });

  const now = new Date();
  const transactions = [];

  for (let monthOffset = 0; monthOffset < 6; monthOffset += 1) {
    const monthDate = new Date(
      now.getFullYear(),
      now.getMonth() - monthOffset,
      1,
    );
    transactions.push(
      {
        amount: 8500,
        type: "INCOME",
        description: `Salary for ${monthDate.toLocaleString("default", { month: "long", year: "numeric" })}`,
        date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 5),
        categoryId: salary.id,
        userId: admin.id,
      },
      {
        amount: 250,
        type: "INCOME",
        description: `Investment return ${monthDate.toLocaleString("default", { month: "long" })}`,
        date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 15),
        categoryId: investments.id,
        userId: admin.id,
      },
      {
        amount: 1800,
        type: "EXPENSE",
        description: "Rent payment",
        date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 3),
        categoryId: housing.id,
        userId: admin.id,
      },
      {
        amount: 420,
        type: "EXPENSE",
        description: "Groceries",
        date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 10),
        categoryId: food.id,
        userId: admin.id,
      },
      {
        amount: 85,
        type: "EXPENSE",
        description: "Public transit",
        date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 18),
        categoryId: transport.id,
        userId: admin.id,
      },
    );
  }

  await prisma.transaction.createMany({
    data: transactions,
    skipDuplicates: true,
  });

  console.log("Seed completed successfully");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
