import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import { checkRateLimit, clearRateLimit, AUTH_RATE_LIMIT } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    newUser: "/register",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;

        const rateLimitKey = `login:${email}`;
        const rateCheck = checkRateLimit(rateLimitKey, AUTH_RATE_LIMIT);
        if (!rateCheck.allowed) {
          throw new Error("Too many login attempts. Try again later.");
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          await logAudit({
            action: "LOGIN",
            details: `Failed login attempt for ${email}`,
          });
          return null;
        }

        clearRateLimit(rateLimitKey);

        // If MFA is enabled, return user with mfaPending flag for frontend to handle
        if (user.mfaEnabled) {
          await logAudit({
            userId: user.id,
            action: "LOGIN",
            details: "Login requires MFA verification",
          });
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            mfaPending: true,
          };
        }

        await logAudit({
          userId: user.id,
          action: "LOGIN",
          details: `Login as ${user.role}`,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as unknown as { role: string }).role;
        token.mfaPending = (user as unknown as { mfaPending?: boolean }).mfaPending || false;

        // Set default active organization
        const membership = await prisma.organizationMember.findFirst({
          where: { userId: user.id },
          orderBy: { createdAt: "asc" },
        });
        token.activeOrganizationId = membership?.organizationId || null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.activeOrganizationId = token.activeOrganizationId as string | null;
        session.user.mfaPending = (token.mfaPending as boolean) || false;
      }
      return session;
    },
  },
};
