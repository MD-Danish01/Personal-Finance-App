import "dotenv/config";
import { db, schema } from "../lib/db";
import { eq, and } from "drizzle-orm";

async function main() {
  console.log("🌱 Starting demo data seeding for Personal Finance App...");

  // 1. Get or create primary demo user
  let user = await db.query.authUsers.findFirst();

  if (!user) {
    console.log("Creating default demo user...");
    const [created] = await db
      .insert(schema.authUsers)
      .values({
        name: "Danish Demo",
        email: "demo@personalfinance.app",
        image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      })
      .returning();
    user = created;
  }

  console.log(`👤 Seeding for user: ${user.name} (${user.id})`);

  // 2. Financial Profile (Monthly Income: ₹85,000 = 85,00,000 paise)
  const monthlyIncomePaise = 8500000;
  const existingProfile = await db.query.financialProfiles.findFirst({
    where: eq(schema.financialProfiles.userId, user.id),
  });

  if (existingProfile) {
    await db
      .update(schema.financialProfiles)
      .set({
        monthlyIncome: monthlyIncomePaise,
        essentialsPercent: 50,
        savingsPercent: 20,
        enjoymentPercent: 20,
        bufferPercent: 10,
        emergencyMonthsTarget: 6,
        themeColor: "emerald",
        themeMode: "system",
        onboardingCompleted: true,
        updatedAt: new Date(),
      })
      .where(eq(schema.financialProfiles.userId, user.id));
  } else {
    await db.insert(schema.financialProfiles).values({
      userId: user.id,
      monthlyIncome: monthlyIncomePaise,
      currency: "INR",
      essentialsPercent: 50,
      savingsPercent: 20,
      enjoymentPercent: 20,
      bufferPercent: 10,
      emergencyMonthsTarget: 6,
      themeColor: "emerald",
      themeMode: "system",
      onboardingCompleted: true,
    });
  }

  // 3. Current Month Active Plan
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  let plan = await db.query.plans.findFirst({
    where: and(
      eq(schema.plans.userId, user.id),
      eq(schema.plans.month, currentMonth),
      eq(schema.plans.year, currentYear),
    ),
  });

  if (!plan) {
    const [createdPlan] = await db
      .insert(schema.plans)
      .values({
        userId: user.id,
        month: currentMonth,
        year: currentYear,
        monthlyIncome: monthlyIncomePaise,
        status: "active",
        whyThisPlan:
          "50/20/20/10 split ensures essentials like rent and bills are secured while systematically building long-term wealth and emergency liquidity.",
      })
      .returning();
    plan = createdPlan;

    // Plan allocations
    const allocations: { key: typeof schema.allocationKeyEnum.enumValues[number]; percent: number }[] = [
      { key: "essentials", percent: 50 },
      { key: "enjoyment", percent: 20 },
      { key: "emergency", percent: 10 },
      { key: "future_savings", percent: 10 },
      { key: "buffer", percent: 10 },
    ];

    for (const alloc of allocations) {
      await db.insert(schema.planAllocations).values({
        planId: plan.id,
        key: alloc.key,
        percent: alloc.percent,
        amount: Math.round((monthlyIncomePaise * alloc.percent) / 100),
      });
    }
  }

  // 4. Category Limits
  const sampleLimits = [
    { category: "Food" as const, monthlyLimit: 900000 }, // ₹9,000
    { category: "Shopping" as const, monthlyLimit: 600000 }, // ₹6,000
    { category: "Transport" as const, monthlyLimit: 400000 }, // ₹4,000
    { category: "Entertainment" as const, monthlyLimit: 300000 }, // ₹3,000
    { category: "Bills" as const, monthlyLimit: 2500000 }, // ₹25,000
  ];

  for (const lim of sampleLimits) {
    const existingLim = await db.query.limits.findFirst({
      where: and(eq(schema.limits.userId, user.id), eq(schema.limits.category, lim.category)),
    });

    if (existingLim) {
      await db
        .update(schema.limits)
        .set({ monthlyLimit: lim.monthlyLimit, updatedAt: new Date() })
        .where(eq(schema.limits.id, existingLim.id));
    } else {
      await db.insert(schema.limits).values({
        userId: user.id,
        category: lim.category,
        monthlyLimit: lim.monthlyLimit,
      });
    }
  }

  // 5. Emergency Fund Corpus
  const targetEmergencyPaise = Math.round(monthlyIncomePaise * 0.5 * 6); // ₹2,55,000
  const currentEmergencyPaise = 13500000; // ₹1,35,000 (~3.2 months)

  const existingFund = await db.query.emergencyFunds.findFirst({
    where: eq(schema.emergencyFunds.userId, user.id),
  });

  if (existingFund) {
    await db
      .update(schema.emergencyFunds)
      .set({
        targetAmount: targetEmergencyPaise,
        currentAmount: currentEmergencyPaise,
        updatedAt: new Date(),
      })
      .where(eq(schema.emergencyFunds.userId, user.id));
  } else {
    await db.insert(schema.emergencyFunds).values({
      userId: user.id,
      targetAmount: targetEmergencyPaise,
      currentAmount: currentEmergencyPaise,
    });
  }

  // 6. Connected Bank Account via Setu
  const existingAccount = await db.query.connectedFinancialAccounts.findFirst({
    where: eq(schema.connectedFinancialAccounts.userId, user.id),
  });

  if (!existingAccount) {
    await db.insert(schema.connectedFinancialAccounts).values({
      userId: user.id,
      fipId: "HDFC",
      fipName: "HDFC Bank",
      maskedAccountNumber: "XXXX-4821",
      accountType: "SAVINGS",
    });
  }

  // 7. Goals & Goal Contributions
  const sampleGoals = [
    {
      name: "Emergency Fund Buffer",
      icon: "🛡️",
      targetAmount: 30000000, // ₹3,00,000
      currentAmount: 18000000, // ₹1,80,000
      monthlyTarget: 1500000, // ₹15,000/mo
      deadline: "2026-12-31",
      status: "on_track" as const,
    },
    {
      name: "Goa Vacation 🌴",
      icon: "🏖️",
      targetAmount: 6000000, // ₹60,000
      currentAmount: 4200000, // ₹42,000
      monthlyTarget: 1000000, // ₹10,000/mo
      deadline: "2026-10-15",
      status: "on_track" as const,
    },
    {
      name: "MacBook Pro M3",
      icon: "💻",
      targetAmount: 16000000, // ₹1,60,000
      currentAmount: 6500000, // ₹65,000
      monthlyTarget: 2000000, // ₹20,000/mo
      deadline: "2026-11-30",
      status: "at_risk" as const,
    },
  ];

  for (const g of sampleGoals) {
    const existingG = await db.query.goals.findFirst({
      where: and(eq(schema.goals.userId, user.id), eq(schema.goals.name, g.name)),
    });

    if (!existingG) {
      const [insertedGoal] = await db.insert(schema.goals).values({
        userId: user.id,
        name: g.name,
        icon: g.icon,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        monthlyTarget: g.monthlyTarget,
        deadline: g.deadline,
        status: g.status,
      }).returning();

      // Add sample contribution
      await db.insert(schema.goalContributions).values({
        goalId: insertedGoal.id,
        amount: 500000, // ₹5,000
        note: "Monthly savings allocation",
      });
    }
  }

  // 8. Sample Transactions (This month)
  const todayStr = now.toISOString().slice(0, 10);
  const sampleTxs = [
    {
      amount: 8500000,
      type: "income" as const,
      category: "Others" as const,
      merchant: "Tech Corp Payroll",
      description: "Monthly Salary Credit",
      transactionDate: todayStr,
      source: "MANUAL" as const,
    },
    {
      amount: 2200000,
      type: "expense" as const,
      category: "Bills" as const,
      merchant: "House Rent",
      description: "Apartment Monthly Rent",
      transactionDate: todayStr,
      source: "ACCOUNT_AGGREGATOR" as const,
    },
    {
      amount: 48000,
      type: "expense" as const,
      category: "Food" as const,
      merchant: "Swiggy",
      description: "Dinner order",
      transactionDate: todayStr,
      source: "ACCOUNT_AGGREGATOR" as const,
    },
    {
      amount: 125000,
      type: "expense" as const,
      category: "Shopping" as const,
      merchant: "Amazon",
      description: "Wireless Keyboard & Mouse",
      transactionDate: todayStr,
      source: "ACCOUNT_AGGREGATOR" as const,
    },
    {
      amount: 29000,
      type: "expense" as const,
      category: "Transport" as const,
      merchant: "Uber",
      description: "Ride to Office",
      transactionDate: todayStr,
      source: "ACCOUNT_AGGREGATOR" as const,
    },
    {
      amount: 64900,
      type: "expense" as const,
      category: "Entertainment" as const,
      merchant: "Netflix",
      description: "Premium Plan Subscription",
      transactionDate: todayStr,
      source: "ACCOUNT_AGGREGATOR" as const,
    },
    {
      amount: 145000,
      type: "expense" as const,
      category: "Bills" as const,
      merchant: "Airtel Broadband",
      description: "Fiber Internet bill",
      transactionDate: todayStr,
      source: "ACCOUNT_AGGREGATOR" as const,
    },
    {
      amount: 72000,
      type: "expense" as const,
      category: "Food" as const,
      merchant: "Zomato",
      description: "Weekend lunch delivery",
      transactionDate: todayStr,
      source: "MANUAL" as const,
    },
  ];

  for (const tx of sampleTxs) {
    await db.insert(schema.transactions).values({
      userId: user.id,
      amount: tx.amount,
      type: tx.type,
      category: tx.category,
      merchant: tx.merchant,
      description: tx.description,
      transactionDate: tx.transactionDate,
      source: tx.source,
    });
  }

  // 9. Insights
  const sampleInsights = [
    {
      title: "Strong Savings Momentum",
      description:
        "You are on track to save 28% of your income this month, exceeding your 20% baseline target.",
      tone: "positive" as const,
    },
    {
      title: "Dining Out Trend",
      description:
        "Food spending has reached 45% of your monthly cap. Consider cooking over the weekend to stay comfortably within budget.",
      tone: "info" as const,
    },
    {
      title: "Emergency Runway Protected",
      description:
        "Your liquid cushion covers 3.2 months of essential expenditure. Aim for 6 months for complete financial resilience.",
      tone: "positive" as const,
    },
  ];

  for (const ins of sampleInsights) {
    await db.insert(schema.insights).values({
      userId: user.id,
      title: ins.title,
      description: ins.description,
      tone: ins.tone,
    });
  }

  console.log("✅ Demo data seeded successfully! All screens now have rich content.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
