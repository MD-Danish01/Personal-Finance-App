import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
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