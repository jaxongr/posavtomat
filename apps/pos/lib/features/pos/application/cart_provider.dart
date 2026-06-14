import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../catalog/data/product_model.dart';

class CartLine {
  const CartLine({required this.product, required this.qty});
  final ProductModel product;
  final double qty;

  double get total => product.price * qty;
  CartLine copyWith({double? qty}) => CartLine(product: product, qty: qty ?? this.qty);
}

class CartState {
  const CartState(this.lines);
  final List<CartLine> lines;

  double get total => lines.fold(0, (sum, l) => sum + l.total);
  int get count => lines.length;
  bool get isEmpty => lines.isEmpty;
}

/// Current cart (add/remove/qty). Money math here is for display only —
/// the server recomputes authoritative totals on sale creation.
class CartNotifier extends StateNotifier<CartState> {
  CartNotifier() : super(const CartState([]));

  void add(ProductModel product) {
    final idx = state.lines.indexWhere((l) => l.product.id == product.id);
    if (idx >= 0) {
      _setQty(idx, state.lines[idx].qty + 1);
    } else {
      state = CartState([...state.lines, CartLine(product: product, qty: 1)]);
    }
  }

  void changeQty(String productId, double qty) {
    final idx = state.lines.indexWhere((l) => l.product.id == productId);
    if (idx < 0) return;
    if (qty <= 0) {
      remove(productId);
    } else {
      _setQty(idx, qty);
    }
  }

  void _setQty(int idx, double qty) {
    final lines = [...state.lines];
    lines[idx] = lines[idx].copyWith(qty: qty);
    state = CartState(lines);
  }

  void remove(String productId) {
    state = CartState(state.lines.where((l) => l.product.id != productId).toList());
  }

  void clear() => state = const CartState([]);
}

final cartProvider = StateNotifierProvider<CartNotifier, CartState>((ref) => CartNotifier());
