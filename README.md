# 💀 DarkTodo

A minimalist, dark-themed todo application built with modern web technologies. Embrace the darkness and organize your tasks with style.

![Dark Todo App](https://img.shields.io/badge/Built%20with-v0.dev-black?style=for-the-badge)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/nseldeib-projects/v0-multi-page-todo-app-3j)

## ✨ Features

- **🖤 Dark Theme**: Sleek, gothic interface with red accents
- **😈 Emoji Support**: Dark-themed emoji picker for task personalization
- **📅 Due Dates**: Calendar integration for task scheduling
- **🔐 Authentication**: Secure user accounts with Supabase
- **📱 Responsive**: Works seamlessly across all devices
- **⚡ Real-time**: Instant updates and synchronization

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Backend**: Supabase (Database + Auth)
- **Deployment**: Vercel
- **Development**: Built with v0.dev

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. Clone the repository
\`\`\`bash
git clone https://github.com/nseldeib/dark-todo-app.git
cd dark-todo-app
\`\`\`

2. Install dependencies
\`\`\`bash
npm install
\`\`\`

3. Set up environment variables
\`\`\`bash
cp .env.example .env.local
\`\`\`

Add your Supabase credentials:
\`\`\`
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
\`\`\`

4. Run the development server
\`\`\`bash
npm run dev
\`\`\`

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🗄️ Database Setup

The app includes SQL scripts to set up your Supabase database:

1. Run the setup script: \`scripts/01-setup-database.sql\`
2. Seed demo data: \`scripts/02-seed-demo-data.sql\`
3. Configure auth: \`scripts/01-disable-email-confirmation.sql\`

## 🎨 Design Philosophy

DarkTodo embraces a minimalist, gothic aesthetic that makes task management feel less mundane. The dark theme reduces eye strain during late-night productivity sessions, while the carefully chosen emojis and animations add personality without compromising functionality.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🔗 Links

- **Live Demo**: [https://vercel.com/nseldeib-projects/v0-multi-page-todo-app-3j](https://vercel.com/nseldeib-projects/v0-multi-page-todo-app-3j)
- **Built with**: [v0.dev](https://v0.dev)

---

Built with 🖤 using [v0.dev](https://v0.dev)
