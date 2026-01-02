# 📁 GitHub Drag-and-Drop Upload Guide

## ⚠️ Important Note

**Since we already have a Git repository initialized locally, I recommend using Git commands to push your code** (see `GITHUB_SETUP.md`). However, if you prefer to drag and drop files, here's how:

---

## 🎯 Where to Drag Files: **ROOT LEVEL**

When you drag files to GitHub, you should drag them to the **root level** of the repository (the main page where you see the file list).

### Your Project Structure (What Goes Where)

```
📦 screener-app/                    ← This is the ROOT level (drag files here)
│
├── 📄 README.md                    ← Root level files
├── 📄 package.json
├── 📄 .gitignore
├── 📄 tsconfig.json
│
├── 📁 src/                         ← Root level folders
│   ├── app.ts
│   ├── index.ts
│   ├── routes/
│   ├── services/
│   └── ...
│
├── 📁 esg-frontend/                ← Root level folders
│   ├── package.json
│   ├── src/
│   └── ...
│
├── 📁 prisma/                      ← Root level folders
│   ├── schema.prisma
│   └── seed.ts
│
└── 📁 .claude/                     ← Root level folders
    └── settings.local.json
```

---

## 📤 How to Drag Files to GitHub

### Step 1: Create an Empty Repository on GitHub

1. Go to https://github.com/new
2. Create a repository:
   - **Name**: `screener-app`
   - **DO NOT** check "Add a README file"
   - **DO NOT** check "Add .gitignore"
   - Leave it completely empty
3. Click **"Create repository"**

### Step 2: Navigate to Your Repository

After creating, you'll see a page that says "Quick setup" or shows an empty repository.

### Step 3: Drag Files to the Root Level

1. **Click the "uploading an existing file" link** (or go directly to the upload page)
2. **Drag your entire project folder structure** to the upload area
   - You can drag the entire `SCREENER_APP` folder
   - OR drag individual files and folders one by one

### Step 4: What to Drag

**Drag these folders and files from your `SCREENER_APP` directory:**

✅ **Root Level Items to Drag:**
- `src/` folder (entire folder)
- `esg-frontend/` folder (entire folder)
- `prisma/` folder (entire folder)
- `.claude/` folder (entire folder)
- `README.md`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `.gitignore`
- All `.md` files (documentation)
- `api-tests.http`
- `postman-collection.json`
- `test_backend.js`
- `test-api.sh`

❌ **DO NOT Drag:**
- `node_modules/` (excluded by .gitignore)
- `dist/` (excluded by .gitignore)
- `.env` files (excluded by .gitignore)
- `.git/` folder (Git metadata)

---

## 🖼️ Visual Guide: Where to Drop Files

When you're on the GitHub upload page, you'll see something like:

```
┌─────────────────────────────────────┐
│  screener-app                       │
│                                     │
│  [Drag files here to upload]        │  ← Drop files HERE (root level)
│                                     │
│  Or choose your files               │
└─────────────────────────────────────┘
```

**This is the root level** - drag all your folders and files here.

---

## 📋 Step-by-Step: Drag Entire Project

### Option A: Drag Everything at Once

1. Open File Explorer
2. Navigate to `C:\Users\stuur\MY_CODE\SCREENER_APP`
3. Select ALL files and folders (Ctrl+A)
4. Drag them to the GitHub upload area

### Option B: Drag Folders One by One

1. Drag `src/` folder → Drop at root level
2. Drag `esg-frontend/` folder → Drop at root level
3. Drag `prisma/` folder → Drop at root level
4. Drag `.claude/` folder → Drop at root level
5. Drag all root-level files (README.md, package.json, etc.)

---

## ⚠️ Important Notes

1. **Folder Structure is Preserved**: When you drag a folder, GitHub maintains the folder structure. So if you drag `src/routes/auth.ts`, it will create `src/routes/auth.ts` in the repository.

2. **Root Level = Top Level**: The root level is the main directory of your repository - the same level where `README.md` sits.

3. **Don't Create Nested Folders**: Don't drag files into a subfolder unless that's where they belong. For example:
   - ✅ Correct: Drag `src/` to root → Creates `src/` at root
   - ❌ Wrong: Drag `src/` into another folder → Creates nested structure

4. **File Limits**: GitHub has limits on file sizes (100MB per file, 1GB per repository for free accounts).

---

## 🚀 Better Alternative: Use Git Push

Since we already have Git initialized, **pushing via Git is recommended** because:
- ✅ Preserves Git history
- ✅ Faster for large projects
- ✅ Better for collaboration
- ✅ Maintains commit history

See `GITHUB_SETUP.md` for Git push instructions.

---

## 🎓 Understanding Repository Structure

Think of the GitHub repository like a file cabinet:

```
📁 Repository (Root Level)
  ├── 📄 README.md          ← Top drawer
  ├── 📁 src/               ← Top drawer
  ├── 📁 esg-frontend/      ← Top drawer
  └── 📁 prisma/            ← Top drawer
```

Everything you drag should go into the "top drawer" (root level), and GitHub will organize it into the correct folders automatically based on your folder structure.
