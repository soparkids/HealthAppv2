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
          GoRoute(path: '/dashboard', builder: (context, state) => const DashboardScreen()),
          GoRoute(path: '/records', builder: (context, state) => const RecordsScreen()),
          GoRoute(path: '/records/:id', builder: (context, state) => RecordDetailScreen(recordId: state.pathParameters['id']!)),
          GoRoute(
            path: '/records/:id/report/:reportId',
            builder: (context, state) => ReportViewerScreen(
              recordId: state.pathParameters['id']!,
              reportId: state.pathParameters['reportId']!,
            ),
          ),
          GoRoute(path: '/profile', builder: (context, state) => const ProfileScreen()),
        ],
      ),
    ],
  );
});
