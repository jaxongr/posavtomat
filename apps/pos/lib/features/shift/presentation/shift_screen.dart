import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../config/theme.dart';
import '../application/shift_provider.dart';

class ShiftScreen extends ConsumerWidget {
  const ShiftScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final shift = ref.watch(currentShiftProvider);
    return Scaffold(
      backgroundColor: AppTheme.bgBody,
      appBar: AppBar(title: const Text('Smena')),
      body: RefreshIndicator(
        color: AppTheme.primary,
        onRefresh: () => ref.refresh(currentShiftProvider.future),
        child: shift.when(
          loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.primary)),
          error: (e, _) => Center(child: Text('$e')),
          data: (s) => ListView(
            padding: const EdgeInsets.all(AppTheme.spacingL),
            children: [
              if (s == null)
                _OpenCard(onOpen: (cash) => ref.read(shiftActionsProvider).open(cash))
              else
                _OpenShiftView(shift: s, onClose: (cash) => ref.read(shiftActionsProvider).close(cash)),
            ],
          ),
        ),
      ),
    );
  }
}

class _OpenCard extends StatefulWidget {
  const _OpenCard({required this.onOpen});
  final Future<void> Function(double) onOpen;
  @override
  State<_OpenCard> createState() => _OpenCardState();
}

class _OpenCardState extends State<_OpenCard> {
  final _ctrl = TextEditingController(text: '0');
  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppTheme.spacingL),
        child: Column(
          children: [
            const Text('Smena yopiq', style: TextStyle(fontSize: 18, color: AppTheme.textSecondary)),
            const SizedBox(height: AppTheme.spacingM),
            TextField(
              controller: _ctrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Boshlang‘ich kassa puli', border: OutlineInputBorder()),
            ),
            const SizedBox(height: AppTheme.spacingM),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.accent),
                onPressed: () => widget.onOpen(double.tryParse(_ctrl.text) ?? 0),
                child: const Text('Smena ochish', style: TextStyle(color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OpenShiftView extends StatelessWidget {
  const _OpenShiftView({required this.shift, required this.onClose});
  final ShiftInfo shift;
  final Future<void> Function(double) onClose;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _stat('Jami savdo', shift.totalSales),
        _stat('Naqd', shift.cashSales),
        _stat('Karta', shift.cardSales),
        const SizedBox(height: AppTheme.spacingL),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.errorColor),
            onPressed: () => onClose(shift.cashSales),
            child: const Text('Smenani yopish (Z-hisobot)', style: TextStyle(color: Colors.white)),
          ),
        ),
      ],
    );
  }

  Widget _stat(String label, double value) => Card(
        child: ListTile(
          title: Text(label, style: const TextStyle(color: AppTheme.textSecondary)),
          trailing: Text('${value.toStringAsFixed(0)} so‘m',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
        ),
      );
}
