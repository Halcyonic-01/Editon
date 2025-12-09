
# 🚀 Editon — AI-Powered Code Editor  
### Intelligent. Fast. Developer-Friendly.

Editon is a next-generation **AI-driven online code editor** built with **Next.js 15**, **Prisma**, **WebContainers**, **Monaco Editor**, and **NextAuth**.  
It brings an IDE-like experience to the browser — enhanced with **AI chat, code review, code optimization, intelligent autocomplete (FIM)**, GitHub integration, and live runtime execution using WebContainers.

---

# ✨ Features

### 🔹 **1. AI-Powered Code Editing**
- AI chat assistant with multiple modes:
  - 💬 Chat  
  - 🔍 Code Review  
  - 🔧 Fix Code  
  - ⚡ Optimize Code  
- Intelligent code completion using Qwen 2.5 Coder (FIM-based predictions).
- Fill-in-the-middle autocompletion like Cursor & GitHub Copilot.

### 🔹 **2. WebContainer Runtime**
- Run Node.js code **directly in the browser**.
- Real terminal embedded inside the editor.
- Live preview panel with hot reload.

### 🔹 **3. Monaco-Based Playground**
- Multi-file & folder explorer.
- File operations: Create, Rename, Delete files/folders.
- Syntax highlighting for all major languages.
- Smooth & responsive UI.

### 🔹 **4. Authentication & Dashboard**
- Secure OAuth login (GitHub, Google).
- Full session management via NextAuth.
- Dashboard to manage projects & templates.

### 🔹 **5. GitHub Integration**
- Add GitHub repositories.
- Load project templates from GitHub.
- Future support for committing, pushing & syncing code.

### 🔹 **6. Starter Templates**
Includes a huge library of **front-end, back-end & full-stack templates**, such as:
- Angular, Vue, Next.js, React  
- Expres, Node  
---

## 📂 Project Structure

The project follows a modular architecture using the Next.js App Router, separating business logic (`modules/`) from UI components and routing.



```text
halcyonic-01-edition/
├── app/                        # Next.js App Router (Routing & Layouts)
│   ├── (root)/                 # Marketing/Landing page routes
│   ├── api/                    # Server-side API endpoints
│   │   ├── auth/               # NextAuth authentication handlers
│   │   ├── chat/               # AI Chat streaming endpoints
│   │   ├── code-completion/    # Intelligent code completion logic
│   │   ├── github/             # GitHub repo integration
│   │   └── template/           # Starter boilerplate logic
│   ├── auth/                   # Authentication pages (Login/Register)
│   ├── dashboard/              # Protected user dashboard
│   └── playground/             # Main IDE interface (Monaco Editor)
│
├── components/                 # Shared UI Components
│   ├── providers/              # Global state & theme providers
│   └── ui/                     # Shadcn UI primitive components
│
├── hooks/                      # Global Custom React Hooks
│
├── lib/                        # Utilities, DB clients, and helpers
│
├── modules/                    # Feature-Based Architecture (Business Logic)
│   ├── ai-chat/                # AI Assistant sidebar & logic
│   ├── auth/                   # Auth forms and server actions
│   ├── dashboard/              # Dashboard widgets and layout logic
│   ├── home/                   # Landing page specific components
│   ├── playground/             # Editor state, file tree, & settings
│   └── webcontainers/          # In-browser Node.js runtime logic
│
├── prisma/                     # Database Schema & Migrations
│
├── vibecode-starters/          # Template definitions for new projects
│
├── auth.ts                     # NextAuth initialization
├── auth.config.ts              # OAuth & Session configuration
├── middleware.ts               # Edge middleware for route protection
└── routes.ts                   # Centralized route definitions
```

# 🧠 How AI Works in Editon

### 🔹 **AI Chat**  
Each request is processed with:
- Full conversation history  
- System prompt based on mode  
- AI model: **qwen2.5-coder:7b**

Modes:
| Mode | Purpose |
|------|---------|
| chat | General programming Q/A |
| review | Find bugs, issues, vulnerabilities |
| fix | Identify + fix broken code |
| optimize | Improve performance & readability |

---

### 🔹 **Code Completion (FIM-Based)**
The editor sends:
- Full content before cursor  
- Full content after cursor  
- Cursor metadata  
- Programming language + framework detection  

Using FIM prompt format:
<|fim_prefix|> BEFORE_CODE <|fim_suffix|> AFTER_CODE <|fim_middle|>

Model returns the missing middle part → becomes the suggestion.

This creates **Copilot-like inline completions**.

---

# 🏗️ Tech Stack

### **Frontend**
- Next.js 15 + App Router
- React 19
- Tailwind CSS (v4)
- Shadcn UI
- Monaco Editor
- Zustand (state management)
- Lucide Icons

### **Backend**
- Next.js API routes
- Prisma ORM
- MongoDB (via Prisma)
- NextAuth (JWT strategy)

### **AI**
- Qwen 2.5 Coder (7B)
- Ollama backend (`localhost:11434`)

### **Runtime**
- WebContainers by Stackblitz
- XTerm.js terminal

---

# ⚙️ Setup Instructions

### 1️⃣ Clone the repo
```sh
git clone https://github.com/Halcyonic-01/Editon.git
cd ai-vibe-code-editor
```
2️⃣ Install dependencies
```sh
npm install
```
3️⃣ Environment variables
```sh
Create a .env file:
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
NEXTAUTH_SECRET=
DATABASE_URL=
AUTH_SECRET=
```
4️⃣ Setup Prisma
```sh
npx prisma generate
npx prisma db push
```
5️⃣ Run AI Model (Ollama)
```sh
ollama run qwen2.5-coder:7b
```
6️⃣ Start the development server
```sh
npm run dev
```
## 🛡️ Authentication Flow
* 🔐 **OAuth:** Secure integration with **GitHub** + **Google**.
* 🔄 **PrismaAdapter:** Used for handling persistent user accounts.
* 🚧 **Middleware:** Protects private routes (e.g., dashboard, playground).
* 🪪 **Sessions:** JWT-based session management.
* 👤 **Custom Token:** Session token extended to include user `role` + `userId`.

---

## 🎨 UI Showcase
* ✨ **Hero Section:** Features a modern gradient aesthetic.
* 🌓 **Theme:** Built-in Light/Dark mode toggles.
* 📊 **Dashboard:** Clean, modern interface built with **shadcn/ui**.
* 📱 **Layouts:** Fully responsive design for all devices.
* ⚡ **Editor:** Lightning-fast coding experience.

---

## 🤝 Contributing
Contributions are welcome! You can help the project by:
* 🐛 Submitting issues.
* 📝 Suggesting new templates.
* 🤖 Improving AI prompts.
* 🔌 Adding new integrations.

---

## 🌟 Support
If you like the project, please give it a ⭐ on GitHub!
