# Goal Tracker (MERN)

A modern, weekly productivity tracker built with the MERN stack (MongoDB, Express, React, Node.js). 

This project allows individuals to track their daily and weekly habits across various personalized categories without being overwhelmed. It uses a premium dark mode aesthetic with micro-interactions for a better user experience.

## Features
- **Frontend**: React + Vite, TailwindCSS (v4+), Framer Motion animations. Drag-and-drop powered by `@hello-pangea/dnd`.
- **Backend**: Node.js + Express, Mongoose, JWT auth, bcrypt hashing.
- **Database**: MongoDB handles daily booleans across users securely.
- **Customizable**: Drag and drop tasks and categories to dynamically reorder your dashboard.
- **Docker-ready**: Container friendly architecture.

---

## 🛠️ Local Development Setup

### 1. Database
Make sure you have MongoDB running locally at `mongodb://localhost:27017` or use Docker:
```bash
docker run -d -p 27017:27017 mongo
```

### 2. Backend
```bash
cd server
npm install
```
Create a `.env` file in the `/server` directory:
```env
MONGO_URI=mongodb://localhost:27017/goaltracker
JWT_SECRET=your_super_secret_jwt_string_here
PORT=5000
```
Start the development server:
```bash
npm run dev
```

### 3. Frontend
```bash
cd client
npm install
```
Create a `.env` file in the `/client` directory if you wish to override the backend API URL. By default, it points to `http://localhost:5000/api`.
```env
VITE_API_URL=http://localhost:5000/api
```
Start the Vite development server:
```bash
npm run dev
```

---

## 🚀 Production Deployment Guidelines

To deploy this project out directly to a VPS or a container-based PaaS (like Railway, Render, Coolify, or Dokku), follow standard MERN deployment steps:

1. **Deploy your MongoDB database** and retrieve your connection string.
2. **Deploy the backend** (`/server`):
   - Set Environment Variables:
     - `MONGO_URI` (Your database string)
     - `JWT_SECRET` (A secure random string)
     - `PORT` (Usually provided dynamically by the host, or set manually)
3. **Deploy the frontend** (`/client`):
   - Set Environment Variables:
     - `VITE_API_URL` (The public URL of your deployed backend + `/api`)
   - Build using `npm run build` and serve statically using a web server or Docker.

---

## 🛡️ Admin Setup Guide

Because this application relies on a single overarching administrator to configure the global task list, **the very first user who registers is automatically granted "Admin" privileges.** 

1. Ensure the database is completely empty (which it will be on a fresh install).
2. Navigate to your frontend URL.
3. Click "Create Account" and register your preferred username and password.
4. You will automatically be redirected to the Dashboard with Admin-level access to the global task configurations.

Any user who registers *after* the initial admin will be given the standard `"User"` role.
