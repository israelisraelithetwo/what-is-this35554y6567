# Example Workflows

This document provides detailed examples of common workflows in the Form Management System.

## Table of Contents
1. [Form Creator Workflow](#form-creator-workflow)
2. [Form Signer Workflow](#form-signer-workflow)
3. [Form Submission Management](#form-submission-management)
4. [API Usage Examples](#api-usage-examples)

---

## Form Creator Workflow

### Step 1: Registration and Login

**Register as a Creator:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Creator",
    "email": "creator@example.com",
    "password": "securepass123",
    "role": "creator"
  }'
```

**Response:**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "creator@example.com",
    "name": "John Creator",
    "role": "creator"
  }
}
```

Save the token for subsequent requests.

### Step 2: Create a Form

**Create a Customer Feedback Form:**
```bash
curl -X POST http://localhost:5000/api/forms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "title": "Customer Feedback Form",
    "description": "We value your feedback to improve our services",
    "formStructure": {
      "components": [
        {
          "type": "textfield",
          "label": "Full Name",
          "key": "fullName",
          "input": true,
          "validate": {
            "required": true
          }
        },
        {
          "type": "email",
          "label": "Email Address",
          "key": "email",
          "input": true,
          "validate": {
            "required": true
          }
        },
        {
          "type": "textarea",
          "label": "Your Feedback",
          "key": "feedback",
          "input": true,
          "validate": {
            "required": true
          }
        },
        {
          "type": "select",
          "label": "Service Rating",
          "key": "rating",
          "input": true,
          "data": {
            "values": [
              {"label": "Excellent", "value": "5"},
              {"label": "Good", "value": "4"},
              {"label": "Average", "value": "3"},
              {"label": "Poor", "value": "2"},
              {"label": "Very Poor", "value": "1"}
            ]
          },
          "validate": {
            "required": true
          }
        }
      ]
    }
  }'
```

**Response:**
```json
{
  "message": "Form created successfully",
  "form": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Customer Feedback Form",
    "description": "We value your feedback to improve our services",
    "status": "draft",
    "createdAt": "2025-11-06T12:00:00.000Z"
  }
}
```

### Step 3: Publish the Form

**Make the form available for signers:**
```bash
curl -X POST http://localhost:5000/api/forms/507f1f77bcf86cd799439011/publish \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Response:**
```json
{
  "message": "Form published successfully",
  "form": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Customer Feedback Form",
    "status": "published"
  }
}
```

### Step 4: View Form Submissions

**Get all submissions for your form:**
```bash
curl -X GET http://localhost:5000/api/forms/507f1f77bcf86cd799439011/submissions \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Step 5: Export Submissions

**Export to CSV:**
```bash
curl -X GET http://localhost:5000/api/forms/507f1f77bcf86cd799439011/submissions/export/csv \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -o submissions.csv
```

---

## Form Signer Workflow

### Step 1: Registration and Login

**Register as a Signer:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Signer",
    "email": "signer@example.com",
    "password": "securepass123",
    "role": "signer"
  }'
```

### Step 2: View Available Forms

**Get list of published forms:**
```bash
curl -X GET http://localhost:5000/api/forms \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Response:**
```json
{
  "forms": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "Customer Feedback Form",
      "description": "We value your feedback to improve our services",
      "status": "published"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
}
```

### Step 3: View Form Details

**Get specific form to fill:**
```bash
curl -X GET http://localhost:5000/api/forms/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Step 4: Submit the Form

**Submit form with digital signature:**
```bash
curl -X POST http://localhost:5000/api/forms/507f1f77bcf86cd799439011/submissions \
  -H "Content-Type: application/json" \
  -d '{
    "formData": {
      "fullName": "Jane Doe",
      "email": "jane@example.com",
      "feedback": "Great service! Very satisfied with the experience.",
      "rating": "5"
    },
    "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...",
    "submittedBy": {
      "name": "Jane Doe",
      "email": "jane@example.com"
    }
  }'
```

**Response:**
```json
{
  "message": "Form submitted successfully",
  "submission": {
    "_id": "507f1f77bcf86cd799439012",
    "formId": "507f1f77bcf86cd799439011",
    "submittedAt": "2025-11-06T13:00:00.000Z"
  }
}
```

---

## Form Submission Management

### View Individual Submission

**Get submission details:**
```bash
curl -X GET http://localhost:5000/api/submissions/507f1f77bcf86cd799439012 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Response:**
```json
{
  "submission": {
    "_id": "507f1f77bcf86cd799439012",
    "formId": "507f1f77bcf86cd799439011",
    "formData": {
      "fullName": "Jane Doe",
      "email": "jane@example.com",
      "feedback": "Great service!",
      "rating": "5"
    },
    "signature": "data:image/png;base64,...",
    "submittedBy": {
      "name": "Jane Doe",
      "email": "jane@example.com"
    },
    "submittedAt": "2025-11-06T13:00:00.000Z"
  }
}
```

### Update Form (Creator Only)

**Edit form details:**
```bash
curl -X PUT http://localhost:5000/api/forms/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "title": "Updated Customer Feedback Form",
    "description": "Updated description"
  }'
```

### Delete Form (Creator Only)

**Delete a form:**
```bash
curl -X DELETE http://localhost:5000/api/forms/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## API Usage Examples

### Pagination

**Get forms with pagination:**
```bash
curl -X GET "http://localhost:5000/api/forms?page=2&limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Filtering

**Get only published forms:**
```bash
curl -X GET "http://localhost:5000/api/forms?status=published" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Get only draft forms:**
```bash
curl -X GET "http://localhost:5000/api/forms?status=draft" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Complete Form Example

**Employee Onboarding Form:**
```json
{
  "title": "Employee Onboarding Form",
  "description": "Complete this form for new employee onboarding",
  "formStructure": {
    "components": [
      {
        "type": "textfield",
        "label": "Full Name",
        "key": "fullName",
        "validate": { "required": true }
      },
      {
        "type": "email",
        "label": "Work Email",
        "key": "workEmail",
        "validate": { "required": true }
      },
      {
        "type": "textfield",
        "label": "Phone Number",
        "key": "phone",
        "validate": { "required": true }
      },
      {
        "type": "datetime",
        "label": "Start Date",
        "key": "startDate",
        "validate": { "required": true }
      },
      {
        "type": "select",
        "label": "Department",
        "key": "department",
        "data": {
          "values": [
            {"label": "Engineering", "value": "engineering"},
            {"label": "Sales", "value": "sales"},
            {"label": "Marketing", "value": "marketing"},
            {"label": "HR", "value": "hr"}
          ]
        },
        "validate": { "required": true }
      },
      {
        "type": "checkbox",
        "label": "I agree to the terms and conditions",
        "key": "agreeToTerms",
        "validate": { "required": true }
      }
    ]
  }
}
```

---

## Error Handling Examples

### Validation Error
```json
{
  "message": "Validation error",
  "errors": [
    {
      "msg": "Valid email is required",
      "param": "email",
      "location": "body"
    }
  ]
}
```

### Authentication Error
```json
{
  "message": "No token provided"
}
```

### Authorization Error
```json
{
  "message": "Access denied. Creator role required."
}
```

### Not Found Error
```json
{
  "message": "Form not found"
}
```

---

## UI Workflow (Browser)

### Creator Workflow in Browser

1. **Navigate to:** `http://localhost:5173/register`
2. **Fill in registration form:**
   - Name: John Creator
   - Email: creator@example.com
   - Password: securepass123
   - Role: Form Creator
3. **Click "Register"** → Redirected to Dashboard
4. **Click "Create New Form"** → Form Builder Page
5. **Add Form Details:**
   - Title: "Customer Feedback"
   - Description: "Please share your feedback"
6. **Add Fields:**
   - Click "+ Text Field" to add text input
   - Configure field: Label, Required checkbox
   - Click "+ Email" to add email field
   - Click "+ Text Area" for feedback
7. **Click "Create Form"** → Returns to Dashboard
8. **Click "Publish"** on the form card
9. **Click "View Submissions"** to see all submissions
10. **Click "Export CSV"** to download submissions

### Signer Workflow in Browser

1. **Navigate to:** `http://localhost:5173/register`
2. **Fill in registration form:**
   - Name: Jane Signer
   - Email: signer@example.com
   - Password: securepass123
   - Role: Form Signer
3. **Click "Register"** → Redirected to Dashboard
4. **See published forms in dashboard**
5. **Click "Fill Form"** on any form card
6. **Fill in all form fields:**
   - Enter text in required fields
   - Select options from dropdowns
7. **Draw digital signature** in the signature pad
8. **Click "Save Signature"**
9. **Review all information**
10. **Click "Submit Form"** → Success message displayed

---

## Tips and Best Practices

1. **Always save your JWT token** after login for subsequent API requests
2. **Forms must be published** before signers can fill them
3. **Required fields** must be filled before form submission
4. **Digital signature is mandatory** for all form submissions
5. **Only form creators** can view, edit, and delete their own forms
6. **Submissions are permanent** and cannot be deleted
7. **Use pagination** for large datasets to improve performance
8. **Export submissions regularly** for backup and analysis

---

## Troubleshooting

### "No token provided" error
- Ensure you include the Authorization header in requests
- Format: `Authorization: Bearer YOUR_TOKEN_HERE`

### "Form is not published" error
- Check form status - it must be "published"
- Only creators can publish forms

### "Access denied" errors
- Verify you're logged in with the correct role
- Creators can create/edit forms, signers can only fill them

### Signature not saving
- Ensure signature is drawn before clicking save
- Signature must be in base64 format

---

For more information, see the main [README.md](../README.md) file.
