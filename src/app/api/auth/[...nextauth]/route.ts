import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";

const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter your email and password");
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error("Invalid email or password.");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password || ""
        );

        if (!isValid) {
          throw new Error("Invalid email or password.");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          sendbirdUserId: user.sendbirdUserId,
          nickname: user.nickname,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          sendbirdUserId: `google_${profile.sub}`, // Create a unique Sendbird user ID
          nickname: profile.name, // Use name as nickname for Sendbird
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sendbirdUserId = user.sendbirdUserId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.sendbirdUserId = token.sendbirdUserId;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && user.email) {
        try {
          const existingUser = await db.user.findUnique({
            where: { email: user.email },
          });

          // Hash the default password
          const defaultPassword = "password123";
          const hashedPassword = await bcrypt.hash(defaultPassword, 12);

          if (!existingUser) {
            // Create new user in our database with default password
            await db.user.create({
              data: {
                email: user.email,
                name: user.name || "",
                sendbirdUserId: `google_${profile?.sub || nanoid()}`,
                nickname: user.name || "User",
                profileImageUrl: user.image || null,
                password: hashedPassword,
              },
            });
          } else {
            // Update existing user with default password
            await db.user.update({
              where: { email: user.email },
              data: {
                password: hashedPassword,
                name: user.name || existingUser.name,
                profileImageUrl: user.image || existingUser.profileImageUrl,
              },
            });
          }
        } catch (error) {
          console.error("Error during Google sign in:", error);
          return false;
        }
      }
      return true;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
