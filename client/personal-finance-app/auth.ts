import NextAuth, { CredentialsSignin } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import {
  authUsers,
  authAccounts,
  authSessions,
  authVerificationTokens,
} from "@/lib/db/schema";
import { verifyPassword } from "@/lib/password";
import { ensureUserProfileAndPlan } from "@/lib/user-init";
import { eq } from "drizzle-orm";

export class UnverifiedEmailError extends CredentialsSignin {
  code = "EMAIL_NOT_VERIFIED";
}

export class InvalidCredentialsError extends CredentialsSignin {
  code = "INVALID_CREDENTIALS";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: authUsers,
    accountsTable: authAccounts,
    sessionsTable: authSessions,
    verificationTokensTable: authVerificationTokens,
  }),
  session: { strategy: "jwt" },
  trustHost: true,
  secret:
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "personal-finance-secure-auth-jwt-secret-2026",
  providers: [
    Google,
    Credentials({
      id: "credentials",
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = String(credentials.email).toLowerCase().trim();
        const password = String(credentials.password);

        const user = await db.query.authUsers.findFirst({
          where: eq(authUsers.email, email),
        });

        if (!user || !user.password) {
          throw new InvalidCredentialsError();
        }

        const isValid = verifyPassword(password, user.password);
        if (!isValid) {
          throw new InvalidCredentialsError();
        }

        // Require email verification before allowing credentials login
        if (!user.emailVerified) {
          throw new UnverifiedEmailError();
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  events: {
    async createUser({ user }) {
      if (user.id) {
        await ensureUserProfileAndPlan(user.id);
      }
    },
  },
  callbacks: {
    async signIn({ user }) {
      if (user?.id) {
        await ensureUserProfileAndPlan(user.id);
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        if (token.id) {
          session.user.id = token.id as string;
        } else if (token.sub) {
          session.user.id = token.sub;
        }
        if (token.email) {
          session.user.email = token.email as string;
        }
        if (token.name) {
          session.user.name = token.name as string;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});