# Restaurant Ordering System

## Overview

This project is a comprehensive, frontend-only restaurant ordering and service request system built with React and TypeScript. It offers a full-featured dining experience, including ordering, real-time order tracking, payment processing with bill splitting, and service requests. The system is designed to be responsive and mobile-friendly, connecting to an external API for all backend functionalities.

## User Preferences

Preferred communication style: Simple, everyday language.

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

### System Design Choices
- **Frontend Only**: This project focuses solely on the frontend, with all backend logic handled by an external API.
- **Project Structure**: All application code resides in the `client/` directory.
- **Modals**: Comprehensive modal system for various interactions (cart, payment, bill splitting, reviews, service requests, order confirmation).
- **Environment Configuration**: API base URL configured via `VITE_API_BASE_URL` environment variable.
- **Deployment**: Vite builds optimized React application for production, deployed via Replit Deploy with autoscale target.

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