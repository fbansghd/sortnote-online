import GoogleProvider from 'next-auth/providers/google'
import type { NextAuthOptions } from 'next-auth'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, token, user }) {
      // Ensure session.user.id is populated from token.sub or user.id
      if (session.user) {
        if (token?.sub) session.user.id = token.sub
        else if (user && typeof (user as { id?: string }).id === 'string') {
          session.user.id = (user as { id?: string }).id!
        }
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        const userId = (user as { id?: string }).id
        if (userId) token.sub = userId
      }
      return token
    },
  },
}

export default authOptions