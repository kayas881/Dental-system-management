# 🦷 Dental Lab Management System

A comprehensive billing and work order management system designed specifically for dental laboratories. This professional-grade application streamlines operations with dual role authentication, advanced bill printing capabilities, and complete work order tracking.

## 🌟 Key Features

### 🔐 **Dual Role System**
- **Admin Access**: Complete system management, final bill printing, comprehensive oversight
- **Staff Access**: Work order management, initial bill creation, limited administrative functions

### 📄 **Advanced Bill Printing**
- **Initial Bills**: Staff-generated bills without pricing information for internal tracking
- **Final Bills**: Admin-generated bills with complete pricing for client delivery
- **Print Status Tracking**: Automatic status updates and filtering capabilities

### 🏥 **Professional Work Order Management**
- Interactive dental chart for tooth selection
- Comprehensive work order tracking (pending → in progress → completed)
- Advanced filtering and search capabilities
- Real-time status updates

### 🎯 **Business-Grade Features**
- Role-based access control with secure authentication
- Professional bill formatting with dental chart visualization
- Comprehensive filtering (status, date, doctor, print status)
- Responsive design for desktop and tablet use

## 🚀 Technology Stack

- **Frontend**: React 18.2.0 with React Router DOM
- **Backend**: Supabase (PostgreSQL database with real-time capabilities)
- **Authentication**: Supabase Auth with Row Level Security (RLS)
- **Styling**: Modern CSS with responsive design
- **State Management**: React Hooks and Context API

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn package manager
- Supabase account and project

## ⚡ Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/dental-lab-management.git
cd dental-lab-management
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Database Setup
Run the provided SQL migration files in your Supabase SQL editor:
- `dental_lab_schema.sql` - Core database structure
- `enhanced_bills_schema.sql` - Advanced billing features
- Additional migration files as needed

### 5. Start Development Server
```bash
npm start
```
Navigate to `http://localhost:3000` to access the application.

## 🏗️ Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── bills/           # Bill-related components
│   ├── WorkOrdersTable.js
│   └── ...
├── pages/               # Main application pages
│   ├── admin/          # Admin-only pages
│   ├── bills/          # Bill management pages
│   ├── staff/          # Staff-specific pages
│   └── work-orders/    # Work order management
├── services/           # API integration layer
│   └── dentalLabService.js
├── supabase/           # Supabase configuration
├── utils/              # Utility functions
└── routes/             # Application routing
```

## 👥 User Accounts

### Default Admin Account
- **Email**: admin@example.com
- **Access**: Full system management, all bill types, user administration

### Default Staff Account
- **Email**: staff@example.com
- **Access**: Work order management, initial bill printing

*Note: Change default passwords before production deployment*

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Hosting Recommendations
- **Frontend**: Hostinger Business or Vercel
- **Database**: Supabase Pro (recommended for business use)
- **Domain**: Custom domain for professional appearance

Refer to `HOSTING_RECOMMENDATIONS.md` for detailed deployment instructions.

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Manual Testing Checklist
See `TESTING_CHECKLIST.md` for comprehensive testing procedures.

## 📚 Documentation

- `HOSTING_RECOMMENDATIONS.md` - Deployment and hosting guide
- `TESTING_CHECKLIST.md` - Quality assurance procedures
- `FINAL_VALIDATION_REPORT.md` - Pre-delivery validation results
- `CLIENT_DELIVERY_SUMMARY.md` - Client handover documentation

## 🔧 Configuration

### Environment Variables
- `REACT_APP_SUPABASE_URL`: Your Supabase project URL
- `REACT_APP_SUPABASE_ANON_KEY`: Supabase anonymous key
- `REACT_APP_BASE_URL`: API base URL (if using external APIs)

### Database Configuration
The application uses Supabase with Row Level Security (RLS) policies for data protection. Ensure proper RLS policies are configured for production use.

## 🛡️ Security Features

- **Row Level Security**: Database-level access control
- **Role-based Authentication**: Secure user role management
- **Input Validation**: Comprehensive data validation
- **Secure Bill Printing**: Role-specific printing permissions

## 🎨 Customization

### Styling
- Modify CSS files in the `src/` directory
- Update color schemes and branding as needed
- Responsive design built-in for various screen sizes

### Features
- Add new work order types in the database schema
- Customize bill formatting in `BillPrintUtils.js`
- Extend user roles and permissions as needed

## 📞 Support

For technical support or questions:
- Review the documentation files
- Check the testing checklist for common issues
- Refer to the final validation report for known limitations

## 📄 License

This project is proprietary software developed for dental laboratory operations.

## 🤝 Contributing

This is a private project. For modifications or enhancements, please follow the established code structure and testing procedures.

---

**Built with ❤️ for dental laboratories** | **Professional Grade** | **Production Ready**

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
# React_multiple_role_example
