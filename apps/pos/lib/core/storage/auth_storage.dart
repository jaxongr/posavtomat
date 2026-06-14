import 'package:dio/dio.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../api/api_endpoints.dart';

/// Persists auth tokens in Hive (offline-first). Survives app restarts.
class AuthStorage {
  AuthStorage._();

  static const String _box = 'auth';

  static Box get _b => Hive.box(_box);

  static Future<void> init() async {
    await Hive.openBox(_box);
  }

  static Future<void> save({
    required String accessToken,
    required String refreshToken,
    String? branchId,
  }) async {
    await _b.putAll({
      'accessToken': accessToken,
      'refreshToken': refreshToken,
      if (branchId != null) 'branchId': branchId,
    });
  }

  static Future<String?> accessToken() async => _b.get('accessToken') as String?;
  static Future<String?> branchId() async => _b.get('branchId') as String?;

  static Future<void> clear() async => _b.clear();

  /// Refresh the access token. Returns true on success.
  static Future<bool> tryRefresh(Dio dio) async {
    final refresh = _b.get('refreshToken') as String?;
    if (refresh == null) return false;
    try {
      final res = await dio.post(ApiEndpoints.refresh, data: {'refreshToken': refresh});
      final data = res.data['data'] as Map<String, dynamic>;
      await save(
        accessToken: data['accessToken'] as String,
        refreshToken: data['refreshToken'] as String,
        branchId: (data['user']?['branchId']) as String?,
      );
      return true;
    } catch (_) {
      await clear();
      return false;
    }
  }
}
