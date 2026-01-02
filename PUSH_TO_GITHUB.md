# 🚀 Quick Guide: Push to GitHub

## Step 1: Create Repository on GitHub

1. Go to: **https://github.com/new**
2. Fill in:
   - **Repository name**: `screener-app` (or your choice)
   - **Description**: "ESG Portfolio Screening Application"
   - **Visibility**: Public or Private
   - **⚠️ IMPORTANT**: Do NOT check any boxes (no README, no .gitignore, no license)
3. Click **"Create repository"**

## Step 2: Copy Your Repository URL

After creating, GitHub will show you a page. You'll see a URL like:
- `https://github.com/YOUR_USERNAME/screener-app.git`

**Copy this URL** - you'll need it in the next step!

## Step 3: Run These Commands

After you create the repository, come back here and I'll help you run these commands:

```bash
# Add GitHub as remote (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/screener-app.git

# Rename branch to 'main' (GitHub's default)
git branch -M main

# Push your code to GitHub
git push -u origin main
```

## What Each Command Does

1. **`git remote add origin`** - Connects your local repository to GitHub
2. **`git branch -M main`** - Renames your branch from 'master' to 'main' (GitHub standard)
3. **`git push -u origin main`** - Uploads all your code to GitHub

## Need Help?

Just tell me:
- Your GitHub username
- The repository name you created

And I'll give you the exact commands to run!
