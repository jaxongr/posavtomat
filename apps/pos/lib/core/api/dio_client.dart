import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../config/env.dart';
import '../storage/auth_storage.dart';

/// Configured Dio client: base URL, bearer token, branch header, 401 refresh.
final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: Env.apiBaseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {'Content-Type': 'application/json'},
    ),
  );

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await AuthStorage.accessToken();
        final branchId = await AuthStorage.branchId();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        if (branchId != null) {
          options.headers['x-branch-id'] = branchId;
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        // Token expired — try a single refresh and retry.
        final code = error.response?.data is Map
            ? (error.response?.data['error']?['code'] as String?)
            : null;
        if (error.response?.statusCode == 401 && code == 'E1003') {
          final refreshed = await AuthStorage.tryRefresh(dio);
          if (refreshed) {
            final req = error.requestOptions;
            final token = await AuthStorage.accessToken();
            req.headers['Authorization'] = 'Bearer $token';
            final clone = await dio.fetch(req);
            return handler.resolve(clone);
          }
        }
        handler.next(error);
      },
    ),
  );

  return dio;
});
