# Layanan Digital - AI Agent Documentation

## Project Overview

**Layanan Digital** is a digital services e-commerce web application built with React, TypeScript, and Vite. It provides a platform for users to browse, purchase, and manage digital services such as Wi-Fi installation, CCTV setup, code debugging, photo/video editing, and VPS hosting.

The application supports two main user roles:
- **Customers**: Browse products, manage cart, place orders, and access support
- **Admins**: Manage products, orders, support tickets, and view analytics

### Key Features
- Product catalog with 6 services (Wi-Fi, CCTV, Code Repair, Photo Editing, Video Editing, VPS)
- Tiered pricing system (Basic/Standard/Premium) for each service
- Shopping cart with selection and quantity management
- User authentication via Firebase (Google OAuth + Email/Password)
- Order management with payment tracking
- Support ticket system
- Dark/light mode toggle
- Sound effects for UI interactions
- Responsive mobile-first design
- Admin dashboard with analytics charts

---

## Technology Stack

| Category | Technology |
|----------|------------|
| **Framework** | React 19.2.0 |
| **Language** | TypeScript 5.9.3 |
| **Build Tool** | Vite 7.2.4 |
| **Styling** | Tailwind CSS 3.4.19 |
| **UI Components** | shadcn/ui (Radix UI primitives) |
| **State Management** | Zustand 5.0.11 (with persistence) |
| **Authentication** | Firebase Auth |
| **Database** | Firebase Firestore |
| **Email Service** | EmailJS |
| **Charts** | Recharts |
| **Icons** | Lucide React |
| **Forms** | React Hook Form + Zod |
| **Notifications** | Sonner |

---

## Project Structure

```
/root/Web-Dev
├── src/
│   ├── components/           # React components
│   │   ├── ui/              # shadcn/ui components (50+ components)
│   │   ├── BottomNav.tsx    # Mobile bottom navigation
│   │   ├── Header.tsx       # App header with search/menu
│   │   ├── Sidebar.tsx      # Navigation sidebar
│   │   ├── ProductReviews.tsx
│   │   ├── WelcomeModal.tsx
│   │   └── TutorialModal.tsx
│   ├── sections/            # Page sections/routes
│   │   ├── HomeSection.tsx      # Product catalog home
│   │   ├── CartSection.tsx      # Shopping cart
│   │   ├── CheckoutSection.tsx  # Checkout flow
│   │   ├── AuthSection.tsx      # Login/register
│   │   ├── ProfileSection.tsx   # User profile
│   │   ├── SupportSection.tsx   # Help & support tickets
│   │   └── admin/               # Admin sections
│   │       ├── AdminDashboard.tsx
│   │       ├── AdminOrders.tsx
│   │       └── AdminProducts.tsx
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.ts       # Firebase auth logic
│   │   ├── useCart.ts       # Cart operations
│   │   ├── usePayment.ts    # Payment handling
│   │   ├── useProducts.ts   # Product CRUD
│   │   └── useSupport.ts    # Support ticket operations
│   ├── lib/                 # Utility libraries
│   │   ├── utils.ts         # Tailwind cn() helper
│   │   ├── firebase.ts      # Firebase Auth config
│   │   ├── firebase-db.ts   # Firebase Firestore database operations
│   │   ├── audio.ts         # Sound effects service
│   │   ├── emailjs.ts       # Email service
│   │   ├── pakasir.ts       # Payment integration
│   │   └── telegram.ts      # Telegram bot integration
│   ├── store/
│   │   └── appStore.ts      # Zustand global state
│   ├── App.tsx              # Main customer app
│   ├── AdminApp.tsx         # Admin panel app
│   ├── main.tsx             # Entry point with routing
│   └── index.css            # Tailwind + CSS variables
├── dist/                    # Build output
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── eslint.config.js
├── components.json          # shadcn/ui config
└── index.html
```

---

## Build and Development Commands

```bash
# Install dependencies
npm install

# Start development server (runs on port 3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run ESLint
npm run lint
```

### Build Process
The build process compiles TypeScript (`tsc -b`) and bundles with Vite. Output goes to `dist/` directory.

---

## Code Style Guidelines

### TypeScript Configuration
- **Target**: ES2022
- **Module**: ESNext with bundler resolution
- **Strict mode**: Enabled
- **Path alias**: `@/*` maps to `./src/*`

### Component Patterns
- Use functional components with hooks
- Props interfaces defined inline or with `type`
- shadcn/ui components use Radix UI primitives
- Tailwind classes for styling with `cn()` utility for conditional classes

### Naming Conventions
- Components: PascalCase (e.g., `HomeSection.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useAuth.ts`)
- Utilities: camelCase (e.g., `utils.ts`)
- Types/Interfaces: PascalCase (e.g., `Product`, `UserProfile`)

### Import Order
1. React imports
2. Third-party libraries
3. `@/` aliased imports (project files)
4. Relative imports (if needed)
5. Type-only imports

---

## Key Data Models

### Product
```typescript
interface Product {
  id: string;
  title: string;
  category: 'installation' | 'creative' | 'technical';
  base_price: number;
  discount_price?: number;
  stock: number;
  image: string;
  icon: string;
  rating: number;
  reviews: number;
  duration: string;
  description: string;
  tags: string[];
  tiers: Tier[];
  related: string[];
  created_at?: string;
  updated_at?: string;
}

interface Tier {
  name: string;
  price: number;
  features: string[];
}
```

### Order
```typescript
interface Order {
  id: string;
  user_id: string;
  items: OrderItem[];
  total_amount: number;
  status: 'pending' | 'paid' | 'processing' | 'completed' | 'cancelled';
  payment_method: string;
  payment_reference?: string;
  created_at?: string;
  updated_at?: string;
}
```

---

## Environment Variables

The application expects these environment variables (all have fallback defaults):

```bash
# Firebase
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID

# EmailJS
VITE_EMAILJS_SERVICE_ID
VITE_EMAILJS_TEMPLATE_ID
VITE_EMAILJS_PUBLIC_KEY
```

---

## Testing

**Note**: This project currently does not have automated tests configured. The codebase includes:
- TypeScript for type checking
- ESLint for code quality

When adding tests, consider:
- Unit tests for hooks in `src/hooks/`
- Component tests for UI components
- Integration tests for auth flow

---

## Security Considerations

### Authentication
- Firebase Auth handles all authentication
- JWT tokens managed by Firebase
- Admin panel uses hardcoded credentials (development only):
  - Email: `admin@lumakara.com`
  - Password: `admin123`

### Database
- Firebase Firestore security rules should be configured
- Service keys are embedded as fallbacks (not recommended for production)

### Payment
- Payment integration via `pakasir.ts` library
- Actual payment processing should use proper backend validation

---

## Deployment

The project builds to static files in `dist/`:

```bash
npm run build
```

Deploy the `dist/` folder to any static hosting service:
- Vercel
- Netlify
- Firebase Hosting
- GitHub Pages

---

## Development Notes

### Adding New shadcn/ui Components
```bash
npx shadcn add <component-name>
```

### Mock Data Fallback
The application includes mock product data in `src/lib/firebase-db.ts` that serves as fallback when Firestore is unavailable.

### Audio Service
Sound effects are loaded from external CDN (mixkit.co). The `audioService` in `src/lib/audio.ts` manages all sound playback.

### Routing
- `/` - Customer app (Home)
- `/cart` - Shopping cart
- `/auth` - Authentication
- `/profile` - User profile
- `/checkout` - Checkout flow
- `/support` - Support tickets
- `/admin/*` - Admin panel

---

## Common Tasks

### Adding a New Product Category
1. Update `categories` array in `HomeSection.tsx`
2. Update TypeScript type in `Product.category`
3. Add category icon mapping

### Adding a New Admin Feature
1. Create content component in `AdminApp.tsx` or as separate file
2. Add menu item to `menuItems` array
3. Add case to `renderContent()` switch statement

### Modifying Cart Behavior
- Cart state managed in `src/store/appStore.ts`
- Cart operations in `useCart.ts` hook
- Cart UI in `CartSection.tsx`

---

## Firebase Firestore Setup

To set up Firebase Firestore for this project:

1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Authentication (Email/Password and Google sign-in)
3. Create a Firestore database
4. Set up security rules for Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read/write their own profile
    match /profiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow read products for everyone
    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Allow users to read their own orders
    match /orders/{orderId} {
      allow read: if request.auth != null && resource.data.user_id == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.user_id == request.auth.uid;
      allow update: if request.auth != null;
    }
    
    // Allow users to read their own tickets
    match /support_tickets/{ticketId} {
      allow read: if request.auth != null && resource.data.user_id == request.auth.uid;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
    }
  }
}
```

5. Copy your Firebase config and set as environment variables
