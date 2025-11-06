# Digital Form Management System with Electronic Signatures

A comprehensive full-stack web application for creating, managing, and signing digital forms with integrated electronic signature capabilities. Built with React, TypeScript, Node.js, Express, and MongoDB.

## 🚀 Features

### Core Features
- **Dual User Roles**
  - **Form Creators**: Build, edit, publish, and manage forms
  - **Form Signers**: Fill and submit forms with digital signatures

- **Form Builder**
  - Drag-and-drop interface for creating forms
  - Multiple field types (text, email, number, textarea, checkbox, dropdown, date)
  - Field validation and required field settings
  - Save as draft or publish forms
  - Edit existing forms

- **Digital Signature**
  - Canvas-based signature pad
  - Touch and mouse support
  - Clear and save functionality
  - Signature stored as base64 image

- **Form Submission**
  - Read-only form view for signers
  - Fill designated input fields
  - Digital signature capture
  - Form validation before submission
  - Submission confirmation

- **Submission Management**
  - View all submissions for a form
  - Detailed submission view
  - Export submissions to CSV
  - Submission history with dates

### Security Features
- JWT-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- XSS protection
- CORS configuration
- Rate limiting on API endpoints

### Responsive Design
- Mobile-first approach
- Touch-friendly UI elements (minimum 44px touch targets)
- Responsive breakpoints:
  - Mobile: 320px - 640px
  - Tablet: 641px - 1024px
  - Desktop: 1025px+
- Works seamlessly on phones, tablets, and desktops

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: React Router v6
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Signature**: signature_pad library
- **HTTP Client**: Axios
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js with TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (jsonwebtoken)
- **Security**: Helmet, CORS, express-rate-limit
- **Validation**: express-validator

### DevOps
- **Containerization**: Docker & Docker Compose
- **Development**: Hot reload with tsx/vite

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- MongoDB (v5 or higher)
- Docker & Docker Compose (optional, for containerized deployment)

## 🚀 Getting Started

### Local Development Setup

#### 1. Clone the repository
```bash
git clone <repository-url>
cd what-is-this35554y6567
```

#### 2. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env file with your configuration
# Important: Change JWT_SECRET in production!

# Start MongoDB (if not using Docker)
# Make sure MongoDB is running on mongodb://localhost:27017

# Run in development mode
npm run dev

# Or build and run in production mode
npm run build
npm start
```

#### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env file if needed (default points to http://localhost:5000/api)

# Run in development mode
npm run dev

# Or build for production
npm run build
npm run preview
```

#### 4. Access the Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- API Health Check: http://localhost:5000/api/health

### Docker Deployment

#### Quick Start with Docker Compose
```bash
# Build and start all services
docker-compose up --build

# Run in detached mode
docker-compose up -d

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

Services will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- MongoDB: localhost:27017

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "creator" // or "signer"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Get Profile
```http
GET /api/auth/profile
Authorization: Bearer <token>
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

### Form Management Endpoints

#### Create Form
```http
POST /api/forms
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Customer Feedback Form",
  "description": "Please provide your feedback",
  "formStructure": {
    "components": [
      {
        "type": "textfield",
        "label": "Full Name",
        "key": "fullName",
        "validate": { "required": true }
      }
    ]
  }
}
```

#### Get All Forms
```http
GET /api/forms?page=1&limit=10&status=published
Authorization: Bearer <token>
```

#### Get Form by ID
```http
GET /api/forms/:id
Authorization: Bearer <token>
```

#### Update Form
```http
PUT /api/forms/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Form Title",
  "description": "Updated description"
}
```

#### Delete Form
```http
DELETE /api/forms/:id
Authorization: Bearer <token>
```

#### Publish Form
```http
POST /api/forms/:id/publish
Authorization: Bearer <token>
```

#### Unpublish Form
```http
POST /api/forms/:id/unpublish
Authorization: Bearer <token>
```

### Submission Endpoints

#### Submit Form
```http
POST /api/forms/:id/submissions
Content-Type: application/json

{
  "formData": {
    "fullName": "Jane Doe",
    "email": "jane@example.com"
  },
  "signature": "data:image/png;base64,iVBORw0KG...",
  "submittedBy": {
    "name": "Jane Doe",
    "email": "jane@example.com"
  }
}
```

#### Get Submissions
```http
GET /api/forms/:id/submissions?page=1&limit=10
Authorization: Bearer <token>
```

#### Get Submission by ID
```http
GET /api/submissions/:submissionId
Authorization: Bearer <token>
```

#### Export Submissions to CSV
```http
GET /api/forms/:id/submissions/export/csv
Authorization: Bearer <token>
```

## 🎯 User Flows

### Form Creator Flow
1. Register/Login as a creator
2. Navigate to Dashboard
3. Click "Create New Form"
4. Add fields using the form builder
5. Configure field properties and validations
6. Save form (draft status)
7. Publish form when ready
8. Share form link with signers
9. View submissions in the dashboard

### Form Signer Flow
1. Register/Login as a signer (or access public form)
2. View available published forms
3. Open form to fill
4. Complete required fields
5. Draw digital signature
6. Submit form
7. Receive confirmation

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Example Test Cases
1. User registration with valid/invalid data
2. User login with correct/incorrect credentials
3. Form creation with required fields
4. Form submission with signature
5. JWT token validation
6. Protected route access control

## 🔒 Security Considerations

- **Authentication**: JWT tokens with expiration
- **Password Security**: Bcrypt hashing with salt
- **Input Validation**: Server-side validation for all inputs
- **XSS Prevention**: Input sanitization
- **CORS**: Configured for specific origins
- **Rate Limiting**: Prevents abuse of API endpoints
- **HTTPS**: Recommended for production
- **Environment Variables**: Sensitive data stored in .env files

## 📱 Mobile Optimization

- Minimum touch target size: 44px
- Responsive images and layouts
- Touch-friendly form inputs
- Optimized for portrait and landscape
- Fast load times with code splitting
- Smooth scrolling and animations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Coding Standards
- Follow ESLint rules
- Use TypeScript strict mode
- Write meaningful commit messages
- Add comments for complex logic
- Maintain consistent code formatting

## 📄 License

This project uses open-source libraries with MIT and Apache 2.0 licenses. All dependencies are compatible with commercial use.

## 🆘 Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running
- Check connection string in .env
- Verify network connectivity

### Port Already in Use
```bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>
```

### Build Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Docker Issues
```bash
# Clean up Docker
docker-compose down -v
docker system prune -a

# Rebuild
docker-compose up --build
```

## 📞 Support

For issues, questions, or contributions, please open an issue on GitHub.

## 🎉 Acknowledgments

- Form.io for form builder inspiration
- signature_pad library for signature functionality
- Tailwind CSS for responsive design system
- React and Node.js communities

---

Built with ❤️ using modern web technologies
