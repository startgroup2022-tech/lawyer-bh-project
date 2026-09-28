import 'package:flutter/foundation.dart';
import 'package:saraya_square_app/features/dashboard/data/dashboard_repository.dart';
import 'package:saraya_square_app/features/dashboard/domain/dashboard_summary.dart';

sealed class DashboardState {
  const DashboardState();
}

final class DashboardLoading extends DashboardState {
  const DashboardLoading();
}

final class DashboardLoaded extends DashboardState {
  const DashboardLoaded(this.summary);

  final DashboardSummary summary;
}

final class DashboardFailure extends DashboardState {
  const DashboardFailure();
}

final class DashboardController extends ChangeNotifier {
  DashboardController(this._repository);

  final DashboardRepository _repository;
  DashboardState _state = const DashboardLoading();
  int _requestVersion = 0;

  DashboardState get state => _state;

  Future<void> load(String propertyId) async {
    final requestVersion = ++_requestVersion;
    _state = const DashboardLoading();
    notifyListeners();
    try {
      final summary = await _repository.load(propertyId);
      if (requestVersion != _requestVersion) return;
      _state = DashboardLoaded(summary);
    } on Object {
      if (requestVersion != _requestVersion) return;
      _state = const DashboardFailure();
    }
    notifyListeners();
  }
}
