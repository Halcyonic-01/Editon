import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { db } from "./lib/db"
import authConfig from "./auth.config"
import { getUserById } from "./modules/auth/actions"
export const { handlers, signIn, signOut, auth } = NextAuth({
    callbacks: {
        async signIn({ user, account, profile }) {
            if (!user || !account) return false;
      
            // Check if the user already exists
            const existingUser = await db.user.findUnique({
              where: { email: user.email! },
            });
      
            // If user does not exist, create a new one
            if (!existingUser) {
              const newUser = await db.user.create({
                data: {
                  email: user.email!,
                  name: user.name,
                  image: user.image,
                 
                  accounts: {
                    // @ts-expect-error prisma adapter type mismatch
                    create: {
                      type: account.type,
                      provider: account.provider,
                      providerAccountId: account.providerAccountId,
                      refreshToken: account.refresh_token,
                      accessToken: account.access_token,
                      expiresAt: account.expires_at,
                      tokenType: account.token_type,
                      scope: account.scope,
                      idToken: account.id_token,
                      sessionState: account.session_state,
                    },
                  },
                },
              });
      
              if (!newUser) return false; // Return false if user creation fails
            } else {
              // Link the account if user exists
              const existingAccount = await db.account.findUnique({
                where: {
                  provider_providerAccountId: {
                    provider: account.provider,
                    providerAccountId: account.providerAccountId,
                  },
                },
              });
      
              // If the account does not exist, create it
              if (!existingAccount) {
                await db.account.create({
                  data: {
                    userId: existingUser.id,
                    type: account.type,
                    provider: account.provider,
                    providerAccountId: account.providerAccountId,
                    refreshToken: account.refresh_token,
                    accessToken: account.access_token,
                    expiresAt: account.expires_at,
                    tokenType: account.token_type,
                    scope: account.scope,
                    idToken: account.id_token,
                    // @ts-expect-error prisma adapter type mismatch
                    sessionState: account.session_state,
                  },
                });
              }
            }
      
            return true;
          },
        async jwt({ token }) {
            if (!token.sub) return token; // sub is like id
            const existingUser = await getUserById(token.sub)
            if(!existingUser) return token

            token.name = existingUser.name
            token.email = existingUser.email
            token.role = existingUser.role
            return token
        },
        async session({session,token}) {  //attach the userid from token to session
            if(token.sub && session.user){
                session.user.id = token.sub
            }
            if(token.sub && session.user){
                session.user.role = token.role
            }
            return session
        }
    },
    adapter: PrismaAdapter(db),
    ...authConfig,
    secret: process.env.AUTH_SECRET,
})