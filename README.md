# E-Commerce Authentication Platform

A modern, full-stack authentication system built with React and Node.js, featuring a beautiful UI and robust security practices.

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation & Running

1. **Install dependencies for both frontend and backend:**

   ```powershell
   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

2. **Start the application:**

   **Option A: Start both servers at once (Recommended)**

   ```powershell
   # From project root
   .\start-all.ps1
   ```

   **Option B: Start servers separately**

   ```powershell
   # Terminal 1 - Start backend
   .\start-backend.ps1

   # Terminal 2 - Start frontend
   .\start-frontend.ps1
   ```

   **Option C: Manual start**

   ```powershell
   # Terminal 1 - Backend
   cd backend
   npm start

   # Terminal 2 - Frontend
   cd frontend
   npm start
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Health Check: http://localhost:5000/api/health

   <!-- Redeploy trigger: small innocuous change to force a new Git commit and trigger Vercel redeploy -->
   Redeploy-trigger: 2026-01-20T05:10:00Z

### Testing the Connection

Before starting the frontend, you can test if the backend is working:

```powershell
cd backend
node test-connection.js
```

## 🚀 Features

### Frontend

- **Modern React UI** with JSX and SCSS
- **Responsive Design** that works on all devices
- **Accessibility-First** approach with ARIA labels and semantic HTML
- **Authentication Pages**: Login and Signup with seamless navigation
- **Form Validation** with real-time feedback
- **Password Strength Indicator** (5-level visual meter)
- **Loading States** and smooth animations
- **Error Handling** with user-friendly messages

### Backend

- **RESTful API** built with Express.js
- **JWT Authentication** for secure token-based auth
- **User Registration** with duplicate email detection
- **Password Hashing** using bcryptjs (10 salt rounds)
- **Advanced Input Validation** with express-validator
- **Security Headers** with Helmet
- **Rate Limiting** to prevent abuse
- **CORS Protection** for cross-origin requests
- **Error Handling** with centralized middleware

### Architecture

- **Clear Separation** between frontend and backend
- **Modular Design** with controllers, services, and middleware
- **Extensible Structure** ready for MFA implementation
- **Environment Configuration** for different deployment stages

## 📁 Project Structure

```
TP1/
├── frontend/                 # React frontend application
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login/
│   │   │   │   ├── Login.jsx
│   │   │   │   └── Login.scss
│   │   │   └── Signup/
│   │   │       ├── Signup.jsx
│   │   │       └── Signup.scss
│   │   ├── styles/
│   │   │   └── global.scss
│   │   ├── App.js
│   │   ├── App.scss
│   │   └── index.js
│   └── package.json
│
└── backend/                  # Node.js backend API
    ├── controllers/
    │   └── auth.controller.js
    ├── middleware/
    │   ├── auth.middleware.js
    │   ├── errorHandler.js
    │   └── validation.js
    ├── routes/
    │   └── auth.routes.js
    ├── services/
    │   └── auth.service.js
    ├── .env.example
    ├── .gitignore
    ├── package.json
    └── server.js
```

## 🛠️ Installation

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Backend Setup

1. Navigate to the backend folder:

```powershell
cd backend
```

2. Install dependencies:

```powershell
npm install
```

3. Create a `.env` file by copying `.env.example`:

```powershell
copy .env.example .env
```

4. Update the `.env` file with your configuration:

```env
PORT=5000
JWT_SECRET=your_secure_secret_key_here
FRONTEND_URL=http://localhost:3000
```

5. Start the development server:

```powershell
npm run dev
```

The backend API will be available at `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend folder:

```powershell
cd frontend
```

2. Install dependencies:

```powershell
npm install
```

3. Start the development server:

```powershell
npm start
```

The frontend will be available at `http://localhost:3000`

## 🔐 Test Credentials

Use these credentials to test the login functionality:

**Admin User:**

- Email: `admin@ecommerce.com`
- Password: `Admin@123`

**Regular User:**

- Email: `user@example.com`
- Password: `User@123`

## 📡 API Endpoints

### Authentication Routes

#### POST `/api/auth/signup`

Register a new user account.

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Success Response (201):**

```json
{
  "success": true,
  "message": "Account created successfully! You can now sign in.",
  "user": {
    "id": 3,
    "email": "john@example.com",
    "name": "John Doe",
    "role": "user",
    "mfaEnabled": false,
    "createdAt": "2025-11-05T10:30:00.000Z"
  }
}
```

#### POST `/api/auth/login`

Login with email and password.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "User@123"
}
```

**Success Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  }
}
```

#### POST `/api/auth/verify-otp`

Verify OTP for multi-factor authentication (Coming Soon).

#### POST `/api/auth/resend-otp`

Resend OTP code (Coming Soon).

#### POST `/api/auth/logout`

Logout user.

#### GET `/api/health`

Health check endpoint.

## 🔒 Security Features

- **Password Hashing**: All passwords are hashed using bcryptjs with salt rounds
- **JWT Tokens**: Secure token-based authentication with expiration
- **Rate Limiting**: Protection against brute-force attacks
- **Input Validation**: Server-side validation for all inputs
- **CORS Protection**: Configured CORS policies
- **Security Headers**: Helmet middleware for setting security headers
- **Error Handling**: No sensitive information leaked in error messages

## 🎨 UI Features

- **Modern Gradient Background**: Eye-catching purple gradient
- **Glass-morphism Effects**: Modern frosted glass styling
- **Smooth Animations**: Fade-in and slide-down effects
- **Password Strength Indicator**: 5-level visual meter with color coding
- **Form Validation**: Real-time validation with visual feedback
- **Loading States**: Spinner animation during authentication
- **Success/Error Messages**: Clear feedback for user actions
- **Seamless Navigation**: Switch between Login and Signup without page reload
- **Accessibility**: ARIA labels, semantic HTML, keyboard navigation
- **Responsive**: Works perfectly on mobile, tablet, and desktop

## 🚀 Future Enhancements

The system is designed to be extensible. Planned features include:

1. **Multi-Factor Authentication (MFA)**

   - Email-based OTP verification
   - SMS-based OTP (optional)
   - TOTP authenticator app support

2. **Password Management**

   - Password reset functionality
   - Change password feature
   - Password strength requirements
   - Password visibility toggle

3. **User Registration** ✅ COMPLETED

   - Sign-up form ✅
   - Email verification (planned)
   - Profile management (planned)

4. **Session Management**

   - Token refresh mechanism
   - Session timeout
   - Device management

5. **Database Integration**
   - MongoDB/PostgreSQL integration
   - User profile storage
   - Audit logging

## 🧪 Testing

### Testing the Login Flow

1. Start both frontend and backend servers
2. Open `http://localhost:3000` in your browser
3. Enter test credentials
4. Observe the authentication flow
5. Check the browser console for JWT token

### Testing the Signup Flow

1. Click "Sign up" at the bottom of the login page
2. Fill in the registration form:
   - Name: Test User
   - Email: test@example.com
   - Password: TestPass123
   - Confirm Password: TestPass123
3. Watch the password strength indicator update
4. Check the terms checkbox
5. Click "Create Account"
6. Verify success message and auto-redirect to login
7. Login with new credentials

### API Testing with cURL

```powershell
# Health check
curl http://localhost:5000/api/health

# Signup
curl -X POST http://localhost:5000/api/auth/signup `
  -H "Content-Type: application/json" `
  -d '{\"name\":\"Test User\",\"email\":\"test@example.com\",\"password\":\"TestPass123\"}'

# Login
curl -X POST http://localhost:5000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"user@example.com\",\"password\":\"User@123\"}'
```

## 🤝 Contributing

This is a learning project for security and authentication best practices. Feel free to:

- Report issues
- Suggest improvements
- Submit pull requests

## 📝 License

This project is created for educational purposes.

## 👨‍💻 Developer Notes

### Code Quality

- Follow ES6+ standards
- Use meaningful variable names
- Comment complex logic
- Keep functions small and focused

### Security Considerations

- Never commit `.env` files
- Regularly update dependencies
- Use environment variables for secrets
- Implement proper error handling

### Performance

- Optimize bundle size
- Use React best practices
- Implement lazy loading when needed
- Monitor API response times

## 🔧 Troubleshooting

### Frontend Can't Connect to Backend

**Symptoms:**

- Error message: "Cannot connect to server"
- Network errors in browser console
- "ERR_CONNECTION_REFUSED" errors

**Solutions:**

1. **Verify backend is running:**

   ```powershell
   # Test backend health
   curl.exe http://127.0.0.1:5000/api/health
   # OR
   Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/health"
   ```

   Expected response: `{"status":"OK","message":"Server is running"}`

2. **Check if port 5000 is in use:**

   ```powershell
   netstat -ano | findstr :5000
   ```

   If nothing shows, the backend isn't running.

3. **Restart both servers:**

   ```powershell
   # Kill any running Node processes
   Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

   # Start fresh
   .\start-all.ps1
   ```

4. **Check firewall:**
   Make sure Windows Firewall isn't blocking Node.js on port 5000.

5. **Verify environment variables:**
   - Backend: Check `backend/.env` exists and has correct values
   - Frontend: Check `frontend/.env` has `REACT_APP_API_URL=http://127.0.0.1:5000`

### CORS Errors

**Symptoms:**

- "CORS policy" errors in browser console
- "Access to fetch blocked" messages

**Solutions:**

1. Verify the backend CORS configuration includes your frontend URL
2. Make sure you're accessing frontend at `http://localhost:3000` (not 127.0.0.1)
3. Clear browser cache and restart both servers

### Port Already in Use

**Symptoms:**

- Error: "Port 5000 is already in use"
- Error: "EADDRINUSE"

**Solutions:**

```powershell
# Find what's using the port
netstat -ano | findstr :5000

# Kill the process (replace PID with the actual process ID)
taskkill /PID <PID> /F

# Or kill all Node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Dependencies Not Installing

**Solutions:**

```powershell
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
Remove-Item -Recurse -Force node_modules
npm install
```

### Backend Starts Then Immediately Stops

**Solutions:**

1. Check for syntax errors in the code
2. Verify `.env` file is properly formatted
3. Check the terminal output for error messages
4. Run test connection:
   ```powershell
   cd backend
   node test-connection.js
   ```

### Email OTP Not Sending

**Solutions:**

1. Check `backend/.env` has valid email credentials
2. Verify EMAIL_USER and EMAIL_PASS are set correctly
3. For Gmail, make sure you're using an "App Password", not your regular password
4. Check email service is not blocking the connection

---

**Built with ❤️ using React and Node.js**
