import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../features/auth/application/auth_provider.dart';
import '../features/auth/presentation/pin_login_screen.dart';
import '../features/pos/presentation/payment_screen.dart';
import '../features/pos/presentation/pos_screen.dart';
import '../features/shift/presentation/shift_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/pos',
    redirect: (context, state) {
      final authed = ref.read(authStateProvider).isAuthenticated;
      final onLogin = state.matchedLocation == '/login';
      if (!authed && !onLogin) return '/login';
      if (authed && onLogin) return '/pos';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const PinLoginScreen()),
      GoRoute(path: '/pos', builder: (_, __) => const PosScreen()),
      GoRoute(path: '/payment', builder: (_, __) => const PaymentScreen()),
      GoRoute(path: '/shift', builder: (_, __) => const ShiftScreen()),
    ],
  );
});
