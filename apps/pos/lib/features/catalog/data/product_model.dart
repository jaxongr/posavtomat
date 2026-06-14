/// Product as returned by GET /products.
class ProductModel {
  const ProductModel({
    required this.id,
    required this.name,
    required this.price,
    required this.unit,
    required this.type,
    this.barcode,
    this.imageUrl,
    this.stockQty,
  });

  final String id;
  final String name;
  final double price;
  final String unit;
  final String type;
  final String? barcode;
  final String? imageUrl;
  final double? stockQty;

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    final stocks = json['stocks'] as List<dynamic>?;
    return ProductModel(
      id: json['id'] as String,
      name: json['name'] as String,
      price: double.tryParse('${json['price']}') ?? 0,
      unit: json['unit'] as String? ?? 'DONA',
      type: json['type'] as String? ?? 'GOODS',
      barcode: json['barcode'] as String?,
      imageUrl: json['imageUrl'] as String?,
      stockQty: stocks != null && stocks.isNotEmpty
          ? double.tryParse('${stocks.first['quantity']}')
          : null,
    );
  }
}
