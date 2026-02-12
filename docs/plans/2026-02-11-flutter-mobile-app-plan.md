# HealthApp Flutter Mobile App — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a patient-facing Flutter mobile app that connects to the existing HealthApp Next.js API for viewing dashboard, medical records, and reports with simplified medical language.

**Architecture:** Flutter + Riverpod app in `healthapp_mobile/` folder. API client with JWT auth talks to the Next.js backend. GoRouter handles navigation with auth guards.

**Tech Stack:** Flutter, Riverpod, GoRouter, http, flutter_secure_storage, google_fonts, intl

---

### Task 1: Create Flutter Project & Add Dependencies

**Files:**
- Create: `healthapp_mobile/` (Flutter project)
- Modify: `healthapp_mobile/pubspec.yaml`

**Step 1: Create Flutter project**

Run from `/Users/okenwaikwan/Documents/HealthApp`:
```bash
flutter create healthapp_mobile --org com.healthapp --platforms ios,android
```
Expected: Flutter project created in `healthapp_mobile/`

**Step 2: Replace pubspec.yaml dependencies**

Replace the `dependencies` and `dev_dependencies` sections in `healthapp_mobile/pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  flutter_riverpod: ^2.6.1
  go_router: ^14.8.1
  http: ^1.3.0
  flutter_secure_storage: ^9.2.4
  google_fonts: ^6.2.1
  intl: ^0.20.2

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^5.0.0
  mocktail: ^1.0.4
```

**Step 3: Install dependencies**

Run:
```bash
cd healthapp_mobile && flutter pub get
```
Expected: All packages resolved successfully

**Step 4: Commit**

```bash
git add healthapp_mobile/
git commit -m "scaffold: create Flutter project with dependencies"
```

---

### Task 2: Models

**Files:**
- Create: `healthapp_mobile/lib/models/user.dart`
- Create: `healthapp_mobile/lib/models/medical_record.dart`
- Create: `healthapp_mobile/lib/models/report.dart`
- Create: `healthapp_mobile/lib/models/follow_up.dart`
- Test: `healthapp_mobile/test/models/medical_record_test.dart`

**Step 1: Write model test**

```dart
// test/models/medical_record_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:healthapp_mobile/models/medical_record.dart';
import 'package:healthapp_mobile/models/report.dart';

void main() {
  group('MedicalRecord', () {
    test('fromJson parses complete record with report', () {
      final json = {
        'id': 'rec-1',
        'userId': 'user-1',
        'title': 'Chest X-Ray',
        'type': 'XRAY',
        'bodyPart': 'Chest',
        'facility': 'City General Hospital',
        'referringPhysician': 'Dr. Chen',
        'recordDate': '2026-02-03T00:00:00.000Z',
        'fileUrl': null,
        'thumbnailUrl': null,
        'fileType': null,
        'fileSize': null,
        'notes': 'Annual checkup',
        'createdAt': '2026-02-03T00:00:00.000Z',
        'updatedAt': '2026-02-03T00:00:00.000Z',
        'report': {
          'id': 'rpt-1',
          'medicalRecordId': 'rec-1',
          'content': 'Normal chest radiograph.',
          'summary': 'Normal findings.',
          'keyFindings': 'Clear lungs',
          'createdAt': '2026-02-03T00:00:00.000Z',
        },
      };

      final record = MedicalRecord.fromJson(json);

      expect(record.id, 'rec-1');
      expect(record.title, 'Chest X-Ray');
      expect(record.type, RecordType.xray);
      expect(record.bodyPart, 'Chest');
      expect(record.report, isNotNull);
      expect(record.report!.summary, 'Normal findings.');
    });

    test('fromJson handles null optional fields', () {
      final json = {
        'id': 'rec-2',
        'userId': 'user-1',
        'title': 'Test',
        'type': 'OTHER',
        'bodyPart': null,
        'facility': null,
        'referringPhysician': null,
        'recordDate': '2026-01-01T00:00:00.000Z',
        'fileUrl': null,
        'thumbnailUrl': null,
        'fileType': null,
        'fileSize': null,
        'notes': null,
        'createdAt': '2026-01-01T00:00:00.000Z',
        'updatedAt': '2026-01-01T00:00:00.000Z',
        'report': null,
      };

      final record = MedicalRecord.fromJson(json);

      expect(record.bodyPart, isNull);
      expect(record.report, isNull);
    });
  });
}
```

**Step 2: Run test to verify it fails**

Run: `cd healthapp_mobile && flutter test test/models/medical_record_test.dart`
Expected: FAIL — cannot find models

**Step 3: Write all models**

```dart
// lib/models/user.dart
class User {
  final String id;
  final String email;
  final String? name;
  final String role;
  final String? avatar;
  final DateTime createdAt;

  const User({
    required this.id,
    required this.email,
    this.name,
    required this.role,
    this.avatar,
    required this.createdAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      email: json['email'] as String,
      name: json['name'] as String?,
      role: json['role'] as String,
      avatar: json['avatar'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}
```

```dart
// lib/models/report.dart
class Report {
  final String id;
  final String medicalRecordId;
  final String content;
  final String? summary;
  final String? keyFindings;
  final DateTime createdAt;

  const Report({
    required this.id,
    required this.medicalRecordId,
    required this.content,
    this.summary,
    this.keyFindings,
    required this.createdAt,
  });

  factory Report.fromJson(Map<String, dynamic> json) {
    return Report(
      id: json['id'] as String,
      medicalRecordId: json['medicalRecordId'] as String,
      content: json['content'] as String,
      summary: json['summary'] as String?,
      keyFindings: json['keyFindings'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

class HighlightedTerm {
  final String term;
  final String definition;
  final String category;
  final int startIndex;
  final int endIndex;

  const HighlightedTerm({
    required this.term,
    required this.definition,
    required this.category,
    required this.startIndex,
    required this.endIndex,
  });

  factory HighlightedTerm.fromJson(Map<String, dynamic> json) {
    return HighlightedTerm(
      term: json['term'] as String,
      definition: json['definition'] as String,
      category: json['category'] as String,
      startIndex: json['startIndex'] as int,
      endIndex: json['endIndex'] as int,
    );
  }
}
```

```dart
// lib/models/medical_record.dart
import 'report.dart';

enum RecordType {
  mri,
  xray,
  ultrasound,
  ctScan,
  other;

  static RecordType fromString(String value) {
    switch (value) {
      case 'MRI':
        return RecordType.mri;
      case 'XRAY':
        return RecordType.xray;
      case 'ULTRASOUND':
        return RecordType.ultrasound;
      case 'CT_SCAN':
        return RecordType.ctScan;
      default:
        return RecordType.other;
    }
  }

  String get displayName {
    switch (this) {
      case RecordType.mri:
        return 'MRI';
      case RecordType.xray:
        return 'X-Ray';
      case RecordType.ultrasound:
        return 'Ultrasound';
      case RecordType.ctScan:
        return 'CT Scan';
      case RecordType.other:
        return 'Other';
    }
  }
}

class MedicalRecord {
  final String id;
  final String userId;
  final String title;
  final RecordType type;
  final String? bodyPart;
  final String? facility;
  final String? referringPhysician;
  final DateTime recordDate;
  final String? fileUrl;
  final String? thumbnailUrl;
  final String? fileType;
  final int? fileSize;
  final String? notes;
  final DateTime createdAt;
  final DateTime updatedAt;
  final Report? report;

  const MedicalRecord({
    required this.id,
    required this.userId,
    required this.title,
    required this.type,
    this.bodyPart,
    this.facility,
    this.referringPhysician,
    required this.recordDate,
    this.fileUrl,
    this.thumbnailUrl,
    this.fileType,
    this.fileSize,
    this.notes,
    required this.createdAt,
    required this.updatedAt,
    this.report,
  });

  factory MedicalRecord.fromJson(Map<String, dynamic> json) {
    return MedicalRecord(
      id: json['id'] as String,
      userId: json['userId'] as String,
      title: json['title'] as String,
      type: RecordType.fromString(json['type'] as String),
      bodyPart: json['bodyPart'] as String?,
      facility: json['facility'] as String?,
      referringPhysician: json['referringPhysician'] as String?,
      recordDate: DateTime.parse(json['recordDate'] as String),
      fileUrl: json['fileUrl'] as String?,
      thumbnailUrl: json['thumbnailUrl'] as String?,
      fileType: json['fileType'] as String?,
      fileSize: json['fileSize'] as int?,
      notes: json['notes'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      report: json['report'] != null
          ? Report.fromJson(json['report'] as Map<String, dynamic>)
          : null,
    );
  }
}
```

```dart
// lib/models/follow_up.dart
enum FollowUpStatus {
  pending,
  scheduled,
  completed,
  overdue;

  static FollowUpStatus fromString(String value) {
    switch (value) {
      case 'PENDING':
        return FollowUpStatus.pending;
      case 'SCHEDULED':
        return FollowUpStatus.scheduled;
      case 'COMPLETED':
        return FollowUpStatus.completed;
      case 'OVERDUE':
        return FollowUpStatus.overdue;
      default:
        return FollowUpStatus.pending;
    }
  }

  String get displayName {
    switch (this) {
      case FollowUpStatus.pending:
        return 'Pending';
      case FollowUpStatus.scheduled:
        return 'Scheduled';
      case FollowUpStatus.completed:
        return 'Completed';
      case FollowUpStatus.overdue:
        return 'Overdue';
    }
  }
}

class FollowUpRecord {
  final String id;
  final String title;
  final String type;

  const FollowUpRecord({
    required this.id,
    required this.title,
    required this.type,
  });

  factory FollowUpRecord.fromJson(Map<String, dynamic> json) {
    return FollowUpRecord(
      id: json['id'] as String,
      title: json['title'] as String,
      type: json['type'] as String,
    );
  }
}

class FollowUp {
  final String id;
  final String userId;
  final String? medicalRecordId;
  final String recommendation;
  final FollowUpStatus status;
  final DateTime? dueDate;
  final String? notes;
  final DateTime createdAt;
  final DateTime updatedAt;
  final FollowUpRecord? medicalRecord;

  const FollowUp({
    required this.id,
    required this.userId,
    this.medicalRecordId,
    required this.recommendation,
    required this.status,
    this.dueDate,
    this.notes,
    required this.createdAt,
    required this.updatedAt,
    this.medicalRecord,
  });

  factory FollowUp.fromJson(Map<String, dynamic> json) {
    return FollowUp(
      id: json['id'] as String,
      userId: json['userId'] as String,
      medicalRecordId: json['medicalRecordId'] as String?,
      recommendation: json['recommendation'] as String,
      status: FollowUpStatus.fromString(json['status'] as String),
      dueDate: json['dueDate'] != null
          ? DateTime.parse(json['dueDate'] as String)
          : null,
      notes: json['notes'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      medicalRecord: json['medicalRecord'] != null
          ? FollowUpRecord.fromJson(
              json['medicalRecord'] as Map<String, dynamic>)
          : null,
    );
  }
}
```

**Step 4: Run tests**

Run: `cd healthapp_mobile && flutter test test/models/medical_record_test.dart`
Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add healthapp_mobile/lib/models/ healthapp_mobile/test/models/
git commit -m "feat: add data models for user, record, report, follow-up"
```

---

### Task 3: API Config & Client

**Files:**
- Create: `healthapp_mobile/lib/config/api_config.dart`
- Create: `healthapp_mobile/lib/services/api_client.dart`
- Test: `healthapp_mobile/test/services/api_client_test.dart`

**Step 1: Write API client test**

```dart
// test/services/api_client_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:healthapp_mobile/config/api_config.dart';

void main() {
  group('ApiConfig', () {
    test('baseUrl ends without trailing slash', () {
      expect(ApiConfig.baseUrl.endsWith('/'), isFalse);
    });

    test('endpoint paths start with slash', () {
      expect(ApiConfig.records, startsWith('/'));
      expect(ApiConfig.followUps, startsWith('/'));
      expect(ApiConfig.profile, startsWith('/'));
    });
  });
}
```

**Step 2: Run test to verify it fails**

Run: `cd healthapp_mobile && flutter test test/services/api_client_test.dart`
Expected: FAIL

**Step 3: Write config and client**

```dart
// lib/config/api_config.dart
class ApiConfig {
  // Change this to your machine's local IP for device testing,
  // or production URL for release builds
  static const String baseUrl = 'http://10.0.2.2:3000'; // Android emulator
  // static const String baseUrl = 'http://localhost:3000'; // iOS simulator

  static const String records = '/api/records';
  static const String followUps = '/api/follow-ups';
  static const String profile = '/api/users/profile';
  static String recordDetail(String id) => '/api/records/$id';
  static String reportTerms(String id) => '/api/reports/$id/terms';
}
```

```dart
// lib/services/api_client.dart
import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';

class ApiException implements Exception {
  final int statusCode;
  final String message;

  const ApiException(this.statusCode, this.message);

  @override
  String toString() => 'ApiException($statusCode): $message';
}

class ApiClient {
  final http.Client _client;
  final FlutterSecureStorage _storage;

  static const _tokenKey = 'auth_token';

  ApiClient({http.Client? client, FlutterSecureStorage? storage})
      : _client = client ?? http.Client(),
        _storage = storage ?? const FlutterSecureStorage();

  Future<void> saveToken(String token) async {
    await _storage.write(key: _tokenKey, value: token);
  }

  Future<String?> getToken() async {
    return _storage.read(key: _tokenKey);
  }

  Future<void> clearToken() async {
    await _storage.delete(key: _tokenKey);
  }

  Future<bool> hasToken() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }

  Future<Map<String, String>> _headers() async {
    final token = await getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Cookie': 'next-auth.session-token=$token',
    };
  }

  Future<dynamic> get(String path, {Map<String, String>? queryParams}) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}$path')
        .replace(queryParameters: queryParams);
    final response = await _client.get(uri, headers: await _headers());
    return _handleResponse(response);
  }

  Future<dynamic> post(String path, {Map<String, dynamic>? body}) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}$path');
    final response = await _client.post(
      uri,
      headers: await _headers(),
      body: body != null ? jsonEncode(body) : null,
    );
    return _handleResponse(response);
  }

  dynamic _handleResponse(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return null;
      return jsonDecode(response.body);
    }

    String message;
    try {
      final body = jsonDecode(response.body);
      message = body['error'] ?? body['message'] ?? 'Request failed';
    } catch (_) {
      message = 'Request failed with status ${response.statusCode}';
    }

    throw ApiException(response.statusCode, message);
  }
}
```

**Step 4: Run tests**

Run: `cd healthapp_mobile && flutter test test/services/api_client_test.dart`
Expected: PASS

**Step 5: Commit**

```bash
git add healthapp_mobile/lib/config/ healthapp_mobile/lib/services/api_client.dart healthapp_mobile/test/services/
git commit -m "feat: add API config and HTTP client with JWT auth"
```

---

### Task 4: Auth Service & Provider

**Files:**
- Create: `healthapp_mobile/lib/services/auth_service.dart`
- Create: `healthapp_mobile/lib/providers/auth_provider.dart`

**Step 1: Write auth service**

```dart
// lib/services/auth_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/user.dart';
import 'api_client.dart';

class AuthService {
  final ApiClient _apiClient;

  AuthService(this._apiClient);

  /// Login via NextAuth credentials endpoint.
  /// Returns the session token cookie on success.
  Future<String> login(String email, String password) async {
    // Step 1: Get CSRF token
    final csrfUri = Uri.parse('${ApiConfig.baseUrl}/api/auth/csrf');
    final csrfResponse = await http.get(csrfUri);
    final csrfToken = jsonDecode(csrfResponse.body)['csrfToken'] as String;

    // Step 2: POST credentials
    final loginUri =
        Uri.parse('${ApiConfig.baseUrl}/api/auth/callback/credentials');
    final response = await http.post(
      loginUri,
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: {
        'email': email,
        'password': password,
        'csrfToken': csrfToken,
        'json': 'true',
      },
    );

    if (response.statusCode == 200 || response.statusCode == 302) {
      // Extract session token from Set-Cookie header
      final cookies = response.headers['set-cookie'];
      if (cookies != null) {
        final match = RegExp(r'next-auth\.session-token=([^;]+)')
            .firstMatch(cookies);
        if (match != null) {
          final token = match.group(1)!;
          await _apiClient.saveToken(token);
          return token;
        }
      }
    }

    throw const ApiException(401, 'Invalid email or password');
  }

  Future<User> getProfile() async {
    final data = await _apiClient.get(ApiConfig.profile);
    return User.fromJson(data as Map<String, dynamic>);
  }

  Future<void> logout() async {
    await _apiClient.clearToken();
  }
}
```

**Step 2: Write auth provider**

```dart
// lib/providers/auth_provider.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/user.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());

final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService(ref.read(apiClientProvider));
});

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthState {
  final AuthStatus status;
  final User? user;
  final String? error;
  final bool isLoading;

  const AuthState({
    this.status = AuthStatus.unknown,
    this.user,
    this.error,
    this.isLoading = false,
  });

  AuthState copyWith({
    AuthStatus? status,
    User? user,
    String? error,
    bool? isLoading,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      error: error,
      isLoading: isLoading ?? this.isLoading,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthService _authService;
  final ApiClient _apiClient;

  AuthNotifier(this._authService, this._apiClient)
      : super(const AuthState()) {
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    final hasToken = await _apiClient.hasToken();
    if (hasToken) {
      try {
        final user = await _authService.getProfile();
        state = AuthState(status: AuthStatus.authenticated, user: user);
      } catch (_) {
        await _apiClient.clearToken();
        state = const AuthState(status: AuthStatus.unauthenticated);
      }
    } else {
      state = const AuthState(status: AuthStatus.unauthenticated);
    }
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await _authService.login(email, password);
      final user = await _authService.getProfile();
      state = AuthState(status: AuthStatus.authenticated, user: user);
    } catch (e) {
      state = AuthState(
        status: AuthStatus.unauthenticated,
        error: e is ApiException ? e.message : 'Login failed',
      );
    }
  }

  Future<void> logout() async {
    await _authService.logout();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(
    ref.read(authServiceProvider),
    ref.read(apiClientProvider),
  );
});
```

**Step 3: Commit**

```bash
git add healthapp_mobile/lib/services/auth_service.dart healthapp_mobile/lib/providers/auth_provider.dart
git commit -m "feat: add auth service and Riverpod auth provider"
```

---

### Task 5: Records & Dashboard Providers

**Files:**
- Create: `healthapp_mobile/lib/services/records_service.dart`
- Create: `healthapp_mobile/lib/providers/records_provider.dart`
- Create: `healthapp_mobile/lib/providers/dashboard_provider.dart`
- Create: `healthapp_mobile/lib/providers/report_provider.dart`

**Step 1: Write records service**

```dart
// lib/services/records_service.dart
import '../config/api_config.dart';
import '../models/follow_up.dart';
import '../models/medical_record.dart';
import '../models/report.dart';
import 'api_client.dart';

class RecordsResponse {
  final List<MedicalRecord> records;
  final int total;
  final int totalPages;

  const RecordsResponse({
    required this.records,
    required this.total,
    required this.totalPages,
  });
}

class ReportWithTerms {
  final Report report;
  final List<HighlightedTerm> terms;

  const ReportWithTerms({required this.report, required this.terms});
}

class RecordsService {
  final ApiClient _apiClient;

  RecordsService(this._apiClient);

  Future<RecordsResponse> getRecords({
    String? search,
    String? type,
    int page = 1,
    int limit = 20,
  }) async {
    final params = <String, String>{
      'page': page.toString(),
      'limit': limit.toString(),
    };
    if (search != null && search.isNotEmpty) params['search'] = search;
    if (type != null && type.isNotEmpty) params['type'] = type;

    final data =
        await _apiClient.get(ApiConfig.records, queryParams: params)
            as Map<String, dynamic>;
    final records = (data['records'] as List)
        .map((r) => MedicalRecord.fromJson(r as Map<String, dynamic>))
        .toList();
    final pagination = data['pagination'] as Map<String, dynamic>;

    return RecordsResponse(
      records: records,
      total: pagination['total'] as int,
      totalPages: pagination['totalPages'] as int,
    );
  }

  Future<MedicalRecord> getRecord(String id) async {
    final data = await _apiClient.get(ApiConfig.recordDetail(id))
        as Map<String, dynamic>;
    return MedicalRecord.fromJson(data);
  }

  Future<List<FollowUp>> getFollowUps() async {
    final data = await _apiClient.get(ApiConfig.followUps) as List;
    return data
        .map((f) => FollowUp.fromJson(f as Map<String, dynamic>))
        .toList();
  }

  Future<ReportWithTerms> getReportWithTerms(String reportId) async {
    final data = await _apiClient.get(ApiConfig.reportTerms(reportId))
        as Map<String, dynamic>;
    final report = Report.fromJson(data);
    final terms = (data['highlightedTerms'] as List)
        .map((t) => HighlightedTerm.fromJson(t as Map<String, dynamic>))
        .toList();
    return ReportWithTerms(report: report, terms: terms);
  }
}
```

**Step 2: Write providers**

```dart
// lib/providers/records_provider.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/medical_record.dart';
import '../services/records_service.dart';
import 'auth_provider.dart';

final recordsServiceProvider = Provider<RecordsService>((ref) {
  return RecordsService(ref.read(apiClientProvider));
});

final recordsProvider = FutureProvider.family<RecordsResponse, RecordsParams>(
  (ref, params) async {
    final service = ref.read(recordsServiceProvider);
    return service.getRecords(
      search: params.search,
      type: params.type,
      page: params.page,
      limit: params.limit,
    );
  },
);

final recordDetailProvider =
    FutureProvider.family<MedicalRecord, String>((ref, id) async {
  final service = ref.read(recordsServiceProvider);
  return service.getRecord(id);
});

class RecordsParams {
  final String? search;
  final String? type;
  final int page;
  final int limit;

  const RecordsParams({
    this.search,
    this.type,
    this.page = 1,
    this.limit = 20,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is RecordsParams &&
          search == other.search &&
          type == other.type &&
          page == other.page &&
          limit == other.limit;

  @override
  int get hashCode => Object.hash(search, type, page, limit);
}
```

```dart
// lib/providers/dashboard_provider.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/follow_up.dart';
import '../models/medical_record.dart';
import 'records_provider.dart';

class DashboardData {
  final int totalRecords;
  final int pendingFollowUps;
  final List<MedicalRecord> recentRecords;
  final List<FollowUp> upcomingFollowUps;

  const DashboardData({
    required this.totalRecords,
    required this.pendingFollowUps,
    required this.recentRecords,
    required this.upcomingFollowUps,
  });
}

final dashboardProvider = FutureProvider<DashboardData>((ref) async {
  final service = ref.read(recordsServiceProvider);
  final recordsResponse = await service.getRecords(limit: 5);
  final followUps = await service.getFollowUps();

  final pending = followUps
      .where((f) =>
          f.status == FollowUpStatus.pending ||
          f.status == FollowUpStatus.scheduled)
      .toList();

  return DashboardData(
    totalRecords: recordsResponse.total,
    pendingFollowUps: pending.length,
    recentRecords: recordsResponse.records,
    upcomingFollowUps: pending,
  );
});
```

```dart
// lib/providers/report_provider.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/records_service.dart';
import 'records_provider.dart';

final reportTermsProvider =
    FutureProvider.family<ReportWithTerms, String>((ref, reportId) async {
  final service = ref.read(recordsServiceProvider);
  return service.getReportWithTerms(reportId);
});
```

**Step 3: Commit**

```bash
git add healthapp_mobile/lib/services/records_service.dart healthapp_mobile/lib/providers/
git commit -m "feat: add records service, dashboard, and report providers"
```

---

### Task 6: Theme & App Shell

**Files:**
- Create: `healthapp_mobile/lib/config/theme.dart`
- Create: `healthapp_mobile/lib/config/router.dart`
- Modify: `healthapp_mobile/lib/main.dart`
- Create: `healthapp_mobile/lib/app.dart`
- Create: `healthapp_mobile/lib/screens/shell_screen.dart`

**Step 1: Write theme**

```dart
// lib/config/theme.dart
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  static const _primaryBlue = Color(0xFF3B82F6);
  static const _successGreen = Color(0xFF22C55E);
  static const _warningAmber = Color(0xFFF59E0B);
  static const _dangerRed = Color(0xFFEF4444);

  static Color get primaryBlue => _primaryBlue;
  static Color get successGreen => _successGreen;
  static Color get warningAmber => _warningAmber;
  static Color get dangerRed => _dangerRed;

  static Color recordTypeColor(String type) {
    switch (type) {
      case 'MRI':
        return const Color(0xFF8B5CF6);
      case 'XRAY':
        return _primaryBlue;
      case 'CT_SCAN':
        return _warningAmber;
      case 'ULTRASOUND':
        return _successGreen;
      default:
        return Colors.grey;
    }
  }

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      colorSchemeSeed: _primaryBlue,
      brightness: Brightness.light,
      textTheme: GoogleFonts.interTextTheme(),
      appBarTheme: const AppBarTheme(
        centerTitle: false,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: Colors.grey.shade200),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.grey.shade50,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.grey.shade300),
        ),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
    );
  }
}
```

**Step 2: Write router**

```dart
// lib/config/router.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';
import '../screens/auth/login_screen.dart';
import '../screens/dashboard/dashboard_screen.dart';
import '../screens/records/records_screen.dart';
import '../screens/records/record_detail_screen.dart';
import '../screens/report/report_viewer_screen.dart';
import '../screens/profile/profile_screen.dart';
import '../screens/shell_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/dashboard',
    redirect: (context, state) {
      final isAuth = authState.status == AuthStatus.authenticated;
      final isLoginRoute = state.matchedLocation == '/login';

      if (authState.status == AuthStatus.unknown) return null;

      if (!isAuth && !isLoginRoute) return '/login';
      if (isAuth && isLoginRoute) return '/dashboard';

      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      ShellRoute(
        builder: (context, state, child) => ShellScreen(child: child),
        routes: [
          GoRoute(
            path: '/dashboard',
            builder: (context, state) => const DashboardScreen(),
          ),
          GoRoute(
            path: '/records',
            builder: (context, state) => const RecordsScreen(),
          ),
          GoRoute(
            path: '/records/:id',
            builder: (context, state) => RecordDetailScreen(
              recordId: state.pathParameters['id']!,
            ),
          ),
          GoRoute(
            path: '/records/:id/report/:reportId',
            builder: (context, state) => ReportViewerScreen(
              recordId: state.pathParameters['id']!,
              reportId: state.pathParameters['reportId']!,
            ),
          ),
          GoRoute(
            path: '/profile',
            builder: (context, state) => const ProfileScreen(),
          ),
        ],
      ),
    ],
  );
});
```

**Step 3: Write shell screen with bottom nav**

```dart
// lib/screens/shell_screen.dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class ShellScreen extends StatelessWidget {
  final Widget child;

  const ShellScreen({super.key, required this.child});

  int _currentIndex(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    if (location.startsWith('/records')) return 1;
    if (location == '/profile') return 2;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex(context),
        onDestinationSelected: (index) {
          switch (index) {
            case 0:
              context.go('/dashboard');
            case 1:
              context.go('/records');
            case 2:
              context.go('/profile');
          }
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          NavigationDestination(
            icon: Icon(Icons.folder_outlined),
            selectedIcon: Icon(Icons.folder),
            label: 'Records',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
```

**Step 4: Write main.dart and app.dart**

```dart
// lib/main.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app.dart';

void main() {
  runApp(const ProviderScope(child: HealthApp()));
}
```

```dart
// lib/app.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'config/router.dart';
import 'config/theme.dart';

class HealthApp extends ConsumerWidget {
  const HealthApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'HealthApp',
      theme: AppTheme.lightTheme,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}
```

**Step 5: Commit**

```bash
git add healthapp_mobile/lib/config/theme.dart healthapp_mobile/lib/config/router.dart healthapp_mobile/lib/main.dart healthapp_mobile/lib/app.dart healthapp_mobile/lib/screens/shell_screen.dart
git commit -m "feat: add theme, routing, and app shell with bottom nav"
```

---

### Task 7: Login Screen

**Files:**
- Create: `healthapp_mobile/lib/screens/auth/login_screen.dart`

**Step 1: Write login screen**

```dart
// lib/screens/auth/login_screen.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../providers/auth_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _login() {
    final email = _emailController.text.trim();
    final password = _passwordController.text;
    if (email.isEmpty || password.isEmpty) return;
    ref.read(authProvider.notifier).login(email, password);
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Icon(Icons.health_and_safety,
                    size: 64, color: theme.colorScheme.primary),
                const SizedBox(height: 16),
                Text(
                  'HealthApp',
                  style: theme.textTheme.headlineMedium
                      ?.copyWith(fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  'Your Medical Records, Simplified',
                  style: theme.textTheme.bodyMedium
                      ?.copyWith(color: Colors.grey.shade600),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 48),
                TextField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.next,
                  decoration: const InputDecoration(
                    labelText: 'Email',
                    prefixIcon: Icon(Icons.email_outlined),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  textInputAction: TextInputAction.done,
                  onSubmitted: (_) => _login(),
                  decoration: InputDecoration(
                    labelText: 'Password',
                    prefixIcon: const Icon(Icons.lock_outlined),
                    suffixIcon: IconButton(
                      icon: Icon(_obscurePassword
                          ? Icons.visibility_outlined
                          : Icons.visibility_off_outlined),
                      onPressed: () =>
                          setState(() => _obscurePassword = !_obscurePassword),
                    ),
                  ),
                ),
                if (auth.error != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    auth.error!,
                    style: TextStyle(color: theme.colorScheme.error),
                    textAlign: TextAlign.center,
                  ),
                ],
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: auth.isLoading ? null : _login,
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: auth.isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white),
                        )
                      : const Text('Sign In', style: TextStyle(fontSize: 16)),
                ),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: () {
                    // Open web app for registration
                  },
                  child: const Text("Don't have an account? Register on web"),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
```

**Step 2: Commit**

```bash
git add healthapp_mobile/lib/screens/auth/
git commit -m "feat: add login screen"
```

---

### Task 8: Dashboard Screen

**Files:**
- Create: `healthapp_mobile/lib/screens/dashboard/dashboard_screen.dart`

**Step 1: Write dashboard screen**

```dart
// lib/screens/dashboard/dashboard_screen.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../config/theme.dart';
import '../../models/follow_up.dart';
import '../../models/medical_record.dart';
import '../../providers/auth_provider.dart';
import '../../providers/dashboard_provider.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final dashboard = ref.watch(dashboardProvider);
    final theme = Theme.of(context);
    final name = auth.user?.name?.split(' ').first ?? 'there';

    return Scaffold(
      appBar: AppBar(
        title: Text('Welcome, $name',
            style: const TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: dashboard.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.grey),
              const SizedBox(height: 16),
              Text('Failed to load dashboard',
                  style: theme.textTheme.bodyLarge),
              const SizedBox(height: 8),
              FilledButton(
                onPressed: () => ref.invalidate(dashboardProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (data) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(dashboardProvider),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Stats row
              Row(
                children: [
                  _StatCard(
                    icon: Icons.folder,
                    label: 'Records',
                    value: '${data.totalRecords}',
                    color: AppTheme.primaryBlue,
                  ),
                  const SizedBox(width: 12),
                  _StatCard(
                    icon: Icons.schedule,
                    label: 'Follow-ups',
                    value: '${data.pendingFollowUps}',
                    color: AppTheme.warningAmber,
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Recent records
              _SectionHeader(
                title: 'Recent Records',
                onViewAll: () => context.go('/records'),
              ),
              const SizedBox(height: 8),
              ...data.recentRecords.map((r) => _RecordTile(record: r)),

              if (data.upcomingFollowUps.isNotEmpty) ...[
                const SizedBox(height: 24),
                const _SectionHeader(title: 'Upcoming Follow-ups'),
                const SizedBox(height: 8),
                ...data.upcomingFollowUps.map((f) => _FollowUpTile(followUp: f)),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 24),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(value,
                      style: Theme.of(context)
                          .textTheme
                          .headlineSmall
                          ?.copyWith(fontWeight: FontWeight.bold)),
                  Text(label,
                      style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final VoidCallback? onViewAll;

  const _SectionHeader({required this.title, this.onViewAll});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title,
            style: Theme.of(context)
                .textTheme
                .titleMedium
                ?.copyWith(fontWeight: FontWeight.bold)),
        if (onViewAll != null)
          TextButton(
            onPressed: onViewAll,
            child: const Text('View all'),
          ),
      ],
    );
  }
}

class _RecordTile extends StatelessWidget {
  final MedicalRecord record;

  const _RecordTile({required this.record});

  @override
  Widget build(BuildContext context) {
    final color = AppTheme.recordTypeColor(record.type.name.toUpperCase());
    return Card(
      child: ListTile(
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(Icons.description, color: color, size: 20),
        ),
        title: Text(record.title),
        subtitle: Text(
          '${record.type.displayName}  •  ${DateFormat.yMMMd().format(record.recordDate)}',
          style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => context.push('/records/${record.id}'),
      ),
    );
  }
}

class _FollowUpTile extends StatelessWidget {
  final FollowUp followUp;

  const _FollowUpTile({required this.followUp});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: AppTheme.warningAmber.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child:
              Icon(Icons.schedule, color: AppTheme.warningAmber, size: 20),
        ),
        title: Text(followUp.recommendation),
        subtitle: Text(
          followUp.dueDate != null
              ? 'Due: ${DateFormat.yMMMd().format(followUp.dueDate!)}'
              : followUp.status.displayName,
          style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
        ),
      ),
    );
  }
}
```

**Step 2: Commit**

```bash
git add healthapp_mobile/lib/screens/dashboard/
git commit -m "feat: add dashboard screen with stats and recent records"
```

---

### Task 9: Records List Screen

**Files:**
- Create: `healthapp_mobile/lib/screens/records/records_screen.dart`

**Step 1: Write records screen**

```dart
// lib/screens/records/records_screen.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../config/theme.dart';
import '../../models/medical_record.dart';
import '../../providers/records_provider.dart';

class RecordsScreen extends ConsumerStatefulWidget {
  const RecordsScreen({super.key});

  @override
  ConsumerState<RecordsScreen> createState() => _RecordsScreenState();
}

class _RecordsScreenState extends ConsumerState<RecordsScreen> {
  String _search = '';
  String? _typeFilter;

  RecordsParams get _params => RecordsParams(
        search: _search.isEmpty ? null : _search,
        type: _typeFilter,
      );

  @override
  Widget build(BuildContext context) {
    final records = ref.watch(recordsProvider(_params));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Records',
            style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: Column(
        children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: TextField(
              onChanged: (v) => setState(() => _search = v),
              decoration: const InputDecoration(
                hintText: 'Search records...',
                prefixIcon: Icon(Icons.search),
              ),
            ),
          ),
          // Type filter chips
          SizedBox(
            height: 56,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              children: [
                _FilterChip(
                  label: 'All',
                  selected: _typeFilter == null,
                  onTap: () => setState(() => _typeFilter = null),
                ),
                for (final type in RecordType.values)
                  Padding(
                    padding: const EdgeInsets.only(left: 8),
                    child: _FilterChip(
                      label: type.displayName,
                      selected: _typeFilter == type.name.toUpperCase(),
                      onTap: () => setState(
                          () => _typeFilter = type.name.toUpperCase()),
                    ),
                  ),
              ],
            ),
          ),
          // Records list
          Expanded(
            child: records.when(
              loading: () =>
                  const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline,
                        size: 48, color: Colors.grey),
                    const SizedBox(height: 16),
                    const Text('Failed to load records'),
                    const SizedBox(height: 8),
                    FilledButton(
                      onPressed: () =>
                          ref.invalidate(recordsProvider(_params)),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
              data: (data) {
                if (data.records.isEmpty) {
                  return const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.folder_open, size: 64, color: Colors.grey),
                        SizedBox(height: 16),
                        Text('No records found'),
                      ],
                    ),
                  );
                }
                return RefreshIndicator(
                  onRefresh: () async =>
                      ref.invalidate(recordsProvider(_params)),
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: data.records.length,
                    itemBuilder: (context, index) {
                      final record = data.records[index];
                      return _RecordCard(record: record);
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Chip(
        label: Text(label,
            style: TextStyle(
              color: selected
                  ? Theme.of(context).colorScheme.onPrimary
                  : Colors.grey.shade700,
              fontSize: 13,
            )),
        backgroundColor: selected
            ? Theme.of(context).colorScheme.primary
            : Colors.grey.shade100,
        side: BorderSide.none,
        padding: const EdgeInsets.symmetric(horizontal: 4),
      ),
    );
  }
}

class _RecordCard extends StatelessWidget {
  final MedicalRecord record;

  const _RecordCard({required this.record});

  @override
  Widget build(BuildContext context) {
    final color = AppTheme.recordTypeColor(record.type.name.toUpperCase());
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => context.push('/records/${record.id}'),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(Icons.description, color: color),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(record.title,
                        style: const TextStyle(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: color.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(record.type.displayName,
                              style: TextStyle(color: color, fontSize: 12)),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          DateFormat.yMMMd().format(record.recordDate),
                          style: TextStyle(
                              color: Colors.grey.shade600, fontSize: 13),
                        ),
                      ],
                    ),
                    if (record.facility != null) ...[
                      const SizedBox(height: 4),
                      Text(record.facility!,
                          style: TextStyle(
                              color: Colors.grey.shade500, fontSize: 13)),
                    ],
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: Colors.grey.shade400),
            ],
          ),
        ),
      ),
    );
  }
}
```

**Step 2: Commit**

```bash
git add healthapp_mobile/lib/screens/records/records_screen.dart
git commit -m "feat: add records list screen with search and type filters"
```

---

### Task 10: Record Detail Screen

**Files:**
- Create: `healthapp_mobile/lib/screens/records/record_detail_screen.dart`

**Step 1: Write record detail screen**

```dart
// lib/screens/records/record_detail_screen.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../config/theme.dart';
import '../../providers/records_provider.dart';

class RecordDetailScreen extends ConsumerWidget {
  final String recordId;

  const RecordDetailScreen({super.key, required this.recordId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final record = ref.watch(recordDetailProvider(recordId));
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Record Details')),
      body: record.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.grey),
              const SizedBox(height: 16),
              const Text('Failed to load record'),
              const SizedBox(height: 8),
              FilledButton(
                onPressed: () =>
                    ref.invalidate(recordDetailProvider(recordId)),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (data) {
          final color =
              AppTheme.recordTypeColor(data.type.name.toUpperCase());
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Header
              Row(
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(Icons.description, color: color, size: 28),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(data.title,
                            style: theme.textTheme.titleLarge
                                ?.copyWith(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 3),
                          decoration: BoxDecoration(
                            color: color.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(data.type.displayName,
                              style: TextStyle(color: color, fontSize: 13)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Info fields
              _InfoRow(icon: Icons.calendar_today, label: 'Date',
                  value: DateFormat.yMMMMd().format(data.recordDate)),
              if (data.bodyPart != null)
                _InfoRow(icon: Icons.accessibility, label: 'Body Part',
                    value: data.bodyPart!),
              if (data.facility != null)
                _InfoRow(icon: Icons.local_hospital, label: 'Facility',
                    value: data.facility!),
              if (data.referringPhysician != null)
                _InfoRow(icon: Icons.person, label: 'Physician',
                    value: data.referringPhysician!),
              if (data.notes != null) ...[
                const SizedBox(height: 16),
                Text('Notes',
                    style: theme.textTheme.titleSmall
                        ?.copyWith(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(data.notes!),
                  ),
                ),
              ],

              // Report section
              if (data.report != null) ...[
                const SizedBox(height: 24),
                Text('Report',
                    style: theme.textTheme.titleSmall
                        ?.copyWith(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (data.report!.summary != null) ...[
                          Text('Summary',
                              style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  color: Colors.grey.shade700)),
                          const SizedBox(height: 4),
                          Text(data.report!.summary!),
                          const SizedBox(height: 16),
                        ],
                        if (data.report!.keyFindings != null) ...[
                          Text('Key Findings',
                              style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  color: Colors.grey.shade700)),
                          const SizedBox(height: 4),
                          Text(data.report!.keyFindings!),
                          const SizedBox(height: 16),
                        ],
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            onPressed: () => context.push(
                              '/records/$recordId/report/${data.report!.id}',
                            ),
                            icon: const Icon(Icons.article),
                            label: const Text('View Full Report'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ],
          );
        },
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.grey.shade600),
          const SizedBox(width: 12),
          Text('$label: ',
              style: TextStyle(
                  color: Colors.grey.shade600, fontWeight: FontWeight.w500)),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}
```

**Step 2: Commit**

```bash
git add healthapp_mobile/lib/screens/records/record_detail_screen.dart
git commit -m "feat: add record detail screen with report summary"
```

---

### Task 11: Report Viewer Screen

**Files:**
- Create: `healthapp_mobile/lib/screens/report/report_viewer_screen.dart`

**Step 1: Write report viewer with term tooltips**

```dart
// lib/screens/report/report_viewer_screen.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../models/report.dart';
import '../../providers/report_provider.dart';

class ReportViewerScreen extends ConsumerWidget {
  final String recordId;
  final String reportId;

  const ReportViewerScreen({
    super.key,
    required this.recordId,
    required this.reportId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reportData = ref.watch(reportTermsProvider(reportId));
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Full Report')),
      body: reportData.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.grey),
              const SizedBox(height: 16),
              const Text('Failed to load report'),
              const SizedBox(height: 8),
              FilledButton(
                onPressed: () =>
                    ref.invalidate(reportTermsProvider(reportId)),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (data) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Legend
            Card(
              color: Colors.blue.shade50,
              child: const Padding(
                padding: EdgeInsets.all(12),
                child: Row(
                  children: [
                    Icon(Icons.info_outline, size: 18, color: Colors.blue),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Tap highlighted terms to see plain-language explanations.',
                        style: TextStyle(fontSize: 13, color: Colors.blue),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Report content with highlighted terms
            _HighlightedReport(
              content: data.report.content,
              terms: data.terms,
            ),

            if (data.report.summary != null) ...[
              const SizedBox(height: 24),
              Text('Summary',
                  style: theme.textTheme.titleSmall
                      ?.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Card(
                color: Colors.green.shade50,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(data.report.summary!),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _HighlightedReport extends StatelessWidget {
  final String content;
  final List<HighlightedTerm> terms;

  const _HighlightedReport({required this.content, required this.terms});

  @override
  Widget build(BuildContext context) {
    if (terms.isEmpty) {
      return Text(content, style: const TextStyle(height: 1.6));
    }

    // Sort terms by start index
    final sorted = [...terms]..sort((a, b) => a.startIndex.compareTo(b.startIndex));

    final spans = <InlineSpan>[];
    var lastEnd = 0;

    for (final term in sorted) {
      if (term.startIndex < lastEnd) continue; // skip overlapping

      // Text before this term
      if (term.startIndex > lastEnd) {
        spans.add(TextSpan(text: content.substring(lastEnd, term.startIndex)));
      }

      // Highlighted term
      spans.add(WidgetSpan(
        child: _TermChip(
          text: content.substring(term.startIndex, term.endIndex),
          term: term,
        ),
      ));
      lastEnd = term.endIndex;
    }

    // Remaining text
    if (lastEnd < content.length) {
      spans.add(TextSpan(text: content.substring(lastEnd)));
    }

    return Text.rich(
      TextSpan(children: spans),
      style: const TextStyle(height: 1.6),
    );
  }
}

class _TermChip extends StatelessWidget {
  final String text;
  final HighlightedTerm term;

  const _TermChip({required this.text, required this.term});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => _showDefinition(context),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
        decoration: BoxDecoration(
          color: Colors.amber.shade100,
          borderRadius: BorderRadius.circular(4),
          border: Border.all(color: Colors.amber.shade300),
        ),
        child: Text(
          text,
          style: TextStyle(
            color: Colors.amber.shade900,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
  }

  void _showDefinition(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade200,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(term.category,
                      style: TextStyle(
                          fontSize: 12, color: Colors.grey.shade700)),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(term.term,
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(term.definition,
                style: const TextStyle(height: 1.5)),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}
```

**Step 2: Commit**

```bash
git add healthapp_mobile/lib/screens/report/
git commit -m "feat: add report viewer with highlighted medical term tooltips"
```

---

### Task 12: Profile Screen

**Files:**
- Create: `healthapp_mobile/lib/screens/profile/profile_screen.dart`

**Step 1: Write profile screen**

```dart
// lib/screens/profile/profile_screen.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../providers/auth_provider.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final user = auth.user;
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile',
            style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Avatar and name
          Center(
            child: Column(
              children: [
                CircleAvatar(
                  radius: 40,
                  backgroundColor: theme.colorScheme.primary,
                  child: Text(
                    user?.name?.substring(0, 1).toUpperCase() ?? '?',
                    style: const TextStyle(fontSize: 32, color: Colors.white),
                  ),
                ),
                const SizedBox(height: 12),
                Text(user?.name ?? 'Unknown',
                    style: theme.textTheme.titleLarge
                        ?.copyWith(fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(user?.email ?? '',
                    style: TextStyle(color: Colors.grey.shade600)),
                const SizedBox(height: 4),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text('Patient',
                      style: TextStyle(color: Colors.blue.shade700, fontSize: 13)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),

          // Info card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  _ProfileRow(
                    icon: Icons.email_outlined,
                    label: 'Email',
                    value: user?.email ?? '',
                  ),
                  const Divider(height: 24),
                  _ProfileRow(
                    icon: Icons.calendar_today,
                    label: 'Member since',
                    value: user != null
                        ? DateFormat.yMMMM().format(user.createdAt)
                        : '',
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Logout button
          OutlinedButton.icon(
            onPressed: () => ref.read(authProvider.notifier).logout(),
            icon: const Icon(Icons.logout, color: Colors.red),
            label: const Text('Sign Out',
                style: TextStyle(color: Colors.red)),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
              side: const BorderSide(color: Colors.red),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _ProfileRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 20, color: Colors.grey.shade600),
        const SizedBox(width: 12),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label,
                style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
            const SizedBox(height: 2),
            Text(value, style: const TextStyle(fontWeight: FontWeight.w500)),
          ],
        ),
      ],
    );
  }
}
```

**Step 2: Commit**

```bash
git add healthapp_mobile/lib/screens/profile/
git commit -m "feat: add profile screen with user info and logout"
```

---

### Task 13: Clean Up & Verify

**Step 1: Delete default Flutter test and counter app**

Remove `healthapp_mobile/test/widget_test.dart` and clean up any default counter app code.

**Step 2: Run flutter analyze**

```bash
cd healthapp_mobile && flutter analyze
```
Fix any warnings or errors.

**Step 3: Run all tests**

```bash
cd healthapp_mobile && flutter test
```
Expected: All tests pass.

**Step 4: Run the app**

```bash
cd healthapp_mobile && flutter run
```
Verify: Login screen appears, can log in with `sarah.johnson@email.com` / `Password123!@`, dashboard loads with data.

**Step 5: Final commit**

```bash
git add healthapp_mobile/
git commit -m "feat: complete HealthApp Flutter mobile app v1"
```
