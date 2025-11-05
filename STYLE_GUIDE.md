# 🎨 UI/UX Style Guide - E-Commerce Auth Platform

## Color Palette

### Primary Colors
```scss
--primary-color: #667eea;      // Primary Purple
--primary-dark: #5568d3;       // Hover State
--secondary-color: #764ba2;    // Secondary Purple (Gradient)
```

### Status Colors
```scss
--success-color: #10b981;      // Success Green
--error-color: #ef4444;        // Error Red
--warning-color: #f59e0b;      // Warning Orange
--info-color: #3b82f6;         // Info Blue
```

### Neutral Colors
```scss
--text-primary: #1f2937;       // Main Text
--text-secondary: #6b7280;     // Secondary Text
--border-color: #e5e7eb;       // Borders
--background-light: #f9fafb;   // Light Background
```

### Password Strength Colors
```scss
Level 1 (Weak):        #ef4444  // Red
Level 2 (Fair):        #f59e0b  // Orange
Level 3 (Good):        #eab308  // Yellow
Level 4 (Strong):      #84cc16  // Light Green
Level 5 (Very Strong): #10b981  // Dark Green
```

## Typography

### Font Family
```scss
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 
             'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 
             'Fira Sans', 'Droid Sans', 'Helvetica Neue', 
             sans-serif;
```

### Font Sizes
```scss
Page Title:       28px (24px mobile)
Subtitle:         16px (14px mobile)
Form Label:       14px
Input Text:       15px (16px mobile to prevent zoom)
Button Text:      16px
Error Message:    13px
Helper Text:      12px
Badge Text:       13px
```

### Font Weights
```scss
Normal:   400
Medium:   500
Semibold: 600
Bold:     700
```

## Layout & Spacing

### Container Widths
```scss
Login Container:  max-width: 450px
Signup Container: max-width: 480px
Mobile:           max-width: 100%
```

### Padding & Margin
```scss
Card Padding:     48px 40px (32px 24px mobile)
Form Group:       margin-bottom: 20px
Input Padding:    12px 14px 12px 44px (with icon)
Button Padding:   14px 24px
```

### Border Radius
```scss
Card:             16px (12px mobile)
Input:            10px
Button:           10px
Badge:            8px
Icon Container:   16px
```

## Components

### Input Fields

#### Structure
```
┌─────────────────────────────────┐
│ Label (14px, semibold)          │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ 🔍 Placeholder text         │ │ ← Icon + Input
│ └─────────────────────────────┘ │
│ ⚠ Error message (if any)       │
└─────────────────────────────────┘
```

#### States
```scss
Default:
  border: 2px solid #e5e7eb
  
Focus:
  border: 2px solid #667eea
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1)
  
Error:
  border: 2px solid #ef4444
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1)
  
Disabled:
  opacity: 0.5
  cursor: not-allowed
```

### Buttons

#### Primary Button
```scss
Background: linear-gradient(135deg, #667eea, #764ba2)
Color: white
Font-weight: 600
Box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1)

Hover:
  transform: translateY(-2px)
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1)
  
Active:
  transform: translateY(0)
  
Disabled:
  opacity: 0.7
  cursor: not-allowed
```

#### Link Button
```scss
Background: none
Border: none
Color: #667eea
Font-weight: 600
Text-decoration: none

Hover:
  color: #5568d3
  text-decoration: underline
```

### Message Banners

#### Success
```scss
Background: #d1fae5
Color: #065f46
Border: 1px solid #a7f3d0
Icon: ✓ checkmark circle
```

#### Error
```scss
Background: #fee2e2
Color: #991b1b
Border: 1px solid #fecaca
Icon: ✗ error circle
```

### Password Strength Meter

```
┌─────────────────────────────────┐
│ ▓▓▓░░ Fair                      │
└─────────────────────────────────┘
  5 bars, progressively filled
  Color matches strength level
  Label on the right
```

## Icons

### Icon System
```scss
Size: 20px × 20px (standard)
      64px × 64px (logo)
      18px × 18px (small)
      
Color: --text-secondary (default)
       --primary-color (active/focus)
       white (on colored background)
```

### Icon Sources
- SVG inline (preferred)
- Heroicons style
- Stroke-based
- 2px stroke width

## Shadows

```scss
--shadow-sm:  0 1px 2px 0 rgba(0, 0, 0, 0.05)
--shadow-md:  0 4px 6px -1px rgba(0, 0, 0, 0.1)
--shadow-lg:  0 10px 15px -3px rgba(0, 0, 0, 0.1)
--shadow-xl:  0 20px 25px -5px rgba(0, 0, 0, 0.1)
```

## Animations

### Timing
```scss
--transition-base: all 0.3s ease
```

### Effects

#### Fade In Up
```scss
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
Duration: 0.6s ease-out
```

#### Slide Down
```scss
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
Duration: 0.3s ease-out
```

#### Spin (Loading)
```scss
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
Duration: 1s linear infinite
```

## Responsive Breakpoints

```scss
Mobile:  0 - 640px
Tablet:  641px - 1024px
Desktop: 1025px+
```

### Mobile Adjustments
```scss
- Reduce padding: 48px → 32px
- Reduce title size: 28px → 24px
- Input font size: 16px (prevent iOS zoom)
- Adjust spacing
- Stack elements vertically
```

## Accessibility

### Focus States
```scss
All interactive elements:
  outline: 2px solid #667eea
  outline-offset: 2px
  border-radius: 4px
```

### ARIA Labels
```jsx
// Required for all inputs
aria-label="Description"
aria-invalid="true|false"
aria-describedby="error-id"

// For messages
role="alert"
aria-live="polite"
```

### Semantic HTML
```html
✓ Use <button> not <div> for buttons
✓ Use <label> for all inputs
✓ Use <form> for forms
✓ Use proper heading hierarchy
✓ Use semantic elements (nav, main, section)
```

## Background

### Gradient
```scss
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)
min-height: 100vh
```

### Glass Effect (Badge)
```scss
background: rgba(255, 255, 255, 0.2)
backdrop-filter: blur(10px)
```

## Component Spacing

### Card Structure
```
┌─────────────────────────────────┐
│  Logo (mb: 24px)                │
│  Title (mb: 8px)                │
│  Subtitle (mb: 32px)            │
│                                  │
│  Message Banner (mb: 24px)      │
│                                  │
│  Form Field 1 (mb: 20px)        │
│  Form Field 2 (mb: 20px)        │
│  Form Field 3 (mb: 20px)        │
│  Form Field 4 (mb: 24px)        │
│                                  │
│  Submit Button (mb: 24px)       │
│                                  │
│  ─────────────────────          │
│  Footer Link                     │
└─────────────────────────────────┘
```

## Form Validation

### Visual Feedback
```scss
Valid Input:
  ✓ No border color change
  ✓ No additional styling
  
Invalid Input:
  ✗ Red border (#ef4444)
  ✗ Red box shadow
  ✗ Error message below (red text)
  ✗ Warning icon in message
  
Focus Valid:
  ✓ Blue border (#667eea)
  ✓ Blue box shadow
  
Focus Invalid:
  ✗ Red border (#ef4444)
  ✗ Red box shadow
```

## Loading States

### Spinner
```html
<svg class="spinner" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="10" 
          stroke="currentColor" 
          stroke-width="4"
          opacity="0.25"/>
  <path fill="currentColor" 
        opacity="0.75"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
</svg>
```

```scss
.spinner {
  width: 20px;
  height: 20px;
  animation: spin 1s linear infinite;
}
```

### Button Loading State
```
┌─────────────────────────────┐
│  ⟳ Loading text...          │
└─────────────────────────────┘
  Spinner + Text
  Disabled state
  Cursor: not-allowed
```

## Best Practices

### Do's ✓
- Use CSS variables for consistency
- Maintain 4:1 contrast ratio (WCAG AA)
- Add focus states to all interactive elements
- Use semantic HTML
- Include ARIA labels
- Test on mobile devices
- Ensure keyboard navigation
- Add loading states
- Provide clear error messages
- Use smooth transitions

### Don'ts ✗
- Don't use fixed pixel widths
- Don't skip focus states
- Don't use div for buttons
- Don't omit alt text
- Don't ignore mobile
- Don't use vague error messages
- Don't make text too small
- Don't use low contrast
- Don't disable zoom on mobile
- Don't autoplay animations excessively

## Example Component

### Complete Form Group
```jsx
<div className="form-group">
  <label htmlFor="email" className="form-label">
    Email Address
  </label>
  <div className="input-wrapper">
    <svg className="input-icon" viewBox="0 0 20 20">
      {/* Icon path */}
    </svg>
    <input
      type="email"
      id="email"
      name="email"
      className={`form-input ${errors.email ? 'error' : ''}`}
      placeholder="you@example.com"
      autoComplete="email"
      aria-invalid={errors.email ? 'true' : 'false'}
      aria-describedby={errors.email ? 'email-error' : undefined}
    />
  </div>
  {errors.email && (
    <p className="error-message" id="email-error" role="alert">
      {errors.email}
    </p>
  )}
</div>
```

## Code Organization

### File Structure
```
Component/
├── Component.jsx    # React component
└── Component.scss   # Styles (modular)
```

### SCSS Structure
```scss
// Import global
@import '../../styles/global.scss';

// Container
.component-container { }

// Card
.component-card { }

// Header
.component-header { }

// Form
.component-form { }

// Elements
.form-group { }
.form-label { }
.form-input { }

// States
.error { }
.success { }
.loading { }

// Responsive
@media (max-width: 640px) { }
```

---

## Quick Reference Card

```
COLORS
Primary: #667eea    Error: #ef4444
Success: #10b981    Warning: #f59e0b

SPACING
Padding: 48px/32px  Margin: 20px
Gap: 8px/12px/24px

BORDERS
Radius: 10px (input), 16px (card)
Width: 2px

SHADOWS
Card: --shadow-xl
Button: --shadow-md

FONTS
Size: 14px/15px/16px/28px
Weight: 400/500/600/700

TRANSITIONS
Duration: 0.3s ease
```

---

**Use this guide to maintain consistency across all components!** 🎨
