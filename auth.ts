import NextAuth, { type NextAuthOptions, type DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { minutesUntil, rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { rateLimitKey } from "@/lib/client-ip";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "admin@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        // Brute-force protection: cap attempts per IP and per account.
        const [byIp, byAccount] = await Promise.all([
          rateLimit(RATE_LIMITS.login, rateLimitKey(req?.headers)),
          rateLimit(RATE_LIMITS.loginAccount, `email:${credentials.email.toLowerCase().trim()}`),
        ]);
        if (!byIp.ok || !byAccount.ok) {
          const wait = minutesUntil(byIp.ok ? byAccount : byIp);
          throw new Error(`Too many sign-in attempts. Try again in ${wait} minute${wait === 1 ? "" : "s"}.`);
        }

        try {
          await connectDB();

          const user = await User.findOne({ email: credentials.email }).select("+password");

          if (!user) {
            throw new Error("User not found");
          }

          const isPasswordValid = await user.comparePassword(credentials.password as string);

          if (!isPasswordValid) {
            throw new Error("Invalid password");
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          throw new Error(error instanceof Error ? error.message : "Authentication failed");
        }
      },
    }),
  ],
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};
