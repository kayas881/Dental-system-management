#!/bin/bash

# 🧪 QUICK TESTING SCRIPT FOR DENTAL LAB SYSTEM
# Run this script to perform basic functionality tests

echo "🔧 DENTAL LAB SYSTEM - QUICK TESTING SCRIPT"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print test results
print_test() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo "1. 🏗️  Building application for production..."
npm run build > /dev/null 2>&1
print_test $? "Production build"

echo ""
echo "2. 🔍 Checking for critical errors in key files..."

# Check for syntax errors in key files
key_files=(
    "src/components/bills/BillPrintUtils.js"
    "src/pages/bills/BillsManagementPage.js"
    "src/pages/bills/CreateBillPage.js"
    "src/components/bills/BillsTable.js"
    "src/pages/auth/LoginPage.js"
    "src/services/dentalLabService.js"
)

for file in "${key_files[@]}"; do
    if [ -f "$file" ]; then
        # Basic syntax check
        node -c "$file" > /dev/null 2>&1
        print_test $? "Syntax check: $file"
    else
        echo -e "${RED}❌ File not found: $file${NC}"
    fi
done

echo ""
echo "3. 📦 Checking package dependencies..."
npm list --depth=0 > /dev/null 2>&1
print_test $? "Package integrity"

echo ""
echo "4. 🌐 Starting development server for manual testing..."
print_warning "Please test the following manually in your browser:"
echo ""
echo "🔐 AUTHENTICATION:"
echo "   - Login with admin credentials"
echo "   - Login with staff credentials"
echo "   - Test logout functionality"
echo ""
echo "👨‍⚕️ WORK ORDERS:"
echo "   - Create new work order"
echo "   - Edit existing work order"
echo "   - Test tooth selector"
echo ""
echo "💰 BILLING:"
echo "   - Create single bill"
echo "   - Create grouped bill"
echo "   - Set bill amounts (admin)"
echo "   - Test itemized pricing"
echo ""
echo "🖨️ PRINTING:"
echo "   - Print initial bill (popup window)"
echo "   - Print final bill (popup window)"
echo "   - Verify tooth positions display correctly"
echo ""
echo "📱 RESPONSIVENESS:"
echo "   - Test on mobile devices"
echo "   - Test on tablets"
echo "   - Test different screen sizes"
echo ""
echo "🔒 SECURITY:"
echo "   - Staff cannot access admin pages"
echo "   - Admin can access all areas"
echo "   - Data isolation works correctly"
echo ""

echo "Press Ctrl+C to stop the server when testing is complete..."
echo ""

# Start the development server
npm start
