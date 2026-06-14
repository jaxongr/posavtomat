/// App environment. Override apiBaseUrl at build time:
/// flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000/api/v1
class Env {
  Env._();

  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000/api/v1',
  );

  static const String defaultCurrency = 'UZS';
}
