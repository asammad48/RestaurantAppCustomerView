# Restaurant Ordering System

## Overview

This is a comprehensive restaurant ordering and service request system built with React, Express, and PostgreSQL. The application provides a full-featured dining experience with table-based ordering, real-time order tracking, payment processing with bill splitting options, and service requests. The system is designed to be responsive and mobile-friendly, supporting various screen sizes and touch interactions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: Zustand for global state management (cart, modals, UI state)
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Data Fetching**: TanStack Query (React Query) for server state management

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with JSON responses
- **Development**: Hot reload with tsx and Vite middleware integration

### Data Storage Solutions
- **Database**: PostgreSQL with Neon serverless database
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema**: Shared TypeScript schema definitions between client and server
- **Migrations**: Drizzle Kit for database schema management

## Key Components

### Frontend Components Structure
- **Pages**: Home (landing page), Orders (live orders and history), Not Found
- **UI Components**: Comprehensive shadcn/ui component library including buttons, dialogs, forms, navigation
- **Custom Components**: 
  - Food cards with grid/list layouts
  - Navigation bar with cart indicator
  - Footer with social links
  - Floating service request button
- **Modal System**: Complete modal flow for cart, payment, bill splitting, reviews, service requests, and order confirmation

### Backend API Endpoints
- **Menu Items**: GET /api/menu-items, GET /api/menu-items/:id
- **Orders**: GET /api/orders, POST /api/orders, PATCH /api/orders/:id/status
- **Service Requests**: GET /api/service-requests, POST /api/service-requests
- **Reviews**: GET /api/reviews, POST /api/reviews

### Database Schema
- **Users**: Authentication and user management
- **Menu Items**: Product catalog with categories, pricing, discounts, and recommendations
- **Orders**: Order management with status tracking and table assignment
- **Service Requests**: Water bottle requests, music requests, and other table services
- **Reviews**: Order feedback and ratings system

## Data Flow

### Order Processing Flow
1. Customer browses menu items with filtering and search
2. Items added to cart with quantity management
3. Cart review and modification
4. Payment method selection with optional bill splitting
5. Bill splitting by equality or individual items
6. Order review and rating submission
7. Order confirmation and tracking

### Service Request Flow
1. Floating service button accessible from main page
2. Service type selection (water bottle, music request)
3. Additional details collection for specific services
4. Request submission to restaurant staff
5. Status tracking and completion notification

### Real-time Updates
- Order status changes reflected in orders page
- Cart state persisted across page navigation
- Service request status updates

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Neon PostgreSQL database client
- **drizzle-orm**: Type-safe ORM with PostgreSQL support
- **@tanstack/react-query**: Server state management
- **zustand**: Client state management
- **wouter**: Lightweight routing
- **@radix-ui/***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework

### Development Tools
- **vite**: Fast build tool and development server
- **tsx**: TypeScript execution for Node.js
- **drizzle-kit**: Database migration and schema management
- **@replit/vite-plugin-runtime-error-modal**: Development error handling

### Payment and Services
- Currently uses mock payment processing
- Service requests stored in database for staff management
- Future integration points available for payment processors

## Deployment Strategy

### Development Environment
- Vite development server with HMR
- Express server with middleware integration
- TypeScript compilation with incremental builds
- Environment variable configuration for database connection

### Production Build
- Vite builds optimized React application to dist/public
- esbuild bundles Express server to dist/index.js
- Static file serving from built React application
- Database migrations applied via drizzle-kit push

### Configuration Management
- Environment variables for database URL and secrets
- Configurable theming through CSS variables
- Path aliases for clean imports (@/, @shared/, @assets/)

### Responsive Design
- Mobile-first responsive design approach
- Touch-friendly interface elements
- Adaptive layouts for different screen sizes
- Optimized performance for mobile devices

The application implements a complete restaurant ordering ecosystem with emphasis on user experience, accessibility, and responsive design. The modular architecture allows for easy extension and customization of features while maintaining type safety throughout the application.

## Color Configuration System

### API-Driven Color Management
- **Centralized Configuration**: All colors are managed through a shared color system in `client/src/lib/colors.ts`
- **API Integration**: Colors are fetched from `/api/colors` endpoint with theme parameter support
- **CSS Variables**: All colors are applied as CSS variables for dynamic updates without page refresh
- **Theme Switching**: Support for multiple themes (default, blue, purple) with real-time switching

### Available Color Classes
- **Primary Colors**: `.configurable-primary`, `.configurable-primary-hover`, `.configurable-secondary`
- **Text Colors**: `.configurable-text-primary`, `.configurable-text-secondary`, `.configurable-text-muted`
- **Status Colors**: `.configurable-success`, `.configurable-warning`, `.configurable-error`
- **Food Specific**: `.configurable-deal`, `.configurable-recommended`, `.configurable-category`
- **Surface Colors**: `.configurable-surface`, `.configurable-background`, `.configurable-border`

### Implementation Details
- **Color API**: Backend endpoints at `/api/colors` and `/api/themes` for dynamic color management
- **Theme Switcher**: UI component for testing different color schemes (bottom-left corner)
- **Fallback System**: Automatic fallback to default colors if API fails
- **Type Safety**: Full TypeScript support with ColorConfig interface

### Future API Integration
The system is designed to be easily replaced with external API calls. Simply update the `getColors()` function in `client/src/lib/colors.ts` to fetch from your restaurant management system's color configuration API.

**Last Updated**: January 26, 2025 - Implemented comprehensive color configuration system