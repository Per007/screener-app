-- Enable Row Level Security on public tables to address security warnings
-- Run this script in your Supabase SQL Editor

ALTER TABLE "public"."ClientParameter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ScreeningCompanyResult" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ScreeningResult" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Rule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."CompanyParameterValue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Portfolio" ENABLE ROW LEVEL SECURITY;

-- Note: No policies are added because the application uses the service role (Postgres admin) via Prisma.
-- Enabling RLS without policies denies access to 'anon' and 'authenticated' (public) roles, which is the desired security hardening.
