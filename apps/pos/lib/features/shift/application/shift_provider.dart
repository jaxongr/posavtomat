import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../core/api/dio_client.dart';

class ShiftInfo {
  const ShiftInfo({required this.id, required this.totalSales, required this.cashSales, required this.cardSales});
  final String id;
  final double totalSales;
  final double cashSales;
  final double cardSales;

  factory ShiftInfo.fromJson(Map<String, dynamic> j) => ShiftInfo(
        id: j['id'] as String,
        totalSales: double.tryParse('${j['totalSales']}') ?? 0,
        cashSales: double.tryParse('${j['cashSales']}') ?? 0,
        cardSales: double.tryParse('${j['cardSales']}') ?? 0,
      );
}

/// Current open shift, or null if none is open.
final currentShiftProvider = FutureProvider<ShiftInfo?>((ref) async {
  final dio = ref.watch(dioProvider);
  final res = await dio.get(ApiEndpoints.shiftCurrent);
  final data = res.data['data'];
  return data == null ? null : ShiftInfo.fromJson(data as Map<String, dynamic>);
});

final shiftActionsProvider = Provider<ShiftActions>((ref) => ShiftActions(ref.watch(dioProvider), ref));

class ShiftActions {
  ShiftActions(this._dio, this._ref);
  final Dio _dio;
  final Ref _ref;

  Future<void> open(double openCash) async {
    await _dio.post(ApiEndpoints.shiftOpen, data: {'openCash': openCash});
    _ref.invalidate(currentShiftProvider);
  }

  Future<void> close(double closeCash) async {
    await _dio.post(ApiEndpoints.shiftClose, data: {'closeCash': closeCash});
    _ref.invalidate(currentShiftProvider);
  }
}
