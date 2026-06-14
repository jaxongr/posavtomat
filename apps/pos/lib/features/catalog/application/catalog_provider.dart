import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../core/api/dio_client.dart';
import '../data/product_model.dart';

/// Loads the product catalog for the current branch. AsyncValue pattern.
final catalogProvider = FutureProvider<List<ProductModel>>((ref) async {
  final dio = ref.watch(dioProvider);
  try {
    final res = await dio.get(ApiEndpoints.products, queryParameters: {'limit': 100});
    final data = res.data['data'] as List<dynamic>;
    return data.map((e) => ProductModel.fromJson(e as Map<String, dynamic>)).toList();
  } on DioException catch (e) {
    throw Exception(e.response?.data?['error']?['message'] ?? 'Mahsulotlarni yuklab bo‘lmadi');
  }
});
