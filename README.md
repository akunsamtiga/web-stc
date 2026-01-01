# Stockity Admin Dashboard

Modern web-based admin dashboard for Stockity trading platform.

## Features

- 🔐 Secure Firebase Authentication
- 👥 Whitelist User Management
- 👨‍💼 Admin Management (Super Admin only)
- 📊 Real-time Statistics
- 📤 Export to JSON/CSV
- 🎨 Modern Dark UI
- 📱 Fully Responsive

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Firebase**
   - Copy `.env.example` to `.env`
   - Update `src/services/firebase.ts` with your Firebase config
   - Or use environment variables in `.env`

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   ```

## Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication (Email/Password)
3. Create Firestore database
4. Add security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /whitelist_users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /admin_users/{adminId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /app_config/{configId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

## Default Super Admin

Email: `drrrian00@gmail.com`

Make sure this email is registered in Firebase Authentication.

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Firebase (Auth + Firestore)
- React Router
- Lucide React Icons
- React Hot Toast
- Date-fns

## Project Structure

```
src/
├── components/     # Reusable components
├── pages/          # Page components
├── services/       # Firebase services
├── contexts/       # React contexts
├── types/          # TypeScript types
├── utils/          # Utility functions
└── App.tsx         # Main app component
```

## License

MIT
