# Alert System Documentation

A reusable, centralized alert/toast notification system for the application.

## Overview

The alert system provides a consistent way to display success, error, warning, and info messages across the entire application. It consists of three main parts:

1. **AlertService** - Core service for managing alerts
2. **AlertComponent** - UI component for displaying alerts
3. **Integration** - Already integrated in the main App component

## Features

- ✅ Four alert types: `success`, `error`, `warning`, `info`
- ✅ Auto-dismiss with configurable duration
- ✅ Manual dismiss with close button
- ✅ Progress bar showing auto-dismiss countdown
- ✅ Smooth animations (slide-in and fade-out)
- ✅ Color-coded by type
- ✅ Optional title and message
- ✅ Stacking of multiple alerts

## Usage

### Basic Usage

```typescript
import { AlertService } from '../../core/services/alert.service';

export class YourComponent {
  constructor(private alertService: AlertService) {}

  doSomething() {
    // Show success alert
    this.alertService.success('Operation completed successfully!');

    // Show error alert
    this.alertService.error('Something went wrong!');

    // Show warning alert
    this.alertService.warning('Please check your input');

    // Show info alert
    this.alertService.info('This is informational');
  }
}
```

### Advanced Usage

```typescript
// With custom title and duration
this.alertService.success(
  'User updated successfully',
  'Success',
  3000 // auto-dismiss after 3 seconds
);

// Without auto-dismiss (0 means no auto-dismiss)
this.alertService.error(
  'Critical error occurred',
  'Error',
  0 // don't auto-dismiss
);

// Generic show method
this.alertService.show('Custom message', 'warning', 'Custom Title', 5000);
```

### API Reference

#### AlertService Methods

| Method         | Signature                                                                   | Default Duration | Description                  |
| -------------- | --------------------------------------------------------------------------- | ---------------- | ---------------------------- |
| `success()`    | `success(message: string, title?: string, duration?: number)`               | 5000ms           | Show success alert           |
| `error()`      | `error(message: string, title?: string, duration?: number)`                 | 5000ms           | Show error alert             |
| `warning()`    | `warning(message: string, title?: string, duration?: number)`               | 5000ms           | Show warning alert           |
| `info()`       | `info(message: string, title?: string, duration?: number)`                  | 5000ms           | Show info alert              |
| `show()`       | `show(message: string, type: AlertType, title?: string, duration?: number)` | 5000ms           | Show custom alert            |
| `dismiss()`    | `dismiss(alertId: string)`                                                  | -                | Dismiss specific alert by ID |
| `dismissAll()` | `dismissAll()`                                                              | -                | Dismiss all alerts           |

#### Alert Interface

```typescript
interface Alert {
  id: string; // Unique identifier
  type: AlertType; // 'success' | 'error' | 'warning' | 'info'
  message: string; // Alert message text
  title?: string; // Optional alert title
  duration?: number; // Duration in milliseconds before auto-dismiss
}
```

## Styling

The alert component uses Tailwind CSS for styling and supports light/dark color variations based on the alert type:

- **Success**: Green (#10b981)
- **Error**: Red (#ef4444)
- **Warning**: Yellow (#eab308)
- **Info**: Blue (#3b82f6)

## Examples

### In a Form Component

```typescript
export class LoginComponent {
  constructor(private authService: AuthService, private alertService: AlertService) {}

  login() {
    this.authService.login(credentials).subscribe({
      next: (response) => {
        this.alertService.success('Logged in successfully!');
        // Navigate to dashboard
      },
      error: (err) => {
        this.alertService.error('Invalid credentials. Please try again.');
      },
    });
  }
}
```

### In the Admin Dashboard (Current Implementation)

```typescript
export class AdminDashboard {
  constructor(private alertService: AlertService) {}

  updatePricing() {
    this.adminApi.updateTierPrices(tierId, prices).subscribe({
      next: (response) => {
        this.alertService.success('Pricing updated successfully!');
      },
      error: (err) => {
        this.alertService.error('Failed to update pricing');
      },
    });
  }
}
```

## File Structure

```
src/
├── app/
│   ├── core/
│   │   └── services/
│   │       └── alert.service.ts       # AlertService
│   ├── features/
│   │   └── dashboard/
│   │       └── shared/
│   │           └── alert/
│   │               ├── alert.component.ts     # AlertComponent
│   │               ├── alert.component.html   # Alert template
│   │               └── alert.component.css    # Alert styles
│   └── app.ts                          # Includes AlertComponent
```

## Notes

- The AlertComponent is automatically integrated into the main App component
- Alerts are positioned in the top-right corner of the screen
- Multiple alerts stack vertically
- Each alert has a unique ID for individual management
- Default auto-dismiss duration is 5 seconds
- The service uses Angular signals for reactive state management
