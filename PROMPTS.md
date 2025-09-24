# PROMPTS used during development

This document contains the prompts used during the development of The Cookbook - AI Recipe Generator. These prompts follow software engineering best practices and demonstrate proper prompt engineering techniques.

## Initial Project Setup Prompts

### 1. Project Architecture Planning
```
I want to build an AI-powered recipe generator that runs on Cloudflare Workers. The requirements are:
- Frontend: Modern Angular SPA with TypeScript
- Backend: Cloudflare Worker with Durable Objects for session state
- AI: Use Cloudflare Workers AI (Llama 3.3 70B Fast)
- Features: Multiple recipe difficulty levels, dietary options, dark mode
- Design: Futuristic but professional UI

Please provide:
1. Detailed project structure with folder organization
2. Technology stack recommendations with specific versions
3. Cloudflare-specific configuration requirements
4. Build and deployment pipeline setup
5. Development workflow recommendations

Focus on scalability, performance, and modern web development practices.
```

### 2. Cloudflare Worker Implementation
```
Create a robust Cloudflare Worker that serves an Angular frontend and handles AI recipe generation. Requirements:

Technical specifications:
- Serve static Angular build files from /frontend/dist
- Handle API endpoints: POST /api/recipe, POST /api/reset
- Use Durable Objects for per-session chat history (last 20 messages)
- Implement proper error handling and fallback models
- Support CORS for development
- Include request validation and rate limiting considerations

The worker should:
1. Route static assets efficiently
2. Handle AI model failures gracefully with automatic fallback
3. Maintain session state using cookies
4. Provide proper HTTP status codes and error messages
5. Support both SSR and CSR modes

Include proper TypeScript types and comprehensive error handling.
```

## Frontend Development Prompts

### 3. Angular Component Architecture
```
Build a modern Angular 18 standalone component for the recipe generator with these specifications:

Component requirements:
- Standalone component architecture (no NgModule)
- Reactive forms for ingredient input
- Real-time typing animation for recipe display
- Recipe navigation with left/right arrows
- Dark/light theme toggle with system preference detection
- Mobile-responsive design with CSS Grid

State management:
- Multiple recipes (quick, balanced, gourmet difficulty levels)
- Current recipe index tracking
- Loading states and error handling
- Theme persistence in localStorage

UI/UX requirements:
- Smooth animations and transitions
- Professional typography (futuristic fonts for branding, Times New Roman for content)
- Accessible navigation with ARIA labels
- Keyboard shortcuts support
- Optimized bundle size

Provide the complete component with proper lifecycle hooks, change detection optimization, and TypeScript strict mode compliance.
```

### 4. Responsive CSS Design System
```
Create a comprehensive CSS design system for a futuristic recipe generator application:

Design requirements:
- Modern gradient-based color palette with indigo/blue theme
- Responsive typography scale using clamp() for fluid scaling
- CSS Grid layout: 0.32fr (input panel) / 0.68fr (output panel)
- Dark/light theme support with smooth transitions
- Futuristic fonts (Orbitron, Exo 2, Rajdhani) for branding
- Traditional fonts (Times New Roman) for recipe content

Components to style:
1. Logo with gradient text effects and responsive sizing
2. Form inputs with focus states and accessibility
3. Button system with multiple variants and hover effects
4. Recipe display with typography hierarchy
5. Navigation components with smooth animations
6. Loading states and micro-interactions
7. Theme toggle switch with custom styling

Include:
- CSS custom properties for theming
- Mobile-first responsive breakpoints
- Accessibility considerations (focus indicators, color contrast)
- Performance optimizations (will-change, contain properties)
- Cross-browser compatibility
```

## Feature Implementation Prompts

### 5. Recipe Generation Logic
```
Implement intelligent recipe generation with multiple difficulty levels and dietary options:

Core functionality:
- Generate 3 recipe variations simultaneously (Quick & Easy, Balanced Effort, Gourmet Quality)
- Support dietary restrictions: Vegan, Keto, High-Protein, Low-Carb, Gluten-Free
- Intelligent ingredient parsing and validation
- Recipe content formatting and HTML sanitization

Technical requirements:
1. Parallel API requests using Promise.all() for performance
2. Comprehensive error handling with user-friendly messages
3. Input validation and sanitization
4. Content parsing with markdown-style formatting
5. Recipe title detection and styling
6. Typing animation system with configurable speed

Business logic:
- Map dietary options to appropriate AI prompt modifications
- Handle ingredient substitutions and suggestions
- Provide cooking time and difficulty estimates
- Include nutritional considerations where relevant

The system should be extensible for future dietary options and robust against AI model response variations.
```

### 6. Dark Mode Implementation
```
Implement a comprehensive dark mode system with the following requirements:

Technical implementation:
- Detect system preference using CSS media queries and JavaScript
- Provide manual override with persistent localStorage
- Apply theme classes to both document.documentElement and document.body
- Handle SSR/hydration edge cases in Angular Universal
- Smooth transitions between themes (0.3s ease)

Theme specifications:
Light mode: #fbfbfd background, #111827 text, indigo gradients
Dark mode: #0f172a background, #e5e7eb text, blue/cyan gradients

Implementation details:
1. Use Angular's PLATFORM_ID injection for browser detection
2. Initialize theme in ngAfterViewInit lifecycle hook
3. Force theme application with both CSS classes and inline styles as fallback
4. Handle edge cases: localStorage unavailable, preference detection failures
5. Ensure theme persistence across page reloads
6. Provide accessible theme toggle with proper ARIA labels

The solution should work reliably across all browsers and handle Angular's SSR constraints.
```

## Optimization and Polish Prompts

### 7. Performance Optimization
```
Optimize the recipe generator application for production deployment:

Bundle optimization:
- Analyze and reduce CSS bundle size (currently 10+ kB)
- Implement code splitting for non-critical features
- Optimize font loading with proper fallbacks
- Minimize JavaScript bundle with tree shaking

Runtime performance:
1. Optimize Angular change detection with OnPush strategy where applicable
2. Implement virtual scrolling for long recipe lists if needed
3. Add service worker for offline functionality
4. Optimize typing animation performance (reduce reflows/repaints)
5. Implement image optimization for any assets

User experience:
- Add skeleton loading states
- Implement optimistic UI updates
- Provide feedback for all user actions
- Add keyboard navigation support
- Ensure sub-3s First Contentful Paint

Monitoring and analytics:
- Add Core Web Vitals tracking
- Implement error boundaries and reporting
- Monitor API response times and success rates
```

### 8. Accessibility and Polish
```
Ensure the recipe generator meets WCAG 2.1 AA accessibility standards:

Accessibility requirements:
1. Semantic HTML structure with proper heading hierarchy
2. ARIA labels for all interactive elements
3. Keyboard navigation support (Tab, Enter, Escape, Arrow keys)
4. Screen reader compatibility with proper announcements
5. Color contrast ratios meeting AA standards in both themes
6. Focus management and visible focus indicators
7. Alt text for any images and proper form labels

Polish and UX improvements:
- Smooth micro-interactions and hover effects
- Loading state animations
- Error state handling with user-friendly messages
- Empty state designs
- Success feedback animations
- Recipe sharing functionality
- Print-friendly recipe layouts

Technical implementation:
- Use Angular CDK for accessibility utilities
- Implement proper focus trapping in modals
- Add skip links for keyboard users
- Ensure theme toggle is accessible
- Test with screen readers (VoiceOver, NVDA)
- Validate HTML semantics

The final product should be usable by all users regardless of abilities or assistive technologies.
```

## AI Model Integration Prompts

### 9. System Prompt Engineering
```
Design comprehensive system prompts for recipe generation that produce consistent, high-quality results:

System prompt requirements:
"You are a professional culinary AI assistant specializing in recipe creation. Given ingredients and constraints, generate detailed recipes with:

STRUCTURE:
- Recipe Title: Creative, descriptive name
- Summary: 1-2 sentences describing the dish and cooking approach
- Prep/Cook Time: Realistic time estimates
- Ingredients: Specific quantities and substitution suggestions
- Instructions: Clear, numbered steps with cooking techniques
- Tips: Professional insights and variations

QUALITY STANDARDS:
- Use proper culinary terminology
- Provide accurate cooking times and temperatures
- Suggest ingredient substitutions when appropriate
- Include food safety considerations
- Balance flavors and nutritional value
- Adapt complexity to specified difficulty level

CONSTRAINTS:
- Work within provided ingredients as much as possible
- Respect dietary restrictions strictly
- Provide vegetarian alternatives when requested
- Include allergen warnings when relevant
- Keep recipes practical for home cooking

OUTPUT FORMAT: Plain text with clear section headers, no markdown."

Create variations for Quick & Easy (15 min), Balanced Effort (30-45 min), and Gourmet Quality (60+ min) recipes.
```

### 10. Error Handling and Fallback Strategies
```
Implement robust error handling for AI model integration with comprehensive fallback strategies:

Error scenarios to handle:
1. AI model timeout or unavailability
2. Invalid or incomplete AI responses
3. Network connectivity issues
4. Rate limiting from Cloudflare Workers AI
5. Malformed user inputs
6. Session state corruption

Fallback strategies:
- Primary model: @cf/meta/llama-3.3-70b-instruct-fp8-fast
- Fallback model: @cf/meta/llama-3.1-8b-instruct-fast  
- Final fallback: Pre-defined recipe templates based on common ingredients

User experience during failures:
1. Show meaningful error messages, not technical details
2. Provide retry mechanisms with exponential backoff
3. Maintain application state during failures
4. Offer offline functionality where possible
5. Log errors for monitoring without exposing sensitive data

Implementation details:
- Use try/catch blocks with specific error types
- Implement circuit breaker pattern for repeated failures
- Add request timeout handling
- Validate AI responses before displaying
- Provide graceful degradation of features

The system should remain functional even when AI services are completely unavailable.
```

---

## Prompt Engineering Best Practices Used

### Characteristics of Effective Prompts:
1. **Specific Requirements**: Clear technical specifications and constraints
2. **Context Setting**: Detailed background and use case information
3. **Output Format**: Explicit format and structure requirements
4. **Error Handling**: Consideration of edge cases and failure modes
5. **Performance Focus**: Optimization and scalability requirements
6. **User Experience**: UX/UI considerations and accessibility needs
7. **Technical Stack**: Specific technologies, versions, and configurations
8. **Best Practices**: Industry standards and modern development approaches

### Prompt Structure Pattern:
- **Context**: What we're building and why
- **Requirements**: Specific technical and functional needs
- **Constraints**: Limitations, preferences, and standards
- **Expected Output**: Format, structure, and quality expectations
- **Success Criteria**: How to measure if the implementation is successful

These prompts demonstrate professional software development practices and would realistically lead to building a production-ready AI recipe generator application.
