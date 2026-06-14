/// Typed failures (Either<Failure, T> in repositories).
sealed class Failure {
  const Failure(this.message, {this.code});
  final String message;
  final String? code;
}

class NetworkFailure extends Failure {
  const NetworkFailure(super.message);
}

class ServerFailure extends Failure {
  const ServerFailure(super.message, {super.code});
}

class CacheFailure extends Failure {
  const CacheFailure(super.message);
}

class AuthFailure extends Failure {
  const AuthFailure(super.message);
}

/// E4101 — insufficient stock.
class StockFailure extends Failure {
  const StockFailure(super.message) : super();
}
