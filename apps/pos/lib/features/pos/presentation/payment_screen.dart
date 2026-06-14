import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:uuid/uuid.dart';
import '../../../config/theme.dart';
import '../application/cart_provider.dart';
import '../data/sales_repository.dart';

class PaymentScreen extends ConsumerStatefulWidget {
  const PaymentScreen({super.key});

  @override
  ConsumerState<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends ConsumerState<PaymentScreen> {
  String _provider = 'CASH';
  bool _processing = false;
  // Stable per checkout attempt — guarantees idempotency on retry.
  final String _idempotencyKey = const Uuid().v4();

  Future<void> _pay() async {
    setState(() => _processing = true);
    final cart = ref.read(cartProvider);
    final result = await ref.read(salesRepositoryProvider).createSale(
          cart: cart,
          idempotencyKey: _idempotencyKey,
          paymentProvider: _provider,
        );
    if (!mounted) return;
    result.fold(
      (failure) {
        setState(() => _processing = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(failure.message), backgroundColor: AppTheme.errorColor),
        );
      },
      (saleId) {
        ref.read(cartProvider.notifier).clear();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Savdo yakunlandi'), backgroundColor: AppTheme.successColor),
        );
        context.go('/pos');
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final cart = ref.watch(cartProvider);
    return Scaffold(
      backgroundColor: AppTheme.bgBody,
      appBar: AppBar(title: const Text('To‘lov')),
      body: Padding(
        padding: const EdgeInsets.all(AppTheme.spacingL),
        child: Column(
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(AppTheme.spacingL),
                child: Column(
                  children: [
                    const Text('To‘lanadi', style: TextStyle(color: AppTheme.textSecondary)),
                    const SizedBox(height: AppTheme.spacingS),
                    Text('${cart.total.toStringAsFixed(0)} so‘m',
                        style: const TextStyle(fontSize: 36, fontWeight: FontWeight.bold, color: AppTheme.primary)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppTheme.spacingL),
            Row(
              children: [
                Expanded(child: _method('CASH', 'Naqd', Icons.payments_outlined)),
                const SizedBox(width: AppTheme.spacingM),
                Expanded(child: _method('CARD', 'Karta', Icons.credit_card)),
              ],
            ),
            const Spacer(),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.accent,
                  padding: const EdgeInsets.symmetric(vertical: AppTheme.spacingM),
                ),
                onPressed: _processing || cart.isEmpty ? null : _pay,
                child: _processing
                    ? const SizedBox(height: 22, width: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text('Yakunlash', style: TextStyle(color: Colors.white, fontSize: 18)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _method(String value, String label, IconData icon) {
    final selected = _provider == value;
    return InkWell(
      onTap: () => setState(() => _provider = value),
      borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: AppTheme.spacingL),
        decoration: BoxDecoration(
          color: selected ? AppTheme.primary.withValues(alpha: 0.1) : AppTheme.cardBg,
          borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
          border: Border.all(color: selected ? AppTheme.primary : AppTheme.cardBorder, width: selected ? 2 : 1),
        ),
        child: Column(
          children: [
            Icon(icon, color: selected ? AppTheme.primary : AppTheme.textSecondary, size: 32),
            const SizedBox(height: AppTheme.spacingS),
            Text(label, style: TextStyle(color: selected ? AppTheme.primary : AppTheme.textPrimary)),
          ],
        ),
      ),
    );
  }
}
