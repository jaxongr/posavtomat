import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../core/api/dio_client.dart';
import '../../../core/error/failures.dart';
import '../application/cart_provider.dart';

/// Creates sales. Idempotent: each attempt carries a client-generated key,
/// so a retry (including offline re-sync) never double-charges.
class SalesRepository {
  SalesRepository(this._dio);
  final Dio _dio;

  Future<Either<Failure, String>> createSale({
    required CartState cart,
    required String idempotencyKey,
    required String paymentProvider, // CASH | CARD
  }) async {
    try {
      final res = await _dio.post(ApiEndpoints.sales, data: {
        'idempotencyKey': idempotencyKey,
        'type': 'POS',
        'items': cart.lines
            .map((l) => {'productId': l.product.id, 'qty': l.qty})
            .toList(),
        'payments': [
          {'provider': paymentProvider, 'amount': cart.total},
        ],
      });
      return right(res.data['data']['id'] as String);
    } on DioException catch (e) {
      final code = e.response?.data?['error']?['code'] as String?;
      final msg = e.response?.data?['error']?['message'] as String? ?? 'Savdo amalga oshmadi';
      if (code == 'E4101') return left(StockFailure(msg));
      if (e.type == DioExceptionType.connectionError) {
        return left(NetworkFailure('Internet yo‘q — savdo navbatga qo‘yiladi'));
      }
      return left(ServerFailure(msg, code: code));
    }
  }
}

final salesRepositoryProvider = Provider<SalesRepository>(
  (ref) => SalesRepository(ref.watch(dioProvider)),
);
