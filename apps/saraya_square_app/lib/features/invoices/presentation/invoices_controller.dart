import 'package:flutter/foundation.dart';
import 'package:saraya_square_app/features/invoices/data/invoice_repository.dart';
import 'package:saraya_square_app/features/invoices/domain/invoice.dart';

sealed class InvoicesState {
  const InvoicesState();
}

final class InvoicesLoading extends InvoicesState {
  const InvoicesLoading();
}

final class InvoicesLoaded extends InvoicesState {
  const InvoicesLoaded(this.items);

  final List<InvoiceRecord> items;
}

final class InvoicesFailure extends InvoicesState {
  const InvoicesFailure();
}

final class InvoicesController extends ChangeNotifier {
  InvoicesController(this._repository);

  final InvoiceRepository _repository;
  InvoicesState state = const InvoicesLoading();

  Future<void> load(String propertyId) async {
    state = const InvoicesLoading();
    notifyListeners();
    try {
      state = InvoicesLoaded(await _repository.list(propertyId));
    } catch (_) {
      state = const InvoicesFailure();
    }
    notifyListeners();
  }
}
