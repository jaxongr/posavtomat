import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../config/theme.dart';
import '../../catalog/application/catalog_provider.dart';
import '../../catalog/data/product_model.dart';
import '../application/cart_provider.dart';

class PosScreen extends ConsumerWidget {
  const PosScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final catalog = ref.watch(catalogProvider);
    final cart = ref.watch(cartProvider);

    return Scaffold(
      backgroundColor: AppTheme.bgBody,
      appBar: AppBar(
        title: const Text('Kassa'),
        actions: [
          IconButton(
            onPressed: () => context.push('/shift'),
            icon: const Icon(Icons.point_of_sale),
            tooltip: 'Smena',
          ),
        ],
      ),
      body: Row(
        children: [
          // Product grid
          Expanded(
            flex: 3,
            child: RefreshIndicator(
              color: AppTheme.primary,
              onRefresh: () => ref.refresh(catalogProvider.future),
              child: catalog.when(
                loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
                error: (e, _) => Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, color: AppTheme.errorColor, size: 48),
                      Padding(padding: const EdgeInsets.all(8), child: Text('$e')),
                      ElevatedButton(
                        onPressed: () => ref.refresh(catalogProvider.future),
                        child: const Text('Qayta yuklash'),
                      ),
                    ],
                  ),
                ),
                data: (products) => products.isEmpty
                    ? const Center(child: Text("Ma'lumot topilmadi"))
                    : GridView.builder(
                        padding: const EdgeInsets.all(AppTheme.spacingM),
                        itemCount: products.length,
                        gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                          maxCrossAxisExtent: 180,
                          childAspectRatio: 0.95,
                          mainAxisSpacing: AppTheme.spacingM,
                          crossAxisSpacing: AppTheme.spacingM,
                        ),
                        itemBuilder: (_, i) => _ProductTile(product: products[i]),
                      ),
              ),
            ),
          ),
          // Cart panel
          Expanded(flex: 2, child: _CartPanel(cart: cart)),
        ],
      ),
    );
  }
}

class _ProductTile extends ConsumerWidget {
  const _ProductTile({required this.product});
  final ProductModel product;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final low = product.stockQty != null && product.stockQty! <= 0;
    return InkWell(
      onTap: low ? null : () => ref.read(cartProvider.notifier).add(product),
      borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
      child: Container(
        decoration: BoxDecoration(
          color: AppTheme.cardBg,
          borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
          border: Border.all(color: AppTheme.cardBorder),
          boxShadow: const [BoxShadow(color: Color(0x05000000), blurRadius: 8, offset: Offset(0, 2))],
        ),
        padding: const EdgeInsets.all(AppTheme.spacingM),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Spacer(),
            Text(product.name, maxLines: 2, overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
            const SizedBox(height: 4),
            Text('${product.price.toStringAsFixed(0)} so‘m',
                style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold)),
            if (product.stockQty != null)
              Text('Qoldiq: ${product.stockQty!.toStringAsFixed(0)}',
                  style: TextStyle(fontSize: 12, color: low ? AppTheme.errorColor : AppTheme.textSecondary)),
          ],
        ),
      ),
    );
  }
}

class _CartPanel extends ConsumerWidget {
  const _CartPanel({required this.cart});
  final CartState cart;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      color: AppTheme.cardBg,
      child: Column(
        children: [
          Expanded(
            child: cart.isEmpty
                ? const Center(child: Text('Savat bo‘sh', style: TextStyle(color: AppTheme.textSecondary)))
                : ListView.builder(
                    itemCount: cart.lines.length,
                    itemBuilder: (_, i) {
                      final line = cart.lines[i];
                      return ListTile(
                        title: Text(line.product.name),
                        subtitle: Text('${line.product.price.toStringAsFixed(0)} × ${line.qty}'),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.remove_circle_outline),
                              onPressed: () =>
                                  ref.read(cartProvider.notifier).changeQty(line.product.id, line.qty - 1),
                            ),
                            Text('${line.qty}'),
                            IconButton(
                              icon: const Icon(Icons.add_circle_outline),
                              onPressed: () =>
                                  ref.read(cartProvider.notifier).changeQty(line.product.id, line.qty + 1),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.all(AppTheme.spacingM),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Jami', style: TextStyle(fontSize: 18, color: AppTheme.textSecondary)),
                Text('${cart.total.toStringAsFixed(0)} so‘m',
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(AppTheme.spacingM, 0, AppTheme.spacingM, AppTheme.spacingM),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.accent,
                  padding: const EdgeInsets.symmetric(vertical: AppTheme.spacingM),
                ),
                onPressed: cart.isEmpty ? null : () => context.push('/payment'),
                child: const Text('To‘lovga o‘tish', style: TextStyle(color: Colors.white, fontSize: 16)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
