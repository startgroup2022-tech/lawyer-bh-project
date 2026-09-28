import {pgTable,uuid,varchar,boolean,timestamp,integer,index} from 'drizzle-orm/pg-core';
export const mobileClientAccounts=pgTable('mobile_client_accounts',{
  passwordHash:varchar('password_hash',{length:200}),
  id:uuid('id').primaryKey().defaultRandom(),email:varchar('email',{length:254}).notNull().unique(),
  fullName:varchar('full_name',{length:120}).notNull(),phone:varchar('phone',{length:16}).notNull(),
  emailVerifiedAt:timestamp('email_verified_at',{withTimezone:true}).defaultNow().notNull(),
  isActive:boolean('is_active').default(true).notNull(),createdAt:timestamp('created_at',{withTimezone:true}).defaultNow().notNull(),
});
export const mobileClientChallenges=pgTable('mobile_client_challenges',{
  passwordHash:varchar('password_hash',{length:200}),purpose:varchar('purpose',{length:16}).default('legacy').notNull(),
  id:uuid('id').primaryKey(),email:varchar('email',{length:254}).notNull().unique(),
  fullName:varchar('full_name',{length:120}),phone:varchar('phone',{length:16}),codeDigest:varchar('code_digest',{length:64}).notNull(),
  expiresAt:timestamp('expires_at',{withTimezone:true}).notNull(),attempts:integer('attempts').default(0).notNull(),
  delivered:boolean('delivered').default(false).notNull(),consumed:boolean('consumed').default(false).notNull(),
});
export const mobileClientSessions=pgTable('mobile_client_sessions',{
  tokenDigest:varchar('token_digest',{length:64}).primaryKey(),clientId:uuid('client_id').notNull().references(()=>mobileClientAccounts.id,{onDelete:'cascade'}),
  expiresAt:timestamp('expires_at',{withTimezone:true}).notNull(),createdAt:timestamp('created_at',{withTimezone:true}).defaultNow().notNull(),
},table=>[index('mobile_client_session_client_idx').on(table.clientId)]);
export const mobileClientAuthLimits=pgTable('mobile_client_auth_limits',{
  key:varchar('key',{length:64}).primaryKey(),count:integer('count').notNull(),resetAt:timestamp('reset_at',{withTimezone:true}).notNull(),lastAt:timestamp('last_at',{withTimezone:true}).notNull(),
});
