import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../core/api/dio_client.dart';
import '../../../core/storage/auth_storage.dart';

class AuthUser {
  const AuthUser({required this.id, required this.fish, required this.role, this.branchId});
  final String id;
  final String fish;
  final String role;
  final String? branchId;

  factory AuthUser.fromJson(Map<String, dynamic> j) => AuthUser(
        id: j['id'] as String,
        fish: j['fish'] as String,
        role: j['role'] as String,
        branchId: j['branchId'] as String?,
      );
}

class AuthState {
  const AuthState({this.user, this.loading = false});
  final AuthUser? user;
  final bool loading;
  bool get isAuthenticated => user != null;
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier(this._dio) : super(const AuthState());
  final Dio _dio;

  /// PIN login (cashier fast switch).
  Future<void> loginWithPin(String staffId, String pin) async {
    state = const AuthState(loading: true);
    try {
      final res = await _dio.post(ApiEndpoints.pinLogin, data: {'staffId': staffId, 'pin': pin});
      final data = res.data['data'] as Map<String, dynamic>;
      final user = AuthUser.fromJson(data['user'] as Map<String, dynamic>);
      await AuthStorage.save(
        accessToken: data['accessToken'] as String,
        refreshToken: data['refreshToken'] as String,
        branchId: user.branchId,
      );
      state = AuthState(user: user);
    } on DioException catch (e) {
      state = const AuthState();
      throw Exception(e.response?.data?['error']?['message'] ?? 'PIN-kod noto‘g‘ri');
    }
  }

  Future<void> logout() async {
    await AuthStorage.clear();
    state = const AuthState();
  }
}

final authStateProvider = StateNotifierProvider<AuthNotifier, AuthState>(
  (ref) => AuthNotifier(ref.watch(dioProvider)),
);
