import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../config/theme.dart';
import '../application/auth_provider.dart';

class PinLoginScreen extends ConsumerStatefulWidget {
  const PinLoginScreen({super.key});

  @override
  ConsumerState<PinLoginScreen> createState() => _PinLoginScreenState();
}

class _PinLoginScreenState extends ConsumerState<PinLoginScreen> {
  final _staffId = TextEditingController();
  String _pin = '';

  @override
  void dispose() {
    _staffId.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    try {
      await ref.read(authStateProvider.notifier).loginWithPin(_staffId.text.trim(), _pin);
      if (mounted) context.go('/pos');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: AppTheme.errorColor),
        );
      }
      setState(() => _pin = '');
    }
  }

  void _tap(String d) {
    if (_pin.length >= 6) return;
    setState(() => _pin += d);
    if (_pin.length >= 4) _submit();
  }

  @override
  Widget build(BuildContext context) {
    final loading = ref.watch(authStateProvider).loading;
    return Scaffold(
      backgroundColor: AppTheme.bgBody,
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 360),
          child: Padding(
            padding: const EdgeInsets.all(AppTheme.spacingL),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text('SAVDO-POS',
                    style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppTheme.primary)),
                const SizedBox(height: AppTheme.spacingS),
                const Text('Kassir kirishi', style: TextStyle(color: AppTheme.textSecondary)),
                const SizedBox(height: AppTheme.spacingL),
                TextField(
                  controller: _staffId,
                  decoration: const InputDecoration(
                    labelText: 'Hodim ID',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: AppTheme.spacingM),
                Text('•' * _pin.length, style: const TextStyle(fontSize: 32, letterSpacing: 8)),
                const SizedBox(height: AppTheme.spacingM),
                if (loading) const CircularProgressIndicator(color: AppTheme.primary) else _pad(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _pad() {
    return GridView.count(
      shrinkWrap: true,
      crossAxisCount: 3,
      childAspectRatio: 1.6,
      mainAxisSpacing: AppTheme.spacingS,
      crossAxisSpacing: AppTheme.spacingS,
      children: [
        ...List.generate(9, (i) => _key('${i + 1}')),
        _action(Icons.backspace_outlined, () => setState(() {
              if (_pin.isNotEmpty) _pin = _pin.substring(0, _pin.length - 1);
            })),
        _key('0'),
        _action(Icons.check, _pin.length >= 4 ? _submit : null),
      ],
    );
  }

  Widget _key(String d) => ElevatedButton(
        onPressed: () => _tap(d),
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.cardBg,
          foregroundColor: AppTheme.textPrimary,
        ),
        child: Text(d, style: const TextStyle(fontSize: 22)),
      );

  Widget _action(IconData icon, VoidCallback? onTap) => ElevatedButton(
        onPressed: onTap,
        style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
        child: Icon(icon, color: Colors.white),
      );
}
