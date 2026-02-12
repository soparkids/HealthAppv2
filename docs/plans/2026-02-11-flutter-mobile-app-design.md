# HealthApp Flutter Mobile App — Design

## Scope

Patient-only mobile client (v1) connecting to the existing HealthApp Next.js API. Core essentials: dashboard, view records, view reports with simplified medical language. No upload, sharing, family management, or push notifications in v1.

## Architecture

Flutter + Riverpod app in a separate `healthapp_mobile/` folder alongside the web app.

```
healthapp_mobile/
├── lib/
│   ├── main.dart
│   ├── app.dart
│   ├── config/
│   │   └── api_config.dart
│   ├── models/
│   │   ├── user.dart
│   │   ├── medical_record.dart
│   │   ├── report.dart
│   │   └── follow_up.dart
│   ├── providers/
│   │   ├── auth_provider.dart
│   │   ├── records_provider.dart
│   │   ├── dashboard_provider.dart
│   │   └── report_provider.dart
│   ├── services/
│   │   ├── api_client.dart
│   │   ├── auth_service.dart
│   │   └── records_service.dart
│   └── screens/
│       ├── auth/
│       │   └── login_screen.dart
│       ├── dashboard/
│       │   └── dashboard_screen.dart
│       ├── records/
│       │   ├── records_screen.dart
│       │   └── record_detail_screen.dart
│       └── report/
│           └── report_viewer_screen.dart
```

## Screens & Navigation

### Auth (no bottom nav)
- **Login** — Email + password. Register and forgot password link out to the web app.

### Main (3-tab bottom nav)
- **Dashboard** — Welcome banner, stats cards (total records, pending follow-ups), recent records, upcoming follow-ups.
- **Records** — Searchable/filterable list with type badges. Tap opens record detail.
- **Profile** — User info, logout.

### Detail screens (pushed with back arrow)
- **Record Detail** — Metadata, report summary + key findings, "View Full Report" button.
- **Report Viewer** — Full report text with tappable medical term tooltips.

### Navigation
GoRouter with auth guards. Unauthenticated users redirect to login.

## API Integration

### Endpoints used

| Feature | Method | Endpoint |
|---------|--------|----------|
| Login | POST | `/api/auth/callback/credentials` |
| Profile | GET | `/api/users/profile` |
| Records list | GET | `/api/records?search=&type=&page=&limit=` |
| Record detail | GET | `/api/records/[id]` |
| Follow-ups | GET | `/api/follow-ups` |
| Report terms | GET | `/api/reports/[id]/terms` |

### API Client
Single `ApiClient` class using the `http` package:
- Configurable base URL (dev/prod)
- JWT Bearer token from `flutter_secure_storage`
- Centralized error handling (401 → logout, 500 → user message)

### Riverpod Providers
- `authProvider` — JWT management, login/logout, secure storage persistence
- `recordsProvider` — Record list with search/filter
- `recordDetailProvider(id)` — Single record with report
- `dashboardProvider` — Aggregated stats from records + follow-ups
- `reportTermsProvider(id)` — Parsed medical terms for tooltips

## Decisions

- **No offline support** in v1. Show "No connection" on API failure.
- **No registration** in app. Users register on web, log in on mobile.
- **No upload/sharing/family** in v1. View-only for records.
- **No push notifications** in v1.
- **Patients only** — providers use the web app.

## Dependencies

- `flutter_riverpod` — State management
- `go_router` — Declarative routing with auth guards
- `http` — API calls
- `flutter_secure_storage` — JWT persistence
- `intl` — Date formatting
- `google_fonts` — Typography
