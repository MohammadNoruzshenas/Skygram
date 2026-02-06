# ☁️ Skygram - Real-Time Messaging Platform

Skygram is a modern, full-stack real-time chat application built to provide seamless communication. It leverages the power of WebSockets for instant messaging and features a clean, responsive UI.

## 🚀 Features

- **Real-Time Communication**: Instant messaging powered by Socket.IO.
- **User Authentication**: Secure Signup and Login using JWT.
- **Presence Tracking**: Real-time online/offline status indicators.
- **Message History**: Persistent chat records stored in MongoDB.
- **Responsive Design**: Beautifully styled with Tailwind CSS, optimized for all screen sizes.
- **Modern Stack**: Built with TypeScript for both frontend and backend.

## 🛠️ Tech Stack

**Frontend:**
- [React](https://reactjs.org/) (Vite)
- [Tailwind CSS](https://tailwindcss.com/)
- [Socket.io-client](https://socket.io/docs/v4/client-api/)
- [Axios](https://axios-http.com/)

**Backend:**
- [NestJS](https://nestjs.com/)
- [MongoDB](https://www.mongodb.com/) (Mongoose)
- [Socket.io](https://socket.io/)
- [Passport.js](http://www.passportjs.org/) (JWT Strategy)

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js (v16+)
- MongoDB (Local or Atlas)

### 1. Clone the repository
```bash
git clone https://github.com/MohammadNoruzshenas/Skygram.git
cd Skygram
```

### 2. Backend Setup
```bash
cd backend
npm install
```
- Create a `.env` file in the `backend` folder:
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_key
PORT=3000
```
- Start the server:
```bash
npm run start:dev
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```
- Start the development server:
```bash
npm run dev
```

---

## 📸 Screenshots

| Login & Authentication | User Registration |
|:---:|:---:|
| ![Login](/screenshots/1.png) | ![Signup](/screenshots/2.png) |

| Chat Main Interface | Active Conversation |
|:---:|:---:|
| ![Chat List](/screenshots/3.png) | ![Messaging](/screenshots/4.png) |

| Profile & Settings |
|:---:|
| ![Side Menu](/screenshots/5.png) |

## 📄 License
This project is licensed under the MIT License.
