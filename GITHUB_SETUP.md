# GitHub Repository Setup Instructions

## Step 1: Create Repository on GitHub

1. Go to https://github.com/new
2. Fill in:
   - **Repository name**: `screener-app` (or your preferred name)
   - **Description**: "ESG Portfolio Screening Application"
   - **Visibility**: Choose Public or Private
   - **DO NOT** check "Add a README file" (we already have one)
   - **DO NOT** check "Add .gitignore" (we already have one)
   - **DO NOT** choose a license (unless you want to add one)
3. Click **"Create repository"**

## Step 2: Connect Local Repository to GitHub

After creating the repository, GitHub will show you commands. Use these:

```bash
# Add the remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/screener-app.git

# Rename the branch to 'main' (if it's not already)
git branch -M main

# Push your code to GitHub
git push -u origin main
```

## Alternative: Using SSH (if you have SSH keys set up)

If you prefer SSH instead of HTTPS:

```bash
git remote add origin git@github.com:YOUR_USERNAME/screener-app.git
git branch -M main
git push -u origin main
```

## Troubleshooting

### If you get authentication errors:
- Make sure you're logged into GitHub
- You may need to use a Personal Access Token instead of your password
- See: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token

### If the repository already exists:
```bash
# Remove the existing remote
git remote remove origin

# Add the correct remote
git remote add origin https://github.com/YOUR_USERNAME/screener-app.git
```

## Next Steps

Once your code is on GitHub:
- Your repository will be available at: `https://github.com/YOUR_USERNAME/screener-app`
- You can view your code, create issues, and collaborate with others
- Consider setting up GitHub Actions for CI/CD if needed
