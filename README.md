Edition 🚀
Edition is a powerful, browser-based integrated development environment (IDE) that brings the power of local AI to your coding workflow. Built on top of WebContainers, it allows you to run full-stack Node.js applications directly in your browser while leveraging local LLMs (via Ollama) for code completion, refactoring, and chat assistance.

✨ Features
💻 Browser-Based Runtime: Powered by WebContainers API, allowing you to run Node.js commands (npm install, npm run dev) directly in the browser.

🤖 Local AI Integration: seamless integration with Ollama running locally.

Chat Assistant: Ask questions, debug errors, and generate code.

Smart Code Completion: FIM (Fill-In-the-Middle) code suggestions using qwen2.5-coder.

AI Actions: Automated Code Review, Bug Fixing, and Optimization.

📝 Rich Code Editor: Built on Monaco Editor (VS Code's core) with syntax highlighting, mini-map, and intellisense.

🗂️ File System Management: Create files, folders, rename, delete, and organize your project structure.

🚀 Project Templates: One-click starter templates for React, Next.js, Vue, Angular, Express, and Hono.

🐙 GitHub Integration: Import public repositories directly into the editor.

🔐 Authentication: Secure login via GitHub and Google (NextAuth.js).

💾 Cloud Sync: Projects and file contents are synced to the database using Prisma.

🛠️ Tech Stack
Framework: Next.js 15 (App Router)

Language: TypeScript

Styling: Tailwind CSS & Shadcn UI

Database: MongoDB (via Prisma ORM)

Auth: NextAuth.js (v5)

Editor: Monaco Editor (@monaco-editor/react)

Runtime: WebContainers (@webcontainer/api)

AI Provider: Ollama (Local)

⚙️ Prerequisites
Before you begin, ensure you have the following installed:

Node.js (v18 or higher)

Ollama (for local AI features)

Download from ollama.com

Pull the required model: ollama pull qwen2.5-coder:7b

MongoDB Database (Local or Atlas URL)

🚀 Getting Started
1. Clone the Repository

Bash
git clone https://github.com/your-username/vibecode-editor.git
cd vibecode-editor
2. Install Dependencies

Bash
npm install
# or
yarn install
# or
pnpm install
3. Environment Setup

Create a .env file in the root directory and add the following variables:

Code snippet
# Database
DATABASE_URL="mongodb+srv://..."

# Auth (NextAuth.js)
AUTH_SECRET="your_generated_secret" # Run `npx auth secret` to generate

# OAuth Providers
AUTH_GITHUB_ID="your_github_client_id"
AUTH_GITHUB_SECRET="your_github_client_secret"
AUTH_GOOGLE_ID="your_google_client_id"
AUTH_GOOGLE_SECRET="your_google_client_secret"

# GitHub Access (For importing Repos)
GITHUB_TOKEN="ghp_your_personal_access_token" 
4. Setup Database

Generate the Prisma client and push the schema to your database.

Bash
npx prisma generate
npx prisma db push
5. Run the Application

Start the development server:

Bash
npm run dev
Visit http://localhost:3000 in your browser.

🧠 AI Setup (Ollama)
To enable the AI features (Chat and Code Completion), you must have Ollama running locally.

Open your terminal.

Run ollama serve to start the API server (usually on port 11434).

Ensure you have the correct model downloaded:

Bash
ollama pull qwen2.5-coder:7b
The application is configured to connect to http://localhost:11434/api/generate.

📂 Project Structure
Plaintext
├── app/                  # Next.js App Router source
│   ├── (root)/           # Landing page
│   ├── api/              # API Routes (Chat, GitHub, Completion)
│   ├── auth/             # Authentication pages
│   ├── dashboard/        # User dashboard
│   └── playground/[id]/  # The main IDE interface
├── components/           # Reusable UI components (Shadcn)
│   └── ui/               # Radix UI primitives
├── lib/                  # Utilities, DB connection, constants
├── modules/              # Feature-based modules
│   ├── ai-chat/          # AI Chat sidebar logic
│   ├── auth/             # Auth actions and components
│   ├── dashboard/        # Dashboard logic
│   ├── playground/       # Editor & File Explorer logic
│   └── webcontainers/    # WebContainer runtime & Terminal
├── prisma/               # Database schema
└── vibecode-starters/    # Template definitions (React, Vue, etc.)
🤝 Contributing
Contributions are welcome! Please follow these steps:

Fork the repository.

Create a new branch (git checkout -b feature/AmazingFeature).

Commit your changes (git commit -m 'Add some AmazingFeature').

Push to the branch (git push origin feature/AmazingFeature).

Open a Pull Request.

📄 License
Distributed under the MIT License. See LICENSE for more information.

🙏 Acknowledgements
WebContainers for the browser runtime.

Shadcn UI for the beautiful component library.

Ollama for democratizing local AI.
