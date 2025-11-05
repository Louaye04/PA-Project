# E-Commerce Authentication Platform

A modern, full-stack authentication system built with React and Node.js, featuring a beautiful UI and robust security practices.

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

---

**Built with ❤️ using React and Node.js**
