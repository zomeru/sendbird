import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      sendbirdUserId: string;
    } & DefaultSession["user"];
  }

  interface User {
    sendbirdUserId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sendbirdUserId: string;
  }
}
