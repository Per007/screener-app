# Security Best Practices

## 🔒 Environment Variables

### Required Environment Variables

Your application requires the following environment variables to run securely:

1. **DATABASE_URL** - PostgreSQL connection string from Supabase
2. **JWT_SECRET** - Secret key for JWT token signing (minimum 32 characters)
3. **PORT** (optional) - Server port (defaults to 3000)

### Setup Instructions

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Generate a strong JWT secret:
   ```bash
   # On Linux/Mac:
   openssl rand -base64 32
   
   # On Windows (PowerShell):
   [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
   ```

3. Get your DATABASE_URL from Supabase:
   - Go to your Supabase project
   - Navigate to Settings → Database
   - Copy the "Connection String" (use the pooler for better performance)

4. Fill in the `.env` file with your actual values

### ⚠️ CRITICAL SECURITY WARNINGS

- **NEVER commit `.env` files to Git** - They are already in `.gitignore`
- **NEVER use default or weak JWT secrets in production**
- **NEVER share your `.env` file or credentials publicly**
- **Rotate credentials immediately if exposed**

## 🛡️ Row Level Security (RLS)

This application uses Supabase with Row Level Security enabled to protect data access.

### Enabling RLS

Run the SQL script to enable RLS on all tables:

```bash
# The script is located at: scripts/enable_rls.sql
# Run it in your Supabase SQL editor
```

### What RLS Does

- Ensures users can only access data they're authorized to see
- Prevents unauthorized data modification
- Adds an extra layer of security beyond application-level checks

## 📋 Security Checklist

Before deploying to production:

- [ ] Strong JWT_SECRET is set (minimum 32 characters)
- [ ] DATABASE_URL uses connection pooling
- [ ] `.env` file is in `.gitignore`
- [ ] No credentials are hardcoded in source code
- [ ] RLS is enabled on all Supabase tables
- [ ] RLS policies are tested and working
- [ ] HTTPS is enforced in production
- [ ] CORS is properly configured for your domain

## 🔄 Credential Rotation

If you suspect your credentials have been exposed:

1. **Immediately** generate new credentials in Supabase
2. Update your `.env` file with the new values
3. Restart your application
4. Invalidate all existing JWT tokens (users will need to re-login)

## 📚 Additional Resources

- [Supabase Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)
