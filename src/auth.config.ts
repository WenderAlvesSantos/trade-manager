import type { NextAuthConfig } from "next-auth";

const PUBLIC_ROUTES = ["/login"];

// Config leve (sem Prisma/bcrypt) para ser usada também pelo proxy.ts.
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = Boolean(auth?.user);
      const isPublicRoute = PUBLIC_ROUTES.includes(nextUrl.pathname);

      if (isPublicRoute) {
        return isLoggedIn ? Response.redirect(new URL("/", nextUrl)) : true;
      }
      return isLoggedIn;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;
