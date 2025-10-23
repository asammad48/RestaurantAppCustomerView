# Restaurant Ordering System

## Overview

This project is a comprehensive, frontend-only restaurant ordering and service request system built with React and TypeScript. It offers a full-featured dining experience, including ordering, real-time order tracking, payment processing with bill splitting, and service requests. The system is designed to be responsive and mobile-friendly, connecting to an external API for all backend functionalities.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes
- **2025-10-23**: Bug fixes for improved user experience
  - Fixed notification icon visibility in navbar to show for guest users (previously only shown for authenticated users)
  - Fixed allergens section scrolling in cart modal by implementing ScrollArea component for proper content scrolling
  - Fixed infinite loop in placeholder image error handling on restaurant cards by adding fallback flag
  - Fixed branchId URL parameter priority in restaurant menu page to take precedence over stored state
  - Fixed customization options API formatting to support multiple selections as array of objects using flatMap

- **2025-10-23**: Enhanced user experience and guest user support
  - Modified service selection (delivery.tsx) to show locked/disabled options instead of hiding them when not enabled
  - Added warning alert in payment modal for non-logged-in users about potential loss of order history with login button
  - Made order history button always visible in navbar for both logged-in and guest users
  - Implemented dual SignalR connection modes: access_token for authenticated users, deviceId for guest users
  - Added proper connection handoff on login/logout transitions to maintain real-time updates for all users

- **2025-09-30**: Successfully re-imported from GitHub and configured for Replit environment
  - Configured Vite dev server with proper Replit settings (host: 0.0.0.0, port: 5000, allowedHosts: true)
  - Fixed build output directory to match deployment script (dist/public)
  - Set up workflow "Start application" with webview output on port 5000
  - Configured deployment for autoscale with build and start commands
  - Verified application runs successfully in Replit environment
  - Build process tested and verified working correctly

Previous changes:
- **2025-09-23**: Successfully imported from GitHub and configured for Replit environment
- Fixed replit-cartographer plugin compatibility issue by temporarily disabling it
- Configured mock API system to work completely offline in Replit environment
- Updated queryClient.ts to intercept all external API calls and provide mock data
- Fixed allergens API integration in cart-modal.tsx to use mock data
- Verified all core functionality works correctly in the Replit environment with full mock data support

## System Architecture

### UI/UX Decisions
- **Framework**: React 18 with TypeScript
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Responsive Design**: Mobile-first approach with adaptive layouts and touch-friendly elements.
- **Color Management System**: Centralized color configuration in `client/src/lib/colors.ts` using CSS variables for dynamic theme switching (default, blue, purple) and responsive light/dark mode adaptation.
- **Interactive Maps**: Leaflet with OpenStreetMap for real-time location selection and address resolution.
- **Animations**: Framer Motion for smooth UI transitions.

### Technical Implementations
- **Build Tool**: Vite for fast development and optimized production builds.
- **Routing**: Wouter for lightweight client-side routing.
- **State Management**: Zustand for global client-side state (cart, modals, UI state).
- **Data Fetching**: TanStack Query (React Query) for server state management and API caching.
- **API Client**: Custom TypeScript API client with comprehensive error handling and strongly typed interfaces for API requests/responses.
- **Device Identification**: Persistent device ID generation using browser fingerprinting for guest order history, stored in localStorage.

### Feature Specifications
- **Order Processing**: Customer browses menu, adds items to cart, selects payment method (with bill splitting options), reviews order, and tracks status.
- **Service Requests**: Floating button for service requests (e.g., water, music) with status tracking.
- **Order History**: Displays past orders with pagination, detailed order information (items, delivery, split bills, status), and color-coded status badges. Integrated for both logged-in users and device-specific guest orders.
- **AI Budget Estimator**: Inline component for budget estimation based on group size and total budget, with preset options and smart tips. Integrates with existing backend API.
- **Notification System**: Notifications acknowledged via API upon clicking or opening modals, with real-time updates and error feedback.
- **Order Feedback System**: Order-type notifications include integrated feedback submission with star ratings, comments, and payment receipt uploads via PUT `/api/Order/Feedback` API endpoint.

### System Design Choices
- **Frontend Only**: This project focuses solely on the frontend, with all backend logic handled by an external API.
- **Project Structure**: All application code resides in the `client/` directory.
- **Modals**: Comprehensive modal system for various interactions (cart, payment, bill splitting, reviews, service requests, order confirmation).
- **Environment Configuration**: The application was originally designed to connect to an external API at `https://5dtrtpzg-7261.inc1.devtunnels.ms`. In the Replit environment, the app runs with mock data and frontend-only functionality through the TanStack Query client setup.
- **Replit Setup**: Configured to run on port 5000 with host `0.0.0.0` and `allowedHosts: true` for proper proxy support in the Replit environment.
- **Development Server**: Uses Vite dev server with hot module replacement for development.
- **Deployment**: Configured for Replit Deploy with autoscale target, using `npm run build` and `npm run start` commands.

## External Dependencies

- **External Restaurant API**: Provides all backend functionality, including order creation, budget estimation, allergen information, order history, and notification status updates.
- **OpenStreetMap**: Used for interactive maps and location selection.
- **Nominatim API (OpenStreetMap)**: Utilized for reverse geocoding to resolve addresses from coordinates.
- **@tanstack/react-query**: For server state management and API caching.
- **zustand**: For client-side global state management.
- **wouter**: For client-side routing.
- **@radix-ui/***: Accessible UI primitives.
- **tailwindcss**: Utility-first CSS framework.
- **leaflet**: Interactive mapping library.
- **framer-motion**: Animation library.