import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import {
  authUsers,
  authAccounts,
  authSessions,
  authVerificationTokens,
} from "@/lib/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: authUsers,
    accountsTable: authAccounts,
    sessionsTable: authSessions,
    verificationTokensTable: authVerificationTokens,
  }),
  // JWT strategy is the default in Auth.js v5 — sessions live in encrypted
  // cookies, no DB lookup per request. The adapter still persists users and
  // OAuth account links in Postgres.
  providers: [Google],
  callbacks: {
    authorized({ auth: session }) {
      return !!session?.user;
    },
  },
  pages: {
    signIn: "/login",
  },
});