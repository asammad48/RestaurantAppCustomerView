# Restaurant Ordering System

## Overview

This is a comprehensive restaurant ordering and service request system built with React and TypeScript. This is a frontend-only application that connects to an external API for all backend functionality. The application provides a full-featured dining experience with ordering, real-time order tracking, payment processing with bill splitting options, and service requests. The system is designed to be responsive and mobile-friendly, supporting various screen sizes and touch interactions.

## Recent Changes

**September 13, 2025 - Project Import Setup Completed**
- Successfully imported GitHub project into Replit environment
- Configured Vite development server to run on port 5000 with proper host settings
- Set up workflow for frontend application with webview output
- Configured deployment settings for autoscale deployment target
- Externalized API base URL using VITE_API_BASE_URL environment variable
- Cleaned up documentation to remove backend references
- Verified application runs correctly and responds with HTTP 200
- All dependencies installed and working properly

### Environment Variables Setup
For production deployment, set the following environment variables:
- **VITE_API_BASE_URL**: The base URL for the external restaurant API (required for production)
  - Example: `https://api.your-restaurant-system.com`
  - Default development fallback: Uses development tunnel if not set

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

### External API Integration
- **External API**: Connects to external restaurant management API
- **Base URL**: Configurable via VITE_API_BASE_URL environment variable
- **API Client**: Custom TypeScript API client with comprehensive error handling
- **Data Types**: Strongly typed interfaces for all API requests and responses

### Project Structure
- **Frontend Only**: No backend components in this project
- **Client Code**: All application code located in `client/` directory
- **Build Tool**: Vite configured for frontend development and production builds
- **Development**: Hot reload with Vite development server on port 5000

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

### External API Endpoints
- **Orders**: POST /api/Order - Create new orders
- **Budget Estimator**: POST /api/customer-search/estimate - AI budget estimation
- **Allergens**: GET /api/Generic/allergens - Get allergen information
- **Order History**: GET /api/Order/ByUserAndDevice - Get user order history

### API Configuration
- **Base URL**: Configurable via VITE_API_BASE_URL environment variable
- **Default URL**: Falls back to development tunnel if env var not set
- **Error Handling**: Comprehensive API error handling with status code management
- **TypeScript**: Fully typed API requests and responses

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

## Dependencies

### Core Dependencies
- **@tanstack/react-query**: Server state management and API caching
- **zustand**: Client state management for cart and UI state
- **wouter**: Lightweight routing for single-page application
- **@radix-ui/***: Accessible UI primitives for components
- **tailwindcss**: Utility-first CSS framework
- **react**: React 18 with TypeScript support
- **leaflet**: Interactive mapping for location selection
- **framer-motion**: Animation library for smooth UI transitions

### Development Tools
- **vite**: Fast build tool and development server
- **typescript**: Type safety throughout the application
- **@replit/vite-plugin-runtime-error-modal**: Development error handling
- **@replit/vite-plugin-cartographer**: Code analysis (development only)

### External Services
- **OpenStreetMap**: Free mapping service for location features
- **Nominatim API**: Reverse geocoding for address resolution
- **External Restaurant API**: All backend functionality provided via external API

## Deployment Strategy

### Development Environment
- Vite development server with HMR on port 5000
- Host configured as 0.0.0.0 with allowedHosts: true for Replit proxy
- TypeScript compilation with incremental builds
- Environment variable configuration for API endpoints

### Production Build
- Vite builds optimized React application to dist/public
- Static file serving using 'serve' package on port 5000
- Autoscale deployment target for Replit Deploy
- All assets bundled and optimized for production

### Configuration Management
- Environment variables for API base URL (VITE_API_BASE_URL)
- Configurable theming through CSS variables
- Path aliases for clean imports (@/, @assets/)
- CORS handling managed by external API service

### Responsive Design
- Mobile-first responsive design approach
- Touch-friendly interface elements
- Adaptive layouts for different screen sizes
- Optimized performance for mobile devices

The application implements a complete restaurant ordering ecosystem with emphasis on user experience, accessibility, and responsive design. The modular architecture allows for easy extension and customization of features while maintaining type safety throughout the application.

## Color Configuration System

### Color Management System
- **Centralized Configuration**: All colors are managed through a shared color system in `client/src/lib/colors.ts`
- **CSS Variables**: All colors are applied as CSS variables for dynamic updates without page refresh
- **Theme Switching**: Support for multiple themes (default, blue, purple) with real-time switching
- **Responsive Design**: Colors adapt to light and dark mode preferences

### Available Color Classes
- **Primary Colors**: `.configurable-primary`, `.configurable-primary-hover`, `.configurable-secondary`
- **Text Colors**: `.configurable-text-primary`, `.configurable-text-secondary`, `.configurable-text-muted`
- **Status Colors**: `.configurable-success`, `.configurable-warning`, `.configurable-error`
- **Food Specific**: `.configurable-deal`, `.configurable-recommended`, `.configurable-category`
- **Surface Colors**: `.configurable-surface`, `.configurable-background`, `.configurable-border`

### Implementation Details
- **Theme Switcher**: UI component for testing different color schemes (bottom-left corner)
- **Fallback System**: Automatic fallback to default colors for consistent experience
- **Type Safety**: Full TypeScript support with ColorConfig interface
- **Performance**: Colors are cached and applied efficiently via CSS custom properties

### Customization
The color system can be easily customized by modifying the color definitions in `client/src/lib/colors.ts`. All components automatically inherit the new color scheme through CSS custom properties.

## Order History Integration

### API Integration
- **External API**: Integrated with order history API endpoint `/api/Order/ByUserAndDevice`
- **Parameters**: Supports UserId (when logged in), DeviceId (persistent), PageNumber, and PageSize for pagination
- **Response**: Comprehensive order data including items, delivery details, split bills, and order status tracking

### Device ID System
- **Persistent Device Identification**: Browser fingerprinting system that generates consistent device IDs
- **Storage**: Uses localStorage with fallback to generate new ID if needed
- **Format**: `WEB_` prefix followed by unique fingerprint hash
- **Characteristics**: Combines screen resolution, timezone, user agent, platform, hardware specs, and canvas fingerprinting

### Order History Features
- **Pagination**: Full pagination support with previous/next navigation
- **Order Details**: Expandable cards showing complete order information
- **Status Tracking**: Color-coded order status badges (Pending, Confirmed, Preparing, Ready, Delivered, Cancelled)
- **Split Bills**: Display of split bill details and payment assignments
- **Delivery Info**: Complete delivery address and instruction display
- **User Context**: Shows orders for logged-in users or device-specific orders for guests

### UI Components
- **OrderHistory Component**: Main component with TanStack Query integration for data fetching
- **OrderCard**: Individual order display with expandable details
- **Navigation**: Added to user dropdown menu in navbar for authenticated users
- **Responsive Design**: Mobile-friendly layout with adaptive card design

## Map Integration System

### Interactive Location Selection
- **Real Map Integration**: Implemented Leaflet with OpenStreetMap tiles for genuine interactive maps
- **Location Picker**: Complete map picker modal with click-to-select and draggable markers
- **Address Resolution**: Automatic reverse geocoding using OpenStreetMap Nominatim API
- **Free Service**: No API keys required, uses open-source mapping solutions

### Map Features
- **Interactive Markers**: Draggable red markers for precise location selection
- **Click Selection**: Users can click anywhere on the map to select locations
- **Address Lookup**: Automatic conversion of coordinates to readable addresses
- **Fallback Handling**: Graceful fallback to coordinates if address lookup fails
- **Responsive Design**: Optimized for mobile and desktop interactions

### Technical Implementation
- **Leaflet Library**: Professional mapping library with full feature support
- **Memory Management**: Proper cleanup of map instances to prevent memory leaks
- **State Management**: Coordinate state synchronization between map and form components
- **Error Handling**: Robust error handling for geocoding and map initialization

## AI Budget Estimator System

### Inline Implementation
- **Integration Method**: Implemented directly inline within restaurant-menu.tsx due to vite-plugin-cartographer compatibility issues
- **Design Compliance**: Matches exact UI requirements from provided design specifications
- **Location**: Right sidebar panel on desktop (hidden on mobile as designed)

### Feature Components
- **Group Size Input**: Users icon with number input and validation
- **Total Budget Input**: DollarSign icon with amount input and dynamic per-person calculation
- **Popular Ranges**: Three preset buttons (Light: 1500, Standard: 3000, Premium: 6000) with per-person breakdown
- **Smart Tips Section**: Lightbulb icon with helpful budgeting advice and green background styling
- **How AI Works Section**: Info icon explaining algorithm approach with purple background styling
- **Generate Button**: Calculator icon integration with existing backend API functionality

### API Integration
- **Single API Call**: Eliminates duplicate API calls by using form data collection and parent state management
- **Backend Integration**: Connects to existing budget estimation API with proper request formatting
- **Navigation Flow**: Automatic transition to AI Budget component upon successful estimation
- **State Management**: Uses existing aiGroupSize, aiBudget, aiSelectedCategories state variables

### Technical Implementation
- **Responsive Design**: Desktop-only display with mobile-first approach maintained
- **Test IDs**: Comprehensive data-testid attributes for all interactive elements
- **State Synchronization**: Form data properly synchronized with parent component state
- **Error Handling**: Graceful handling of API errors and loading states

**Last Updated**: September 11, 2025 - Completed AI Budget Estimator implementation with full design compliance and API integration